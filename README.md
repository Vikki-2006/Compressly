<p align="center">

  
  <img src="./logo/readme-logo.svg" alt="Compressly Logo" width="240">
</p>

<h1 align="center">Compressly</h1>


<p align="center">
Compress videos locally with real-time progress, advanced FFmpeg controls, analytics, and zero cloud uploads.
</p>

<p align="center">

<img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white">

<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white">

<img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black">

<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">

<img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">

<img src="https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white">

<img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white">

<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white">

</p>

<p align="center">

<img src="https://img.shields.io/github/stars/Vikki-2006/Compressly?style=flat-square">

<img src="https://img.shields.io/github/forks/Vikki-2006/Compressly?style=flat-square">

<img src="https://img.shields.io/github/issues/Vikki-2006/Compressly?style=flat-square">

<img src="https://img.shields.io/github/license/Vikki-2006/Compressly?style=flat-square">

Modern, privacy-first video compression powered by FastAPI, React, JavaScript and FFmpeg.
</p>

---

# ✨ Features

- 🎬 Local & Offline Video Compression
- ⚡ High-performance FastAPI backend
- 📂 Drag & Drop multi-file uploads
- 📊 Live compression progress
- ⏸ Pause / Resume / Cancel processing
- 🎚 Advanced FFmpeg controls
- 📉 Compression statistics & analytics
- 📜 Compression history
- 🌙 Dark & Light themes
- 🔒 Privacy-first local processing
- ⚙ Docker deployment
- 🗑 Automatic temporary file cleanup

---


# 🏗 Architecture

```
                React Frontend
                       │
                       │ REST API
                       ▼
             FastAPI Backend
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
     FFmpeg Engine               SQLite Database
        │                             │
        ▼                             ▼
 Video Compression           History & Analytics
```

---

# 🛠 Tech Stack

## Frontend

- React
- JavaScript
- Vite
- Tailwind CSS
- Framer Motion

---

## Backend

- Python
- FastAPI
- Pydantic
- SQLite
- FFmpeg
- FFprobe
- psutil

---

## DevOps

- Docker
- Docker Compose
- GitHub Actions

---

# 📂 Project Structure

```
Compressly/

├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── middleware/
│   │   ├── database/
│   │   └── main.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── assets/
│   │
│   ├── public/
│   └── package.json
│
├── uploads/
├── compressed/
├── temp/
├── logo/
├── docker-compose.yml
└── README.md
```

---

# 🚀 Quick Start

## Clone Repository

```bash
git clone https://github.com/Vikki-2006/Compressly.git

cd Compressly
```

---

# Docker

```bash
docker compose up --build
```

Application

```
http://localhost:3000
```

---

# Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt

python run.py
```

Backend

```
http://localhost:8000
```

---

# Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend

```
http://localhost:5173
```

---

# 📡 API

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/health` | Server health |
| POST | `/api/metadata` | Read video metadata |
| POST | `/api/compress` | Compress video |
| GET | `/api/compress/status/{task_id}` | Compression status |
| POST | `/api/compress/control` | Pause / Resume / Cancel |
| GET | `/api/download/{task_id}` | Download result |
| GET | `/api/history` | Compression history |
| DELETE | `/api/history/{task_id}` | Delete history |

---

# 🔥 Highlights

- Local-only processing
- No cloud uploads
- Multi-file queue
- Background workers
- SQLite logging
- Interactive analytics
- Responsive UI
- Dark mode
- Automatic cleanup
- Docker ready

---

# 📈 Roadmap

- ✅ Video Compression
- ✅ Compression History
- ✅ Docker Support
- ✅ Analytics Dashboard
- ✅ Advanced FFmpeg Controls
- ⏳ Authentication
- ⏳ User Profiles
- ⏳ Batch Compression
- ⏳ GPU Acceleration
- ⏳ WebSocket Live Progress
- ⏳ Cloud Storage Integrations

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

# 📄 License

This project is licensed under the **MIT License**.

---

<p align="center">

Built with ❤️ using Python, FastAPI, React, and FFmpeg.

</p>
