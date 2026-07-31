import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.database import get_history, delete_history_entry
from app.utils.storage import COMPRESSED_DIR
from app.services.video import active_tasks

router = APIRouter(prefix="/api/history")

@router.get("")
def list_history():
    """Fetches full log list of video compressions stored in SQLite."""
    logs = get_history()
    # Check if download files are still available on disk
    for log in logs:
        task_id = log["id"]
        # File is available if it exists in COMPRESSED_DIR and we have a record in active_tasks
        # or if it exists on disk and is associated with task_id.
        # Let's inspect the files in compressed/ to see if the video is still there.
        # We named output files: compressed_{task_id}{ext}
        file_exists = False
        for ext in [".mp4", ".mov", ".avi", ".mkv"]:
            test_path = os.path.join(COMPRESSED_DIR, f"compressed_{task_id}{ext}")
            if os.path.exists(test_path):
                file_exists = True
                break
        log["file_exists"] = file_exists
    return logs

@router.delete("/{task_id}")
def clear_history_entry(task_id: str):
    """Deletes history row from database and deletes any matching compressed files."""
    # Delete from database
    delete_history_entry(task_id)
    
    # Try deleting actual file on disk if it exists
    for ext in [".mp4", ".mov", ".avi", ".mkv"]:
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
    """Allows one-click download again if the file still exists in storage."""
    file_path = None
    filename = "compressed_video.mp4"
    
    # Check all allowed formats
    for ext in [".mp4", ".mov", ".avi", ".mkv"]:
        test_path = os.path.join(COMPRESSED_DIR, f"compressed_{task_id}{ext}")
        if os.path.exists(test_path):
            file_path = test_path
            break
            
    if not file_path:
        raise HTTPException(
            status_code=410, 
            detail="The file has been permanently deleted from server storage to preserve privacy."
        )
        
    # Attempt to extract original name from active tasks or default
    if task_id in active_tasks:
        filename = f"compressed_{active_tasks[task_id]['filename']}"
        
    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=filename
    )
