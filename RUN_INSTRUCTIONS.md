# How to Run Eden

## ⚡ Quick Orchestration Flow

To launch the entire platform, open four terminal windows and run the corresponding command blocks:

```
    [DOCKER COMPOSE] ──> [DJANGO API] ──> [CELERY WORKER] ──> [REACT VITE UI]
     (Redis Daemon)     (Port: 8000)       (Solo Pool)       (Port: 5173)
```

---

## 🚀 Execution Commands (Copy-Paste Ready)

### 🌐 Terminal 1: Redis Broker
```powershell
docker compose up -d
```

### 🧠 Terminal 2: Django REST API Service
```powershell
cd backend; venv\Scripts\activate; python manage.py migrate; python manage.py runserver
```

### ⚙ Terminal 3: Celery Task Worker (Windows Solo Pool)
```powershell
cd backend; venv\Scripts\activate; python -m celery -A core worker --loglevel=info --pool=solo
```

### 🖥 Terminal 4: React UI Web Client
```powershell
cd frontend; npm run dev
```

---

## 🔍 Diagnostic Telemetry

Once all services are running, verify using these links:
*   **Frontend Client**: [http://localhost:5173](http://localhost:5173)
*   **Backend REST API**: [http://localhost:8000](http://localhost:8000)
*   **Admin Dashboard**: [http://localhost:8000/admin](http://localhost:8000/admin)
*   **Redis Telemetry**: `redis://127.0.0.1:6379/0`
