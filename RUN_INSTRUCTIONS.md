# How to Run Eden

Open four terminal windows and run the following commands, one in each terminal.

### 1. Redis
```bash
docker compose up -d
```

### 2. Django Backend
```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```

### 3. Celery Worker (Windows)
```bash
cd backend
venv\Scripts\activate
python -m celery -A core worker --loglevel=info --pool=solo
```

### 4. React Frontend
```bash
cd frontend
npm run dev
```

**Access the App:** Open `http://localhost:5173` in your browser.
