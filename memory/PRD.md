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
│       │   ├── Dashboard.jsx          # Main layout - 20+ individually editable widgets
│       │   ├── CustomGauges.jsx       # PNG-based RpmGauge + SpeedGauge (active)
│       │   ├── Retro89Cluster.jsx     # SVG GaugePod (deprecated, not active)
│       │   ├── EditableWidget.jsx     # Drag/Scale/Rotate wrapper (touch+mouse, grid snap)
│       │   ├── EditModeLegend.jsx     # Grid snap toggle + Save/Reset/Cancel
│       │   ├── DashWidgets.jsx        # ShiftLightsBar, DigitalSpeed, GearDisplay
│       │   ├── WarningPanel.jsx       # WarningLight (bordered, visible), TurnArrow (exported)
│       │   ├── InfoGauges.jsx         # CoolantGauge, OilPressureGauge, FuelGauge, BatteryGauge
│       │   └── ...
│       ├── hooks/
│       │   └── useLayoutStore.js      # localStorage widget layout persistence
│       └── contexts/
```

## Completed Features
- [x] PNG-based gauge backgrounds (tachometer + speedometer)
- [x] VTEC engagement indicator (red text with glow, 3000-8000 RPM)
- [x] RPM Digital Readout — separate draggable widget
- [x] Individual turn signal arrows (left + right independently editable)
- [x] MIL Warning Lights — 7 lights with visible borders/backgrounds
- [x] Dashboard Edit Mode — 20+ individually draggable widgets
- [x] Grid snap (Off/20px/40px toggle with SVG overlay)
- [x] Touch event handling (Pi touchscreen compatible)
- [x] Smooth needle animation (CSS transform:rotate + transition)
- [x] Shift lights, Info gauges, Digital Speed/Gear display
- [x] Android Auto manual launch/stop
- [x] Boot sequence with gauge sweep test

## Key Changes (Jul 1, 2026 — Latest)
- **PNG Gauge Backgrounds**: Switched from SVG horseshoe (Retro89Cluster) back to PNG-based gauges (CustomGauges.jsx) per user request
- **RPM Readout separate**: Extracted from inside the gauge into its own EditableWidget
- **Individual Turn Arrows**: Exported TurnArrow from WarningPanel, wrapped each as separate EditableWidget
- **Warning Lights Visible**: Added border (rgba 0.08), background (rgba 0.04), brighter inactive color (#71717a), removed opacity approach

## Individually Editable Widgets (20+)
tachometer, speedometer, rpm-readout, digital-speed, gear-display, shift-lights, turn-left, turn-right, coolant, oil-pressure, fuel, battery, status, warn-check_engine, warn-oil_pressure_warning, warn-high_coolant, warn-low_fuel, warn-maintenance, warn-brake_warning, warn-abs_warning

## Upcoming Tasks
- P0: Verify all changes on Raspberry Pi touchscreen
- P1: Android Auto auto-launch rebuild (on explicit request)
- P2: Splash screen fix (1920x1080)
- P3: OBD1/OBD2 real data integration
- P3: Theme customization

## Critical Notes
- CustomGauges.jsx (PNG-based) is ACTIVE. Retro89Cluster.jsx (SVG) is deprecated.
- Vehicle data is MOCKED via backend VehicleSimulator
- DO NOT re-implement Android Auto auto-detect/udev
- Pi build: `REACT_APP_BACKEND_URL=http://localhost:8001 yarn build` (never sudo)
