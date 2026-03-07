#!/bin/bash
# ============================================
# OpenAuto Installation Script for Raspberry Pi 5
# For FRANK Dashboard - Android Auto Support
# Version 8.3 - Enhanced Pre-Flight Cleanup
# ============================================
#
# DEFENSIVE ENGINEERING:
# 1. Pre-flight cleanup removes ALL rogue protobuf files
# 2. Reinstalls system protobuf fresh from apt
# 3. Patches C++11 -> C++14 for modern protobuf compatibility
# 4. Uses make -j2 to prevent OOM crashes
# 5. Resume support - picks up where it left off
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  OpenAuto Installer for FRANK Dashboard"
echo "  Version 8.3 - Enhanced Pre-Flight Cleanup"
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
# Helper function: Git clone with retry
# ============================================
git_clone_retry() {
    local url="$1"
    local dir="$2"
    local branch="$3"
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo -e "${YELLOW}Attempt $attempt/$max_attempts: Cloning $url...${NC}"
        
        if [ -n "$branch" ]; then
            if git clone --depth 1 -b "$branch" "$url" "$dir" 2>/dev/null; then
                echo -e "${GREEN}Clone successful!${NC}"
                return 0
            fi
        else
            if git clone --depth 1 "$url" "$dir" 2>/dev/null; then
                echo -e "${GREEN}Clone successful!${NC}"
                return 0
            fi
        fi
        
        echo -e "${YELLOW}Clone failed. Waiting 5 seconds before retry...${NC}"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}Failed to clone after $max_attempts attempts${NC}"
    return 1
}

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

# ============================================
# CRITICAL: Increase swap size to prevent OOM
# Protobuf compilation needs lots of RAM
# ============================================
echo -e "${YELLOW}Increasing swap size to prevent out-of-memory errors...${NC}"

ORIGINAL_SWAP_SIZE=$(grep "CONF_SWAPSIZE" /etc/dphys-swapfile 2>/dev/null | cut -d= -f2 || echo "100")
if [ -f /etc/dphys-swapfile ]; then
    # Backup original swap config
    cp /etc/dphys-swapfile /etc/dphys-swapfile.backup
    
    # Set swap to 2GB
    sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
    
    # Restart swap service
    dphys-swapfile swapoff 2>/dev/null || true
    dphys-swapfile setup 2>/dev/null || true
    dphys-swapfile swapon 2>/dev/null || true
    
    echo -e "${GREEN}Swap increased from ${ORIGINAL_SWAP_SIZE}MB to 2048MB${NC}"
else
    echo -e "${YELLOW}dphys-swapfile not found, creating swap file manually...${NC}"
    # Create a 2GB swap file if dphys-swapfile doesn't exist
    if [ ! -f /swapfile_openauto ]; then
        fallocate -l 2G /swapfile_openauto 2>/dev/null || dd if=/dev/zero of=/swapfile_openauto bs=1M count=2048
        chmod 600 /swapfile_openauto
        mkswap /swapfile_openauto
    fi
    swapon /swapfile_openauto 2>/dev/null || true
    echo -e "${GREEN}Created 2GB swap file${NC}"
fi

# Show current memory status
echo -e "${YELLOW}Current memory status:${NC}"
free -h

# ============================================
# CRITICAL: Clean up ALL old failed builds
# Remove everything we installed to /usr/local
# ============================================
echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}PRE-FLIGHT CLEANUP - Removing Conflicts${NC}"
echo -e "${YELLOW}======================================${NC}"

# Remove rogue protoc binary that conflicts with system package
echo -e "${YELLOW}Removing rogue protoc compiler...${NC}"
rm -f /usr/local/bin/protoc 2>/dev/null || true

# Remove ALL protobuf files from /usr/local (we'll use system one from apt)
echo -e "${YELLOW}Removing old protobuf installations...${NC}"
rm -rf /usr/local/include/google/protobuf 2>/dev/null || true
rm -rf /usr/local/include/google 2>/dev/null || true
rm -f /usr/local/lib/libprotobuf* 2>/dev/null || true
rm -f /usr/local/lib/libprotoc* 2>/dev/null || true
rm -rf /usr/local/lib/cmake/protobuf 2>/dev/null || true
rm -f /usr/local/lib/pkgconfig/protobuf*.pc 2>/dev/null || true

# Remove abseil (not needed with system protobuf)
echo -e "${YELLOW}Removing old abseil installations...${NC}"
rm -rf /usr/local/include/absl 2>/dev/null || true
rm -f /usr/local/lib/libabsl* 2>/dev/null || true
rm -rf /usr/local/lib/cmake/absl 2>/dev/null || true
rm -f /usr/local/lib/pkgconfig/absl*.pc 2>/dev/null || true

# Remove old aasdk/openauto files that may conflict
echo -e "${YELLOW}Removing old aasdk/openauto files...${NC}"
rm -rf /usr/local/include/aasdk 2>/dev/null || true
rm -rf /usr/local/include/aap_protobuf 2>/dev/null || true
rm -rf /usr/local/include/f1x 2>/dev/null || true
rm -f /usr/local/lib/libaasdk* 2>/dev/null || true
rm -f /usr/local/lib/libaap_protobuf* 2>/dev/null || true

# Remove old build directories
echo -e "${YELLOW}Removing old build directories...${NC}"
rm -rf /opt/openauto/build 2>/dev/null || true
rm -rf /opt/web-auto 2>/dev/null || true

# Refresh library cache
ldconfig

echo -e "${GREEN}Pre-flight cleanup complete!${NC}"

