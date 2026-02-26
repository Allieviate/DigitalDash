#!/bin/bash

# ============================================
# OpenAuto Installation Script for Raspberry Pi 5
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

# Step 1: Install dependencies
echo "[1/5] Installing dependencies..."
apt update
apt install -y \
    cmake \
    build-essential \
    git \
    libboost-all-dev \
    libusb-1.0-0-dev \
    libssl-dev \
    libprotobuf-dev \
    protobuf-compiler \
    libqt5multimedia5 \
    libqt5multimedia5-plugins \
    libqt5multimediawidgets5 \
    qtmultimedia5-dev \
    libqt5bluetooth5 \
    libqt5bluetooth5-bin \
    qtconnectivity5-dev \
    pulseaudio \
    librtaudio-dev \
    libtaglib0-dev \
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
    libegl1-mesa-dev

# Step 2: Create build directory
echo "[2/5] Setting up build directory..."
OPENAUTO_DIR="/opt/openauto"
mkdir -p $OPENAUTO_DIR
cd $OPENAUTO_DIR

# Step 3: Clone and build aasdk (Android Auto SDK)
echo "[3/5] Building aasdk (Android Auto SDK)..."
if [ ! -d "aasdk" ]; then
    git clone --depth 1 https://github.com/opencardev/aasdk.git
fi
cd aasdk
mkdir -p build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
sudo make install
cd $OPENAUTO_DIR

# Step 4: Clone and build OpenAuto
echo "[4/5] Building OpenAuto..."
if [ ! -d "openauto" ]; then
    git clone --depth 1 https://github.com/opencardev/openauto.git
fi
cd openauto
mkdir -p build && cd build
cmake -DCMAKE_BUILD_TYPE=Release \
      -DRPI3_BUILD=FALSE \
      -DGST_BUILD=TRUE ..
make -j$(nproc)

# Step 5: Create launcher script
echo "[5/5] Creating launcher script..."
cat > /usr/local/bin/openauto-launcher << 'EOF'
#!/bin/bash
# OpenAuto Launcher for FRANK Dashboard

OPENAUTO_DIR="/opt/openauto/openauto/build/bin"
OPENAUTO_BIN="$OPENAUTO_DIR/autoapp"

# Kill any existing instance
pkill -f autoapp 2>/dev/null || true
sleep 0.5

# Set display
export DISPLAY=:0

# Launch OpenAuto
cd $OPENAUTO_DIR
exec ./autoapp "$@"
EOF

chmod +x /usr/local/bin/openauto-launcher

# Create OpenAuto config directory
mkdir -p /home/mashumxro/.config/openauto
cat > /home/mashumxro/.config/openauto/openauto.ini << 'EOF'
[General]
ShowClock=false
ShowMenu=true

[Video]
FPS=30
Resolution=800x480
MarginWidth=0
MarginHeight=0

[Audio]
MusicAudioChannelEnabled=true
SpeechAudioChannelEnabled=true
SystemAudioChannelEnabled=true

[Bluetooth]
AdapterType=None

[Input]
TouchscreenEnabled=true
ButtonEventsEnabled=true
EOF

chown -R mashumxro:mashumxro /home/mashumxro/.config/openauto

echo ""
echo "=========================================="
echo "  OpenAuto Installation Complete!"
echo "=========================================="
echo ""
echo "To test manually, run:"
echo "  openauto-launcher"
echo ""
echo "Connect your Android phone via USB and enable"
echo "Android Auto in Developer Options."
echo ""
