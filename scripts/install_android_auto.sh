#!/bin/bash
# ============================================
# Android Auto Installer for FRANK Dashboard
# ============================================
#
# This script provides options for installing
# Android Auto support on Raspberry Pi 5
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "  Android Auto Installer - FRANK Dashboard"
echo "=========================================="
echo ""
echo "Choose your installation method:"
echo ""
echo -e "${GREEN}1) web-auto (RECOMMENDED for Pi 5)${NC}"
echo "   - Node.js/TypeScript based"
echo "   - No C++ compilation needed"
echo "   - Electron app or web browser"
echo "   - Easier to integrate with FRANK"
echo ""
echo -e "${YELLOW}2) OpenAuto (openDsh fork)${NC}"
echo "   - Traditional C++ build"
echo "   - Uses system protobuf"
echo "   - May have build issues on Pi 5"
echo ""
echo -e "${BLUE}3) Exit${NC}"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "Installing web-auto..."
        bash "$SCRIPT_DIR/install_web_auto.sh"
        ;;
    2)
        echo ""
        echo "Installing OpenAuto (openDsh fork)..."
        bash "$SCRIPT_DIR/install_openauto_opendsh.sh"
        ;;
    3)
        echo "Exiting."
        exit 0
        ;;
    *)
        echo "Invalid choice. Please run again and select 1, 2, or 3."
        exit 1
        ;;
esac
