"""Signal sources and the shared snapshot.

Why this exists
---------------
The simulator used to run only when someone asked for data: an HTTP
request arrived, update() ran, the response went out. That is fine for
numbers invented on demand, but real CAN frames arrive on their own
schedule whether anyone is looking or not.

So a background task owns whichever source is configured, reads from
it continuously, and writes into a snapshot. Requests read the
snapshot. Swapping the bench for the car becomes a change of which
class gets constructed, not a rewrite of the request handling.
"""

import asyncio
import logging
import math
import os
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Set

from hondata_can import HONDATA_IDS, HondataDecoder
from signals import (
    COOLANT_WARN_C,
    FUEL_CYCLE_SECONDS,
    LAMP_TEST_FIELDS,
    LOW_FUEL_PCT,
    OIL_PRESSURE_WARN_PSI,
    RAW_SIGNAL_FIELDS,
    VTEC_ENGAGE_RPM,
    VehicleSignals,
    derive_warnings,
)

logger = logging.getLogger(__name__)


class SignalSnapshot:
    """The most recent signals, plus how old they are.

    Age matters: a gauge showing a plausible number from a source that
    died two minutes ago is worse than a gauge showing nothing.
    """

    def __init__(self):
        self._signals = VehicleSignals()
        self._updated_at: float = 0.0
        self._sequence: int = 0

    def set(self, signals: VehicleSignals) -> None:
        self._signals = signals
        self._updated_at = time.time()
        self._sequence += 1

    def get(self) -> VehicleSignals:
        return self._signals

    @property
    def sequence(self) -> int:
        return self._sequence

    @property
    def age_seconds(self) -> Optional[float]:
        if self._updated_at == 0.0:
            return None
        return time.time() - self._updated_at

    @property
    def is_fresh(self) -> bool:
        age = self.age_seconds
        return age is not None and age < 1.0


class SignalSource(ABC):
    """Anything that can produce VehicleSignals.

    Three methods. A CAN reader, a simulator, and a log replayer all
    satisfy the same contract, which is the whole point.
    """

    name: str = "unknown"
    implemented: bool = True

    @abstractmethod
    async def start(self) -> None:
        """Open whatever the source needs (a bus, a file, nothing)."""

    @abstractmethod
    async def stop(self) -> None:
        """Close it again. Must be safe to call twice."""

    @abstractmethod
    async def next_update(self) -> Optional[VehicleSignals]:
        """Return the latest signals, awaiting new data if needed.

        Returning None means nothing new; the caller just loops.
        """

    def status(self) -> Dict[str, Any]:
        return {"name": self.name, "implemented": self.implemented}


# ============ SIMULATOR ============

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

        dt = min(max(now - self.last_update, 0.0), 0.25)
        self.last_update = now

        load = (math.sin(t * 0.15 - math.pi / 2) * 0.5) + 0.5

        self.signals.speed_mph = max(0.0, load * 120.0)
        self.signals.rpm = max(900.0, min(8000.0, 1200.0 + self.signals.speed_mph * 55 + load * 1200))

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

        self.signals.fuel_pct = 1.0 - ((t / FUEL_CYCLE_SECONDS) % 1.0)

        coolant_target = 35.0 + load * 45.0 + (self.signals.speed_mph / 170.0) * 8.0
        coolant_target = max(20.0, min(98.0, coolant_target))
        self.signals.coolant_temp_c += (coolant_target - self.signals.coolant_temp_c) * 0.35 * dt

        self.signals.intake_air_temp_c = 25.0 + load * 20.0
        self.signals.throttle_pct = min(100.0, load * 100.0)
        self.signals.map_kpa = 30.0 + load * 71.0
        self.signals.oil_pressure_psi = 20 + (self.signals.rpm / 8000) * 60
        self.signals.battery_voltage = 12.6 + (self.signals.rpm / 8000) * 1.8

        phase = t % 20.0
        left_req = 5.0 <= phase < 10.0
        right_req = 10.0 <= phase < 15.0
        hazard_req = phase >= 18.0

        if (now - self.last_blink) > 0.5:
            self.blink_state = not self.blink_state
            self.last_blink = now

        self.signals.turn_left = (left_req or hazard_req) and self.blink_state
        self.signals.turn_right = (right_req or hazard_req) and self.blink_state

        self.signals.headlights = True
        self.signals.high_beams = sp > 60
        self.signals.ac_on = (t % 60.0) < 30.0

        self._apply_raw_overrides()
        derive_warnings(self.signals)
        self.signals.vtec_active = self.signals.rpm >= VTEC_ENGAGE_RPM
        self._apply_flag_overrides()
        self._apply_lamp_test(now)

        return self.signals.model_copy()

    def _apply_raw_overrides(self):
        for key, value in self.overrides.items():
            if key in RAW_SIGNAL_FIELDS:
                setattr(self.signals, key, value)

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
            raise ValueError(f"Unknown signal(s): {', '.join(sorted(unknown))}")
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


