#!/bin/bash
# ============================================
# OpenAuto Installation Script for Raspberry Pi 5
# For FRANK Dashboard - Android Auto Support
# Version 10.0 - Original Working Recipe
# ============================================
#
# Based on the EXACT setup that worked before:
# - Uses opencardev/aasdk and opencardev/openauto
# - Installs to /opt/openauto/
# - Creates /usr/local/bin/openauto-launcher
# - Removes poisoned aap_protobuf headers first
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  OpenAuto Installer for FRANK Dashboard"
echo "  Version 10.0 - Original Working Recipe"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root: sudo bash install_openauto.sh${NC}"
    exit 1
fi

SECONDS=0
ACTUAL_USER=${SUDO_USER:-$USER}
OPENAUTO_DIR="/opt/openauto"

# ============================================
# Helper: Git clone with retry
# ============================================
git_clone_retry() {
    local url="$1"
    local dir="$2"
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo -e "${YELLOW}Attempt $attempt/$max_attempts: Cloning $url...${NC}"
        if git clone --depth 1 "$url" "$dir" 2>&1; then
            echo -e "${GREEN}Clone successful!${NC}"
            return 0
        fi
        echo -e "${YELLOW}Failed. Retrying in 5 seconds...${NC}"
        sleep 5
        attempt=$((attempt + 1))
    done
    return 1
}

# ============================================
# STEP 0: Clean Poisoned Headers
# This is THE FIX for runtime_version.h error
# ============================================
echo "[0/5] Cleaning poisoned headers..."

echo -e "${YELLOW}Moving aap_protobuf HEADERS out of include path (fixes runtime_version.h)${NC}"
# Only move the HEADERS, not the libraries - OpenAuto needs libaap_protobuf.so
mv /usr/local/include/aap_protobuf /usr/local/include/aap_protobuf__DISABLED 2>/dev/null || true

# Clean other potential conflicts (but NOT aasdk libs)
rm -f /usr/local/bin/protoc 2>/dev/null || true
rm -rf /usr/local/include/google/protobuf 2>/dev/null || true
rm -f /usr/local/lib/libprotobuf* 2>/dev/null || true
rm -rf /usr/local/include/absl 2>/dev/null || true
rm -f /usr/local/lib/libabsl* 2>/dev/null || true

# NOTE: We do NOT remove /usr/local/lib/libaap_protobuf* or /usr/local/lib/libaasdk*
# because OpenAuto NEEDS these libraries from the aasdk build

# Disable MongoDB repo if exists
if ls /etc/apt/sources.list.d/mongodb*.list 1>/dev/null 2>&1; then
    for f in /etc/apt/sources.list.d/mongodb*.list; do
        mv "$f" "$f.disabled" 2>/dev/null || true
    done
fi

ldconfig
echo -e "${GREEN}[0/5] Poisoned headers cleaned${NC}"

# ============================================
# STEP 1: Install Dependencies
# ============================================
echo "[1/5] Installing dependencies..."

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
    wmctrl \
    xdotool

# Increase swap for compilation
if [ -f /etc/dphys-swapfile ]; then
    sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
    dphys-swapfile swapoff 2>/dev/null || true
    dphys-swapfile setup 2>/dev/null || true
    dphys-swapfile swapon 2>/dev/null || true
fi

echo -e "${GREEN}[1/5] Dependencies installed${NC}"

# ============================================
# STEP 2: Build AASDK (from opencardev)
# ============================================
echo "[2/5] Building AASDK..."

# Check if already built AND libraries exist (resume support)
if [ -f "/usr/local/lib/libaasdk.so" ] && [ -f "/usr/local/lib/libaap_protobuf.so" ] && [ -d "/usr/local/include/aasdk" ]; then
    echo -e "${GREEN}AASDK already installed with all libraries, skipping...${NC}"
else
    echo -e "${YELLOW}AASDK libraries missing or incomplete, building...${NC}"
    
    mkdir -p $OPENAUTO_DIR
    cd $OPENAUTO_DIR
    
    # Clone if not exists
    if [ ! -d "aasdk" ]; then
        if ! git_clone_retry "https://github.com/opencardev/aasdk.git" "aasdk"; then
            echo -e "${RED}Failed to clone aasdk. Check internet connection.${NC}"
            exit 1
        fi
    fi
    
    cd aasdk
    
    # Clean any previous failed build
    rm -rf build 2>/dev/null || true
    mkdir -p build && cd build
    
    echo -e "${YELLOW}Configuring AASDK...${NC}"
    cmake .. -DCMAKE_BUILD_TYPE=Release
    
    echo -e "${YELLOW}Building AASDK (this takes 15-30 minutes)...${NC}"
    make -j2
    
    echo -e "${YELLOW}Installing AASDK...${NC}"
    make install
    ldconfig
    
    # Verify installation
    if [ ! -f "/usr/local/lib/libaap_protobuf.so" ]; then
        echo -e "${RED}ERROR: libaap_protobuf.so was not created!${NC}"
        exit 1
    fi
    
    cd $OPENAUTO_DIR
