<div align="center">
  
# 🌱 Eden AI: Truth at a Glance

**An Automated, AI-Powered Misinformation Detection & Fact-Checking Platform**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
[![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)](#)
[![Celery](https://img.shields.io/badge/celery-%2337814A.svg?&style=for-the-badge&logo=celery&logoColor=white)](#)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white)](#)

</div>

---

## 📖 Overview

**Eden AI** is a modular, scalable platform built to analyze social media content (such as Instagram Reels) for misinformation. By combining Computer Vision, Audio Transcription, and Large Language Models, Eden automatically decomposes videos into frames and audio tracks, extracts factual claims, and evaluates them for truthfulness and contextual accuracy.

This platform serves as a proof-of-concept for how automated systems can assist journalists, moderators, and end-users in navigating a high-volume, low-trust information environment.

---

## 🏗️ Architecture & Pipeline Flow

The platform is designed around a decoupled, asynchronous processing pipeline orchestrating several heavy AI and computer vision tasks.

1. **Ingestion Layer:** Accepts social media URLs and downloads the raw media assets using `yt-dlp` / Playwright.
2. **Processing Layer (Celery Tasks):**
   - **Computer Vision:** `OpenCV` extracts frames from the video.
   - **Audio Extraction:** `FFmpeg` separates the audio track.
   - **Visual Text Extraction:** `EasyOCR` scans the extracted frames to read embedded on-screen text.
   - **Speech-to-Text:** `OpenAI Whisper` transcribes the audio track.
3. **Analysis Layer:** The unified transcript (Audio + On-screen Text) is sent to **Google Gemini 2.5 Flash**, which extracts discrete claims, assigns confidence scores, and applies a risk classification.
4. **Presentation Layer:** A responsive, modern React UI polls the backend for job status and displays the final executive summary and claim cards.

---

## ⚡ Technology Stack

### Frontend
* **Framework:** React 19 / Vite
* **Styling:** Tailwind CSS v4 (Custom animations, glassmorphism, responsive design)
* **API Communication:** Native `fetch` with polling mechanisms

### Backend
* **Core Framework:** Django & Django REST Framework (DRF)
* **Task Orchestration:** Celery with Redis (Broker & Result Backend)
* **Database:** SQLite (MVP) / PostgreSQL ready

### AI & Media Processing
* **LLM Fact-Checking:** Google GenAI SDK (Gemini 2.5 Flash)
* **Audio Transcription:** Whisper (Local inference via `whisper` python package)
* **OCR:** EasyOCR
* **Media Handling:** OpenCV, FFmpeg, yt-dlp

---

## ✨ Feature Highlights

* **End-to-End Automation:** Paste a URL and let the system handle downloading, processing, and analysis.
* **Multi-Modal Context:** Analyzes *both* what is said (audio) and what is shown (on-screen text).
* **Granular Claim Detection:** Breaks down long videos into individual, verifiable claims rather than giving a binary "True/False" to the entire video.
* **Resilient Polling Architecture:** The frontend fluidly updates processing stages, seamlessly handling backend failures or API timeouts with graceful fallbacks.
* **Premium Presentation UI:** Modern, dark-themed UI optimized for readability and high-impact presentations.

---

## 🚀 Setup & Installation

### Prerequisites
* Python 3.10+
* Node.js 18+
* Redis Server (Running locally on default port `6379`)
* FFmpeg (Installed and accessible in system PATH)

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/Arnim-Zola/Eden.git
cd Eden/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
# Note: PyTorch/Whisper installation may require specific flags depending on your GPU/CUDA setup.

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run migrations
python manage.py makemigrations core_app api
python manage.py migrate
```

### 2. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Build tailwind/postcss configurations (automatic on dev server start)
```

---

## 💻 Running the Application

To run the full stack, you need to start three separate processes:

**Terminal 1: Django API Server**
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

**Terminal 2: Celery Worker**
```bash
cd backend
source venv/bin/activate
celery -A eden_core worker -l INFO --pool=solo  # --pool=solo is recommended for Windows
```

**Terminal 3: React Frontend**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🔌 API Overview

* `POST /api/jobs/` - Submit a new URL for analysis. Returns Job ID.
* `GET /api/jobs/{id}/status/` - Poll for current pipeline phase and status (PROCESSING, COMPLETED, FAILED).
* `GET /api/jobs/{id}/` - Retrieve the complete analysis report, extracted claims, and unified transcripts.

---

## 🎥 Demo Workflow

1. Open the Eden web interface.
2. Paste a URL of an informational or controversial short-form video (e.g., an Instagram Reel).
3. Click "Analyze". The UI will display a smooth progress indicator detailing the current backend phase (Downloading → Extracting Frames → Transcribing → OCR → Fact Checking).
4. Once completed, review the **Claims Analysis** tab for the executive summary and individual fact-checked claims.
5. Switch to the **Audio Transcript** and **Video OCR Text** tabs to inspect the raw data extracted by the processing pipeline.

---

## 🚧 Limitations & Future Improvements

* **Synchronous Pipeline:** Currently, the Celery chain executes linearly. Future versions will implement a DAG (Directed Acyclic Graph) to process video frames and audio concurrently.
* **Scraping Bottlenecks:** Relies on `yt-dlp` which can be rate-limited by platforms. Production scaling requires robust proxy pools or official API access.
* **Polling UI:** The frontend uses short-polling. Moving to WebSockets / Django Channels will improve efficiency and real-time responsiveness.
* **Local Compute:** EasyOCR and Whisper run locally, which is computationally expensive. For scale, these can be offloaded to serverless GPU instances or dedicated microservices.

---

## 📝 License & Contributing

Created as a proof-of-concept AI platform.
Contributions, issues, and feature requests are welcome!

Feel free to check [issues page](#) if you want to contribute.

---
<div align="center">
  <i>Built with ❤️ for a more truthful internet.</i>
</div>