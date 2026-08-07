import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ─── Database Path Resolution ─────────────────────────────────────────────────
# Supports DATABASE_URL env var for any external DB or custom path override.
# Default: SQLite file at <backend_root>/history.db
#   - Local dev:  c:\...\backend\history.db
#   - Railway:    /app/history.db  (WORKDIR is /app = backend/)
#
# __file__ is backend/app/database/connection.py → go up 2 levels to reach backend/
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_DB_PATH = os.path.join(_BACKEND_DIR, "history.db")

DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    f"sqlite:///{_DEFAULT_DB_PATH}"
)

# SQLite-specific connection args (not needed for Postgres etc.)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI Dependency to get database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
