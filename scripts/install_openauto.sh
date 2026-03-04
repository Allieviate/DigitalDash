#!/bin/bash
# ============================================
# Android Auto Installation Script
# For FRANK Dashboard - Raspberry Pi 5
# Version 7.0 - Unified Installer
# ============================================
#
# This script tries multiple approaches:
# 1. web-auto (Node.js) - Recommended for Pi 5
# 2. OpenAuto (openDsh fork) - Fallback option
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  Android Auto Installer - FRANK Dashboard"
echo "  Version 7.0 - Unified"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

SECONDS=0
USER_HOME=$(eval echo ~${SUDO_USER:-$USER})
ACTUAL_USER=${SUDO_USER:-$USER}

# ============================================
# STEP 0: System Preparation
# ============================================
echo "[0/6] Preparing system..."

# Disable MongoDB repo if it exists (SHA1 key expired)
if ls /etc/apt/sources.list.d/mongodb*.list 1>/dev/null 2>&1; then
    echo -e "${YELLOW}Disabling MongoDB repo (SHA1 key issue)...${NC}"
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
fi

# Clean up old installations
echo -e "${YELLOW}Cleaning up old installations...${NC}"
rm -rf /opt/web-auto 2>/dev/null || true
rm -rf /opt/openauto 2>/dev/null || true

echo -e "${GREEN}[0/6] System prepared${NC}"

# ============================================
# STEP 1: Install System Dependencies
# ============================================
echo "[1/6] Installing system dependencies..."

apt-get update

# Combined dependencies for both web-auto and OpenAuto
apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
    protobuf-compiler \
    libprotobuf-dev \
    nmap \
    libusb-1.0-0-dev \
    libudev-dev \
    libssl-dev \
    libboost-all-dev \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    qtbase5-dev \
    qtmultimedia5-dev \
    libqt5multimedia5 \
    libqt5multimedia5-plugins \
    qtconnectivity5-dev \
    libqt5bluetooth5 \
    pulseaudio \
    libpulse-dev \
    librtaudio-dev \
    libtag1-dev \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    wmctrl

echo -e "${GREEN}[1/6] System dependencies installed${NC}"

# ============================================
# STEP 2: Setup Node.js (for web-auto)
# ============================================
echo "[2/6] Setting up Node.js..."

export NVM_DIR="$USER_HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
    echo -e "${YELLOW}Installing NVM...${NC}"
    sudo -u $ACTUAL_USER bash -c 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash'
fi

# Source nvm and install Node
sudo -u $ACTUAL_USER bash -c "
    export NVM_DIR='$USER_HOME/.nvm'
    [ -s '\$NVM_DIR/nvm.sh' ] && . '\$NVM_DIR/nvm.sh'
    nvm install --lts 2>/dev/null || nvm use --lts
"

echo -e "${GREEN}[2/6] Node.js ready${NC}"

# ============================================
# STEP 3: Install web-auto (Primary - Node.js)
# ============================================
echo "[3/6] Installing web-auto (Node.js based)..."

WEBAUTO_DIR="/opt/web-auto"
WEBAUTO_SUCCESS=false

# Clone web-auto
git clone --depth 1 https://github.com/Demon000/web-auto.git "$WEBAUTO_DIR" 2>/dev/null || true

if [ -d "$WEBAUTO_DIR" ]; then
    cd "$WEBAUTO_DIR"
    
    # Copy default config
    cp config.default.json5 config.json5
    
    # Generate SSL certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout cert.key -out cert.crt \
        -subj "/CN=localhost/O=FRANK Dashboard/C=US" 2>/dev/null
    
    # Set ownership
    chown -R $ACTUAL_USER:$ACTUAL_USER "$WEBAUTO_DIR"
    
    # Try to build
    echo -e "${YELLOW}Building web-auto (this may take 5-10 minutes)...${NC}"
    
    if sudo -u $ACTUAL_USER bash -c "
        export NVM_DIR='$USER_HOME/.nvm'
        [ -s '\$NVM_DIR/nvm.sh' ] && . '\$NVM_DIR/nvm.sh'
        cd $WEBAUTO_DIR
        npm install 2>&1 && npm run build 2>&1
    "; then
        WEBAUTO_SUCCESS=true
        echo -e "${GREEN}web-auto built successfully!${NC}"
    else
        echo -e "${YELLOW}web-auto build failed, will try OpenAuto...${NC}"
    fi
