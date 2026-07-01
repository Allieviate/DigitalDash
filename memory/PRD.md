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
│       │   ├── Dashboard.jsx          # Main layout with EditableWidget wrappers
│       │   ├── Retro89Cluster.jsx     # Retro '89 horseshoe gauges (Tach + Speedo)
│       │   ├── EditableWidget.jsx     # Drag/Scale/Rotate wrapper (window listeners)
│       │   ├── EditModeLegend.jsx     # Edit mode bottom bar (hints + Save/Reset/Cancel)
│       │   ├── AndroidAutoPanel.jsx   # Simple launch/stop AA
│       │   ├── DevicePromptModal.jsx  # Connection type prompt
│       │   ├── SavedDevicesTab.jsx    # Device management by model name
│       │   ├── CustomGauges.jsx       # Legacy RPM + Speed gauges
│       │   ├── DashWidgets.jsx        # Shift lights + Digital speed/gear
│       │   ├── WarningPanel.jsx       # Warning lights + Turn signals
│       │   └── InfoGauges.jsx         # Fuel, coolant, battery, oil gauges
│       ├── hooks/
│       │   └── useLayoutStore.js      # localStorage-based widget layout persistence
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
- [x] Turn signals: solid-filled chevrons with SVG filter glow
- [x] Info gauges on dashboard (Fuel, Coolant, Battery, Oil Pressure)
- [x] USB auto-detect using model name as stable device ID
- [x] Device preferences prompt (connection type, remember device)
- [x] Saved Devices management (keyed by device_model)
- [x] Android Auto simple launch/stop (manual, no auto-detect)
- [x] AA logo indicator near settings cog when phone connected
- [x] install_openauto.sh v12.0 (verified on Pi 5)
- [x] Turn-by-Turn navigation widget code generated (openauto-nav/)
- [x] Retro '89 horseshoe gauge cluster (Orbitron font, maroon face, chrome rim)
- [x] Dashboard Edit Mode — drag/scale/rotate any widget
- [x] Edit Mode persistence via localStorage
- [x] Edit Mode legend bar with Save/Reset/Cancel controls

## Key Changes (Jul 1, 2026)
- **BUG FIX**: Dashboard Edit Mode drag was broken due to CSS `scale(undefined)` in transform string. Fixed by spreading default values: `const t = { x: 0, y: 0, scale: 1, rotation: 0, ...(transform || {}) }`
- **Rewrite**: EditableWidget.jsx rewritten to use direct window event listeners (no useEffect lifecycle dependency), `{ capture: true }` for reliable event handling, and ref-based drag state to avoid re-render issues.

## Key Changes (Mar 26, 2026)
- **Retro '89 Cluster**: Built Retro89Cluster.jsx with horseshoe SVG gauges, Orbitron font, maroon gradient face, chrome rim.
- **Dashboard Edit Mode**: Built EditableWidget.jsx (drag/scale/rotate wrapper), useLayoutStore.js (localStorage persistence), EditModeLegend.jsx (instructions + action buttons).
- **Phase 3 Rollback**: ADB detection/auto-launch and embedded AA window completely removed for stability.

## Upcoming Tasks
- P0: User to verify Edit Mode on Raspberry Pi touchscreen
- P1: Android Auto auto-launch rebuild (on explicit request only)
- P2: Raspberry Pi splash screen fix (1920x1080 logo sizing)
- P3: OBD1/OBD2 real data source integration
- P3: Theme customization
- P3: Dashboard.jsx refactoring (extract layout config)

## Critical Notes
- DO NOT add -DGST_BUILD=TRUE to cmake (QGlib unavailable on Bookworm)
- install_openauto.sh v12.0 VERIFIED - don't modify build steps
- Vehicle data is MOCKED via backend VehicleSimulator class
- Device preferences keyed on `device_model` (not `serial`) for Samsung compatibility
- DO NOT re-implement Android Auto auto-detect/udev/ADB Monitor unless explicitly requested
- When building for Pi: Use `REACT_APP_BACKEND_URL=http://localhost:8001 yarn build` (never sudo)
