# FRANK Dashboard - Vehicle HMI Application

## Original Problem Statement
Build a custom vehicle HMI dashboard for Raspberry Pi 5 with animated gauges, boot sequence, settings, and Android Auto functionality.

## Architecture
```
/app
├── backend/server.py              # FastAPI + WebSocket + DHU Controller
├── frontend/src/components/hmi/
│   ├── Dashboard.jsx              # Main layout — 20+ individually editable widgets
│   ├── Retro89Cluster.jsx         # GaugePod: PNG background + SVG ticks/needle/VTEC overlay
│   ├── CustomGauges.jsx           # Legacy PNG-only gauges (preserved, not active in Dashboard)
│   ├── EditableWidget.jsx         # Drag/Scale/Rotate wrapper (touch+mouse, grid snap)
│   ├── EditModeLegend.jsx         # Grid snap toggle + Save/Reset/Cancel
│   ├── DashWidgets.jsx            # ShiftLightsBar, DigitalSpeed, GearDisplay
│   ├── WarningPanel.jsx           # WarningLight (bordered visible), TurnArrow (exported)
│   └── InfoGauges.jsx             # Coolant, Oil, Fuel, Battery gauges
├── frontend/public/assets/gauges/ # PNG gauge backgrounds (rpm-gauge.png, spd-gauge.png, etc.)
└── frontend/src/hooks/useLayoutStore.js  # localStorage widget layout persistence
```

## Completed Features
- [x] GaugePod: PNG backgrounds (rpm-gauge.png, spd-gauge.png) with SVG overlay (ticks, numbers, needle, VTEC, readout)
- [x] Smooth needle: CSS transform:rotate + transition:100ms (not SVG attributes)
- [x] VTEC indicator (red glow text, 3000-8000 RPM)
- [x] RPM digital readout — separate draggable widget (fixed 130px width, no reflow)
- [x] Individual turn signal arrows (left + right separately editable)
- [x] MIL Warning Lights — 7 lights with bordered pill containers, always visible
- [x] Dashboard Edit Mode — 20+ individually draggable/scalable/rotatable widgets
- [x] Grid snap (Off/20px/40px toggle with SVG grid overlay)
- [x] Touch event handling (Pi touchscreen compatible via getXY helper)
- [x] Speedometer: 9 readable ticks (0-160 by 20s)
- [x] All other gauges, shift lights, gear display, boot sequence, AA manual launch

## Key Changes (Jul 1, 2026 — Latest)
- PNG gauge backgrounds via SVG `<image>` tag — replaces SVG horseshoe band, keeps SVG overlay
- RPM readout extracted as separate draggable widget with fixed 130px width (fixes reflow bug)
- Turn arrows individually exported from WarningPanel and wrapped as separate EditableWidgets

## Upcoming Tasks
- P0: Verify on Raspberry Pi touchscreen
- P1: Android Auto auto-launch rebuild (on explicit request)
- P2: Splash screen fix (1920x1080)
- P3: OBD1/OBD2 real data integration
- P3: Theme customization
