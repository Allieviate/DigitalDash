from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import math
import time
from enum import Enum
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - with safe fallbacks
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'frank_hmi')]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ WARNING THRESHOLDS ============
# Named so the simulator and the future CAN source derive warnings from
# the same numbers. Previously these were inline literals that the
# simulator's own output range could never reach.

LOW_FUEL_PCT = 0.12
COOLANT_WARN_C = 110.0
OIL_PRESSURE_WARN_PSI = 15.0

# K-series VTEC crossover. The frontend currently glows from 3000rpm,
# which is wrong for a K20 - real engagement is around here, and once
# CAN is wired this comes from the VTS bit in packet 0x661 anyway.
VTEC_ENGAGE_RPM = 5800.0

# How long fuel takes to go from full to empty in the bench cycle.
FUEL_CYCLE_SECONDS = 900.0

# ============ MODELS ============

class VehicleSignals(BaseModel):
    rpm: float = 900.0
    speed_mph: float = 0.0
    gear: int = 0  # -1=R, 0=N, 1..6 forward
    fuel_pct: float = 1.0
    coolant_temp_c: float = 25.0
    oil_pressure_psi: float = 40.0
    battery_voltage: float = 12.6
    # Available from KPro CAN, previously absent from the backend.
    # boost_psi and ac_on were already in the frontend's DEFAULT_SIGNALS
    # but nothing ever sent them.
    intake_air_temp_c: float = 25.0
    throttle_pct: float = 0.0
    map_kpa: float = 30.0
    boost_psi: float = 0.0
    vtec_active: bool = False
    ac_on: bool = False
    turn_left: bool = False
    turn_right: bool = False
    check_engine: bool = False
    maintenance: bool = False
    oil_pressure_warning: bool = False
    low_fuel: bool = False
    high_coolant: bool = False
    abs_warning: bool = False
    airbag_warning: bool = False
    brake_warning: bool = False
    headlights: bool = False
    high_beams: bool = False

class ThemeConfig(BaseModel):
    id: str
    name: str
    accent: str
    glow: str
    bg_texture: str

class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    theme_id: str = "type_r"
    data_source: str = "simulation"  # simulation, obd1, or obd2
    performance_mode: str = "high_performance"  # high_performance or low_performance
    units: str = "imperial"  # imperial or metric
    gauge_style: str = "modern"  # modern, classic, minimal
    warning_sounds: bool = True
    chime_volume: int = 70
    bluetooth_enabled: bool = True
    brightness: int = 100
    show_diagnostics: bool = False
    custom_gauges: Dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSettingsUpdate(BaseModel):
    theme_id: Optional[str] = None
    data_source: Optional[str] = None
    performance_mode: Optional[str] = None
    units: Optional[str] = None
    gauge_style: Optional[str] = None
    warning_sounds: Optional[bool] = None
    chime_volume: Optional[int] = None
    bluetooth_enabled: Optional[bool] = None
    brightness: Optional[int] = None
    show_diagnostics: Optional[bool] = None
    custom_gauges: Optional[Dict[str, Any]] = None

# ============ SIGNAL PROVENANCE ============
# Where each field will actually come from once the car is running.
# The simulator produces all of them, which is exactly why a green
# bench test was misleading: it made body-electrical and analog-sender
# signals look as real as ECU data.

class SignalOrigin(str, Enum):
    ECU_CAN = "ecu_can"            # Hondata KPro CAN broadcast
    KPRO_ANALOG = "kpro_analog"    # sender wired to a KPro analog input
    BODY_GPIO = "body_gpio"        # 12V body circuit into Pi GPIO
    DERIVED = "derived"            # computed from another signal
    UNAVAILABLE = "unavailable"    # no source identified yet

