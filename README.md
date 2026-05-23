# 🌿 Eden: AI-Powered Misinformation Analysis Engine

<p align="center">
  <img src="https://raw.githubusercontent.com/Arnim-Zola/Eden/main/frontend/public/logo-placeholder.svg" alt="Eden Logo" width="120" style="border-radius: 50%; box-shadow: 0 4px 20px rgba(74, 184, 232, 0.35);" onerror="this.src='https://img.icons8.com/nolan/256/botanical.png'"/>
</p>

<h3 align="center">Cold Intelligence // Forensic Media Fact-Checking Terminal</h3>

<p align="center">
  <a href="https://www.djangoproject.com/"><img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" /></a>
  <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" /></a>
  <a href="https://docs.celeryq.dev/"><img src="https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white" /></a>
  <a href="https://redis.io/"><img src="https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white" /></a>
  <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/tailwind-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" /></a>
</p>

---

> **Unmasking misinformation through multi-modal AI orchestration.** Eden is a production-grade platform designed to ingest, process, and analyze social media content to detect and verify factual claims with surgical precision and cross-reference them against live authoritative web databases.

---

## 📖 Project Overview

In an era of rapid digital information flow, the speed of misinformation outpaces human fact-checking capabilities. **Eden** addresses this challenge by providing an automated, multi-modal pipeline that extracts semantic intelligence from both visual and auditory streams.

Whether analyzing an Instagram Reel, a static image post, or a local video upload, Eden decomposes the media into its fundamental parts—frames, audio tracks, and text—and applies state-of-the-art AI reasoning to identify, classify, and verify claims with evidence-first cross-referencing.

---

## ✨ Core Features & Recent Improvements

### 🔍 Cross-Reference & Web Source Verification (Related Sources)
*   **Live Web Validation:** Extracts claims and automatically queries live, high-credibility web resources and journals to find direct matches.
*   **Provenance Verification:** Details up to **4 related sources** per claim, showcasing domains, titles, and highlighted snippets to back up the verdict.
*   **Verbatim Matching:** Links visual OCR text or spoken audio transcripts directly to these web sources for verifiable analysis.

### 📊 Cold Intelligence / Forensic Terminal UI
*   **Bento-Style Dashboard:** Features a dark, cyberpunk-inspired, high-density layout separating the fixed left "Threat Spine" from the right-hand analysis panel.
*   **Threat Index Gauge:** Displays an animated circular dial showing the threat risk index and classification levels matching exactly:
    *   🔴 `80 - 100` **CRITICAL THREAT**
    *   🟠 `65 - 79` **HIGH THREAT**
    *   🟡 `35 - 64` **ELEVATED THREAT**
    *   🟢 `0 - 34` **LOW THREAT**
*   **Print Dossier System:** Specialized print layouts that automatically sync the exact dashboard score, threat level, colors, claims, and timeline details into a clean corporate report when downloading a PDF or sending to print.

### ⌨️ ⌘K Command Palette
*   **Keyboard-First Navigation:** Built-in spotlight-like menu for lightning-fast command execution, viewing history, and page routing.
*   **Instant History Search:** Quickly find previously executed jobs, search through logs, or clear data via simple keyboard shortcuts.

### ⏱️ Real-Time Pipeline Stepper
*   **Stage-by-Stage Tracking:** A multi-stage processing visualizer showing the state of the active job (`Ingestion` ➡️ `Extraction` ➡️ `Transcription` ➡️ `Intelligence Reasoning` ➡️ `Completed`).
*   **Performance Metrics:** Tracks processing durations of each micro-step to identify potential pipeline bottlenecks.

---

## 🏗️ System Architecture

Eden follows a modular, service-oriented architecture designed for high availability, fallback resilience, and observability.

