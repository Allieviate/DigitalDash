# FRANK Dashboard - Vehicle HMI Application

## Original Problem Statement
Build a custom vehicle HMI (Human-Machine Interface) dashboard intended to run on a Raspberry Pi 5, with animated gauges (RPM, speed, gear), a boot sequence, settings panels, and Android Auto functionality.

## Architecture
```
/app
├── backend/
│   └── server.py       # FastAPI + WebSocket + DHU Controller
├── frontend/
│   └── src/
│       ├── components/hmi/   # All dashboard components
│       ├── contexts/         # VehicleData, Settings, Theme contexts
│       └── App.js            # Main app with boot sequence
└── scripts/
    ├── install_openauto.sh   # v12.0 - Pi 5 complete build (VERIFIED WORKING)
    ├── setup_pi.sh           # Full Pi setup
    ├── rebuild_ground_up.sh  # Frontend/Backend rebuild
    └── diagnose.sh           # Troubleshooting helper
```

## Key API Endpoints
- `GET /api/vehicle-data` - Vehicle signals (simulated)
- `WS /ws/vehicle-data` - WebSocket live telemetry
- `GET /api/diagnostics` - Detailed OBD-style diagnostics
- `GET /api/themes` / `GET /api/themes/{id}` - Theme configs
- `GET /api/settings` / `POST /api/settings` - User settings (MongoDB)
- `POST /api/dhu/start` - Launch OpenAuto (supports mode: embedded/fullscreen)
- `POST /api/dhu/stop` - Stop OpenAuto
- `POST /api/dhu/resize` - Resize/reposition OpenAuto window live
- `GET /api/dhu/status` - OpenAuto running status

## Android Auto Integration
- **Modes**: Embedded (center panel, gauges visible) and Fullscreen (takes over screen)
- **Backend**: DHUController manages subprocess + window positioning via wmctrl/xdotool
- **Frontend**: AndroidAutoPanel with mode toggle, calls /api/dhu/start and /api/dhu/resize
- **Install Script**: install_openauto.sh v12.0 (VERIFIED on Pi 5, includes --force flag)
- **Binary paths**: Checks openauto-launcher, build/bin/autoapp, bin/autoapp

## Completed Features
- [x] Boot sequence animation
- [x] RPM gauge with VTEC indicator, shift light, digital readout
- [x] Speed gauge with needle rotation
- [x] Shift lights bar (7 LEDs, flash at redline)
- [x] Digital speed + gear display (Lambo URUS style)
- [x] Turn signals with green glow (SVG filter — bug FIXED)
- [x] Warning panel (7 warning lights)
- [x] Critical warning banner
- [x] Android Auto panel with API integration
- [x] Android Auto embedded vs fullscreen mode toggle
- [x] Live mode switching via /api/dhu/resize
- [x] Settings persistence via LocalStorage (all tabs wired)
- [x] Diagnostics tab reads live oil pressure and calculates IAT
- [x] install_openauto.sh v12.0 (verified on Pi 5, all patches included)
- [x] DHU controller with consistent binary path detection

## Completed Phases
- Phase 0 (P0): Android Auto API integration + Settings persistence + Script audit
- Phase P1: Embedded vs fullscreen mode + Turn signal glow fix + install_openauto.sh v12.0

## Upcoming Tasks
- **P2**: Info gauges (Fuel, Coolant, Battery, Oil) optionally on dashboard
- **P2**: Any remaining visual polish or layout refinements

## Notes
- User environment: Raspberry Pi 5 (4GB)
- Settings stored in browser LocalStorage under key `fran.dashboard.settings.v2`
- Vehicle data is simulated via backend VehicleSimulator class
- DO NOT add -DGST_BUILD=TRUE to openauto cmake (QGlib not available on Bookworm)
