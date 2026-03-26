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
#   /usr/local/bin/frank-usb-monitor connected
#   /usr/local/bin/frank-usb-monitor disconnected

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
    # Wait for device to settle (Samsung devices re-enumerate)
    sleep 3

    SERIAL=""
    DEVICE_NAME="Android Device"
    DEVICE_MODEL=""

    if command -v adb >/dev/null 2>&1; then
        # Try up to 3 times to find the device (Samsung can be slow to enumerate)
        for attempt in 1 2 3; do
            ADB_OUTPUT=$(adb devices -l 2>/dev/null)
            log "ADB attempt $attempt: $ADB_OUTPUT"

            SERIAL=$(echo "$ADB_OUTPUT" | grep -v "^List" | grep "device " | head -1 | awk '{print $1}')

            if [ -n "$SERIAL" ]; then
                break
            fi
            log "No device found, retrying in 2s..."
            sleep 2
        done

        if [ -n "$SERIAL" ]; then
            # Get model name (stable identifier — doesn't change between connections)
            DEVICE_MODEL=$(adb -s "$SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r\n')

            # Get friendly device name
            DEVICE_NAME=$(adb -s "$SERIAL" shell getprop ro.product.marketname 2>/dev/null | tr -d '\r\n')
            if [ -z "$DEVICE_NAME" ]; then
                DEVICE_NAME=$(adb -s "$SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r\n')
            fi
            if [ -z "$DEVICE_NAME" ]; then
                DEVICE_NAME="Android Device"
            fi

            log "Device detected: serial=$SERIAL model=$DEVICE_MODEL name=$DEVICE_NAME"
        else
            log "No ADB device found after 3 attempts"
            exit 0
        fi
    else
        log "ADB not installed, cannot detect device"
        exit 0
    fi

    # Notify FRANK backend with model name as stable identifier
    curl -s -X POST "$API_URL/dhu/device-event" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"connected\",\"serial\":\"$SERIAL\",\"name\":\"$DEVICE_NAME\",\"device_model\":\"$DEVICE_MODEL\",\"vendor_id\":\"$VENDOR_ID\",\"product_id\":\"$PRODUCT_ID\"}" \
        >> "$LOG" 2>&1

    log "Backend notified: connected serial=$SERIAL model=$DEVICE_MODEL"

elif [ "$ACTION" = "disconnected" ]; then
    # Notify backend about disconnection
    curl -s -X POST "$API_URL/dhu/device-event" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"disconnected\",\"serial\":\"\",\"name\":\"\"}" \
        >> "$LOG" 2>&1

    log "Backend notified: disconnected"
fi
