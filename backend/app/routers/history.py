import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.repository.history_repo import HistoryRepository
from app.utils.storage import COMPRESSED_DIR
from app.services.video import active_tasks

router = APIRouter(prefix="/api/history")


@router.get("")
def list_history(db: Session = Depends(get_db)):
    """Fetches full log list of video compressions stored in SQLite database."""
    repo = HistoryRepository(db)
    logs = repo.get_all()

    result = []
    for log in logs:
        task_id = log.id
        file_exists = False

        # Check if output file still exists on disk
        for ext in [".mp4", ".mov", ".avi", ".mkv", ".gif", ".mp3", ".aac"]:
            test_path = os.path.join(COMPRESSED_DIR, f"compressed_{task_id}{ext}")
            if os.path.exists(test_path):
                file_exists = True
                break

        result.append(
            {
                "id": log.id,
                "filename": log.filename,
                "original_size": log.original_size,
                "compressed_size": log.compressed_size,
                "duration": log.duration,
                "saved_percentage": log.saved_percentage,
                "compression_time": log.compression_time,
                "created_at": log.created_at.isoformat() + "Z",
                "status": log.status,
                "task_type": log.task_type,
                "preset_used": getattr(log, "preset_used", "balanced") or "balanced",
                "video_codec": getattr(log, "video_codec", "h264") or "h264",
                "resolution": getattr(log, "resolution", "1080p") or "1080p",
                "saved_mb": getattr(log, "saved_mb", 0.0) or 0.0,
                "file_exists": file_exists,
            }
        )
    return result


@router.delete("/{task_id}")
def clear_history_entry(task_id: str, db: Session = Depends(get_db)):
    """Deletes history row from database and deletes any matching compressed files."""
    repo = HistoryRepository(db)
    repo.delete(task_id)

    # Try deleting actual file on disk if it exists
    for ext in [".mp4", ".mov", ".avi", ".mkv", ".gif", ".mp3", ".aac"]:
        file_path = os.path.join(COMPRESSED_DIR, f"compressed_{task_id}{ext}")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    # Remove from active tasks in memory
    active_tasks.pop(task_id, None)
    return {"status": "success", "message": f"Task {task_id} cleared from history."}


@router.get("/download/{task_id}")
def download_history_file(task_id: str):
    """Allows download again if the file still exists in server storage."""
    file_path = None
    filename = "compressed_video.mp4"
    file_ext = ".mp4"

    # Check all allowed formats
    for ext in [".mp4", ".mov", ".avi", ".mkv", ".gif", ".mp3", ".aac"]:
        test_path = os.path.join(COMPRESSED_DIR, f"compressed_{task_id}{ext}")
        if os.path.exists(test_path):
            file_path = test_path
            file_ext = ext
            break

    if not file_path:
        raise HTTPException(
            status_code=410,
            detail="The file has been permanently deleted from server storage to preserve privacy.",
        )

    if task_id in active_tasks:
        filename = f"compressed_{active_tasks[task_id]['filename']}"
    else:
        filename = f"compressed_{task_id}{file_ext}"

    # Map correct media type
    media_type = "video/mp4"
    if file_ext == ".gif":
        media_type = "image/gif"
    elif file_ext == ".mp3":
        media_type = "audio/mpeg"
    elif file_ext == ".aac":
        media_type = "audio/aac"
    elif file_ext == ".webm":
        media_type = "video/webm"
    elif file_ext == ".mov":
        media_type = "video/quicktime"
    elif file_ext == ".mkv":
        media_type = "video/x-matroska"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename,
        headers={"Accept-Ranges": "bytes"},
    )
