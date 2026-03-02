#!/bin/bash
# ============================================
# FRANK Dashboard - Quick Diagnostics
# Run this when dashboard shows OFFLINE
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  FRANK Dashboard Diagnostics"
echo "=========================================="
echo ""

# Check MongoDB
echo -e "${YELLOW}[1/5] Checking MongoDB...${NC}"
if systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "${GREEN}✓ MongoDB (mongod) is running${NC}"
elif systemctl is-active --quiet mongodb 2>/dev/null; then
    echo -e "${GREEN}✓ MongoDB (mongodb) is running${NC}"
elif docker ps 2>/dev/null | grep -q frank-mongodb; then
    echo -e "${GREEN}✓ MongoDB (Docker) is running${NC}"
else
    echo -e "${RED}✗ MongoDB is NOT running${NC}"
    echo "  Fix: sudo systemctl start mongod"
    echo "  Or:  sudo docker start frank-mongodb"
fi
echo ""

# Check Backend Service
echo -e "${YELLOW}[2/5] Checking Backend Service...${NC}"
if systemctl is-active --quiet frank-backend; then
    echo -e "${GREEN}✓ frank-backend service is running${NC}"
else
    echo -e "${RED}✗ frank-backend service is NOT running${NC}"
    echo "  Checking logs..."
    sudo journalctl -u frank-backend -n 10 --no-pager 2>/dev/null || echo "  No logs available"
    echo ""
    echo "  Fix: sudo systemctl start frank-backend"
fi
echo ""

# Check Backend API
echo -e "${YELLOW}[3/5] Testing Backend API...${NC}"
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/ 2>/dev/null)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Backend API responding (HTTP 200)${NC}"
    echo "  Vehicle data:"
    curl -s http://localhost:8001/api/vehicle-data 2>/dev/null | head -c 100
    echo "..."
else
    echo -e "${RED}✗ Backend API not responding (HTTP $BACKEND_RESPONSE)${NC}"
    echo "  Check if port 8001 is in use:"
    sudo lsof -i :8001 2>/dev/null || echo "  Port 8001 is free"
fi
echo ""

# Check Frontend Service
echo -e "${YELLOW}[4/5] Checking Frontend Service...${NC}"
if systemctl is-active --quiet frank-frontend; then
    echo -e "${GREEN}✓ frank-frontend service is running${NC}"
else
    echo -e "${RED}✗ frank-frontend service is NOT running${NC}"
    echo "  Fix: sudo systemctl start frank-frontend"
fi
echo ""

# Check Frontend
echo -e "${YELLOW}[5/5] Testing Frontend...${NC}"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend responding (HTTP 200)${NC}"
else
    echo -e "${RED}✗ Frontend not responding (HTTP $FRONTEND_RESPONSE)${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "  Quick Fixes"
echo "=========================================="
echo ""
echo "Restart all services:"
echo "  sudo systemctl restart frank-backend frank-frontend"
echo ""
echo "View live backend logs:"
echo "  sudo journalctl -u frank-backend -f"
echo ""
echo "Manual backend test:"
echo "  cd ~/projects/DigitalDash/backend"
echo "  source venv/bin/activate"
echo "  python -c 'from server import app; print(\"OK\")'"
echo ""
