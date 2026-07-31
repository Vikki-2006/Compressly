import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from app.services.video import (
    get_video_metadata,
    generate_thumbnail,
    compress_video_async,
    suspend_compression,
    resume_compression,
    kill_compression,
    active_tasks,
    get_ffmpeg_path,
    get_ffprobe_path
)
from app.utils.storage import UPLOADS_DIR, COMPRESSED_DIR, delete_file_safe
from app.database import add_history_entry, update_history_entry

router = APIRouter(prefix="/api")

class CompressionOptions(BaseModel):
    file_id: str
    preset: str = "medium"  # "fast", "medium", "slow"
    crf: Optional[int] = None
    video_bitrate: Optional[str] = None
    audio_bitrate: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None

class ControlRequest(BaseModel):
    task_id: str
    action: str = Field(..., description="Action to perform: pause, resume, cancel")

@router.get("/health")
def health_check():
    """Checks the system health, FFmpeg availability, and hardware utilization."""
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
    """
    Receives an uploaded video file, saves it, extracts metadata and generates a thumbnail.
    """
    # Verify extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".mov", ".avi", ".mkv"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Only MP4, MOV, AVI, and MKV are allowed."
        )
        
    # Create unique file ID
    file_id = str(uuid.uuid4())
    video_filename = f"{file_id}{ext}"
    video_path = os.path.join(UPLOADS_DIR, video_filename)
    thumbnail_filename = f"{file_id}.jpg"
    thumbnail_path = os.path.join(UPLOADS_DIR, thumbnail_filename)
    
    # Save the file
    try:
        with open(video_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {str(e)}")
        
    # Read metadata & generate thumbnail
    try:
        metadata = get_video_metadata(video_path)
    except Exception as e:
        delete_file_safe(video_path)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or corrupted video file: {str(e)}"
        )
        
    # Generate thumbnail
    thumbnail_success = generate_thumbnail(video_path, thumbnail_path, metadata.get("duration", 0.0))
    thumbnail_url = f"/api/static/{thumbnail_filename}" if thumbnail_success else None
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "metadata": metadata,
        "thumbnail_url": thumbnail_url
    }

@router.post("/compress")
async def start_compression(options: CompressionOptions, background_tasks: BackgroundTasks):
    """
    Enqueues a file for compression using the provided options. Runs FFmpeg asynchronously in the background.
    """
    file_id = options.file_id
    
    # Locate original video
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
    output_filename = f"compressed_{task_id}{ext}"
    output_path = os.path.join(COMPRESSED_DIR, output_filename)
    
    # Fetch metadata for size and duration mapping
    try:
        meta = get_video_metadata(input_path)
        duration = meta["duration"]
        original_size = meta["size"]
        filename = meta["filename"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file info: {str(e)}")
        
    # Save base info in SQLite
    try:
        add_history_entry(task_id, filename, original_size, duration, status="processing")
    except Exception as e:
        print(f"Database error writing log: {e}")
        
    # Initialize task state in memory
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
    
    # Define worker callbacks
    def on_success(compressed_size: int, compression_time: float):
        saved = round(((original_size - compressed_size) / original_size) * 100.0, 1)
        update_history_entry(task_id, compressed_size, saved, compression_time, "completed")
        # Safely delete original upload video file to free space
        delete_file_safe(input_path)
        
    def on_failure(error_msg: str):
        update_history_entry(task_id, 0, 0.0, 0.0, "failed")
        delete_file_safe(output_path)
        
    # Start thread
    background_tasks.add_task(
        compress_video_async,
        task_id=task_id,
        input_path=input_path,
        output_path=output_path,
        options=options.model_dump(),
        duration=duration,
        on_success=on_success,
        on_failure=on_failure
    )
    
    return {
        "task_id": task_id,
        "status": "pending"
    }

@router.get("/compress/status/{task_id}")
def get_status(task_id: str):
    """Polls the realtime status of a compression task."""
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Task not found or state cleared.")
        
    task = active_tasks[task_id]
    
    # Return formatted progress
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
def control_task(req: ControlRequest):
    """Executes a command on an active task: pause, resume, or cancel."""
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
        # Delete output file immediately
        task = active_tasks[task_id]
        success = kill_compression(task_id)
        
        # Cleanup files
        delete_file_safe(task.get("input_path"))
        delete_file_safe(task.get("output_path"))
        
        # Log cancellation in SQLite history
        update_history_entry(task_id, 0, 0.0, 0.0, "cancelled")
        
        return {"task_id": task_id, "status": "cancelled"}
        
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action '{action}'.")

def delete_after_download(output_path: str, task_id: str):
    """Safely cleans up compression task resources from disks and lists."""
    time.sleep(2)  # short buffer to guarantee response stream completes
    delete_file_safe(output_path)
    # Clear in memory state
    if task_id in active_tasks:
        active_tasks.pop(task_id, None)

@router.get("/download/{task_id}")
def download_output(task_id: str, background_tasks: BackgroundTasks):
    """Serves the compressed file and schedules absolute cleanup afterward."""
    if task_id not in active_tasks:
        raise HTTPException(status_code=404, detail="Download expired or not found.")
        
    task = active_tasks[task_id]
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Video is not ready. Status: {task['status']}")
        
    output_path = task["output_path"]
    if not os.path.exists(output_path):
        raise HTTPException(status_code=410, detail="File is already cleaned up or deleted.")
        
    # Queue auto-cleanup of the output file after response transmission
    background_tasks.add_task(delete_after_download, output_path, task_id)
    
    return FileResponse(
        path=output_path,
        media_type="video/mp4",
        filename=f"compressed_{task['filename']}"
    )
