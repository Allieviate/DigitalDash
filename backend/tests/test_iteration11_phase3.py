"""
Iteration 11 - Phase 3 Testing: USB Auto-detect Fix (Model-based Device ID)
Tests that device preferences are keyed by device_model (ro.product.model) instead of serial.

Key test scenario: Save preferences for device_model=SM-S928B with skip_prompt=true,
then POST /api/dhu/device-event with a DIFFERENT serial but same device_model=SM-S928B
— it should return auto_launched (not prompt_needed).
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase3ModelBasedDeviceID:
    """Phase 3: USB auto-detect uses model name as stable device ID"""

    @pytest.fixture(autouse=True)
    def cleanup_test_devices(self):
        """Cleanup test devices before and after tests"""
        # Cleanup before
        test_models = ['TEST_SM-S928B', 'TEST_PIXEL8', 'TEST_DELETE_MODEL']
        for model in test_models:
            try:
                requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{model}")
            except:
                pass
        yield
        # Cleanup after
        for model in test_models:
            try:
                requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{model}")
            except:
                pass

    def test_device_event_with_device_model_field(self):
        """POST /api/dhu/device-event accepts device_model field"""
        response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "connected",
            "serial": "TEST_SERIAL_001",
            "name": "Galaxy S24 Ultra",
            "device_model": "TEST_SM-S928B"
        })
        assert response.status_code == 200
        data = response.json()
        # First connection should prompt (no saved prefs)
        assert data.get("status") == "prompt_needed"
        print("✓ device-event accepts device_model field")

    def test_save_preferences_keyed_by_model(self):
        """POST /api/dhu/device-preferences saves with device_model as key"""
        response = requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": "TEST_SERIAL_001",
            "device_model": "TEST_SM-S928B",
            "name": "Galaxy S24 Ultra",
            "connection_type": "usb",
            "auto_launch": True,
            "skip_prompt": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "saved"
        assert data.get("device_model") == "TEST_SM-S928B"
        print("✓ Preferences saved keyed by device_model")

    def test_get_preferences_by_model_name(self):
        """GET /api/dhu/device-preferences/{model} lookup by model name works"""
        # First save
        requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": "TEST_SERIAL_002",
            "device_model": "TEST_PIXEL8",
            "name": "Pixel 8 Pro",
            "connection_type": "usb",
            "skip_prompt": True
        })
        
        # Then lookup by model
        response = requests.get(f"{BASE_URL}/api/dhu/device-preferences/TEST_PIXEL8")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "found"
        assert data["preferences"]["device_model"] == "TEST_PIXEL8"
        assert data["preferences"]["skip_prompt"] == True
        print("✓ GET by model name works")

    def test_delete_preferences_by_model(self):
        """DELETE /api/dhu/device-preferences/{model} works"""
        # First save
        requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": "TEST_SERIAL_DEL",
            "device_model": "TEST_DELETE_MODEL",
            "name": "Test Delete Device",
            "skip_prompt": True
        })
        
        # Delete by model
        response = requests.delete(f"{BASE_URL}/api/dhu/device-preferences/TEST_DELETE_MODEL")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "deleted"
        
        # Verify deleted
        verify = requests.get(f"{BASE_URL}/api/dhu/device-preferences/TEST_DELETE_MODEL")
        assert verify.json().get("status") == "not_found"
        print("✓ DELETE by model name works")

    def test_same_model_different_serial_auto_launches(self):
        """
        KEY TEST: Same model with different serial auto-launches.
        Save prefs for model SM-S928B with skip_prompt=true,
        then send device-event with NEW serial but same model — should return auto_launched.
        """
        # Step 1: Save preferences for model TEST_SM-S928B with skip_prompt=true
        save_response = requests.post(f"{BASE_URL}/api/dhu/device-preferences", json={
            "serial": "ORIGINAL_SERIAL_ABC123",
            "device_model": "TEST_SM-S928B",
            "name": "Galaxy S24 Ultra",
            "connection_type": "usb",
            "auto_launch": True,
            "skip_prompt": True
        })
        assert save_response.status_code == 200
        print("  Step 1: Saved prefs for TEST_SM-S928B with skip_prompt=true")
        
        # Step 2: Send device-event with DIFFERENT serial but SAME model
        event_response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "connected",
            "serial": "NEW_SERIAL_XYZ789",  # Different serial!
            "name": "Galaxy S24 Ultra",
            "device_model": "TEST_SM-S928B"  # Same model!
        })
        assert event_response.status_code == 200
        data = event_response.json()
        
        # Should return auto_launched (not prompt_needed) because model matches
        assert data.get("status") == "auto_launched", \
            f"Expected auto_launched but got {data.get('status')}. Model-based lookup failed!"
        print("✓ Same model with different serial returns auto_launched")


class TestPhase2SimplifiedDHU:
    """Phase 2: Removed embedded/fullscreen modes, simplified to just launch/stop"""

    def test_dhu_start_no_mode_params(self):
        """POST /api/dhu/start only accepts borderless+alwaysOnTop, no x/y/width/height/mode"""
        response = requests.post(f"{BASE_URL}/api/dhu/start", json={
            "borderless": True,
            "alwaysOnTop": True
        })
        # Should work (may return error if OpenAuto not installed, but endpoint works)
        assert response.status_code == 200
        data = response.json()
        # Status should be 'running' or 'error' (not installed)
        assert data.get("status") in ["running", "error"]
        print("✓ POST /api/dhu/start works with borderless+alwaysOnTop only")

    def test_dhu_resize_endpoint_removed(self):
        """GET/POST /api/dhu/resize should NOT exist (removed)"""
        response = requests.post(f"{BASE_URL}/api/dhu/resize", json={
            "x": 100, "y": 100, "width": 800, "height": 600
        })
        # Should return 404 or 405 (endpoint doesn't exist)
        assert response.status_code in [404, 405, 422], \
            f"Expected 404/405/422 but got {response.status_code}. /api/dhu/resize should be removed!"
        print("✓ /api/dhu/resize endpoint does NOT exist (removed)")

    def test_dhu_status_returns_phone_connected(self):
        """GET /api/dhu/status returns phone_connected and status fields"""
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        assert response.status_code == 200
        data = response.json()
        assert "phone_connected" in data
        assert "status" in data
        assert isinstance(data["phone_connected"], bool)
        print("✓ GET /api/dhu/status returns phone_connected and status")

    def test_dhu_devices_list(self):
        """GET /api/dhu/devices lists all saved devices"""
        response = requests.get(f"{BASE_URL}/api/dhu/devices")
        assert response.status_code == 200
        data = response.json()
        assert "devices" in data
        assert isinstance(data["devices"], list)
        print("✓ GET /api/dhu/devices returns device list")


class TestPhase1TurnSignals:
    """Phase 1: Turn signals always solid-filled thick chevrons"""

    def test_vehicle_data_has_turn_signals(self):
        """GET /api/vehicle-data returns turn_left and turn_right booleans"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        assert "turn_left" in data
        assert "turn_right" in data
        assert isinstance(data["turn_left"], bool)
        assert isinstance(data["turn_right"], bool)
        print("✓ Vehicle data includes turn_left and turn_right")


class TestBasicEndpoints:
    """Basic endpoint health checks"""

    def test_api_root(self):
        """GET /api/ returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ API root accessible")

    def test_vehicle_data(self):
        """GET /api/vehicle-data returns all expected fields"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        expected_fields = ['rpm', 'speed_mph', 'gear', 'fuel_pct', 'coolant_temp_c', 
                          'oil_pressure_psi', 'battery_voltage', 'turn_left', 'turn_right']
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print("✓ Vehicle data has all expected fields")

    def test_themes(self):
        """GET /api/themes returns theme list"""
        response = requests.get(f"{BASE_URL}/api/themes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print("✓ Themes endpoint works")

    def test_settings(self):
        """GET /api/settings returns 200"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        print("✓ Settings endpoint works")

    def test_diagnostics(self):
        """GET /api/diagnostics returns diagnostic data"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code == 200
        data = response.json()
        assert "engine" in data
        assert "fuel" in data
        assert "electrical" in data
        print("✓ Diagnostics endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
