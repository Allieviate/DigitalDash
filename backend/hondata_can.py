"""Hondata KPro CAN decoder.

Packet layout comes from Hondata's published KManager CAN output
documentation. All values are big-endian, 11-bit IDs, transmitted at
100Hz cycling through the enabled packets - so with the seven core
packets on, any single channel lands roughly every 70ms.

UNVERIFIED AGAINST A REAL CAR. The field order below follows the
published spec, but signedness on the temperature fields has not been
confirmed against real traffic. Phase 5 settles this by capturing a
candump log from the car and replaying it through the tests in
test_hondata_can.py. Until then, treat decoded values as plausible
rather than correct.

This module never transmits.
"""

import struct
import time
from typing import Any, Dict, Optional

KPH_TO_MPH = 0.621371

# Analog inputs are broadcast as voltage * 819.2
ANALOG_SCALE = 819.2

# ---- gear encoding ----
#
# KPro indexes forward gears from zero, so raw 0 is first gear. It does
# not use 0 for neutral.
#
# Neutral and reverse are not calculated at all. A K-series gearbox
# gives the ECU only two switch states - the neutral position switch
# and the reverse light switch - so forward gears are derived from the
# rpm/speed ratio, and when either switch closes the ECU overrides the
# gear variable outright.
#
# One consequence worth knowing: mid-shift, with the clutch in, the
# rpm/speed ratio is meaningless, so the calculated gear can be briefly
# wrong. See translate_gear.

GEAR_NEUTRAL_RAW = 10
GEAR_REVERSE_RAW = 11
MAX_FORWARD_GEARS = 6

# Dash convention, matching VehicleSignals: -1 reverse, 0 neutral,
# 1..n forward.
DASH_NEUTRAL = 0
DASH_REVERSE = -1

# Packet IDs
ID_ENGINE = 0x660
ID_TEMPS = 0x661
ID_THROTTLE = 0x662
ID_TIMING = 0x663
ID_LAMBDA = 0x664
ID_KNOCK = 0x665
ID_CAM = 0x666
ID_ANALOG_LOW = 0x667
ID_ANALOG_HIGH = 0x668
ID_ETHANOL = 0x669

# Everything Hondata broadcasts. Used as the hardware acceptance filter
# so the MCP2515 drops unrelated traffic before it reaches Python.
HONDATA_IDS = (
    ID_ENGINE, ID_TEMPS, ID_THROTTLE, ID_TIMING, ID_LAMBDA,
    ID_KNOCK, ID_CAM, ID_ANALOG_LOW, ID_ANALOG_HIGH, ID_ETHANOL,
)


class DecodeError(ValueError):
    """Frame did not match the expected layout."""


def _need(data: bytes, length: int, name: str) -> None:
    if len(data) < length:
        raise DecodeError(f"{name} needs {length} bytes, got {len(data)}")


def translate_gear(raw: int) -> Optional[int]:
    """Convert KPro's gear encoding to the dash convention.

    Returns None for an unrecognised value so the caller can hold the
    last known gear rather than display something invented. A gear
    readout that freezes for a moment is better than one that shows a
    number the transmission does not have.
    """
    if raw == GEAR_NEUTRAL_RAW:
        return DASH_NEUTRAL
    if raw == GEAR_REVERSE_RAW:
        return DASH_REVERSE
    if 0 <= raw < MAX_FORWARD_GEARS:
        return raw + 1
    return None


def decode_engine(data: bytes) -> Dict[str, Any]:
    """0x660 - rpm, speed, gear, battery voltage."""
    _need(data, 6, "0x660")
    rpm, speed_kph, gear_raw, volts = struct.unpack(">HHBB", data[:6])

    out: Dict[str, Any] = {
        "rpm": float(rpm),
        "speed_mph": speed_kph * KPH_TO_MPH,
        "battery_voltage": volts / 10.0,
        # kept for phase 5 diagnostics - not a dashboard field
        "gear_raw": int(gear_raw),
    }

    gear = translate_gear(gear_raw)
    if gear is not None:
        out["gear"] = gear
    return out


