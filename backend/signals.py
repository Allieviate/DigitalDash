"""Vehicle signal model, thresholds, and provenance.

Split out of server.py so that both the simulator and the future
Hondata CAN reader derive warnings from exactly the same numbers.
If a threshold only existed in one of them they would disagree, and
the bench would stop predicting the car.
"""

from enum import Enum
from typing import Dict

from pydantic import BaseModel

# ============ WARNING THRESHOLDS ============

LOW_FUEL_PCT = 0.12
COOLANT_WARN_C = 110.0
OIL_PRESSURE_WARN_PSI = 15.0

# K-series VTEC crossover. Once CAN is wired this comes from the VTS
# bit in packet 0x661 and this constant is only used by the simulator.
VTEC_ENGAGE_RPM = 5800.0

# How long fuel takes to go from full to empty in the bench cycle.
FUEL_CYCLE_SECONDS = 900.0


class VehicleSignals(BaseModel):
    rpm: float = 900.0
    speed_mph: float = 0.0
    gear: int = 0  # -1=R, 0=N, 1..6 forward
    fuel_pct: float = 1.0
    coolant_temp_c: float = 25.0
    oil_pressure_psi: float = 40.0
    battery_voltage: float = 12.6
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


def derive_warnings(signals: VehicleSignals) -> None:
    """Compute every value that follows from a raw signal, in place.

    Called by the simulator and, later, by the CAN reader. Keeping it
    here means a threshold change lands in both at once.
    """
    signals.low_fuel = signals.fuel_pct <= LOW_FUEL_PCT
    signals.high_coolant = signals.coolant_temp_c >= COOLANT_WARN_C
    signals.oil_pressure_warning = signals.oil_pressure_psi < OIL_PRESSURE_WARN_PSI
    signals.boost_psi = (signals.map_kpa - 101.3) * 0.145038


# ============ SIGNAL PROVENANCE ============

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
    # wired into KPro analog inputs, rebroadcast on 0x667 / 0x668.
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

# Raw signals are overridden before warnings derive, so forcing
# coolant_temp_c makes high_coolant follow the same path the car will.
RAW_SIGNAL_FIELDS = {
    "rpm", "speed_mph", "gear", "fuel_pct", "coolant_temp_c",
    "oil_pressure_psi", "battery_voltage", "intake_air_temp_c",
    "throttle_pct", "map_kpa",
}

LAMP_TEST_FIELDS = [
    "check_engine", "maintenance", "oil_pressure_warning", "low_fuel",
    "high_coolant", "abs_warning", "airbag_warning", "brake_warning",
    "turn_left", "turn_right", "headlights", "high_beams",
]
