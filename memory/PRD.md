# Vehicle HMI Dashboard - PRD

## Original Problem Statement
Build an OEM+ grade vehicle HMI for 1989 Honda Accord that can:
- Always run Digital Dash (RPM, speed, gear, warnings)
- Optionally bring Android Auto to foreground (future phase)
- Never stop reading vehicle data
- Always show critical warnings (coolant overheat, low oil pressure)
- Behave like a real car: boot sequence, smooth transitions, fast toggle
- Settings for vehicle sensor readings/diagnostics like OBD scanner
- Reference: Haltech, Ktuner V2, 11th Gen Honda Civic Type R

## User Choices
- Web-based dashboard with desktop compatibility
- Simulated data (with OBD toggle in settings for future)
- Digital Dash focus first (Android Auto as future phase)
- Customizable themes (Type R, Retro '89, Clean OEM)
- Single-user standalone with settings persistence
- User provided custom PNG gauge assets from WPF project

## Architecture
- **Backend**: FastAPI + MongoDB for settings persistence
- **Frontend**: React with custom gauge components
- **Data Flow**: Polling at 30fps for simulated vehicle data

## Core Requirements (Static)
1. Dual-gauge layout (1920x720): RPM left, Speed right
2. Boot sequence with Honda logo and gauge sweep
3. Real-time vehicle data simulation
4. Critical warning system (overlay alerts)
5. Settings persistence in MongoDB
6. OBD-style diagnostics panel
7. Theme customization

## What's Been Implemented (Jan 7, 2026)
### Backend
- [x] Vehicle data simulation service (RPM, speed, gear, fuel, coolant, etc.)
- [x] User settings CRUD API
- [x] Diagnostics API (OBD scanner style data)
- [x] Theme configuration API
- [x] WebSocket endpoint for real-time data

### Frontend
- [x] Boot sequence with Honda Frankenstein logo + gauge sweep
- [x] Custom PNG gauge integration (user's WPF assets)
- [x] RPM Gauge with VTEC glow and shift light
- [x] Speed Gauge with needle animation
- [x] Shift lights bar (7 progressive LEDs)
- [x] Digital speed + gear indicator (prev/current/next)
- [x] Indicators row (CEL, MAINT, turn signals)
- [x] Fuel/Coolant bars with warning states
- [x] Settings panel (Appearance, Gauges, Data Source, Diagnostics)
- [x] Theme switcher (Type R, Retro '89, Clean OEM)
- [x] Diagnostics panel (Engine, Fuel, Electrical, Transmission, Oil)
- [x] Critical warning banner overlay

### Assets Integrated
- honda-logo.png
- rpm-gauge.png, rpm-needle.png, rpm-needle-center.png
- rpm-small/medium/large-ticks.png, rpm-numbers.png
- spd-gauge.png, spd-medium/large-ticks.png, spd-numbers.png
- x1000-rpm.png

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Core dashboard functionality
- [x] Custom gauge integration
- [x] Settings persistence

### P1 (High Priority) - Future
- [ ] Real OBD-II/CAN bus integration
- [ ] Android Auto integration
- [ ] GPIO/HID input support
- [ ] Custom gauge import feature

### P2 (Medium Priority) - Future
- [ ] DTC code clearing
- [ ] Data logging/export
- [ ] Performance metrics (0-60, lap times)
- [ ] Night/Day auto-brightness

### P3 (Low Priority) - Future
- [ ] Audio alerts for warnings
- [ ] Custom boot logo upload
- [ ] Remote access via mobile

## Next Tasks
1. Real OBD-II adapter integration
2. Android Auto DHU integration
3. GPIO button mapping for in-car controls
4. Custom gauge PNG upload in settings
