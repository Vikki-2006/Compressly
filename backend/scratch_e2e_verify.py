import urllib.request
import urllib.parse
import json
import time
import os

BASE_URL = "http://127.0.0.1:8000"
TEST_VIDEO = "backend/scratch_test_sample.mp4"

print("--- Compressly Master E2E Verification ---")

def post_file(url, filepath):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    filename = os.path.basename(filepath)
    with open(filepath, "rb") as f:
        file_bytes = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: video/mp4\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))

def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))

def post_json(url, data=None):
    body = json.dumps(data).encode("utf-8") if data else b""
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))

def delete_req(url):
    req = urllib.request.Request(url, method="DELETE")
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))

# 1. Health Check
st, data = get_json(f"{BASE_URL}/api/health")
assert st == 200, "Health check failed"
print("[PASS] 1. Backend Health Check OK")

# 2. Upload Video & Extract Metadata (POST /api/metadata)
st, meta = post_file(f"{BASE_URL}/api/metadata", TEST_VIDEO)
assert st == 200, f"Upload failed: {meta}"
file_id = meta["file_id"]
print(f"[PASS] 2. Video Upload OK (file_id={file_id})")

# 3. Metadata Verification
video_meta = meta["metadata"]
assert "duration" in video_meta and video_meta["width"] > 0, f"Invalid metadata: {meta}"
print(f"[PASS] 3. Metadata Extraction OK ({video_meta['width']}x{video_meta['height']}, {video_meta['video_codec']})")

# 4. Start Compression Task (whatsapp preset, h264 codec)
st, data = post_json(f"{BASE_URL}/api/compress", {
    "file_id": file_id,
    "preset": "whatsapp",
    "crf": 26,
    "video_codec": "h264",
    "gpu_acceleration": "auto",
    "container": "mp4"
})
assert st == 200, f"Compression trigger failed: {data}"
task_id = data["task_id"]
print(f"[PASS] 4. Compression Triggered OK (task_id={task_id})")

# 5. Live Progress Polling
completed = False
for _ in range(30):
    time.sleep(0.5)
    st, status_data = get_json(f"{BASE_URL}/api/compress/status/{task_id}")
    print(f"   Polling Status: {status_data['status']} ({status_data.get('progress', 0)}%)")
    if status_data["status"] == "completed":
        completed = True
        break
    elif status_data["status"] == "failed":
        raise Exception(f"Encoding failed: {status_data.get('error')}")

assert completed, "Encoding timed out"
print("[PASS] 5. Live Compression Progress & Encoding Completed")

# 6. Check FFmpeg Log Endpoint
st, log_data = get_json(f"{BASE_URL}/api/compress/logs/{task_id}")
assert st == 200, "Logs endpoint failed"
assert "ffmpeg" in log_data["log"].lower() or "command" in log_data["log"].lower(), "Log text missing FFmpeg command"
print(f"[PASS] 6. FFmpeg Log Retrieval OK (Log length: {len(log_data['log'])} chars)")

# 7. Open Output Folder Endpoint
st, folder_data = post_json(f"{BASE_URL}/api/open-folder/{task_id}")
assert st == 200, "Open folder failed"
print("[PASS] 7. Open Folder Endpoint OK")

# 8. Download Output Video
req = urllib.request.Request(f"{BASE_URL}/api/download/{task_id}")
with urllib.request.urlopen(req) as res:
    content = res.read()
    assert len(content) > 0, "Downloaded file is empty"
    print(f"[PASS] 8. Download Endpoint OK ({len(content)} bytes)")

# 9. Verify History Database Persistence
st, history = get_json(f"{BASE_URL}/api/history")
assert st == 200, "History fetch failed"
target_row = next((r for r in history if r["id"] == task_id), None)
assert target_row is not None, "Task ID missing from SQLite history"
print("   History row data:", target_row)
assert target_row["preset_used"] == "whatsapp", f"Preset mismatch: {target_row['preset_used']}"
assert target_row["video_codec"] == "h264", f"Codec mismatch: {target_row['video_codec']}"
assert "saved_mb" in target_row, "Saved MB key missing"
print(f"[PASS] 9. SQLite History Verification OK (Saved: {target_row['saved_mb']} MB, Pct: {target_row['saved_percentage']}%)")

# 10. Delete History Row
st, del_data = delete_req(f"{BASE_URL}/api/history/{task_id}")
assert st == 200, "Delete history failed"
print("[PASS] 10. SQLite History Row Deletion OK")

print("\n*** ALL 10 MASTER E2E VERIFICATION STEPS PASSED SUCCESSFULLY! ***")