SIGNAL_SOURCES: Dict[str, Dict[str, str]] = {
    "rpm":               {"origin": SignalOrigin.ECU_CAN, "detail": "0x660"},
    "speed_mph":         {"origin": SignalOrigin.ECU_CAN, "detail": "0x660 (kph)"},
    "gear":              {"origin": SignalOrigin.ECU_CAN, "detail": "0x660"},
    "battery_voltage":   {"origin": SignalOrigin.ECU_CAN, "detail": "0x660 (volt/10)"},
    "intake_air_temp_c": {"origin": SignalOrigin.ECU_CAN, "detail": "0x661 IAT"},
    "coolant_temp_c":    {"origin": SignalOrigin.ECU_CAN, "detail": "0x661 ECT"},
    "check_engine":      {"origin": SignalOrigin.ECU_CAN, "detail": "0x661 MIL"},
    "vtec_active":       {"origin": SignalOrigin.ECU_CAN, "detail": "0x661 VTS"},
    "throttle_pct":      {"origin": SignalOrigin.ECU_CAN, "detail": "0x662 TPS"},
    "map_kpa":           {"origin": SignalOrigin.ECU_CAN, "detail": "0x662 MAP"},

    "boost_psi":         {"origin": SignalOrigin.DERIVED, "detail": "from map_kpa"},
    "low_fuel":          {"origin": SignalOrigin.DERIVED, "detail": "fuel_pct"},
    "high_coolant":      {"origin": SignalOrigin.DERIVED, "detail": "coolant_temp_c"},
    "oil_pressure_warning": {"origin": SignalOrigin.DERIVED, "detail": "oil_pressure_psi"},

    # Not present anywhere in the Hondata CAN spec. These need senders
    # wired into KPro analog inputs, broadcast on 0x667 / 0x668.
    "fuel_pct":          {"origin": SignalOrigin.KPRO_ANALOG, "detail": "sender not yet wired"},
    "oil_pressure_psi":  {"origin": SignalOrigin.KPRO_ANALOG, "detail": "sender not yet wired"},

    # Body electrical. 12V switched circuits, needs optocouplers to GPIO.
    "turn_left":         {"origin": SignalOrigin.BODY_GPIO, "detail": "not yet wired"},
    "turn_right":        {"origin": SignalOrigin.BODY_GPIO, "detail": "not yet wired"},
    "headlights":        {"origin": SignalOrigin.BODY_GPIO, "detail": "not yet wired"},
    "high_beams":        {"origin": SignalOrigin.BODY_GPIO, "detail": "not yet wired"},
    "brake_warning":     {"origin": SignalOrigin.BODY_GPIO, "detail": "not yet wired"},
    "abs_warning":       {"origin": SignalOrigin.BODY_GPIO, "detail": "ABS module, not yet wired"},
    "airbag_warning":    {"origin": SignalOrigin.BODY_GPIO, "detail": "SRS module, not yet wired"},
    "ac_on":             {"origin": SignalOrigin.BODY_GPIO, "detail": "not yet wired"},

    "maintenance":       {"origin": SignalOrigin.UNAVAILABLE, "detail": "no source identified"},
}

# Raw signals get overridden before warnings are derived, so forcing
# coolant_temp_c to 118 makes high_coolant come true the same way the
# real car would. Flags with no underlying signal are forced directly.
RAW_SIGNAL_FIELDS = {
    "rpm", "speed_mph", "gear", "fuel_pct", "coolant_temp_c",
    "oil_pressure_psi", "battery_voltage", "intake_air_temp_c",
    "throttle_pct", "map_kpa",
}

DERIVED_FLAG_FIELDS = {"low_fuel", "high_coolant", "oil_pressure_warning", "boost_psi", "vtec_active"}

LAMP_TEST_FIELDS = [
    "check_engine", "maintenance", "oil_pressure_warning", "low_fuel",
    "high_coolant", "abs_warning", "airbag_warning", "brake_warning",
    "turn_left", "turn_right", "headlights", "high_beams",
]

# ============ THEMES ============

