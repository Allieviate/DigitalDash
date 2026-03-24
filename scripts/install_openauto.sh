#!/bin/bash
# ============================================
# OpenAuto Installation Script for Raspberry Pi 5
# For FRANK Dashboard - Android Auto Support
# Version 12.0 - Complete Working Build
# ============================================
#
# Tested and working on Raspberry Pi 5 with:
# - OpenSSL 3.x compatibility patches
# - RtAudio 6.x compatibility patches
# - GStreamer video (no OMX/VideoCore)
# - C++17 support
# - Manual h264bitstream compilation
#
# Usage:
#   sudo bash install_openauto.sh          # Normal install (skips already-built steps)
#   sudo bash install_openauto.sh --force  # Clean rebuild everything
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=========================================="
echo "  OpenAuto Installer for FRANK Dashboard"
echo "  Version 12.0 - Pi 5 Complete Build"
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root: sudo bash install_openauto.sh${NC}"
    exit 1
fi

# Parse arguments
FORCE_REBUILD=false
if [ "${1:-}" = "--force" ] || [ "${1:-}" = "-f" ]; then
    FORCE_REBUILD=true
    echo -e "${YELLOW}Force rebuild mode: will clean and rebuild everything${NC}"
    echo ""
fi

SECONDS=0
OPENAUTO_DIR="/opt/openauto"

# ============================================
# Helper: Git clone with retry
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
            if git clone --depth 1 -b "$branch" "$url" "$dir" 2>&1; then
                return 0
            fi
        else
            if git clone --depth 1 "$url" "$dir" 2>&1; then
                return 0
            fi
        fi
        rm -rf "$dir" 2>/dev/null || true
        sleep 5
        attempt=$((attempt + 1))
    done
    echo -e "${RED}Failed to clone $url after $max_attempts attempts${NC}"
    return 1
}

# ============================================
# Helper: Print step header
# ============================================
step_header() {
    echo ""
    echo -e "${CYAN}[$1] $2${NC}"
    echo "-------------------------------------------"
}

# ============================================
# STEP 0: System Preparation
# ============================================
step_header "0/8" "Preparing system..."

# Disable MongoDB repo if exists (SHA1 key issue on some Pi images)
if ls /etc/apt/sources.list.d/mongodb*.list 1>/dev/null 2>&1; then
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
    echo -e "${YELLOW}Disabled conflicting MongoDB repo files${NC}"
fi

# Clean ALL conflicting protobuf/abseil libraries from /usr/local
# This is critical: stale headers cause runtime_version.h conflicts
echo -e "${YELLOW}Cleaning conflicting protobuf/abseil libraries from /usr/local...${NC}"
rm -rf /usr/local/include/google 2>/dev/null || true
rm -rf /usr/local/include/absl 2>/dev/null || true
rm -rf /usr/local/include/aap_protobuf 2>/dev/null || true
rm -rf /usr/local/include/utf8_range 2>/dev/null || true
rm -rf /usr/local/lib/cmake/protobuf 2>/dev/null || true
rm -rf /usr/local/lib/cmake/absl 2>/dev/null || true
rm -rf /usr/local/lib/cmake/utf8_range 2>/dev/null || true
rm -f /usr/local/lib/libprotobuf* 2>/dev/null || true
rm -f /usr/local/lib/libabsl* 2>/dev/null || true
rm -f /usr/local/lib/libutf8* 2>/dev/null || true
rm -f /usr/local/bin/protoc 2>/dev/null || true
ldconfig

# Force rebuild: clean everything
if [ "$FORCE_REBUILD" = true ]; then
    echo -e "${YELLOW}Force mode: removing previous builds...${NC}"
    rm -rf "$OPENAUTO_DIR" 2>/dev/null || true
    rm -f /usr/local/lib/libh264bitstream.a 2>/dev/null || true
    rm -f /usr/local/lib/libaasdk* 2>/dev/null || true
    rm -rf /usr/local/include/aasdk 2>/dev/null || true
    ldconfig
fi

