from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import math
import time
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json

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

# ============ MODELS ============

class VehicleSignals(BaseModel):
    rpm: float = 900.0
    speed_mph: float = 0.0
    gear: int = 0  # -1=R, 0=N, 1..6 forward
    fuel_pct: float = 1.0
    coolant_temp_c: float = 25.0
    oil_pressure_psi: float = 40.0
    battery_voltage: float = 12.6
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
    data_source: str = "simulated"  # simulated or obd
    units: str = "imperial"  # imperial or metric
    gauge_style: str = "modern"  # modern, classic, minimal
    warning_sounds: bool = True
    brightness: int = 100
    show_diagnostics: bool = False
    custom_gauges: Dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSettingsUpdate(BaseModel):
    theme_id: Optional[str] = None
    data_source: Optional[str] = None
    units: Optional[str] = None
    gauge_style: Optional[str] = None
    warning_sounds: Optional[bool] = None
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

# ============ VEHICLE DATA SIMULATION ============

class VehicleSimulator:
    def __init__(self):
        self.t0 = time.time()
        self.last_blink = 0.0
        self.blink_state = False
        self.signals = VehicleSignals()
    
    def update(self) -> VehicleSignals:
        t = time.time() - self.t0
        dt = 0.033  # ~30fps
        
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
        
        # Fuel consumption
        self.signals.fuel_pct = max(0.0, 1.0 - (t * 0.001))
        
        # Coolant temperature based on load
        coolant_target = 35.0 + load * 55.0 + (self.signals.speed_mph / 170.0) * 10.0
        coolant_target = max(20.0, min(110.0, coolant_target))
        self.signals.coolant_temp_c += (coolant_target - self.signals.coolant_temp_c) * 0.35 * dt
        
        # Oil pressure based on RPM
        self.signals.oil_pressure_psi = 20 + (self.signals.rpm / 8000) * 60
        
        # Battery voltage (simulate charging)
        self.signals.battery_voltage = 12.6 + (self.signals.rpm / 8000) * 1.8
        
        # Warning flags
        self.signals.low_fuel = self.signals.fuel_pct <= 0.12
        self.signals.high_coolant = self.signals.coolant_temp_c >= 105.0
        self.signals.oil_pressure_warning = self.signals.oil_pressure_psi < 15
        self.signals.check_engine = self.signals.high_coolant
        self.signals.maintenance = t >= 60.0
        
        # Turn signal simulation
        phase = t % 20.0
        left_req = 5.0 <= phase < 10.0
        right_req = 10.0 <= phase < 15.0
        hazard_req = phase >= 18.0
        
        if (time.time() - self.last_blink) > 0.5:
            self.blink_state = not self.blink_state
            self.last_blink = time.time()
        
        self.signals.turn_left = (left_req or hazard_req) and self.blink_state
        self.signals.turn_right = (right_req or hazard_req) and self.blink_state
        
        # Lights
        self.signals.headlights = True
        self.signals.high_beams = sp > 60
        
        return self.signals

simulator = VehicleSimulator()

# ============ API ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Accord HMI API v1.0"}

@api_router.get("/vehicle-data", response_model=VehicleSignals)
async def get_vehicle_data():
    """Get current vehicle signals (simulated)"""
    return simulator.update()

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
            "intake_air_temp_c": round(25 + (signals.rpm / 8000) * 20, 1),
            "throttle_position": round((signals.speed_mph / 120) * 100, 1),
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
            await asyncio.sleep(0.033)  # ~30fps
    except WebSocketDisconnect:
        pass

# ============ ANDROID AUTO DHU CONTROLLER ============
# For Raspberry Pi 5 Linux - manages OpenAuto subprocess with window control

import subprocess
import signal

class DHUController:
    """
    OpenAuto Controller for Raspberry Pi
    Manages OpenAuto as a subprocess with window positioning
    """
    def __init__(self):
        self.process = None
        # OpenAuto launcher path
        self.openauto_launcher = os.environ.get('OPENAUTO_PATH', '/usr/local/bin/openauto-launcher')
        self.openauto_bin = '/opt/openauto/openauto/build/bin/autoapp'
        self.window_id = None
        
    def is_running(self):
        if self.process is not None and self.process.poll() is None:
            return True
        # Also check if autoapp is running independently
        try:
            result = subprocess.run(['pgrep', '-f', 'autoapp'], capture_output=True, text=True)
            return result.returncode == 0
        except:
            return False
    
    async def start(self, x=640, y=200, width=640, height=480, borderless=True):
        """Launch OpenAuto and configure window"""
        if self.is_running():
            return {"status": "running", "message": "OpenAuto already running"}
        
        # Check if OpenAuto is installed
        openauto_exists = os.path.exists(self.openauto_bin) or os.path.exists(self.openauto_launcher)
        
        if not openauto_exists:
            return {
                "status": "error", 
                "message": "OpenAuto not installed. Run: sudo bash ~/projects/DigitalDash/scripts/install_openauto.sh"
            }
        
        try:
            # Set display environment
            env = os.environ.copy()
            env['DISPLAY'] = ':0'
            
            # Determine which binary to use
            if os.path.exists(self.openauto_launcher):
                cmd = [self.openauto_launcher]
            else:
                cmd = [self.openauto_bin]
            
            # Launch OpenAuto subprocess
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                preexec_fn=os.setsid  # Create new process group for clean termination
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
            # Wait a bit more for window to fully initialize
            await asyncio.sleep(1.0)
            
            # Find OpenAuto window by various possible titles
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
                # Try to find by process ID
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
                    except:
                        pass
            
            if not window_id:
                logger.warning("Could not find OpenAuto window - it may need manual positioning")
                return
            
            self.window_id = window_id
            
            # Configure window
            if borderless:
                # Remove decorations
                subprocess.run(
                    ["xdotool", "windowmove", window_id, str(x), str(y)],
                    timeout=5
                )
                subprocess.run(
                    ["xdotool", "windowsize", window_id, str(width), str(height)],
                    timeout=5
                )
                # Keep on top
                subprocess.run(
                    ["wmctrl", "-i", "-r", window_id, "-b", "add,above"],
                    timeout=5
                )
            else:
                subprocess.run(
                    ["wmctrl", "-i", "-r", window_id, "-e", f"0,{x},{y},{width},{height}"],
                    timeout=5
                )
            
            # Focus the window
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
            # Kill by process name first
            subprocess.run(['pkill', '-f', 'autoapp'], timeout=5)
            await asyncio.sleep(0.5)
            
            # Also kill our tracked process if exists
            if self.process is not None:
                try:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                    self.process.wait(timeout=3)
                except:
                    try:
                        os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                        self.process.wait(timeout=2)
                    except:
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

class DHUStartRequest(BaseModel):
    x: int = 750
    y: int = 180
    width: int = 420
    height: int = 340
    borderless: bool = True
    alwaysOnTop: bool = False

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
    """Stop Android Auto DHU"""
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
