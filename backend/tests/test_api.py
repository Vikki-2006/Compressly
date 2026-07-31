from fastapi.testclient import TestClient
import os
import sys

# Ensure the backend directory is in the import path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import init_db
from app.main import app

# Initialize database schema for tests
init_db()

client = TestClient(app)

def test_health_check():
    """Verifies that the /api/health check endpoint resolves correctly."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ffmpeg" in data
    assert "system" in data

def test_history_list():
    """Verifies that history listing returns an array response."""
    response = client.get("/api/history")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
