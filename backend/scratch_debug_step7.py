import urllib.request
import urllib.error
import json
import os
import sys

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
with open("backend/scratch_test_sample.mp4", "rb") as f:
    file_bytes = f.read()

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="scratch_test_sample.mp4"\r\n'
    f"Content-Type: video/mp4\r\n\r\n"
).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

meta_req = urllib.request.Request(
    "http://localhost:8000/api/metadata",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    method="POST"
)

res = urllib.request.urlopen(meta_req)
meta_json = json.loads(res.read().decode())
file_id = meta_json["file_id"]
print("Uploaded file_id:", file_id)

compress_payload = json.dumps({
    "file_id": file_id,
    "preset": "fast",
    "crf": 28,
    "task_type": "compression"
}).encode("utf-8")

compress_req = urllib.request.Request(
    "http://localhost:8000/api/compress",
    data=compress_payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    c_res = urllib.request.urlopen(compress_req)
    print("Compress res:", c_res.read().decode())
except urllib.error.HTTPError as e:
    print("HTTPError code:", e.code)
    print("HTTPError body:", e.read().decode())
