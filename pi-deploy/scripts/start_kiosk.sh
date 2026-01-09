#!/bin/bash

# FRANK Digital Dash - Kiosk Startup Script

echo "Starting FRANK Digital Dash..."

# Wait for backend to be ready
echo "Waiting for backend..."
for i in {1..30}; do
    if curl -s http://localhost:8001/api/ > /dev/null 2>&1; then
        echo "Backend ready!"
        break
    fi
    echo "  Attempt $i/30..."
    sleep 1
done

# Disable screen blanking
xset s off 2>/dev/null
xset -dpms 2>/dev/null
xset s noblank 2>/dev/null

# Hide cursor after inactivity
unclutter -idle 0.5 -root &

# Kill any existing Chromium instances
pkill -f chromium 2>/dev/null || true
sleep 1

# Launch Chromium in kiosk mode
exec chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --no-first-run \
    --start-fullscreen \
    --disable-translate \
    --disable-features=TranslateUI \
    --check-for-update-interval=31536000 \
    --app=http://localhost:8001
