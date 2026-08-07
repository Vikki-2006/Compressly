FROM python:3.11-slim

# Install system dependencies, including ffmpeg and ffprobe
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Create runtime storage directories (ephemeral — files persist for container lifetime)
RUN mkdir -p uploads compressed temp

EXPOSE 8000

# Use uvicorn directly in production (no reload, reads PORT from env).
# Railway sets PORT automatically; defaults to 8000.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
