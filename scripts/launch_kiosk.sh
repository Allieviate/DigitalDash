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
PROFILE_DIR="$HOME/.config/chromium-kiosk"

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
  --user-data-dir="$PROFILE_DIR"
  --check-for-update-interval=31536000
  --disable-translate
  --disable-sync
  --autoplay-policy=no-user-gesture-required
)

WAYLAND_FLAGS=(
  --ozone-platform=wayland
  --enable-features=UseOzonePlatform
)

# ---------------------------------------------------------------------
# Single instance guard
#
# Chromium will not run two processes against the same --user-data-dir.
# The second one hands its URL to the first, prints "Opening in existing
# browser session", and exits 0.
#
# With Restart=always in the unit, systemd read that clean exit as a
# reason to start again ten seconds later, and did so 376 times. The
# display never changed, because the original instance was the one
# holding the screen the whole time.
#
# So: if something is already using this profile, say so and exit
# non-zero. A failed start that names the reason beats an endless loop
# of successful ones.
# ---------------------------------------------------------------------
if pgrep -f -- "--user-data-dir=$PROFILE_DIR" >/dev/null 2>&1; then
  echo "ERROR: Chromium is already running with profile $PROFILE_DIR."
  echo "       Refusing to start a second instance that would exit 0"
  echo "       and be restarted forever."
  echo
  echo "  To take over the display:"
  echo "    sudo systemctl stop frank-kiosk"
  echo "    pkill -f -- '--user-data-dir=$PROFILE_DIR'"
  echo "    sudo systemctl start frank-kiosk"
  exit 1
fi

# A profile left behind by an unclean exit keeps its lock files. A new
# Chromium sees them, defers to a process that no longer exists, and
# exits 0. Nothing is running now (checked above), so these are stale
# by definition.
if [ -e "$PROFILE_DIR/SingletonLock" ]; then
  echo "[launch_kiosk] Clearing stale profile locks"
  rm -f "$PROFILE_DIR"/Singleton{Lock,Socket,Cookie}
fi

# Wait for frontend to be reachable
echo "[launch_kiosk] Waiting for frontend at $APP_URL..."
frontend_ready=0
for i in $(seq 1 90); do
  if curl -fsS --max-time 2 "${APP_URL}" >/dev/null 2>&1; then
    echo "[launch_kiosk] Frontend ready after ${i}s"
    frontend_ready=1
    break
  fi
  sleep 1
done

# Previously this loop just fell through on timeout and launched anyway,
# so a dead frontend showed as a Chromium error page rather than
# anything that named the problem.
if [ "$frontend_ready" -ne 1 ]; then
  echo "ERROR: Frontend not reachable at $APP_URL after 90s."
  echo "       Check: systemctl status frank-frontend"
  echo "       A failed build leaves build/ broken while serve keeps"
  echo "       handing it out, so check that it built cleanly too."
  exit 1
fi

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

    # Hide mouse cursor (if unclutter is available).
    # Killed first so restarts do not accumulate one per launch.
    if command -v unclutter >/dev/null 2>&1; then
      pkill -x unclutter >/dev/null 2>&1 || true
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
