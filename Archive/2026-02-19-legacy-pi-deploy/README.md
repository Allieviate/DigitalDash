# Archived legacy Pi deployment bundles (2026-02-19)

These directories were moved out of the repo root to reduce confusion and prevent accidental use of outdated deployment/update paths:

- `pi-deploy/`
- `pi-fresh-deploy/`
- `pi-update/`

## Why archived

These bundles were standalone copy-to-Pi snapshots with overlapping behavior and hardcoded assumptions (package names, usernames, and old app files). They are not referenced by the active root deployment flow (`scripts/setup_pi.sh`, `scripts/start.sh`, and service units), and keeping them in the root made it easy to run the wrong installer.

## Recovery / rollback use

If you ever need historical recovery points, files remain intact in this archive folder. You can restore a bundle by moving it back to the repo root.