class SimulatorSource(SignalSource):
    """Runs the bench simulator at a fixed tick."""

    name = "simulation"

    def __init__(self, hz: float = 60.0):
        self.simulator = VehicleSimulator()
        self.interval = 1.0 / hz

    async def start(self) -> None:
        logger.info("Signal source: simulation at %.0fHz", 1.0 / self.interval)

    async def stop(self) -> None:
        pass

    async def next_update(self) -> Optional[VehicleSignals]:
        await asyncio.sleep(self.interval)
        return self.simulator.update()


# ============ HONDATA CAN ============

class HondataCanSource(SignalSource):
    """Reads Hondata KPro frames from a SocketCAN interface.

    RECEIVE ONLY. Nothing in this class transmits, and nothing should
    be added that does. The dash is a passive listener on a bus shared
    with the engine management.

    There is one exception that is not ours to make: CAN requires a
    node to acknowledge frames at the bit level, and the controller
    does that in hardware. Setting the interface to listen-only would
    suppress even that, and with the dash as the only other node the
    KPro would go unacknowledged, error-count, and drop to bus-off. So
    the interface runs normally and the software stays silent.

    Verify after a drive:  ip -details -statistics link show can0
    The TX packet count should still be zero.
    """

    name = "hondata_can"

    # A channel silent for this long is treated as gone, not quiet.
    STALE_AFTER = 3.0

    # A bus that will not open is retried on this schedule rather than
    # being fatal. In the car the Pi and the ECU come up together and
    # can0 can appear a moment after the backend does, and a connector
    # reseated mid-drive should recover without a service restart.
    #
    # It never gives up, because a genuinely miswired car must keep
    # reading as dead for as long as it is dead. Nothing is written to
    # the snapshot while the bus is down, so waiting costs honesty
    # nothing: the dash shows no data rather than invented data.
    REOPEN_BACKOFF_START = 1.0
    REOPEN_BACKOFF_MAX = 10.0

    def __init__(self, channel: str = "can0", batch_limit: int = 32):
        self.channel = channel
        self.batch_limit = batch_limit
        self.bus = None
        self.decoder = HondataDecoder()
        self.signals = VehicleSignals()
        self.seen_fields: Set[str] = set()
        self.last_frame_at: Optional[float] = None
        self.last_error: Optional[str] = None
        self._reopen_delay = self.REOPEN_BACKOFF_START
        self._model_fields = set(VehicleSignals.model_fields)

    def _open(self) -> None:
        """Open the bus. Raises if the interface is not up."""
        import can

        # Hardware acceptance filters. The MCP2515 drops anything that
        # is not Hondata before it ever reaches Python.
        filters = [
            {"can_id": can_id, "can_mask": 0x7FF, "extended": False}
            for can_id in HONDATA_IDS
        ]
        self.bus = can.interface.Bus(
            channel=self.channel,
            interface="socketcan",
            can_filters=filters,
        )

    async def _try_open(self) -> bool:
        """Attempt to open the bus. Records the failure instead of raising."""
        try:
            await asyncio.to_thread(self._open)
        except Exception as exc:
            self.bus = None
            self.last_error = f"{type(exc).__name__}: {exc}"
            logger.error(
                "Signal source: cannot open %s (%s). Is the interface up? "
                "Try: sudo ip link set %s up type can bitrate 500000 restart-ms 100",
                self.channel,
                self.last_error,
                self.channel,
            )
            return False

        self.last_error = None
        self._reopen_delay = self.REOPEN_BACKOFF_START
        logger.info("Signal source: hondata_can on %s (receive only)", self.channel)
        return True

    async def start(self) -> None:
        # A failure here is reported, not raised. next_update() keeps
        # retrying, and produces nothing in the meantime.
        await self._try_open()

    async def stop(self) -> None:
        if self.bus is not None:
            try:
                self.bus.shutdown()
            except Exception:
                logger.exception("Error closing %s", self.channel)
            self.bus = None

    def _read_batch(self):
        """Blocking read, drained in one go.

        Hondata cycles through its packets at 100Hz, so frames arrive
        in bursts. Draining a burst per call keeps thread handoffs to
        a handful per second instead of one per frame.
        """
        messages = []
        first = self.bus.recv(timeout=0.25)
        if first is None:
            return messages
        messages.append(first)
        while len(messages) < self.batch_limit:
            nxt = self.bus.recv(timeout=0.0)
            if nxt is None:
                break
            messages.append(nxt)
        return messages

    async def next_update(self) -> Optional[VehicleSignals]:
        if self.bus is None:
            # Down. Wait, then try again, returning nothing meanwhile so
            # the snapshot stays unwritten and the dash stays honest.
            await asyncio.sleep(self._reopen_delay)
            self._reopen_delay = min(
                self._reopen_delay * 2, self.REOPEN_BACKOFF_MAX
            )
            await self._try_open()
            return None

        try:
            messages = await asyncio.to_thread(self._read_batch)
        except Exception as exc:
            # The bus opened and has since died - the interface went
            # down, or a connector shook loose. Drop it so the reopen
            # path above takes over instead of failing forever.
            self.last_error = f"{type(exc).__name__}: {exc}"
            logger.error("Read failed on %s (%s); reopening", self.channel, self.last_error)
            await self.stop()
            return None

        if not messages:
            return None

        changed = False
        for message in messages:
            if self.decoder.feed(message.arbitration_id, bytes(message.data)):
                changed = True

        if not changed:
            return None

        self.last_frame_at = time.time()

        for key, value in self.decoder.values.items():
            if key in self._model_fields:
                setattr(self.signals, key, value)
                self.seen_fields.add(key)

        self._derive_available()
        return self.signals.model_copy()

    def _derive_available(self) -> None:
        """Only derive a warning whose input has actually arrived.

        derive_warnings() would happily compute oil_pressure_warning
        from VehicleSignals' 40 PSI default and report healthy oil
        pressure on a car with no sender wired. Silence is honest
        there; a confident green light is not.

        A derived field also joins seen_fields once its input has
        arrived, so live_fields means "you can trust this" rather than
        "a frame carried this". Without that the dash cannot tell a
        TEMP HIGH lamp that is genuinely being watched from one with
        nothing behind it, and would dim a working overheat warning.
        """
        if "coolant_temp_c" in self.seen_fields:
            self.signals.high_coolant = self.signals.coolant_temp_c >= COOLANT_WARN_C
            self.seen_fields.add("high_coolant")

        if "fuel_pct" in self.seen_fields:
            self.signals.low_fuel = self.signals.fuel_pct <= LOW_FUEL_PCT
            self.seen_fields.add("low_fuel")

        if "oil_pressure_psi" in self.seen_fields:
            self.signals.oil_pressure_warning = (
                self.signals.oil_pressure_psi < OIL_PRESSURE_WARN_PSI
            )
            self.seen_fields.add("oil_pressure_warning")

        if "map_kpa" in self.seen_fields:
            self.signals.boost_psi = (self.signals.map_kpa - 101.3) * 0.145038
            self.seen_fields.add("boost_psi")

    def status(self) -> Dict[str, Any]:
        age = None
        if self.last_frame_at is not None:
            age = time.time() - self.last_frame_at
        return {
            "name": self.name,
            "implemented": True,
            "channel": self.channel,
            "bus_open": self.bus is not None,
            "receiving": age is not None and age < self.STALE_AFTER,
            "seconds_since_frame": age,
            "live_fields": sorted(self.seen_fields),
            "decoder": self.decoder.stats(),
            # Why the bus is not open, when it is not. Without this the
            # dash can say "no data" but not "no data because can0 is
            # down", which is the difference between a diagnosis and a
            # shrug.
            "error": self.last_error,
        }


