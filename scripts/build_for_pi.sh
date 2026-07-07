#!/bin/bash
# =============================================================================
# FRANK - Safe Build Script for Raspberry Pi
# Always uses localhost URL regardless of what's in .env
# Usage: bash build_for_pi.sh
# =============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_DIR/frontend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}FRANK - Building React frontend for Raspberry Pi${NC}"
echo ""

# Check for merge conflict markers
if grep -rn "^<<<<<<<\|^=======\|^>>>>>>>" "$FRONTEND_DIR/src" 2>/dev/null; then
    echo -e "${RED}ERROR: Merge conflict markers found in source! Resolve before building.${NC}"
    exit 1
fi

cd "$FRONTEND_DIR"

# Force localhost URL for Pi builds
export REACT_APP_BACKEND_URL=http://localhost:8001

echo -e "Building with REACT_APP_BACKEND_URL=${GREEN}$REACT_APP_BACKEND_URL${NC}"
echo ""

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Build
npm run build

echo ""
echo -e "${GREEN}Build complete!${NC}"
echo ""

# Verify the build doesn't contain cloud URLs
if grep -rq "preview.emergentagent.com" "$FRONTEND_DIR/build/" 2>/dev/null; then
    echo -e "${RED}WARNING: Build still contains cloud preview URLs!${NC}"
    echo "This means REACT_APP_BACKEND_URL was not applied correctly."
    echo "Try: rm -rf build && REACT_APP_BACKEND_URL=http://localhost:8001 npm run build"
    exit 1
fi

echo -e "${GREEN}Verified: Build uses localhost:8001 for API calls${NC}"
echo ""
echo "To deploy: restart the frontend service"
echo "  sudo systemctl restart frank-frontend"
echo ""
