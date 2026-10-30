@echo off
echo Starting Weather-Aware Truck Routing Development Environment...
echo.

echo 1. Checking backend virtual environment...
if not exist "backend\.venv" (
    echo Creating virtual environment...
    python -m venv backend\.venv
    call backend\.venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
) else (
    call backend\.venv\Scripts\activate.bat
)

echo 2. Running database migrations...
python backend\manage.py migrate

echo 3. Starting Django backend server on http://localhost:8000 ...
start "Backend - Django API" cmd /k "backend\.venv\Scripts\python.exe backend\manage.py runserver 0.0.0.0:8000"

echo 4. Starting Vite frontend dev server on http://localhost:5173 ...
start "Frontend - Vite React" cmd /k "cd frontend && npm run dev"

echo.
echo Application is starting!
echo Backend API:  http://localhost:8000/api/health/
echo Frontend Web: http://localhost:5173/
echo.
pause
