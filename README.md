# Compressly ⚡

**Compressly** is a beautiful, modern, and privacy-focused full-stack video compressor. It is designed to optimize media assets locally on your server or workstation without uploading files to insecure third-party cloud APIs.

---

## 🚀 Features

- **Local & Offline Processing:** Everything runs locally on your workstation using Python, FastAPI, and FFmpeg. Files are processed within your private sandbox.
- **Drag & Drop Multi-file Queue:** Queue up multiple video clips in parallel and execute compression sequential jobs smoothly.
- **Real-Time Progress & Process Control:** Monitor encoding speeds, elapsed times, and ETAs. Pause, resume, or cancel active encoding subprocesses instantly.
- **Custom SVG Chart Reports:** Visually compare original sizes versus compressed sizes with interactive dashboard metrics.
- **Presets & Advanced Sliders:** Click-and-go balanced presets, or open the Advanced Options to adjust Video CRF, Audio/Video bitrates, output resolution, and frame rates.
- **SQLite Log History:** Stored records keep track of saved space and encoding metrics in a local SQL database.
- **Responsive Theme Modes:** Premium design aesthetic styled with Tailwind CSS, supporting seamless Light and Dark mode transitions.
- **Automatic Stale-File Purge:** Uploaded materials and outputs are automatically deleted from host storage upon download or after 30 minutes.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React + Vite + TypeScript (v5)
- **Styling:** Tailwind CSS + PostCSS
- **Animation:** Framer Motion (for fluid transitions and layouts)
- **Icons:** Lucide React

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Processing Engine:** FFmpeg + FFprobe
- **Database:** SQLite3
- **Process Manager:** `psutil` (for process suspending and resuming)

---

## 📦 Folder Structure

```
Compressly/
├── backend/                  # FastAPI python backend api
│   ├── app/
│   │   ├── routers/          # Routes (compress.py, history.py)
│   │   ├── services/         # Services (video.py - FFmpeg workers)
│   │   ├── utils/            # Utilities (storage.py - cleanup)
│   │   ├── database.py       # SQLite database logic
│   │   └── main.py           # FastAPI entrypoint
│   ├── tests/                # Test suite (test_api.py)
│   ├── requirements.txt      # Python dependencies
│   ├── run.py                # Server startup script
│   └── Dockerfile            # Container configs
├── frontend/                 # Vite React frontend
│   ├── src/
│   │   ├── components/       # Components (Charts, Navbar, Footer)
│   │   ├── context/          # State providers (ThemeContext)
│   │   ├── pages/            # Page layouts (Landing, AppMain, Settings, About, Privacy)
│   │   ├── App.tsx           # Global routing and shortcut setup
│   │   └── index.css         # Styling and HSL variable configs
│   ├── public/               # Favicons and graphics
│   ├── package.json          # Node dependencies
│   └── Dockerfile            # Multi-stage nginx builder
├── uploads/                  # Input file storage directory
├── compressed/               # Optimized output storage directory
├── temp/                     # Processing workspace folder
├── docker-compose.yml        # Orchestration script
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

Compressly requires **FFmpeg** and **FFprobe** to be installed on your system.

#### Installing FFmpeg

- **Windows (using winget):**
  ```powershell
  winget install "FFmpeg (Essentials)"
  ```
- **macOS (using homebrew):**
  ```bash
  brew install ffmpeg
  ```
- **Linux (Debian/Ubuntu):**
  ```bash
  sudo apt-get update && sudo apt-get install -y ffmpeg
  ```

---

### Running with Docker (Recommended)

Docker automatically bundles FFmpeg, Python, and Node, running the system seamlessly out-of-the-box.

1. Ensure Docker and Docker Compose are installed.
2. In the project root, run:
   ```bash
   docker-compose up --build
   ```
3. Open your browser to `http://localhost:3000` to launch the workspace dashboard.

---

### Manual Setup (Local Development)

#### 1. Setup Backend
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the backend dev server:
   ```bash
   python run.py
   ```
   *The API will start running on `http://localhost:8000`.*

#### 2. Setup Frontend
1. Open another terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development workspace:
   ```bash
   npm run dev
   ```
   *The UI will launch on `http://localhost:5173` (or similar).*

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Inspect server CPU/RAM health and FFmpeg paths. |
| `POST` | `/api/metadata` | Upload video file and return file specs + thumbnail. |
| `POST` | `/api/compress` | Trigger background async compression task. |
| `GET` | `/api/compress/status/{task_id}` | Poll encoding percentages, speeds, and ETAs. |
| `POST` | `/api/compress/control` | Transmit action command: `pause`, `resume`, or `cancel`. |
| `GET` | `/api/download/{task_id}` | Download compressed file and trigger self-deletion. |
| `GET` | `/api/history` | Query database log history logs from SQLite. |
| `DELETE` | `/api/history/{task_id}` | Clear matching history row log. |

---

## ⌨️ Keyboard Shortcuts

Speed up your workflow using local shortcuts (press keys simultaneously):
- `Alt + C` : Navigate to **Compressor Workspace**
- `Alt + S` : Navigate to **Settings Panel**
- `Alt + A` : Navigate to **About Section**
- `Alt + P` : Navigate to **Privacy Policy**
- `Alt + H` : Navigate back to **Home Landing Page**

---

## 📜 License

This project is licensed under the MIT License.
