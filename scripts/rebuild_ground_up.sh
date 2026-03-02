#!/bin/bash
# ============================================
# FRANK Dashboard - Ground-Up Rebuild Script
# Version 1.1 - Uses yarn for frontend
# ============================================
# Rebuilds backend venv and frontend from scratch.
# Does NOT touch OpenAuto - use install_openauto.sh for that.
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

SERVICE_PREFIX="${1:-dash}"
BACKEND_SERVICE="${SERVICE_PREFIX}-backend.service"
FRONTEND_SERVICE="${SERVICE_PREFIX}-frontend.service"
KIOSK_SERVICE="${SERVICE_PREFIX}-kiosk.service"

echo "== FRANK ground-up rebuild (v1.1) =="
echo "Project: $PROJECT_DIR"
echo "Service prefix: $SERVICE_PREFIX"
echo ""
echo "NOTE: This rebuilds frontend/backend only."
echo "      For Android Auto, run: sudo bash scripts/install_openauto.sh"
echo ""

# Stop services if present
for svc in "$KIOSK_SERVICE" "$FRONTEND_SERVICE" "$BACKEND_SERVICE"; do
  if systemctl list-unit-files | grep -q "^${svc}"; then
    echo "Stopping $svc"
    sudo systemctl stop "$svc" || true
  fi
done

# Backend rebuild
cd "$PROJECT_DIR/backend"
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

cat > .env <<'ENVEOF'
MONGO_URL=mongodb://127.0.0.1:27017
DB_NAME=frank_hmi
CORS_ORIGINS=*
ENVEOF

deactivate

# Frontend rebuild
cd "$PROJECT_DIR/frontend"
rm -rf node_modules build

cat > .env <<'ENVEOF'
REACT_APP_BACKEND_URL=http://localhost:8001
ENVEOF

yarn install
yarn build

# Restart services if present
for svc in "$BACKEND_SERVICE" "$FRONTEND_SERVICE" "$KIOSK_SERVICE"; do
  if systemctl list-unit-files | grep -q "^${svc}"; then
    echo "Starting $svc"
    sudo systemctl start "$svc"
  fi
done

echo ""
echo "Rebuild complete. Status:"
for svc in "$BACKEND_SERVICE" "$FRONTEND_SERVICE" "$KIOSK_SERVICE"; do
  if systemctl list-unit-files | grep -q "^${svc}"; then
    sudo systemctl status "$svc" --no-pager -l | head -n 8
    echo ""
  fi
done

echo "Health checks:"
curl -s http://127.0.0.1:8001/api/ || true
echo ""
curl -I http://127.0.0.1:3000 | head -n 1 || true
