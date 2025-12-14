#!/usr/bin/env bash
set -euo pipefail

echo "[DEV:STOP] Stopping previous dev processes..."

# Kill Vite (port 5173) if running
if command -v lsof >/dev/null 2>&1; then
  VITE_PIDS=$(lsof -ti :5173 || true)
  if [ -n "${VITE_PIDS}" ]; then
    echo "[DEV:STOP] Killing Vite on :5173 -> ${VITE_PIDS}"
    kill -9 ${VITE_PIDS} || true
  fi
fi

# Kill Electron, nodemon, swift run host by name
for name in "electron" "nodemon" "CRMNativeHost" "swift.*CRMNativeHost"; do
  if pkill -f "$name" >/dev/null 2>&1; then
    echo "[DEV:STOP] pkill -f ${name}"
  fi
done

echo "[DEV:STOP] Done."












