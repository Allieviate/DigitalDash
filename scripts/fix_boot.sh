#!/bin/bash
# =============================================================================
# FRANK Digital Instrument Cluster - Boot & Display Fix
# Run this on your Raspberry Pi to fix black screen / TTY on reboot
# Usage: sudo bash fix_boot.sh
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root: sudo bash $0${NC}"
    exit 1
fi

# Detect the real (non-root) user
REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || echo pi)}"
REAL_HOME="/home/$REAL_USER"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     FRANK - Boot & Display Fix Script                         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Detected user: ${GREEN}$REAL_USER${NC} (home: $REAL_HOME)"
echo -e "Project dir:   ${GREEN}$PROJECT_DIR${NC}"
echo ""

# ─── STEP 1: Diagnose current state ───
echo -e "${YELLOW}[1/7] Diagnosing current state...${NC}"

HAS_X11=false
HAS_WAYLAND=false
HAS_OPENBOX=false
HAS_CHROMIUM=false
HAS_SERVE=false

command -v Xorg >/dev/null 2>&1 || command -v X >/dev/null 2>&1 && HAS_X11=true
[ -d "/usr/lib/wayland" ] || command -v weston >/dev/null 2>&1 && HAS_WAYLAND=true
command -v openbox >/dev/null 2>&1 && HAS_OPENBOX=true
command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1 && HAS_CHROMIUM=true
command -v serve >/dev/null 2>&1 && HAS_SERVE=true

echo "  X11/Xorg:    $([ "$HAS_X11" = true ] && echo -e "${GREEN}found${NC}" || echo -e "${RED}missing${NC}")"
echo "  Openbox:     $([ "$HAS_OPENBOX" = true ] && echo -e "${GREEN}found${NC}" || echo -e "${RED}missing${NC}")"
echo "  Chromium:    $([ "$HAS_CHROMIUM" = true ] && echo -e "${GREEN}found${NC}" || echo -e "${RED}missing${NC}")"
echo "  serve (npm): $([ "$HAS_SERVE" = true ] && echo -e "${GREEN}found${NC}" || echo -e "${RED}missing${NC}")"
echo ""

# Check if we're on a Desktop or Lite image
IS_DESKTOP=false
if dpkg -l | grep -q "raspberrypi-ui-mods\|lxde\|lxsession\|wayfire\|labwc"; then
    IS_DESKTOP=true
fi
echo -e "  OS type: $([ "$IS_DESKTOP" = true ] && echo -e "${GREEN}Desktop (has window manager)${NC}" || echo -e "${YELLOW}Lite (no GUI by default)${NC}")"
echo ""

# ─── STEP 2: Install missing dependencies ───
echo -e "${YELLOW}[2/7] Installing missing dependencies...${NC}"

PKGS_TO_INSTALL=""
if [ "$HAS_CHROMIUM" = false ]; then PKGS_TO_INSTALL="$PKGS_TO_INSTALL chromium"; fi
if [ "$HAS_X11" = false ]; then PKGS_TO_INSTALL="$PKGS_TO_INSTALL xserver-xorg xinit"; fi
if [ "$HAS_OPENBOX" = false ]; then PKGS_TO_INSTALL="$PKGS_TO_INSTALL openbox"; fi

# Always ensure these are present
PKGS_TO_INSTALL="$PKGS_TO_INSTALL xdotool wmctrl unclutter"

if [ -n "$PKGS_TO_INSTALL" ]; then
    echo "  Installing: $PKGS_TO_INSTALL"
    apt update -qq
    apt install -y $PKGS_TO_INSTALL
    echo -e "  ${GREEN}Done${NC}"
else
    echo -e "  ${GREEN}All dependencies already installed${NC}"
fi

if [ "$HAS_SERVE" = false ]; then
    echo "  Installing serve (static file server)..."
    npm install -g serve
fi

SERVE_BIN="$(command -v serve || echo /usr/local/bin/serve)"
CHROMIUM_BIN="$(command -v chromium || command -v chromium-browser || true)"
echo ""

