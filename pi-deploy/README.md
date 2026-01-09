# FRANK Digital Dash - Raspberry Pi 5 Deployment

## Quick Install

1. **Copy this entire folder to a USB drive**

2. **On your Raspberry Pi, copy to home folder:**
   ```bash
   cp -r /media/mashumxro/YOUR_USB/pi-deploy ~/
   ```

3. **Run the installer:**
   ```bash
   cd ~/pi-deploy
   sudo bash install.sh
   ```

4. **Enable auto-login:**
   ```bash
   sudo raspi-config
   ```
   - Go to: System Options → Boot / Auto Login → Desktop Autologin

5. **Reboot:**
   ```bash
   sudo reboot
   ```

Done! Your dashboard will start automatically on boot.

---

## Manual Setup (if installer fails)

### Backend
```bash
cd ~/pi-deploy
mkdir -p ~/projects/DigitalDash
cp -r backend ~/projects/DigitalDash/
cp -r frontend ~/projects/DigitalDash/
cp -r scripts ~/projects/DigitalDash/

cd ~/projects/DigitalDash/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Test Backend
```bash
cd ~/projects/DigitalDash/backend
source .venv/bin/activate
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd ~/projects/DigitalDash/frontend
yarn install
yarn build
```

---

## Troubleshooting

**Check backend status:**
```bash
sudo systemctl status dash-backend.service
```

**View logs:**
```bash
journalctl -u dash-backend.service -f
```

**Test API:**
```bash
curl http://localhost:8001/api/
```

**Restart backend:**
```bash
sudo systemctl restart dash-backend.service
```

**Run kiosk manually:**
```bash
~/projects/DigitalDash/scripts/start_kiosk.sh
```

---

## File Structure

```
pi-deploy/
├── install.sh          # Automated installer
├── README.md           # This file
├── backend/
│   ├── server.py       # FastAPI backend
│   └── requirements.txt
├── frontend/
│   └── src/            # React source files
└── scripts/
    └── start_kiosk.sh  # Kiosk launcher
```
