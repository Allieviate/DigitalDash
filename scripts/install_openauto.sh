#!/bin/bash

# ============================================
# OpenAuto Installation Script for Raspberry Pi 5
# For FRANK Dashboard - Android Auto Support
# ============================================

set -e

echo "=========================================="
echo "  OpenAuto Installer for FRANK Dashboard"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo bash install_openauto.sh"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current user (the one who called sudo)
CURRENT_USER="${SUDO_USER:-$(whoami)}"
CURRENT_HOME=$(eval echo ~$CURRENT_USER)

echo -e "${YELLOW}Installing for user: $CURRENT_USER${NC}"
echo ""

# Step 1: Fix potential MongoDB repo issues and install dependencies
echo "[1/5] Installing dependencies..."

# Temporarily disable MongoDB repo if it exists (it has SHA1 key issues)
if [ -f /etc/apt/sources.list.d/mongodb*.list ]; then
    echo -e "${YELLOW}Temporarily disabling MongoDB repo (SHA1 key issue)...${NC}"
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
fi

# Update apt with --allow-releaseinfo-change to handle repo changes
apt-get update --allow-releaseinfo-change -o Acquire::AllowInsecureRepositories=true 2>/dev/null || apt-get update || true

# Install OpenAuto dependencies including Abseil (required by protobuf v30+)
apt-get install -y \
    cmake \
    build-essential \
    git \
    libboost-all-dev \
    libusb-1.0-0-dev \
    libssl-dev \
    libprotobuf-dev \
    protobuf-compiler \
    libabsl-dev \
    libgps-dev \
    gpsd \
    libqt5multimedia5 \
    libqt5multimedia5-plugins \
    libqt5multimediawidgets5 \
    qtmultimedia5-dev \
    libqt5bluetooth5 \
    libqt5bluetooth5-bin \
    qtconnectivity5-dev \
    pulseaudio \
    librtaudio-dev \
    libtag1-dev \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    gstreamer1.0-tools \
    gstreamer1.0-alsa \
    gstreamer1.0-pulseaudio \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    libudev-dev \
    libevdev-dev \
    libegl1-mesa-dev \
    libdrm-dev \
    libgbm-dev \
    || {
        echo -e "${YELLOW}Some packages may not be available, continuing...${NC}"
    }

# If libabsl-dev is not available, build Abseil from source
if ! dpkg -s libabsl-dev >/dev/null 2>&1; then
    echo -e "${YELLOW}libabsl-dev not available, building Abseil from source...${NC}"
    ABSEIL_DIR="/opt/abseil-cpp"
    if [ ! -d "$ABSEIL_DIR" ]; then
        git clone --depth 1 --branch 20240116.2 https://github.com/abseil/abseil-cpp.git "$ABSEIL_DIR"
    fi
    cd "$ABSEIL_DIR"
    mkdir -p build && cd build
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
          -DABSL_BUILD_TESTING=OFF \
          -DABSL_USE_GOOGLETEST_HEAD=OFF \
          -DCMAKE_INSTALL_PREFIX=/usr/local \
          ..
    make -j$(nproc)
    make install
    ldconfig
    echo -e "${GREEN}Abseil built and installed${NC}"
fi

# Build protobuf from source (v25+ required for runtime_version.h)
echo -e "${YELLOW}Building protobuf from source for compatibility...${NC}"
PROTOBUF_DIR="/opt/protobuf"
if [ ! -f "/usr/local/include/google/protobuf/runtime_version.h" ]; then
    rm -rf "$PROTOBUF_DIR"
    mkdir -p "$PROTOBUF_DIR"
    cd "$PROTOBUF_DIR"
    
    # Download protobuf v25.3 (compatible version)
    git clone --depth 1 --branch v25.3 https://github.com/protocolbuffers/protobuf.git .
    git submodule update --init --recursive
    
    mkdir -p build && cd build
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
          -Dprotobuf_BUILD_TESTS=OFF \
          -Dprotobuf_ABSL_PROVIDER=package \
          -DCMAKE_INSTALL_PREFIX=/usr/local \
          ..
    make -j$(nproc)
    make install
    ldconfig
    echo -e "${GREEN}Protobuf v25.3 built and installed${NC}"
else
    echo -e "${GREEN}Protobuf already installed with runtime_version.h${NC}"
fi

# Re-enable MongoDB repo if it was disabled
for f in /etc/apt/sources.list.d/mongodb*.list.disabled; do
    if [ -f "$f" ]; then
        mv "$f" "${f%.disabled}" 2>/dev/null || true
    fi
done

echo -e "${GREEN}[1/5] Dependencies installed${NC}"

# Step 2: Create build directory
echo "[2/5] Setting up build directory..."
OPENAUTO_DIR="/opt/openauto"
mkdir -p $OPENAUTO_DIR
cd $OPENAUTO_DIR

echo -e "${GREEN}[2/5] Build directory ready${NC}"

# Step 3: Clone and build aasdk (Android Auto SDK)
echo "[3/5] Building aasdk (Android Auto SDK)..."

# Clean rebuild of aasdk to use new protobuf
rm -rf /opt/openauto/aasdk 2>/dev/null || true
rm -rf /usr/local/include/aap_protobuf 2>/dev/null || true
rm -rf /usr/local/include/f1x 2>/dev/null || true
rm -f /usr/local/lib/libaasdk*.so* 2>/dev/null || true

cd $OPENAUTO_DIR
git clone --depth 1 https://github.com/opencardev/aasdk.git

cd aasdk
mkdir -p build && cd build

