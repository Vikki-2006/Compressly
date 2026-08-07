import os
import uuid
import time
import traceback
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    BackgroundTasks,
    Depends,
)
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.repository.history_repo import HistoryRepository
from app.repository.settings_repo import SettingsRepository
from app.services.ffmpeg_service import FFmpegService
from app.services.queue_manager import QueueManager
from app.services.video import (
    get_video_metadata,
    generate_thumbnail,
    suspend_compression,
    resume_compression,
    kill_compression,
    active_tasks,
    get_ffmpeg_path,
    get_ffprobe_path,
)
from app.validators.video_validator import VideoValidator
from app.utils.logger import logger
from app.utils.storage import UPLOADS_DIR, COMPRESSED_DIR, delete_file_safe

router = APIRouter(prefix="/api")


class CompressionOptions(BaseModel):
    file_id: str
    preset: str = "medium"
    crf: Optional[int] = None
    video_bitrate: Optional[str] = None
    audio_bitrate: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    task_type: str = (
        "compression"  # "compression", "gif_conversion", "audio_extraction", "watermark"
    )
    audio_codec: Optional[str] = "mp3"
    video_codec: Optional[str] = "h264"
    gpu_acceleration: Optional[str] = "auto"
    container: Optional[str] = "mp4"


class ControlRequest(BaseModel):
    task_id: str
    action: str = Field(..., description="Action: pause, resume, cancel")


@router.get("/health")
def health_check():
    """Checks system metrics and executable binaries verification."""
    import psutil

    ffmpeg_avail = False
    ffprobe_avail = False

    try:
        ffmpeg_bin = get_ffmpeg_path()
        subprocess_res = (
            os.system(f'"{ffmpeg_bin}" -version > nul 2>&1')
            if os.name == "nt"
            else os.system(f"{ffmpeg_bin} -version > /dev/null 2>&1")
        )
        ffmpeg_avail = subprocess_res == 0
    except Exception:
        pass

    try:
        ffprobe_bin = get_ffprobe_path()
        subprocess_res = (
            os.system(f'"{ffprobe_bin}" -version > nul 2>&1')
            if os.name == "nt"
            else os.system(f"{ffprobe_bin} -version > /dev/null 2>&1")
        )
        ffprobe_avail = subprocess_res == 0
    except Exception:
        pass

    cpu_percent = psutil.cpu_percent()
    ram = psutil.virtual_memory()

    return {
        "status": "healthy",
        "ffmpeg": {"available": ffmpeg_avail, "path": get_ffmpeg_path()},
        "ffprobe": {"available": ffprobe_avail, "path": get_ffprobe_path()},
        "system": {
            "cpu_usage_percent": cpu_percent,
            "ram_usage_percent": ram.percent,
            "ram_free_gb": round(ram.available / (1024**3), 2),
        },
    }


