# FRANK Dashboard - Vehicle HMI Application

## Original Problem Statement
Build a custom vehicle HMI (Human-Machine Interface) dashboard intended to run on a Raspberry Pi 5, with animated gauges (RPM, speed, gear), a boot sequence, settings panels, and Android Auto functionality.

## Architecture
```
/app
├── backend/
│   └── server.py       # FastAPI + WebSocket + DHU Controller + ADB Monitor + Device Prefs
├── frontend/
│   └── src/
│       ├── components/hmi/
│       │   ├── Dashboard.jsx          # Main layout (hides AA when no phone)
│       │   ├── AndroidAutoPanel.jsx   # AA panel (only when phone connected)
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
    ├── install_openauto.sh       # v12.0 (VERIFIED on Pi 5)
    ├── usb-phone-monitor.sh      # udev trigger script
    ├── setup_pi.sh
    └── rebuild_ground_up.sh
```

## Key Features
- **Auto-detect**: Backend ADB polling (4s interval) detects phone connect/disconnect
- **Device prompt**: First-time devices show preferences modal (USB/BT, Embedded/Fullscreen, Remember)
- **Auto-launch**: Known devices with skip_prompt=true launch AA without prompt
- **Auto-disconnect**: Phone unplug stops OpenAuto automatically
- **Clean UI**: AA panel hidden when no phone connected, no clutter
- **Saved Devices**: Settings tab to manage remembered devices

## Key API Endpoints
- `GET /api/dhu/status` - Status + phone_connected + device events
- `POST /api/dhu/device-event` - Called by udev/ADB on connect/disconnect
- `POST /api/dhu/device-preferences` - Save per-device prefs
- `GET /api/dhu/devices` - List known devices
- `DELETE /api/dhu/device-preferences/{serial}` - Remove device
- `POST /api/dhu/start` / `POST /api/dhu/stop` / `POST /api/dhu/resize`

## Completed Features
- [x] All gauges (RPM, Speed, Shift lights, Gear, Turn signals, Warnings)
- [x] Android Auto embedded/fullscreen modes
- [x] USB auto-detect via ADB polling + udev rules
- [x] Device preferences prompt + saved devices management
- [x] Auto-launch for known devices, auto-stop on disconnect
- [x] AA panel hidden when no phone connected (clean UI)
- [x] Settings persistence (LocalStorage)
- [x] install_openauto.sh v12.0 (verified on Pi 5)

## Bug Fixes Applied
- Fixed: AA panel always visible (now hidden when no phone)
- Fixed: Black screen on launch (fullscreen only when DHU running + mode=fullscreen)
- Fixed: Auto-connect not working (added ADB polling background task)
- Fixed: Device prompt not showing (ADB monitor triggers device-event flow)
- Fixed: Turn signal intermittent glow (SVG filter instead of CSS blur)

## Upcoming Tasks
- P2: Info gauges (Fuel, Coolant, Battery, Oil) on dashboard
- P2: Visual polish and layout refinements

## Critical Notes
- DO NOT add -DGST_BUILD=TRUE to cmake (QGlib unavailable on Bookworm)
- install_openauto.sh v12.0 VERIFIED — don't modify build steps
