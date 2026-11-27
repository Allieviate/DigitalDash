#!/bin/bash
# Install the systemd units from this repo.
#
# The units in scripts/ are templates. They carry __USER__, __HOME__,
# __PROJECT_DIR__ and __SERVE_BIN__ placeholders, which have to be
# substituted before systemd will accept them - copy one into place
# unchanged and you get:
#
#   Failed to restart frank-kiosk.service: Unit frank-kiosk.service has
#   a bad unit file setting.
#
# So: never `sudo cp scripts/*.service /etc/systemd/system/`. Run this.
#
# setup_pi.sh installs the same units the same way, but it also does a
# full apt upgrade, rebuilds the virtualenv and reinstalls node modules.
# This is the five-second version for when only a unit file changed.
#
#   ./scripts/install_units.sh              install and reload
#   ./scripts/install_units.sh --dry-run    print them, touch nothing
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# Resolve once, for every unit. These used to be resolved per-unit and
# inconsistently - the kiosk used ${SUDO_USER:-...} while the others
# used $USER - so running setup under sudo produced a display unit
# owned by root with HOME=/home/root, a directory that does not exist.
# X could not write an .Xauthority there and never started at boot.
# id -un rather than $USER as the last resort: $USER is not exported in
# every context (cron, some shells), and an unset variable under set -u
# aborts the script.
RUN_USER="${SUDO_USER:-${USER:-$(id -un)}}"

if [ "$RUN_USER" = "root" ]; then
    echo "Refusing to install units owned by root." >&2
    echo "Run as your normal user; it will sudo where needed:" >&2
    echo "  ./scripts/install_units.sh" >&2
    exit 1
fi

RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
if [ -z "$RUN_HOME" ] || [ ! -d "$RUN_HOME" ]; then
    echo "Home directory for '$RUN_USER' is missing or unreadable: '$RUN_HOME'" >&2
    exit 1
fi

SERVE_BIN="$(command -v serve || true)"
if [ -z "$SERVE_BIN" ]; then
    SERVE_BIN="/usr/local/bin/serve"
    echo "Note: 'serve' not on PATH, assuming $SERVE_BIN"
    echo "      If the frontend will not start: sudo npm install -g serve"
fi

UNITS=(
    frank-can.service
    frank-display.service
    frank-backend.service
    frank-frontend.service
    frank-kiosk.service
)

echo "user:    $RUN_USER ($RUN_HOME)"
echo "project: $PROJECT_DIR"
echo "serve:   $SERVE_BIN"
echo

for unit in "${UNITS[@]}"; do
    source_file="$PROJECT_DIR/scripts/$unit"

    if [ ! -f "$source_file" ]; then
        echo "  skip     $unit (not in repo)"
        continue
    fi

    rendered="$(sed -e "s#__PROJECT_DIR__#$PROJECT_DIR#g" \
                    -e "s#__USER__#$RUN_USER#g" \
                    -e "s#__HOME__#$RUN_HOME#g" \
                    -e "s#__SERVE_BIN__#$SERVE_BIN#g" \
                    "$source_file")"

    # A placeholder left behind means this script has fallen out of step
    # with the unit templates. Installing it would hand systemd a file
    # it rejects, so stop here instead.
    if grep -q '__[A-Z_]\+__' <<< "$rendered"; then
        echo "  ERROR    $unit still contains a placeholder after substitution:" >&2
        grep -o '__[A-Z_]\+__' <<< "$rendered" | sort -u | sed 's/^/             /' >&2
        exit 1
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        echo "===== $unit ====="
        echo "$rendered"
        echo
    else
        printf '%s\n' "$rendered" | sudo tee "/etc/systemd/system/$unit" > /dev/null
        echo "  installed $unit"
    fi
done

if [ "$DRY_RUN" -eq 1 ]; then
    echo "Dry run. Nothing was written."
    exit 0
fi

echo
sudo systemctl daemon-reload
echo "daemon-reload done."
echo
echo "Nothing was restarted. Restart what you changed:"
echo "  sudo systemctl restart frank-backend     # backend code"
echo "  sudo systemctl restart frank-kiosk       # frontend, after npm run build"
echo "  sudo systemctl restart frank-display     # X session (takes the kiosk with it)"