THEMES = {
    "type_r": ThemeConfig(
        id="type_r",
        name="Type R",
        accent="#DC2626",
        glow="0 0 20px rgba(220, 38, 38, 0.5)",
        bg_texture="carbon_fiber"
    ),
    "retro_89": ThemeConfig(
        id="retro_89",
        name="Retro '89",
        accent="#F59E0B",
        glow="0 0 15px rgba(245, 158, 11, 0.4)",
        bg_texture="grid_scanlines"
    ),
    "clean_oem": ThemeConfig(
        id="clean_oem",
        name="Clean OEM",
        accent="#ffffff",
        glow="none",
        bg_texture="matte_black"
    )
}

# ============ VEHICLE DATA SIMULATION ============

class VehicleSimulator:
    """Bench harness. Its job is to let every gauge and every warning
    lamp be exercised without the engine, so that when CAN is wired in
    the wiring is the only untested variable."""

    def __init__(self):
        self.t0 = time.time()
        self.last_update = self.t0
        self.last_blink = 0.0
        self.blink_state = False
        self.signals = VehicleSignals()
        self.overrides: Dict[str, Any] = {}
        self.lamp_test_until: float = 0.0

    def update(self) -> VehicleSignals:
        now = time.time()
        t = now - self.t0

        # Integrate against real elapsed time. This used to be a fixed
        # 1/60 regardless of how often update() was actually called,
        # so coolant warmed at a rate that depended on how many
        # clients happened to be polling.
        dt = min(max(now - self.last_update, 0.0), 0.25)
        self.last_update = now

        # Simulate driving pattern
        load = (math.sin(t * 0.15 - math.pi / 2) * 0.5) + 0.5

        # Speed and RPM
        self.signals.speed_mph = max(0.0, load * 120.0)
        self.signals.rpm = max(900.0, min(8000.0, 1200.0 + self.signals.speed_mph * 55 + load * 1200))

        # Gear selection based on speed
        sp = self.signals.speed_mph
        if sp < 3:
            self.signals.gear = 0
        elif sp < 30:
            self.signals.gear = 1
        elif sp < 50:
            self.signals.gear = 2
        elif sp < 70:
            self.signals.gear = 3
        elif sp < 95:
            self.signals.gear = 4
        elif sp < 120:
            self.signals.gear = 5
        else:
            self.signals.gear = 6

        # Fuel: sawtooth rather than a one-way drain. The old version
        # hit zero after ~17 minutes and stayed there, so LOW FUEL was
        # permanently lit on a kiosk that runs for hours and the lamp
        # could never be observed switching on.
        self.signals.fuel_pct = 1.0 - ((t / FUEL_CYCLE_SECONDS) % 1.0)

        # Coolant temperature based on load. Stays in the healthy band
        # on purpose - overheat is reachable through injection, not by
        # a car that is running correctly.
        coolant_target = 35.0 + load * 45.0 + (self.signals.speed_mph / 170.0) * 8.0
        coolant_target = max(20.0, min(98.0, coolant_target))
        self.signals.coolant_temp_c += (coolant_target - self.signals.coolant_temp_c) * 0.35 * dt

        # Intake air temp trends with load
        self.signals.intake_air_temp_c = 25.0 + load * 20.0

        # Throttle and manifold pressure (naturally aspirated K-series:
        # high vacuum at idle, approaching atmospheric at WOT)
        self.signals.throttle_pct = min(100.0, load * 100.0)
        self.signals.map_kpa = 30.0 + load * 71.0

        # Oil pressure based on RPM
        self.signals.oil_pressure_psi = 20 + (self.signals.rpm / 8000) * 60

        # Battery voltage (simulate charging)
        self.signals.battery_voltage = 12.6 + (self.signals.rpm / 8000) * 1.8

        # Turn signal simulation
        phase = t % 20.0
        left_req = 5.0 <= phase < 10.0
        right_req = 10.0 <= phase < 15.0
        hazard_req = phase >= 18.0

        if (now - self.last_blink) > 0.5:
            self.blink_state = not self.blink_state
            self.last_blink = now

        self.signals.turn_left = (left_req or hazard_req) and self.blink_state
        self.signals.turn_right = (right_req or hazard_req) and self.blink_state

        # Lights
        self.signals.headlights = True
        self.signals.high_beams = sp > 60
        self.signals.ac_on = (t % 60.0) < 30.0

        self._apply_raw_overrides()
        self._derive()
        self._apply_flag_overrides()
        self._apply_lamp_test(now)

        return self.signals

    def _apply_raw_overrides(self):
        for key, value in self.overrides.items():
            if key in RAW_SIGNAL_FIELDS:
                setattr(self.signals, key, value)

    def _derive(self):
        """Everything computed from a raw signal lives here, so the
        simulator and the future CAN source can share it."""
        self.signals.low_fuel = self.signals.fuel_pct <= LOW_FUEL_PCT
        self.signals.high_coolant = self.signals.coolant_temp_c >= COOLANT_WARN_C
        self.signals.oil_pressure_warning = self.signals.oil_pressure_psi < OIL_PRESSURE_WARN_PSI
        self.signals.vtec_active = self.signals.rpm >= VTEC_ENGAGE_RPM
        self.signals.boost_psi = (self.signals.map_kpa - 101.3) * 0.145038

    def _apply_flag_overrides(self):
        for key, value in self.overrides.items():
            if key not in RAW_SIGNAL_FIELDS:
                setattr(self.signals, key, value)

    def _apply_lamp_test(self, now: float):
        if now < self.lamp_test_until:
            for field in LAMP_TEST_FIELDS:
                setattr(self.signals, field, True)

    # ---- injection control ----

    def set_overrides(self, overrides: Dict[str, Any]) -> Dict[str, Any]:
        valid = VehicleSignals.model_fields.keys()
        unknown = [k for k in overrides if k not in valid]
        if unknown:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown signal(s): {', '.join(sorted(unknown))}"
            )
        self.overrides.update(overrides)
        return self.overrides

    def clear_overrides(self, fields: Optional[List[str]] = None) -> Dict[str, Any]:
        if fields is None:
            self.overrides.clear()
        else:
            for field in fields:
                self.overrides.pop(field, None)
        return self.overrides

    def start_lamp_test(self, seconds: float):
        self.lamp_test_until = time.time() + seconds

