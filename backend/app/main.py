from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database.connection import engine, Base
from app.utils.storage import init_directories, start_cleanup_thread, UPLOADS_DIR
from app.routers import compress, history, settings, stats, auth
from app.middleware.error_handler import GlobalErrorHandlerMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure directories, db tables, and clean logs exist
    init_directories()
    # Create all ORM tables in SQLite
    Base.metadata.create_all(bind=engine)
    start_cleanup_thread()
    yield
    # Shutdown: Nothing specific needed

app = FastAPI(
    title="Compressly API",
    description="Fast, privacy-focused, offline-first local video compressor API utilizing FFmpeg.",
    version="1.0.0",
    lifespan=lifespan
)

# Global structured error trapping and request logging
app.add_middleware(GlobalErrorHandlerMiddleware)

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request_id}
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


