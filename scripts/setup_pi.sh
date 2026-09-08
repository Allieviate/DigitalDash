#!/bin/bash
# =============================================================================
# FRANK Digital Instrument Cluster - Raspberry Pi 5 Setup Script
# For 1989 Honda Accord HMI
#
# This script INSTALLS. It does not author.
#
# Anything it needs to put on the Pi lives as a real file in scripts/ and
# is copied or sed-substituted into place. Nothing is generated inline.
#
# That rule exists because it was broken: this script used to write
# scripts/launch_kiosk.sh from a heredoc, silently overwriting the
# version in the repo with an older copy. Improvements to the launcher
# were undone by the next setup run, and the two copies drifted until
# they no longer matched.
#
# If you need setup to place a new file, add the file to scripts/ and
# install it here. Do not paste its contents into this script.
# =============================================================================

set -euo pipefail

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     FRANK - Digital Instrument Cluster Setup                  ║"
echo "║     Raspberry Pi 5 Installation Script                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# -----------------------------------------------------------------------------
# Who are we installing for?
#
# Resolved once. Previously the kiosk unit used ${SUDO_USER:-...} while
# the backend, frontend and display units used $USER, so running this
# under sudo produced three services owned by root and one owned by the
# real user - with the root-owned ones looking for a venv and a build in
# the wrong home directory.
# -----------------------------------------------------------------------------
RUN_USER="${SUDO_USER:-$USER}"

if [ "$RUN_USER" = "root" ]; then
    echo -e "${RED}Refusing to install services owned by root.${NC}"
    echo "Run this as your normal user (it will sudo where needed):"
    echo "  ./scripts/setup_pi.sh"
    exit 1
fi

RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
if [ -z "$RUN_HOME" ]; then
    echo -e "${RED}Could not resolve home directory for user '$RUN_USER'.${NC}"
    exit 1
fi

echo -e "${GREEN}Installing for user '$RUN_USER' (home: $RUN_HOME)${NC}"
echo -e "${GREEN}Project directory: $PROJECT_DIR${NC}"
echo ""

ensure_valid_system_time() {
    # A Pi has no real-time clock. Without network time it can boot with
    # a clock far enough off that apt rejects repository signatures as
    # not-yet-valid or expired.
    #
    # The bound used to be a hardcoded "year >= 2026 means the clock is
    # ahead", which stopped being a sanity check the moment 2026 arrived
    # and started firing on every single run. It is a range now.
    local current_year
    current_year="$(date +%Y)"

    if command -v timedatectl >/dev/null 2>&1; then
        sudo timedatectl set-ntp true || true
    fi

    if [ "$current_year" -lt 2024 ] || [ "$current_year" -gt 2100 ]; then
        echo -e "${YELLOW}System clock looks wrong (${current_year}). Attempting HTTP time sync...${NC}"
        local http_date
        http_date="$(curl -fsI https://deb.debian.org 2>/dev/null | awk -F': ' '/^date:/I {print $2}' | tr -d '\r\n')"
        if [ -n "$http_date" ]; then
            sudo date -s "$http_date" >/dev/null 2>&1 || true
            echo -e "${GREEN}Clock set to: $(date)${NC}"
        else
            echo -e "${YELLOW}Could not reach a time source. Continuing anyway.${NC}"
        fi
    fi
}

# Cleanup stale MongoDB apt source files from previous failed runs before first apt update.
sudo rm -f /etc/apt/sources.list.d/mongodb-org-*.list || true

ensure_valid_system_time

echo -e "${YELLOW}[1/7] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}[2/7] Installing system dependencies...${NC}"
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    chromium \
    gnupg \
    ca-certificates \
    wmctrl \
    xdotool \
    unclutter \
    xserver-xorg \
    xinit \
    openbox \
    git \
    curl \
    can-utils

install_mongodb_docker_fallback() {
    echo -e "${YELLOW}Falling back to Docker-based MongoDB due apt repository signature/policy issues...${NC}"

    sudo apt install -y docker.io
    sudo systemctl enable docker
    sudo systemctl start docker

    if ! sudo docker image inspect mongo:7 >/dev/null 2>&1; then
        sudo docker pull mongo:7
    fi

    if sudo docker ps -a --format '{{.Names}}' | grep -q '^frank-mongodb$'; then
        sudo docker start frank-mongodb >/dev/null
    else
        sudo mkdir -p /var/lib/frank-mongodb
        sudo docker run -d --name frank-mongodb --restart unless-stopped -p 27017:27017 -v /var/lib/frank-mongodb:/data/db mongo:7 >/dev/null
    fi

    echo -e "${GREEN}MongoDB is running via Docker container 'frank-mongodb'.${NC}"
}

start_mongodb_runtime() {
    if systemctl list-unit-files | grep -q '^mongod\.service'; then
        sudo systemctl enable mongod
        sudo systemctl start mongod
        return
    fi

    if systemctl list-unit-files | grep -q '^mongodb\.service'; then
        sudo systemctl enable mongodb
        sudo systemctl start mongodb
        return
    fi

    if command -v docker >/dev/null 2>&1 && sudo docker ps -a --format '{{.Names}}' | grep -q '^frank-mongodb$'; then
        sudo systemctl enable docker || true
        sudo systemctl start docker || true
        sudo docker start frank-mongodb >/dev/null || true
        return
    fi

    echo -e "${YELLOW}MongoDB runtime service/container not found after install. Please check installation logs.${NC}"
}

