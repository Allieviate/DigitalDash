# FRANK Dashboard - Vehicle HMI Application

## Original Problem Statement
Build a custom vehicle HMI dashboard for Raspberry Pi 5 with animated gauges, boot sequence, settings, and Android Auto.

## Architecture
```
/app
├── backend/server.py              # FastAPI + WebSocket (60fps) + DHU Controller
├── frontend/src/components/hmi/
│   ├── Dashboard.jsx              # 20+ individually editable widgets
│   ├── Retro89Cluster.jsx         # GaugePod: PNG bg + SVG overlay (240 sweep, CSS rotate needle)
│   ├── EditableWidget.jsx         # Drag/Scale/Rotate (touch+mouse, grid snap)
│   ├── EditModeLegend.jsx         # Grid snap + Save/Reset/Cancel
│   ├── BootSequence.jsx           # Seamless Plymouth-to-React boot handoff (5 phases)
│   ├── DashWidgets.jsx            # ShiftLightsBar, DigitalSpeed, GearDisplay
│   ├── WarningPanel.jsx           # WarningLight (bordered), TurnArrow (exported)
│   └── InfoGauges.jsx             # Coolant, Oil, Fuel, Battery
├── frontend/public/assets/gauges/ # PNG backgrounds (rpm-gauge.png, spd-gauge.png)
├── frontend/src/hooks/useLayoutStore.js
└── scripts/setup_boot_splash.sh   # Plymouth boot splash generator (1920x1200)
```

## Completed Features
- [x] GaugePod: PNG background + SVG overlay (240 sweep aligned to bezel)
- [x] Single RPM readout widget (separate draggable, fixed 130px width, no reflow)
- [x] VTEC indicator (red glow, 3000-8000 RPM)
- [x] Smooth needle (CSS transform:rotate + 100ms transition)
- [x] 20+ individually editable widgets (drag/scale/rotate)
- [x] Individual turn arrows, individual warning lights
- [x] Grid snap (Off/20px/40px)
- [x] Touch event handling (Pi touchscreen)
- [x] MIL Warning Lights - 7 bordered pills, always visible
- [x] Speedometer: 9 labels (0-160 by 20s)
- [x] Digital Speed, Gear display, Shift lights, Info gauges
- [x] Android Auto manual launch/stop
- [x] Boot sequence with seamless Plymouth-to-React handoff (Feb 2026)
  - 5 phases: logo -> name (FRANK) -> text (system checks) -> sweep (gauge test) -> dashboard
  - Honda logo starts visible (matches Plymouth exit state)
  - Framer Motion crossfade transitions
  - Progress bar at bottom
  - Verified: 19/19 frontend tests passed (iteration_18)

## Key Technical Details
- GaugePod sweep: startAngle=150, endAngle=390, sweep=240 (matches PNG bezel)
- Needle: SVG line with CSS transformOrigin: 50px 50px, transform: rotate(Ndeg), transition: 100ms
- Backend: 60fps WebSocket + 60fps simulation tick
- RPM readout: fixed 130px width, flexShrink: 0 prevents layout reflow
- Boot sequence: Plymouth shows static Honda logo -> React picks up with same logo visible -> crossfade to FRANK branding -> system checks -> gauge sweep -> dashboard
- Screen resolution: 1920x1200 (NOT 1080p)

## Upcoming Tasks
- P0: Hardware verification of boot splash on actual Raspberry Pi (user must test)
- P1: Android Auto auto-launch Phase 3 (only on user request - DO NOT auto-implement)
- P2: Turn-by-Turn Navigation Widget
- P3: OBD1/OBD2 real data source integration (replace mocked telemetry)
- P4: Theme customization and multiple named layout presets

## Backlog
- Refactor Dashboard.jsx (~300+ lines) into config-driven widget rendering
- Multiple saved layout presets in Edit Mode

## Known Constraints
- DO NOT re-implement AA auto-detect (caused hardware failures x3)
- DO NOT use sudo yarn build
- Gauge needles MUST use CSS transform:rotate, NOT SVG x1/y1 properties
- Vehicle telemetry data is MOCKED via backend VehicleSimulator