@router.post("/metadata")
async def get_metadata_endpoint(file: UploadFile = File(...)):
    """Saves uploaded files temporarily, parses video specs, and renders thumbnail."""
    if not VideoValidator.validate_file_extension(file.filename):
        err_msg = f"Unsupported format for '{file.filename}'. Only MP4, MOV, AVI, and MKV are allowed."
        logger.warning(
            "Video upload validation failed due to unsupported extension",
            extra={
                "uploaded_filename": file.filename,
                "mime_type": file.content_type,
                "exception_type": "ValidationError",
            },
        )
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "stage": "validation",
                "error": "Unsupported file format",
                "details": err_msg,
                "detail": err_msg,
            },
        )

    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".mp4"
    video_filename = f"{file_id}{ext}"
    video_path = os.path.join(UPLOADS_DIR, video_filename)
    thumbnail_filename = f"{file_id}.jpg"
    thumbnail_path = os.path.join(UPLOADS_DIR, thumbnail_filename)

    content = None
    try:
        content = await file.read()
        file_size = len(content)
        with open(video_path, "wb") as f:
            f.write(content)
    except Exception as e:
        err_msg = f"Failed to save upload: {str(e)}"
        logger.error(
            "Failed to save uploaded video file to disk",
            extra={
                "uploaded_filename": file.filename,
                "file_size": len(content) if content is not None else None,
                "mime_type": file.content_type,
                "saved_file_path": video_path,
                "exception_type": type(e).__name__,
                "python_traceback": traceback.format_exc(),
            },
        )
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "stage": "storage",
                "error": "File save error",
                "details": err_msg,
                "detail": err_msg,
            },
        )

    try:
        metadata = get_video_metadata(video_path)
    except Exception as e:
        delete_file_safe(video_path)
        err_msg = str(e)
        ffprobe_bin = get_ffprobe_path()
        ffprobe_cmd = [
            ffprobe_bin,
            "-v",
            "error",
            "-show_format",
            "-show_streams",
            "-print_format",
            "json",
            video_path,
        ]
        logger.error(
            "Failed to extract video metadata with ffprobe",
            extra={
                "uploaded_filename": file.filename,
                "file_size": file_size if "file_size" in locals() else None,
                "mime_type": file.content_type,
                "saved_file_path": video_path,
                "ffprobe_command": ffprobe_cmd,
                "ffprobe_stdout": None,
                "ffprobe_stderr": err_msg,
                "exception_type": type(e).__name__,
                "python_traceback": traceback.format_exc(),
            },
        )
        detail_text = f"Invalid or corrupted video file: {err_msg}"
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "stage": "metadata",
                "error": "Invalid or corrupted video",
                "details": err_msg,
                "detail": detail_text,
            },
        )

    thumbnail_success = generate_thumbnail(
        video_path, thumbnail_path, metadata.get("duration", 0.0)
    )
    thumbnail_url = f"/api/static/{thumbnail_filename}" if thumbnail_success else None

    return {
        "file_id": file_id,
        "filename": file.filename,
        "metadata": metadata,
        "thumbnail_url": thumbnail_url,
    }


