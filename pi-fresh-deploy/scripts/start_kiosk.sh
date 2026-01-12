#!/bin/bash

echo "Starting FRANK Digital Dash..."

# Wait for backend
for i in {1..30}; do
    if curl -s http://localhost:8001/api/ > /dev/null 2>&1; then
        echo "Backend ready!"
        break
    fi
    sleep 1
done

# Disable screen blanking
xset s off 2>/dev/null
xset -dpms 2>/dev/null
xset s noblank 2>/dev/null

# Hide cursor
unclutter -idle 0.5 -root &

# Launch Chromium
exec chromium \
    --kiosk \
    --start-fullscreen \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --no-first-run \
    --disable-translate \
    --password-store=basic \
    --disable-features=LockProfileCookieDatabase \
    --app=http://localhost:8001