# Increase swap for compilation (Pi 5 4GB can OOM during protobuf build)
echo -e "${YELLOW}Setting up 2GB swap for compilation...${NC}"
if [ -f /etc/dphys-swapfile ]; then
    ORIGINAL_SWAP=$(grep '^CONF_SWAPSIZE=' /etc/dphys-swapfile | cut -d= -f2)
    sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
    dphys-swapfile swapoff 2>/dev/null || true
    dphys-swapfile setup 2>/dev/null || true
    dphys-swapfile swapon 2>/dev/null || true
    echo -e "${GREEN}Swap set to 2048MB (was ${ORIGINAL_SWAP:-100}MB)${NC}"
else
    # Manual swap if dphys-swapfile not available
    if [ ! -f /opt/openauto_swap ]; then
        fallocate -l 2G /opt/openauto_swap
        chmod 600 /opt/openauto_swap
        mkswap /opt/openauto_swap
    fi
    swapon /opt/openauto_swap 2>/dev/null || true
    echo -e "${GREEN}Manual 2GB swap enabled${NC}"
fi

echo -e "${GREEN}[0/8] System prepared${NC}"

# ============================================
# STEP 1: Install Dependencies
# ============================================
step_header "1/8" "Installing dependencies..."

apt-get update
apt-get install -y \
    cmake \
    build-essential \
    git \
    libboost-all-dev \
    libusb-1.0-0-dev \
    libssl-dev \
    libglib2.0-dev \
    libqt5multimedia5 \
    libqt5multimedia5-plugins \
    libqt5multimediawidgets5 \
    qtmultimedia5-dev \
    qtbase5-dev \
    qtdeclarative5-dev \
    qml-module-qtquick2 \
    qml-module-qtquick-controls2 \
    qml-module-qtmultimedia \
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
    adb \
    wmctrl \
    xdotool

echo -e "${GREEN}[1/8] Dependencies installed${NC}"

# ============================================
# STEP 2: Build h264bitstream from source
# ============================================
# h264bitstream is NOT available via apt on Bookworm/Pi 5.
# We compile it manually from source using gcc.
step_header "2/8" "Building h264bitstream..."

if [ -f /usr/local/lib/libh264bitstream.a ] && [ "$FORCE_REBUILD" = false ]; then
    echo -e "${GREEN}h264bitstream already installed, skipping...${NC}"
else
    mkdir -p "$OPENAUTO_DIR"
    cd "$OPENAUTO_DIR"
    
    rm -rf h264bitstream 2>/dev/null || true
    git_clone_retry "https://github.com/aizvorski/h264bitstream.git" "h264bitstream"
    
    cd h264bitstream
    
    # Manual compilation — no Makefile or CMakeLists exists in this repo
    echo "Compiling h264bitstream objects..."
    gcc -c h264_stream.c -o h264_stream.o
    gcc -c h264_nal.c -o h264_nal.o
    gcc -c h264_sei.c -o h264_sei.o
    ar rcs libh264bitstream.a h264_stream.o h264_nal.o h264_sei.o
    
    cp libh264bitstream.a /usr/local/lib/
    cp *.h /usr/local/include/
    ldconfig
    
    echo -e "${GREEN}h264bitstream compiled and installed${NC}"
fi

echo -e "${GREEN}[2/8] h264bitstream ready${NC}"

# ============================================
# STEP 3: Build aasdk (openDsh fork)
# ============================================
# aasdk is the Android Auto SDK that handles the USB protocol.
# The openDsh fork is maintained and works with recent compilers.
step_header "3/8" "Building aasdk (openDsh)..."

mkdir -p "$OPENAUTO_DIR"
cd "$OPENAUTO_DIR"

if [ -f "/usr/local/lib/libaasdk.so" ] && [ "$FORCE_REBUILD" = false ]; then
    echo -e "${GREEN}aasdk already installed, skipping...${NC}"
