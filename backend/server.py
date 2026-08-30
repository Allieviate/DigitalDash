from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import math
import time
from contextlib import asynccontextmanager
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

from signals import (
    COOLANT_WARN_C,
    LAMP_TEST_FIELDS,
    LOW_FUEL_PCT,
    OIL_PRESSURE_WARN_PSI,
    SIGNAL_SOURCES,
    VTEC_ENGAGE_RPM,
    VehicleSignals,
)
from sources import (
    SignalSnapshot,
    SimulatorSource,
    create_source,
    run_source,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early so startup messages are not swallowed
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection - with safe fallbacks
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'frank_hmi')]

# ============ SIGNAL SOURCE ============
# Which source this Pi runs is a property of how it is deployed, not a
# user preference, so it lives in backend/.env rather than in the
# settings UI. A dash that silently reverts to simulated data because
# someone cleared browser storage is a bad failure mode.
#
#   SIGNAL_SOURCE=simulation    bench
#   SIGNAL_SOURCE=hondata_can   car (phase 3)

SIGNAL_SOURCE = os.environ.get('SIGNAL_SOURCE', 'simulation')

snapshot = SignalSnapshot()
signal_source = create_source(SIGNAL_SOURCE)
_source_task: Optional[asyncio.Task] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _source_task
    _source_task = asyncio.create_task(run_source(signal_source, snapshot))
    try:
        yield
    finally:
        if _source_task is not None:
            _source_task.cancel()
            try:
                await _source_task
            except asyncio.CancelledError:
                pass
        client.close()


app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


def require_simulator():
    """Injection only makes sense against the bench source."""
    if not isinstance(signal_source, SimulatorSource):
        raise HTTPException(
            status_code=409,
            detail=f"Signal source is {signal_source.name!r}; injection requires SIGNAL_SOURCE=simulation"
        )
    return signal_source.simulator


# ============ MODELS ============

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
    performance_mode: Optional[str] = None
    units: Optional[str] = None
    gauge_style: Optional[str] = None
    warning_sounds: Optional[bool] = None
    chime_volume: Optional[int] = None
    bluetooth_enabled: Optional[bool] = None
    brightness: Optional[int] = None
    show_diagnostics: Optional[bool] = None
    custom_gauges: Optional[Dict[str, Any]] = None

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

# ============ API ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Accord HMI API v1.0"}

@api_router.get("/vehicle-data", response_model=VehicleSignals)
async def get_vehicle_data():
    """Latest signals from whichever source is running."""
    return snapshot.get()

@api_router.get("/source-status")
async def get_source_status():
    """What is feeding the dash, and whether it is still alive."""
    return {
        "source": signal_source.status(),
        "fresh": snapshot.is_fresh,
        "age_seconds": snapshot.age_seconds,
        "sequence": snapshot.sequence,
    }

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
    return UserSettings()

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
    simulator = require_simulator()
    try:
        active = simulator.set_overrides(request.overrides)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"status": "ok", "overrides": active}

@api_router.get("/sim/overrides")
async def get_overrides():
    simulator = require_simulator()
    return {
        "overrides": simulator.overrides,
        "lamp_test_active": time.time() < simulator.lamp_test_until,
    }

@api_router.post("/sim/clear")
async def clear_overrides(request: ClearRequest):
    simulator = require_simulator()
    remaining = simulator.clear_overrides(request.fields)
    return {"status": "ok", "overrides": remaining}

@api_router.post("/sim/lamp-test")
async def lamp_test(request: LampTestRequest):
    """Light every warning lamp at once so the whole panel can be
    confirmed in a single look."""
    simulator = require_simulator()
    simulator.start_lamp_test(request.seconds)
    return {"status": "ok", "seconds": request.seconds, "fields": LAMP_TEST_FIELDS}

@api_router.get("/diagnostics")
async def get_diagnostics():
    """Get detailed diagnostics data (OBD scanner style)"""
    signals = snapshot.get()
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
        "source": signal_source.status(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# WebSocket for real-time data
@api_router.websocket("/ws/vehicle-data")
async def websocket_vehicle_data(websocket: WebSocket):
    """Push on change rather than on a timer.

    Hondata transmits at 100Hz cycling through packets, so any one
    channel lands roughly every 70ms. Sending at a fixed 60Hz would
    mean repeating unchanged values most of the time.
    """
    await websocket.accept()
    last_sequence = -1
    try:
        while True:
            if snapshot.sequence != last_sequence:
                last_sequence = snapshot.sequence
                await websocket.send_json(snapshot.get().model_dump())
            await asyncio.sleep(0.005)
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

        impl = self.get_available_implementation()

        if not impl:
            return {
                "status": "error", 
                "message": "Android Auto not installed. Run: sudo bash ~/projects/DigitalDash/scripts/install_openauto.sh"
            }

        try:
            env = os.environ.copy()
            env['DISPLAY'] = ':0'

            self.process = subprocess.Popen(
                [impl["bin"]],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                shell=impl["name"] == "web-auto-electron",
                preexec_fn=os.setsid
            )

            await asyncio.sleep(2.0)
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

# ============ DEVICE PREFERENCES (MongoDB) ============

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
