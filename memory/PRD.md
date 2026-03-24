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
│       ├── components/hmi/
│       │   ├── Dashboard.jsx          # Main dashboard layout (embedded/fullscreen AA)
│       │   ├── AndroidAutoPanel.jsx   # AA panel with mode toggle + API integration
│       │   ├── DevicePromptModal.jsx  # First-time device preferences prompt
│       │   ├── SavedDevicesTab.jsx    # Device management in Settings
│       │   ├── CustomGauges.jsx       # RPM + Speed gauges
│       │   ├── DashWidgets.jsx        # Shift lights + Digital speed/gear
│       │   ├── TurnIndicators.jsx     # Turn signals with SVG glow
│       │   ├── WarningPanel.jsx       # Warning lights + critical banner
│       │   ├── SettingsTab.jsx        # Settings container + nav
│       │   ├── GeneralSettingsTab.jsx # Brightness, units, auto-dim
│       │   ├── ConnectivityTab.jsx    # WiFi, BT, volume, manual AA launch
│       │   ├── DiagnosticsTab.jsx     # Live OBD-style diagnostics
│       │   ├── DashBuilderTab.jsx     # Layout presets, widget toggles
│       │   └── InfoGauges.jsx         # Fuel, coolant, battery, oil gauges
│       ├── contexts/
│       │   ├── VehicleDataContext.js   # WebSocket vehicle telemetry
│       │   ├── SettingsContext.js      # LocalStorage persistence
│       │   └── ThemeContext.js         # Theme management
│       └── App.js
└── scripts/
    ├── install_openauto.sh       # v12.0 - Pi 5 build (VERIFIED)
    ├── usb-phone-monitor.sh      # udev trigger script
    ├── setup_pi.sh               # Full Pi setup
    └── rebuild_ground_up.sh      # Quick rebuild
```

## Key API Endpoints
- `GET /api/vehicle-data` - Vehicle signals (simulated)
- `WS /ws/vehicle-data` - WebSocket live telemetry
- `POST /api/dhu/start` - Launch OpenAuto (mode: embedded/fullscreen)
- `POST /api/dhu/stop` - Stop OpenAuto
- `POST /api/dhu/resize` - Resize window live
- `GET /api/dhu/status` - Status + pending device events
- `POST /api/dhu/device-event` - Called by udev on phone connect/disconnect
- `POST /api/dhu/device-preferences` - Save per-device preferences
- `GET /api/dhu/device-preferences/{serial}` - Get device prefs
- `GET /api/dhu/devices` - List all known devices
- `DELETE /api/dhu/device-preferences/{serial}` - Delete device prefs

## USB Auto-Detect Flow
1. Phone plugs in → udev rule fires → frank-usb-monitor script
2. Script detects phone via ADB → POST /api/dhu/device-event
3. Known device (skip_prompt=true) → auto-launches OpenAuto
4. New device → frontend shows DevicePromptModal
5. User picks prefs → saved to MongoDB → launches
6. Phone unplugs → auto-stops OpenAuto

## MongoDB Collections
- `device_preferences` - Per-device AA prefs (serial, name, connection_type, aa_mode, skip_prompt)

## Completed Features
- [x] Boot sequence animation
- [x] RPM + Speed gauges (PNG-based with needle rotation)
- [x] Shift lights, digital speed/gear, turn signals (SVG glow)
- [x] Warning panel (7 lights) + critical warning banner
- [x] Android Auto embedded vs fullscreen mode
- [x] USB auto-detect via udev + auto-launch
- [x] DevicePromptModal (connection type, display mode, remember checkbox)
- [x] Per-device preferences (MongoDB)
- [x] Saved Devices management in Settings
- [x] Auto-disconnect on phone unplug
- [x] Settings persistence via LocalStorage (all tabs)
- [x] Diagnostics reads live oil pressure + calculated IAT
- [x] install_openauto.sh v12.0 with udev auto-detect rules

## Upcoming Tasks
- **P2**: Info gauges (Fuel, Coolant, Battery, Oil) on dashboard
- **P2**: Visual polish and layout refinements

## Critical Notes
- DO NOT add -DGST_BUILD=TRUE to openauto cmake (QGlib unavailable on Bookworm)
- install_openauto.sh v12.0 VERIFIED on Pi 5
- Settings in localStorage under key `fran.dashboard.settings.v2`
