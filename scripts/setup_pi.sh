#!/bin/bash
# =============================================================================
# FRANK Digital Instrument Cluster - Raspberry Pi 5 Setup Script
# For 1989 Honda Accord HMI
# =============================================================================

set -e

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

ensure_valid_system_time() {
    # Some fresh Pi images boot with incorrect RTC/system time.
    # When clock is far in the future, apt signature validation can fail.
    local current_year
    current_year="$(date +%Y)"

    if command -v timedatectl >/dev/null 2>&1; then
        sudo timedatectl set-ntp true || true
    fi

    if [ "$current_year" -ge 2026 ]; then
        echo -e "${YELLOW}System clock appears ahead (${current_year}). Attempting HTTP time sync...${NC}"
        local http_date
        http_date="$(curl -fsI https://deb.debian.org 2>/dev/null | awk -F': ' '/^date:/I {print $2}' | tr -d '
')"
        if [ -n "$http_date" ]; then
            sudo date -s "$http_date" >/dev/null 2>&1 || true
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
    curl

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
        sudo docker run -d             --name frank-mongodb             --restart unless-stopped             -p 27017:27017             -v /var/lib/frank-mongodb:/data/db             mongo:7 >/dev/null
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
        curl -fsSL https://pgp.mongodb.com/server-7.0.asc |             sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    fi

    CODENAME="$(. /etc/os-release && echo ${VERSION_CODENAME})"
    REPO_CODENAME="$(pick_mongodb_repo_codename "$CODENAME")"
    ARCH="$(dpkg --print-architecture)"

    # Clean up stale/bad mongodb list files from previous attempts.
    sudo rm -f /etc/apt/sources.list.d/mongodb-org-*.list

    echo "deb [ arch=${ARCH} signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian ${REPO_CODENAME}/mongodb-org/7.0 main" |         sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

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
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=frank_hmi
CORS_ORIGINS=*
DHU_PATH=/opt/android-auto/desktop-head-unit
DHU_CONFIG=/opt/android-auto/dhu.ini
EOF
    echo -e "${GREEN}Created backend/.env file${NC}"
fi

deactivate

# Setup frontend
echo -e "${YELLOW}[5/7] Setting up React frontend...${NC}"
cd "$PROJECT_DIR/frontend"

# Create .env file if not exists (must exist before build)
if [ ! -f .env ]; then
    cat > .env << EOF
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

# Kiosk launcher detects Wayland sessions and applies proper Chromium flags.
cat > "$PROJECT_DIR/scripts/launch_kiosk.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

CHROMIUM_BIN="$(command -v chromium || command -v chromium-browser || true)"
if [ -z "$CHROMIUM_BIN" ]; then
  echo "Chromium binary not found for kiosk startup."
  exit 1
fi

APP_URL="http://localhost:3000"

COMMON_FLAGS=(
  --kiosk
  --noerrdialogs
  --disable-infobars
  --disable-session-crashed-bubble
  --disable-restore-session-state
  --no-first-run
  --start-fullscreen
  --disable-background-networking
  --disable-component-update
  --disable-features=OptimizationGuideModelDownloading,MediaRouter
  --user-data-dir="$HOME/.config/chromium-kiosk"
)

WAYLAND_FLAGS=(
  --ozone-platform=wayland
  --enable-features=UseOzonePlatform
)

if [ -z "${WAYLAND_DISPLAY:-}" ] && [ -S "/run/user/$(id -u)/wayland-0" ]; then
  export XDG_RUNTIME_DIR="/run/user/$(id -u)"
  export WAYLAND_DISPLAY="wayland-0"
fi

if [ -n "${WAYLAND_DISPLAY:-}" ]; then
  exec "$CHROMIUM_BIN" "${COMMON_FLAGS[@]}" "${WAYLAND_FLAGS[@]}" --app="$APP_URL"
fi

export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"
exec "$CHROMIUM_BIN" "${COMMON_FLAGS[@]}" --app="$APP_URL"
EOF
chmod +x "$PROJECT_DIR/scripts/launch_kiosk.sh"

# Create systemd services
echo -e "${YELLOW}[6/7] Creating systemd services...${NC}"

# Backend service
sudo tee /etc/systemd/system/frank-backend.service > /dev/null << EOF
[Unit]
Description=FRANK HMI Backend
After=network.target mongodb.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment="PATH=$PROJECT_DIR/backend/venv/bin"
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
User=$USER
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=$SERVE_BIN -s build -l 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Kiosk service (fullscreen browser)
sudo tee /etc/systemd/system/frank-kiosk.service > /dev/null << EOF
[Unit]
Description=FRANK HMI Kiosk Display
After=frank-frontend.service
Wants=frank-frontend.service

[Service]
Type=simple
User=$USER
ExecStartPre=/bin/sleep 5
ExecStart=$PROJECT_DIR/scripts/launch_kiosk.sh
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

# Enable services
sudo systemctl daemon-reload
sudo systemctl enable frank-backend.service
sudo systemctl enable frank-frontend.service
sudo systemctl enable frank-kiosk.service

echo -e "${YELLOW}[7/7] Creating helper scripts...${NC}"

# Create git update reminder script
cat > "$PROJECT_DIR/scripts/check_updates.sh" << 'EOF'
#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v git >/dev/null 2>&1; then
  echo "⚠️  git is not installed. Cannot check for updates."
  exit 0
fi

if ! git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "⚠️  $REPO_DIR is not a git repository."
  exit 0
fi

current_branch="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)"
echo "Checking updates for branch: $current_branch"

if ! git -C "$REPO_DIR" fetch --quiet origin "$current_branch"; then
  echo "⚠️  Could not reach origin to check updates."
  exit 0
fi

local_rev="$(git -C "$REPO_DIR" rev-parse "$current_branch")"
remote_rev="$(git -C "$REPO_DIR" rev-parse "origin/$current_branch")"

if [ "$local_rev" != "$remote_rev" ]; then
  echo "🔔 Update available: run 'git -C $REPO_DIR pull --ff-only origin $current_branch' before driving."
else
  echo "✅ Repo is up to date."
fi
EOF
chmod +x "$PROJECT_DIR/scripts/check_updates.sh"

# Create start script
cat > "$PROJECT_DIR/scripts/start.sh" << 'EOF'
#!/bin/bash
"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/check_updates.sh"
sudo systemctl start frank-backend
sudo systemctl start frank-frontend
sleep 3
sudo systemctl start frank-kiosk
echo "FRANK HMI started!"
EOF
chmod +x "$PROJECT_DIR/scripts/start.sh"

# Create stop script
cat > "$PROJECT_DIR/scripts/stop.sh" << 'EOF'
#!/bin/bash
sudo systemctl stop frank-kiosk
sudo systemctl stop frank-frontend
sudo systemctl stop frank-backend
echo "FRANK HMI stopped!"
EOF
chmod +x "$PROJECT_DIR/scripts/stop.sh"

# Create status script
cat > "$PROJECT_DIR/scripts/status.sh" << 'EOF'
#!/bin/bash
"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/check_updates.sh"
echo "=== FRANK HMI Status ==="
echo ""
echo "Backend:"
sudo systemctl status frank-backend --no-pager -l | head -5
echo ""
echo "Frontend:"
sudo systemctl status frank-frontend --no-pager -l | head -5
echo ""
echo "Kiosk:"
sudo systemctl status frank-kiosk --no-pager -l | head -5
EOF
chmod +x "$PROJECT_DIR/scripts/status.sh"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     FRANK HMI Installation Complete!                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "To start the HMI manually:"
echo "  ./scripts/start.sh"
echo ""
echo "To stop:"
echo "  ./scripts/stop.sh"
echo ""
echo "To check status:"
echo "  ./scripts/status.sh"

echo "To check if you need to pull updates:"
echo "  ./scripts/check_updates.sh"
echo ""
echo "The HMI will auto-start on boot. To disable:"
echo "  sudo systemctl disable frank-kiosk.service"
echo ""
echo -e "${YELLOW}Next step: Run the boot splash setup script:${NC}"
echo "  sudo ./scripts/setup_boot_splash.sh"
echo ""