else
    rm -rf aasdk 2>/dev/null || true
    git_clone_retry "https://github.com/openDsh/aasdk.git" "aasdk"
    
    cd aasdk
    
    # ── CRITICAL PATCH: OpenSSL 3.x Compatibility ──
    # Pi 5 (Bookworm) ships OpenSSL 3.x which removed/deprecated these functions.
    # Without these patches, aasdk will NOT compile on Pi 5.
    echo -e "${YELLOW}Patching for OpenSSL 3.x compatibility...${NC}"
    
    if [ -f src/Transport/SSLWrapper.cpp ]; then
        # Remove FIPS_mode_set(0) — removed in OpenSSL 3.x
        sed -i 's/FIPS_mode_set(0);/\/\/ FIPS_mode_set(0); \/\/ Removed for OpenSSL 3.x/' src/Transport/SSLWrapper.cpp 2>/dev/null || true
        
        # Remove deprecated init functions
        sed -i 's/ERR_load_BIO_strings();/\/\/ ERR_load_BIO_strings(); \/\/ Deprecated in OpenSSL 3.x/' src/Transport/SSLWrapper.cpp 2>/dev/null || true
        sed -i 's/SSL_load_error_strings();/\/\/ SSL_load_error_strings(); \/\/ Deprecated in OpenSSL 3.x/' src/Transport/SSLWrapper.cpp 2>/dev/null || true
        
        # Replace SSL_library_init() with modern equivalent
        sed -i 's/SSL_library_init();/OPENSSL_init_ssl(0, NULL);/' src/Transport/SSLWrapper.cpp 2>/dev/null || true
        
        echo -e "${GREEN}OpenSSL 3.x patches applied${NC}"
    else
        echo -e "${YELLOW}Warning: SSLWrapper.cpp not found at expected path${NC}"
    fi
    
    rm -rf build 2>/dev/null || true
    mkdir -p build && cd build
    
    # Build with C++17 (required for protobuf FetchContent on modern compilers)
    cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_CXX_STANDARD=17
    
    # Use -j2 NOT -j4 to prevent OOM on Pi 5 4GB
    make -j2
    make install
    ldconfig
    
    # ── Copy protobuf headers from FetchContent build ──
    # aasdk uses CMake FetchContent to download and compile protobuf.
    # The generated headers need to be available for openauto to find.
    echo -e "${YELLOW}Copying protobuf headers for openauto...${NC}"
    
    PROTO_SRC_DIRS=(
        "/opt/openauto/aasdk/build/_deps/protobuf-src/src/google"
        "/opt/openauto/aasdk/build/_deps/protobuf-src/third_party/utf8_range"
    )
    
    for proto_dir in "${PROTO_SRC_DIRS[@]}"; do
        if [ -d "$proto_dir" ]; then
            cp -r "$proto_dir" /usr/local/include/ 2>/dev/null || true
            echo -e "${GREEN}Copied: $proto_dir${NC}"
        fi
    done
    
    # Also copy the generated protobuf libraries if they exist
    if [ -d "/opt/openauto/aasdk/build/_deps/protobuf-build" ]; then
        find /opt/openauto/aasdk/build/_deps/protobuf-build -name "*.a" -exec cp {} /usr/local/lib/ \; 2>/dev/null || true
    fi
    
    ldconfig
fi

echo -e "${GREEN}[3/8] aasdk ready${NC}"

# ============================================
# STEP 4: Build OpenAuto (openDsh fork)
# ============================================
# OpenAuto is the actual Android Auto head unit application.
# The openDsh fork supports GStreamer video (required for Pi 5 which has no OMX).
step_header "4/8" "Building OpenAuto (openDsh)..."

cd "$OPENAUTO_DIR"

if [ -f "$OPENAUTO_DIR/openauto/build/bin/autoapp" ] && [ "$FORCE_REBUILD" = false ]; then
    echo -e "${GREEN}OpenAuto already built, skipping...${NC}"