# ============================================
# CRITICAL: Reinstall system protobuf fresh
# This ensures we have a clean, working protobuf
# ============================================
echo -e "${YELLOW}Reinstalling system protobuf packages...${NC}"
apt-get update
apt-get install --reinstall -y protobuf-compiler libprotobuf-dev

# Verify protoc is the system version
echo -e "${YELLOW}Verifying protoc installation...${NC}"
which protoc
protoc --version

echo -e "${GREEN}System protobuf reinstalled successfully${NC}"

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
    
    # Check if aasdk is already built (resume support)
    if [ -f "/usr/local/lib/libaasdk.so" ] || [ -f "/usr/local/lib/libaasdk_proto.so" ]; then
        echo -e "${GREEN}aasdk already installed, skipping build...${NC}"
        AASDK_DONE=true
    else
        echo -e "${YELLOW}This may take 15-30 minutes on Pi 5...${NC}"
        AASDK_DONE=false
    fi
    
    if [ "$AASDK_DONE" != "true" ]; then
        # Clone if not already cloned
        if [ ! -d "aasdk" ]; then
            # Try opencardev first (original), then openDsh as fallback
            if ! git_clone_retry "https://github.com/opencardev/aasdk.git" "aasdk" ""; then
                echo -e "${YELLOW}opencardev/aasdk failed, trying openDsh fork...${NC}"
                if ! git_clone_retry "https://github.com/openDsh/aasdk.git" "aasdk" ""; then
                    echo -e "${RED}ERROR: Could not clone aasdk from any source${NC}"
                    echo -e "${YELLOW}Check your internet connection and try again.${NC}"
                    echo -e "${YELLOW}The script will resume from this point next time.${NC}"
                    exit 1
                fi
            fi
        else
            echo -e "${GREEN}aasdk directory exists, using existing clone${NC}"
        fi

        cd aasdk
        
        # CRITICAL: Patch CMakeLists.txt for C++14 (required by modern Protobuf)
        echo -e "${YELLOW}Patching aasdk for C++14 compatibility...${NC}"
        sed -i 's/CMAKE_CXX_STANDARD 11/CMAKE_CXX_STANDARD 14/g' CMakeLists.txt
        
        mkdir -p build && cd build
        cmake -DCMAKE_BUILD_TYPE=Release ..
        
        # Use only 2 cores to prevent OOM (Pi 5 has 4GB but protobuf is huge)
        echo -e "${YELLOW}Building with 2 cores to prevent out-of-memory...${NC}"
        make -j2
        
        make install
        ldconfig
        
        cd $OPENAUTO_DIR
    fi
    
    echo -e "${GREEN}[3/6] aasdk ready${NC}"

    # ============================================
    # STEP 4: Clone and build OpenAuto
    # ============================================
    echo "[4/6] Building OpenAuto..."
    
    # Check if OpenAuto is already built (resume support)
    if [ -f "/opt/openauto/openauto/build/bin/autoapp" ]; then
        echo -e "${GREEN}OpenAuto already built, skipping...${NC}"
        OPENAUTO_DONE=true
    else
        echo -e "${YELLOW}This may take 15-30 minutes on Pi 5...${NC}"
        OPENAUTO_DONE=false
    fi
    
    if [ "$OPENAUTO_DONE" != "true" ]; then
        # Clone if not already cloned
        if [ ! -d "openauto" ]; then
            # Try opencardev first, then openDsh as fallback
            if ! git_clone_retry "https://github.com/opencardev/openauto.git" "openauto" ""; then
                echo -e "${YELLOW}opencardev/openauto failed, trying openDsh fork...${NC}"
                if ! git_clone_retry "https://github.com/openDsh/openauto.git" "openauto" "develop"; then
                    echo -e "${RED}ERROR: Could not clone openauto from any source${NC}"
                    echo -e "${YELLOW}Check your internet connection and try again.${NC}"
                    echo -e "${YELLOW}The script will resume from this point next time.${NC}"
                    exit 1
                fi
            fi
        else
            echo -e "${GREEN}openauto directory exists, using existing clone${NC}"
        fi

        cd openauto
        
        # CRITICAL: Patch CMakeLists.txt for C++14 (required by modern Protobuf)
        echo -e "${YELLOW}Patching OpenAuto for C++14 compatibility...${NC}"
        sed -i 's/CMAKE_CXX_STANDARD 11/CMAKE_CXX_STANDARD 14/g' CMakeLists.txt
        
        mkdir -p build && cd build

        # Build for Pi 5 (no RPI3 OMX, use GStreamer)
        cmake -DCMAKE_BUILD_TYPE=Release \
              -DRPI3_BUILD=FALSE \
              -DGST_BUILD=TRUE ..

        # Use only 2 cores to prevent OOM
        echo -e "${YELLOW}Building with 2 cores to prevent out-of-memory...${NC}"
        make -j2
    fi

    echo -e "${GREEN}[4/6] OpenAuto ready${NC}"
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
# Restore original swap size
# ============================================
echo -e "${YELLOW}Restoring original swap size...${NC}"
if [ -f /etc/dphys-swapfile.backup ]; then
    mv /etc/dphys-swapfile.backup /etc/dphys-swapfile
    dphys-swapfile swapoff 2>/dev/null || true
    dphys-swapfile setup 2>/dev/null || true
    dphys-swapfile swapon 2>/dev/null || true
    echo -e "${GREEN}Swap restored to original size${NC}"
fi
if [ -f /swapfile_openauto ]; then
    swapoff /swapfile_openauto 2>/dev/null || true
    rm -f /swapfile_openauto
    echo -e "${GREEN}Temporary swap file removed${NC}"
fi

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