# ─── STEP 3: Fix frontend build with correct URL ───
echo -e "${YELLOW}[3/7] Checking frontend build...${NC}"

FRONTEND_ENV="$PROJECT_DIR/frontend/.env"

# Ensure .env has localhost URL for Pi builds
if [ -f "$FRONTEND_ENV" ]; then
    CURRENT_URL=$(grep REACT_APP_BACKEND_URL "$FRONTEND_ENV" | cut -d'=' -f2)
    if echo "$CURRENT_URL" | grep -q "preview.emergentagent.com\|localhost"; then
        echo "  Current REACT_APP_BACKEND_URL: $CURRENT_URL"
    fi
fi

# Create/overwrite .env for Pi
cat > "$FRONTEND_ENV" << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
echo -e "  ${GREEN}Set REACT_APP_BACKEND_URL=http://localhost:8001${NC}"

# Check if build exists
if [ -d "$PROJECT_DIR/frontend/build" ] && [ -f "$PROJECT_DIR/frontend/build/index.html" ]; then
    # Check if build has the wrong URL baked in
    if grep -rq "preview.emergentagent.com" "$PROJECT_DIR/frontend/build/" 2>/dev/null; then
        echo -e "  ${RED}Build has cloud URL baked in! Rebuilding...${NC}"
        cd "$PROJECT_DIR/frontend"
        sudo -u "$REAL_USER" REACT_APP_BACKEND_URL=http://localhost:8001 npm run build
        echo -e "  ${GREEN}Rebuild complete with localhost URL${NC}"
    else
        echo -e "  ${GREEN}Build exists and URL looks correct${NC}"
    fi
else
    echo -e "  ${YELLOW}No build found. Building now...${NC}"
    cd "$PROJECT_DIR/frontend"
    sudo -u "$REAL_USER" npm install --legacy-peer-deps 2>/dev/null || true
    sudo -u "$REAL_USER" REACT_APP_BACKEND_URL=http://localhost:8001 npm run build
    echo -e "  ${GREEN}Build complete${NC}"
fi
echo ""

# ─── STEP 4: Create kiosk launcher script ───
echo -e "${YELLOW}[4/7] Creating kiosk launcher...${NC}"

cat > "$PROJECT_DIR/scripts/launch_kiosk.sh" << 'KIOSKEOF'
#!/bin/bash
set -euo pipefail

CHROMIUM_BIN="$(command -v chromium || command -v chromium-browser || true)"
if [ -z "$CHROMIUM_BIN" ]; then
  echo "Chromium binary not found."
  exit 1
fi

APP_URL="http://localhost:3000"

COMMON_FLAGS=(
  --kiosk
  --no-sandbox
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
  --check-for-update-interval=31536000
  --disable-translate
  --disable-sync
  --autoplay-policy=no-user-gesture-required
)

WAYLAND_FLAGS=(
  --ozone-platform=wayland
  --enable-features=UseOzonePlatform
)

# Wait for frontend to be reachable
echo "Waiting for frontend at $APP_URL..."
for i in $(seq 1 90); do
  if curl -fsS --max-time 2 "${APP_URL}" >/dev/null 2>&1; then
    echo "Frontend ready after ${i}s"
    break
  fi
  sleep 1
done

