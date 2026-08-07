import os
import shutil


class StorageService:
    @staticmethod
    def save_file(content: bytes, destination: str):
        """Save raw bytes to a physical file path."""
        try:
            with open(destination, "wb") as f:
                f.write(content)
        except IOError as e:
            raise IOError(f"Failed to write file to local disk: {str(e)}")

    @staticmethod
    def delete_file(filepath: str) -> bool:
        """Safely delete a file or directory tree."""
        if not filepath or not os.path.exists(filepath):
            return False
        try:
            if os.path.isdir(filepath):
                shutil.rmtree(filepath)
            else:
                os.remove(filepath)
            return True
        except Exception:
            return False

    @staticmethod
    def exists(filepath: str) -> bool:
        """Check if file exists on disk."""
        return os.path.exists(filepath) if filepath else False

    @staticmethod
    def get_size(filepath: str) -> int:
        """Get file size in bytes."""
        if not filepath or not os.path.exists(filepath):
            return 0
        try:
            return os.path.getsize(filepath)
        except OSError:
            return 0
