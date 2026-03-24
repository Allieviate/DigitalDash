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
    ├── install_openauto.sh   # v11.0 - Pi 5 complete build
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
- `POST /api/dhu/start` - Launch OpenAuto with window config
- `POST /api/dhu/stop` - Stop OpenAuto
- `GET /api/dhu/status` - OpenAuto running status

## Android Auto Integration
- **Backend**: DHUController in server.py manages OpenAuto subprocess
- **Frontend**: AndroidAutoPanel calls /api/dhu/start, polls /api/dhu/status
- **Connectivity Tab**: Alternative launch button in Settings
- **Install Script**: install_openauto.sh v11.0 for Pi 5
- **Binary paths**: Checks /usr/local/bin/openauto-launcher, /opt/openauto/openauto/build/bin/autoapp, /opt/openauto/openauto/bin/autoapp
- **Launchers**: openauto-launcher, android-auto, openauto (symlinks)

## Completed Features
- [x] Boot sequence animation
- [x] RPM gauge with VTEC indicator, shift light, digital readout (PNG-based)
- [x] Speed gauge with needle rotation (PNG-based)
- [x] Shift lights bar (7 LEDs, flash at redline)
- [x] Digital speed + gear display (Lambo URUS style)
- [x] Turn signals with green glow
- [x] Warning panel (7 warning lights)
- [x] Critical warning banner
- [x] Android Auto panel with API integration (Phase 1)
- [x] Settings persistence via LocalStorage (Phase 1)
- [x] General Settings wired to context (brightness, units, auto-dim)
- [x] Connectivity wired to context (volume, wifi, bluetooth)
- [x] Vehicle Parameters wired to context (shift thresholds, warnings)
- [x] Dash Builder wired to context (preset, widgets, gauge scale)
- [x] Diagnostics tab reads live oil pressure and calculates IAT from RPM
- [x] install_openauto.sh script v11.0 with all patches
- [x] DHU controller with consistent binary path detection

## Pending Issues
- **P2**: Intermittent turn signal glow bug (green center inconsistent)

## Upcoming Tasks
- **P1**: Refine Android Auto UI integration (embedded vs overlay)
- **P2**: Info gauges (Fuel, Coolant, Battery, Oil) optionally on dashboard
- **P2**: Turn signal glow bug fix

## Notes
- User environment: Raspberry Pi 5 (4GB)
- GitHub: https://github.com/Allieviate/DigitalDash (branch: Version-3)
- Settings stored in browser LocalStorage under key `fran.dashboard.settings.v2`
- Vehicle data is simulated via backend VehicleSimulator class
