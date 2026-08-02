import logging
import json
import time
import sys
from datetime import datetime, timezone

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "func_name": record.funcName,
            "line_no": record.lineno,
        }
        
        # Include exception details if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
            
        # Add custom extra variables from log context (all non-standard fields)
        standard_fields = {
            'name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 'filename',
            'module', 'exc_info', 'exc_text', 'stack_info', 'lineno', 'funcName',
            'created', 'msecs', 'relativeCreated', 'thread', 'threadName',
            'processName', 'process', 'message', 'asctime', 'taskName'
        }
        for key, value in record.__dict__.items():
            if key not in standard_fields:
                try:
                    json.dumps(value)
                    log_data[key] = value
                except (TypeError, OverflowError):
                    log_data[key] = str(value)
            
        return json.dumps(log_data, default=str)

def setup_logger(name: str = "compressly") -> logging.Logger:
    """Initialize structured JSON console logging handler."""
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers if setup is run multiple times
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.propagate = False
        
    return logger

logger = setup_logger()
