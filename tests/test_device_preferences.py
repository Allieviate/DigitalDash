"""
Test Device Preferences and Device Event APIs
Tests for USB auto-detect + device preferences + prompt modal feature
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDeviceEventAPI:
    """Tests for POST /api/dhu/device-event endpoint"""
    
    def test_device_connected_new_device_returns_prompt_needed(self):
        """New device connection should return prompt_needed status"""
        # First, ensure device doesn't exist by deleting it
        serial = "TEST_NEW_DEVICE_001"
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        
        response = requests.post(
            f"{BASE_URL}/api/dhu/device-event",
            json={
                "action": "connected",
                "serial": serial,
                "name": "Test Phone New",
                "vendor_id": "18d1",
                "product_id": "4ee1"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "prompt_needed"
        assert data["serial"] == serial
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
    
    def test_device_connected_known_device_with_skip_prompt_returns_auto_launched(self):
        """Known device with skip_prompt=true should auto-launch"""
        serial = "TEST_KNOWN_DEVICE_002"
        
        # First save preferences with skip_prompt=true
        save_response = requests.post(
            f"{BASE_URL}/api/dhu/device-preferences",
            json={
                "serial": serial,
                "name": "Test Phone Known",
                "connection_type": "usb",
                "aa_mode": "embedded",
                "auto_launch": True,
                "skip_prompt": True
            }
        )
        assert save_response.status_code == 200
        
        # Now connect the device
        response = requests.post(
            f"{BASE_URL}/api/dhu/device-event",
            json={
                "action": "connected",
                "serial": serial,
                "name": "Test Phone Known"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "auto_launched"
        assert data["mode"] == "embedded"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        requests.post(f"{BASE_URL}/api/dhu/stop")
    
    def test_device_connected_known_device_fullscreen_mode(self):
        """Known device with fullscreen mode should auto-launch in fullscreen"""
        serial = "TEST_FULLSCREEN_DEVICE_003"
        
        # Save preferences with fullscreen mode
        save_response = requests.post(
            f"{BASE_URL}/api/dhu/device-preferences",
            json={
                "serial": serial,
                "name": "Test Phone Fullscreen",
                "connection_type": "usb",
                "aa_mode": "fullscreen",
                "auto_launch": True,
                "skip_prompt": True
            }
        )
        assert save_response.status_code == 200
        
        # Connect the device
        response = requests.post(
            f"{BASE_URL}/api/dhu/device-event",
            json={
                "action": "connected",
                "serial": serial,
                "name": "Test Phone Fullscreen"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "auto_launched"
        assert data["mode"] == "fullscreen"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        requests.post(f"{BASE_URL}/api/dhu/stop")
    
    def test_device_disconnected_returns_stopped(self):
        """Device disconnection should return stopped status"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/device-event",
            json={
                "action": "disconnected",
                "serial": "TEST_DISCONNECT_004"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "stopped"
        assert "disconnected" in data["message"].lower()
    
    def test_device_event_unknown_action_returns_ignored(self):
        """Unknown action should return ignored status"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/device-event",
            json={
                "action": "unknown_action",
                "serial": "TEST_UNKNOWN_005"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ignored"


class TestDHUStatusWithDeviceEvent:
    """Tests for GET /api/dhu/status with device_event field"""
    
    def test_status_returns_pending_device_event(self):
        """Status should return pending device event and consume it"""
        serial = "TEST_STATUS_EVENT_006"
        
        # Ensure device doesn't exist
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        
        # Trigger a device event
        requests.post(
            f"{BASE_URL}/api/dhu/device-event",
            json={
                "action": "connected",
                "serial": serial,
                "name": "Test Phone Status"
            }
        )
        
        # First status call should return the event
        response1 = requests.get(f"{BASE_URL}/api/dhu/status")
        assert response1.status_code == 200
        data1 = response1.json()
        
        assert "device_event" in data1
        assert data1["device_event"]["type"] == "prompt_needed"
        assert data1["device_event"]["serial"] == serial
        
        # Second status call should NOT return the event (consumed)
        response2 = requests.get(f"{BASE_URL}/api/dhu/status")
        assert response2.status_code == 200
        data2 = response2.json()
        
        assert "device_event" not in data2 or data2.get("device_event") is None
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
    
    def test_status_returns_status_field(self):
        """Status should always return status field"""
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["running", "stopped"]


class TestDevicePreferencesAPI:
    """Tests for device preferences CRUD endpoints"""
    
    def test_save_device_preferences(self):
        """POST /api/dhu/device-preferences should save preferences"""
        serial = "TEST_SAVE_PREFS_007"
        
        response = requests.post(
            f"{BASE_URL}/api/dhu/device-preferences",
            json={
                "serial": serial,
                "name": "Test Phone Save",
                "connection_type": "usb",
                "aa_mode": "embedded",
                "auto_launch": True,
                "skip_prompt": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "saved"
        assert data["serial"] == serial
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
    
    def test_save_device_preferences_bluetooth(self):
        """Should save bluetooth connection type"""
        serial = "TEST_BT_PREFS_008"
        
        response = requests.post(
            f"{BASE_URL}/api/dhu/device-preferences",
            json={
                "serial": serial,
                "name": "Test Phone BT",
                "connection_type": "bluetooth",
                "aa_mode": "fullscreen",
                "auto_launch": True,
                "skip_prompt": True
            }
        )
        
        assert response.status_code == 200
        
        # Verify saved correctly
        get_response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        assert get_response.status_code == 200
        prefs = get_response.json()["preferences"]
        assert prefs["connection_type"] == "bluetooth"
        assert prefs["aa_mode"] == "fullscreen"
        assert prefs["skip_prompt"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
    
    def test_get_device_preferences_found(self):
        """GET /api/dhu/device-preferences/{serial} should return saved preferences"""
        serial = "TEST_GET_PREFS_009"
        
        # First save
        requests.post(
            f"{BASE_URL}/api/dhu/device-preferences",
            json={
                "serial": serial,
                "name": "Test Phone Get",
                "connection_type": "usb",
                "aa_mode": "embedded",
                "auto_launch": True,
                "skip_prompt": True
            }
        )
        
        # Then get
        response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "found"
        assert "preferences" in data
        prefs = data["preferences"]
        assert prefs["serial"] == serial
        assert prefs["name"] == "Test Phone Get"
        assert prefs["connection_type"] == "usb"
        assert prefs["aa_mode"] == "embedded"
        assert prefs["skip_prompt"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
    
    def test_get_device_preferences_not_found(self):
        """GET /api/dhu/device-preferences/{serial} should return not_found for unknown device"""
        response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/NONEXISTENT_SERIAL_999")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_found"
    
    def test_delete_device_preferences(self):
        """DELETE /api/dhu/device-preferences/{serial} should remove preferences"""
        serial = "TEST_DELETE_PREFS_010"
        
        # First save
        requests.post(
            f"{BASE_URL}/api/dhu/device-preferences",
            json={
                "serial": serial,
                "name": "Test Phone Delete",
                "connection_type": "usb",
                "aa_mode": "embedded",
                "auto_launch": True,
                "skip_prompt": False
            }
        )
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        assert get_response.json()["status"] == "not_found"
    
    def test_delete_device_preferences_not_found(self):
        """DELETE should return not_found for unknown device"""
        response = requests.delete(f"{BASE_URL}/api/dhu/device-preferences/NONEXISTENT_SERIAL_888")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_found"
    
    def test_update_device_preferences(self):
        """POST should update existing preferences (upsert)"""
        serial = "TEST_UPDATE_PREFS_011"
        
        # First save
        requests.post(
            f"{BASE_URL}/api/dhu/device-preferences",
            json={
                "serial": serial,
                "name": "Test Phone Original",
                "connection_type": "usb",
                "aa_mode": "embedded",
                "auto_launch": True,
                "skip_prompt": False
            }
        )
        
        # Update
        response = requests.post(
            f"{BASE_URL}/api/dhu/device-preferences",
            json={
                "serial": serial,
                "name": "Test Phone Updated",
                "connection_type": "bluetooth",
                "aa_mode": "fullscreen",
                "auto_launch": True,
                "skip_prompt": True
            }
        )
        assert response.status_code == 200
        
        # Verify updated
        get_response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        prefs = get_response.json()["preferences"]
        assert prefs["name"] == "Test Phone Updated"
        assert prefs["connection_type"] == "bluetooth"
        assert prefs["aa_mode"] == "fullscreen"
        assert prefs["skip_prompt"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")


class TestListKnownDevices:
    """Tests for GET /api/dhu/devices endpoint"""
    
    def test_list_known_devices(self):
        """GET /api/dhu/devices should list all known devices"""
        # Create a few test devices
        serials = ["TEST_LIST_A", "TEST_LIST_B", "TEST_LIST_C"]
        
        for i, serial in enumerate(serials):
            requests.post(
                f"{BASE_URL}/api/dhu/device-preferences",
                json={
                    "serial": serial,
                    "name": f"Test Phone {i}",
                    "connection_type": "usb",
                    "aa_mode": "embedded",
                    "auto_launch": True,
                    "skip_prompt": False
                }
            )
        
        # List devices
        response = requests.get(f"{BASE_URL}/api/dhu/devices")
        assert response.status_code == 200
        data = response.json()
        
        assert "devices" in data
        assert isinstance(data["devices"], list)
        
        # Check our test devices are in the list
        device_serials = [d["serial"] for d in data["devices"]]
        for serial in serials:
            assert serial in device_serials
        
        # Cleanup
        for serial in serials:
            requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
    
    def test_list_devices_returns_all_fields(self):
        """Listed devices should have all preference fields"""
        serial = "TEST_LIST_FIELDS_012"
        
        requests.post(
            f"{BASE_URL}/api/dhu/device-preferences",
            json={
                "serial": serial,
                "name": "Test Phone Fields",
                "connection_type": "bluetooth",
                "aa_mode": "fullscreen",
                "auto_launch": True,
                "skip_prompt": True
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/dhu/devices")
        data = response.json()
        
        # Find our device
        device = next((d for d in data["devices"] if d["serial"] == serial), None)
        assert device is not None
        
        # Check all fields
        assert device["name"] == "Test Phone Fields"
        assert device["connection_type"] == "bluetooth"
        assert device["aa_mode"] == "fullscreen"
        assert device["auto_launch"] == True
        assert device["skip_prompt"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")


# Cleanup fixture to ensure test data is removed
@pytest.fixture(autouse=True, scope="module")
def cleanup_test_data():
    """Cleanup any leftover test data before and after tests"""
    yield
    # Cleanup after all tests
    test_prefixes = ["TEST_"]
    try:
        response = requests.get(f"{BASE_URL}/api/dhu/devices")
        if response.status_code == 200:
            devices = response.json().get("devices", [])
            for device in devices:
                if any(device.get("serial", "").startswith(prefix) for prefix in test_prefixes):
                    requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{device['serial']}")
    except:
        pass
