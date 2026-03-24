#!/bin/bash
# ============================================
# FRANK Dashboard - USB Phone Monitor
# Triggered by udev when Android phone connects/disconnects
# ============================================
#
# This script is called by udev rules in /etc/udev/rules.d/51-android.rules
# It detects the phone via ADB and notifies the FRANK backend API.
#
# Usage (called automatically by udev):
#   /opt/frank/scripts/usb-phone-monitor.sh connected
#   /opt/frank/scripts/usb-phone-monitor.sh disconnected

ACTION="${1:-connected}"
VENDOR_ID="${ID_VENDOR_ID:-}"
PRODUCT_ID="${ID_MODEL_ID:-}"

# FRANK backend API URL (localhost since we're on the same Pi)
API_URL="http://localhost:8001/api"

# Log file for debugging
LOG="/tmp/frank-usb-monitor.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [USB-MONITOR] $*" >> "$LOG"
}

log "Event: action=$ACTION vendor=$VENDOR_ID product=$PRODUCT_ID"

if [ "$ACTION" = "connected" ]; then
    # Wait for ADB to detect the device
    sleep 2

    # Get device serial and model via ADB
    SERIAL=""
    DEVICE_NAME="Unknown Device"

    if command -v adb >/dev/null 2>&1; then
        # Restart ADB server to pick up new device
        adb kill-server 2>/dev/null
        sleep 1
        adb start-server 2>/dev/null
        sleep 2

        # Get list of connected devices
        ADB_OUTPUT=$(adb devices -l 2>/dev/null)
        log "ADB output: $ADB_OUTPUT"

        # Parse first connected device
        SERIAL=$(echo "$ADB_OUTPUT" | grep -v "^List" | grep "device " | head -1 | awk '{print $1}')

        if [ -n "$SERIAL" ]; then
            # Try to get device model name
            DEVICE_NAME=$(adb -s "$SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r\n')
            if [ -z "$DEVICE_NAME" ]; then
                DEVICE_NAME=$(adb -s "$SERIAL" shell getprop ro.product.device 2>/dev/null | tr -d '\r\n')
            fi
            if [ -z "$DEVICE_NAME" ]; then
                DEVICE_NAME="Android Device"
            fi
            log "Device detected: serial=$SERIAL name=$DEVICE_NAME"
        else
            log "No ADB device found after connect event"
            exit 0
        fi
    else
        log "ADB not installed, cannot detect device"
        exit 0
    fi

    # Notify FRANK backend
    curl -s -X POST "$API_URL/dhu/device-event" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"connected\",\"serial\":\"$SERIAL\",\"name\":\"$DEVICE_NAME\",\"vendor_id\":\"$VENDOR_ID\",\"product_id\":\"$PRODUCT_ID\"}" \
        >> "$LOG" 2>&1

    log "Backend notified: connected serial=$SERIAL"

elif [ "$ACTION" = "disconnected" ]; then
    # Notify backend about disconnection
    curl -s -X POST "$API_URL/dhu/device-event" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"disconnected\",\"serial\":\"\",\"name\":\"\"}" \
        >> "$LOG" 2>&1

    log "Backend notified: disconnected"
fi
