from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.utils.storage import init_directories, start_cleanup_thread, UPLOADS_DIR
from app.routers import compress, history

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure directories, db tables, and clean logs exist
    init_directories()
    init_db()
    start_cleanup_thread()
    yield
    # Shutdown: Nothing specific needed

app = FastAPI(
    title="Compressly API",
    description="Fast, privacy-focused, offline-first local video compressor API utilizing FFmpeg.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup for Vite frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to specific origins in a strict production environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads/ static directory to serve thumbnails
# This exposes temporary thumbnails under /api/static/<file_id>.jpg
app.mount("/api/static", StaticFiles(directory=UPLOADS_DIR), name="static")

# Register routers
app.include_router(compress.router)
app.include_router(history.router)
