import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "history.db")

def init_db():
    """Initializes the SQLite database and creates the history table if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            original_size INTEGER NOT NULL,
            compressed_size INTEGER,
            duration REAL NOT NULL,
            saved_percentage REAL,
            compression_time REAL,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def add_history_entry(task_id: str, filename: str, original_size: int, duration: float, status: str = "pending"):
    """Inserts a new record into the history table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO history (id, filename, original_size, duration, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (task_id, filename, original_size, duration, datetime.utcnow().isoformat(), status))
    conn.commit()
    conn.close()

def update_history_entry(task_id: str, compressed_size: int, saved_percentage: float, compression_time: float, status: str):
    """Updates a record inside the history table when compression completes or fails."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE history
        SET compressed_size = ?, saved_percentage = ?, compression_time = ?, status = ?
        WHERE id = ?
    """, (compressed_size, saved_percentage, compression_time, status, task_id))
    conn.commit()
    conn.close()

def get_history():
    """Fetches all history rows sorted by descending creation time."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM history ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_history_entry(task_id: str):
    """Removes a row from the history database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM history WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
