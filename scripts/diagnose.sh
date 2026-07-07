#!/bin/bash
# ============================================
# FRANK Dashboard - Full Diagnostics
# Checks: display, backend, frontend, kiosk
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo -e "${CYAN}=========================================="
echo "  FRANK Dashboard Diagnostics"
echo -e "==========================================${NC}"
echo ""

# ─── 1. Display ───
echo -e "${YELLOW}[1/7] Checking Display Server...${NC}"
if [ -n "${DISPLAY:-}" ]; then
    echo -e "  ${GREEN}DISPLAY=$DISPLAY is set${NC}"
elif [ -n "${WAYLAND_DISPLAY:-}" ]; then
    echo -e "  ${GREEN}WAYLAND_DISPLAY=$WAYLAND_DISPLAY is set${NC}"
else
    echo -e "  ${RED}No DISPLAY or WAYLAND_DISPLAY set${NC}"
    # Check if X11 sockets exist
    if ls /tmp/.X11-unix/X* 2>/dev/null | head -1 >/dev/null; then
        echo -e "  ${YELLOW}X11 socket found at /tmp/.X11-unix/ — try: export DISPLAY=:0${NC}"
    else
        echo -e "  ${RED}No X11 sockets found. Display server not running.${NC}"
        echo "  Fix: sudo systemctl start frank-display"
    fi
fi

if systemctl is-active --quiet frank-display 2>/dev/null; then
    echo -e "  ${GREEN}frank-display.service: running${NC}"
elif systemctl list-unit-files | grep -q frank-display; then
    echo -e "  ${RED}frank-display.service: not running${NC}"
    echo "  Fix: sudo systemctl start frank-display"
else
    echo -e "  ${YELLOW}frank-display.service: not installed${NC}"
    echo "  Fix: sudo bash $SCRIPT_DIR/fix_boot.sh"
fi
echo ""

# ─── 2. MongoDB ───
echo -e "${YELLOW}[2/7] Checking MongoDB...${NC}"
if systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "  ${GREEN}MongoDB (mongod) is running${NC}"
elif systemctl is-active --quiet mongodb 2>/dev/null; then
    echo -e "  ${GREEN}MongoDB (mongodb) is running${NC}"
elif command -v docker >/dev/null 2>&1 && docker ps 2>/dev/null | grep -q frank-mongodb; then
    echo -e "  ${GREEN}MongoDB (Docker) is running${NC}"
else
    echo -e "  ${RED}MongoDB is NOT running${NC}"
    echo "  Fix: sudo systemctl start mongod"
    echo "  Or:  sudo docker start frank-mongodb"
fi
echo ""

# ─── 3. Backend Service ───
echo -e "${YELLOW}[3/7] Checking Backend Service...${NC}"
if systemctl is-active --quiet frank-backend 2>/dev/null; then
    echo -e "  ${GREEN}frank-backend.service: running${NC}"
elif systemctl list-unit-files | grep -q frank-backend; then
    echo -e "  ${RED}frank-backend.service: not running${NC}"
    echo "  Recent logs:"
    sudo journalctl -u frank-backend -n 5 --no-pager 2>/dev/null | sed 's/^/    /' || echo "    No logs"
    echo "  Fix: sudo systemctl start frank-backend"
else
    echo -e "  ${YELLOW}frank-backend.service: not installed${NC}"
    echo "  Fix: sudo bash $SCRIPT_DIR/fix_boot.sh"
fi
echo ""

# ─── 4. Backend API ───
echo -e "${YELLOW}[4/7] Testing Backend API...${NC}"
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/ 2>/dev/null)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo -e "  ${GREEN}Backend API responding (HTTP 200)${NC}"
else
    echo -e "  ${RED}Backend API not responding (HTTP $BACKEND_RESPONSE)${NC}"
    echo "  Port check:"
    sudo ss -tlnp | grep 8001 | sed 's/^/    /' || echo "    Port 8001 not in use"
fi
echo ""

# ─── 5. Frontend Service ───
echo -e "${YELLOW}[5/7] Checking Frontend Service...${NC}"
if systemctl is-active --quiet frank-frontend 2>/dev/null; then
    echo -e "  ${GREEN}frank-frontend.service: running${NC}"
elif systemctl list-unit-files | grep -q frank-frontend; then
    echo -e "  ${RED}frank-frontend.service: not running${NC}"
    echo "  Fix: sudo systemctl start frank-frontend"
else
    echo -e "  ${YELLOW}frank-frontend.service: not installed${NC}"
fi

# Check build exists
if [ -d "$PROJECT_DIR/frontend/build" ] && [ -f "$PROJECT_DIR/frontend/build/index.html" ]; then
    echo -e "  ${GREEN}Build directory exists${NC}"
    # Check for wrong URL
    if grep -rq "preview.emergentagent.com" "$PROJECT_DIR/frontend/build/" 2>/dev/null; then
        echo -e "  ${RED}WARNING: Build has cloud URL baked in! Needs rebuild.${NC}"
        echo "  Fix: bash $SCRIPT_DIR/build_for_pi.sh"
    else
        echo -e "  ${GREEN}Build URL looks correct (no cloud URLs)${NC}"
    fi
else
    echo -e "  ${RED}No build directory found!${NC}"
    echo "  Fix: bash $SCRIPT_DIR/build_for_pi.sh"
fi
echo ""

# ─── 6. Frontend HTTP ───
echo -e "${YELLOW}[6/7] Testing Frontend HTTP...${NC}"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "  ${GREEN}Frontend responding (HTTP 200)${NC}"
else
    echo -e "  ${RED}Frontend not responding (HTTP $FRONTEND_RESPONSE)${NC}"
    echo "  Port check:"
    sudo ss -tlnp | grep 3000 | sed 's/^/    /' || echo "    Port 3000 not in use"
fi
echo ""

# ─── 7. Kiosk Service ───
echo -e "${YELLOW}[7/7] Checking Kiosk Service...${NC}"
if systemctl is-active --quiet frank-kiosk 2>/dev/null; then
    echo -e "  ${GREEN}frank-kiosk.service: running${NC}"
elif systemctl list-unit-files | grep -q frank-kiosk; then
    echo -e "  ${RED}frank-kiosk.service: not running${NC}"
    echo "  Recent logs:"
    sudo journalctl -u frank-kiosk -n 5 --no-pager 2>/dev/null | sed 's/^/    /' || echo "    No logs"
    echo "  Fix: sudo systemctl start frank-kiosk"
else
    echo -e "  ${YELLOW}frank-kiosk.service: not installed${NC}"
    echo "  Fix: sudo bash $SCRIPT_DIR/fix_boot.sh"
fi

# Check if Chromium is running
if pgrep -x chromium >/dev/null 2>&1 || pgrep -x chromium-browser >/dev/null 2>&1; then
    echo -e "  ${GREEN}Chromium process: running${NC}"
else
    echo -e "  ${YELLOW}Chromium process: not running${NC}"
fi
echo ""

# ─── Summary ───
echo -e "${CYAN}=========================================="
echo "  Quick Fixes"
echo -e "==========================================${NC}"
echo ""
echo "Fix black screen / no auto-start:"
echo "  sudo bash $SCRIPT_DIR/fix_boot.sh"
echo ""
echo "Rebuild frontend for Pi:"
echo "  bash $SCRIPT_DIR/build_for_pi.sh"
echo ""
echo "Restart all FRANK services:"
echo "  sudo systemctl restart frank-backend frank-frontend frank-kiosk"
echo ""
echo "View live logs:"
echo "  sudo journalctl -u frank-kiosk -f"
echo "  sudo journalctl -u frank-backend -f"
echo ""
