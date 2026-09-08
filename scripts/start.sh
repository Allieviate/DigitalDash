#!/bin/bash
# Start the dash. Backend first so the frontend has something to talk
# to, then the kiosk once serve is answering.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/check_updates.sh" || true

sudo systemctl start frank-can || true
sudo systemctl start frank-backend
sudo systemctl start frank-frontend

# launch_kiosk.sh waits for the frontend itself, so this is only to
# avoid a pointless first attempt.
sleep 3
sudo systemctl start frank-kiosk

echo "FRANK HMI started."
