#!/usr/bin/env bash
# exit on error
set -o errexit

# Print current Python version
echo "[INFO] Current System Python version:"
python --version

# If the virtualenv python is not 3.11, delete it to force recreate on correct version
if [ -d ".venv" ]; then
    VENV_VER=$(.venv/bin/python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "")
    if [ "$VENV_VER" != "3.11" ]; then
        echo "[WARN] Virtualenv Python version is $VENV_VER but we need 3.11. Deleting virtualenv..."
        rm -rf .venv
        python -m venv .venv
        source .venv/bin/activate
    fi
else
    # Create fresh virtualenv if not exists
    python -m venv .venv
    source .venv/bin/activate
fi

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

.venv/bin/python manage.py collectstatic --no-input
.venv/bin/python manage.py migrate
