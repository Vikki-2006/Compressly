import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Resolve DB_PATH to workspace root history.db
# __file__ is in backend/app/database/connection.py
# Going up 3 levels relative to dirname(__file__) reaches the workspace root.
DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "history.db")
)
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False
    },  # Required for SQLite with multithreading
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
