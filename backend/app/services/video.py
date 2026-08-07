import os
import subprocess
import json
import time
import shutil
import psutil
import traceback
from typing import Dict, Any, Callable, Optional
from app.utils.logger import logger

# Active tasks tracking state in memory:
# task_id -> { "status": "...", "progress": 0, "elapsed": 0, "eta": 0, "speed": "...", "process": Popen }
active_tasks: Dict[str, Dict[str, Any]] = {}


def find_executable(name: str) -> str:
    """Dynamically finds a binary checking system PATH, WinGet local folders, and common directories."""
    target = f"{name}.exe" if os.name == "nt" else name

    # 1. Check system PATH first
    path = shutil.which(name)
    if path:
        return path

    # 2. Check WinGet Links directory
    user_home = os.path.expanduser("~")
    local_appdata = os.environ.get(
        "LOCALAPPDATA", os.path.join(user_home, "AppData", "Local")
    )
    winget_links = os.path.join(local_appdata, "Microsoft", "WinGet", "Links")
    link_path = os.path.join(winget_links, target)
    if os.path.exists(link_path):
        return link_path

    # 3. Check WinGet Packages directory recursively
    winget_packages = os.path.join(local_appdata, "Microsoft", "WinGet", "Packages")
    if os.path.exists(winget_packages):
        for root, dirs, files in os.walk(winget_packages):
            if target in files:
                return os.path.join(root, target)

    # 4. Check common Windows paths
    common_paths = [
        rf"C:\Program Files\ffmpeg\bin\{target}",
        rf"C:\ffmpeg\bin\{target}",
        rf"C:\Program Files (x86)\ffmpeg\bin\{target}",
        os.path.join(local_appdata, "Programs", "ffmpeg", "bin", target),
    ]
    for cp in common_paths:
        if os.path.exists(cp):
            return cp

    # 5. Fallback
    return name


def get_ffmpeg_path() -> str:
    """Returns path to ffmpeg binary, checking system PATH first."""
    return find_executable("ffmpeg")


def get_ffprobe_path() -> str:
    """Returns path to ffprobe binary, checking system PATH first."""
    return find_executable("ffprobe")


