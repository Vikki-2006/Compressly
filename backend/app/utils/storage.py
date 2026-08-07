import os
import time
import shutil
import threading

# ─── Path resolution ──────────────────────────────────────────────────────────
# Inside Railway's Docker container, WORKDIR is /app (the backend/ directory).
# We resolve storage directories relative to this file's package root (/app).
# Supports DATA_DIR env var override for any deployment target.

# __file__ is /app/app/utils/storage.py → go up 2 levels to reach /app
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Allow override via env var (useful for Railway volumes or custom setups)
BASE_DIR = os.environ.get("DATA_DIR", _BACKEND_DIR)

UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
COMPRESSED_DIR = os.path.join(BASE_DIR, "compressed")
TEMP_DIR = os.path.join(BASE_DIR, "temp")

# Ensure directories exist immediately at module load time to prevent StaticFiles mount crashes
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(COMPRESSED_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)


def init_directories():
    """Double checks uploads, compressed, and temp directories exist."""
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(COMPRESSED_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)


def delete_file_safe(file_path: str):
    """Safely removes a file or directory if it exists."""
    if file_path and os.path.exists(file_path):
        try:
            if os.path.isdir(file_path):
                shutil.rmtree(file_path)
            else:
                os.remove(file_path)
        except Exception as e:
            print(f"[Storage] Failed to delete {file_path}: {e}")


def cleanup_loop(max_age_seconds: int = 1800, check_interval_seconds: int = 120):
    """
    Periodically checks storage folders and removes files older than max_age_seconds.
    """
    while True:
        try:
            now = time.time()
            for directory in [UPLOADS_DIR, COMPRESSED_DIR, TEMP_DIR]:
                if not os.path.exists(directory):
                    continue
                for item in os.listdir(directory):
                    item_path = os.path.join(directory, item)
                    # Ignore system/hidden files
                    if item.startswith("."):
                        continue
                    try:
                        mtime = os.path.getmtime(item_path)
                        if now - mtime > max_age_seconds:
                            delete_file_safe(item_path)
                            print(f"[Cleanup] Deleted stale file: {item_path}")
                    except Exception as e:
                        print(f"[Cleanup] Error inspecting {item_path}: {e}")
        except Exception as e:
            print(f"[Cleanup] Error in cleanup cycle: {e}")
        time.sleep(check_interval_seconds)


def start_cleanup_thread():
    """Launches the automatic directory cleanup thread in the background."""
    t = threading.Thread(target=cleanup_loop, daemon=True, name="stale-files-cleanup")
    t.start()
