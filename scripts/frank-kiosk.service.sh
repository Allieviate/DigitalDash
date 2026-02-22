#!/bin/bash
set -euo pipefail

# Helper to manage kiosk service quickly on Pi deployments.
SERVICE_NAME="frank-kiosk.service"

usage() {
  echo "Usage: $0 {start|stop|restart|status|enable|disable|logs}"
}

cmd="${1:-status}"

case "$cmd" in
  start)
    sudo systemctl daemon-reload
    sudo systemctl start "$SERVICE_NAME"
    ;;
  stop)
    sudo systemctl stop "$SERVICE_NAME"
    ;;
  restart)
    sudo systemctl daemon-reload
    sudo systemctl restart "$SERVICE_NAME"
    ;;
  status)
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
    ;;
  enable)
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    sudo systemctl start "$SERVICE_NAME"
    ;;
  disable)
    sudo systemctl disable "$SERVICE_NAME"
    sudo systemctl stop "$SERVICE_NAME"
    ;;
  logs)
    sudo journalctl -u "$SERVICE_NAME" -n 150 --no-pager
    ;;
  *)
    usage
    exit 1
    ;;
esac
