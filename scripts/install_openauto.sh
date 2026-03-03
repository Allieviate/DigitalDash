#!/bin/bash
# ============================================
# OpenAuto Installation Script for Raspberry Pi 5
# For FRANK Dashboard - Android Auto Support
# Version 4.0 - Pi 5 Compatible
# ============================================
#
# This script builds OpenAuto for Raspberry Pi 5 which:
# - Does NOT have OMX video (uses Qt video output instead)
# - Requires protobuf headers to be manually installed from FetchContent
# - Needs NOPI=ON flag for OpenAuto build
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  OpenAuto Installer for FRANK Dashboard"
echo "  Version 4.0 - Pi 5 Compatible"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

SECONDS=0

# ============================================
# STEP 0: Clean up ALL previous installations
# ============================================
echo "[0/5] Cleaning up ALL previous installations..."

echo -e "${YELLOW}Removing old OpenAuto build directory...${NC}"
rm -rf /opt/openauto

echo -e "${YELLOW}Removing old libraries from /usr/local...${NC}"

# Remove ALL Abseil files
rm -rf /usr/local/include/absl 2>/dev/null || true
rm -rf /usr/local/lib/cmake/absl 2>/dev/null || true
rm -rf /usr/local/lib/libabsl* 2>/dev/null || true
rm -rf /usr/local/lib/pkgconfig/absl*.pc 2>/dev/null || true

# Remove ALL Protobuf files
rm -rf /usr/local/include/google 2>/dev/null || true
rm -rf /usr/local/lib/cmake/protobuf 2>/dev/null || true
rm -rf /usr/local/lib/libprotobuf* 2>/dev/null || true
rm -rf /usr/local/lib/libprotoc* 2>/dev/null || true
rm -rf /usr/local/lib/pkgconfig/protobuf*.pc 2>/dev/null || true
rm -f /usr/local/bin/protoc 2>/dev/null || true

# Remove old aasdk files
rm -rf /usr/local/include/aasdk 2>/dev/null || true
rm -rf /usr/local/include/aap_protobuf 2>/dev/null || true
rm -rf /usr/local/lib/libaasdk* 2>/dev/null || true
rm -rf /usr/local/lib/libaap_protobuf* 2>/dev/null || true

# Disable MongoDB repo if it exists (SHA1 key issue)
if ls /etc/apt/sources.list.d/mongodb*.list 1>/dev/null 2>&1; then
    echo -e "${YELLOW}Disabling MongoDB repo (SHA1 key expired)...${NC}"
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
fi

# Refresh library cache
ldconfig

echo -e "${GREEN}[0/5] Cleanup complete${NC}"

# ============================================
# STEP 1: Install system dependencies
# ============================================
echo "[1/5] Installing system dependencies..."

apt-get update

apt-get install -y \
    build-essential \
    cmake \
    git \
    libboost-all-dev \
    libusb-1.0-0-dev \
    libssl-dev \
    librtaudio-dev \
    libtag1-dev \
    libblkid-dev \
    libgps-dev \
    qtbase5-dev \
    qtmultimedia5-dev \
    libqt5multimedia5 \
    libqt5multimedia5-plugins \
    qtconnectivity5-dev \
    libqt5bluetooth5 \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    pulseaudio \
    libpulse-dev

echo -e "${GREEN}[1/5] System dependencies installed${NC}"

# ============================================
# STEP 2: Setup build directory
# ============================================
echo "[2/5] Setting up build directory..."

OPENAUTO_DIR="/opt/openauto"
mkdir -p $OPENAUTO_DIR
cd $OPENAUTO_DIR

echo -e "${GREEN}[2/5] Build directory ready${NC}"

# ============================================
# STEP 3: Build aasdk (Android Auto SDK)
# ============================================
echo "[3/5] Building aasdk (Android Auto SDK)..."
echo -e "${YELLOW}This step takes 20-40 minutes on a Pi 5 - please be patient${NC}"
echo -e "${YELLOW}aasdk will download Abseil & Protobuf via FetchContent${NC}"

cd $OPENAUTO_DIR
git clone --depth 1 https://github.com/opencardev/aasdk.git

cd aasdk
mkdir -p build && cd build

# Configure aasdk - let it use FetchContent for dependencies
cmake -DCMAKE_BUILD_TYPE=Release ..

# Build aasdk
make -j$(nproc)

# Install aasdk libraries and headers
make install
ldconfig

echo -e "${GREEN}aasdk built successfully${NC}"

# ============================================
# CRITICAL: Install protobuf headers from FetchContent
# These are needed by OpenAuto but not auto-installed
# ============================================
echo -e "${YELLOW}Installing protobuf headers from FetchContent build...${NC}"

PROTOBUF_SRC="/opt/openauto/aasdk/build/_deps/protobuf-src/src/google"
if [ -d "$PROTOBUF_SRC" ]; then
    cp -r "$PROTOBUF_SRC" /usr/local/include/
    echo -e "${GREEN}Protobuf headers installed to /usr/local/include/google${NC}"
