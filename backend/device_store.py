"""Local JSON store for saved Android Auto devices.

Replaces MongoDB. The dash saves preferences for a handful of phones -
realistically one to five - and a database server plus a Docker
fallback was a lot of moving parts and boot-time dependency for a few
hundred bytes of key-value data. This keeps the Pi self-contained with
no service to start and nothing to go wrong at boot.

On identifying a device
-----------------------
Keyed on the adb serial, not on USB vendor/product ID.

VID/PID looks like the obvious key and is not. An Android phone changes
USB identity partway through connecting: it enumerates under the
manufacturer's ID (a Samsung handset appears as 04e8:xxxx), then the
Android Open Accessory handshake makes it re-enumerate as Google's
accessory ID, 18d1:2d00. Same phone, same cable, two different VID/PID
pairs within one plug-in. A device saved before the handshake would
never match after it.

The serial reported by adb is stable across all of that, which is why
usb-phone-monitor.sh retries five times to get one. VID/PID is still
recorded, and used as a last-resort key when adb never answered, but
it is not the identity.
"""

import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class DeviceStore:
    """Saved device preferences, persisted as one JSON file.

    File I/O is synchronous. With a handful of records the write is a
    fraction of a millisecond, and the complexity of async file access
    would buy nothing.
    """

    def __init__(self, path: Path):
        self.path = path
        self._data: Dict[str, Any] = {"version": SCHEMA_VERSION, "devices": {}}
        self._load()

    # ---- persistence ----

    def _load(self) -> None:
        if not self.path.exists():
            return

        try:
            with self.path.open("r", encoding="utf-8") as handle:
                loaded = json.load(handle)
        except (json.JSONDecodeError, OSError) as exc:
            # A car cuts power without shutting down. If that happened
            # mid-write the file can be truncated. Move it aside and
            # start fresh: losing a few device records is recoverable,
            # a backend that will not start is not.
            corrupt_path = self.path.with_suffix(".corrupt")
            logger.error(
                "Device store at %s is unreadable (%s). Moving to %s and starting empty.",
                self.path, exc, corrupt_path,
            )
            try:
                self.path.replace(corrupt_path)
            except OSError:
                logger.exception("Could not move aside corrupt device store")
            return

        if not isinstance(loaded, dict) or not isinstance(loaded.get("devices"), dict):
            logger.error("Device store at %s has unexpected shape. Starting empty.", self.path)
            return

        self._data = {
            "version": loaded.get("version", SCHEMA_VERSION),
            "devices": loaded["devices"],
        }

    def _save(self) -> None:
        """Write atomically.

        Write to a temp file in the same directory, flush, fsync, then
        rename over the target. os.replace is atomic within a
        filesystem, so a power cut leaves either the old file or the new
        one - never half of either.
        """
        self.path.parent.mkdir(parents=True, exist_ok=True)

        tmp_fd, tmp_name = tempfile.mkstemp(
            dir=str(self.path.parent), prefix=".devices-", suffix=".tmp"
        )
        try:
            with os.fdopen(tmp_fd, "w", encoding="utf-8") as handle:
                json.dump(self._data, handle, indent=2, sort_keys=True)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp_name, self.path)
        except OSError:
            logger.exception("Failed to write device store at %s", self.path)
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
            raise

    # ---- keys ----

    @staticmethod
    def key_for(serial: str = "", device_model: str = "",
                vendor_id: str = "", product_id: str = "") -> str:
        """Pick the most stable identifier available.

        Serial first. Then the model name, which at least survives the
        AOA re-enumeration. VID:PID only as a last resort, and only
        because a device we could not reach over adb is better recorded
        under an unstable key than not recorded at all.
        """
        if serial:
            return f"serial:{serial}"
        if device_model:
            return f"model:{device_model}"
        if vendor_id and product_id:
            return f"usb:{vendor_id}:{product_id}"
        return ""

    # ---- operations ----

    def save(self, record: Dict[str, Any]) -> Optional[str]:
        key = self.key_for(
            serial=record.get("serial", "") or "",
            device_model=record.get("device_model", "") or "",
            vendor_id=record.get("vendor_id", "") or "",
            product_id=record.get("product_id", "") or "",
        )
        if not key:
            return None

        existing = self._data["devices"].get(key, {})
        merged = {**existing, **record, "updated_at": _now()}
        self._data["devices"][key] = merged
        self._save()
        return key

    def find(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Look up by key, serial, model or VID:PID.

        The old MongoDB query matched device_model OR serial, so callers
        pass whichever they happen to have. That stays true here.
        """
        devices = self._data["devices"]

        if identifier in devices:
            return devices[identifier]

        for prefix in ("serial", "model", "usb"):
            candidate = f"{prefix}:{identifier}"
            if candidate in devices:
                return devices[candidate]

        for record in devices.values():
            if identifier in (record.get("serial"), record.get("device_model")):
                return record

        return None

    def list(self) -> List[Dict[str, Any]]:
        return list(self._data["devices"].values())

    def delete(self, identifier: str) -> bool:
        devices = self._data["devices"]

        target_key = None
        if identifier in devices:
            target_key = identifier
        else:
            for key, record in devices.items():
                if identifier in (record.get("serial"), record.get("device_model")):
                    target_key = key
                    break
                if key in (f"serial:{identifier}", f"model:{identifier}"):
                    target_key = key
                    break

        if target_key is None:
            return False

        del devices[target_key]
        self._save()
        return True


def default_store_path() -> Path:
    """Where the device file lives.

    Overridable with FRANK_DATA_DIR. The default sits inside the
    checkout under data/, which is gitignored - so it survives pull and
    checkout, but not git clean -xdf.
    """
    override = os.environ.get("FRANK_DATA_DIR")
    base = Path(override) if override else Path(__file__).parent / "data"
    return base / "devices.json"