@router.post("/compress")
async def start_compression(options: CompressionOptions, db: Session = Depends(get_db)):
    """Enqueues video, audio, or GIF processing jobs inside our queue worker manager."""
    file_id = options.file_id

    input_file = None
    ext = ""
    for item in os.listdir(UPLOADS_DIR):
        if item.startswith(file_id) and not item.endswith(".jpg"):
            input_file = item
            ext = os.path.splitext(item)[1]
            break

    if not input_file:
        raise HTTPException(status_code=404, detail="Upload file not found or expired.")

    input_path = os.path.join(UPLOADS_DIR, input_file)
    task_id = str(uuid.uuid4())

    # Map output file extension
    out_ext = ".mp4"
    if options.task_type == "gif_conversion":
        out_ext = ".gif"
    elif options.task_type == "audio_extraction":
        out_ext = f".{options.audio_codec or 'mp3'}"
    elif options.container:
        out_ext = f".{options.container.lstrip('.')}"

    output_filename = f"compressed_{task_id}{out_ext}"
    output_path = os.path.join(COMPRESSED_DIR, output_filename)

    try:
        meta = get_video_metadata(input_path)
        duration = meta["duration"]
        original_size = meta["size"]
        filename = meta["filename"]
    except Exception as e:
        err_msg = str(e)
        ffmpeg_bin = get_ffmpeg_path()
        logger.error(
            "Failed to read file info during compression setup",
            extra={
                "uploaded_filename": input_file,
                "file_size": (
                    os.path.getsize(input_path) if os.path.exists(input_path) else None
                ),
                "saved_file_path": input_path,
                "ffmpeg_command": [ffmpeg_bin],
                "exception_type": type(e).__name__,
                "python_traceback": traceback.format_exc(),
            },
        )
        detail_text = f"Failed to read file info: {err_msg}"
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "stage": "compress_init",
                "error": "File read failure",
                "details": err_msg,
                "detail": detail_text,
            },
        )

    # Query database settings config
    settings_repo = SettingsRepository(db)
    settings_repo.initialize_defaults()
    enable_watermark = settings_repo.get("enable_watermark") == "true"
    watermark_text = settings_repo.get("watermark_text") if enable_watermark else None

    # Determine resolution string for history
    res_str = (
        f"{options.width}x{options.height}"
        if options.width and options.height
        else f"{meta.get('width', 1920)}x{meta.get('height', 1080)}"
    )
    codec_str = meta.get("video_codec", "h264")

    # Record database entry
    history_repo = HistoryRepository(db)
    history_repo.add(
        task_id=task_id,
        filename=filename,
        original_size=original_size,
        duration=duration,
        status="pending",
        task_type=options.task_type,
        preset_used=options.preset,
        video_codec=codec_str,
        resolution=res_str,
    )

    # Memory progress log initialization
    active_tasks[task_id] = {
        "status": "pending",
        "progress": 0.0,
        "elapsed": 0.0,
        "eta": 0.0,
        "speed": "0.0x",
        "fps": 0.0,
        "original_size": original_size,
        "filename": filename,
        "input_path": input_path,
        "output_path": output_path,
        "process": None,
    }

    def on_success(compressed_size: int, compression_time: float):
        saved = (
            round(((original_size - compressed_size) / original_size) * 100.0, 1)
            if original_size > 0
            else 0.0
        )
        saved_mb = round((original_size - compressed_size) / (1024.0 * 1024.0), 2)
        log_text = active_tasks.get(task_id, {}).get("ffmpeg_log", "")
        # Access localized db connection for background thread tasks
        db_thread = next(get_db())
        try:
            h_repo = HistoryRepository(db_thread)
            h_repo.update(
                task_id,
                compressed_size,
                saved,
                compression_time,
                "completed",
                saved_mb=saved_mb,
                ffmpeg_log=log_text,
            )
        finally:
            db_thread.close()

    def on_failure(error_msg: str):
        log_text = active_tasks.get(task_id, {}).get("ffmpeg_log", error_msg)
        db_thread = next(get_db())
        try:
            h_repo = HistoryRepository(db_thread)
            h_repo.update(
                task_id, 0, 0.0, 0.0, "failed", saved_mb=0.0, ffmpeg_log=log_text
            )
        finally:
            db_thread.close()
        delete_file_safe(output_path)

    def run_worker_task():
        if options.task_type == "gif_conversion":
            cmd = FFmpegService.build_gif_cmd(input_path, output_path)
        elif options.task_type == "audio_extraction":
            cmd = FFmpegService.build_audio_extraction_cmd(
                input_path, output_path, options.audio_codec or "mp3"
            )
        else:  # compression or watermark
            watermark_img_path = None
            if options.task_type == "watermark":
                logo_dir = os.path.join(
                    os.path.dirname(
                        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    ),
                    "logo",
                    "icons",
                )
                watermark_img_path = os.path.join(logo_dir, "icon_dark_128x128.png")
                if not os.path.exists(watermark_img_path):
                    watermark_img_path = None
            cmd = FFmpegService.build_compression_cmd(
                input_path=input_path,
                output_path=output_path,
                options=options.model_dump(),
                watermark_img_path=watermark_img_path,
                watermark_text=watermark_text,
            )
        FFmpegService.run_ffmpeg_task(task_id, cmd, duration, on_success, on_failure)

    # Push job to QueueManager
    QueueManager().add_task(task_id, run_worker_task)

    return {"task_id": task_id, "status": "pending"}


@router.get("/compress/status/{task_id}")
def get_status(task_id: str):
    """Fetches progress logs of active queues."""
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found or state cleared.")
    task = active_tasks[task_id]
    return {
        "task_id": task_id,
        "status": task["status"],
        "progress": task["progress"],
        "elapsed": task["elapsed"],
        "eta": task["eta"],
        "speed": task.get("speed", "0.0x"),
        "fps": task.get("fps", 0.0),
        "original_size": task["original_size"],
        "compressed_size": task.get("compressed_size"),
        "error": task.get("error"),
    }


