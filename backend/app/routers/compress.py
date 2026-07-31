import os
import uuid
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
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
    get_ffprobe_path
)
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
    task_type: str = "compression" # "compression", "gif_conversion", "audio_extraction", "watermark"
    audio_codec: Optional[str] = "mp3"

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
        subprocess_res = os.system(f'"{ffmpeg_bin}" -version > nul 2>&1') if os.name == 'nt' else os.system(f'{ffmpeg_bin} -version > /dev/null 2>&1')
        ffmpeg_avail = (subprocess_res == 0)
    except Exception:
        pass
        
    try:
        ffprobe_bin = get_ffprobe_path()
        subprocess_res = os.system(f'"{ffprobe_bin}" -version > nul 2>&1') if os.name == 'nt' else os.system(f'{ffprobe_bin} -version > /dev/null 2>&1')
        ffprobe_avail = (subprocess_res == 0)
    except Exception:
        pass
        
    cpu_percent = psutil.cpu_percent()
    ram = psutil.virtual_memory()
    
    return {
        "status": "healthy",
        "ffmpeg": {
            "available": ffmpeg_avail,
            "path": get_ffmpeg_path()
        },
        "ffprobe": {
            "available": ffprobe_avail,
            "path": get_ffprobe_path()
        },
        "system": {
            "cpu_usage_percent": cpu_percent,
            "ram_usage_percent": ram.percent,
            "ram_free_gb": round(ram.available / (1024**3), 2)
        }
    }

@router.post("/metadata")
async def get_metadata_endpoint(file: UploadFile = File(...)):
    """Saves uploaded files temporarily, parses video specs, and renders thumbnail."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".mov", ".avi", ".mkv"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Only MP4, MOV, AVI, and MKV are allowed."
        )
        
    file_id = str(uuid.uuid4())
    video_filename = f"{file_id}{ext}"
    video_path = os.path.join(UPLOADS_DIR, video_filename)
    thumbnail_filename = f"{file_id}.jpg"
    thumbnail_path = os.path.join(UPLOADS_DIR, thumbnail_filename)
    
    try:
        with open(video_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {str(e)}")
        
    try:
        metadata = get_video_metadata(video_path)
    except Exception as e:
        delete_file_safe(video_path)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or corrupted video file: {str(e)}"
        )
        
    thumbnail_success = generate_thumbnail(video_path, thumbnail_path, metadata.get("duration", 0.0))
    thumbnail_url = f"/api/static/{thumbnail_filename}" if thumbnail_success else None
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "metadata": metadata,
        "thumbnail_url": thumbnail_url
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
    out_ext = ext
    if options.task_type == "gif_conversion":
        out_ext = ".gif"
    elif options.task_type == "audio_extraction":
        out_ext = f".{options.audio_codec or 'mp3'}"
        
    output_filename = f"compressed_{task_id}{out_ext}"
    output_path = os.path.join(COMPRESSED_DIR, output_filename)
    
    try:
        meta = get_video_metadata(input_path)
        duration = meta["duration"]
        original_size = meta["size"]
        filename = meta["filename"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file info: {str(e)}")
        
    # Query database settings config
    settings_repo = SettingsRepository(db)
    settings_repo.initialize_defaults()
    enable_watermark = settings_repo.get("enable_watermark") == "true"
    watermark_text = settings_repo.get("watermark_text") if enable_watermark else None
    
    # Record database entry
    history_repo = HistoryRepository(db)
    history_repo.add(
        task_id=task_id, 
        filename=filename, 
        original_size=original_size, 
        duration=duration, 
        status="pending",
        task_type=options.task_type
    )
    
    # Memory progress log initialization
    active_tasks[task_id] = {
        "status": "pending",
        "progress": 0.0,
        "elapsed": 0.0,
        "eta": 0.0,
        "speed": "0.0x",
        "original_size": original_size,
        "filename": filename,
        "input_path": input_path,
        "output_path": output_path,
        "process": None
    }
    
    def on_success(compressed_size: int, compression_time: float):
        saved = round(((original_size - compressed_size) / original_size) * 100.0, 1) if original_size > 0 else 0.0
        # Access localized db connection for background thread tasks
        db_thread = next(get_db())
        try:
            h_repo = HistoryRepository(db_thread)
            h_repo.update(task_id, compressed_size, saved, compression_time, "completed")
        finally:
            db_thread.close()
        delete_file_safe(input_path)
        
    def on_failure(error_msg: str):
        db_thread = next(get_db())
        try:
            h_repo = HistoryRepository(db_thread)
            h_repo.update(task_id, 0, 0.0, 0.0, "failed")
        finally:
            db_thread.close()
        delete_file_safe(output_path)
        
    def run_worker_task():
        if options.task_type == "gif_conversion":
            cmd = FFmpegService.build_gif_cmd(input_path, output_path)
        elif options.task_type == "audio_extraction":
            cmd = FFmpegService.build_audio_extraction_cmd(input_path, output_path, options.audio_codec or "mp3")
        else: # compression or watermark
            watermark_img_path = None
            if options.task_type == "watermark":
                # Default graphic watermark image located in logo/icons/icon_dark_128x128.png
                logo_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logo", "icons")
                watermark_img_path = os.path.join(logo_dir, "icon_dark_128x128.png")
                if not os.path.exists(watermark_img_path):
                    watermark_img_path = None
            cmd = FFmpegService.build_compression_cmd(
                input_path=input_path,
                output_path=output_path,
                options=options.model_dump(),
                watermark_img_path=watermark_img_path,
                watermark_text=watermark_text
            )
        FFmpegService.run_ffmpeg_task(task_id, cmd, duration, on_success, on_failure)
        
    # Push job to QueueManager
    QueueManager().add_task(task_id, run_worker_task)
    
    return {
        "task_id": task_id,
        "status": "pending"
    }

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
        "speed": task["speed"],
        "original_size": task["original_size"],
        "compressed_size": task.get("compressed_size"),
        "error": task.get("error")
    }

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

def delete_after_download(output_path: str, task_id: str):
    time.sleep(2)
    delete_file_safe(output_path)
    if task_id in active_tasks:
        active_tasks.pop(task_id, None)

@router.get("/download/{task_id}")
def download_output(task_id: str, background_tasks: BackgroundTasks):
    """Serves the output file and registers automatic background cleanup."""
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Download expired or not found.")
    task = active_tasks[task_id]
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"File is not ready. Status: {task['status']}")
        
    output_path = task["output_path"]
    if not os.path.exists(output_path):
        raise HTTPException(status_code=410, detail="File has already been cleaned up.")
        
    background_tasks.add_task(delete_after_download, output_path, task_id)
    
    # Map correct media type and file extensions
    ext = os.path.splitext(output_path)[1].lower()
    media_type = "video/mp4"
    if ext == ".gif":
        media_type = "image/gif"
    elif ext == ".mp3":
        media_type = "audio/mpeg"
    elif ext == ".aac":
        media_type = "audio/aac"
        
    return FileResponse(
        path=output_path,
        media_type=media_type,
        filename=f"compressed_{task['filename']}"
    )
