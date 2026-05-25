# Project Eden: Multimodal Misinformation OSINT Engine
## Technical System Report & Architecture Spec

Project Eden is a high-fidelity, asynchronous Open-Source Intelligence (OSINT) pipeline designed to extract, analyze, and classify misinformation within social media assets. Built on a robust Django/Celery/Redis backend and a React-based "Cold Signal" intelligence terminal frontend, Eden processes both public Instagram URLs and local video uploads. It extracts visual and spoken text tracks, performs orchestrated multi-provider AI reasoning, maps assertions to factual sources via real-time web searches, and visualizes the results on a bento-style dashboard.

---

## 1. System Architecture & Lifecycle

Eden operates as a decoupled, multi-modal pipeline orchestrated by Celery task chains. Below is the technical flow of an analysis job from submission to completion:

```mermaid
graph TD
    A[React Client / Web Terminal] -->|POST Job Request| B[Django REST API]
    B -->|Register Job & Build Chain| C[Celery Task Chain]
    C -->|Task 1: Ingestion| D[Instagram Ingestion Service]
    D -->|Media Cache Hit/Miss| E[Local Filesystem Storage]
    C -->|Task 2: Text Track| F[OCR Extraction: OpenCV + EasyOCR]
    C -->|Task 2: Audio Track| G[Audio Transcription: FFmpeg + Whisper]
    F -->|OCR Text & Frame Manifest| H[Processed Media Assets]
    G -->|Speech Transcript & Audio WAV| H
    C -->|Task 3: Synthesis| I[AI Orchestrator & Fallback Cascade]
    I -->|Fallback 1| J[Gemini API: Flash / Pro]
    I -->|Fallback 2| K[HuggingFace API: Llama 3 / Mistral]
    I -->|Fallback 3| L[Local Forensic Heuristic Engine]
    I -->|Web Verification Queries| M[Search Service: DDG / Yahoo]
    M -->|Provenance & Verification Links| N[Structured Report & Claims Database]
    N -->|WebSocket/Polling Sync| A
```

---

## 2. Ingestion & Caching Layer

The ingestion subsystem manages the acquisition of media files from the web while enforcing strict constraints depending on the processing mode.

### Media Acquisition Services
The ingestion routine is implemented in [services.py](file:///c:/Holidays/Eden/backend/ingestion/services.py) and called asynchronously via [tasks.py](file:///c:/Holidays/Eden/backend/ingestion/tasks.py). It features:
*   **Mode-Aware Downloads**:
    *   **`TEXT` Mode**: Acquires reels, videos, or image posts. It prioritizes `yt-dlp` to download video streams. If `yt-dlp` reports a format error (indicating a static image post), the ingestion engine falls back to `instaloader` to download the image.
    *   **`AUDIO` Mode**: Specifically fetches audio/video streams using the `bestvideo+bestaudio/best` format filter to ensure the client has both a media preview and an audio track. If the URL resolves to a static image post containing no audio format, the ingestion task triggers a `MODE_MISMATCH` exception.
*   **Session-Based Authentication**: Instagram restricts unauthenticated access. Eden loads Netscape-formatted cookies from [cookies.txt](file:///c:/Holidays/Eden/backend/config/cookies.txt) to authenticate both `yt-dlp` and `instaloader` sessions, preventing rate limits and login walls.
*   **Error Classification & Fast Termination**:
    *   `RATE_LIMIT_OR_LOGIN`: Raised when Instagram blocks access.
    *   `PRIVATE_CONTENT`: Raised when accessing private posts.
    *   `CONTENT_NOT_FOUND`: Raised for deleted or invalid URLs.
    *   `MODE_MISMATCH`: Raised when static image posts are submitted in `AUDIO` mode. This halts the Celery task chain immediately by wiping `self.request.chain` to prevent downstream execution.

### Filesystem Caching Strategy
To avoid redundant processing and API calls, the [cache.py](file:///c:/Holidays/Eden/backend/ingestion/cache.py) cache system tracks previous runs using a hash of the target URL or the Instagram shortcode as the key.

> [!NOTE]
> By default, the media cache uses a Time-To-Live (TTL) configuration. In development environments, setting `MEDIA_CACHE_TTL_DAYS = 0` configures entries to never expire.

#### Directory Layout
```
media/cache/{cache_key}/
├── source_media.mp4     <- Local copy of the downloaded media
├── audio.wav            <- Converted 16kHz mono audio track
├── transcript.json      <- Deduplicated Whisper transcription JSON
├── ocr.json             <- EasyOCR results and frame manifest JSON
└── frames/              <- Directory of JPEGs extracted for OCR
    ├── frame_0000.jpg
    └── thumb_0000.jpg
```

---

## 3. Multimodal Processing Pipeline

Once the raw media is downloaded, Eden routes it to the OCR or transcription task based on the job mode.

### OCR & Video Frame Processing
The OCR service, detailed in [services.py](file:///c:/Holidays/Eden/backend/processing/services.py), processes visual content through a two-step framework:

1.  **OpenCV Frame Extraction**:
    *   Extracts exactly 1 frame per second of video.
    *   Writes full-resolution JPEGs (quality 90) and downscaled 320px thumbnails (quality 80).
    *   Compiles a manifest file `frame_manifest.json` referencing timestamps, frame paths, and thumbnails.
2.  **EasyOCR Text Extraction**:
    *   Applies a preprocessing pipeline: converts frames to grayscale, followed by Contrast Limited Adaptive Histogram Equalization (CLAHE) with `clipLimit=2.0` and `tileGridSize=(8,8)` to enhance text readability.
    *   Uses the `easyocr.Reader` to extract text blocks.
    *   Filters out low-confidence outputs (probability `< 0.45`) or junk text (alphanumeric character ratio `< 40%`).
    *   Deduplicates adjacent frames: only records new text blocks that were not present in the preceding frame.
    *   Constructs a unified, timestamped transcript (e.g., `[00:04] LATEST UPDATE`).

### Audio Extraction & Transcription
Audio processing, located in [services.py](file:///c:/Holidays/Eden/backend/processing/services.py), handles audio transcription:

1.  **FFmpeg Stream Isolation**:
    *   Probes the file using `ffprobe` to check for an audio stream. Silent videos return `None` and skip transcription.
    *   Extracts the audio track and converts it into a 16kHz, single-channel (mono) PCM WAV file optimized for model input.
2.  **Whisper Model Transcription**:
    *   Loads the `base` model from `openai-whisper`.
    *   Configures CPU-friendly compatibility by setting `fp16=False` to prevent floating-point warnings.
    *   Deduplicates adjacent segments to eliminate Whisper transcription loops and hallucinations.
    *   Extracts a video thumbnail at the 1-second mark via FFmpeg to serve as the report preview.

---

