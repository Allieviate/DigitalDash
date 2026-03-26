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
│       │   ├── Dashboard.jsx          # Main layout (gauges + info gauges + AA logo)
│       │   ├── AndroidAutoPanel.jsx   # Simple launch/stop AA (no modes)
│       │   ├── DevicePromptModal.jsx  # Connection type prompt (no mode selection)
│       │   ├── SavedDevicesTab.jsx    # Device management by model name
│       │   ├── CustomGauges.jsx       # RPM + Speed gauges
│       │   ├── DashWidgets.jsx        # Shift lights + Digital speed/gear
│       │   ├── WarningPanel.jsx       # Warning lights + Turn signals (solid chevrons, SVG filter)
│       │   ├── InfoGauges.jsx         # Fuel, coolant, battery, oil gauges
│       │   └── Settings tabs...
│       ├── contexts/
│       │   ├── VehicleDataContext.js
│       │   ├── SettingsContext.js
│       │   └── ThemeContext.js
│       └── App.js
├── scripts/
│   ├── install_openauto.sh       # v12.0 (VERIFIED on Pi 5)
│   └── usb-phone-monitor.sh      # Model-based device detection
└── openauto-nav/                 # TBT navigation widget module
```

## Completed Features
- [x] All gauges (RPM, Speed, Shift lights, Gear, Warnings)
- [x] Turn signals: solid-filled chevrons with SVG filter glow (never hollow)
- [x] Info gauges on dashboard (Fuel, Coolant, Battery, Oil Pressure)
- [x] USB auto-detect using **model name** as stable device ID (not serial)
- [x] Device preferences prompt (connection type, remember device)
- [x] Saved Devices management (keyed by device_model)
- [x] Android Auto simple launch/stop (no embedded/fullscreen modes)
- [x] AA logo indicator near settings cog when phone connected
- [x] Auto-launch for known devices, auto-stop on disconnect
- [x] install_openauto.sh v12.0 (verified on Pi 5)
- [x] Turn-by-Turn navigation widget code generated (openauto-nav/)

## Key Changes (Mar 26, 2026)
- **Phase 3**: ADB detection uses `ro.product.model` as stable ID. Same phone model with different serial is recognized.
- **Phase 2**: Removed embedded/fullscreen modes. Removed /api/dhu/resize endpoint. Simplified AndroidAutoPanel.
- **Phase 1**: Turn signals always solid-filled thick chevron shapes. Inactive = dim dark green, Active = bright green + glow.

## Upcoming Tasks
- P0: User to test AA on Raspberry Pi hardware with Samsung phone
- P1: Raspberry Pi splash screen fix (1920x1080 logo sizing)
- P2: Visual polish & layout refinements
- P3: OBD1/OBD2 real data source integration
- P3: Theme customization
- P3: Drag-and-drop Dash Builder

## Critical Notes
- DO NOT add -DGST_BUILD=TRUE to cmake (QGlib unavailable on Bookworm)
- install_openauto.sh v12.0 VERIFIED - don't modify build steps
- Vehicle data is simulated via backend VehicleSimulator class
- Device preferences keyed on `device_model` (not `serial`) for Samsung compatibility