simulator = VehicleSimulator()

# ============ API ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Accord HMI API v1.0"}

@api_router.get("/vehicle-data", response_model=VehicleSignals)
async def get_vehicle_data():
    """Get current vehicle signals (simulated)"""
    return simulator.update()

@api_router.get("/signal-sources")
async def get_signal_sources():
    """Where each signal will really come from once the car is running.

    The dash should treat anything that is not ecu_can as unproven
    until its sender or GPIO input is physically wired."""
    return {
        "sources": SIGNAL_SOURCES,
        "thresholds": {
            "low_fuel_pct": LOW_FUEL_PCT,
            "coolant_warn_c": COOLANT_WARN_C,
            "oil_pressure_warn_psi": OIL_PRESSURE_WARN_PSI,
            "vtec_engage_rpm": VTEC_ENGAGE_RPM,
        },
    }

@api_router.get("/themes", response_model=List[ThemeConfig])
async def get_themes():
    """Get available themes"""
    return list(THEMES.values())

@api_router.get("/themes/{theme_id}", response_model=ThemeConfig)
async def get_theme(theme_id: str):
    """Get specific theme by ID"""
    if theme_id in THEMES:
        return THEMES[theme_id]
    return THEMES["type_r"]

@api_router.get("/settings", response_model=UserSettings)
async def get_settings():
    """Get user settings"""
    settings = await db.settings.find_one({}, {"_id": 0})
    if settings:
        if isinstance(settings.get('updated_at'), str):
            settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
        return UserSettings(**settings)
    # Return default settings
    default = UserSettings()
    return default

@api_router.post("/settings", response_model=UserSettings)
async def save_settings(settings_update: UserSettingsUpdate):
    """Update user settings"""
    existing = await db.settings.find_one({}, {"_id": 0})

    if existing:
        update_data = settings_update.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.settings.update_one({}, {"$set": update_data})
        updated = await db.settings.find_one({}, {"_id": 0})
        if isinstance(updated.get('updated_at'), str):
            updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
        return UserSettings(**updated)
    else:
        new_settings = UserSettings(**settings_update.model_dump(exclude_unset=True))
        doc = new_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return new_settings