else
    rm -rf openauto 2>/dev/null || true
    git_clone_retry "https://github.com/openDsh/openauto.git" "openauto" "develop"
    
    cd openauto
    
    # ── CRITICAL PATCH: RtAudio 6.x Compatibility ──
    # Pi 5 (Bookworm) ships RtAudio 6.x which renamed RtAudioError to std::exception.
    # Without this patch, openauto will NOT compile on Pi 5.
    echo -e "${YELLOW}Patching for RtAudio 6.x compatibility...${NC}"
    
    if [ -f openauto/Projection/RtAudioOutput.cpp ]; then
        sed -i 's/RtAudioError/std::exception/g' openauto/Projection/RtAudioOutput.cpp
        echo -e "${GREEN}RtAudio 6.x patch applied${NC}"
    else
        echo -e "${YELLOW}Warning: RtAudioOutput.cpp not found at expected path${NC}"
    fi
    
    # ── CRITICAL PATCH: Disable OMX/VideoCore for Pi 5 ──
    # Pi 5 does NOT have VideoCore/OMX hardware acceleration.
    # These sed commands comment out the OMX-specific definitions in CMakeLists.txt
    # so the build uses GStreamer instead.
    echo -e "${YELLOW}Disabling OMX/VideoCore for Pi 5 (using GStreamer instead)...${NC}"
    
    if [ -f CMakeLists.txt ]; then
        sed -i 's/^[[:space:]]*add_definitions(-DUSE_OMX/# add_definitions(-DUSE_OMX/' CMakeLists.txt 2>/dev/null || true
        sed -i 's/^[[:space:]]*set(BCM_HOST_LIBRARIES/# set(BCM_HOST_LIBRARIES/' CMakeLists.txt 2>/dev/null || true
        sed -i 's/^[[:space:]]*set(BCM_HOST_INCLUDE_DIRS/# set(BCM_HOST_INCLUDE_DIRS/' CMakeLists.txt 2>/dev/null || true
        sed -i 's/^[[:space:]]*set(ILCLIENT_INCLUDE_DIRS/# set(ILCLIENT_INCLUDE_DIRS/' CMakeLists.txt 2>/dev/null || true
        sed -i 's/^[[:space:]]*set(ILCLIENT_LIBRARIES/# set(ILCLIENT_LIBRARIES/' CMakeLists.txt 2>/dev/null || true
        echo -e "${GREEN}OMX/VideoCore disabled in CMakeLists.txt${NC}"
    fi
    
    rm -rf build 2>/dev/null || true
    mkdir -p build && cd build
    
    # Build flags for Pi 5:
    # -DNOPI=ON              : Disable Pi-specific OMX/VideoCore hardware acceleration
    # -DCMAKE_CXX_STANDARD=17 : Required for modern protobuf compatibility
    #
    # NOTE: Do NOT use -DGST_BUILD=TRUE — it requires QGlib (qt-gstreamer)
    # which was removed from Debian Bookworm. Qt Multimedia uses GStreamer
    # automatically under the hood via its GStreamer backend plugin, so
    # video decoding still works through GStreamer without the QGlib wrapper.
    cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DNOPI=ON \
        -DCMAKE_CXX_STANDARD=17
    
    # Use -j2 NOT -j4 to prevent OOM on Pi 5 4GB
    make -j2
fi

echo -e "${GREEN}[4/8] OpenAuto ready${NC}"

# ============================================
# STEP 5: Create Launcher Script
# ============================================
step_header "5/8" "Creating launcher..."

cat > /usr/local/bin/openauto-launcher << 'EOF'
#!/bin/bash
# FRANK Dashboard - OpenAuto Launcher
# Sets up the environment and launches autoapp

export DISPLAY=:0
export QT_QPA_PLATFORM=xcb
export LD_LIBRARY_PATH=/opt/openauto/openauto/build/lib:/opt/openauto/openauto/lib:/usr/local/lib:$LD_LIBRARY_PATH
export PULSE_SERVER=unix:/run/user/$(id -u)/pulse/native

# Kill any existing instance
pkill autoapp 2>/dev/null || true
sleep 0.5

# Try build directory first (standard cmake output), then flat bin
if [ -x /opt/openauto/openauto/build/bin/autoapp ]; then
    cd /opt/openauto/openauto/build/bin
    exec ./autoapp "$@"
elif [ -x /opt/openauto/openauto/bin/autoapp ]; then
    cd /opt/openauto/openauto/bin
    exec ./autoapp "$@"
else
    echo "ERROR: autoapp binary not found at expected paths:"
    echo "  /opt/openauto/openauto/build/bin/autoapp"
    echo "  /opt/openauto/openauto/bin/autoapp"
    echo "Run: sudo bash install_openauto.sh --force"
    exit 1
fi
EOF

chmod +x /usr/local/bin/openauto-launcher

# Create convenience symlinks
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/android-auto
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/openauto

echo -e "${GREEN}[5/8] Launcher created (android-auto, openauto, openauto-launcher)${NC}"

# ============================================
# STEP 6: Setup USB Auto-Detect + Permissions
# ============================================
step_header "6/8" "Setting up USB auto-detect and permissions..."

