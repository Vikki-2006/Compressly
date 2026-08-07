import os
import uvicorn

if __name__ == "__main__":
    # Read host and port from environment variables.
    # Railway automatically sets PORT; defaults to 8000 for local dev.
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))

    # Disable hot-reload in production to avoid extra file-watcher threads.
    env = os.environ.get("ENV", "development").lower()
    reload = env == "development"

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
    )
