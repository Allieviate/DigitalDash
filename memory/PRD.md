# Vehicle HMI Dashboard - PRD

## Original Problem Statement
Build an OEM+ grade vehicle HMI for 1989 Honda Accord with custom gauge assets, VTEC functionality, Android Auto integration, PS3-style breathing background, and URUS-style gear indicator.

## User Choices & Updates
- Custom PNG gauge assets from user's WPF project
- Orbitron font for main dashboard text
- URUS Lamborghini-style gear indicator
- PS3 breathing background (red at 85+ mph - Type R mode)
- Orangish-red shift lights
- VTEC glow on needle center
- Android Auto mock panel in center (Maps, Music, Phone)
- Warning lights spread out at bottom

## Architecture
- **Backend**: FastAPI + MongoDB for settings persistence
- **Frontend**: React with custom gauge components
- **Data Flow**: Polling at 30fps for simulated vehicle data

## What's Been Implemented (Jan 7, 2026)

### Dashboard Features
- [x] Custom PNG gauge integration (user's WPF assets)
- [x] RPM Gauge with VTEC glow and shift light
- [x] Speed Gauge with needle animation
- [x] RPM digital readout in tachometer (Orbitron font)
- [x] Shift lights bar (7 LEDs, orangish-red color)
- [x] URUS-style gear indicator (42px current, 22px prev/next at 45% opacity)
- [x] Gear shift flash animations (white upshift, red downshift)
- [x] PS3 breathing background (transitions to red at 85+ mph)
- [x] Warning panel spread out at bottom
- [x] Turn signals (green indicators)
- [x] Boot sequence with Honda logo + gauge sweep

### Android Auto (MOCK)
- [x] Mock Android Auto panel in center gap
- [x] Maps view with navigation display
- [x] Music player view
- [x] Phone view
- [x] Home grid view
- [x] Bottom nav bar
- [x] Phone button toggle (appears when "connected")

### Fonts
- Eurostar (Regular, Black) - for labels
- Orbitron Medium - for main dash displays (speed, RPM, gear)

### Custom Assets
- honda-logo.png
- rpm-gauge.png, rpm-needle.png, rpm-needle-center.png
- rpm-small/medium/large-ticks.png, rpm-numbers.png
- spd-gauge.png, spd-medium/large-ticks.png, spd-numbers.png
- x1000-rpm.png

## Backlog

### P0 - Future (User will add)
- [ ] Custom fuel gauge PNG
- [ ] Custom coolant gauge PNG

### P1 - Future
- [ ] Real OBD-II/CAN bus integration
- [ ] Real Android Auto DHU integration
- [ ] Phone detection via USB/Bluetooth

### P2 - Future
- [ ] Data logging/export
- [ ] Custom gauge import in settings
- [ ] Audio warning alerts
