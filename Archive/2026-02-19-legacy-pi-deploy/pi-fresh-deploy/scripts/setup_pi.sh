#!/bin/bash
# =============================================================================
# FRANK Digital Instrument Cluster - Raspberry Pi 5 Setup Script
# For 1989 Honda Accord HMI
# =============================================================================

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     FRANK - Digital Instrument Cluster Setup                  ║"
echo "║     Raspberry Pi 5 Installation Script                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}[1/7] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}[2/7] Installing system dependencies...${NC}"
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    mongodb \
    chromium-browser \
    wmctrl \
    xdotool \
    unclutter \
    xserver-xorg \
    xinit \
    openbox \
    git \
    curl

# Start MongoDB
echo -e "${YELLOW}[3/7] Starting MongoDB service...${NC}"
sudo systemctl enable mongodb
sudo systemctl start mongodb

# Setup Python virtual environment
echo -e "${YELLOW}[4/7] Setting up Python backend...${NC}"
cd "$PROJECT_DIR/backend"

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if not exists
if [ ! -f .env ]; then
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=frank_hmi
CORS_ORIGINS=*
DHU_PATH=/opt/android-auto/desktop-head-unit
DHU_CONFIG=/opt/android-auto/dhu.ini
EOF
    echo -e "${GREEN}Created backend/.env file${NC}"
fi

deactivate

# Setup frontend
echo -e "${YELLOW}[5/7] Setting up React frontend...${NC}"
cd "$PROJECT_DIR/frontend"

# Use npm since yarn might not be available
npm install

# Create production build
npm run build

# Create .env file if not exists
if [ ! -f .env ]; then
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
    echo -e "${GREEN}Created frontend/.env file${NC}"
fi

# Install serve for production
sudo npm install -g serve

# Create systemd services
echo -e "${YELLOW}[6/7] Creating systemd services...${NC}"

# Backend service
sudo tee /etc/systemd/system/frank-backend.service > /dev/null << EOF
[Unit]
Description=FRANK HMI Backend
After=network.target mongodb.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment="PATH=$PROJECT_DIR/backend/venv/bin"
ExecStart=$PROJECT_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
sudo tee /etc/systemd/system/frank-frontend.service > /dev/null << EOF
[Unit]
Description=FRANK HMI Frontend
After=network.target frank-backend.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=/usr/bin/serve -s build -l 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Kiosk service (fullscreen browser)
sudo tee /etc/systemd/system/frank-kiosk.service > /dev/null << EOF
[Unit]
Description=FRANK HMI Kiosk Display
After=frank-frontend.service
Wants=frank-frontend.service

[Service]
Type=simple
User=$USER
Environment=DISPLAY=:0
ExecStartPre=/bin/sleep 5
ExecStart=/usr/bin/chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --no-first-run --start-fullscreen --app=http://localhost:3000
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

# Enable services
sudo systemctl daemon-reload
sudo systemctl enable frank-backend.service
sudo systemctl enable frank-frontend.service
sudo systemctl enable frank-kiosk.service

echo -e "${YELLOW}[7/7] Creating helper scripts...${NC}"

# Create start script
cat > "$PROJECT_DIR/scripts/start.sh" << 'EOF'
#!/bin/bash
sudo systemctl start frank-backend
sudo systemctl start frank-frontend
sleep 3
sudo systemctl start frank-kiosk
echo "FRANK HMI started!"
EOF
chmod +x "$PROJECT_DIR/scripts/start.sh"

# Create stop script
cat > "$PROJECT_DIR/scripts/stop.sh" << 'EOF'
#!/bin/bash
sudo systemctl stop frank-kiosk
sudo systemctl stop frank-frontend
sudo systemctl stop frank-backend
echo "FRANK HMI stopped!"
EOF
chmod +x "$PROJECT_DIR/scripts/stop.sh"

# Create status script
cat > "$PROJECT_DIR/scripts/status.sh" << 'EOF'
#!/bin/bash
echo "=== FRANK HMI Status ==="
echo ""
echo "Backend:"
sudo systemctl status frank-backend --no-pager -l | head -5
echo ""
echo "Frontend:"
sudo systemctl status frank-frontend --no-pager -l | head -5
echo ""
echo "Kiosk:"
sudo systemctl status frank-kiosk --no-pager -l | head -5
EOF
chmod +x "$PROJECT_DIR/scripts/status.sh"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     FRANK HMI Installation Complete!                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "To start the HMI manually:"
echo "  ./scripts/start.sh"
echo ""
echo "To stop:"
echo "  ./scripts/stop.sh"
echo ""
echo "To check status:"
echo "  ./scripts/status.sh"
echo ""
echo "The HMI will auto-start on boot. To disable:"
echo "  sudo systemctl disable frank-kiosk.service"
echo ""
echo -e "${YELLOW}Next step: Run the boot splash setup script:${NC}"
echo "  sudo ./scripts/setup_boot_splash.sh"
echo ""
