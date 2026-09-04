#!/bin/bash
# =============================================================================
# Bring a CAN interface up for the dash.
#
# The device-tree overlays in can_config.txt create can0 and can1, but
# they create them DOWN. Something has to configure and raise them on
# every boot, and until this script existed nothing did - which meant
# the backend opened a socket on a down interface, failed, and (before
# the source fix) died silently while the dash showed model defaults.
#
# Run by frank-can.service at boot. Also safe to run by hand during
# bring-up, which is the point of it being a script:
#
#   sudo scripts/can_up.sh can0
#
# Override with environment variables if needed:
#   CAN_BITRATE     default 500000
#   CAN_RESTART_MS  default 100
# =============================================================================
set -euo pipefail

IFACE="${1:-${CAN_INTERFACE:-can0}}"
BITRATE="${CAN_BITRATE:-500000}"
RESTART_MS="${CAN_RESTART_MS:-100}"

# How long to wait for the interface to appear. The mcp2515 driver
# probes over SPI and can be a moment behind the rest of userspace.
WAIT_SECONDS="${CAN_WAIT_SECONDS:-10}"

log() { echo "[can_up] $*"; }

for _ in $(seq 1 "$WAIT_SECONDS"); do
    [ -e "/sys/class/net/$IFACE" ] && break
    sleep 1
done

if [ ! -e "/sys/class/net/$IFACE" ]; then
    log "ERROR: $IFACE does not exist after ${WAIT_SECONDS}s."
    log "The overlays probably did not load. Check that the [all] block"
    log "from scripts/can_config.txt is in /boot/firmware/config.txt, then:"
    log "  dmesg | grep -i mcp"
    exit 1
fi

# Already up? Leave it alone - re-running this should not be
# destructive, and an interface cannot be reconfigured in place anyway.
#
# Note this does not check that the bitrate matches: if you brought it
# up by hand at the wrong speed, this will not correct it. Take it down
# first to change anything:
#   sudo ip link set can0 down
if ip -details link show "$IFACE" | grep -q "state UP"; then
    log "$IFACE is already up; leaving it as it is."
    log "To reconfigure it: sudo ip link set $IFACE down, then re-run this."
    ip -details link show "$IFACE"
    exit 0
fi

# restart-ms is the setting that matters most here, and it is easy to
# leave off.
#
# CAN needs another node to acknowledge every frame. If the dash powers
# up before the ECU - which it will, the Pi boots faster than the
# engine cranks - the KPro is transmitting into silence. Its error
# counters climb and it drops to bus-off, where it stays dead until
# something resets it. restart-ms tells the controller to recover on
# its own after that many milliseconds.
#
# The bitrate must match what KManager is set to broadcast. Hondata
# offers 250k, 500k and 1Mbps; 500k is the default here.
log "Bringing up $IFACE at ${BITRATE} bps (restart-ms ${RESTART_MS})"
ip link set "$IFACE" up type can bitrate "$BITRATE" restart-ms "$RESTART_MS"

log "$IFACE is up."
ip -details -statistics link show "$IFACE"

# The dash is a passive listener. If the TX counter above is ever
# non-zero, something in the software is transmitting onto a bus shared
# with the engine management, and that is a bug worth stopping for.
