#!/bin/bash
# Stop the dash, in reverse dependency order.
set -euo pipefail

sudo systemctl stop frank-kiosk
sudo systemctl stop frank-frontend
sudo systemctl stop frank-backend

echo "FRANK HMI stopped."