# Configure with local protobuf and Abseil
cmake -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_PREFIX_PATH="/usr/local" \
      -DProtobuf_ROOT=/usr/local \
      -Dabsl_DIR=/usr/local/lib/cmake/absl \
      ..

make -j$(nproc)
make install
ldconfig
cd $OPENAUTO_DIR

echo -e "${GREEN}[3/5] aasdk built successfully${NC}"

# Step 4: Clone and build OpenAuto
echo "[4/5] Building OpenAuto..."
if [ ! -d "openauto" ]; then
    git clone --depth 1 https://github.com/opencardev/openauto.git
else
    echo "openauto already exists, pulling latest..."
    cd openauto && git pull || true
    cd $OPENAUTO_DIR
fi

cd openauto
mkdir -p build && cd build

# Build flags for Raspberry Pi 5 (ARM64)
cmake -DCMAKE_BUILD_TYPE=Release \
      -DRPI3_BUILD=FALSE \
      -DGST_BUILD=TRUE \
      -DCMAKE_CXX_FLAGS="-O2" \
      ..
      
make -j$(nproc)

echo -e "${GREEN}[4/5] OpenAuto built successfully${NC}"

# Step 5: Create launcher and configuration
echo "[5/5] Creating launcher and configuration..."

# Create launcher script
cat > /usr/local/bin/openauto-launcher << 'LAUNCHER_EOF'
#!/bin/bash
# ============================================
# OpenAuto Launcher for FRANK Dashboard
# ============================================

OPENAUTO_DIR="/opt/openauto/openauto/build/bin"
OPENAUTO_BIN="$OPENAUTO_DIR/autoapp"

# Kill any existing instance
pkill -f autoapp 2>/dev/null || true
sleep 0.5

# Set display environment
export DISPLAY=:0
export QT_QPA_PLATFORM=eglfs
export QT_QPA_EGLFS_PHYSICAL_WIDTH=195
export QT_QPA_EGLFS_PHYSICAL_HEIGHT=122

# Audio setup
export PULSE_SERVER=unix:/run/user/$(id -u)/pulse/native

# Launch OpenAuto
cd $OPENAUTO_DIR
if [ -f "$OPENAUTO_BIN" ]; then
    exec ./autoapp "$@"
else
    echo "Error: OpenAuto binary not found at $OPENAUTO_BIN"
    echo "Please run install_openauto.sh first"
    exit 1
fi
LAUNCHER_EOF

chmod +x /usr/local/bin/openauto-launcher

# Create systemd service for OpenAuto (optional - can be enabled manually)
cat > /etc/systemd/system/openauto.service << 'SERVICE_EOF'
[Unit]
Description=OpenAuto Android Auto
After=graphical-session.target pulseaudio.service
Wants=pulseaudio.service

[Service]
Type=simple
User=CURRENT_USER_PLACEHOLDER
Environment=DISPLAY=:0
Environment=QT_QPA_PLATFORM=eglfs
ExecStart=/usr/local/bin/openauto-launcher
Restart=on-failure
RestartSec=3

[Install]
WantedBy=graphical-session.target
SERVICE_EOF

# Replace placeholder with actual user
sed -i "s/CURRENT_USER_PLACEHOLDER/$CURRENT_USER/g" /etc/systemd/system/openauto.service

# Create OpenAuto config directory and config file
mkdir -p "$CURRENT_HOME/.config/openauto"
cat > "$CURRENT_HOME/.config/openauto/openauto.ini" << 'CONFIG_EOF'
[General]
ShowClock=false
ShowMenu=true
LaunchOnConnection=true

[Video]
FPS=60
Resolution=1920x1200
MarginWidth=0
MarginHeight=0
OMXLayerIndex=0
VideoFPS=Auto

[Audio]
MusicAudioChannelEnabled=true
SpeechAudioChannelEnabled=true
SystemAudioChannelEnabled=true
OutputBackend=PulseAudio

[Bluetooth]
AdapterType=Local
RemoteAdapterAddress=

[Input]
TouchscreenEnabled=true
ButtonEventsEnabled=true
WheelEnabled=false
TouchscreenWidth=1920
TouchscreenHeight=1200

[USB]
GuidanceAOAP=true
CONFIG_EOF

# Set correct ownership
chown -R "$CURRENT_USER:$CURRENT_USER" "$CURRENT_HOME/.config/openauto"
chown -R "$CURRENT_USER:$CURRENT_USER" /opt/openauto

# Create udev rules for Android Auto USB devices
cat > /etc/udev/rules.d/51-android-auto.rules << 'UDEV_EOF'
# Google Android Auto / AOAP devices
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="22b8", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="0bb4", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="2717", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="1004", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="0fce", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="05c6", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="2a70", MODE="0666", GROUP="plugdev"
UDEV_EOF

# Reload udev rules
udevadm control --reload-rules
udevadm trigger

# Add user to required groups
usermod -a -G plugdev,audio,video "$CURRENT_USER" 2>/dev/null || true

echo -e "${GREEN}[5/5] Configuration complete${NC}"

# Reload systemd
systemctl daemon-reload

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  OpenAuto Installation Complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "To test manually, run:"
echo -e "  ${YELLOW}openauto-launcher${NC}"
echo ""
echo "To enable auto-start on phone connection:"
echo -e "  ${YELLOW}sudo systemctl enable openauto${NC}"
echo ""
echo "Configuration file location:"
echo -e "  ${YELLOW}$CURRENT_HOME/.config/openauto/openauto.ini${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "1. Connect your Android phone via USB"
echo "2. Enable 'Android Auto' in your phone's Developer Options"
echo "3. Accept the connection prompt on your phone"
echo ""
