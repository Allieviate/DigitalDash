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
│       │   ├── Dashboard.jsx          # Main layout - all widgets individually editable
│       │   ├── Retro89Cluster.jsx     # GaugePod component (horseshoe SVG gauges)
│       │   ├── EditableWidget.jsx     # Drag/Scale/Rotate wrapper (touch+mouse, grid snap)
│       │   ├── EditModeLegend.jsx     # Edit mode bar (hints + grid snap + Save/Reset/Cancel)
│       │   ├── DashWidgets.jsx        # ShiftLightsBar, DigitalSpeed, GearDisplay (separate exports)
│       │   ├── WarningPanel.jsx       # WarningLight (individual), TurnSignalsRow, CriticalWarningBanner
│       │   ├── InfoGauges.jsx         # CoolantGauge, OilPressureGauge, FuelGauge, BatteryGauge
│       │   ├── AndroidAutoPanel.jsx   # Simple launch/stop AA
│       │   ├── DevicePromptModal.jsx  # Connection type prompt
│       │   └── SavedDevicesTab.jsx    # Device management by model name
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
- [x] Retro '89 horseshoe gauge cluster (Orbitron font, maroon face, chrome rim)
- [x] Dashboard Edit Mode — all widgets individually draggable/scalable/rotatable
- [x] Individual warning lights (7 total, each independently editable)
- [x] Speed display and Gear display separated (individually editable)
- [x] Tachometer and Speedometer separated (individually editable)
- [x] Info gauges separated (Coolant, Oil, Fuel, Battery each independent)
- [x] Grid snap feature (Off / 20px / 40px toggle with visual grid overlay)
- [x] Touch event handling fixed (Pi touchscreen compatible via getXY helper)
- [x] Edit Mode persistence via localStorage
- [x] Edit Mode legend bar with Grid Snap toggle + Save/Reset/Cancel

## Key Changes (Jul 1, 2026 — Session 2)
- **ENHANCEMENT**: All grouped components broken into individual editable widgets:
  - Retro89Cluster → separate Tachometer + Speedometer
  - DigitalSpeedGear → separate DigitalSpeed + GearDisplay
  - Info gauges → individual Coolant, Oil Pressure, Fuel, Battery
  - WarningPanel → 7 individual WarningLight widgets
- **FEATURE**: Grid snap (Off/20px/40px cycle toggle) with SVG grid overlay
- **BUG FIX**: Touch events now handled via getXY() helper (fixes Pi touchscreen drag)
- **BUG FIX (previous)**: CSS `scale(undefined)` fix via default spreading

## Individually Editable Widgets (18 total)
| Widget ID | Component | Label |
|-----------|-----------|-------|
| tachometer | GaugePod | Tachometer |
| speedometer | GaugePod | Speedometer |
| digital-speed | DigitalSpeed | Speed |
| gear-display | GearDisplay | Gear |
| shift-lights | ShiftLightsBar | Shift Lights |
| turn-signals | TurnSignalsRow | Turn Signals |
| coolant | CoolantGauge | Coolant |
| oil-pressure | OilPressureGauge | Oil Pressure |
| fuel | FuelGauge | Fuel |
| battery | BatteryGauge | Battery |
| warn-check_engine | WarningLight | Check Engine |
| warn-oil_pressure_warning | WarningLight | Oil Pressure Warning |
| warn-high_coolant | WarningLight | High Coolant |
| warn-low_fuel | WarningLight | Low Fuel |
| warn-maintenance | WarningLight | Maintenance |
| warn-brake_warning | WarningLight | Brake Warning |
| warn-abs_warning | WarningLight | ABS Warning |
| status | Activity indicator | Status |

## Upcoming Tasks
- P0: User to verify Edit Mode on Raspberry Pi touchscreen
- P1: Android Auto auto-launch rebuild (on explicit request only)
- P2: Raspberry Pi splash screen fix (1920x1080 logo sizing)
- P3: OBD1/OBD2 real data source integration
- P3: Theme customization
- P3: Dashboard.jsx further refactoring if needed

## Critical Notes
- DO NOT re-implement Android Auto auto-detect/udev/ADB Monitor
- Vehicle data is MOCKED via backend VehicleSimulator class
- Device preferences keyed on `device_model` (not `serial`)
- Pi build: `REACT_APP_BACKEND_URL=http://localhost:8001 yarn build` (never sudo)
- install_openauto.sh v12.0 VERIFIED — don't modify build steps
