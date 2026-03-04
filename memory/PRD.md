# FRANK Dashboard - Vehicle HMI Application

## Original Problem Statement
Build a custom vehicle HMI (Human-Machine Interface) dashboard intended to run on a Raspberry Pi 5, with animated gauges (RPM, speed, gear), a boot sequence, settings panels, and Android Auto functionality.

## What Was Working Before (Version 2)
Based on the recovered zip file, Android Auto **was working** using:
- `opencardev/aasdk` and `opencardev/openauto` repos
- System protobuf (`apt install libprotobuf-dev`) - NOT FetchContent
- Build flags: `-DRPI3_BUILD=FALSE -DGST_BUILD=TRUE`
- Simple approach without complex protobuf source builds

## Current Solution (Version 8.0)
The `install_openauto.sh` script now uses the **original working method**:
1. Uses system protobuf from apt
2. Tries opencardev repos first, openDsh as fallback
3. Uses `-DRPI3_BUILD=FALSE -DGST_BUILD=TRUE` for Pi 5
4. Creates unified launchers: `openauto-launcher`, `android-auto`, `openauto`

## Architecture
```
/app
├── backend/
│   └── server.py       # FastAPI + WebSocket + DHU Controller
├── frontend/
│   └── src/components/hmi/
│       └── ConnectivityTab.jsx  # Android Auto launch button
└── scripts/
    ├── install_openauto.sh      # v8.0 - Original working method
    ├── rebuild_ground_up.sh     # Frontend/Backend rebuild
    ├── diagnose.sh              # Troubleshooting helper
    └── setup_pi.sh              # Full Pi setup
```

## Key API Endpoints
- `/ws/vehicle-data` - WebSocket for vehicle data stream
- `/api/diagnostics` - GET diagnostic values
- `/api/dhu/start` - POST to launch OpenAuto
- `/api/dhu/stop` - POST to stop OpenAuto
- `/api/dhu/status` - GET OpenAuto status

## Android Auto Integration
- **Backend**: DHUController in server.py manages OpenAuto subprocess
- **Frontend**: ConnectivityTab button calls `/api/dhu/start` and `/api/dhu/stop`
- **Binary path**: `/opt/openauto/openauto/build/bin/autoapp`
- **Launchers**: `openauto-launcher`, `android-auto`, `openauto`

## Pending Issues
- **P1**: Intermittent turn signal glow bug

## Future Tasks
- Embed Android Auto window inside FRANK Dashboard (using wmctrl/xdotool)
- Persist user settings to LocalStorage

## Notes
- User environment: Raspberry Pi 5 (4GB)
- GitHub: https://github.com/Allieviate/DigitalDash (branch: Version-3)
- The key insight was that Version 2 used system protobuf, not FetchContent