# ============ BENCH FAULT INJECTION ============

class InjectRequest(BaseModel):
    """Force signals or flags to a value. Raw signals are applied
    before warnings are derived, so injecting coolant_temp_c=118
    lights the overheat lamp the same way the real car would."""
    overrides: Dict[str, Any]

class ClearRequest(BaseModel):
    fields: Optional[List[str]] = None

class LampTestRequest(BaseModel):
    seconds: float = 10.0

@api_router.post("/sim/inject")
async def inject_signals(request: InjectRequest):
    active = simulator.set_overrides(request.overrides)
    return {"status": "ok", "overrides": active}

@api_router.get("/sim/overrides")
async def get_overrides():
    return {"overrides": simulator.overrides, "lamp_test_active": time.time() < simulator.lamp_test_until}

@api_router.post("/sim/clear")
async def clear_overrides(request: ClearRequest):
    remaining = simulator.clear_overrides(request.fields)
    return {"status": "ok", "overrides": remaining}

@api_router.post("/sim/lamp-test")
async def lamp_test(request: LampTestRequest):
    """Light every warning lamp at once so the whole panel can be
    confirmed in a single look."""
    simulator.start_lamp_test(request.seconds)
    return {"status": "ok", "seconds": request.seconds, "fields": LAMP_TEST_FIELDS}

