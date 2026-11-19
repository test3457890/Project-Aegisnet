#!/bin/bash

echo "=================================================="
echo "Starting AegisNet Frontend and Backend Prototype (Mac/Linux)"
echo "=================================================="

cd "$(dirname "$0")"

if ! command -v node &> /dev/null; then
    echo "Node.js is required to run the AegisNet prototype. Please install the LTS version from nodejs.org, then run this launcher again."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "npm is required to run the AegisNet prototype. Please install the LTS version from nodejs.org, then run this launcher again."
    exit 1
fi

NEEDS_INSTALL=0
if [ ! -d "node_modules" ]; then
    NEEDS_INSTALL=1
elif [ -f "package-lock.json" ] && [ "package-lock.json" -nt "node_modules" ]; then
    NEEDS_INSTALL=1
fi

if [ $NEEDS_INSTALL -eq 1 ]; then
    echo "[AegisNet] Running npm ci..."
    npm ci
    if [ $? -ne 0 ]; then
        echo "[AegisNet] Failed to install dependencies."
        exit 1
    fi
    touch node_modules
else
    echo "[AegisNet] Frontend dependencies are up to date."
fi

BACKEND_DIR="services/api"
if [ ! -d "$BACKEND_DIR" ]; then
    echo "[AegisNet] Backend folder was not found at $BACKEND_DIR."
    exit 1
fi

if [ ! -d "$BACKEND_DIR/node_modules" ] || { [ -f "$BACKEND_DIR/package-lock.json" ] && [ "$BACKEND_DIR/package-lock.json" -nt "$BACKEND_DIR/node_modules" ]; }; then
    echo "[AegisNet] Running backend npm ci..."
    (cd "$BACKEND_DIR" && npm ci)
    if [ $? -ne 0 ]; then
        echo "[AegisNet] Failed to install backend dependencies."
        exit 1
    fi
    touch "$BACKEND_DIR/node_modules"
else
    echo "[AegisNet] Backend dependencies are up to date."
fi

BACKEND_PID=""
if (echo > /dev/tcp/127.0.0.1/8000) >/dev/null 2>&1; then
    echo "[AegisNet] Port 8000 is already in use. Reusing the existing local API process."
else
    echo "[AegisNet] Starting backend API on http://localhost:8000..."
    (cd "$BACKEND_DIR" && exec node --import tsx src/index.ts) &
    BACKEND_PID=$!
fi

cleanup() {
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
        echo "[AegisNet] Stopping backend API process..."
        kill "$BACKEND_PID"
    fi
}
trap cleanup EXIT INT TERM

BACKEND_READY=0
for _ in {1..20}; do
    if (echo > /dev/tcp/127.0.0.1/8000) >/dev/null 2>&1; then
        BACKEND_READY=1
        break
    fi
    sleep 0.5
done

if [ "$BACKEND_READY" -eq 1 ]; then
    echo "[AegisNet] Backend API is reachable. Health: http://localhost:8000/health"
else
    echo "[AegisNet] WARNING: Backend API did not become reachable. Frontend local fallback will remain available."
fi

echo "[AegisNet] Starting Vite dev server..."

# Try to open browser after a delay in the background
(sleep 3 && {
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5173"
    elif command -v open &> /dev/null; then
        open "http://localhost:5173"
    elif command -v sensible-browser &> /dev/null; then
        sensible-browser "http://localhost:5173"
    fi
}) &

npm run dev