```mermaid
graph TD
    User((User)) -->|Submit URL/File| API[Django REST API]
    API -->|Create Job| DB[(SQLite/Postgres)]
    API -->|Queue Tasks| Redis[Redis Broker]
    
    subgraph "Asynchronous Pipeline (Celery)"
        Ingest[Ingestion Service] -->|Media Assets| Storage[Local/S3 Storage]
        Ingest -->|Trigger| Processing{Processing Mode}
        
        Processing -->|TEXT (OCR)| OCR[EasyOCR / OpenCV]
        Processing -->|AUDIO| Whisper[OpenAI Whisper]
        
        OCR -->|Extracted Text| Orchestrator[AI Fallback Orchestrator]
        Whisper -->|Transcript| Orchestrator
        
        Orchestrator -->|Dynamic Search Query| GoogleSearch[Search Engine API]
        GoogleSearch -->|Related Sources & Snippets| Orchestrator
        
        Orchestrator -->|Primary: Gemini 2.0 Flash| Report[Report Generator]
        Orchestrator -.->|Fallback / Degraded Mode| DegradedReport[Structure Validator]
    end
    
    Report -->|Update Job & Claims| DB
    DegradedReport -->|Fallback Recovery| DB
    
    DB -->|Push Update| UI[React Dashboard]
    UI -->|Poll Status / Actions| API
```

### Key Architectural Decisions
1.  **Dual-Path Fallback Orchestration:** Automatically switches from Gemini to a structured "degraded" mode during API quota limits or network errors to prevent pipeline failures.
2.  **Asynchronous Chaining:** Tasks are organized into sequential Celery chains (Ingest ➡️ Process ➡️ Analyze), ensuring database state persistence at every milestone.
3.  **Media Caching Layer:** A TTL-aware filesystem-based caching layer for frames and source streams prevents redundant downloads and reduces scraping overhead.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | Python 3.11+, Django, Django REST Framework |
| **Task Queue** | Celery, Redis |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) |
| **AI / ML** | Google Gemini (LLM), OpenAI Whisper (ASR), EasyOCR (OCR) |
| **Processing** | FFmpeg, OpenCV, yt-dlp, Instaloader |
| **DevOps** | Docker, Docker Compose |

---

## 🚀 Getting Started

### Prerequisites
*   Python 3.11+
*   Node.js 18+
*   Redis Server
*   FFmpeg (for audio/video processing)
*   **Google Gemini API Key**

### Environment Setup
Create a `.env` file in the root directory:
```env
# Backend
SECRET_KEY=your-django-secret
DEBUG=True
GEMINI_API_KEY=your-gemini-key
REDIS_URL=redis://localhost:6379/0

# Frontend
VITE_API_URL=http://localhost:8000/api
```

### Backend Installation
```bash
cd backend
python -m venv venv
source venv/scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
*Note: Run `celery -A core worker --loglevel=info` in a separate terminal to process background jobs.*

### Frontend Installation
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Project Structure

```text
Eden/
├── backend/
│   ├── analysis/     # AI Provider Orchestration (Gemini, Fallbacks, Search APIs)
│   ├── api/          # REST Endpoints & Serializers
│   ├── core/         # Project settings & Celery config
│   ├── core_app/     # Database Models (Job, Report, MediaAsset)
│   ├── ingestion/    # Media Scrapers (yt-dlp, instaloader)
│   ├── processing/   # Computer Vision (OCR) & Audio (Whisper)
│   └── media/        # Local storage for processed artifacts
├── frontend/
│   ├── src/
│   │   ├── components/ # Atomic UI & Feature-specific components
│   │   ├── hooks/      # Custom React hooks (History, Polling, Key Events)
│   │   ├── services/   # API abstraction layer
│   │   └── views/      # Page-level containers
└── docker-compose.yml
```

---

## 🔮 Future Roadmap
*   [ ] **Vector DB (RAG):** Match claims against historical fact-check archives like PolitiFact and Snopes.
*   [ ] **Real-Time Video Stream Monitoring:** Connect to live RTMP/HLS feeds for on-the-fly verification.
*   [ ] **Browser Extension:** Inline social media overlays highlighting verification scores directly on Instagram or Twitter feeds.

---

<p align="center">
  Built with 🌿 and 🦾 by the Eden Team
</p>
<!-- Eden Forensic Workspace - Logging parameters optimized for OSINT pipeline telemetry -->
