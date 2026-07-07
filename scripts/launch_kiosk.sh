#!/bin/bash
set -euo pipefail

# FRANK Kiosk Launcher
# Starts Chromium in fullscreen kiosk mode, pointing to the local React app

CHROMIUM_BIN="$(command -v chromium || command -v chromium-browser || true)"
if [ -z "$CHROMIUM_BIN" ]; then
  echo "ERROR: Chromium binary not found."
  exit 1
fi

APP_URL="http://localhost:3000"

COMMON_FLAGS=(
  --kiosk
  --no-sandbox
  --noerrdialogs
  --disable-infobars
  --disable-session-crashed-bubble
  --disable-restore-session-state
  --no-first-run
  --start-fullscreen
  --disable-background-networking
  --disable-component-update
  --disable-features=OptimizationGuideModelDownloading,MediaRouter
  --user-data-dir="$HOME/.config/chromium-kiosk"
  --check-for-update-interval=31536000
  --disable-translate
  --disable-sync
  --autoplay-policy=no-user-gesture-required
)

WAYLAND_FLAGS=(
  --ozone-platform=wayland
  --enable-features=UseOzonePlatform
)

# Wait for frontend to be reachable
echo "[launch_kiosk] Waiting for frontend at $APP_URL..."
for i in $(seq 1 90); do
  if curl -fsS --max-time 2 "${APP_URL}" >/dev/null 2>&1; then
    echo "[launch_kiosk] Frontend ready after ${i}s"
    break
  fi
  sleep 1
done

# Wait for display socket
echo "[launch_kiosk] Waiting for display..."
for i in $(seq 1 120); do
  if [ -z "${XDG_RUNTIME_DIR:-}" ] && [ -d "/run/user/$(id -u)" ]; then
    export XDG_RUNTIME_DIR="/run/user/$(id -u)"
  fi

  # Try Wayland first
  if [ -n "${XDG_RUNTIME_DIR:-}" ]; then
    wayland_sock="$(find "$XDG_RUNTIME_DIR" -maxdepth 1 -type s -name 'wayland-*' 2>/dev/null | head -n 1 || true)"
    if [ -n "$wayland_sock" ]; then
      export WAYLAND_DISPLAY="$(basename "$wayland_sock")"
      echo "[launch_kiosk] Using Wayland: $WAYLAND_DISPLAY"
      exec "$CHROMIUM_BIN" "${COMMON_FLAGS[@]}" "${WAYLAND_FLAGS[@]}" --app="$APP_URL"
    fi
  fi

  # X11 fallback
  x11_sock="$(find /tmp/.X11-unix -maxdepth 1 -type s -name 'X*' 2>/dev/null | head -n 1 || true)"
  if [ -n "$x11_sock" ]; then
    display_num="${x11_sock##*/X}"
    export DISPLAY=":${display_num}"
    if [ -z "${XAUTHORITY:-}" ] && [ -f "$HOME/.Xauthority" ]; then
      export XAUTHORITY="$HOME/.Xauthority"
    fi
    echo "[launch_kiosk] Using X11: DISPLAY=$DISPLAY"

    # Hide mouse cursor (if unclutter is available)
    if command -v unclutter >/dev/null 2>&1; then
      unclutter -idle 0.1 -root &
    fi

    exec "$CHROMIUM_BIN" "${COMMON_FLAGS[@]}" --app="$APP_URL"
  fi

  sleep 1
done

echo "ERROR: No display socket found after 120s."
ls -la /run/user 2>/dev/null || true
ls -la /tmp/.X11-unix 2>/dev/null || true
exit 1
