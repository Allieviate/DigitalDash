#!/bin/bash
# ============================================
# OpenAuto Installation Script for Raspberry Pi 5
# For FRANK Dashboard - Android Auto Support
# Version 8.0 - Based on Original Working Build
# ============================================
#
# This is the ORIGINAL working approach that:
# - Uses system protobuf (apt install libprotobuf-dev)
# - Uses opencardev repos with -DRPI3_BUILD=FALSE
# - No FetchContent, no complex protobuf builds
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  OpenAuto Installer for FRANK Dashboard"
echo "  Version 8.0 - Original Working Method"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root: sudo bash install_openauto.sh${NC}"
    exit 1
fi

SECONDS=0
ACTUAL_USER=${SUDO_USER:-$USER}
USER_HOME=$(eval echo ~$ACTUAL_USER)

# ============================================
# STEP 0: Disable problematic repos & cleanup
# ============================================
echo "[0/6] Preparing system..."

# Disable MongoDB repo if it exists (SHA1 key expired)
if ls /etc/apt/sources.list.d/mongodb*.list 1>/dev/null 2>&1; then
    echo -e "${YELLOW}Disabling MongoDB repo (SHA1 key issue)...${NC}"
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
fi

# Clean up old failed builds but preserve working ones
if [ -d "/opt/openauto" ]; then
    echo -e "${YELLOW}Found existing /opt/openauto - checking if it works...${NC}"
    if [ -f "/opt/openauto/openauto/build/bin/autoapp" ]; then
        echo -e "${GREEN}Existing autoapp binary found! Testing...${NC}"
        # Test if it runs (just check if it can start)
        if timeout 2 /opt/openauto/openauto/build/bin/autoapp --help 2>/dev/null; then
            echo -e "${GREEN}Existing OpenAuto seems functional!${NC}"
            echo -e "${YELLOW}Do you want to rebuild anyway? (y/N)${NC}"
            read -t 10 -n 1 rebuild_choice || rebuild_choice="n"
            echo ""
            if [[ ! "$rebuild_choice" =~ ^[Yy]$ ]]; then
                echo "Keeping existing installation."
                # Skip to launcher creation
                SKIP_BUILD=true
            fi
        fi
    fi
    
    if [ "$SKIP_BUILD" != "true" ]; then
        echo -e "${YELLOW}Removing old /opt/openauto...${NC}"
        rm -rf /opt/openauto
    fi
fi

echo -e "${GREEN}[0/6] System prepared${NC}"

# ============================================
# STEP 1: Install dependencies
# ============================================
if [ "$SKIP_BUILD" != "true" ]; then
    echo "[1/6] Installing dependencies..."
    apt-get update

    apt-get install -y \
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
        qtbase5-dev \
        libqt5bluetooth5 \
        libqt5bluetooth5-bin \
        qtconnectivity5-dev \
        pulseaudio \
        libpulse-dev \
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
        wmctrl \
        xdotool

    echo -e "${GREEN}[1/6] Dependencies installed${NC}"

    # ============================================
    # STEP 2: Create build directory
    # ============================================
    echo "[2/6] Setting up build directory..."
    OPENAUTO_DIR="/opt/openauto"
    mkdir -p $OPENAUTO_DIR
    cd $OPENAUTO_DIR

    echo -e "${GREEN}[2/6] Build directory ready${NC}"

    # ============================================
    # STEP 3: Clone and build aasdk
    # ============================================
    echo "[3/6] Building aasdk (Android Auto SDK)..."
    echo -e "${YELLOW}This may take 10-20 minutes on Pi 5...${NC}"

    if [ ! -d "aasdk" ]; then
        # Try opencardev first (original), then openDsh as fallback
        if ! git clone --depth 1 https://github.com/opencardev/aasdk.git 2>/dev/null; then
            echo -e "${YELLOW}opencardev/aasdk failed, trying openDsh fork...${NC}"
            git clone --depth 1 https://github.com/openDsh/aasdk.git
        fi
    fi

    cd aasdk
    mkdir -p build && cd build
    cmake -DCMAKE_BUILD_TYPE=Release ..
    make -j$(nproc)
    make install
    ldconfig

    cd $OPENAUTO_DIR
    echo -e "${GREEN}[3/6] aasdk built and installed${NC}"

    # ============================================
    # STEP 4: Clone and build OpenAuto
    # ============================================
    echo "[4/6] Building OpenAuto..."
    echo -e "${YELLOW}This may take 10-20 minutes on Pi 5...${NC}"

    if [ ! -d "openauto" ]; then
        # Try opencardev first, then openDsh as fallback
        if ! git clone --depth 1 https://github.com/opencardev/openauto.git 2>/dev/null; then
            echo -e "${YELLOW}opencardev/openauto failed, trying openDsh fork...${NC}"
            git clone --depth 1 -b develop https://github.com/openDsh/openauto.git
        fi
    fi

    cd openauto
    mkdir -p build && cd build

    # Build for Pi 5 (no RPI3 OMX, use GStreamer)
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DRPI3_BUILD=FALSE \
          -DGST_BUILD=TRUE ..

    make -j$(nproc)

    echo -e "${GREEN}[4/6] OpenAuto built${NC}"
