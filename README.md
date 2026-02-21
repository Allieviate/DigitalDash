# FRANK DigitalDash

## Ground-up rebuild

If your Pi services run but the kiosk shows a black screen, do a full clean rebuild:

```bash
cd ~/projects/DigitalDash
bash scripts/rebuild_ground_up.sh dash
```

- Use `dash` if your services are `dash-backend`, `dash-frontend`, `dash-kiosk`.
- Use `frank` if your services are `frank-backend`, `frank-frontend`, `frank-kiosk`.

This script will:
- stop services,
- recreate backend virtualenv + `.env`,
- rebuild frontend from clean dependencies + `.env`,
- restart services and print quick health checks.
