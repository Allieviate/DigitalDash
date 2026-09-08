#!/bin/bash
# Start the dash. Backend first so the frontend has something to talk
# to, then the kiosk once serve is answering.
#
# No network call here on purpose. Checking for updates used to run as
# the first thing this script did, which meant every start waited on a
# fetch that cannot succeed in a car. Run status.sh, or check_updates.sh
# directly, when you actually want to know.
set -euo pipefail

sudo systemctl start frank-can || true
sudo systemctl start frank-backend
sudo systemctl start frank-frontend

# launch_kiosk.sh waits for the frontend itself, so this is only to
# avoid a pointless first attempt.
sleep 3
sudo systemctl start frank-kiosk

echo "FRANK HMI started."