def get_video_metadata(file_path: str) -> Dict[str, Any]:
    """
    Extracts detailed metadata from a video file using ffprobe.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Input file not found: {file_path}")

    ffprobe_bin = get_ffprobe_path()
    if not (
        os.path.isabs(ffprobe_bin) and os.path.exists(ffprobe_bin)
    ) and not shutil.which(ffprobe_bin):
        raise FileNotFoundError(
            f"ffprobe executable not found at '{ffprobe_bin}'. Ensure FFmpeg is installed."
        )

    cmd = [
        ffprobe_bin,
        "-v",
        "error",
        "-show_format",
        "-show_streams",
        "-print_format",
        "json",
        file_path,
    ]

    try:
        result = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
    except FileNotFoundError as e:
        raise FileNotFoundError(
            f"ffprobe binary could not be executed at '{ffprobe_bin}': {str(e)}"
        )
    except Exception as e:
        raise ValueError(f"Failed to execute ffprobe process: {str(e)}")

    if result.returncode != 0:
        stderr_msg = (
            result.stderr.strip()
            if result.stderr
            else f"ffprobe exited with code {result.returncode}"
        )
        raise ValueError(f"ffprobe error (code {result.returncode}): {stderr_msg}")

    if not result.stdout or not result.stdout.strip():
        stderr_msg = result.stderr.strip() if result.stderr else "Empty output"
        raise ValueError(f"ffprobe produced empty output: {stderr_msg}")

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse ffprobe JSON output: {str(e)}")

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
        "bitrate": (
            int(format_info.get("bit_rate", 0)) if format_info.get("bit_rate") else 0
        ),
        "width": int(video_stream.get("width", 0)) if video_stream.get("width") else 0,
        "height": (
            int(video_stream.get("height", 0)) if video_stream.get("height") else 0
        ),
        "fps": fps,
        "video_codec": video_stream.get("codec_name", "unknown"),
        "audio_codec": audio_stream.get("codec_name", "none"),
        "audio_bitrate": (
            int(audio_stream.get("bit_rate", 0)) if audio_stream.get("bit_rate") else 0
        ),
    }
    return metadata


def generate_thumbnail(
    video_path: str, thumbnail_path: str, duration: float = 0.0
) -> bool:
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
        "-ss",
        ss,
        "-i",
        video_path,
        "-vframes",
        "1",
        "-vf",
        "scale=480:-1",
        "-f",
        "image2",
        thumbnail_path,
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Fallback to screenshot at 0
        cmd[3] = "00:00:00.000"
        try:
            subprocess.run(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
            )
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
    on_failure: Callable[[str], None],
):
    """
    Runs ffmpeg compression inside a background worker thread.
    Calculates progress by monitoring ffmpeg's stdout with the `-progress -` option.
    """
    ffmpeg_bin = get_ffmpeg_path()

    # Base command args with explicit stream mapping
    cmd = [ffmpeg_bin, "-y", "-i", input_path, "-map", "0:v:0", "-map", "0:a?"]

    # Apply options
    # Codec default: libx264
    cmd.extend(["-c:v", "libx264", "-pix_fmt", "yuv420p"])

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

    out_ext = os.path.splitext(output_path)[1].lower()
    if out_ext in [".mp4", ".mov"]:
        cmd.extend(["-movflags", "+faststart"])

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

        # Track in task state
        if task_id in active_tasks:
            active_tasks[task_id]["process"] = process
            active_tasks[task_id]["status"] = "processing"

        out_time_us = 0
        speed = "1.0x"

        # Read ffmpeg progress lines
        while True:
            # If tasks is paused, we sleep a bit and skip reading
            if task_id in active_tasks and active_tasks[task_id]["status"] == "paused":
                time.sleep(0.5)
                continue

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

            # Calculate metrics
            elapsed = time.time() - start_time
            if duration > 0:
                progress = (out_time_us / (duration * 1000000.0)) * 100.0
                progress = min(max(0.0, progress), 99.9)  # cap at 99.9 until done
            else:
                progress = 0.0

            if progress > 0:
                eta = (elapsed / progress) * (100.0 - progress)
            else:
                eta = 0.0

            # Update state
            if task_id in active_tasks:
                # Keep active process object, don't overwrite it
                active_tasks[task_id].update(
                    {
                        "progress": round(progress, 1),
                        "elapsed": round(elapsed, 1),
                        "eta": round(eta, 1),
                        "speed": speed,
                    }
                )

        # Final poll
        returncode = process.wait()
        stderr_thread.join(timeout=1.0)
        stderr_out = "".join(stderr_lines)

        if returncode == 0 and os.path.exists(output_path):
            compressed_size = os.path.getsize(output_path)
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
            # Check if it was intentionally cancelled
            if task_id in active_tasks and active_tasks[task_id]["status"] in [
                "cancelled",
                "failed",
            ]:
                return

            err_msg = f"FFmpeg exited with error code {returncode}. Details: {stderr_out[-500:]}"
            logger.error(
                "Video compression failed",
                extra={
                    "task_id": task_id,
                    "input_path": input_path,
                    "output_path": output_path,
                    "ffmpeg_command": cmd,
                    "returncode": returncode,
                    "stderr": stderr_out,
                    "error_msg": err_msg,
                },
            )
            if task_id in active_tasks:
                active_tasks[task_id].update({"status": "failed", "error": err_msg})
            on_failure(err_msg)

    except Exception as e:
        err_msg = f"Failed to run compression subprocess: {str(e)}"
        logger.error(
            "Video compression encountered an exception",
            extra={
                "task_id": task_id,
                "input_path": input_path,
                "output_path": output_path,
                "ffmpeg_command": cmd if "cmd" in locals() else None,
                "exception_type": type(e).__name__,
                "python_traceback": traceback.format_exc(),
            },
        )
        if task_id in active_tasks:
            active_tasks[task_id].update({"status": "failed", "error": err_msg})
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
            p.kill()  # force kill
            return True
        except Exception as e:
            print(f"Failed to kill process for task {task_id}: {e}")
            try:
                process.terminate()
            except Exception:
                pass
            return True
    return False
