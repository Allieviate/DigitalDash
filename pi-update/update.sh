#!/bin/bash

# Update script for FRANK Dashboard on Raspberry Pi
# Run this after transferring the pi-update folder

echo "=========================================="
echo "  Updating FRANK Dashboard"
echo "=========================================="

PROJECT_DIR="/home/mashumxro/projects/DigitalDash"

# Step 1: Backup existing files
echo "[1/4] Backing up existing files..."
mkdir -p ~/backups
cp "$PROJECT_DIR/backend/server.py" ~/backups/server.py.bak 2>/dev/null
cp "$PROJECT_DIR/frontend/src/components/hmi/Dashboard.jsx" ~/backups/Dashboard.jsx.bak 2>/dev/null

# Step 2: Copy updated files
echo "[2/4] Copying updated files..."
cp ~/pi-update/server.py "$PROJECT_DIR/backend/"
cp ~/pi-update/Dashboard.jsx "$PROJECT_DIR/frontend/src/components/hmi/"
cp ~/pi-update/DashWidgets.jsx "$PROJECT_DIR/frontend/src/components/hmi/"
cp ~/pi-update/CustomGauges.jsx "$PROJECT_DIR/frontend/src/components/hmi/"
cp ~/pi-update/WarningPanel.jsx "$PROJECT_DIR/frontend/src/components/hmi/"
cp ~/pi-update/AndroidAutoPanel.jsx "$PROJECT_DIR/frontend/src/components/hmi/"
cp ~/pi-update/install_openauto.sh "$PROJECT_DIR/scripts/"
chmod +x "$PROJECT_DIR/scripts/install_openauto.sh"

# Step 3: Rebuild frontend
echo "[3/4] Rebuilding frontend..."
cd "$PROJECT_DIR/frontend"
yarn build

# Step 4: Restart backend
echo "[4/4] Restarting backend..."
sudo systemctl restart dash-backend.service

echo ""
echo "=========================================="
echo "  Update Complete!"
echo "=========================================="
echo ""
echo "Changes applied:"
echo "  - Scaled UI for 1920x1200 display"
echo "  - OpenAuto integration ready"
echo ""
echo "To install OpenAuto, run:"
echo "  sudo bash ~/projects/DigitalDash/scripts/install_openauto.sh"
echo ""
echo "Reboot to see changes:"
echo "  sudo reboot"
echo ""
