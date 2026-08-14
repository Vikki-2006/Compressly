import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE_URL = "http://localhost:8000"
TEST_VIDEO_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "scratch_test_sample.mp4"
)


def log(step_num: int, title: str, details: str = ""):
    print(f"\n[PHASE 1 - STEP {step_num}/6] {title}")
    if details:
        print(f"  --> {details}")


def main():
    print("==================================================")
    print("      Compressly Phase 1 Verification Suite      ")
    print("==================================================")

    # 1. Health check
    log(1, "Testing /api/health endpoint...")
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=5)
        health = json.loads(req.read().decode())
        assert health["status"] == "healthy"
        log(1, "Health check passed!")
    except Exception as e:
        print(f"FAILED Step 1: {e}")
        sys.exit(1)

    # 2. Metadata upload
    log(2, "Uploading video file to /api/metadata...")
    boundary = "----WebKitFormBoundaryPhase1"
    with open(TEST_VIDEO_PATH, "rb") as f:
        file_bytes = f.read()

    body = (
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="scratch_test_sample.mp4"\r\n'
            f"Content-Type: video/mp4\r\n\r\n"
        ).encode("utf-8")
        + file_bytes
        + f"\r\n--{boundary}--\r\n".encode("utf-8")
    )

    meta_req = urllib.request.Request(
        f"{BASE_URL}/api/metadata",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    res = urllib.request.urlopen(meta_req, timeout=10)
    meta_json = json.loads(res.read().decode())
    file_id = meta_json["file_id"]
    log(2, "Metadata uploaded successfully!", f"file_id: {file_id}")

    # 3. Compress with HEVC, auto GPU acceleration, and MKV container
    log(
        3,
        "Submitting compression task with video_codec='hevc', container='mkv', gpu_acceleration='auto'...",
    )
    comp_payload = json.dumps(
        {
            "file_id": file_id,
            "preset": "fast",
            "video_codec": "hevc",
            "gpu_acceleration": "auto",
            "container": "mkv",
            "crf": 26,
            "task_type": "compression",
        }
    ).encode("utf-8")

    comp_req = urllib.request.Request(
        f"{BASE_URL}/api/compress",
        data=comp_payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    comp_res = urllib.request.urlopen(comp_req, timeout=10)
    comp_json = json.loads(comp_res.read().decode())
    task_id = comp_json["task_id"]
    log(3, "Compression task enqueued!", f"Task ID: {task_id}")

    # 4. Status polling
    log(4, "Polling status until task completes...")
    status = "pending"
    start_time = time.time()
    while time.time() - start_time < 30:
        st_req = urllib.request.urlopen(
            f"{BASE_URL}/api/compress/status/{task_id}", timeout=5
        )
        st_json = json.loads(st_req.read().decode())
        status = st_json["status"]
        if status in ["completed", "failed"]:
            break
        time.sleep(0.3)

    assert (
        status == "completed"
    ), f"Task status expected 'completed', got '{status}': {st_json.get('error')}"
    log(4, "Task completed successfully!")

    # 5. Check /api/compress/logs/{task_id} endpoint
    log(5, "Verifying /api/compress/logs/{task_id} endpoint...")
    log_req = urllib.request.urlopen(
        f"{BASE_URL}/api/compress/logs/{task_id}", timeout=5
    )
    log_json = json.loads(log_req.read().decode())
    assert log_json["task_id"] == task_id
    assert "CMD:" in log_json["log"]
    assert "STDERR:" in log_json["log"]
    log(
        5,
        "Log endpoint verified successfully!",
        f"Command logged: {log_json.get('cmd')}",
    )

    # 6. Verify SQLite History Log
    log(6, "Verifying SQLite history log contains Phase 1 columns...")
    hist_req = urllib.request.urlopen(f"{BASE_URL}/api/history", timeout=5)
    hist_json = json.loads(hist_req.read().decode())
    row = next((r for r in hist_json if r["id"] == task_id), None)
    assert row is not None
    assert row["status"] == "completed"
    log(6, "SQLite History record verified!", json.dumps(row, indent=2))

    print("\n==================================================")
    print("      PHASE 1 VERIFICATION PASSED SUCCESSFULLY!   ")
    print("==================================================")


if __name__ == "__main__":
    main()
