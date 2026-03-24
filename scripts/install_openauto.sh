#!/bin/bash
# ============================================
# OpenAuto Installation Script for Raspberry Pi 5
# For FRANK Dashboard - Android Auto Support
# Version 11.0 - Complete Working Build
# ============================================
#
# Tested and working on Raspberry Pi 5 with:
# - OpenSSL 3.x compatibility patches
# - RtAudio 6.x compatibility patches
# - GStreamer video (no OMX)
# - C++17 support
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  OpenAuto Installer for FRANK Dashboard"
echo "  Version 11.0 - Pi 5 Complete Build"
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root: sudo bash install_openauto.sh${NC}"
    exit 1
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
        sleep 5
        attempt=$((attempt + 1))
    done
    return 1
}

# ============================================
# STEP 0: System Preparation
# ============================================
echo "[0/7] Preparing system..."

# Disable MongoDB repo if exists (SHA1 key issue)
if ls /etc/apt/sources.list.d/mongodb*.list 1>/dev/null 2>&1; then
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
fi

# Clean ALL conflicting libraries from /usr/local
echo -e "${YELLOW}Cleaning conflicting libraries...${NC}"
rm -rf /usr/local/include/google 2>/dev/null || true
rm -rf /usr/local/include/absl 2>/dev/null || true
rm -rf /usr/local/include/aap_protobuf 2>/dev/null || true
rm -rf /usr/local/lib/cmake/protobuf 2>/dev/null || true
rm -rf /usr/local/lib/cmake/absl 2>/dev/null || true
rm -f /usr/local/lib/libprotobuf* 2>/dev/null || true
rm -f /usr/local/lib/libabsl* 2>/dev/null || true
rm -f /usr/local/bin/protoc 2>/dev/null || true
ldconfig

# Increase swap for compilation
if [ -f /etc/dphys-swapfile ]; then
    sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
    dphys-swapfile swapoff 2>/dev/null || true
    dphys-swapfile setup 2>/dev/null || true
    dphys-swapfile swapon 2>/dev/null || true
fi

echo -e "${GREEN}[0/7] System prepared${NC}"

# ============================================
# STEP 1: Install Dependencies
# ============================================
echo "[1/7] Installing dependencies..."

apt-get update
apt-get install -y \
    cmake \
    build-essential \
    git \
    libboost-all-dev \
    libusb-1.0-0-dev \
    libssl-dev \
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

echo -e "${GREEN}[1/7] Dependencies installed${NC}"

# ============================================
# STEP 2: Build h264bitstream
# ============================================
echo "[2/7] Building h264bitstream..."

if [ -f /usr/local/lib/libh264bitstream.a ]; then
    echo -e "${GREEN}h264bitstream already installed, skipping...${NC}"
else
    mkdir -p $OPENAUTO_DIR
    cd $OPENAUTO_DIR
    
    if [ ! -d "h264bitstream" ]; then
        git_clone_retry "https://github.com/aizvorski/h264bitstream.git" "h264bitstream"
    fi
    
    cd h264bitstream
    gcc -c h264_stream.c -o h264_stream.o
    gcc -c h264_nal.c -o h264_nal.o
    gcc -c h264_sei.c -o h264_sei.o
    ar rcs libh264bitstream.a h264_stream.o h264_nal.o h264_sei.o
    
    cp libh264bitstream.a /usr/local/lib/
    cp *.h /usr/local/include/
    ldconfig
fi

echo -e "${GREEN}[2/7] h264bitstream ready${NC}"

# ============================================
# STEP 3: Clone openDsh aasdk
# ============================================
echo "[3/7] Building aasdk (openDsh)..."

mkdir -p $OPENAUTO_DIR
cd $OPENAUTO_DIR

if [ -f "/usr/local/lib/libaasdk.so" ]; then
    echo -e "${GREEN}aasdk already installed, skipping...${NC}"
