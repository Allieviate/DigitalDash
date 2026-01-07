# Vehicle HMI Dashboard - PRD

## Original Problem Statement
Build an OEM+ grade vehicle HMI for 1989 Honda Accord with custom gauge assets, VTEC functionality, Android Auto integration, PS3-style breathing background, and URUS-style gear indicator.

## Latest Updates (Jan 7, 2026)
1. Android Auto panel moved UP (no longer blocking warning lights)
2. x1000 RPM image moved BELOW the RPM digital readout
3. Turn signals changed to clean automotive arrow SVG design
4. Image rendering quality improved (reduced pixelation)
5. Red background now gradually transitions from 86-120 mph (Type R mode)
6. Real Android Auto DHU integration for Raspberry Pi 5 Linux

## Architecture
- **Backend**: FastAPI + MongoDB + DHU Controller
- **Frontend**: React with custom gauge components
- **DHU Integration**: Subprocess management with X11 window control (wmctrl/xdotool)

## What's Been Implemented

### Dashboard Features
- [x] Custom PNG gauge integration (user's WPF assets)
- [x] RPM Gauge with VTEC glow and shift light
- [x] Speed Gauge with needle animation
- [x] RPM digital readout with x1000 label below
- [x] Shift lights bar (7 LEDs, orangish-red color)
- [x] URUS-style gear indicator (42px current, 22px prev/next at 45% opacity)
- [x] Gear shift flash animations (white upshift, red downshift)
- [x] PS3 breathing background with GRADUAL red transition (86-120 mph)
- [x] Warning panel spread out at bottom (40px gaps)
- [x] Clean automotive arrow SVG turn signals
- [x] Boot sequence with Honda logo + gauge sweep
- [x] Improved image rendering quality (GPU acceleration)

### Android Auto Integration
- [x] Mock Android Auto panel (Maps, Music, Phone, Home)
- [x] Panel positioned in center gap (not blocking warnings)
- [x] DHU Controller for Raspberry Pi 5 Linux
  - /api/dhu/start - Launch DHU with window config
  - /api/dhu/stop - Clean termination
  - /api/dhu/status - Check if running
- [x] X11 window management (wmctrl/xdotool)
- [x] Borderless window mode
- [x] Automatic window positioning

### Fonts
- Orbitron Medium - Main dash displays (speed, RPM, gear)
- Eurostar - Labels and headers

## Raspberry Pi 5 Deployment Notes
```bash
# Install dependencies
sudo apt-get install wmctrl xdotool

# Set DHU path in .env
DHU_PATH=/opt/android-auto/desktop-head-unit
DHU_CONFIG=/opt/android-auto/dhu.ini
```

## Backlog

### P0 - User Will Add
- [ ] Custom fuel gauge PNG
- [ ] Custom coolant gauge PNG

### P1 - Future
- [ ] Real OBD-II/CAN bus integration
- [ ] Phone detection via USB/Bluetooth
- [ ] Actual Android Auto phone pairing

### P2 - Future
- [ ] Data logging/export
- [ ] Custom gauge import in settings
- [ ] Audio warning alerts
