import os
import subprocess
import time
import shutil
import psutil
from typing import Dict, Any, Callable, Optional
from app.services.video import get_ffmpeg_path, get_ffprobe_path, active_tasks

class FFmpegService:
    @staticmethod
    def build_compression_cmd(
        input_path: str,
        output_path: str,
        options: Dict[str, Any],
        watermark_img_path: Optional[str] = None,
        watermark_text: Optional[str] = None
    ) -> list:
        """
        Builds raw command list for compressing videos with optional filters.
        """
        ffmpeg_bin = get_ffmpeg_path()
        cmd = [ffmpeg_bin, "-y"]
        
        # Add primary input video
        cmd.extend(["-i", input_path])
        
        # Add watermark image input if present
        if watermark_img_path and os.path.exists(watermark_img_path):
            cmd.extend(["-i", watermark_img_path])
            
        # Target preset
        preset = options.get("preset", "medium")
        cmd.extend(["-preset", preset])
        
        # Video codecs
        cmd.extend(["-c:v", "libx264"])
        
        # CRF vs Video Bitrate
        video_bitrate = options.get("video_bitrate")
        crf = options.get("crf")
        if video_bitrate:
            cmd.extend(["-b:v", str(video_bitrate)])
        else:
            crf_val = crf if crf is not None else 24
            cmd.extend(["-crf", str(crf_val)])
            
        # Target FPS
        fps = options.get("fps")
        if fps:
            cmd.extend(["-r", str(fps)])
            
        # Build video filtergraph (Scaling + Watermarking)
        vf_filters = []
        
        width = options.get("width")
        height = options.get("height")
        scale_filter = None
        if width and height:
            scale_filter = f"scale=trunc({width}/2)*2:trunc({height}/2)*2"
        elif width:
            scale_filter = f"scale=trunc({width}/2)*2:-2"
        elif height:
            scale_filter = f"scale=-2:trunc({height}/2)*2"
            
        if scale_filter:
            vf_filters.append(scale_filter)
            
        if watermark_img_path and os.path.exists(watermark_img_path):
            # Graphic watermark overlay rules using filter complex
            if scale_filter:
                cmd.extend(["-filter_complex", f"[0:v]{scale_filter}[sc];[sc][1:v]overlay=W-w-10:H-h-10"])
            else:
                cmd.extend(["-filter_complex", "[0:v][1:v]overlay=W-w-10:H-h-10"])
        else:
            if watermark_text:
                vf_filters.append(f"drawtext=text='{watermark_text}':x=W-w-10:y=H-h-10:fontsize=22:fontcolor=white:alpha=0.6")
            if vf_filters:
                cmd.extend(["-vf", ",".join(vf_filters)])
                
        # Audio channels
        cmd.extend(["-c:a", "aac"])
        audio_bitrate = options.get("audio_bitrate")
        if audio_bitrate:
            cmd.extend(["-b:a", str(audio_bitrate)])
        else:
            cmd.extend(["-b:a", "128k"])
            
        cmd.extend(["-progress", "-"])
        cmd.append(output_path)
        return cmd

    @staticmethod
    def build_gif_cmd(input_path: str, output_path: str) -> list:
        """
        Builds raw command list to convert video to high-quality GIF.
        """
        ffmpeg_bin = get_ffmpeg_path()
        return [
            ffmpeg_bin, "-y",
            "-i", input_path,
            "-vf", "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
            "-progress", "-",
            output_path
        ]

    @staticmethod
    def build_audio_extraction_cmd(input_path: str, output_path: str, codec: str = "mp3") -> list:
        """
        Builds raw command list to extract audio channels.
        """
        ffmpeg_bin = get_ffmpeg_path()
        cmd = [ffmpeg_bin, "-y", "-i", input_path, "-vn"]
        
        if codec == "mp3":
            cmd.extend(["-acodec", "libmp3lame", "-q:a", "2"])
        else: # Default copy/aac
            cmd.extend(["-acodec", "aac", "-b:a", "192k"])
            
        cmd.extend(["-progress", "-"])
        cmd.append(output_path)
        return cmd

    @staticmethod
    def run_ffmpeg_task(
        task_id: str,
        cmd: list,
        duration: float,
        on_success: Callable[[int, float], None],
        on_failure: Callable[[str], None]
    ):
        """
        Executes a built FFmpeg command asynchronously and reports progress feedback.
        """
        start_time = time.time()
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            if task_id in active_tasks:
                active_tasks[task_id]["process"] = process
                active_tasks[task_id]["status"] = "processing"
                
            out_time_us = 0
            speed = "1.0x"
            
            while True:
                if process.poll() is not None:
                    break
                    
                if task_id in active_tasks and active_tasks[task_id]["status"] == "paused":
                    time.sleep(0.5)
                    continue
                    
                line = process.stdout.readline()
                if not line:
                    time.sleep(0.1)
                    continue
                    
                parts = line.strip().split("=")
                if len(parts) == 2:
                    key, val = parts[0], parts[1]
                    if key == "out_time_us":
                        try:
                            out_time_us = int(val)
                        except ValueError:
                            pass
                    elif key == "speed":
                        speed = val.strip()
                        
                elapsed = time.time() - start_time
                if duration > 0:
                    progress = (out_time_us / (duration * 1000000.0)) * 100.0
                    progress = min(max(0.0, progress), 99.9)
                else:
                    progress = 0.0
                    
                eta = (elapsed / progress) * (100.0 - progress) if progress > 0 else 0.0
                
                if task_id in active_tasks:
                    active_tasks[task_id].update({
                        "progress": round(progress, 1),
                        "elapsed": round(elapsed, 1),
                        "eta": round(eta, 1),
                        "speed": speed
                    })
                    
            returncode = process.wait()
            output_path = cmd[-1]
            
            if returncode == 0 and os.path.exists(output_path):
                compressed_size = os.path.getsize(output_path)
                compression_time = time.time() - start_time
                if task_id in active_tasks:
                    active_tasks[task_id].update({
                        "status": "completed",
                        "progress": 100.0,
                        "elapsed": round(compression_time, 1),
                        "eta": 0.0,
                        "compressed_size": compressed_size
                    })
                on_success(compressed_size, compression_time)
            else:
                if task_id in active_tasks and active_tasks[task_id]["status"] in ["cancelled", "failed"]:
                    return
                stderr_out = process.stderr.read()
                err_msg = f"FFmpeg error: {stderr_out[-500:]}"
                if task_id in active_tasks:
                    active_tasks[task_id].update({
                        "status": "failed",
                        "error": err_msg
                    })
                on_failure(err_msg)
                
        except Exception as e:
            err_msg = f"FFmpeg execution failed: {str(e)}"
            if task_id in active_tasks:
                active_tasks[task_id].update({
                    "status": "failed",
                    "error": err_msg
                })
            on_failure(err_msg)