# Detect the project directory (where FRANK dashboard is installed)
FRANK_PROJECT_DIR=""
if [ -d "/home/${SUDO_USER:-pi}/DigitalDash/scripts" ]; then
    FRANK_PROJECT_DIR="/home/${SUDO_USER:-pi}/DigitalDash"
elif [ -d "/opt/frank/scripts" ]; then
    FRANK_PROJECT_DIR="/opt/frank"
fi

# Install the USB phone monitor script
MONITOR_SCRIPT="/usr/local/bin/frank-usb-monitor"
cat > "$MONITOR_SCRIPT" << 'MONITOR_EOF'
#!/bin/bash
# FRANK Dashboard - USB Phone Auto-Detect Monitor
# Triggered by udev when Android phone connects/disconnects

ACTION="${1:-connected}"
VENDOR_ID="${ID_VENDOR_ID:-}"
PRODUCT_ID="${ID_MODEL_ID:-}"
API_URL="http://localhost:8001/api"
LOG="/tmp/frank-usb-monitor.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [USB] $*" >> "$LOG"; }
log "Event: action=$ACTION vendor=$VENDOR_ID product=$PRODUCT_ID"

if [ "$ACTION" = "connected" ]; then
    sleep 2
    SERIAL="" DEVICE_NAME="Android Device"
    if command -v adb >/dev/null 2>&1; then
        adb kill-server 2>/dev/null; sleep 1; adb start-server 2>/dev/null; sleep 2
        SERIAL=$(adb devices -l 2>/dev/null | grep -v "^List" | grep "device " | head -1 | awk '{print $1}')
        if [ -n "$SERIAL" ]; then
            DEVICE_NAME=$(adb -s "$SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r\n')
            [ -z "$DEVICE_NAME" ] && DEVICE_NAME="Android Device"
            log "Detected: serial=$SERIAL name=$DEVICE_NAME"
        else
            log "No ADB device found"; exit 0
        fi
    else
        log "ADB not installed"; exit 0
    fi
    curl -s -X POST "$API_URL/dhu/device-event" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"connected\",\"serial\":\"$SERIAL\",\"name\":\"$DEVICE_NAME\",\"vendor_id\":\"$VENDOR_ID\",\"product_id\":\"$PRODUCT_ID\"}" >> "$LOG" 2>&1
elif [ "$ACTION" = "disconnected" ]; then
    curl -s -X POST "$API_URL/dhu/device-event" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"disconnected\",\"serial\":\"\",\"name\":\"\"}" >> "$LOG" 2>&1
fi
MONITOR_EOF

chmod +x "$MONITOR_SCRIPT"

# Create udev rules with both permissions AND auto-detect triggers
cat > /etc/udev/rules.d/51-android.rules << 'EOF'
# FRANK Dashboard - Android Auto USB rules
# Permissions + auto-detect for phone connection/disconnection

# Google (Pixel)
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="18d1", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# Samsung
SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="04e8", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# OnePlus
SUBSYSTEM=="usb", ATTR{idVendor}=="2a70", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="2a70", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="2a70", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# Xiaomi
SUBSYSTEM=="usb", ATTR{idVendor}=="2717", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="2717", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="2717", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# Huawei
SUBSYSTEM=="usb", ATTR{idVendor}=="12d1", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="12d1", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="12d1", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# Motorola
SUBSYSTEM=="usb", ATTR{idVendor}=="22b8", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="22b8", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="22b8", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# Sony
SUBSYSTEM=="usb", ATTR{idVendor}=="0fce", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="0fce", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="0fce", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# HTC
SUBSYSTEM=="usb", ATTR{idVendor}=="0bb4", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="0bb4", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="0bb4", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# LG
SUBSYSTEM=="usb", ATTR{idVendor}=="1004", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="1004", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="1004", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# OPPO / Realme
SUBSYSTEM=="usb", ATTR{idVendor}=="22d9", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="22d9", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="22d9", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# Nokia
SUBSYSTEM=="usb", ATTR{idVendor}=="0421", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="0421", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="0421", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# Nothing Phone
SUBSYSTEM=="usb", ATTR{idVendor}=="2970", MODE="0666", GROUP="plugdev"
ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="2970", RUN+="/usr/local/bin/frank-usb-monitor connected"
ACTION=="remove", SUBSYSTEM=="usb", ENV{ID_VENDOR_ID}=="2970", RUN+="/usr/local/bin/frank-usb-monitor disconnected"

# Catch-all fallback
SUBSYSTEM=="usb", MODE="0666", GROUP="plugdev"
EOF

udevadm control --reload-rules
udevadm trigger

# Add the actual user (not root) to plugdev group for USB access
REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || echo pi)}"
usermod -aG plugdev "$REAL_USER" 2>/dev/null || true