else
    echo "[1/6] Skipping dependencies (using existing build)"
    echo "[2/6] Skipping directory setup (using existing build)"
    echo "[3/6] Skipping aasdk build (using existing build)"
    echo "[4/6] Skipping OpenAuto build (using existing build)"
fi

# ============================================
# STEP 5: Create launcher script
# ============================================
echo "[5/6] Creating launcher script..."

cat > /usr/local/bin/openauto-launcher << 'EOF'
#!/bin/bash
# OpenAuto Launcher for FRANK Dashboard

OPENAUTO_DIR="/opt/openauto/openauto/build/bin"
OPENAUTO_BIN="$OPENAUTO_DIR/autoapp"

# Check if binary exists
if [ ! -f "$OPENAUTO_BIN" ]; then
    echo "Error: OpenAuto not found at $OPENAUTO_BIN"
    echo "Please run: sudo bash ~/projects/DigitalDash/scripts/install_openauto.sh"
    exit 1
fi

# Kill any existing instance
pkill -f autoapp 2>/dev/null || true
sleep 0.5

# Set display
export DISPLAY=:0
export QT_QPA_PLATFORM=xcb

# PulseAudio setup
export PULSE_SERVER=unix:/run/user/$(id -u)/pulse/native

# Launch OpenAuto
cd $OPENAUTO_DIR
exec ./autoapp "$@"
EOF

chmod +x /usr/local/bin/openauto-launcher

# Also create a simpler alias
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/android-auto 2>/dev/null || true
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/openauto 2>/dev/null || true

echo -e "${GREEN}[5/6] Launcher created${NC}"

# ============================================
# STEP 6: Create config and service
# ============================================
echo "[6/6] Creating configuration..."

# Create OpenAuto config directory
mkdir -p $USER_HOME/.config/openauto
cat > $USER_HOME/.config/openauto/openauto.ini << 'EOF'
[General]
ShowClock=false
ShowMenu=true

[Video]
FPS=60
Resolution=1280x720
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

chown -R $ACTUAL_USER:$ACTUAL_USER $USER_HOME/.config/openauto

# Create systemd service
cat > /etc/systemd/system/openauto.service << EOF
[Unit]
Description=OpenAuto - Android Auto
After=network.target graphical.target

[Service]
Type=simple
User=$ACTUAL_USER
Environment=DISPLAY=:0
Environment=QT_QPA_PLATFORM=xcb
ExecStart=/usr/local/bin/openauto-launcher
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

systemctl daemon-reload

echo -e "${GREEN}[6/6] Configuration complete${NC}"

# ============================================
# Verify installation
# ============================================
echo ""
echo "=========================================="
if [ -f "/opt/openauto/openauto/build/bin/autoapp" ]; then
    echo -e "${GREEN}  OpenAuto Installation Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "Binary location:"
    echo "  /opt/openauto/openauto/build/bin/autoapp"
    echo ""
    echo "To launch Android Auto:"
    echo "  openauto-launcher"
    echo "  # or simply:"
    echo "  android-auto"
    echo ""
    echo "To run as a service:"
    echo "  sudo systemctl enable openauto"
    echo "  sudo systemctl start openauto"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  1. Connect your Android phone via USB"
    echo "  2. Enable USB debugging on phone"
    echo "  3. Open Android Auto app on phone"
    echo "  4. Run: android-auto"
    echo ""
    echo "Build time: approximately $(($SECONDS / 60)) minutes"
else
    echo -e "${RED}  OpenAuto Installation FAILED${NC}"
    echo "=========================================="
    echo ""
    echo "The autoapp binary was not created."
    echo "Check the build errors above."
    echo ""
    echo "Common fixes:"
    echo "  1. Make sure you have enough disk space"
    echo "  2. Try running the script again"
    echo "  3. Check: journalctl -xe for system errors"
    exit 1
fi
echo ""