# Wait for display socket
echo "Waiting for display..."
for i in $(seq 1 120); do
  if [ -z "${XDG_RUNTIME_DIR:-}" ] && [ -d "/run/user/$(id -u)" ]; then
    export XDG_RUNTIME_DIR="/run/user/$(id -u)"
  fi

  # Try Wayland first
  if [ -n "${XDG_RUNTIME_DIR:-}" ]; then
    wayland_sock="$(find "$XDG_RUNTIME_DIR" -maxdepth 1 -type s -name 'wayland-*' 2>/dev/null | head -n 1 || true)"
    if [ -n "$wayland_sock" ]; then
      export WAYLAND_DISPLAY="$(basename "$wayland_sock")"
      echo "Using Wayland: $WAYLAND_DISPLAY"
      exec "$CHROMIUM_BIN" "${COMMON_FLAGS[@]}" "${WAYLAND_FLAGS[@]}" --app="$APP_URL"
    fi
  fi

  # X11 fallback
  x11_sock="$(find /tmp/.X11-unix -maxdepth 1 -type s -name 'X*' 2>/dev/null | head -n 1 || true)"
  if [ -n "$x11_sock" ]; then
    display_num="${x11_sock##*/X}"
    export DISPLAY=":${display_num}"
    if [ -z "${XAUTHORITY:-}" ] && [ -f "$HOME/.Xauthority" ]; then
      export XAUTHORITY="$HOME/.Xauthority"
    fi
    echo "Using X11: DISPLAY=$DISPLAY"

    # Hide mouse cursor
    unclutter -idle 0.1 -root &

    exec "$CHROMIUM_BIN" "${COMMON_FLAGS[@]}" --app="$APP_URL"
  fi

  sleep 1
done

echo "ERROR: No display socket found after 120s."
ls -la /run/user 2>/dev/null || true
ls -la /tmp/.X11-unix 2>/dev/null || true
exit 1
KIOSKEOF
chmod +x "$PROJECT_DIR/scripts/launch_kiosk.sh"
echo -e "  ${GREEN}Created launch_kiosk.sh${NC}"
echo ""

# ─── STEP 5: Create/update systemd services ───
echo -e "${YELLOW}[5/7] Setting up systemd services...${NC}"

# frank-display.service: Starts X11 + Openbox (only needed on Lite images)
if [ "$IS_DESKTOP" = false ]; then
    cat > /etc/systemd/system/frank-display.service << EOF
[Unit]
Description=FRANK X11 Display Session
After=systemd-user-sessions.service
Wants=systemd-user-sessions.service
ConditionPathExists=!/tmp/.X11-unix/X0

[Service]
Type=simple
User=$REAL_USER
Environment=HOME=$REAL_HOME
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
    echo -e "  ${GREEN}Created frank-display.service (X11 + Openbox for Lite image)${NC}"
    systemctl daemon-reload
    systemctl enable frank-display.service
else
    echo -e "  ${GREEN}Desktop image detected - skipping frank-display.service (desktop manager handles display)${NC}"
    # For desktop, we just need to auto-start kiosk from the desktop session
fi

# frank-backend.service
cat > /etc/systemd/system/frank-backend.service << EOF
[Unit]
Description=FRANK HMI Backend
After=network.target frank-can.service

[Service]
Type=simple
User=$REAL_USER
WorkingDirectory=$PROJECT_DIR/backend
EnvironmentFile=$PROJECT_DIR/backend/.env
ExecStart=$PROJECT_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# frank-frontend.service
cat > /etc/systemd/system/frank-frontend.service << EOF
[Unit]
Description=FRANK HMI Frontend (static file server)
After=network.target frank-backend.service

[Service]
Type=simple
User=$REAL_USER
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=$SERVE_BIN -s build -l 3000 --no-clipboard
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# frank-kiosk.service
AFTER_UNITS="frank-frontend.service network-online.target"
WANTS_UNITS="frank-frontend.service network-online.target"
if [ "$IS_DESKTOP" = false ]; then
    AFTER_UNITS="frank-frontend.service frank-display.service network-online.target"
    WANTS_UNITS="frank-frontend.service frank-display.service network-online.target"
fi

cat > /etc/systemd/system/frank-kiosk.service << EOF
[Unit]
Description=FRANK HMI Kiosk Display
After=$AFTER_UNITS
Wants=$WANTS_UNITS

[Service]
Type=simple
User=$REAL_USER
Environment=HOME=$REAL_HOME
PAMName=login
ExecStartPre=/bin/sleep 5
ExecStart=$PROJECT_DIR/scripts/launch_kiosk.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# frank-can.service - installed from the repo file rather than a
# heredoc, so the CAN unit reads the same however you got here.
if [ -f "$PROJECT_DIR/scripts/frank-can.service" ]; then
    chmod +x "$PROJECT_DIR/scripts/can_up.sh" 2>/dev/null || true
    sed "s#__PROJECT_DIR__#$PROJECT_DIR#g" "$PROJECT_DIR/scripts/frank-can.service" \
        > /etc/systemd/system/frank-can.service
