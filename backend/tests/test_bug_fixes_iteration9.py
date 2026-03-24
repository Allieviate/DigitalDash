"""
Bug Fix Testing - Iteration 9
Tests for 5 user-reported issues:
1. Auto-connect doesn't work - ADB polling added
2. AA panel should only show when phone connected
3. Black screen when launched - fullscreen only when DHU running AND mode is fullscreen
4. Device prompt not popping up - ADB monitor + device-event flow
5. Devices not saved - consequence of prompt not showing
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDHUStatusEndpoint:
    """Test GET /api/dhu/status returns correct phone_connected state"""
    
    def test_status_returns_phone_connected_false_no_adb(self):
        """In cloud env, no ADB devices so phone_connected should be false"""
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        assert response.status_code == 200
        data = response.json()
        
        # Verify phone_connected field exists and is false (no ADB in cloud)
        assert "phone_connected" in data, "phone_connected field missing from status"
        assert data["phone_connected"] == False, "phone_connected should be false in cloud env"
        
        # Verify status field exists
        assert "status" in data, "status field missing"
        assert data["status"] in ["running", "stopped"], f"Invalid status: {data['status']}"
        print(f"✓ GET /api/dhu/status returns phone_connected: {data['phone_connected']}")
    
    def test_status_returns_device_event_when_pending(self):
        """Test that device_event is returned when one is pending"""
        # First, trigger a device event
        event_response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "connected",
            "serial": "TEST_STATUS_CHECK_001",
            "name": "Test Phone Status Check"
        })
        assert event_response.status_code == 200
        
        # Now check status - should include device_event
        status_response = requests.get(f"{BASE_URL}/api/dhu/status")
        assert status_response.status_code == 200
        data = status_response.json()
        
        # device_event should be present
        assert "device_event" in data, "device_event should be present after POST"
        assert data["device_event"]["type"] == "prompt_needed"
        assert data["device_event"]["serial"] == "TEST_STATUS_CHECK_001"
        print(f"✓ device_event returned in status: {data['device_event']['type']}")
        
        # Second call should NOT have device_event (consumed on read)
        status_response2 = requests.get(f"{BASE_URL}/api/dhu/status")
        data2 = status_response2.json()
        assert "device_event" not in data2, "device_event should be consumed on first read"
        print("✓ device_event consumed on read (not present in second call)")


class TestDeviceEventEndpoint:
    """Test POST /api/dhu/device-event for various scenarios"""
    
    def test_new_device_returns_prompt_needed(self):
        """New device (no saved prefs) should return prompt_needed"""
        # Clean up any existing prefs for this serial
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/TEST_NEW_DEVICE_009")
        
        response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "connected",
            "serial": "TEST_NEW_DEVICE_009",
            "name": "Test Phone New"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "prompt_needed", f"Expected prompt_needed, got {data['status']}"
        assert data["serial"] == "TEST_NEW_DEVICE_009"
        print(f"✓ New device returns prompt_needed: {data}")
        
        # Consume the pending event
        requests.get(f"{BASE_URL}/api/dhu/status")
    
    def test_known_device_with_skip_prompt_returns_auto_launched(self):
        """Known device with skip_prompt=true should auto-launch"""
        serial = "TEST_KNOWN_DEVICE_009"
        
        # First save preferences with skip_prompt=true
        save_response = requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": serial,
            "name": "Test Phone Known",
            "connection_type": "usb",
            "aa_mode": "embedded",
            "auto_launch": True,
            "skip_prompt": True
        })
        assert save_response.status_code == 200
        
        # Now trigger device event
        response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "connected",
            "serial": serial,
            "name": "Test Phone Known"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "auto_launched", f"Expected auto_launched, got {data['status']}"
        assert data["mode"] == "embedded"
        print(f"✓ Known device with skip_prompt returns auto_launched: {data}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        requests.get(f"{BASE_URL}/api/dhu/status")  # Consume event
    
    def test_known_device_fullscreen_mode(self):
        """Known device with fullscreen mode should auto-launch in fullscreen"""
        serial = "TEST_FULLSCREEN_DEVICE_009"
        
        # Save preferences with fullscreen mode
        save_response = requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": serial,
            "name": "Test Phone Fullscreen",
            "connection_type": "usb",
            "aa_mode": "fullscreen",
            "auto_launch": True,
            "skip_prompt": True
        })
        assert save_response.status_code == 200
        
        # Trigger device event
        response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "connected",
            "serial": serial,
            "name": "Test Phone Fullscreen"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "auto_launched"
        assert data["mode"] == "fullscreen", f"Expected fullscreen mode, got {data.get('mode')}"
        print(f"✓ Fullscreen device auto-launches in fullscreen mode: {data}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        requests.get(f"{BASE_URL}/api/dhu/status")
    
    def test_disconnected_stops_dhu(self):
        """Disconnected action should stop DHU"""
        response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "disconnected",
            "serial": "TEST_DISCONNECT_009",
            "name": "Unknown Device"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "stopped", f"Expected stopped, got {data['status']}"
        print(f"✓ Disconnected action returns stopped: {data}")
        
        # Consume event
        requests.get(f"{BASE_URL}/api/dhu/status")
    
    def test_unknown_action_returns_ignored(self):
        """Unknown action should return ignored"""
        response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "unknown_action",
            "serial": "TEST_UNKNOWN_009",
            "name": "Unknown Device"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "ignored", f"Expected ignored, got {data['status']}"
        print(f"✓ Unknown action returns ignored: {data}")


class TestDevicePreferencesEndpoint:
    """Test device preferences CRUD operations"""
    
    def test_save_device_preferences(self):
        """POST /api/dhu/device-preferences saves correctly"""
        serial = "TEST_SAVE_PREFS_009"
        
        response = requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": serial,
            "name": "Test Save Device",
            "connection_type": "usb",
            "aa_mode": "embedded",
            "auto_launch": True,
            "skip_prompt": False
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "saved"
        assert data["serial"] == serial
        print(f"✓ Device preferences saved: {data}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        
        assert get_data["status"] == "found"
        assert get_data["preferences"]["serial"] == serial
        assert get_data["preferences"]["name"] == "Test Save Device"
        assert get_data["preferences"]["connection_type"] == "usb"
        assert get_data["preferences"]["aa_mode"] == "embedded"
        print(f"✓ Device preferences verified via GET: {get_data['preferences']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
    
    def test_save_bluetooth_connection_type(self):
        """POST /api/dhu/device-preferences saves bluetooth connection type"""
        serial = "TEST_BT_PREFS_009"
        
        response = requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": serial,
            "name": "Test BT Device",
            "connection_type": "bluetooth",
            "aa_mode": "fullscreen",
            "auto_launch": False,
            "skip_prompt": True
        })
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        get_data = get_response.json()
        
        assert get_data["preferences"]["connection_type"] == "bluetooth"
        assert get_data["preferences"]["aa_mode"] == "fullscreen"
        print(f"✓ Bluetooth connection type saved correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
    
    def test_get_unknown_device_returns_not_found(self):
        """GET /api/dhu/device-preferences/{serial} returns not_found for unknown"""
        response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/NONEXISTENT_DEVICE_XYZ")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "not_found"
        print(f"✓ Unknown device returns not_found: {data}")
    
    def test_delete_device_preferences(self):
        """DELETE /api/dhu/device-preferences/{serial} removes device"""
        serial = "TEST_DELETE_PREFS_009"
        
        # First save
        requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": serial,
            "name": "Test Delete Device",
            "connection_type": "usb",
            "aa_mode": "embedded",
            "auto_launch": True,
            "skip_prompt": False
        })
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        assert delete_response.status_code == 200
        data = delete_response.json()
        
        assert data["status"] == "deleted"
        print(f"✓ Device preferences deleted: {data}")
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        get_data = get_response.json()
        assert get_data["status"] == "not_found"
        print("✓ Verified device no longer exists after delete")


class TestDevicesListEndpoint:
    """Test GET /api/dhu/devices endpoint"""
    
    def test_list_devices(self):
        """GET /api/dhu/devices lists all saved devices"""
        # Create a test device
        serial = "TEST_LIST_DEVICE_009"
        requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": serial,
            "name": "Test List Device",
            "connection_type": "usb",
            "aa_mode": "embedded",
            "auto_launch": True,
            "skip_prompt": False
        })
        
        # List devices
        response = requests.get(f"{BASE_URL}/api/dhu/devices")
        assert response.status_code == 200
        data = response.json()
        
        assert "devices" in data
        assert isinstance(data["devices"], list)
        
        # Find our test device
        test_device = next((d for d in data["devices"] if d["serial"] == serial), None)
        assert test_device is not None, f"Test device {serial} not found in list"
        assert test_device["name"] == "Test List Device"
        print(f"✓ GET /api/dhu/devices returns device list with {len(data['devices'])} devices")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")


class TestDHUStartStopEndpoints:
    """Test DHU start/stop endpoints (will return error in cloud env)"""
    
    def test_dhu_start_endpoint_exists(self):
        """POST /api/dhu/start endpoint exists and responds"""
        response = requests.post(f"{BASE_URL}/api/dhu/start", json={
            "mode": "embedded",
            "borderless": True,
            "alwaysOnTop": True
        })
        assert response.status_code == 200
        data = response.json()
        
        # In cloud env, will return error (no OpenAuto installed) - that's expected
        assert "status" in data
        print(f"✓ POST /api/dhu/start responds: {data['status']}")
    
    def test_dhu_stop_endpoint_exists(self):
        """POST /api/dhu/stop endpoint exists and responds"""
        response = requests.post(f"{BASE_URL}/api/dhu/stop")
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        print(f"✓ POST /api/dhu/stop responds: {data['status']}")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Cleanup all TEST_ prefixed devices
    test_serials = [
        "TEST_STATUS_CHECK_001",
        "TEST_NEW_DEVICE_009",
        "TEST_KNOWN_DEVICE_009",
        "TEST_FULLSCREEN_DEVICE_009",
        "TEST_DISCONNECT_009",
        "TEST_UNKNOWN_009",
        "TEST_SAVE_PREFS_009",
        "TEST_BT_PREFS_009",
        "TEST_DELETE_PREFS_009",
        "TEST_LIST_DEVICE_009"
    ]
    for serial in test_serials:
        try:
            requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        except:
            pass
    print("\n✓ Test data cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
