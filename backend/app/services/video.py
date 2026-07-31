import os
import subprocess
import json
import time
import shutil
import psutil
from typing import Dict, Any, Callable, Optional

# Active tasks tracking state in memory:
# task_id -> { "status": "...", "progress": 0, "elapsed": 0, "eta": 0, "speed": "...", "process": Popen }
active_tasks: Dict[str, Dict[str, Any]] = {}

def get_ffmpeg_path() -> str:
    """Returns path to ffmpeg binary, checking system PATH first."""
    path = shutil.which("ffmpeg")
    if path:
        return path
    # Check common locations on Windows or fallback
    common_paths = [
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
    ]
    for cp in common_paths:
        if os.path.exists(cp):
            return cp
    return "ffmpeg"

def get_ffprobe_path() -> str:
    """Returns path to ffprobe binary, checking system PATH first."""
    path = shutil.which("ffprobe")
    if path:
        return path
    common_paths = [
        r"C:\Program Files\ffmpeg\bin\ffprobe.exe",
        r"C:\ffmpeg\bin\ffprobe.exe",
    ]
    for cp in common_paths:
        if os.path.exists(cp):
            return cp
    return "ffprobe"

def get_video_metadata(file_path: str) -> Dict[str, Any]:
    """
    Extracts detailed metadata from a video file using ffprobe.
    """
    ffprobe_bin = get_ffprobe_path()
    cmd = [
        ffprobe_bin,
        "-v", "error",
        "-show_format",
        "-show_streams",
        "-print_format", "json",
        file_path
    ]
    
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(result.stdout)
    except (subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError) as e:
        raise ValueError(f"Failed to read video metadata: {str(e)}")

    format_info = data.get("format", {})
    streams = data.get("streams", [])
    
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), {})
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), {})
    
    # Calculate Frame Rate (FPS)
    fps = 0.0
    r_frame_rate = video_stream.get("r_frame_rate", "")
    if "/" in r_frame_rate:
        try:
            num, den = map(int, r_frame_rate.split("/"))
            if den > 0:
                fps = round(num / den, 2)
        except (ValueError, ZeroDivisionError):
            pass
            
    # Calculate duration
    duration = float(format_info.get("duration", 0.0))
    if duration <= 0.0:
        duration = float(video_stream.get("duration", 0.0))
        
    metadata = {
        "filename": os.path.basename(file_path),
        "size": int(format_info.get("size", 0)),
        "duration": duration,
        "format_name": format_info.get("format_name", "unknown"),
        "bitrate": int(format_info.get("bit_rate", 0)) if format_info.get("bit_rate") else 0,
        "width": int(video_stream.get("width", 0)) if video_stream.get("width") else 0,
        "height": int(video_stream.get("height", 0)) if video_stream.get("height") else 0,
        "fps": fps,
        "video_codec": video_stream.get("codec_name", "unknown"),
        "audio_codec": audio_stream.get("codec_name", "none"),
        "audio_bitrate": int(audio_stream.get("bit_rate", 0)) if audio_stream.get("bit_rate") else 0,
    }
    return metadata

def generate_thumbnail(video_path: str, thumbnail_path: str, duration: float = 0.0) -> bool:
    """
    Generates a thumbnail image from a video at 1 second or at start if short.
    """
    ffmpeg_bin = get_ffmpeg_path()
    # Choose time offset
    ss = "00:00:01.000"
    if duration > 0 and duration < 1.0:
        ss = "00:00:00.000"
        
    cmd = [
        ffmpeg_bin,
        "-y",
        "-ss", ss,
        "-i", video_path,
        "-vframes", "1",
        "-vf", "scale=480:-1",
        "-f", "image2",
        thumbnail_path
    ]
    
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Fallback to screenshot at 0
        cmd[3] = "00:00:00.000"
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return True
        except Exception:
            return False

