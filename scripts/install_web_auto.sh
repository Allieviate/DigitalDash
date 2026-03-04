#!/bin/bash
# ============================================
# WebAuto Installation Script for Raspberry Pi 5
# For FRANK Dashboard - Android Auto Support
# Version 6.0 - Using web-auto (Node.js based)
# ============================================
#
# This script uses Demon000/web-auto which:
# - Is written in TypeScript/Node.js (no C++ protobuf!)
# - Runs as Electron app or web server
# - Supports USB, TCP, and Bluetooth connections
# - Much easier to integrate with web-based dashboards
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  WebAuto Installer for FRANK Dashboard"
echo "  Version 6.0 - Node.js Based"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

SECONDS=0
INSTALL_DIR="/opt/web-auto"
USER_HOME=$(eval echo ~${SUDO_USER:-$USER})

# ============================================
# STEP 0: Clean up and disable problematic repos
# ============================================
echo "[0/6] Preparing system..."

# Disable MongoDB repo if it exists (SHA1 key expired)
if ls /etc/apt/sources.list.d/mongodb*.list 1>/dev/null 2>&1; then
    echo -e "${YELLOW}Disabling MongoDB repo (SHA1 key issue)...${NC}"
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
fi

echo -e "${GREEN}[0/6] System prepared${NC}"

# ============================================
# STEP 1: Install system dependencies
# ============================================
echo "[1/6] Installing system dependencies..."

apt-get update

apt-get install -y \
    curl \
    git \
    protobuf-compiler \
    nmap \
    libusb-1.0-0-dev \
    libudev-dev \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libdrm2 \
    libgbm1 \
    libasound2

echo -e "${GREEN}[1/6] System dependencies installed${NC}"

# ============================================
# STEP 2: Install Node.js via NVM
# ============================================
echo "[2/6] Setting up Node.js..."

# Install nvm for the actual user
export NVM_DIR="$USER_HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
    echo -e "${YELLOW}Installing NVM...${NC}"
    sudo -u ${SUDO_USER:-$USER} bash -c 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash'
fi

# Source nvm
export NVM_DIR="$USER_HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install latest LTS Node.js
echo -e "${YELLOW}Installing Node.js LTS...${NC}"
sudo -u ${SUDO_USER:-$USER} bash -c "source $NVM_DIR/nvm.sh && nvm install --lts && nvm use --lts"

# Get node path for later use
NODE_PATH=$(sudo -u ${SUDO_USER:-$USER} bash -c "source $NVM_DIR/nvm.sh && which node")
NPM_PATH=$(sudo -u ${SUDO_USER:-$USER} bash -c "source $NVM_DIR/nvm.sh && which npm")

echo -e "${GREEN}[2/6] Node.js installed: $NODE_PATH${NC}"

# ============================================
# STEP 3: Clone web-auto
# ============================================
echo "[3/6] Cloning web-auto..."

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Removing old web-auto installation...${NC}"
    rm -rf "$INSTALL_DIR"
fi

git clone --depth 1 https://github.com/Demon000/web-auto.git "$INSTALL_DIR"

# Set ownership to the actual user
chown -R ${SUDO_USER:-$USER}:${SUDO_USER:-$USER} "$INSTALL_DIR"

echo -e "${GREEN}[3/6] web-auto cloned${NC}"

# ============================================
# STEP 4: Configure web-auto
# ============================================
echo "[4/6] Configuring web-auto..."

cd "$INSTALL_DIR"

# Copy default config
cp config.default.json5 config.json5

# Generate self-signed certificate for HTTPS
echo -e "${YELLOW}Generating SSL certificate...${NC}"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout cert.key -out cert.crt \
    -subj "/CN=localhost/O=FRANK Dashboard/C=US" 2>/dev/null

chown ${SUDO_USER:-$USER}:${SUDO_USER:-$USER} cert.key cert.crt config.json5

