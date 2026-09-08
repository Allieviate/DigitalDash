#!/bin/bash
# Quick health check for all FRANK services.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/check_updates.sh" || true

echo
echo "=== FRANK HMI Status ==="

for unit in frank-can frank-backend frank-frontend frank-kiosk; do
  echo
  echo "--- $unit ---"
  systemctl status "$unit" --no-pager -l 2>/dev/null | head -5 || echo "not installed"
done

echo
echo "--- CAN interfaces ---"
ip -brief link show 2>/dev/null | grep -i can || echo "none present"

echo
echo "--- Signal source ---"
# Which source the backend is actually running is the one thing worth
# checking before driving: a dash quietly on the simulator shows a
# healthy engine no matter what the real one is doing.
curl -fsS --max-time 2 http://localhost:8001/api/source-status 2>/dev/null \
  || echo "backend not answering on :8001"
echo
