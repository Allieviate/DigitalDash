"""Decoder tests. No CAN hardware and no car required.

These run against synthetic frames built from Hondata's published
layout. They prove the decoder is self-consistent, not that the layout
is right - that comes in phase 5 when a real candump log from the car
gets replayed through replay_log().
"""

import struct

import pytest

from hondata_can import (
    ID_ANALOG_LOW,
    ID_ENGINE,
    ID_KNOCK,
    ID_TEMPS,
    ID_THROTTLE,
    DecodeError,
    HondataDecoder,
    decode_frame,
)


def engine_frame(rpm, speed_kph, gear, volts):
    return struct.pack(">HHBB", rpm, speed_kph, gear, int(volts * 10))


def temps_frame(iat, ect, mil, vtec):
    return struct.pack(">hhBB", iat, ect, 1 if mil else 0, 1 if vtec else 0)


class TestEnginePacket:
    def test_decodes_rpm_and_gear(self):
        out = decode_frame(ID_ENGINE, engine_frame(4500, 88, 3, 14.2))
        assert out["rpm"] == 4500.0
        assert out["gear"] == 3
        assert out["battery_voltage"] == pytest.approx(14.2)

    def test_converts_kph_to_mph(self):
        out = decode_frame(ID_ENGINE, engine_frame(3000, 100, 4, 13.8))
        assert out["speed_mph"] == pytest.approx(62.1371, abs=1e-3)

    def test_idle(self):
        out = decode_frame(ID_ENGINE, engine_frame(850, 0, 0, 13.9))
        assert out["rpm"] == 850.0
        assert out["speed_mph"] == 0.0

    def test_short_frame_rejected(self):
        with pytest.raises(DecodeError):
            decode_frame(ID_ENGINE, b"\x11\x94")


class TestTempsPacket:
    def test_normal_operating(self):
        out = decode_frame(ID_TEMPS, temps_frame(35, 88, False, False))
        assert out["coolant_temp_c"] == 88.0
        assert out["intake_air_temp_c"] == 35.0
        assert out["check_engine"] is False

    def test_overheat_and_mil(self):
        out = decode_frame(ID_TEMPS, temps_frame(40, 118, True, True))
        assert out["coolant_temp_c"] == 118.0
        assert out["check_engine"] is True
        assert out["vtec_active"] is True

    def test_below_freezing_stays_negative(self):
        """A cold morning must not decode as 65000 degrees."""
        out = decode_frame(ID_TEMPS, temps_frame(-8, -5, False, False))
        assert out["intake_air_temp_c"] == -8.0
        assert out["coolant_temp_c"] == -5.0


class TestThrottlePacket:
    def test_map_scaling(self):
        out = decode_frame(ID_THROTTLE, struct.pack(">HH", 42, 985))
        assert out["throttle_pct"] == 42.0
        assert out["map_kpa"] == pytest.approx(98.5)


class TestAnalogPacket:
    def test_voltage_scaling(self):
        raw = int(2.5 * 819.2)
        out = decode_frame(ID_ANALOG_LOW, struct.pack(">HHHH", raw, 0, 0, 0))
        assert out["analog_0_volts"] == pytest.approx(2.5, abs=1e-3)
        assert out["analog_3_volts"] == 0.0


class TestUnconsumedPackets:
    def test_known_but_unused_id_returns_none(self):
        assert decode_frame(ID_KNOCK, b"\x00\x00") is None

    def test_foreign_id_returns_none(self):
        assert decode_frame(0x123, b"\xde\xad\xbe\xef") is None


class TestDecoderAccumulation:
    def test_merges_packets_into_one_picture(self):
        d = HondataDecoder()
        d.feed(ID_ENGINE, engine_frame(4500, 88, 3, 14.2), now=100.0)
        d.feed(ID_TEMPS, temps_frame(35, 118, True, True), now=100.01)

        assert d.values["rpm"] == 4500.0
        assert d.values["coolant_temp_c"] == 118.0
        assert d.values["check_engine"] is True
        assert d.frames_decoded == 2

    def test_keeps_last_known_value(self):
        """Packets arrive one at a time; earlier fields must survive."""
        d = HondataDecoder()
        d.feed(ID_TEMPS, temps_frame(35, 88, False, False), now=100.0)
        d.feed(ID_ENGINE, engine_frame(6200, 120, 4, 14.0), now=100.01)
        assert d.values["coolant_temp_c"] == 88.0

    def test_tracks_staleness_per_packet(self):
        d = HondataDecoder()
        d.feed(ID_ENGINE, engine_frame(900, 0, 0, 13.9), now=100.0)
        assert d.seconds_since(ID_ENGINE, now=100.5) == pytest.approx(0.5)
        assert d.seconds_since(ID_TEMPS, now=100.5) is None

    def test_bad_frame_counted_not_raised(self):
        d = HondataDecoder()
        assert d.feed(ID_ENGINE, b"\x00") is False
        assert d.decode_errors == 1
        assert d.frames_decoded == 0


def replay_log(path):
    """Feed a candump log through the decoder.

    Capture one in the car with:  candump -l can0
    Then point this at the resulting candump log to check the decoder
    against real traffic rather than synthetic frames.
    """
    decoder = HondataDecoder()
    with open(path) as handle:
        for line in handle:
            parts = line.split()
            if len(parts) < 3:
                continue
            frame = parts[2]
            if "#" not in frame:
                continue
            id_text, _, payload = frame.partition("#")
            try:
                decoder.feed(int(id_text, 16), bytes.fromhex(payload))
            except ValueError:
                continue
    return decoder
