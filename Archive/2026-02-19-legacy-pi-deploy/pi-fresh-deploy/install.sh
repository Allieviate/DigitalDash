#!/bin/bash

# ============================================
# FRANK Digital Dash - Quick Install Script
# ============================================

set -e

echo "=========================================="
echo "  FRANK Digital Dash - Quick Install"
echo "=========================================="

# Step 1: Install dependencies
echo "[1/6] Installing system dependencies..."
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm chromium unclutter

# Install yarn
sudo npm install -g yarn

# Step 2: Setup project directory
echo "[2/6] Setting up project..."
mkdir -p ~/projects/DigitalDash
cp -r ~/pi-fresh-deploy/backend ~/projects/DigitalDash/
cp -r ~/pi-fresh-deploy/frontend ~/projects/DigitalDash/
cp -r ~/pi-fresh-deploy/scripts ~/projects/DigitalDash/

# Step 3: Setup backend
echo "[3/6] Setting up backend..."
cd ~/projects/DigitalDash/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn motor python-dotenv pydantic

# Create backend .env
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=frank_hmi
CORS_ORIGINS=*
EOF

deactivate

# Step 4: Setup frontend
echo "[4/6] Building frontend..."
cd ~/projects/DigitalDash/frontend

cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

yarn install
yarn build

# Step 5: Create systemd service
echo "[5/6] Creating backend service..."
sudo tee /etc/systemd/system/dash-backend.service << 'EOF'
[Unit]
Description=FRANK Digital Dash Backend
After=network.target

[Service]
Type=simple
User=mashumxro
WorkingDirectory=/home/mashumxro/projects/DigitalDash/backend
ExecStart=/home/mashumxro/projects/DigitalDash/backend/.venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable dash-backend.service
sudo systemctl start dash-backend.service

# Step 6: Setup kiosk autostart
echo "[6/6] Setting up kiosk mode..."
chmod +x ~/projects/DigitalDash/scripts/start_kiosk.sh

mkdir -p ~/.config/autostart
cat > ~/.config/autostart/dash-kiosk.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=FRANK Digital Dash
Exec=/home/mashumxro/projects/DigitalDash/scripts/start_kiosk.sh
X-GNOME-Autostart-enabled=true
EOF

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Enable auto-login:"
echo "   sudo raspi-config"
echo "   -> System Options -> Boot / Auto Login -> Desktop Autologin"
echo ""
echo "2. Reboot:"
echo "   sudo reboot"
echo ""
echo "Dashboard will launch automatically on boot!"
echo ""
