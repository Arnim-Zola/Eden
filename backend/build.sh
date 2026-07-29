#!/usr/bin/env bash
# exit on error
set -o errexit

# Print current Python version
echo "[INFO] Current System Python version:"
python --version

# Find the active virtualenv path (Render puts it in the repo root: ../.venv)
VENV_PATH=".venv"
if [ -d "../.venv" ]; then
    VENV_PATH="../.venv"
elif [ -d "../../.venv" ]; then
    # Safety fallback
    VENV_PATH="../../.venv"
fi
echo "[INFO] Using virtualenv path: $VENV_PATH"

# If the virtualenv python is not 3.11, delete it to force recreate on correct version
if [ -d "$VENV_PATH" ]; then
    VENV_VER=$($VENV_PATH/bin/python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "")
    if [ "$VENV_VER" != "3.11" ]; then
        echo "[WARN] Virtualenv Python version is $VENV_VER but we need 3.11. Deleting virtualenv..."
        rm -rf "$VENV_PATH"
        python -m venv "$VENV_PATH"
        source $VENV_PATH/bin/activate
    fi
else
    # Create fresh virtualenv if not exists
    python -m venv "$VENV_PATH"
    source $VENV_PATH/bin/activate
fi

# Ensure virtualenv is active for subsequent pip/python calls
source $VENV_PATH/bin/activate

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

$VENV_PATH/bin/python manage.py collectstatic --no-input
$VENV_PATH/bin/python manage.py migrate