echo -e "${GREEN}[4/6] Configuration complete${NC}"

# ============================================
# STEP 5: Install npm dependencies and build
# ============================================
echo "[5/6] Installing dependencies and building..."
echo -e "${YELLOW}This may take 5-10 minutes...${NC}"

cd "$INSTALL_DIR"

# Install and build as the actual user
sudo -u ${SUDO_USER:-$USER} bash -c "
    source $NVM_DIR/nvm.sh
    cd $INSTALL_DIR
    npm install
    npm run build
"

echo -e "${GREEN}[5/6] Build complete${NC}"

# ============================================
# STEP 6: Create launcher scripts and service
# ============================================
echo "[6/6] Creating launchers..."

# Create USB udev rules for Android devices
cat > /etc/udev/rules.d/50-android-auto.rules << 'EOF'
# Android Auto USB permissions
SUBSYSTEM=="usb", ATTR{idVendor}=="*", ATTR{idProduct}=="*", MODE="0660", GROUP="plugdev"
# Google devices
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev"
# Samsung devices
SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", MODE="0666", GROUP="plugdev"
EOF

udevadm control --reload-rules
udevadm trigger

# Add user to plugdev group
usermod -aG plugdev ${SUDO_USER:-$USER} 2>/dev/null || true

# Create Electron launcher
cat > /usr/local/bin/web-auto-electron << EOF
#!/bin/bash
export NVM_DIR="$USER_HOME/.nvm"
source "\$NVM_DIR/nvm.sh"
cd $INSTALL_DIR
npm run prepare-electron 2>/dev/null || true
npm run start-electron
EOF

chmod +x /usr/local/bin/web-auto-electron

# Create Node server launcher (for web access)
cat > /usr/local/bin/web-auto-server << EOF
#!/bin/bash
export NVM_DIR="$USER_HOME/.nvm"
source "\$NVM_DIR/nvm.sh"
cd $INSTALL_DIR
npm run prepare-node 2>/dev/null || true
npm run start-node &
sleep 2
npm run start-web
EOF

chmod +x /usr/local/bin/web-auto-server

# Create systemd service for server mode
cat > /etc/systemd/system/web-auto.service << EOF
[Unit]
Description=WebAuto - Android Auto (Server Mode)
After=network.target

[Service]
Type=simple
User=${SUDO_USER:-$USER}
WorkingDirectory=$INSTALL_DIR
Environment="NVM_DIR=$USER_HOME/.nvm"
ExecStart=/bin/bash -c 'source \$NVM_DIR/nvm.sh && npm run start-node'
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo -e "${GREEN}[6/6] Launchers created${NC}"

# ============================================
# Installation complete
# ============================================
echo ""
echo "=========================================="
echo -e "${GREEN}WebAuto Installation Complete!${NC}"
echo "=========================================="
echo ""
echo "Installation Summary:"
echo "  - Location: $INSTALL_DIR"
echo "  - Node.js: via NVM"
echo "  - Config: $INSTALL_DIR/config.json5"
echo ""
echo "Launch Options:"
echo ""
echo "  1. Electron App (standalone window):"
echo "     web-auto-electron"
echo ""
echo "  2. Web Server (access via browser):"
echo "     web-auto-server"
echo "     Then open: https://localhost:9000"
echo ""
echo "  3. As systemd service:"
echo "     sudo systemctl enable web-auto"
echo "     sudo systemctl start web-auto"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Edit $INSTALL_DIR/config.json5 to configure:"
echo "  - USB device handler"
echo "  - TCP/Bluetooth connection"
echo "  - Video/audio settings"
echo ""
echo -e "${YELLOW}Connect your phone:${NC}"
echo "  1. Enable USB debugging on phone"
echo "  2. Connect phone via USB"
echo "  3. Open Android Auto app on phone"
echo "  4. Run: web-auto-electron"
echo ""
echo "Build time: approximately $(($SECONDS / 60)) minutes"
echo ""