class NullSource(SignalSource):
    """Produces nothing, on purpose.

    Used when a source is configured but cannot run. Falling back to
    the simulator here would be worse: the dash would show a plausible
    coolant temp while the real engine cooks. A dead gauge is honest,
    a lying gauge is not.
    """

    implemented = False

    def __init__(self, name: str, reason: str):
        self.name = name
        self.reason = reason

    async def start(self) -> None:
        logger.error("Signal source %r unavailable: %s", self.name, self.reason)

    async def stop(self) -> None:
        pass

    async def next_update(self) -> Optional[VehicleSignals]:
        await asyncio.sleep(1.0)
        return None

    def status(self) -> Dict[str, Any]:
        return {"name": self.name, "implemented": False, "reason": self.reason}


def create_source(name: str) -> SignalSource:
    """Pick a source by name. Set SIGNAL_SOURCE in backend/.env."""
    key = (name or "").strip().lower()

    if key in ("", "simulation", "simulator", "sim"):
        return SimulatorSource()

    if key in ("hondata_can", "can"):
        try:
            import can  # noqa: F401
        except ImportError:
            # Better a dead dash than one quietly running the
            # simulator in front of a real engine.
            return NullSource(
                "hondata_can",
                "python-can is not installed; rebuild the virtualenv",
            )
        return HondataCanSource(channel=os.environ.get("CAN_CHANNEL", "can0"))

    return NullSource(key, "unrecognised source name")


async def run_source(source: SignalSource, snapshot: SignalSnapshot) -> None:
    """Background loop. Owns the source for the life of the process.

    start() belongs inside the try. It used to sit outside it, and that
    was the whole bug: a source that could not open - a CAN interface
    that is down, which is the normal state at boot until something
    brings it up - raised straight out of this coroutine. Nothing
    awaits this task until shutdown, so the failure was invisible. The
    reader was dead, the snapshot was never written, and
    /api/vehicle-data went on serving VehicleSignals' defaults: rpm
    900, coolant 25C, oil 40 PSI, fuel 100%. A healthy idling engine,
    in front of an engine that might be cooking.

    Inside the try, a start failure is logged, stop() still runs, and
    the snapshot stays unwritten - which /api/source-status reports as
    fresh: false with a null age.
    """
    try:
        await source.start()
        while True:
            try:
                signals = await source.next_update()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Signal source %r raised; backing off", source.name)
                await asyncio.sleep(1.0)
                continue

            if signals is not None:
                snapshot.set(signals)
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception(
            "Signal source %r could not start; the dash will show no data",
            source.name,
        )
    finally:
        await source.stop()
