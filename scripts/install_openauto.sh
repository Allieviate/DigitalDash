#!/bin/bash
# ============================================
# OpenAuto Installation Script for Raspberry Pi 5
# For FRANK Dashboard - Android Auto Support
# Version 9.0 - Build Protobuf from Source
# ============================================
#
# The runtime_version.h error happens because:
# - System protobuf is too old (v3.x)
# - aasdk generates headers requiring protobuf v22+
# 
# Solution: Build protobuf v25 from source first
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  OpenAuto Installer for FRANK Dashboard"
echo "  Version 9.0 - Build Protobuf from Source"
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
OPENAUTO_DIR="/opt/openauto"

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
            if git clone --depth 1 -b "$branch" "$url" "$dir" 2>&1; then
                echo -e "${GREEN}Clone successful!${NC}"
                return 0
            fi
        else
            if git clone --depth 1 "$url" "$dir" 2>&1; then
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
# STEP 0: System Preparation
# ============================================
echo "[0/7] Preparing system..."

# Disable MongoDB repo if it exists (SHA1 key expired)
if ls /etc/apt/sources.list.d/mongodb*.list 1>/dev/null 2>&1; then
    echo -e "${YELLOW}Disabling MongoDB repo...${NC}"
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
fi

# Increase swap for compilation
echo -e "${YELLOW}Increasing swap size for compilation...${NC}"
if [ -f /etc/dphys-swapfile ]; then
    sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
    dphys-swapfile swapoff 2>/dev/null || true
    dphys-swapfile setup 2>/dev/null || true
    dphys-swapfile swapon 2>/dev/null || true
fi

# Clean ONLY conflicting files (preserve resume capability)
echo -e "${YELLOW}Cleaning conflicting protobuf files...${NC}"
rm -f /usr/local/bin/protoc 2>/dev/null || true
rm -rf /usr/local/include/google 2>/dev/null || true
rm -f /usr/local/lib/libprotobuf* 2>/dev/null || true
rm -f /usr/local/lib/libprotoc* 2>/dev/null || true
rm -rf /usr/local/lib/cmake/protobuf 2>/dev/null || true
rm -rf /usr/local/include/absl 2>/dev/null || true
rm -f /usr/local/lib/libabsl* 2>/dev/null || true

ldconfig
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
    xdotool \
    autoconf \
    automake \
    libtool \
    curl \
    unzip

echo -e "${GREEN}[1/7] Dependencies installed${NC}"

# ============================================
# STEP 2: Build Protobuf v25 from Source
# ============================================
echo "[2/7] Building Protobuf v25 from source..."
echo -e "${YELLOW}This provides runtime_version.h needed by aasdk${NC}"

# Check if protobuf is already built
if [ -f "/usr/local/include/google/protobuf/runtime_version.h" ]; then
    echo -e "${GREEN}Protobuf with runtime_version.h already installed, skipping...${NC}"
else
    echo -e "${YELLOW}Building protobuf (this takes 20-40 minutes)...${NC}"
    
    mkdir -p $OPENAUTO_DIR
    cd $OPENAUTO_DIR
    
    # Clone protobuf if not exists
    if [ ! -d "protobuf" ]; then
        git_clone_retry "https://github.com/protocolbuffers/protobuf.git" "protobuf" "v25.0"
    fi
    
    cd protobuf
    git submodule update --init --recursive 2>/dev/null || true
    
    mkdir -p build && cd build
    rm -f CMakeCache.txt
    
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_CXX_STANDARD=14 \
          -Dprotobuf_BUILD_TESTS=OFF \
          -Dprotobuf_BUILD_SHARED_LIBS=ON \
          -DCMAKE_INSTALL_PREFIX=/usr/local \
          ..
    
    make -j2
    make install
    ldconfig
    
    cd $OPENAUTO_DIR
fi

# Verify protobuf installation
if [ -f "/usr/local/include/google/protobuf/runtime_version.h" ]; then
    echo -e "${GREEN}[2/7] Protobuf v25 installed (runtime_version.h found)${NC}"
else
    echo -e "${RED}ERROR: runtime_version.h not found after protobuf build${NC}"
    exit 1
fi

# ============================================
# STEP 3: Build Abseil (required by protobuf v25)
# ============================================
echo "[3/7] Building Abseil..."

if [ -d "/usr/local/include/absl" ] && [ -f "/usr/local/lib/libabsl_base.a" ]; then
    echo -e "${GREEN}Abseil already installed, skipping...${NC}"