fi

echo -e "${GREEN}[2/5] AASDK ready${NC}"
echo -e "${GREEN}  - libaasdk.so: $(ls -la /usr/local/lib/libaasdk.so 2>/dev/null | awk '{print $NF}')${NC}"
echo -e "${GREEN}  - libaap_protobuf.so: $(ls -la /usr/local/lib/libaap_protobuf.so 2>/dev/null | awk '{print $NF}')${NC}"

# ============================================
# STEP 3: Build OpenAuto (from opencardev)
# ============================================
echo "[3/5] Building OpenAuto..."

# Check if already built (resume support)
if [ -f "$OPENAUTO_DIR/openauto/build/bin/autoapp" ]; then
    echo -e "${GREEN}OpenAuto already built, skipping...${NC}"
else
    cd $OPENAUTO_DIR
    
    # Clone if not exists
    if [ ! -d "openauto" ]; then
        if ! git_clone_retry "https://github.com/opencardev/openauto.git" "openauto"; then
            echo -e "${RED}Failed to clone openauto. Check internet connection.${NC}"
            exit 1
        fi
    fi
    
    cd openauto
    
    # Clean any previous failed build
    rm -rf build 2>/dev/null || true
    mkdir -p build && cd build
    
    echo -e "${YELLOW}Configuring OpenAuto...${NC}"
    cmake .. -DCMAKE_BUILD_TYPE=Release
    
    echo -e "${YELLOW}Building OpenAuto (this takes 15-30 minutes)...${NC}"
    make -j2
fi

echo -e "${GREEN}[3/5] OpenAuto ready${NC}"

# ============================================
# STEP 4: Create Launcher
# ============================================
echo "[4/5] Creating launcher..."

cat > /usr/local/bin/openauto-launcher << 'EOF'
#!/bin/bash
# OpenAuto Launcher for FRANK Dashboard

OPENAUTO_BIN="/opt/openauto/openauto/build/bin/autoapp"

# Kill any existing instance
pkill -f autoapp 2>/dev/null || true
sleep 0.5

# Set display environment
export DISPLAY=:0
export QT_QPA_PLATFORM=xcb
export PULSE_SERVER=unix:/run/user/$(id -u)/pulse/native

# Check binary exists
if [ ! -f "$OPENAUTO_BIN" ]; then
    echo "Error: OpenAuto not found at $OPENAUTO_BIN"
    exit 1
fi

# Launch OpenAuto
cd /opt/openauto/openauto/build/bin
exec ./autoapp "$@"
EOF

chmod +x /usr/local/bin/openauto-launcher

# Create symlinks
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/android-auto
ln -sf /usr/local/bin/openauto-launcher /usr/local/bin/openauto

echo -e "${GREEN}[4/5] Launcher created${NC}"

# ============================================
# STEP 5: Verify Installation
# ============================================
echo "[5/5] Verifying installation..."

echo ""
if [ -f "$OPENAUTO_DIR/openauto/build/bin/autoapp" ]; then
    echo "=========================================="
    echo -e "${GREEN}  OpenAuto Installation Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "Installation paths:"
    echo "  AASDK:    /opt/openauto/aasdk"
    echo "  OpenAuto: /opt/openauto/openauto"
    echo "  Binary:   /opt/openauto/openauto/build/bin/autoapp"
    echo "  Launcher: /usr/local/bin/openauto-launcher"
    echo ""
    echo "To launch Android Auto:"
    echo "  android-auto"
    echo "  # or"
    echo "  openauto-launcher"
    echo ""
    echo "From FRANK Dashboard:"
    echo "  Use the Connectivity tab button"
    echo ""
    echo "Build time: $(($SECONDS / 60)) minutes"
else
    echo -e "${RED}Installation FAILED${NC}"
    echo "autoapp binary not found at $OPENAUTO_DIR/openauto/build/bin/autoapp"
    exit 1
fi
echo ""