def compress_video_async(
    task_id: str,
    input_path: str,
    output_path: str,
    options: Dict[str, Any],
    duration: float,
    on_success: Callable[[int, float], None],
    on_failure: Callable[[str], None]
):
    """
    Runs ffmpeg compression inside a background worker thread.
    Calculates progress by monitoring ffmpeg's stdout with the `-progress -` option.
    """
    ffmpeg_bin = get_ffmpeg_path()
    
    # Base command args
    cmd = [
        ffmpeg_bin,
        "-y",
        "-i", input_path
    ]
    
    # Apply options
    # Codec default: libx264
    cmd.extend(["-c:v", "libx264"])
    
    # CRF vs Video Bitrate
    video_bitrate = options.get("video_bitrate")
    crf = options.get("crf")
    
    if video_bitrate:
        # e.g., "1500k", "2M"
        cmd.extend(["-b:v", str(video_bitrate)])
    else:
        # Defaults to CRF 24 if nothing provided
        crf_val = crf if crf is not None else 24
        cmd.extend(["-crf", str(crf_val)])
        
    # Preset
    preset = options.get("preset", "medium")
    cmd.extend(["-preset", preset])
    
    # Framerate scale
    fps = options.get("fps")
    if fps:
        cmd.extend(["-r", str(fps)])
        
    # Scale resolution
    width = options.get("width")
    height = options.get("height")
    if width and height:
        # Ensure dimensions are divisible by 2 for libx264
        cmd.extend(["-vf", f"scale=trunc({width}/2)*2:trunc({height}/2)*2"])
    elif width:
        cmd.extend(["-vf", f"scale=trunc({width}/2)*2:-2"])
    elif height:
        cmd.extend(["-vf", f"scale=-2:trunc({height}/2)*2"])
        
    # Audio settings
    audio_codec = options.get("audio_codec", "aac")
    cmd.extend(["-c:a", audio_codec])
    
    audio_bitrate = options.get("audio_bitrate")
    if audio_bitrate:
        cmd.extend(["-b:a", str(audio_bitrate)])
    else:
        cmd.extend(["-b:a", "128k"])
        
    # Setup progress reporting
    cmd.extend(["-progress", "-"])
    cmd.append(output_path)
    
    start_time = time.time()
    
    try:
        # Run process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Track in task state
        if task_id in active_tasks:
            active_tasks[task_id]["process"] = process
            active_tasks[task_id]["status"] = "processing"
            
        out_time_us = 0
        speed = "1.0x"
        
        # Read ffmpeg progress lines
        while True:
            # Check if process ended
            if process.poll() is not None:
                break
                
            # If tasks is paused, we sleep a bit and skip reading
            if task_id in active_tasks and active_tasks[task_id]["status"] == "paused":
                time.sleep(0.5)
                continue
                
            line = process.stdout.readline()
            if not line:
                # Idle check
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
                    
            # Calculate metrics
            elapsed = time.time() - start_time
            if duration > 0:
                progress = (out_time_us / (duration * 1000000.0)) * 100.0
                progress = min(max(0.0, progress), 99.9) # cap at 99.9 until done
            else:
                progress = 0.0
                
            if progress > 0:
                eta = (elapsed / progress) * (100.0 - progress)
            else:
                eta = 0.0
                
            # Update state
            if task_id in active_tasks:
                # Keep active process object, don't overwrite it
                active_tasks[task_id].update({
                    "progress": round(progress, 1),
                    "elapsed": round(elapsed, 1),
                    "eta": round(eta, 1),
                    "speed": speed
                })
                
        # Final poll
        returncode = process.wait()
        
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
            # Check if it was intentionally cancelled
            if task_id in active_tasks and active_tasks[task_id]["status"] in ["cancelled", "failed"]:
                return
                
            stderr_out = process.stderr.read()
            err_msg = f"FFmpeg exited with error code {returncode}. Details: {stderr_out[-500:]}"
            if task_id in active_tasks:
                active_tasks[task_id].update({
                    "status": "failed",
                    "error": err_msg
                })
            on_failure(err_msg)
            
    except Exception as e:
        err_msg = f"Failed to run compression subprocess: {str(e)}"
        if task_id in active_tasks:
            active_tasks[task_id].update({
                "status": "failed",
                "error": err_msg
            })
        on_failure(err_msg)

def suspend_compression(task_id: str) -> bool:
    """Suspends the ffmpeg process for a running task."""
    if task_id not in active_tasks:
        return False
    task = active_tasks[task_id]
    process = task.get("process")
    if process and process.poll() is None:
        try:
            p = psutil.Process(process.pid)
            p.suspend()
            task["status"] = "paused"
            return True
        except Exception as e:
            print(f"Failed to suspend task {task_id}: {e}")
    return False

def resume_compression(task_id: str) -> bool:
    """Resumes the ffmpeg process for a suspended task."""
    if task_id not in active_tasks:
        return False
    task = active_tasks[task_id]
    process = task.get("process")
    if process and process.poll() is None:
        try:
            p = psutil.Process(process.pid)
            p.resume()
            task["status"] = "processing"
            return True
        except Exception as e:
            print(f"Failed to resume task {task_id}: {e}")
    return False

def kill_compression(task_id: str) -> bool:
    """Terminates the ffmpeg process and marks task cancelled."""
    if task_id not in active_tasks:
        return False
    task = active_tasks[task_id]
    process = task.get("process")
    task["status"] = "cancelled"
    if process and process.poll() is None:
        try:
            p = psutil.Process(process.pid)
            p.kill() # force kill
            return True
        except Exception as e:
            print(f"Failed to kill process for task {task_id}: {e}")
            try:
                process.terminate()
            except Exception:
                pass
            return True
    return False