else
    echo -e "${YELLOW}Failed to clone web-auto, will try OpenAuto...${NC}"
fi

if [ "$WEBAUTO_SUCCESS" = true ]; then
    echo -e "${GREEN}[3/6] web-auto installed${NC}"
else
    echo -e "${YELLOW}[3/6] web-auto skipped, continuing with OpenAuto...${NC}"
fi

# ============================================
# STEP 4: Install OpenAuto (Fallback - C++)
# ============================================
echo "[4/6] Installing OpenAuto (openDsh fork)..."

OPENAUTO_DIR="/opt/openauto"
OPENAUTO_SUCCESS=false

mkdir -p "$OPENAUTO_DIR"
cd "$OPENAUTO_DIR"

# Clone and build aasdk (openDsh fork)
echo -e "${YELLOW}Building aasdk...${NC}"
if git clone --depth 1 https://github.com/openDsh/aasdk.git 2>/dev/null; then
    cd aasdk
    mkdir -p build && cd build
    
    if cmake -DCMAKE_BUILD_TYPE=Release .. && make -j$(nproc); then
        make install
        ldconfig
        echo -e "${GREEN}aasdk built successfully!${NC}"
        
        # Now build OpenAuto
        cd "$OPENAUTO_DIR"
        echo -e "${YELLOW}Building OpenAuto...${NC}"
        
        if git clone --depth 1 -b develop https://github.com/openDsh/openauto.git 2>/dev/null; then
            cd openauto
            mkdir -p build && cd build
            
            if cmake -DCMAKE_BUILD_TYPE=Release \
                     -DAASDK_INCLUDE_DIRS="/opt/openauto/aasdk/include" \
                     -DAASDK_LIBRARIES="/usr/local/lib/libaasdk.so" \
                     -DAASDK_PROTO_INCLUDE_DIRS="/opt/openauto/aasdk" \
                     -DAASDK_PROTO_LIBRARIES="/usr/local/lib/libaasdk_proto.so" \
                     .. && make -j$(nproc); then
                make install
                ldconfig
                OPENAUTO_SUCCESS=true
                echo -e "${GREEN}OpenAuto built successfully!${NC}"
            fi
        fi
    fi
fi

if [ "$OPENAUTO_SUCCESS" = true ]; then
    echo -e "${GREEN}[4/6] OpenAuto installed${NC}"
else
    echo -e "${YELLOW}[4/6] OpenAuto build had issues${NC}"
fi

# ============================================
# STEP 5: Create Launcher Scripts
# ============================================
echo "[5/6] Creating launcher scripts..."

# USB udev rules for Android devices
cat > /etc/udev/rules.d/50-android-auto.rules << 'EOF'
# Android Auto USB permissions
SUBSYSTEM=="usb", ATTR{idVendor}=="*", ATTR{idProduct}=="*", MODE="0660", GROUP="plugdev"
# Google devices
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev"
# Samsung devices  
SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", MODE="0666", GROUP="plugdev"
EOF

udevadm control --reload-rules 2>/dev/null || true
udevadm trigger 2>/dev/null || true

# Add user to plugdev group
usermod -aG plugdev $ACTUAL_USER 2>/dev/null || true

# Create unified launcher that picks the best available option
cat > /usr/local/bin/android-auto << EOF
#!/bin/bash
# Android Auto Unified Launcher for FRANK Dashboard

