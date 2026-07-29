#!/usr/bin/env bash
# exit on error
set -o errexit

python -m pip install --upgrade pip
pip install -r requirements.txt

# Create config folder if it doesn't exist
mkdir -p config

# Check if INSTAGRAM_COOKIES environment variable is set (should be base64 encoded)
if [ -n "$INSTAGRAM_COOKIES" ]; then
    echo "[INFO] INSTAGRAM_COOKIES env var detected. Writing to config/cookies.txt..."
    echo "$INSTAGRAM_COOKIES" | base64 -d > config/cookies.txt
    echo "[INFO] config/cookies.txt successfully written!"
else
    echo "[WARN] INSTAGRAM_COOKIES env var not set. Ingestion will run in anonymous fallback mode."
fi

python manage.py collectstatic --no-input
python manage.py migrate
