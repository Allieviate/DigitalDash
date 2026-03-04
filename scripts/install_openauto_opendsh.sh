#!/bin/bash
# ============================================
# OpenAuto Installation Script for Raspberry Pi
# For FRANK Dashboard - Android Auto Support
# Version 5.0 - Using openDsh fork (simpler build)
# ============================================
#
# This script uses the openDsh/openauto fork which:
# - Uses system protobuf (no FetchContent hell!)
# - Has its own aasdk fork with matching versions
# - Better community support
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  OpenAuto Installer for FRANK Dashboard"
echo "  Version 5.0 - openDsh Fork"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

SECONDS=0

# ============================================
# STEP 0: Clean up previous installations
# ============================================
echo "[0/5] Cleaning up previous installations..."

# Disable MongoDB repo if it exists (SHA1 key expired)
if ls /etc/apt/sources.list.d/mongodb*.list 1>/dev/null 2>&1; then
    echo -e "${YELLOW}Disabling MongoDB repo (SHA1 key issue)...${NC}"
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
fi

# Remove old build directories (but NOT /opt/openauto if it's working)
rm -rf /tmp/aasdk_build /tmp/openauto_build 2>/dev/null || true

echo -e "${GREEN}[0/5] Cleanup complete${NC}"

# ============================================
# STEP 1: Install system dependencies
# ============================================
echo "[1/5] Installing system dependencies..."

apt-get update

apt-get install -y \
    cmake \
    build-essential \
    git \
    libboost-all-dev \
    libusb-1.0-0-dev \
    libssl-dev \
    libprotobuf-dev \
    protobuf-c-compiler \
    protobuf-compiler \
    libqt5multimedia5 \
    libqt5multimedia5-plugins \
    libqt5multimediawidgets5 \
    qtmultimedia5-dev \
    libqt5bluetooth5 \
    libqt5bluetooth5-bin \
    qtconnectivity5-dev \
    qtbase5-dev \
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
    libgstreamer-plugins-base1.0-dev

echo -e "${GREEN}[1/5] System dependencies installed${NC}"

# ============================================
# STEP 2: Build aasdk (openDsh fork)
# ============================================
echo "[2/5] Building aasdk (openDsh fork)..."

OPENAUTO_DIR="/opt/openauto"
mkdir -p $OPENAUTO_DIR
cd $OPENAUTO_DIR

# Clone openDsh aasdk fork
if [ -d "aasdk" ]; then
    echo -e "${YELLOW}Removing old aasdk...${NC}"
    rm -rf aasdk
fi

git clone --depth 1 https://github.com/openDsh/aasdk.git

cd aasdk
mkdir -p build && cd build

cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
make install
ldconfig

echo -e "${GREEN}[2/5] aasdk built and installed${NC}"

# ============================================
# STEP 3: Build OpenAuto (openDsh fork)
# ============================================
echo "[3/5] Building OpenAuto (openDsh fork)..."

cd $OPENAUTO_DIR

# Clone openDsh openauto fork
if [ -d "openauto" ]; then
    echo -e "${YELLOW}Removing old openauto...${NC}"
    rm -rf openauto
fi

git clone --depth 1 -b develop https://github.com/openDsh/openauto.git

cd openauto
mkdir -p build && cd build

# Build OpenAuto
# Note: We don't use RPI3_BUILD on Pi 5 as it enables OMX which doesn't exist
cmake -DCMAKE_BUILD_TYPE=Release \
      -DAASDK_INCLUDE_DIRS="/opt/openauto/aasdk/include" \
      -DAASDK_LIBRARIES="/usr/local/lib/libaasdk.so" \
      -DAASDK_PROTO_INCLUDE_DIRS="/opt/openauto/aasdk" \
      -DAASDK_PROTO_LIBRARIES="/usr/local/lib/libaasdk_proto.so" \
      ..

make -j$(nproc)
make install
ldconfig

echo -e "${GREEN}[3/5] OpenAuto built and installed${NC}"

# ============================================
# STEP 4: Verify installation
# ============================================
echo "[4/5] Verifying installation..."

if [ -f "/opt/openauto/openauto/build/bin/autoapp" ]; then
    echo -e "${GREEN}✓ autoapp binary found${NC}"
else
    echo -e "${RED}✗ autoapp binary NOT found${NC}"
    echo "Checking alternative locations..."
    find /opt/openauto -name "autoapp" 2>/dev/null
    exit 1
fi

echo -e "${GREEN}[4/5] Verification complete${NC}"

# ============================================
# STEP 5: Create launcher and configuration
# ============================================
echo "[5/5] Creating launcher and configuration..."

# Create config directory
mkdir -p /etc/openauto

# Create launcher script
cat > /usr/local/bin/openauto << 'EOF'
#!/bin/bash
# OpenAuto launcher for FRANK Dashboard

export QT_QPA_PLATFORM=xcb
export PULSE_SERVER=unix:/run/user/$(id -u)/pulse/native

# Find the autoapp binary
AUTOAPP="/opt/openauto/openauto/build/bin/autoapp"

if [ ! -f "$AUTOAPP" ]; then
    AUTOAPP=$(find /opt/openauto -name "autoapp" -type f 2>/dev/null | head -1)
fi

if [ -f "$AUTOAPP" ]; then
    exec "$AUTOAPP" "$@"
else
    echo "Error: autoapp binary not found"
    exit 1
fi
EOF

chmod +x /usr/local/bin/openauto

# Create systemd service
cat > /etc/systemd/system/openauto.service << 'EOF'
[Unit]
Description=OpenAuto - Android Auto
After=network.target bluetooth.service

[Service]
Type=simple
User=root
Environment=QT_QPA_PLATFORM=xcb
Environment=DISPLAY=:0
ExecStart=/usr/local/bin/openauto
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo -e "${GREEN}[5/5] Configuration complete${NC}"

# ============================================
# Installation complete
# ============================================
echo ""
echo "=========================================="
echo -e "${GREEN}OpenAuto Installation Complete!${NC}"
echo "=========================================="
echo ""
echo "Build Summary:"
echo "  - aasdk: openDsh fork"
echo "  - OpenAuto: openDsh fork"
echo "  - Protobuf: system package"
echo ""
echo "Binary location:"
echo "  /opt/openauto/openauto/build/bin/autoapp"
echo ""
echo "To start OpenAuto:"
echo "  openauto"
echo ""
echo "Or enable as a service:"
echo "  sudo systemctl enable openauto"
echo "  sudo systemctl start openauto"
echo ""
echo "Build time: approximately $(($SECONDS / 60)) minutes"
echo ""
