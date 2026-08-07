from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from sqlalchemy import text
from app.database.connection import engine, Base
from app.utils.storage import init_directories, start_cleanup_thread, UPLOADS_DIR
from app.routers import compress, history, settings, stats, auth
from app.middleware.error_handler import GlobalErrorHandlerMiddleware


def ensure_db_schema():
    """Ensure all tables and columns exist in SQLite database safely via ALTER TABLE."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(history)")).fetchall()
            columns = [row[1] for row in res]
            if "task_type" not in columns:
                conn.execute(
                    text(
                        "ALTER TABLE history ADD COLUMN task_type VARCHAR DEFAULT 'compression'"
                    )
                )
            if "preset_used" not in columns:
                conn.execute(
                    text(
                        "ALTER TABLE history ADD COLUMN preset_used VARCHAR DEFAULT 'balanced'"
                    )
                )
            if "video_codec" not in columns:
                conn.execute(
                    text(
                        "ALTER TABLE history ADD COLUMN video_codec VARCHAR DEFAULT 'h264'"
                    )
                )
            if "resolution" not in columns:
                conn.execute(
                    text(
                        "ALTER TABLE history ADD COLUMN resolution VARCHAR DEFAULT '1080p'"
                    )
                )
            if "output_filename" not in columns:
                conn.execute(
                    text("ALTER TABLE history ADD COLUMN output_filename VARCHAR")
                )
            if "saved_mb" not in columns:
                conn.execute(
                    text("ALTER TABLE history ADD COLUMN saved_mb FLOAT DEFAULT 0.0")
                )
            if "ffmpeg_log" not in columns:
                conn.execute(text("ALTER TABLE history ADD COLUMN ffmpeg_log TEXT"))
            conn.commit()
        except Exception as e:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure directories, db tables, and clean logs exist
    init_directories()
    ensure_db_schema()
    start_cleanup_thread()
    yield
    # Shutdown: Nothing specific needed


app = FastAPI(
    title="Compressly API",
    description="Fast, privacy-focused, offline-first local video compressor API utilizing FFmpeg.",
    version="1.0.0",
    lifespan=lifespan,
)

# Global structured error trapping and request logging
app.add_middleware(GlobalErrorHandlerMiddleware)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request_id},
    )


# CORS setup for React frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads/ static directory to serve thumbnails
app.mount("/api/static", StaticFiles(directory=UPLOADS_DIR), name="static")

# Register routers
app.include_router(compress.router)
app.include_router(history.router)
app.include_router(settings.router)
app.include_router(stats.router)
app.include_router(auth.router)
