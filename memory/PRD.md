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
│       │   ├── Retro89Cluster.jsx     # GaugePod (horseshoe SVG, VTEC, digital readout, smooth needle)
│       │   ├── EditableWidget.jsx     # Drag/Scale/Rotate wrapper (touch+mouse, grid snap)
│       │   ├── EditModeLegend.jsx     # Edit mode bar (hints + grid snap + Save/Reset/Cancel)
│       │   ├── DashWidgets.jsx        # ShiftLightsBar, DigitalSpeed, GearDisplay
│       │   ├── WarningPanel.jsx       # WarningLight (individual), TurnSignalsRow, CriticalWarningBanner
│       │   ├── InfoGauges.jsx         # CoolantGauge, OilPressureGauge, FuelGauge, BatteryGauge
│       │   ├── CustomGauges.jsx       # Legacy PNG-based gauges (preserved, not active)
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
│   ├── install_openauto.sh
│   └── usb-phone-monitor.sh
└── openauto-nav/
```

## Completed Features
- [x] Retro '89 horseshoe gauges (Orbitron font, maroon face, chrome rim)
- [x] VTEC engagement indicator (red text with glow, 3000-8000 RPM)
- [x] Digital RPM readout inside tachometer
- [x] Smooth needle animation (CSS transform:rotate + transition:100ms)
- [x] Speedometer: 9 readable ticks (0-160 by 20s)
- [x] Dashboard Edit Mode — 18 individually draggable/scalable/rotatable widgets
- [x] Grid snap (Off/20px/40px toggle with SVG grid overlay)
- [x] Touch event handling (Pi touchscreen compatible)
- [x] MIL Warning Lights visible at bottom (7 individual lights, opacity 0.35 when inactive)
- [x] Shift lights, Turn signals, Info gauges (Fuel, Coolant, Battery, Oil)
- [x] Digital Speed + Gear display (separately editable)
- [x] Android Auto manual launch/stop
- [x] Boot sequence with gauge sweep test
- [x] USB device detection by model name
- [x] Device preferences and saved devices

## Key Changes (Jul 1, 2026 — Bug Fixes)
- **FIX: Speedometer labels** — Reduced from 18 bunched ticks to 9 readable ticks (0,20,40...160), max=160
- **FIX: VTEC indicator** — Added `vtecRange` prop to GaugePod, renders red "VTEC" text with SVG glow filter inside gauge face when RPM in range
- **FIX: RPM digital readout** — Added `showDigitalValue` prop to GaugePod, shows numeric value (e.g. "3905") inside gauge
- **FIX: Needle smoothness** — Replaced SVG `<line x1/y1/x2/y2>` (doesn't support CSS transitions) with CSS `transform: rotate()` + `transition: 100ms ease-out` on a fixed line rotated around center
- **FIX: Warning lights visibility** — Increased inactive opacity from 0.20→0.35, inactive color from #3f3f46→#52525b
- **FIX: Touch events** — `getXY()` helper extracts coords from both mouse and touch events

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
- P0: User to verify all fixes on Raspberry Pi touchscreen
- P1: Android Auto auto-launch rebuild (on explicit request only)
- P2: Raspberry Pi splash screen fix (1920x1080 logo sizing)
- P3: OBD1/OBD2 real data source integration
- P3: Theme customization

## Critical Notes
- DO NOT re-implement Android Auto auto-detect/udev/ADB Monitor
- Vehicle data is MOCKED via backend VehicleSimulator class
- Pi build: `REACT_APP_BACKEND_URL=http://localhost:8001 yarn build` (never sudo)
- install_openauto.sh v12.0 VERIFIED — don't modify
- GaugePod needle uses CSS transform (not SVG attributes) for smooth animation
