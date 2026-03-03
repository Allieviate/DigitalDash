# FRANK Dashboard - Vehicle HMI Application

## Original Problem Statement
Build a custom vehicle HMI (Human-Machine Interface) dashboard intended to run on a Raspberry Pi 5, with animated gauges (RPM, speed, gear), a boot sequence, settings panels, and Android Auto functionality.

## Core Requirements
- Functional vehicle dashboard displaying RPM, speed, gear, and other data
- Accurate gauge needle animations matching gauge face markings
- Advanced gear shift animations (Lamborghini-style "pop and fade")
- Animated boot sequence with Honda logo
- Multi-tab settings panel (Diagnostics, Vehicle Parameters, Connectivity, Layout)
- Android Auto support via OpenAuto

## Architecture
```
/app
├── backend/
│   └── server.py       # FastAPI + WebSocket + DHU Controller
├── frontend/
│   ├── src/
│   │   ├── components/hmi/      # Core HMI components
│   │   │   ├── settings/        # Settings panel tabs
│   │   │   ├── ConnectivityTab.jsx  # Android Auto launch button
│   │   ├── contexts/
│   │   │   └── VehicleDataContext.js
│   │   └── App.js
│   └── tailwind.config.js
└── scripts/
    ├── install_openauto.sh      # v5.0 - openDsh fork
    ├── rebuild_ground_up.sh     # Frontend/Backend rebuild
    ├── diagnose.sh              # Troubleshooting helper
    └── setup_pi.sh
```

## Tech Stack
- Frontend: React, Tailwind CSS, Framer Motion
- Backend: FastAPI (Python), WebSocket
- Target: Raspberry Pi 5

## What's Been Implemented
- [x] Vehicle dashboard with RPM/Speed gauges
- [x] Accurate needle sweep angles
- [x] VTEC light positioning
- [x] Gear shift "pop and fade" animation
- [x] Boot sequence with animated Honda logo
- [x] Settings panel with multiple tabs
- [x] GeneralSettingsTab integration
- [x] ConnectivityTab with working OpenAuto launch button
- [x] Backend DHU Controller API (/api/dhu/start, /api/dhu/stop, /api/dhu/status)
- [x] install_openauto.sh v5.0 using openDsh fork

## Current Status

### OpenAuto Installation (USER VERIFICATION NEEDED)
- **Script**: `scripts/install_openauto.sh` v5.0
- **Approach**: Uses openDsh/aasdk + openDsh/openauto forks
- **Key difference**: Uses system protobuf (apt install) instead of FetchContent
- **Status**: Ready for testing on Pi

### Android Auto Integration
- **Backend API**: 
  - POST `/api/dhu/start` - Launch OpenAuto with window positioning
  - POST `/api/dhu/stop` - Stop OpenAuto
  - GET `/api/dhu/status` - Check if running
- **Frontend**: ConnectivityTab button wired to API
- **Binary path**: `/opt/openauto/openauto/build/bin/autoapp`

## Pending Issues

### P1: Intermittent Turn Signal Glow Bug
- **Status**: CSS enhanced, may still be intermittent
- **Next**: If persists, reimplement with SVG filters

## Upcoming Tasks
1. Test install_openauto.sh v5.0 on Pi 5
2. If openDsh fork fails, consider aa-proxy-rs as alternative
3. Test Android Auto launch button on Pi

## Key API Endpoints
- `/ws/vehicle-data` - WebSocket for vehicle data stream
- `/api/diagnostics` - GET diagnostic values
- `/api/dhu/start` - POST to launch OpenAuto
- `/api/dhu/stop` - POST to stop OpenAuto
- `/api/dhu/status` - GET OpenAuto status

## Key Files
- `scripts/install_openauto.sh` - v5.0 using openDsh fork
- `frontend/src/components/hmi/ConnectivityTab.jsx` - Launch button
- `backend/server.py` - DHU Controller class

## Alternative Approaches Considered
- **opencardev/openauto**: FetchContent protobuf hell on Pi 5
- **aa-proxy-rs**: Rust-based proxy, pre-built images available
- **OpenAuto Pro**: Commercial solution

## Notes for Development
- User environment is Raspberry Pi 5 (4GB)
- GitHub: https://github.com/Allieviate/DigitalDash (branch: Version-3)
- OpenAuto worked before as standalone - integration caused issues
- openDsh fork uses system protobuf = simpler build