install_mongodb() {
    echo -e "${YELLOW}Installing MongoDB...${NC}"

    ensure_valid_system_time

    # MongoDB does not always publish Release metadata for newest Debian codenames
    # (e.g. trixie) immediately. Fall back to a known-good codename when needed.
    pick_mongodb_repo_codename() {
        local detected_codename="$1"
        local fallback_codename="bookworm"

        case "$detected_codename" in
            bullseye|bookworm)
                echo "$detected_codename"
                ;;
            *)
                echo -e "${YELLOW}MongoDB repo does not currently publish '$detected_codename'. Falling back to '$fallback_codename'.${NC}" >&2
                echo "$fallback_codename"
                ;;
        esac
    }

    has_install_candidate() {
        local package_name="$1"
        local candidate
        candidate="$(apt-cache policy "$package_name" 2>/dev/null | awk '/Candidate:/ {print $2}')"
        [[ -n "$candidate" && "$candidate" != "(none)" ]]
    }

    if has_install_candidate mongodb; then
        sudo apt install -y mongodb
        return
    fi

    if has_install_candidate mongodb-server; then
        sudo apt install -y mongodb-server
        return
    fi

    echo -e "${YELLOW}MongoDB package not available in default repo. Installing mongodb-org...${NC}"

    # Add MongoDB official repository for Debian
    if [ ! -f /usr/share/keyrings/mongodb-server-7.0.gpg ]; then
        curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    fi

    CODENAME="$(. /etc/os-release && echo ${VERSION_CODENAME})"
    REPO_CODENAME="$(pick_mongodb_repo_codename "$CODENAME")"
    ARCH="$(dpkg --print-architecture)"

    # Clean up stale/bad mongodb list files from previous attempts.
    sudo rm -f /etc/apt/sources.list.d/mongodb-org-*.list

    echo "deb [ arch=${ARCH} signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian ${REPO_CODENAME}/mongodb-org/7.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

    local apt_log
    apt_log="$(mktemp)"

    if ! sudo apt update 2> >(tee "$apt_log" >&2); then
        if grep -Eqi "SHA1 is not considered secure|repository .* is not signed|OpenPGP signature verification failed" "$apt_log"; then
            rm -f "$apt_log"
            install_mongodb_docker_fallback
            return
        fi

        rm -f "$apt_log"
        echo -e "${RED}Failed to refresh package metadata for MongoDB repository.${NC}"
        exit 1
    fi

    rm -f "$apt_log"
    sudo apt install -y mongodb-org
}

install_mongodb

# Start MongoDB
echo -e "${YELLOW}[3/7] Starting MongoDB service...${NC}"
start_mongodb_runtime

# Setup Python virtual environment
echo -e "${YELLOW}[4/7] Setting up Python backend...${NC}"
cd "$PROJECT_DIR/backend"

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if not exists
if [ ! -f .env ]; then
    cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=frank_hmi
CORS_ORIGINS=*

# Which source feeds the gauges.
#
#   simulation   bench harness, invented data
#   hondata_can  real frames from the KPro over CAN
#
# This is deliberately not a user setting. A dash that quietly reverts
# to simulation in front of a running engine shows a healthy idle no
# matter what the engine is actually doing.
SIGNAL_SOURCE=simulation
CAN_CHANNEL=can0

DHU_PATH=/opt/android-auto/desktop-head-unit
DHU_CONFIG=/opt/android-auto/dhu.ini
EOF
    echo -e "${GREEN}Created backend/.env file${NC}"
fi

deactivate

# Setup frontend
echo -e "${YELLOW}[5/7] Setting up React frontend...${NC}"
cd "$PROJECT_DIR/frontend"

# Abort early if merge-conflict markers exist. These cause opaque JSX parse
# errors during npm build on the Pi.
#
# This used ripgrep, which is not installed by default and is not in the
# apt list above. A missing binary inside an `if` just makes the branch
# false, so the check silently never ran - the exact opposite of the
# intent. grep is always present.
if grep -rEn '^(<<<<<<< |=======$|>>>>>>> )' "$PROJECT_DIR/frontend/src" --include='*.js' --include='*.jsx' --include='*.css' 2>/dev/null; then
    echo -e "${RED}Merge conflict markers detected in frontend/src. Resolve conflicts before running setup.${NC}"
    exit 1
fi

# Create .env file if not exists (must exist before build)
if [ ! -f .env ]; then
    cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
    echo -e "${GREEN}Created frontend/.env file${NC}"
fi

# Use npm since yarn might not be available.
# This repo currently has known peer conflicts (e.g. date-fns/react-day-picker),
# so use legacy peer resolution for consistent Pi installs.
npm install --legacy-peer-deps

# Create production build
npm run build

# Install serve for production
sudo npm install -g serve