else
    cd $OPENAUTO_DIR
    
    if [ ! -d "abseil-cpp" ]; then
        git_clone_retry "https://github.com/abseil/abseil-cpp.git" "abseil-cpp" "20230802.1"
    fi
    
    cd abseil-cpp
    mkdir -p build && cd build
    rm -f CMakeCache.txt
    
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_CXX_STANDARD=14 \
          -DABSL_BUILD_TESTING=OFF \
          -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
          -DCMAKE_INSTALL_PREFIX=/usr/local \
          ..
    
    make -j2
    make install
    ldconfig
    
    cd $OPENAUTO_DIR
fi

echo -e "${GREEN}[3/7] Abseil ready${NC}"

# ============================================
# STEP 4: Build aasdk
# ============================================
echo "[4/7] Building aasdk..."

if [ -f "/usr/local/lib/libaasdk.so" ]; then
    echo -e "${GREEN}aasdk already installed, skipping...${NC}"
else
    cd $OPENAUTO_DIR
    
    if [ ! -d "aasdk" ]; then
        if ! git_clone_retry "https://github.com/openDsh/aasdk.git" "aasdk" ""; then
            echo -e "${RED}Failed to clone aasdk${NC}"
            exit 1
        fi
    fi
    
    cd aasdk
    
    # Patch for C++14
    sed -i 's/CMAKE_CXX_STANDARD 11/CMAKE_CXX_STANDARD 14/g' CMakeLists.txt 2>/dev/null || true
    
    mkdir -p build && cd build
    rm -f CMakeCache.txt
    
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_CXX_STANDARD=14 \
          -DProtobuf_INCLUDE_DIR=/usr/local/include \
          -DProtobuf_LIBRARY=/usr/local/lib/libprotobuf.so \
          -DProtobuf_PROTOC_EXECUTABLE=/usr/local/bin/protoc \
          ..
    
    make -j2
    make install
    ldconfig
    
    cd $OPENAUTO_DIR
fi

echo -e "${GREEN}[4/7] aasdk ready${NC}"

# ============================================
# STEP 5: Build OpenAuto
# ============================================
echo "[5/7] Building OpenAuto..."

if [ -f "$OPENAUTO_DIR/openauto/build/bin/autoapp" ]; then
    echo -e "${GREEN}OpenAuto already built, skipping...${NC}"
else
    cd $OPENAUTO_DIR
    
    if [ ! -d "openauto" ]; then
        if ! git_clone_retry "https://github.com/openDsh/openauto.git" "openauto" "develop"; then
            echo -e "${RED}Failed to clone openauto${NC}"
            exit 1
        fi
    fi
    
    cd openauto
    
    # Patch for C++14
    sed -i 's/CMAKE_CXX_STANDARD 11/CMAKE_CXX_STANDARD 14/g' CMakeLists.txt 2>/dev/null || true
    
    mkdir -p build && cd build
    rm -f CMakeCache.txt
    
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_CXX_STANDARD=14 \
          -DRPI3_BUILD=FALSE \
          -DGST_BUILD=TRUE \
          -DProtobuf_INCLUDE_DIR=/usr/local/include \
          -DProtobuf_LIBRARY=/usr/local/lib/libprotobuf.so \
          -DProtobuf_PROTOC_EXECUTABLE=/usr/local/bin/protoc \
          ..
    
    make -j2
fi

echo -e "${GREEN}[5/7] OpenAuto ready${NC}"

# ============================================
# STEP 6: Create Launcher
# ============================================
echo "[6/7] Creating launcher..."

cat > /usr/local/bin/openauto-launcher << 'EOF'
#!/bin/bash
OPENAUTO_BIN="/opt/openauto/openauto/build/bin/autoapp"
export DISPLAY=:0
export QT_QPA_PLATFORM=xcb
export LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH

if [ -f "$OPENAUTO_BIN" ]; then
    exec "$OPENAUTO_BIN" "$@"
else
    echo "Error: OpenAuto not found at $OPENAUTO_BIN"
    exit 1
fi
EOF

chmod +x /usr/local/bin/openauto-launcher
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/android-auto 2>/dev/null || true
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/openauto 2>/dev/null || true

echo -e "${GREEN}[6/7] Launcher created${NC}"

# ============================================
# STEP 7: Verify
# ============================================
echo "[7/7] Verifying installation..."

if [ -f "$OPENAUTO_DIR/openauto/build/bin/autoapp" ]; then
    echo ""
    echo "=========================================="
    echo -e "${GREEN}  OpenAuto Installation Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "To launch: android-auto"
    echo ""
    echo "Build time: $(($SECONDS / 60)) minutes"
else
    echo -e "${RED}Installation FAILED - autoapp not found${NC}"
    exit 1
fi
