from typing import Optional

class VideoValidator:
    SUPPORTED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}

    @staticmethod
    def validate_file_extension(filename: str) -> bool:
        """Validate if file format is supported."""
        if not filename:
            return False
        dot_idx = filename.rfind('.')
        if dot_idx == -1:
            return False
        ext = filename[dot_idx:].lower()
        return ext in VideoValidator.SUPPORTED_EXTENSIONS

    @staticmethod
    def validate_video_options(
        width: Optional[int] = None,
        height: Optional[int] = None,
        fps: Optional[float] = None,
        crf: Optional[int] = None
    ):
        """Validate that target rendering configurations are logical and valid."""
        if crf is not None:
            if crf < 0 or crf > 51:
                raise ValueError("CRF must be between 0 (lossless) and 51 (worst quality)")
                
        if width is not None:
            if width <= 0 or width > 7680:
                raise ValueError("Width must be a positive integer and less than 7680 (8K)")
                
        if height is not None:
            if height <= 0 or height > 4320:
                raise ValueError("Height must be a positive integer and less than 4320 (4K)")
                
        if fps is not None:
            if fps <= 0 or fps > 240:
                raise ValueError("FPS must be between 1 and 240")
