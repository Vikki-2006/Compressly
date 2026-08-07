import requests
import time
import os

backend_url = "http://localhost:8000"

def test_endpoints():
    # 1. Let's find an existing file in the uploads directory
    uploads_dir = r"c:\Users\VIKKI\Documents\Project\Video Compressor(Compressly)\uploads"
    files = [f for f in os.listdir(uploads_dir) if f.endswith(".mp4")]
    if not files:
        print("No uploaded mp4 files found to test.")
        return
    
    file_name = files[0]
    file_id = os.path.splitext(file_name)[0]
    print(f"Testing with file_id: {file_id}")
    
    # 2. Check original file endpoint
    orig_url = f"{backend_url}/api/static/{file_id}.mp4"
    print(f"Fetching original video from: {orig_url}")
    res_orig = requests.head(orig_url)
    print(f"Original Status: {res_orig.status_code}")
    print(f"Original Headers: {dict(res_orig.headers)}")
    
    # 3. Post a compression request to get a new task_id
    payload = {
        "file_id": file_id,
        "preset": "ultrafast",  # Use ultrafast to complete quickly
        "task_type": "compression"
    }
    print("Starting compression task...")
    res_compress = requests.post(f"{backend_url}/api/compress", json=payload)
    if res_compress.status_code != 200:
        print(f"Failed to start compression: {res_compress.status_code} - {res_compress.text}")
        return
        
    task_data = res_compress.json()
    task_id = task_data.get("task_id")
    print(f"Compression started, task_id: {task_id}")
    
    # 4. Poll task status until completed
    for _ in range(30):
        res_status = requests.get(f"{backend_url}/api/compress/status/{task_id}")
        status_data = res_status.json()
        status = status_data.get("status")
        print(f"Task status: {status}, progress: {status_data.get('progress')}%")
        if status in ("completed", "failed", "cancelled"):
            break
        time.sleep(1)
        
    # 5. Check compressed download/preview endpoint
    comp_url = f"{backend_url}/api/download/{task_id}"
    print(f"Fetching compressed video from: {comp_url}")
    res_comp = requests.head(comp_url)
    print(f"Compressed Status: {res_comp.status_code}")
    print(f"Compressed Headers: {dict(res_comp.headers)}")

if __name__ == "__main__":
    test_endpoints()