export DISPLAY=:0

# Try web-auto first (Electron)
if [ -f "/opt/web-auto/package.json" ]; then
    echo "Launching web-auto (Electron)..."
    export NVM_DIR="$USER_HOME/.nvm"
    source "\$NVM_DIR/nvm.sh" 2>/dev/null
    cd /opt/web-auto
    npm run prepare-electron 2>/dev/null
    exec npm run start-electron
fi

# Try OpenAuto
if [ -f "/opt/openauto/openauto/build/bin/autoapp" ]; then
    echo "Launching OpenAuto..."
    exec /opt/openauto/openauto/build/bin/autoapp
fi

# Nothing found
echo "Error: No Android Auto implementation found!"
echo "Please run: sudo bash ~/projects/DigitalDash/scripts/install_openauto.sh"
exit 1
EOF

chmod +x /usr/local/bin/android-auto

# Create web-auto specific launchers if it was installed
if [ "$WEBAUTO_SUCCESS" = true ]; then
    cat > /usr/local/bin/android-auto-web << EOF
#!/bin/bash
# Android Auto Web Server Mode
export NVM_DIR="$USER_HOME/.nvm"
source "\$NVM_DIR/nvm.sh" 2>/dev/null
cd /opt/web-auto
npm run prepare-node 2>/dev/null
npm run start-node &
sleep 2
echo "Web server started. Open https://localhost:9000 in browser"
npm run start-web
EOF
    chmod +x /usr/local/bin/android-auto-web
fi

# Create systemd service
cat > /etc/systemd/system/android-auto.service << EOF
[Unit]
Description=Android Auto for FRANK Dashboard
After=network.target graphical.target

[Service]
Type=simple
User=$ACTUAL_USER
Environment=DISPLAY=:0
ExecStart=/usr/local/bin/android-auto
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

systemctl daemon-reload

echo -e "${GREEN}[5/6] Launchers created${NC}"

# ============================================
# STEP 6: Summary
# ============================================
echo "[6/6] Installation complete!"
echo ""
echo "=========================================="
echo -e "${GREEN}Android Auto Installation Complete!${NC}"
echo "=========================================="
echo ""
echo "Installation Results:"

if [ "$WEBAUTO_SUCCESS" = true ]; then
    echo -e "  ${GREEN}✓ web-auto (Node.js)${NC} - INSTALLED"
else
    echo -e "  ${RED}✗ web-auto (Node.js)${NC} - Failed/Skipped"
fi

if [ "$OPENAUTO_SUCCESS" = true ]; then
    echo -e "  ${GREEN}✓ OpenAuto (C++)${NC} - INSTALLED"
else
    echo -e "  ${RED}✗ OpenAuto (C++)${NC} - Failed/Skipped"
fi

echo ""
echo "Commands:"
echo "  android-auto        - Launch Android Auto (auto-selects best option)"

if [ "$WEBAUTO_SUCCESS" = true ]; then
    echo "  android-auto-web    - Start web server mode (browser access)"
fi

echo ""
echo "Service:"
echo "  sudo systemctl enable android-auto"
echo "  sudo systemctl start android-auto"
echo ""
echo -e "${YELLOW}To use:${NC}"
echo "  1. Connect Android phone via USB"
echo "  2. Enable USB debugging on phone"
echo "  3. Open Android Auto app on phone"
echo "  4. Run: android-auto"
echo ""
echo "Build time: approximately $(($SECONDS / 60)) minutes"
echo ""

# Final status
if [ "$WEBAUTO_SUCCESS" = true ] || [ "$OPENAUTO_SUCCESS" = true ]; then
    echo -e "${GREEN}At least one Android Auto implementation is ready!${NC}"
    exit 0
else
    echo -e "${RED}WARNING: No Android Auto implementation was successfully installed.${NC}"
    echo "Please check the error messages above and try again."
    exit 1
fi
