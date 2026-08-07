FROM python:3.11-slim

# Install system dependencies, including ffmpeg and ffprobe
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Create directories for runtime file storage
RUN mkdir -p uploads compressed temp

EXPOSE 8000

# Run FastAPI backend
CMD ["python", "run.py"]