echo -e "${GREEN}[6/8] USB auto-detect + permissions configured for user: $REAL_USER${NC}"

# ============================================
# STEP 7: Restore Swap to Normal
# ============================================
step_header "7/8" "Restoring swap to normal size..."

if [ -f /etc/dphys-swapfile ]; then
    # Restore to a reasonable 512MB (instead of the 2GB build swap)
    sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=512/' /etc/dphys-swapfile
    dphys-swapfile swapoff 2>/dev/null || true
    dphys-swapfile setup 2>/dev/null || true
    dphys-swapfile swapon 2>/dev/null || true
    echo -e "${GREEN}Swap restored to 512MB${NC}"
fi

# Clean up manual swap if used
if [ -f /opt/openauto_swap ]; then
    swapoff /opt/openauto_swap 2>/dev/null || true
    rm -f /opt/openauto_swap
    echo -e "${GREEN}Temporary build swap removed${NC}"
fi

echo -e "${GREEN}[7/8] Swap restored${NC}"

# ============================================
# STEP 8: Verify Installation
# ============================================
step_header "8/8" "Verifying installation..."

AUTOAPP_BIN=""
if [ -f "$OPENAUTO_DIR/openauto/build/bin/autoapp" ]; then
    AUTOAPP_BIN="$OPENAUTO_DIR/openauto/build/bin/autoapp"
elif [ -f "$OPENAUTO_DIR/openauto/bin/autoapp" ]; then
    AUTOAPP_BIN="$OPENAUTO_DIR/openauto/bin/autoapp"
fi

echo ""
echo "──── Installation Verification ────"
echo ""

# Check all components
PASS=true

check_component() {
    local name="$1"
    local path="$2"
    if [ -f "$path" ] || [ -x "$path" ]; then
        echo -e "  ${GREEN}[PASS]${NC} $name: $path"
    else
        echo -e "  ${RED}[FAIL]${NC} $name: $path"
        PASS=false
    fi
}

check_component "h264bitstream"    "/usr/local/lib/libh264bitstream.a"
check_component "aasdk library"    "/usr/local/lib/libaasdk.so"
check_component "autoapp binary"   "${AUTOAPP_BIN:-NOT_FOUND}"
check_component "launcher"         "/usr/local/bin/openauto-launcher"
check_component "udev rules"       "/etc/udev/rules.d/51-android.rules"

echo ""

if [ -n "$AUTOAPP_BIN" ] && [ "$PASS" = true ]; then
    echo "=========================================="
    echo -e "${GREEN}  OpenAuto Installation Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "  Binary:   $AUTOAPP_BIN"
    echo "  Launcher: /usr/local/bin/openauto-launcher"
    echo "  Symlinks: android-auto, openauto"
    echo ""
    echo "  Build time: $(($SECONDS / 60)) minutes $(($SECONDS % 60)) seconds"
    echo ""
    echo -e "${YELLOW}  Usage:${NC}"
    echo "    1. Connect phone via USB"
    echo "    2. Enable USB debugging on phone"
    echo "    3. Run: android-auto"
    echo "    4. Accept USB debugging prompt on phone"
    echo ""
    echo -e "${YELLOW}  Troubleshooting:${NC}"
    echo "    - Rebuild:  sudo bash install_openauto.sh --force"
    echo "    - Check ADB: adb devices"
    echo "    - Test launch: openauto-launcher"
    echo ""
else
    echo -e "${RED}Installation FAILED${NC}"
    echo ""
    echo "Checked paths:"
    echo "  - $OPENAUTO_DIR/openauto/build/bin/autoapp"
    echo "  - $OPENAUTO_DIR/openauto/bin/autoapp"
    echo ""
    echo "Try running with --force flag:"
    echo "  sudo bash install_openauto.sh --force"
    echo ""
    exit 1
fi
