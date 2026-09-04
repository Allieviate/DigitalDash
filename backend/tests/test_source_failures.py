"""What the dash does when a source cannot start. No hardware required.

The bug these cover: run_source() used to call start() outside its own
try block. A CAN interface that is down - the normal state at boot,
until something brings it up - raised straight out of the background
task. Nothing awaits that task until shutdown, so the reader died
silently, the snapshot was never written, and /api/vehicle-data went on
serving VehicleSignals' defaults. Those defaults read as a healthy
idling engine: rpm 900, coolant 25C, oil 40 PSI, fuel 100%.

The whole point of NullSource is that a configured-but-unrunnable
source shows nothing. An unguarded start() routed around it.
"""

import asyncio

import pytest

from signals import VehicleSignals
from sources import HondataCanSource, SignalSnapshot, SignalSource, run_source

# A channel name that cannot resolve to a real interface, so the open
# fails the same way a down can0 fails, on any machine, with no HAT.
MISSING_CHANNEL = "can_nope0"


class ExplodingSource(SignalSource):
    """A source whose start() fails, like a bus that will not open."""

    name = "exploding"

    def __init__(self):
        self.started = False
        self.stopped = False

    async def start(self) -> None:
        self.started = True
        raise OSError(19, "No such device")

    async def stop(self) -> None:
        self.stopped = True

    async def next_update(self):
        raise AssertionError("next_update must not run after start() failed")


class TestSnapshotKnowsItWasNeverWritten:
    """The snapshot can tell 'no data yet' from 'data'."""

    def test_age_is_none_before_any_write(self):
        assert SignalSnapshot().age_seconds is None

    def test_not_fresh_before_any_write(self):
        assert SignalSnapshot().is_fresh is False

    def test_sequence_starts_at_zero(self):
        assert SignalSnapshot().sequence == 0

    def test_defaults_would_read_as_a_running_engine(self):
        """Why 'never written' has to be detectable rather than served.

        This asserts the trap, not desired behaviour: the model
        defaults are a plausible idling car, so anything that serves
        them as though they were measured is lying.
        """
        signals = SignalSnapshot().get()
        assert signals.rpm == 900.0
        assert signals.oil_pressure_psi == 40.0
        assert signals.fuel_pct == 1.0


class TestRunSourceSurvivesAStartFailure:
    def test_start_failure_does_not_escape(self):
        """The regression. This used to raise out of the task."""
        source = ExplodingSource()
        snapshot = SignalSnapshot()

        asyncio.run(run_source(source, snapshot))

        assert source.started is True

    def test_stop_still_runs_when_start_fails(self):
        """start() outside the try meant the finally never fired."""
        source = ExplodingSource()
        asyncio.run(run_source(source, SignalSnapshot()))
        assert source.stopped is True

    def test_snapshot_is_never_written(self):
        source = ExplodingSource()
        snapshot = SignalSnapshot()

        asyncio.run(run_source(source, snapshot))

        assert snapshot.sequence == 0
        assert snapshot.age_seconds is None
        assert snapshot.is_fresh is False


class TestCanSourceWithNoInterface:
    def test_start_does_not_raise(self):
        source = HondataCanSource(channel=MISSING_CHANNEL)
        asyncio.run(source.start())
        assert source.bus is None

    def test_failure_reason_is_recorded(self):
        source = HondataCanSource(channel=MISSING_CHANNEL)
        asyncio.run(source.start())
        assert source.last_error is not None

    def test_status_reports_the_bus_as_shut_with_a_reason(self):
        """A diagnosis, not a shrug."""
        source = HondataCanSource(channel=MISSING_CHANNEL)
        asyncio.run(source.start())

        status = source.status()
        assert status["bus_open"] is False
        assert status["receiving"] is False
        assert status["error"] is not None
        assert status["live_fields"] == []

    def test_no_signals_are_produced_while_down(self):
        """The heart of it: a dead bus must yield nothing, not defaults."""
        source = HondataCanSource(channel=MISSING_CHANNEL)
        source._reopen_delay = 0.01

        async def scenario():
            await source.start()
            return [await source.next_update() for _ in range(3)]

        assert asyncio.run(scenario()) == [None, None, None]

    def test_reopen_backoff_grows(self):
        source = HondataCanSource(channel=MISSING_CHANNEL)
        source._reopen_delay = 0.01

        async def scenario():
            await source.start()
            await source.next_update()

        asyncio.run(scenario())
        assert source._reopen_delay > 0.01

    def test_reopen_backoff_is_capped(self):
        source = HondataCanSource(channel=MISSING_CHANNEL)
        # Shadow the class cap so the test exercises the clamp without
        # actually sleeping the full retry interval.
        source.REOPEN_BACKOFF_MAX = 0.02
        source._reopen_delay = source.REOPEN_BACKOFF_MAX

        async def scenario():
            await source.start()
            await source.next_update()

        asyncio.run(scenario())
        assert source._reopen_delay == source.REOPEN_BACKOFF_MAX


class TestLiveFieldsCoversDerivedWarnings:
    """live_fields has to mean "you can trust this", not "a frame carried this".

    The dash dims a tell-tale whose signal is not in live_fields. The
    overheat and low-oil lamps are derived rather than transmitted, so
    without registering them a working overheat warning would be drawn
    faint while the coolant feeding it was perfectly live.
    """

    def test_overheat_lamp_is_live_once_coolant_is(self):
        source = HondataCanSource(channel=MISSING_CHANNEL)
        source.seen_fields.add("coolant_temp_c")
        source.signals.coolant_temp_c = 115.0

        source._derive_available()

        assert source.signals.high_coolant is True
        assert "high_coolant" in source.status()["live_fields"]

    def test_oil_lamp_stays_unmonitored_with_no_sender(self):
        """The KPro analog input is not wired, so nothing is watching."""
        source = HondataCanSource(channel=MISSING_CHANNEL)
        source.seen_fields.add("coolant_temp_c")

        source._derive_available()

        live = source.status()["live_fields"]
        assert "oil_pressure_warning" not in live
        assert "low_fuel" not in live
        assert source.signals.oil_pressure_warning is False

    def test_boost_is_live_once_map_is(self):
        source = HondataCanSource(channel=MISSING_CHANNEL)
        source.seen_fields.add("map_kpa")
        source.signals.map_kpa = 101.3

        source._derive_available()

        assert "boost_psi" in source.status()["live_fields"]


class TestRunSourceWithADeadCanBus:
    def test_dash_gets_no_data_rather_than_a_healthy_engine(self):
        """End to end, the scenario that would meet the car.

        Backend up, SIGNAL_SOURCE=hondata_can, can0 down. The reader
        must stay alive and produce nothing.
        """
        source = HondataCanSource(channel=MISSING_CHANNEL)
        source._reopen_delay = 0.01
        snapshot = SignalSnapshot()

        async def scenario():
            task = asyncio.create_task(run_source(source, snapshot))
            await asyncio.sleep(0.1)
            assert not task.done(), "reader died instead of retrying"
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task

        asyncio.run(scenario())

        assert snapshot.sequence == 0
        assert snapshot.is_fresh is False
        assert source.status()["bus_open"] is False
