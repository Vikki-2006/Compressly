import uuid
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.utils.logger import logger
from fastapi.exceptions import HTTPException

class GlobalErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        start_time = time.time()
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            # Log successful requests
            logger.info(
                f"Request processed successfully: {request.method} {request.url.path}",
                extra={"request_id": request_id, "process_time_seconds": process_time}
            )
            response.headers["X-Request-ID"] = request_id
            return response
        except HTTPException as exc:
            logger.warning(
                f"HTTP Exception trapped: {exc.detail}",
                extra={"request_id": request_id, "status_code": exc.status_code}
            )
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail, "request_id": request_id}
            )
        except Exception as exc:
            # Trapping any unexpected system errors (e.g. database disconnect, syntax/index/type error)
            logger.error(
                f"Unhandled Server Error: {str(exc)}",
                exc_info=True,
                extra={"request_id": request_id}
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal Server Error", "request_id": request_id}
            )