SERVE_BIN="$(command -v serve || true)"
if [ -z "$SERVE_BIN" ]; then
    SERVE_BIN="/usr/local/bin/serve"
fi

CHROMIUM_BIN="$(command -v chromium || command -v chromium-browser || true)"
if [ -z "$CHROMIUM_BIN" ]; then
    echo -e "${RED}Chromium binary not found. Install chromium and re-run setup.${NC}"
    exit 1
fi

# -----------------------------------------------------------------------------
# Make repo scripts executable.
#
# launch_kiosk.sh used to be written here from a heredoc, which meant
# every improvement to the committed version was overwritten on the next
# setup run. It is a repo file now and setup only marks it executable.
# -----------------------------------------------------------------------------
chmod +x "$PROJECT_DIR/scripts/launch_kiosk.sh"
chmod +x "$PROJECT_DIR/scripts/can_up.sh"
chmod +x "$PROJECT_DIR/scripts/check_updates.sh"
chmod +x "$PROJECT_DIR/scripts/start.sh"
chmod +x "$PROJECT_DIR/scripts/stop.sh"
chmod +x "$PROJECT_DIR/scripts/status.sh"

# Create systemd services
echo -e "${YELLOW}[6/7] Installing systemd services...${NC}"

# Units that exist as real files in the repo are substituted, not
# generated, so they can be reviewed in a diff and read in the garage.
install_unit() {
    local source_file="$1"
    local unit_name="$2"

    sed -e "s#__PROJECT_DIR__#$PROJECT_DIR#g" \
        -e "s#__USER__#$RUN_USER#g" \
        -e "s#__HOME__#$RUN_HOME#g" \
        "$source_file" | sudo tee "/etc/systemd/system/$unit_name" > /dev/null
}

# CAN interface bring-up.
#
# Note this only raises the interface. The device-tree overlays that
# create it still have to be added to /boot/firmware/config.txt by
# hand - see scripts/can_config.txt - because editing that file wrong
# can leave the Pi unbootable.
install_unit "$PROJECT_DIR/scripts/frank-can.service" frank-can.service

# Kiosk display.
install_unit "$PROJECT_DIR/scripts/frank-kiosk.service" frank-kiosk.service

# Display bootstrap service for Lite images (starts Xorg + Openbox on tty1)
sudo tee /etc/systemd/system/frank-display.service > /dev/null << EOF
[Unit]
Description=FRANK X11 Display Session
After=systemd-user-sessions.service network.target
Wants=systemd-user-sessions.service

[Service]
Type=simple
User=$RUN_USER
Environment=HOME=$RUN_HOME
PAMName=login
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes
StandardInput=tty
StandardOutput=journal
StandardError=journal
ExecStart=/usr/bin/xinit /usr/bin/openbox-session -- :0 -nolisten tcp vt1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Backend service
sudo tee /etc/systemd/system/frank-backend.service > /dev/null << EOF
[Unit]
Description=FRANK HMI Backend
After=network.target mongodb.service frank-can.service

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$PROJECT_DIR/backend
Environment="PATH=$PROJECT_DIR/backend/venv/bin"
EnvironmentFile=$PROJECT_DIR/backend/.env
ExecStart=$PROJECT_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
sudo tee /etc/systemd/system/frank-frontend.service > /dev/null << EOF
[Unit]
Description=FRANK HMI Frontend
After=network.target frank-backend.service

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=$SERVE_BIN -s build -l 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Enable services
sudo systemctl daemon-reload
sudo systemctl enable frank-can.service
sudo systemctl enable frank-display.service
sudo systemctl enable frank-backend.service
sudo systemctl enable frank-frontend.service
sudo systemctl enable frank-kiosk.service

echo -e "${YELLOW}[7/7] Verifying install...${NC}"

# Ownership check. A build run under sudo leaves root-owned files in
# build/, and the next ordinary build fails with EACCES while serve
# keeps handing out the stale bundle - which looks like the code is
# broken rather than the permissions.
if find "$PROJECT_DIR" -user root -print -quit 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}Found root-owned files in the project. Fixing ownership...${NC}"
    sudo chown -R "$RUN_USER:$RUN_USER" "$PROJECT_DIR"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     FRANK HMI Installation Complete!                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  ./scripts/start.sh          start the dash"
echo "  ./scripts/stop.sh           stop it"
echo "  ./scripts/status.sh         services, CAN interfaces, signal source"
echo "  ./scripts/check_updates.sh  is the checkout behind origin"
echo ""
echo "The HMI auto-starts on boot. To disable:"
echo "  sudo systemctl disable frank-kiosk.service"
echo ""
echo -e "${YELLOW}Still to do by hand:${NC}"
echo "  1. CAN overlays -> see scripts/can_config.txt, then reboot"
echo "  2. Boot splash  -> sudo ./scripts/setup_boot_splash.sh"
echo "  3. Android Auto -> sudo ./scripts/install_openauto.sh"
echo ""
echo -e "${YELLOW}Before the dash goes in the car:${NC}"
echo "  set SIGNAL_SOURCE=hondata_can in backend/.env, or it will show"
echo "  simulated data that looks like a perfectly healthy engine."
echo ""
