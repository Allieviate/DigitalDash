#!/bin/bash

# ============================================
# FRANK Digital Dash - Raspberry Pi 5 Installer
# ============================================

set -e

USER_NAME="mashumxro"
PROJECT_DIR="/home/$USER_NAME/projects/DigitalDash"

echo "=========================================="
echo "  FRANK Digital Dash Installer"
echo "=========================================="
echo ""

# Must run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo bash install.sh"
    exit 1
fi

# Step 1: System Update & Dependencies
echo "[1/8] Installing system dependencies..."
apt update
apt install -y \
    python3 python3-pip python3-venv \
    nodejs npm \
    chromium-browser \
    unclutter \
    git \
    mongodb

# Install yarn
npm install -g yarn

# Enable MongoDB
systemctl enable mongodb
systemctl start mongodb

# Step 2: Create project directory
echo "[2/8] Setting up project directory..."
mkdir -p "$PROJECT_DIR"
cp -r ./backend "$PROJECT_DIR/"
cp -r ./frontend "$PROJECT_DIR/"
cp -r ./scripts "$PROJECT_DIR/"
chown -R $USER_NAME:$USER_NAME "$PROJECT_DIR"

# Step 3: Setup Backend
echo "[3/8] Setting up backend..."
cd "$PROJECT_DIR/backend"
sudo -u $USER_NAME python3 -m venv .venv
sudo -u $USER_NAME bash -c "source .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"

# Create backend .env
cat > "$PROJECT_DIR/backend/.env" << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=frank_hmi
CORS_ORIGINS=*
EOF
chown $USER_NAME:$USER_NAME "$PROJECT_DIR/backend/.env"

# Step 4: Setup Frontend
echo "[4/8] Building frontend..."
cd "$PROJECT_DIR/frontend"

# Create frontend .env
cat > "$PROJECT_DIR/frontend/.env" << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
chown $USER_NAME:$USER_NAME "$PROJECT_DIR/frontend/.env"

sudo -u $USER_NAME yarn install
sudo -u $USER_NAME yarn build

# Step 5: Create systemd service
echo "[5/8] Creating backend service..."
cat > /etc/systemd/system/dash-backend.service << EOF
[Unit]
Description=FRANK Digital Dash Backend
After=network.target mongodb.service
Wants=mongodb.service

[Service]
Type=simple
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$PROJECT_DIR/backend
Environment="PATH=$PROJECT_DIR/backend/.venv/bin:/usr/bin"
ExecStart=$PROJECT_DIR/backend/.venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable dash-backend.service
systemctl start dash-backend.service

# Step 6: Setup kiosk autostart
echo "[6/8] Setting up kiosk mode..."
chmod +x "$PROJECT_DIR/scripts/start_kiosk.sh"

mkdir -p "/home/$USER_NAME/.config/autostart"
cat > "/home/$USER_NAME/.config/autostart/dash-kiosk.desktop" << EOF
[Desktop Entry]
Type=Application
Name=FRANK Digital Dash
Exec=$PROJECT_DIR/scripts/start_kiosk.sh
X-GNOME-Autostart-enabled=true
EOF
chown -R $USER_NAME:$USER_NAME "/home/$USER_NAME/.config"

# Step 7: Disable screen blanking
echo "[7/8] Disabling screen blanking..."
mkdir -p /etc/xdg/lxsession/LXDE-pi
cat >> /etc/xdg/lxsession/LXDE-pi/autostart << EOF
@xset s off
@xset -dpms
@xset s noblank
EOF

# Step 8: Configure X11 (not Wayland)
echo "[8/8] Configuring display..."
if [ -f /boot/firmware/config.txt ]; then
    CONFIG_FILE="/boot/firmware/config.txt"
else
    CONFIG_FILE="/boot/config.txt"
fi

# Ensure X11 mode
raspi-config nonint do_wayland W1

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run: sudo raspi-config"
echo "   - System Options → Boot / Auto Login → Desktop Autologin"
echo ""
echo "2. Reboot: sudo reboot"
echo ""
echo "After reboot, the dashboard will start automatically!"
echo ""
echo "Troubleshooting commands:"
echo "  - Check backend: sudo systemctl status dash-backend.service"
echo "  - View logs: journalctl -u dash-backend.service -f"
echo "  - Test API: curl http://localhost:8001/api/"
echo ""
