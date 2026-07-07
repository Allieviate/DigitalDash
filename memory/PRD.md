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
├── frontend/src/hooks/useLayoutStore.js  # Widget positions with baked-in defaults
├── frontend/public/assets/gauges/ # PNG backgrounds (rpm-gauge.png, spd-gauge.png)
├── scripts/
│   ├── fix_boot.sh                # Diagnose & fix black screen / kiosk auto-start
│   ├── build_for_pi.sh            # Safe build with localhost URL
│   ├── diagnose.sh                # Full system diagnostics
│   ├── setup_pi.sh                # Full Raspberry Pi setup
│   ├── setup_boot_splash.sh       # Plymouth boot splash (1920x1200)
│   ├── launch_kiosk.sh            # Chromium kiosk launcher (Wayland + X11)
│   └── frank-kiosk.service.sh     # Service management helper
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
- [x] Default layout baked into useLayoutStore.js (Feb 2026)
- [x] Kiosk auto-start fix script (fix_boot.sh) (Feb 2026)
- [x] Safe Pi build script (build_for_pi.sh) (Feb 2026)
- [x] Full diagnostic script (diagnose.sh) (Feb 2026)

## Key Technical Details
- GaugePod sweep: startAngle=150, endAngle=390, sweep=240 (matches PNG bezel)
- Needle: SVG line with CSS transformOrigin: 50px 50px, transform: rotate(Ndeg), transition: 100ms
- Backend: 60fps WebSocket + 60fps simulation tick
- RPM readout: fixed 130px width, flexShrink: 0 prevents layout reflow
- Boot sequence: Plymouth shows static Honda logo -> React picks up same logo -> crossfade to FRANK -> system checks -> gauge sweep -> dashboard
- Screen resolution: 1920x1200 (NOT 1080p)
- Kiosk: systemd services (frank-display, frank-backend, frank-frontend, frank-kiosk)
- Build for Pi: ALWAYS use `bash scripts/build_for_pi.sh` or `REACT_APP_BACKEND_URL=http://localhost:8001 npm run build`

## Upcoming Tasks
- P0: User runs fix_boot.sh on Pi and verifies boot-to-dashboard flow
- P1: Android Auto auto-launch Phase 3 (only on user request)
- P2: Turn-by-Turn Navigation Widget
- P3: OBD1/OBD2 real data source integration
- P4: Theme customization and multiple named layout presets
- P5: Startup engine rev sound synced to gauge sweep (toggleable)

## Known Constraints
- DO NOT re-implement AA auto-detect (caused hardware failures x3)
- DO NOT use sudo yarn build / sudo npm run build
- Gauge needles MUST use CSS transform:rotate, NOT SVG x1/y1 properties
- Vehicle telemetry data is MOCKED via backend VehicleSimulator
- Frontend .env on cloud has preview URL — Pi builds MUST override with localhost
