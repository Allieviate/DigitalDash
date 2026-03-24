# FRANK Dashboard - Vehicle HMI Application

## Original Problem Statement
Build a custom vehicle HMI (Human-Machine Interface) dashboard intended to run on a Raspberry Pi 5, with animated gauges (RPM, speed, gear), a boot sequence, settings panels, and Android Auto functionality.

## Architecture
```
/app
├── backend/
│   └── server.py       # FastAPI + WebSocket + DHU Controller + Device Prefs
├── frontend/
│   └── src/
│       ├── components/hmi/   # Dashboard, AndroidAutoPanel, DevicePromptModal, etc.
│       ├── contexts/         # VehicleData, Settings, Theme contexts
│       └── App.js            # Main app with boot sequence
└── scripts/
    ├── install_openauto.sh       # v12.0 - Pi 5 build (VERIFIED)
    ├── usb-phone-monitor.sh      # udev trigger script for auto-detect
    ├── setup_pi.sh               # Full Pi setup
    ├── rebuild_ground_up.sh      # Frontend/Backend rebuild
    └── diagnose.sh               # Troubleshooting helper
```

## Key API Endpoints
- `GET /api/vehicle-data` - Vehicle signals (simulated)
- `WS /ws/vehicle-data` - WebSocket live telemetry
- `GET /api/diagnostics` - OBD-style diagnostics
- `GET /api/themes` / `GET /api/themes/{id}` - Theme configs
- `GET /api/settings` / `POST /api/settings` - User settings
- `POST /api/dhu/start` - Launch OpenAuto (mode: embedded/fullscreen)
- `POST /api/dhu/stop` - Stop OpenAuto
- `POST /api/dhu/resize` - Resize window live
- `GET /api/dhu/status` - Status + pending device events
- `POST /api/dhu/device-event` - Called by udev when phone connects/disconnects
- `POST /api/dhu/device-preferences` - Save per-device preferences
- `GET /api/dhu/device-preferences/{serial}` - Get device preferences
- `GET /api/dhu/devices` - List all known devices
- `DELETE /api/dhu/device-preferences/{serial}` - Delete device preferences

## USB Auto-Detect Flow
1. Phone plugs in → udev rule fires → frank-usb-monitor script runs
2. Script detects phone via ADB → calls POST /api/dhu/device-event
3. Backend checks MongoDB for saved preferences:
   - **Known device (skip_prompt=true)**: Auto-launches OpenAuto
   - **New/unknown device**: Sets pending event, frontend shows DevicePromptModal
4. User picks: Wired/BT, Embedded/Fullscreen, "Remember" checkbox
5. Preferences saved to MongoDB, OpenAuto launches
6. Phone unplugs → udev fires disconnect → backend auto-stops OpenAuto

## MongoDB Collections
- `device_preferences` - Per-device AA preferences (serial, name, connection_type, aa_mode, skip_prompt)

## Completed Features
- [x] Boot sequence animation
- [x] RPM + Speed gauges (PNG-based with needle rotation)
- [x] Shift lights bar, digital speed/gear display
- [x] Turn signals with SVG glow (bug fixed)
- [x] Warning panel (7 lights) + critical warning banner
- [x] Android Auto embedded vs fullscreen mode
- [x] USB auto-detect via udev rules + auto-launch
- [x] DevicePromptModal (connection type, display mode, remember checkbox)
- [x] Per-device preferences stored in MongoDB
- [x] Auto-disconnect when phone unplugged
- [x] Manual launch fallback in Settings/Connectivity
- [x] Settings persistence via LocalStorage (all tabs)
- [x] Diagnostics reads live oil pressure + calculated IAT
- [x] install_openauto.sh v12.0 with udev auto-detect rules

## Completed Phases
- P0: Android Auto API integration + Settings persistence + Script audit
- P1: Embedded vs fullscreen mode + Turn signal fix + Script v12.0
- P1.5: USB auto-detect + device preferences + prompt modal

## Upcoming Tasks
- **P2**: Info gauges (Fuel, Coolant, Battery, Oil) on dashboard
- **P2**: Visual polish and layout refinements

## Critical Notes
- DO NOT add -DGST_BUILD=TRUE to openauto cmake (QGlib unavailable on Bookworm)
- install_openauto.sh is VERIFIED working on Pi 5 — do not modify build steps
- Settings stored in localStorage under key `fran.dashboard.settings.v2`