fi

systemctl daemon-reload
systemctl enable frank-can.service 2>/dev/null || true
systemctl enable frank-backend.service
systemctl enable frank-frontend.service
systemctl enable frank-kiosk.service

echo -e "  ${GREEN}Created and enabled: frank-can, frank-backend, frank-frontend, frank-kiosk${NC}"
echo ""

# ─── STEP 6: Desktop image autostart (alternative to frank-display) ───
if [ "$IS_DESKTOP" = true ]; then
    echo -e "${YELLOW}[6/7] Setting up desktop autostart...${NC}"
    
    # For desktop images (Wayland/X11), use XDG autostart
    AUTOSTART_DIR="$REAL_HOME/.config/autostart"
    mkdir -p "$AUTOSTART_DIR"
    chown "$REAL_USER:$REAL_USER" "$AUTOSTART_DIR"
    
    cat > "$AUTOSTART_DIR/frank-kiosk.desktop" << EOF
[Desktop Entry]
Type=Application
Name=FRANK Kiosk
Exec=$PROJECT_DIR/scripts/launch_kiosk.sh
X-GNOME-Autostart-enabled=true
Hidden=false
NoDisplay=false
EOF
    chown "$REAL_USER:$REAL_USER" "$AUTOSTART_DIR/frank-kiosk.desktop"
    echo -e "  ${GREEN}Created XDG autostart entry for desktop session${NC}"
else
    echo -e "${YELLOW}[6/7] Lite image - display handled by frank-display.service${NC}"
fi
echo ""

# ─── STEP 7: Disable screen blanking ───
echo -e "${YELLOW}[7/7] Disabling screen blanking & power management...${NC}"

# Disable console blanking
if [ -f /etc/rc.local ]; then
    if ! grep -q "setterm -blank 0" /etc/rc.local; then
        sed -i '/^exit 0/i setterm -blank 0 -powerdown 0 -powersave off' /etc/rc.local 2>/dev/null || true
    fi
fi

# For X11: disable DPMS
XINITRC="$REAL_HOME/.xinitrc"
if [ ! -f "$XINITRC" ] || ! grep -q "xset s off" "$XINITRC"; then
    cat >> "$XINITRC" << 'EOF'
xset s off
xset -dpms
xset s noblank
EOF
    chown "$REAL_USER:$REAL_USER" "$XINITRC"
fi

echo -e "  ${GREEN}Screen blanking disabled${NC}"
echo ""

# ─── Summary ───
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     FRANK Boot Fix Complete!                                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Services enabled for auto-start on boot:"
echo "  1. frank-backend   → FastAPI on :8001"
echo "  2. frank-frontend  → React build on :3000"
if [ "$IS_DESKTOP" = false ]; then
echo "  3. frank-display   → X11 + Openbox (Lite image)"
fi
echo "  4. frank-kiosk     → Chromium fullscreen kiosk"
echo ""
echo -e "${YELLOW}To start everything NOW (without reboot):${NC}"
echo "  sudo systemctl start frank-backend frank-frontend"
if [ "$IS_DESKTOP" = false ]; then
echo "  sudo systemctl start frank-display"
fi
echo "  sudo systemctl start frank-kiosk"
echo ""
echo -e "${YELLOW}To test:${NC}"
echo "  sudo reboot"
echo ""
echo -e "${YELLOW}To check status after boot:${NC}"
echo "  sudo systemctl status frank-backend frank-frontend frank-kiosk"
echo ""
echo -e "${YELLOW}To view logs if something goes wrong:${NC}"
echo "  sudo journalctl -u frank-kiosk -n 50 --no-pager"
echo "  sudo journalctl -u frank-backend -n 50 --no-pager"
echo ""
echo -e "${YELLOW}Still seeing black screen? SSH in and run:${NC}"
echo "  bash $PROJECT_DIR/scripts/diagnose.sh"
echo ""