@router.get("/compress/logs/{task_id}")
def get_task_logs(task_id: str, db: Session = Depends(get_db)):
    """Retrieves full FFmpeg CLI command, status logs, and execution traces for a task."""
    if task_id in active_tasks and "ffmpeg_log" in active_tasks[task_id]:
        return {
            "task_id": task_id,
            "status": active_tasks[task_id].get("status"),
            "cmd": active_tasks[task_id].get("cmd_str"),
            "log": active_tasks[task_id].get("ffmpeg_log"),
        }

    repo = HistoryRepository(db)
    row = repo.get_by_id(task_id)
    if row and row.ffmpeg_log:
        return {"task_id": task_id, "status": row.status, "log": row.ffmpeg_log}

    raise HTTPException(status_code=404, detail="No log trace found for task.")


@router.post("/open-folder/{task_id}")
def open_output_folder(task_id: str):
    """Reveals the compressed video file in Windows File Explorer."""
    import subprocess
    from app.utils.storage import COMPRESSED_DIR

    target_path = None
    for ext in [".mp4", ".mov", ".avi", ".mkv", ".gif", ".mp3", ".webm"]:
        test_p = os.path.join(COMPRESSED_DIR, f"compressed_{task_id}{ext}")
        if os.path.exists(test_p):
            target_path = test_p
            break

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(
            status_code=404, detail="Output file does not exist on disk."
        )

    try:
        norm_path = os.path.normpath(target_path)
        subprocess.Popen(["explorer.exe", "/select,", norm_path])
        return {"status": "success", "message": f"Opened folder for {task_id}"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to open explorer: {str(e)}"
        )


@router.post("/compress/control")
def control_task(req: ControlRequest, db: Session = Depends(get_db)):
    """Pause, resume, or cancel queued actions."""
    action = req.action.lower()
    task_id = req.task_id

    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found.")

    if action == "pause":
        success = suspend_compression(task_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to pause task.")
        return {"task_id": task_id, "status": "paused"}

    elif action == "resume":
        success = resume_compression(task_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to resume task.")
        return {"task_id": task_id, "status": "processing"}

    elif action == "cancel":
        task = active_tasks[task_id]
        kill_compression(task_id)
        delete_file_safe(task.get("input_path"))
        delete_file_safe(task.get("output_path"))

        repo = HistoryRepository(db)
        repo.update(task_id, 0, 0.0, 0.0, "cancelled")
        return {"task_id": task_id, "status": "cancelled"}
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action '{action}'.")


@router.get("/download/{task_id}")
def download_output(task_id: str):
    """Serves the output file for downloading and preview streaming."""
    output_path = None
    filename = "compressed_video.mp4"

    if task_id in active_tasks:
        task = active_tasks[task_id]
        if task.get("status") == "completed" and os.path.exists(
            task.get("output_path", "")
        ):
            output_path = task["output_path"]
            filename = f"compressed_{task.get('filename', 'video.mp4')}"

    if not output_path or not os.path.exists(output_path):
        # Fallback check in COMPRESSED_DIR
        for ext in [".mp4", ".mov", ".avi", ".mkv", ".gif", ".mp3", ".aac", ".webm"]:
            test_path = os.path.join(COMPRESSED_DIR, f"compressed_{task_id}{ext}")
            if os.path.exists(test_path):
                output_path = test_path
                filename = f"compressed_{task_id}{ext}"
                break

    if not output_path or not os.path.exists(output_path):
        raise HTTPException(
            status_code=404, detail="Requested video file was not found on server."
        )

    ext = os.path.splitext(output_path)[1].lower()
    media_type = "video/mp4"
    if ext == ".gif":
        media_type = "image/gif"
    elif ext == ".mp3":
        media_type = "audio/mpeg"
    elif ext == ".aac":
        media_type = "audio/aac"
    elif ext == ".webm":
        media_type = "video/webm"
    elif ext == ".mov":
        media_type = "video/quicktime"
    elif ext == ".mkv":
        media_type = "video/x-matroska"

    return FileResponse(
        path=output_path,
        media_type=media_type,
        filename=filename,
        headers={"Accept-Ranges": "bytes"},
    )