else
    if [ ! -d "aasdk" ]; then
        git_clone_retry "https://github.com/openDsh/aasdk.git" "aasdk"
    fi
    
    cd aasdk
    
    # Patch for OpenSSL 3.x compatibility
    echo -e "${YELLOW}Patching for OpenSSL 3.x...${NC}"
    sed -i 's/FIPS_mode_set(0);/\/\/ FIPS_mode_set(0); \/\/ Removed for OpenSSL 3.x/' src/Transport/SSLWrapper.cpp 2>/dev/null || true
    sed -i 's/ERR_load_BIO_strings();/\/\/ ERR_load_BIO_strings(); \/\/ Deprecated/' src/Transport/SSLWrapper.cpp 2>/dev/null || true
    sed -i 's/SSL_load_error_strings();/\/\/ SSL_load_error_strings(); \/\/ Deprecated/' src/Transport/SSLWrapper.cpp 2>/dev/null || true
    sed -i 's/SSL_library_init();/OPENSSL_init_ssl(0, NULL);/' src/Transport/SSLWrapper.cpp 2>/dev/null || true
    
    rm -rf build 2>/dev/null || true
    mkdir -p build && cd build
    
    cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_STANDARD=17
    make -j2
    make install
    ldconfig
    
    # Copy protobuf headers from FetchContent
    if [ -d "/opt/openauto/aasdk/build/_deps/protobuf-src/src/google" ]; then
        cp -r /opt/openauto/aasdk/build/_deps/protobuf-src/src/google /usr/local/include/
    fi
fi

echo -e "${GREEN}[3/7] aasdk ready${NC}"

# ============================================
# STEP 4: Clone openDsh openauto
# ============================================
echo "[4/7] Building OpenAuto (openDsh)..."

cd $OPENAUTO_DIR

if [ -f "$OPENAUTO_DIR/openauto/build/bin/autoapp" ]; then
    echo -e "${GREEN}OpenAuto already built, skipping...${NC}"
else
    if [ ! -d "openauto" ]; then
        git_clone_retry "https://github.com/openDsh/openauto.git" "openauto" "develop"
    fi
    
    cd openauto
    
    # Patch for RtAudio 6.x compatibility
    echo -e "${YELLOW}Patching for RtAudio 6.x...${NC}"
    sed -i 's/RtAudioError/std::exception/g' openauto/Projection/RtAudioOutput.cpp 2>/dev/null || true
    
    # Disable OMX for Pi 5
    echo -e "${YELLOW}Disabling OMX for Pi 5...${NC}"
    sed -i 's/add_definitions(-DUSE_OMX/#add_definitions(-DUSE_OMX/' CMakeLists.txt 2>/dev/null || true
    sed -i 's/set(BCM_HOST_LIBRARIES/#set(BCM_HOST_LIBRARIES/' CMakeLists.txt 2>/dev/null || true
    sed -i 's/set(BCM_HOST_INCLUDE_DIRS/#set(BCM_HOST_INCLUDE_DIRS/' CMakeLists.txt 2>/dev/null || true
    sed -i 's/set(ILCLIENT_INCLUDE_DIRS/#set(ILCLIENT_INCLUDE_DIRS/' CMakeLists.txt 2>/dev/null || true
    sed -i 's/set(ILCLIENT_LIBRARIES/#set(ILCLIENT_LIBRARIES/' CMakeLists.txt 2>/dev/null || true
    
    rm -rf build 2>/dev/null || true
    mkdir -p build && cd build
    
    cmake .. -DCMAKE_BUILD_TYPE=Release -DNOPI=ON -DCMAKE_CXX_STANDARD=17
    make -j2
fi

echo -e "${GREEN}[4/7] OpenAuto ready${NC}"

# ============================================
# STEP 5: Create Launcher
# ============================================
echo "[5/7] Creating launcher..."

