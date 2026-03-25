"""
Iteration 10 Testing - New Features:
1. Turn Signal SVG Filter Glow Fix - WarningPanel.jsx TurnArrow component
2. Info Gauges Added to Dashboard - Fuel, Coolant, Battery, Oil Pressure
3. Visual Polish - Removed unused TurnIndicators.jsx

Backend Tests:
- Verify /api/vehicle-data returns all required signals for info gauges
- Verify /api/dhu/status endpoint still works
- Verify /api/dhu/device-event endpoint still works
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestVehicleDataEndpoint:
    """Test GET /api/vehicle-data returns all required signals for info gauges"""
    
    def test_vehicle_data_returns_fuel_pct(self):
        """Verify fuel_pct signal is returned"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        
        assert "fuel_pct" in data, "fuel_pct field missing from vehicle-data"
        assert isinstance(data["fuel_pct"], (int, float)), "fuel_pct should be numeric"
        assert 0 <= data["fuel_pct"] <= 1, f"fuel_pct should be 0-1, got {data['fuel_pct']}"
        print(f"✓ fuel_pct returned: {data['fuel_pct']}")
    
    def test_vehicle_data_returns_coolant_temp_c(self):
        """Verify coolant_temp_c signal is returned"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        
        assert "coolant_temp_c" in data, "coolant_temp_c field missing from vehicle-data"
        assert isinstance(data["coolant_temp_c"], (int, float)), "coolant_temp_c should be numeric"
        assert 0 <= data["coolant_temp_c"] <= 150, f"coolant_temp_c should be reasonable, got {data['coolant_temp_c']}"
        print(f"✓ coolant_temp_c returned: {data['coolant_temp_c']}°C")
    
    def test_vehicle_data_returns_battery_voltage(self):
        """Verify battery_voltage signal is returned"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        
        assert "battery_voltage" in data, "battery_voltage field missing from vehicle-data"
        assert isinstance(data["battery_voltage"], (int, float)), "battery_voltage should be numeric"
        assert 10 <= data["battery_voltage"] <= 16, f"battery_voltage should be 10-16V, got {data['battery_voltage']}"
        print(f"✓ battery_voltage returned: {data['battery_voltage']}V")
    
    def test_vehicle_data_returns_oil_pressure_psi(self):
        """Verify oil_pressure_psi signal is returned"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        
        assert "oil_pressure_psi" in data, "oil_pressure_psi field missing from vehicle-data"
        assert isinstance(data["oil_pressure_psi"], (int, float)), "oil_pressure_psi should be numeric"
        assert 0 <= data["oil_pressure_psi"] <= 100, f"oil_pressure_psi should be 0-100, got {data['oil_pressure_psi']}"
        print(f"✓ oil_pressure_psi returned: {data['oil_pressure_psi']} PSI")
    
    def test_vehicle_data_returns_turn_signals(self):
        """Verify turn signal states are returned (for SVG glow testing)"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        
        assert "turn_left" in data, "turn_left field missing from vehicle-data"
        assert "turn_right" in data, "turn_right field missing from vehicle-data"
        assert isinstance(data["turn_left"], bool), "turn_left should be boolean"
        assert isinstance(data["turn_right"], bool), "turn_right should be boolean"
        print(f"✓ turn_left: {data['turn_left']}, turn_right: {data['turn_right']}")
    
    def test_vehicle_data_returns_rpm_and_speed(self):
        """Verify RPM and speed signals are returned (main gauges)"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        
        assert "rpm" in data, "rpm field missing from vehicle-data"
        assert "speed_mph" in data, "speed_mph field missing from vehicle-data"
        assert "gear" in data, "gear field missing from vehicle-data"
        
        assert isinstance(data["rpm"], (int, float)), "rpm should be numeric"
        assert isinstance(data["speed_mph"], (int, float)), "speed_mph should be numeric"
        assert isinstance(data["gear"], int), "gear should be integer"
        
        print(f"✓ rpm: {data['rpm']}, speed_mph: {data['speed_mph']}, gear: {data['gear']}")
    
    def test_vehicle_data_returns_warning_flags(self):
        """Verify warning flags are returned (for warning panel)"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        
        warning_fields = [
            "check_engine", "maintenance", "oil_pressure_warning",
            "low_fuel", "high_coolant", "abs_warning", "airbag_warning", "brake_warning"
        ]
        
        for field in warning_fields:
            assert field in data, f"{field} field missing from vehicle-data"
            assert isinstance(data[field], bool), f"{field} should be boolean"
        
        print(f"✓ All warning flags present: {[f for f in warning_fields if data[f]]}")
    
    def test_vehicle_data_returns_lights_status(self):
        """Verify headlights and high_beams are returned"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        
        assert "headlights" in data, "headlights field missing"
        assert "high_beams" in data, "high_beams field missing"
        assert isinstance(data["headlights"], bool), "headlights should be boolean"
        assert isinstance(data["high_beams"], bool), "high_beams should be boolean"
        print(f"✓ headlights: {data['headlights']}, high_beams: {data['high_beams']}")


class TestDHUStatusEndpoint:
    """Test GET /api/dhu/status still works"""
    
    def test_dhu_status_returns_200(self):
        """Verify /api/dhu/status returns 200"""
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data, "status field missing"
        assert "phone_connected" in data, "phone_connected field missing"
        print(f"✓ /api/dhu/status: status={data['status']}, phone_connected={data['phone_connected']}")


class TestDHUDeviceEventEndpoint:
    """Test POST /api/dhu/device-event still works"""
    
    def test_device_event_connected_returns_prompt_needed(self):
        """Verify device-event with connected action returns prompt_needed for new device"""
        # Clean up first
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/TEST_ITER10_DEVICE")
        
        response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "connected",
            "serial": "TEST_ITER10_DEVICE",
            "name": "Test Phone Iter10"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "prompt_needed", f"Expected prompt_needed, got {data['status']}"
        print(f"✓ device-event connected returns: {data['status']}")
        
        # Consume the pending event
        requests.get(f"{BASE_URL}/api/dhu/status")
        # Cleanup
        requests.delete(f"{BASE_URL}/api/dhu/device-preferences/TEST_ITER10_DEVICE")
    
    def test_device_event_disconnected_returns_stopped(self):
        """Verify device-event with disconnected action returns stopped"""
        response = requests.post(f"{BASE_URL}/api/dhu/device-event", json={
            "action": "disconnected",
            "serial": "TEST_ITER10_DISCONNECT",
            "name": "Test Phone"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "stopped", f"Expected stopped, got {data['status']}"
        print(f"✓ device-event disconnected returns: {data['status']}")
        
        # Consume the pending event
        requests.get(f"{BASE_URL}/api/dhu/status")


class TestDiagnosticsEndpoint:
    """Test GET /api/diagnostics returns detailed data"""
    
    def test_diagnostics_returns_fuel_data(self):
        """Verify diagnostics returns fuel data"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code == 200
        data = response.json()
        
        assert "fuel" in data, "fuel section missing from diagnostics"
        assert "fuel_level_pct" in data["fuel"], "fuel_level_pct missing"
        print(f"✓ diagnostics fuel_level_pct: {data['fuel']['fuel_level_pct']}%")
    
    def test_diagnostics_returns_electrical_data(self):
        """Verify diagnostics returns electrical data"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code == 200
        data = response.json()
        
        assert "electrical" in data, "electrical section missing from diagnostics"
        assert "battery_voltage" in data["electrical"], "battery_voltage missing"
        print(f"✓ diagnostics battery_voltage: {data['electrical']['battery_voltage']}V")
    
    def test_diagnostics_returns_oil_data(self):
        """Verify diagnostics returns oil data"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code == 200
        data = response.json()
        
        assert "oil" in data, "oil section missing from diagnostics"
        assert "oil_pressure_psi" in data["oil"], "oil_pressure_psi missing"
        print(f"✓ diagnostics oil_pressure_psi: {data['oil']['oil_pressure_psi']} PSI")
    
    def test_diagnostics_returns_engine_data(self):
        """Verify diagnostics returns engine data including coolant"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code == 200
        data = response.json()
        
        assert "engine" in data, "engine section missing from diagnostics"
        assert "coolant_temp_c" in data["engine"], "coolant_temp_c missing"
        print(f"✓ diagnostics coolant_temp_c: {data['engine']['coolant_temp_c']}°C")


class TestThemesEndpoint:
    """Test themes endpoint still works"""
    
    def test_themes_returns_list(self):
        """Verify /api/themes returns theme list"""
        response = requests.get(f"{BASE_URL}/api/themes")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "themes should return a list"
        assert len(data) >= 1, "should have at least one theme"
        
        # Check theme structure
        theme = data[0]
        assert "id" in theme, "theme should have id"
        assert "name" in theme, "theme should have name"
        assert "accent" in theme, "theme should have accent color"
        print(f"✓ /api/themes returns {len(data)} themes")


class TestSettingsEndpoint:
    """Test settings endpoint still works"""
    
    def test_settings_returns_200(self):
        """Verify /api/settings returns 200"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        
        assert "theme_id" in data, "theme_id missing from settings"
        assert "data_source" in data, "data_source missing from settings"
        print(f"✓ /api/settings: theme_id={data['theme_id']}, data_source={data['data_source']}")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Cleanup test devices
    test_serials = ["TEST_ITER10_DEVICE", "TEST_ITER10_DISCONNECT"]
    for serial in test_serials:
        try:
            requests.delete(f"{BASE_URL}/api/dhu/device-preferences/{serial}")
        except:
            pass
    print("\n✓ Test data cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
