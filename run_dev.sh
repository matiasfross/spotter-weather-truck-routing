#!/bin/bash
set -e

echo "Starting Weather-Aware Truck Routing Development Environment..."

# Setup backend
if [ ! -d "backend/.venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv backend/.venv
    source backend/.venv/bin/activate
    pip install -r backend/requirements.txt
else
    source backend/.venv/bin/activate
fi

python backend/manage.py migrate

echo "Starting Backend API on http://localhost:8000 ..."
python backend/manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

echo "Starting Frontend on http://localhost:5173 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