cat > /usr/local/bin/openauto-launcher << 'EOF'
#!/bin/bash
export DISPLAY=:0
export QT_QPA_PLATFORM=xcb
export LD_LIBRARY_PATH=/opt/openauto/openauto/build/lib:/opt/openauto/openauto/lib:/usr/local/lib:$LD_LIBRARY_PATH
export PULSE_SERVER=unix:/run/user/$(id -u)/pulse/native

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
    echo "ERROR: autoapp binary not found"
    exit 1
fi
EOF

chmod +x /usr/local/bin/openauto-launcher
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/android-auto
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/openauto

echo -e "${GREEN}[5/7] Launcher created${NC}"

# ============================================
# STEP 6: Setup USB Permissions
# ============================================
echo "[6/7] Setting up USB permissions..."

cat > /etc/udev/rules.d/51-android.rules << 'EOF'
# Android Auto USB permissions - Comprehensive vendor list
# Google
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev"
# Samsung
SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", MODE="0666", GROUP="plugdev"
# OnePlus
SUBSYSTEM=="usb", ATTR{idVendor}=="2a70", MODE="0666", GROUP="plugdev"
# Xiaomi
SUBSYSTEM=="usb", ATTR{idVendor}=="2717", MODE="0666", GROUP="plugdev"
# Huawei
SUBSYSTEM=="usb", ATTR{idVendor}=="12d1", MODE="0666", GROUP="plugdev"
# Motorola
SUBSYSTEM=="usb", ATTR{idVendor}=="22b8", MODE="0666", GROUP="plugdev"
# Sony
SUBSYSTEM=="usb", ATTR{idVendor}=="0fce", MODE="0666", GROUP="plugdev"
# HTC
SUBSYSTEM=="usb", ATTR{idVendor}=="0bb4", MODE="0666", GROUP="plugdev"
# LG
SUBSYSTEM=="usb", ATTR{idVendor}=="1004", MODE="0666", GROUP="plugdev"
# OPPO / Realme
SUBSYSTEM=="usb", ATTR{idVendor}=="22d9", MODE="0666", GROUP="plugdev"
# Nokia
SUBSYSTEM=="usb", ATTR{idVendor}=="0421", MODE="0666", GROUP="plugdev"
# Nothing Phone
SUBSYSTEM=="usb", ATTR{idVendor}=="2970", MODE="0666", GROUP="plugdev"
# Catch-all for any USB device (fallback)
SUBSYSTEM=="usb", MODE="0666", GROUP="plugdev"
EOF

udevadm control --reload-rules
udevadm trigger

# Add current user to plugdev group
REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || echo pi)}"
usermod -aG plugdev "$REAL_USER" 2>/dev/null || true

echo -e "${GREEN}[6/7] USB permissions configured${NC}"

# ============================================
# STEP 7: Verify Installation
# ============================================
echo "[7/7] Verifying installation..."

AUTOAPP_BIN=""
if [ -f "$OPENAUTO_DIR/openauto/build/bin/autoapp" ]; then
    AUTOAPP_BIN="$OPENAUTO_DIR/openauto/build/bin/autoapp"
elif [ -f "$OPENAUTO_DIR/openauto/bin/autoapp" ]; then
    AUTOAPP_BIN="$OPENAUTO_DIR/openauto/bin/autoapp"
fi

if [ -n "$AUTOAPP_BIN" ]; then
    echo ""
    echo "=========================================="
    echo -e "${GREEN}  OpenAuto Installation Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "Binary: $AUTOAPP_BIN"
    echo "Launcher: /usr/local/bin/openauto-launcher"
    echo ""
    echo "To launch: android-auto"
    echo ""
    echo "Build time: $(($SECONDS / 60)) minutes"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  1. Connect phone via USB"
    echo "  2. Enable USB debugging on phone"
    echo "  3. Run: android-auto"
    echo "  4. Accept USB debugging prompt on phone"
else
    echo -e "${RED}Installation FAILED - autoapp not found${NC}"
    echo "Checked paths:"
    echo "  - $OPENAUTO_DIR/openauto/build/bin/autoapp"
    echo "  - $OPENAUTO_DIR/openauto/bin/autoapp"
    exit 1
fi
