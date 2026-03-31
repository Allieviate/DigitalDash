#!/bin/bash
# ============================================
# FRANK Dashboard - USB Phone Monitor
# Triggered by udev when Android phone connects/disconnects
# ============================================

ACTION="${1:-connected}"
VENDOR_ID="${ID_VENDOR_ID:-}"
PRODUCT_ID="${ID_MODEL_ID:-}"

API_URL="http://localhost:8001/api"
LOG="/tmp/frank-usb-monitor.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [USB-MONITOR] $*" >> "$LOG"
}

log "Event: action=$ACTION vendor=$VENDOR_ID product=$PRODUCT_ID"

if [ "$ACTION" = "connected" ]; then
    # Ensure ADB daemon is running — this is critical
    adb start-server >> "$LOG" 2>&1
    sleep 3

    SERIAL=""
    DEVICE_NAME="Android Device"
    DEVICE_MODEL=""

    if command -v adb >/dev/null 2>&1; then
        # Try up to 5 times — Samsung phones can be slow to enumerate
        for attempt in 1 2 3 4 5; do
            ADB_OUTPUT=$(adb devices -l 2>/dev/null)
            log "ADB attempt $attempt: $ADB_OUTPUT"

            SERIAL=$(echo "$ADB_OUTPUT" | grep -v "^List" | grep "device " | head -1 | awk '{print $1}')

            if [ -n "$SERIAL" ]; then
                break
            fi

            # If no device found, try restarting ADB on attempt 3
            if [ "$attempt" -eq 3 ]; then
                log "Restarting ADB server..."
                adb kill-server >> "$LOG" 2>&1
                sleep 1
                adb start-server >> "$LOG" 2>&1
                sleep 2
            else
                sleep 2
            fi
        done

        if [ -n "$SERIAL" ]; then
            DEVICE_MODEL=$(adb -s "$SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r\n')
            DEVICE_NAME=$(adb -s "$SERIAL" shell getprop ro.product.marketname 2>/dev/null | tr -d '\r\n')
            if [ -z "$DEVICE_NAME" ]; then
                DEVICE_NAME=$(adb -s "$SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r\n')
            fi
            if [ -z "$DEVICE_NAME" ]; then
                DEVICE_NAME="Android Device"
            fi

            log "Device detected: serial=$SERIAL model=$DEVICE_MODEL name=$DEVICE_NAME"
        else
            log "No ADB device found after 5 attempts"
            exit 0
        fi
    else
        log "ADB not installed"
        exit 0
    fi

    curl -s -X POST "$API_URL/dhu/device-event" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"connected\",\"serial\":\"$SERIAL\",\"name\":\"$DEVICE_NAME\",\"device_model\":\"$DEVICE_MODEL\",\"vendor_id\":\"$VENDOR_ID\",\"product_id\":\"$PRODUCT_ID\"}" \
        >> "$LOG" 2>&1

    log "Backend notified: connected serial=$SERIAL model=$DEVICE_MODEL"

elif [ "$ACTION" = "disconnected" ]; then
    curl -s -X POST "$API_URL/dhu/device-event" \
        -H "Content-Type: application/json" \
        -d "{\"action\":\"disconnected\",\"serial\":\"\",\"name\":\"\"}" \
        >> "$LOG" 2>&1

    log "Backend notified: disconnected"
fi
