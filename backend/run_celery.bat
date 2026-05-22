@echo off
echo =======================================================
echo Eden Celery Worker - Safe Start
echo =======================================================
echo.

echo [1/3] Hunting down rogue/orphaned Celery processes...
:: Find all processes with "celery" in the command line and kill them to prevent queue stealing
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'celery' } | ForEach-Object { Write-Host 'Killing PID:' $_.ProcessId; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
echo Rogue processes eliminated.
echo.

echo [2/3] Activating virtual environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo WARNING: venv not found in the current directory.
)

echo.
echo [3/3] Starting fresh Celery worker...
echo Press Ctrl+C to stop.
echo.
python -m celery -A core worker --loglevel=info --pool=solo
