#!/bin/bash
# =============================================================================
# FRANK Digital Instrument Cluster - Custom Boot Splash Setup
# Replaces Raspberry Pi boot sequence with FRANK boot animation
# =============================================================================

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     FRANK - Custom Boot Splash Setup                          ║"
echo "║     Raspberry Pi 5 Boot Animation                             ║"
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

echo -e "${YELLOW}[1/6] Installing Plymouth for boot splash...${NC}"
apt install -y plymouth plymouth-themes

echo -e "${YELLOW}[2/6] Creating FRANK boot theme directory...${NC}"
mkdir -p "$SPLASH_DIR"

# Copy logo to splash directory
if [ -f "$PROJECT_DIR/frontend/public/assets/gauges/honda-logo.png" ]; then
    cp "$PROJECT_DIR/frontend/public/assets/gauges/honda-logo.png" "$SPLASH_DIR/logo.png"
    echo -e "${GREEN}Copied Honda logo${NC}"
else
    echo -e "${RED}Warning: honda-logo.png not found${NC}"
fi

echo -e "${YELLOW}[3/6] Creating Plymouth theme files...${NC}"

# Create the main theme script
cat > "$SPLASH_DIR/frank-hmi.script" << 'PLYSCRIPT'
# FRANK HMI Boot Animation Script
# 10th Gen Honda style with "FRANK" reveal

# Set background to black
Window.SetBackgroundTopColor(0.0, 0.0, 0.0);
Window.SetBackgroundBottomColor(0.0, 0.0, 0.0);

# Load images
logo.image = Image("logo.png");
logo.sprite = Sprite(logo.image);

# Scale and center logo
logo_scale = 0.5;
logo.sprite.SetX(Window.GetWidth() / 2 - logo.image.GetWidth() * logo_scale / 2);
logo.sprite.SetY(Window.GetHeight() / 2 - logo.image.GetHeight() * logo_scale / 2 - 60);
logo.sprite.SetOpacity(0);

# Text settings
text_color.red = 1.0;
text_color.green = 1.0;
text_color.blue = 1.0;

# Create "FRAN" text
fran_image = Image.Text("FRAN", text_color.red, text_color.green, text_color.blue, 1, "Noto Sans Bold 48");
fran_sprite = Sprite(fran_image);
fran_sprite.SetX(Window.GetWidth() / 2 - fran_image.GetWidth() / 2 - 20);
fran_sprite.SetY(Window.GetHeight() / 2 + 40);
fran_sprite.SetOpacity(0);

# Create "K" text (Type R red)
k_image = Image.Text("K", 0.86, 0.15, 0.15, 1, "Noto Sans Black 56");
k_sprite = Sprite(k_image);
k_sprite.SetX(Window.GetWidth() / 2 + fran_image.GetWidth() / 2 - 20);
k_sprite.SetY(Window.GetHeight() / 2 + 36);
k_sprite.SetOpacity(0);

# Create subtitle
subtitle_image = Image.Text("DIGITAL INSTRUMENT CLUSTER", 0.5, 0.5, 0.5, 1, "Noto Sans 14");
subtitle_sprite = Sprite(subtitle_image);
subtitle_sprite.SetX(Window.GetWidth() / 2 - subtitle_image.GetWidth() / 2);
subtitle_sprite.SetY(Window.GetHeight() / 2 + 110);
subtitle_sprite.SetOpacity(0);

# Progress bar
progress_box.image = Image("progress_box.png");
progress_box.sprite = Sprite(progress_box.image);
progress_box.sprite.SetX(Window.GetWidth() / 2 - progress_box.image.GetWidth() / 2);
progress_box.sprite.SetY(Window.GetHeight() - 60);

progress_bar.original_image = Image("progress_bar.png");
progress_bar.sprite = Sprite();
progress_bar.sprite.SetX(Window.GetWidth() / 2 - progress_box.image.GetWidth() / 2 + 2);
progress_bar.sprite.SetY(Window.GetHeight() - 58);

# Animation state
global.phase = 0;
global.counter = 0;

fun refresh_callback() {
    global.counter++;
    
    # Phase 0: Logo fade in (0-60 frames = ~2 sec at 30fps)
    if (global.phase == 0) {
        opacity = global.counter / 60.0;
        if (opacity > 1) opacity = 1;
        logo.sprite.SetOpacity(opacity);
        
        if (global.counter >= 60) {
            global.phase = 1;
            global.counter = 0;
        }
    }
    
    # Phase 1: "FRAN" fade in (60-90 frames)
    if (global.phase == 1) {
        opacity = global.counter / 30.0;
        if (opacity > 1) opacity = 1;
        fran_sprite.SetOpacity(opacity);
        
        if (global.counter >= 30) {
            global.phase = 2;
            global.counter = 0;
        }
    }
    
    # Phase 2: "K" slam in (90-105 frames)
    if (global.phase == 2) {
        progress = global.counter / 15.0;
        if (progress > 1) progress = 1;
        
        # Aggressive scale animation
        scale = 2.0 - progress;
        if (scale < 1) scale = 1;
        
        k_sprite.SetOpacity(progress);
        
        if (global.counter >= 15) {
            global.phase = 3;
            global.counter = 0;
        }
    }
    
    # Phase 3: Subtitle fade in (105-135 frames)
    if (global.phase == 3) {
        opacity = global.counter / 30.0;
        if (opacity > 1) opacity = 1;
        subtitle_sprite.SetOpacity(opacity);
        
        if (global.counter >= 30) {
            global.phase = 4;
        }
    }
}