@api_router.get("/diagnostics")
async def get_diagnostics():
    """Get detailed diagnostics data (OBD scanner style)"""
    signals = simulator.update()
    return {
        "engine": {
            "rpm": round(signals.rpm, 0),
            "load": round((signals.rpm / 8000) * 100, 1),
            "coolant_temp_c": round(signals.coolant_temp_c, 1),
            "coolant_temp_f": round(signals.coolant_temp_c * 9/5 + 32, 1),
            "intake_air_temp_c": round(signals.intake_air_temp_c, 1),
            "throttle_position": round(signals.throttle_pct, 1),
            "map_kpa": round(signals.map_kpa, 1),
            "vtec_active": signals.vtec_active,
        },
        "fuel": {
            "fuel_level_pct": round(signals.fuel_pct * 100, 1),
            "fuel_pressure_kpa": round(350 + (signals.rpm / 8000) * 50, 1),
            "fuel_trim_short": round(-2 + (math.sin(time.time()) * 5), 1),
            "fuel_trim_long": round(1.5, 1),
        },
        "electrical": {
            "battery_voltage": round(signals.battery_voltage, 2),
            "alternator_output": round(signals.battery_voltage + 0.5 if signals.rpm > 1000 else 0, 2),
        },
        "transmission": {
            "gear": signals.gear,
            "vehicle_speed_mph": round(signals.speed_mph, 0),
            "vehicle_speed_kmh": round(signals.speed_mph * 1.60934, 0),
        },
        "oil": {
            "oil_pressure_psi": round(signals.oil_pressure_psi, 1),
            "oil_temp_c": round(80 + (signals.rpm / 8000) * 30, 1),
        },
        "dtc_codes": [] if not signals.check_engine else ["P0118 - Coolant Temp High"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# WebSocket for real-time data
@api_router.websocket("/ws/vehicle-data")
async def websocket_vehicle_data(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = simulator.update()
            await websocket.send_json(data.model_dump())
            await asyncio.sleep(1.0 / 60.0)
    except WebSocketDisconnect:
        pass

# ============ ANDROID AUTO DHU CONTROLLER ============
# For Raspberry Pi 5 Linux - manages OpenAuto or WebAuto subprocess

import subprocess
import signal

class DHUController:
    """
    Android Auto Controller for Raspberry Pi
    Supports both OpenAuto (C++) and WebAuto (Node.js)
    """
    def __init__(self):
        self.process = None
        self.window_id = None

        # Supported Android Auto implementations (in order of preference)
        self.implementations = [
            {
                "name": "openauto-launcher",
                "bin": "/usr/local/bin/openauto-launcher",
                "check": "/usr/local/bin/openauto-launcher",
                "process_name": "autoapp"
            },
            {
                "name": "openauto-build",
                "bin": "/opt/openauto/openauto/build/bin/autoapp",
                "check": "/opt/openauto/openauto/build/bin/autoapp",
                "process_name": "autoapp"
            },
            {
                "name": "openauto-bin",
                "bin": "/opt/openauto/openauto/bin/autoapp",
                "check": "/opt/openauto/openauto/bin/autoapp",
                "process_name": "autoapp"
            },
            {
                "name": "openauto-symlink",
                "bin": "/usr/local/bin/openauto",
                "check": "/usr/local/bin/openauto",
                "process_name": "autoapp"
            },
        ]

    def get_available_implementation(self):
        """Find first available Android Auto implementation"""
        for impl in self.implementations:
            if os.path.exists(impl["check"]):
                return impl
        return None

    def is_running(self):
        if self.process is not None and self.process.poll() is None:
            return True
        # Check if any known process is running
        for impl in self.implementations:
            try:
                result = subprocess.run(['pgrep', '-f', impl["process_name"]], capture_output=True, text=True)
                if result.returncode == 0:
                    return True
            except Exception:
                pass
        return False

    async def start(self, x=640, y=200, width=640, height=480, borderless=True):
        """Launch Android Auto and configure window"""
        if self.is_running():
            return {"status": "running", "message": "Android Auto already running"}

        # Find available implementation
        impl = self.get_available_implementation()

        if not impl:
            return {
                "status": "error", 
                "message": "Android Auto not installed. Run: sudo bash ~/projects/DigitalDash/scripts/install_openauto.sh"
            }

        try:
            # Set display environment
            env = os.environ.copy()
            env['DISPLAY'] = ':0'

            # Launch subprocess
            self.process = subprocess.Popen(
                [impl["bin"]],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                shell=impl["name"] == "web-auto-electron",
                preexec_fn=os.setsid
            )

            # Wait for window to appear
            await asyncio.sleep(2.0)

            # Find and configure OpenAuto window
            await self._configure_window(x, y, width, height, borderless)

            return {"status": "running", "message": "OpenAuto started successfully", "pid": self.process.pid}

        except Exception as e:
            logger.error(f"Failed to start OpenAuto: {e}")
            return {"status": "error", "message": str(e)}

    async def _configure_window(self, x, y, width, height, borderless):
        """Configure OpenAuto window position and style using X11 tools"""
        try:
            await asyncio.sleep(1.0)

            result = subprocess.run(
                ["wmctrl", "-l"],
                capture_output=True,
                text=True,
                timeout=5
            )

            window_id = None
            search_terms = ['openauto', 'autoapp', 'android auto', 'aasdk']

            for line in result.stdout.splitlines():
                line_lower = line.lower()
                for term in search_terms:
                    if term in line_lower:
                        window_id = line.split()[0]
                        break
                if window_id:
                    break

            if not window_id:
                if self.process:
                    try:
                        result = subprocess.run(
                            ["xdotool", "search", "--pid", str(self.process.pid)],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if result.stdout.strip():
                            window_id = result.stdout.strip().split('\n')[0]
                    except Exception:
                        pass

            if not window_id:
                logger.warning("Could not find OpenAuto window - it may need manual positioning")
                return

            self.window_id = window_id

            if borderless:
                subprocess.run(
                    ["xdotool", "windowmove", window_id, str(x), str(y)],
                    timeout=5
                )
                subprocess.run(
                    ["xdotool", "windowsize", window_id, str(width), str(height)],
                    timeout=5
                )
                subprocess.run(
                    ["wmctrl", "-i", "-r", window_id, "-b", "add,above"],
                    timeout=5
                )
            else:
                subprocess.run(
                    ["wmctrl", "-i", "-r", window_id, "-e", f"0,{x},{y},{width},{height}"],
                    timeout=5
                )

            subprocess.run(
                ["wmctrl", "-i", "-a", window_id],
                timeout=5
            )

            logger.info(f"OpenAuto window configured: {window_id} at ({x},{y}) {width}x{height}")

        except FileNotFoundError:
            logger.warning("wmctrl/xdotool not installed. Run: sudo apt install wmctrl xdotool")
        except Exception as e:
            logger.error(f"Error configuring OpenAuto window: {e}")

    async def stop(self):
        """Stop OpenAuto subprocess cleanly"""
        try:
            subprocess.run(['pkill', '-f', 'autoapp'], timeout=5)
            await asyncio.sleep(0.5)

            if self.process is not None:
                try:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                    self.process.wait(timeout=3)
                except Exception:
                    try:
                        os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                        self.process.wait(timeout=2)
                    except Exception:
                        pass

            self.process = None
            self.window_id = None
            return {"status": "stopped", "message": "OpenAuto stopped successfully"}

        except Exception as e:
            logger.error(f"Error stopping OpenAuto: {e}")
            return {"status": "error", "message": str(e)}

    def get_status(self):
        """Get current OpenAuto status"""
        if self.is_running():
            pid = self.process.pid if self.process else "unknown"
            return {
                "status": "running",
                "pid": pid,
                "window_id": self.window_id
            }
        return {"status": "stopped"}

# Global DHU controller instance
dhu_controller = DHUController()

# ============ DEVICE PREFERENCES (MongoDB) — kept for Saved Devices UI ============

class DevicePreferences(BaseModel):
    serial: str = ""
    device_model: str = ""
    name: str = "Unknown Device"
    connection_type: str = "usb"
    auto_launch: bool = True
    skip_prompt: bool = False

class DHUStartRequest(BaseModel):
    x: int = 640
    y: int = 200
    width: int = 640
    height: int = 480
    borderless: bool = True
    alwaysOnTop: bool = True

@api_router.post("/dhu/device-preferences")
async def save_device_preferences(prefs: DevicePreferences):
    """Save per-device preferences"""
    key = prefs.device_model or prefs.serial
    await db.device_preferences.update_one(
        {"device_model": key} if prefs.device_model else {"serial": key},
        {"$set": {
            "serial": prefs.serial,
            "device_model": prefs.device_model or prefs.serial,
            "name": prefs.name,
            "connection_type": prefs.connection_type,
            "auto_launch": prefs.auto_launch,
            "skip_prompt": prefs.skip_prompt,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"status": "saved", "device_model": key}

@api_router.get("/dhu/device-preferences/{identifier}")
async def get_device_preferences(identifier: str):
    """Get saved preferences by model name or serial"""
    prefs = await db.device_preferences.find_one(
        {"$or": [{"device_model": identifier}, {"serial": identifier}]},
        {"_id": 0}
    )
    if prefs:
        return {"status": "found", "preferences": prefs}
    return {"status": "not_found"}

@api_router.get("/dhu/devices")
async def list_known_devices():
    """List all devices with saved preferences"""
    devices = []
    async for doc in db.device_preferences.find({}, {"_id": 0}):
        devices.append(doc)
    return {"devices": devices}

@api_router.delete("/dhu/device-preferences/{identifier}")
async def delete_device_preferences(identifier: str):
    """Delete saved preferences by model name or serial"""
    result = await db.device_preferences.delete_one(
        {"$or": [{"device_model": identifier}, {"serial": identifier}]}
    )
    return {"status": "deleted" if result.deleted_count > 0 else "not_found"}

@api_router.post("/dhu/start")
async def start_dhu(config: DHUStartRequest):
    """Start Android Auto DHU with window configuration"""
    return await dhu_controller.start(
        x=config.x,
        y=config.y,
        width=config.width,
        height=config.height,
        borderless=config.borderless
    )

@api_router.post("/dhu/stop")
async def stop_dhu():
    """Stop Android Auto"""
    return await dhu_controller.stop()

@api_router.get("/dhu/status")
async def get_dhu_status():
    """Get DHU status"""
    return dhu_controller.get_status()

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
