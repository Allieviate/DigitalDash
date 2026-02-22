#!/bin/bash
# =============================================================================
# FRANK Digital Instrument Cluster - Simple Honda Logo Boot Splash
# =============================================================================

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     FRANK - Custom Boot Splash Setup                          ║"
echo "║     Raspberry Pi 5 Boot Splash (Honda logo only)              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Must run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SPLASH_DIR="/usr/share/plymouth/themes/frank-hmi"

set_config_key() {
    local file="$1"
    local key="$2"
    local value="$3"

    if grep -q "^${key}=" "$file"; then
        sed -i "s#^${key}=.*#${key}=${value}#" "$file"
    else
        echo "${key}=${value}" >> "$file"
    fi
}

echo -e "${YELLOW}[1/5] Installing Plymouth for boot splash...${NC}"
apt install -y plymouth plymouth-themes

echo -e "${YELLOW}[2/5] Creating FRANK boot theme directory...${NC}"
mkdir -p "$SPLASH_DIR"

# Copy logo to splash directory
if [ -f "$PROJECT_DIR/frontend/public/assets/gauges/honda-logo.png" ]; then
    cp "$PROJECT_DIR/frontend/public/assets/gauges/honda-logo.png" "$SPLASH_DIR/logo.png"
    echo -e "${GREEN}Copied Honda logo${NC}"
else
    echo -e "${RED}Error: honda-logo.png not found at frontend/public/assets/gauges/honda-logo.png${NC}"
    exit 1
fi

echo -e "${YELLOW}[3/5] Creating Plymouth theme files...${NC}"

# Simple logo-only splash (clean black background)
cat > "$SPLASH_DIR/frank-hmi.script" << 'PLYSCRIPT'
# FRANK HMI Splash Script - Honda logo only

Window.SetBackgroundTopColor(0.0, 0.0, 0.0);
Window.SetBackgroundBottomColor(0.0, 0.0, 0.0);

logo.image = Image("logo.png");
logo.sprite = Sprite(logo.image);

logo_scale = 0.42;
logo.sprite.SetX(Window.GetWidth() / 2 - logo.image.GetWidth() * logo_scale / 2);
logo.sprite.SetY(Window.GetHeight() / 2 - logo.image.GetHeight() * logo_scale / 2);
logo.sprite.SetOpacity(0);

global.tick = 0;
fun refresh_callback() {
    global.tick++;

    # Soft fade in and hold.
    opacity = global.tick / 45.0;
    if (opacity > 1) opacity = 1;
    logo.sprite.SetOpacity(opacity);
}

Plymouth.SetRefreshFunction(refresh_callback);

fun quit_callback() {
    logo.sprite.SetOpacity(0);
}

Plymouth.SetQuitFunction(quit_callback);
PLYSCRIPT

cat > "$SPLASH_DIR/frank-hmi.plymouth" << EOF2
[Plymouth Theme]
Name=FRANK HMI
Description=FRANK Honda Logo Boot Splash
ModuleName=script

[script]
ImageDir=$SPLASH_DIR
ScriptFile=$SPLASH_DIR/frank-hmi.script
EOF2

echo -e "${YELLOW}[4/5] Configuring Plymouth...${NC}"
plymouth-set-default-theme -R frank-hmi
update-initramfs -u

echo -e "${YELLOW}[5/5] Configuring boot parameters...${NC}"

# Backup cmdline.txt
cp /boot/firmware/cmdline.txt /boot/firmware/cmdline.txt.backup 2>/dev/null || \
cp /boot/cmdline.txt /boot/cmdline.txt.backup 2>/dev/null || true

CMDLINE_FILE="/boot/firmware/cmdline.txt"
if [ ! -f "$CMDLINE_FILE" ]; then
    CMDLINE_FILE="/boot/cmdline.txt"
fi

if [ -f "$CMDLINE_FILE" ]; then
    sed -i 's/splash//g; s/quiet//g; s/plymouth.ignore-serial-consoles//g; s/video=HDMI-A-1:[^ ]*//g' "$CMDLINE_FILE"
    sed -i 's/$/ quiet splash plymouth.ignore-serial-consoles video=HDMI-A-1:1920x1200@60D/' "$CMDLINE_FILE"
    sed -i 's/  */ /g' "$CMDLINE_FILE"
    echo -e "${GREEN}Updated boot cmdline for splash + 1920x1200@60${NC}"
fi

CONFIG_FILE="/boot/firmware/config.txt"
if [ ! -f "$CONFIG_FILE" ]; then
    CONFIG_FILE="/boot/config.txt"
fi

if [ -f "$CONFIG_FILE" ]; then
    set_config_key "$CONFIG_FILE" "disable_splash" "1"
    set_config_key "$CONFIG_FILE" "disable_overscan" "1"
    set_config_key "$CONFIG_FILE" "framebuffer_width" "1920"
    set_config_key "$CONFIG_FILE" "framebuffer_height" "1200"
    set_config_key "$CONFIG_FILE" "hdmi_group" "2"
    set_config_key "$CONFIG_FILE" "hdmi_mode" "69"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     FRANK Boot Splash Installation Complete!                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Installed splash: Honda logo only (clean black background)."
echo ""
echo "To test the splash without rebooting:"
echo "  sudo plymouthd"
echo "  sudo plymouth --show-splash"
echo "  sleep 5"
echo "  sudo plymouth quit"
echo ""
echo -e "${YELLOW}Reboot to see the new boot splash:${NC}"
echo "  sudo reboot"
echo ""