def decode_temps(data: bytes) -> Dict[str, Any]:
    """0x661 - intake air temp, coolant temp, MIL, VTEC, closed loop.

    Temperatures are read as signed. An unsigned reading would turn a
    freezing morning into roughly 65000 degrees, which is at least an
    obvious failure rather than a subtle one.
    """
    _need(data, 5, "0x661")
    iat, ect, mil = struct.unpack(">hhB", data[:5])
    out: Dict[str, Any] = {
        "intake_air_temp_c": float(iat),
        "coolant_temp_c": float(ect),
        "check_engine": bool(mil),
    }
    if len(data) >= 6:
        out["vtec_active"] = bool(data[5])
    return out


def decode_throttle(data: bytes) -> Dict[str, Any]:
    """0x662 - throttle position, manifold pressure."""
    _need(data, 4, "0x662")
    tps, map_x10 = struct.unpack(">HH", data[:4])
    return {
        "throttle_pct": float(tps),
        "map_kpa": map_x10 / 10.0,
    }


def decode_analog(data: bytes, first_channel: int) -> Dict[str, Any]:
    """0x667 / 0x668 - four analog input voltages each.

    Kept as raw voltages. Turning a voltage into oil pressure or fuel
    level needs a calibration curve for the specific sender, which is
    phase 6 and cannot be guessed here.
    """
    _need(data, 8, "analog packet")
    raw = struct.unpack(">HHHH", data[:8])
    return {
        f"analog_{first_channel + i}_volts": value / ANALOG_SCALE
        for i, value in enumerate(raw)
    }


PACKET_DECODERS = {
    ID_ENGINE: decode_engine,
    ID_TEMPS: decode_temps,
    ID_THROTTLE: decode_throttle,
    ID_ANALOG_LOW: lambda d: decode_analog(d, 0),
    ID_ANALOG_HIGH: lambda d: decode_analog(d, 4),
}


def decode_frame(can_id: int, data: bytes) -> Optional[Dict[str, Any]]:
    """Decode one frame. Returns None for IDs we do not consume.

    Timing, lambda, knock, cam and ethanol packets are recognised as
    Hondata traffic but have no dashboard field yet, so they are
    ignored rather than treated as errors.
    """
    decoder = PACKET_DECODERS.get(can_id)
    if decoder is None:
        return None
    return decoder(data)


class HondataDecoder:
    """Accumulates frames into a current picture of the engine.

    Each packet ID carries only part of the state, and they arrive one
    at a time, so the decoder holds the last known value for every
    field and records when each packet was last seen.
    """

    def __init__(self):
        self.values: Dict[str, Any] = {}
        self.last_seen: Dict[int, float] = {}
        self.frames_decoded: int = 0
        self.frames_ignored: int = 0
        self.decode_errors: int = 0
        self.unknown_gears: int = 0

    def feed(self, can_id: int, data: bytes, now: Optional[float] = None) -> bool:
        """Apply one frame. Returns True if it changed anything."""
        try:
            decoded = decode_frame(can_id, data)
        except DecodeError:
            self.decode_errors += 1
            return False

        if decoded is None:
            self.frames_ignored += 1
            return False

        if "gear_raw" in decoded and "gear" not in decoded:
            self.unknown_gears += 1

        self.values.update(decoded)
        self.last_seen[can_id] = now if now is not None else time.time()
        self.frames_decoded += 1
        return True

    def seconds_since(self, can_id: int, now: Optional[float] = None) -> Optional[float]:
        seen = self.last_seen.get(can_id)
        if seen is None:
            return None
        return (now if now is not None else time.time()) - seen

    def stats(self) -> Dict[str, Any]:
        return {
            "frames_decoded": self.frames_decoded,
            "frames_ignored": self.frames_ignored,
            "decode_errors": self.decode_errors,
            "unknown_gears": self.unknown_gears,
            "packets_seen": sorted(hex(i) for i in self.last_seen),
        }
