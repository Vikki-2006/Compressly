from fastapi.testclient import TestClient
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure the backend directory is in the import path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import Base, get_db
from app.main import app
from app.repository.settings_repo import SettingsRepository
from app.repository.history_repo import HistoryRepository

import pytest

# File-based SQLite for testing
TEST_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_history.db")
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown():
    """Initializes the database before tests and ensures file cleanup after tests finish."""
    # Ensure fresh state
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass
            
    Base.metadata.create_all(bind=test_engine)
    yield
    
    test_engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

def override_get_db():
    """Overrides the database session with the test session for APIs."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_health_check():
    """Verifies that the /api/health check endpoint resolves correctly."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ffmpeg" in data
    assert "system" in data

def test_settings_endpoints():
    """Tests GET and POST requests for settings configuration."""
    # Fetch default settings
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["default_preset"] == "medium"
    assert data["enable_watermark"] == "false"

    # Update settings
    payload = {
        "default_preset": "high",
        "cleanup_threshold_seconds": "3600",
        "output_format": "mp4",
        "default_crf": "20",
        "enable_watermark": "true",
        "watermark_text": "TestCompressly"
    }
    response = client.post("/api/settings", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Re-verify settings updated
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert response.json()["default_preset"] == "high"
    assert response.json()["watermark_text"] == "TestCompressly"

def test_history_and_stats():
    """Tests that logging history works and maps cleanly to statistics aggregation."""
    # Clear / check initial history
    response = client.get("/api/history")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

    # Insert a mock entry via repository using a direct test db session
    db = TestingSessionLocal()
    try:
        repo = HistoryRepository(db)
        repo.add(
            task_id="test-task-123",
            filename="sample.mp4",
            original_size=1000000,
            duration=60.0,
            status="completed",
            task_type="compression"
        )
        repo.update(
            task_id="test-task-123",
            compressed_size=400000,
            saved_percentage=60.0,
            compression_time=15.5,
            status="completed"
        )
    finally:
        db.close()

    # Re-fetch history
    response = client.get("/api/history")
    assert response.status_code == 200
    history_list = response.json()
    assert len(history_list) >= 1
    assert history_list[0]["id"] == "test-task-123"
    assert history_list[0]["saved_percentage"] == 60.0

    # Fetch stats
    response = client.get("/api/stats")
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_processed"] >= 1
    assert stats["completed_count"] >= 1
    assert stats["average_reduction_percentage"] == 60.0

    # Clean up mock entry
    response = client.delete("/api/history/test-task-123")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_auth_flow():
    """Verify registration, login, JWT token emission, and current user profile fetch."""
    # Register a new user
    reg_payload = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "securepassword123"
    }
    response = client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 201
    assert response.json()["username"] == "testuser"
    assert response.json()["email"] == "testuser@example.com"
    assert "id" in response.json()

    # Re-registering duplicate user returns error
    response = client.post("/api/auth/register", json=reg_payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

    # Login with wrong credentials
    login_data = {
        "username": "testuser",
        "password": "wrongpassword"
    }
    response = client.post("/api/auth/login", data=login_data)
    assert response.status_code == 401
    assert "Incorrect username" in response.json()["detail"]

    # Successful login
    login_data = {
        "username": "testuser",
        "password": "securepassword123"
    }
    response = client.post("/api/auth/login", data=login_data)
    assert response.status_code == 200
    token_info = response.json()
    assert token_info["token_type"] == "bearer"
    assert "access_token" in token_info
    token = token_info["access_token"]

    # Retrieve profile using the JWT
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"

    # Profile without token returns 401
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_video_validators():
    """Test video validators bounds checking."""
    from app.validators.video_validator import VideoValidator
    
    # Valid configurations
    assert VideoValidator.validate_file_extension("video.mp4") is True
    assert VideoValidator.validate_file_extension("movie.MKV") is True
    assert VideoValidator.validate_file_extension("text.txt") is False

    # Validation bounds checking
    VideoValidator.validate_video_options(width=1920, height=1080, fps=30, crf=24) # should not raise

    with pytest.raises(ValueError, match="CRF must be between"):
        VideoValidator.validate_video_options(crf=55)

    with pytest.raises(ValueError, match="Width must be a positive"):
        VideoValidator.validate_video_options(width=-10)

    with pytest.raises(ValueError, match="FPS must be between"):
        VideoValidator.validate_video_options(fps=300)

def test_error_handler_middleware():
    """Test global error handler middleware intercepts exceptions."""
    # Force a path that returns 404 (non-existent route)
    response = client.get("/api/non-existent-endpoint-route")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "request_id" in data
    assert "X-Request-ID" in response.headers

def test_structured_logger():
    """Verify structured logger format outputs correct JSON fields."""
    import logging
    from io import StringIO
    from app.utils.logger import setup_logger, JsonFormatter
    import json
    
    stream = StringIO()
    test_logger = logging.getLogger("test_logger")
    test_logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    test_logger.addHandler(handler)
    
    test_logger.info(
        "Verifying structured logs",
        extra={
            "request_id": "test-req-uuid",
            "uploaded_filename": "test.mp4",
            "file_size": 1024,
            "custom_detail": {"key": "val"}
        }
    )
    
    log_output = stream.getvalue().strip()
    assert log_output != ""
    log_json = json.loads(log_output)
    
    assert log_json["message"] == "Verifying structured logs"
    assert log_json["level"] == "INFO"
    assert log_json["request_id"] == "test-req-uuid"
    assert log_json["uploaded_filename"] == "test.mp4"
    assert log_json["file_size"] == 1024
    assert "timestamp" in log_json

def test_find_executable_resolver():
    """Verify find_executable correctly resolves executables or returns fallback."""
    from app.services.video import find_executable, get_ffmpeg_path, get_ffprobe_path
    
    ffmpeg_p = get_ffmpeg_path()
    ffprobe_p = get_ffprobe_path()
    assert ffmpeg_p is not None
    assert ffprobe_p is not None

def test_metadata_unsupported_format_response():
    """Verify /api/metadata returns structured HTTP 400 response on invalid extension."""
    files = {"file": ("test.txt", b"dummy content", "text/plain")}
    response = client.post("/api/metadata", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    detail = data["detail"]
    assert detail["success"] is False
    assert detail["stage"] == "validation"
    assert "Unsupported" in detail["error"]

def test_phase1_logs_and_history_schema():
    """Verify Phase 1 history repository columns and log endpoint behavior."""
    db = TestingSessionLocal()
    try:
        repo = HistoryRepository(db)
        entry = repo.add(
            task_id="phase1_test_task",
            filename="sample.mp4",
            original_size=5000000,
            duration=10.0,
            status="completed",
            preset_used="whatsapp",
            video_codec="hevc",
            resolution="1280x720",
            output_filename="compressed_sample.mp4"
        )
        repo.update(
            task_id="phase1_test_task",
            compressed_size=2000000,
            saved_percentage=60.0,
            compression_time=2.5,
            status="completed",
            saved_mb=3.0,
            ffmpeg_log="CMD: ffmpeg -i sample.mp4 output.mp4\nSTDERR:\nOK"
        )
        
        # Test GET /api/compress/logs/phase1_test_task
        log_res = client.get("/api/compress/logs/phase1_test_task")
        assert log_res.status_code == 200
        log_data = log_res.json()
        assert log_data["task_id"] == "phase1_test_task"
        assert "ffmpeg -i" in log_data["log"]
    finally:
        db.close()