Plymouth.SetRefreshFunction(refresh_callback);

fun boot_progress_callback(duration, progress) {
    if (progress_bar.original_image) {
        new_width = progress_bar.original_image.GetWidth() * progress;
        if (new_width > 1) {
            progress_bar.image = progress_bar.original_image.Scale(new_width, progress_bar.original_image.GetHeight());
            progress_bar.sprite.SetImage(progress_bar.image);
        }
    }
}

Plymouth.SetBootProgressFunction(boot_progress_callback);

fun quit_callback() {
    logo.sprite.SetOpacity(0);
    fran_sprite.SetOpacity(0);
    k_sprite.SetOpacity(0);
    subtitle_sprite.SetOpacity(0);
}

Plymouth.SetQuitFunction(quit_callback);
PLYSCRIPT

# Create theme definition file
cat > "$SPLASH_DIR/frank-hmi.plymouth" << EOF
[Plymouth Theme]
Name=FRANK HMI
Description=FRANK Digital Instrument Cluster Boot Animation
ModuleName=script

[script]
ImageDir=$SPLASH_DIR
ScriptFile=$SPLASH_DIR/frank-hmi.script
EOF

# Create progress bar images
echo -e "${YELLOW}[4/6] Creating progress bar graphics...${NC}"

# Create a simple progress box (dark background)
convert -size 300x8 xc:'#1a1a1a' -fill '#333333' -draw "roundrectangle 0,0 299,7 4,4" "$SPLASH_DIR/progress_box.png" 2>/dev/null || {
    # Fallback if ImageMagick not installed
    echo -e "${YELLOW}ImageMagick not found, creating simple progress bar...${NC}"
    apt install -y imagemagick
    convert -size 300x8 xc:'#1a1a1a' -fill '#333333' -draw "roundrectangle 0,0 299,7 4,4" "$SPLASH_DIR/progress_box.png"
}

# Create progress bar (Type R red gradient)
convert -size 296x4 gradient:'#DC2626-#ffffff' -gravity center "$SPLASH_DIR/progress_bar.png"

echo -e "${YELLOW}[5/6] Configuring Plymouth...${NC}"

# Set as default theme
plymouth-set-default-theme -R frank-hmi

# Update initramfs
update-initramfs -u

echo -e "${YELLOW}[6/6] Configuring boot parameters...${NC}"

# Backup cmdline.txt
cp /boot/firmware/cmdline.txt /boot/firmware/cmdline.txt.backup 2>/dev/null || \
cp /boot/cmdline.txt /boot/cmdline.txt.backup 2>/dev/null || true

# Add quiet splash to boot params
CMDLINE_FILE="/boot/firmware/cmdline.txt"
if [ ! -f "$CMDLINE_FILE" ]; then
    CMDLINE_FILE="/boot/cmdline.txt"
fi

if [ -f "$CMDLINE_FILE" ]; then
    # Remove existing splash params and add new ones
    sed -i 's/splash//g; s/quiet//g; s/plymouth.ignore-serial-consoles//g' "$CMDLINE_FILE"
    sed -i 's/$/ quiet splash plymouth.ignore-serial-consoles/' "$CMDLINE_FILE"
    # Clean up multiple spaces
    sed -i 's/  */ /g' "$CMDLINE_FILE"
    echo -e "${GREEN}Updated boot parameters${NC}"
fi

# Disable rainbow splash
if [ -f /boot/firmware/config.txt ]; then
    if ! grep -q "disable_splash=1" /boot/firmware/config.txt; then
        echo "disable_splash=1" >> /boot/firmware/config.txt
    fi
elif [ -f /boot/config.txt ]; then
    if ! grep -q "disable_splash=1" /boot/config.txt; then
        echo "disable_splash=1" >> /boot/config.txt
    fi
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     FRANK Boot Splash Installation Complete!                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "The custom boot animation will show on next reboot."
echo ""
echo "To test the splash without rebooting:"
echo "  sudo plymouthd"
echo "  sudo plymouth --show-splash"
echo "  sleep 5"
echo "  sudo plymouth quit"
echo ""
echo "To revert to default splash:"
echo "  sudo plymouth-set-default-theme -R pix"
echo "  sudo update-initramfs -u"
echo ""
echo -e "${YELLOW}Reboot to see the new boot animation:${NC}"
echo "  sudo reboot"
echo ""