else
    echo -e "${RED}ERROR: Protobuf source not found at $PROTOBUF_SRC${NC}"
    echo "Checking alternative locations..."
    find /opt/openauto/aasdk/build/_deps -name "runtime_version.h" 2>/dev/null
    exit 1
fi

# Verify the critical header exists
if [ ! -f "/usr/local/include/google/protobuf/runtime_version.h" ]; then
    echo -e "${RED}ERROR: runtime_version.h not installed correctly${NC}"
    exit 1
fi

# ============================================
# Install protobuf and abseil static libraries
# ============================================
echo -e "${YELLOW}Installing protobuf libraries...${NC}"

# Find and copy protobuf libraries
PROTO_BUILD="/opt/openauto/aasdk/build/_deps/protobuf-build"
find "$PROTO_BUILD" -name "libprotobuf*.a" -exec cp {} /usr/local/lib/ \; 2>/dev/null || true
find "$PROTO_BUILD" -name "libprotobuf*.so*" -exec cp {} /usr/local/lib/ \; 2>/dev/null || true
find "$PROTO_BUILD" -name "libutf8*.a" -exec cp {} /usr/local/lib/ \; 2>/dev/null || true

# Find and copy abseil libraries
ABSEIL_BUILD="/opt/openauto/aasdk/build/_deps/abseil-cpp-build"
find "$ABSEIL_BUILD" -name "libabsl*.a" -exec cp {} /usr/local/lib/ \; 2>/dev/null || true

ldconfig

echo -e "${GREEN}[3/5] aasdk and dependencies installed${NC}"

# ============================================
# STEP 4: Build OpenAuto
# ============================================
echo "[4/5] Building OpenAuto..."
echo -e "${YELLOW}Building with NOPI=ON for Raspberry Pi 5 (no OMX)${NC}"

cd $OPENAUTO_DIR
git clone --depth 1 https://github.com/opencardev/openauto.git

cd openauto

# Patch CMakeLists.txt to disable OMX for Pi 5
# Comment out the OMX definitions if they exist
sed -i 's/add_definitions(-DUSE_OMX/#add_definitions(-DUSE_OMX/' CMakeLists.txt 2>/dev/null || true

mkdir -p build && cd build

# Configure OpenAuto for Pi 5 (NOPI=ON disables Pi-specific OMX code)
cmake -DCMAKE_BUILD_TYPE=Release \
      -DNOPI=ON \
      -DCMAKE_PREFIX_PATH="/usr/local" \
      -DCMAKE_CXX_FLAGS="-O2 -I/usr/local/include" \
      ..

# Build OpenAuto
make -j$(nproc)

# Install OpenAuto
make install
ldconfig

echo -e "${GREEN}[4/5] OpenAuto built successfully${NC}"

# ============================================
# STEP 5: Create launcher and configuration
# ============================================
echo "[5/5] Creating launcher and configuration..."

# Create config directory
mkdir -p /etc/openauto

# Create default configuration
cat > /etc/openauto/openauto.ini << 'EOF'
[General]
Resolution=1080p
FPS=60
ScreenDPI=140
TouchscreenEnabled=true
ButtonEventsEnabled=true

[Audio]
MusicAudioChannelEnabled=true
SpeechAudioChannelEnabled=true
SystemAudioChannelEnabled=true

[Bluetooth]
AdapterType=local

[Video]
OMXLayerIndex=1
VideoMarginWidth=0
VideoMarginHeight=0
EOF

# Create launcher script
cat > /usr/local/bin/openauto << 'EOF'
#!/bin/bash
# OpenAuto launcher for FRANK Dashboard

export QT_QPA_PLATFORM=eglfs
export QT_QPA_EGLFS_ALWAYS_SET_MODE=1

# Use PulseAudio
export PULSE_SERVER=unix:/run/user/$(id -u)/pulse/native

cd /opt/openauto/openauto/build/bin
./autoapp "$@"
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
Environment=QT_QPA_PLATFORM=eglfs
Environment=QT_QPA_EGLFS_ALWAYS_SET_MODE=1
ExecStart=/opt/openauto/openauto/build/bin/autoapp
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
echo "  - Platform: Raspberry Pi 5 (NOPI mode)"
echo "  - Video Output: Qt (no OMX)"
echo "  - Protobuf: v30.0 (via FetchContent)"
echo "  - aasdk: latest"
echo "  - OpenAuto: latest"
echo ""
echo "To start OpenAuto:"
echo "  sudo openauto"
echo ""
echo "Or enable as a service:"
echo "  sudo systemctl enable openauto"
echo "  sudo systemctl start openauto"
echo ""
echo -e "${YELLOW}Note: Connect your Android phone via USB and enable${NC}"
echo -e "${YELLOW}Android Auto in your phone's settings.${NC}"
echo ""
echo "Build time: approximately $(($SECONDS / 60)) minutes"
echo ""
