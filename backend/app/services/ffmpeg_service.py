import os
import subprocess
import time
import shutil
import psutil
import traceback
from typing import Dict, Any, Callable, Optional
from app.services.video import get_ffmpeg_path, get_ffprobe_path, active_tasks
from app.utils.logger import logger


class FFmpegService:
    @staticmethod
    def build_compression_cmd(
        input_path: str,
        output_path: str,
        options: Dict[str, Any],
        watermark_img_path: Optional[str] = None,
        watermark_text: Optional[str] = None,
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

        # Explicit Stream Mapping: Select primary video stream 0:v:0 and audio stream 0:a? (if present)
        if watermark_img_path and os.path.exists(watermark_img_path):
            cmd.extend(["-map", "0:a?"])
        else:
            cmd.extend(["-map", "0:v:0", "-map", "0:a?"])

        # Video codecs & GPU Acceleration mapping
        raw_codec = (
            options.get("video_codec") or options.get("codec") or "h264"
        ).lower()
        gpu_mode = (options.get("gpu_acceleration") or "auto").lower()

        target_vcodec = "libx264"
        if raw_codec in ["hevc", "h265"]:
            if gpu_mode == "nvenc":
                target_vcodec = "hevc_nvenc"
            elif gpu_mode == "qsv":
                target_vcodec = "hevc_qsv"
            elif gpu_mode == "amf":
                target_vcodec = "hevc_amf"
            else:
                target_vcodec = "libx265"
        elif raw_codec in ["av1", "libsvtav1"]:
            target_vcodec = "libsvtav1"
        elif raw_codec in ["vp9", "libvpx-vp9"]:
            target_vcodec = "libvpx-vp9"
        else:  # h264
            if gpu_mode == "nvenc":
                target_vcodec = "h264_nvenc"
            elif gpu_mode == "qsv":
                target_vcodec = "h264_qsv"
            elif gpu_mode == "amf":
                target_vcodec = "h264_amf"
            else:
                target_vcodec = "libx264"

        cmd.extend(["-c:v", target_vcodec])

        # Enforce universal 8-bit YUV 4:2:0 pixel format to prevent black screen playback on web browsers/OS players
        cmd.extend(["-pix_fmt", "yuv420p"])

        # Target x264/x265 preset speed
        preset = options.get("preset", "medium")
        valid_presets = {
            "ultrafast",
            "superfast",
            "veryfast",
            "faster",
            "fast",
            "medium",
            "slow",
            "slower",
            "veryslow",
        }
        speed_preset = preset if preset in valid_presets else "medium"
        cmd.extend(["-preset", speed_preset])

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
            if scale_filter:
                cmd.extend(
                    [
                        "-filter_complex",
                        f"[0:v]{scale_filter}[sc];[sc][1:v]overlay=W-w-10:H-h-10",
                    ]
                )
            else:
                cmd.extend(["-filter_complex", "[0:v][1:v]overlay=W-w-10:H-h-10"])
        else:
            if watermark_text:
                vf_filters.append(
                    f"drawtext=text='{watermark_text}':x=W-w-10:y=H-h-10:fontsize=22:fontcolor=white:alpha=0.6"
                )
            if vf_filters:
                cmd.extend(["-vf", ",".join(vf_filters)])

        # Audio codec & bitrate
        audio_codec = (options.get("audio_codec") or "aac").lower()
        if audio_codec == "mp3":
            acodec = "libmp3lame"
        elif audio_codec == "opus":
            acodec = "libopus"
        elif audio_codec == "copy":
            acodec = "copy"
        else:
            acodec = "aac"

        cmd.extend(["-c:a", acodec])
        if acodec != "copy":
            audio_bitrate = options.get("audio_bitrate")
            if audio_bitrate:
                cmd.extend(["-b:a", str(audio_bitrate)])
            else:
                cmd.extend(["-b:a", "128k"])

        # Enable faststart for MP4/MOV streaming compatibility
        out_ext = os.path.splitext(output_path)[1].lower()
        if out_ext in [".mp4", ".mov"]:
            cmd.extend(["-movflags", "+faststart"])

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
            ffmpeg_bin,
            "-y",
            "-i",
            input_path,
            "-vf",
            "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
            "-progress",
            "-",
            output_path,
        ]

    @staticmethod
    def build_audio_extraction_cmd(
        input_path: str, output_path: str, codec: str = "mp3"
    ) -> list:
        """
        Builds raw command list to extract audio channels.
        """
        ffmpeg_bin = get_ffmpeg_path()
        cmd = [ffmpeg_bin, "-y", "-i", input_path, "-vn"]

        if codec == "mp3":
            cmd.extend(["-acodec", "libmp3lame", "-q:a", "2"])
        else:  # Default copy/aac
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
        on_failure: Callable[[str], None],
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
                universal_newlines=True,
            )

            stderr_lines = []

            def drain_stderr():
                try:
                    for line in process.stderr:
                        stderr_lines.append(line)
                except Exception:
                    pass

            import threading

            stderr_thread = threading.Thread(target=drain_stderr, daemon=True)
            stderr_thread.start()

            if task_id in active_tasks:
                active_tasks[task_id]["process"] = process
                active_tasks[task_id]["status"] = "processing"

            out_time_us = 0
            speed = "1.0x"
            fps_val = 0.0

            while True:
                line = process.stdout.readline()
                if not line:
                    if process.poll() is not None:
                        break
                    time.sleep(0.05)
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
                    elif key == "fps":
                        try:
                            fps_val = float(val.strip())
                        except ValueError:
                            pass

                elapsed = time.time() - start_time
                if duration > 0:
                    progress = (out_time_us / (duration * 1000000.0)) * 100.0
                    progress = min(max(0.0, progress), 99.9)
                else:
                    progress = 0.0

                eta = (elapsed / progress) * (100.0 - progress) if progress > 0 else 0.0

                if task_id in active_tasks:
                    active_tasks[task_id].update(
                        {
                            "progress": round(progress, 1),
                            "elapsed": round(elapsed, 1),
                            "eta": round(eta, 1),
                            "speed": speed,
                            "fps": round(fps_val, 1),
                        }
                    )

            returncode = process.wait()
            stderr_thread.join(timeout=1.0)
            stderr_out = "".join(stderr_lines)
            output_path = cmd[-1]
            cmd_str = " ".join(cmd)

            if task_id in active_tasks:
                active_tasks[task_id][
                    "ffmpeg_log"
                ] = f"CMD: {cmd_str}\n\nSTDERR:\n{stderr_out}"
                active_tasks[task_id]["cmd_str"] = cmd_str

            if returncode == 0 and os.path.exists(output_path):
                compressed_size = os.path.getsize(output_path)
                if compressed_size == 0:
                    diag_msg = "Compression output file is empty (0 bytes)."
                    logger.error(
                        "FFmpeg output file validation failed: 0 bytes generated",
                        extra={"task_id": task_id, "output_path": output_path},
                    )
                    if task_id in active_tasks:
                        active_tasks[task_id].update(
                            {"status": "failed", "error": diag_msg}
                        )
                    on_failure(diag_msg)
                    return

                # Validate video stream presence for video output formats
                out_ext = os.path.splitext(output_path)[1].lower()
                if out_ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
                    try:
                        from app.services.video import get_video_metadata

                        out_meta = get_video_metadata(output_path)
                        if not out_meta.get("width") or not out_meta.get("height"):
                            diag_msg = "Output video validation failed: compressed file contains no valid video frames."
                            logger.error(
                                "FFmpeg output validation failed",
                                extra={"task_id": task_id, "metadata": out_meta},
                            )
                            if task_id in active_tasks:
                                active_tasks[task_id].update(
                                    {"status": "failed", "error": diag_msg}
                                )
                            on_failure(diag_msg)
                            return
                    except Exception as val_err:
                        logger.warning(
                            f"Post-compression metadata check warning: {str(val_err)}"
                        )

                compression_time = time.time() - start_time
                if task_id in active_tasks:
                    active_tasks[task_id].update(
                        {
                            "status": "completed",
                            "progress": 100.0,
                            "elapsed": round(compression_time, 1),
                            "eta": 0.0,
                            "compressed_size": compressed_size,
                        }
                    )
                on_success(compressed_size, compression_time)
            else:
                if task_id in active_tasks and active_tasks[task_id]["status"] in [
                    "cancelled",
                    "failed",
                ]:
                    return

                # Friendly error diagnostic analysis
                diag_msg = "FFmpeg encoding failed."
                low_stderr = stderr_out.lower()
                if (
                    "unknown encoder" in low_stderr
                    or "unsupported codec" in low_stderr
                    or "error setting preset" in low_stderr
                ):
                    diag_msg = "Unsupported codec or preset configuration. Please check Advanced Options."
                elif (
                    "no space left on device" in low_stderr or "disk full" in low_stderr
                ):
                    diag_msg = "Disk full. Please free up storage space in your output directory."
                elif "permission denied" in low_stderr:
                    diag_msg = "Permission denied while writing output video file."
                elif (
                    "invalid argument" in low_stderr
                    or "error while opening encoder" in low_stderr
                ):
                    diag_msg = "Invalid FFmpeg parameter combination for selected codec/container."
                else:
                    diag_msg = f"FFmpeg error: {stderr_out[-400:]}"

                logger.error(
                    "FFmpeg task execution failed",
                    extra={
                        "task_id": task_id,
                        "ffmpeg_command": cmd,
                        "returncode": returncode,
                        "stderr": stderr_out,
                        "error_msg": diag_msg,
                    },
                )
                if task_id in active_tasks:
                    active_tasks[task_id].update(
                        {"status": "failed", "error": diag_msg}
                    )
                on_failure(diag_msg)

        except Exception as e:
            err_msg = f"FFmpeg execution failed: {str(e)}"
            logger.error(
                "FFmpeg task encountered exception",
                extra={
                    "task_id": task_id,
                    "ffmpeg_command": cmd,
                    "exception_type": type(e).__name__,
                    "python_traceback": traceback.format_exc(),
                },
            )
            if task_id in active_tasks:
                active_tasks[task_id].update({"status": "failed", "error": err_msg})
            on_failure(err_msg)
