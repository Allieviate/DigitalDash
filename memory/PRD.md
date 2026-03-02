# FRANK Dashboard - Vehicle HMI Application

## Original Problem Statement
Build a custom vehicle HMI (Human-Machine Interface) dashboard intended to run on a Raspberry Pi, with animated gauges (RPM, speed, gear), a boot sequence, settings panels, and Android Auto functionality.

## Core Requirements
- Functional vehicle dashboard displaying RPM, speed, gear, and other data
- Accurate gauge needle animations matching gauge face markings
- Advanced gear shift animations (Lamborghini-style "pop and fade")
- Animated boot sequence with Honda logo
- Multi-tab settings panel (Diagnostics, Vehicle Parameters, Connectivity, Layout)
- Android Auto support via OpenAuto installation script

## User Personas
- Primary: Car enthusiast installing custom dashboard on Raspberry Pi
- Use case: Replace OEM dashboard with custom digital HMI

## Architecture
```
/app
├── backend/
│   └── main.py       # FastAPI server simulating vehicle data via WebSocket
├── frontend/
│   ├── src/
│   │   ├── components/hmi/      # Core HMI components
│   │   │   ├── settings/        # Settings panel tabs
│   │   ├── contexts/
│   │   │   └── VehicleDataContext.jsx
│   │   └── App.js
│   └── tailwind.config.js
└── scripts/
    ├── install_openauto.sh      # Android Auto installer (v3.0)
    └── setup_pi.sh
```

## Tech Stack
- Frontend: React, Tailwind CSS, Framer Motion
- Backend: FastAPI (Python), WebSocket
- Target: Raspberry Pi

## What's Been Implemented
- [x] Vehicle dashboard with RPM/Speed gauges
- [x] Accurate needle sweep angles
- [x] VTEC light positioning
- [x] Gear shift "pop and fade" animation
- [x] Boot sequence with animated Honda logo
- [x] Settings panel with multiple tabs
- [x] GeneralSettingsTab integration
- [x] install_openauto.sh v3.0 (FetchContent approach)

## Pending Issues

### P0: Android Auto Installation Script (USER VERIFICATION)
- **Status**: Script updated to v3.0, awaiting user test on Pi
- **Root Cause**: CMake target conflict - old Abseil/Protobuf in /usr/local conflicted with aasdk's FetchContent
- **Fix**: v3.0 completely removes all old libraries before letting aasdk fetch its own

### P1: Intermittent Turn Signal Glow Bug
- **Status**: Enhanced CSS applied, may still be intermittent
- **Next**: If persists, reimplement with SVG filters

## Upcoming Tasks
- Wire up "LAUNCH ANDROID AUTO / CARPLAY" button to backend
- Display AndroidAutoPanel.jsx when service starts

## Future/Backlog
- Persist user settings to LocalStorage
- Refactor install_openauto.sh into smaller helper scripts

## Key API Endpoints
- `/ws/vehicle-data` - WebSocket for vehicle data stream
- `/api/diagnostics` - GET diagnostic values

## Key Files
- `scripts/install_openauto.sh` - Android Auto installer
- `frontend/src/components/hmi/settings/SettingsTab.jsx` - Settings container
- `frontend/src/components/hmi/GearIndicator.jsx` - Gear animation
- `frontend/src/components/hmi/TurnIndicators.jsx` - Turn signal glow

## Notes for Development
- User environment is Raspberry Pi - cannot run build scripts here
- User frequently pushes to GitHub - always pull latest before changes
- GitHub: https://github.com/Allieviate/DigitalDash (branch: Version-3)
