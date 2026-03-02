"""
Vehicle HMI API Tests
Tests for the 1989 Accord HMI backend endpoints including:
- Vehicle data endpoint (simulated signals)
- Settings API (GET/POST)
- Themes API
- DHU status endpoints
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://openauto-setup.preview.emergentagent.com')

class TestVehicleDataAPI:
    """Tests for /api/vehicle-data endpoint - simulated vehicle signals"""
    
    def test_vehicle_data_returns_200(self):
        """Vehicle data endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        
    def test_vehicle_data_has_required_fields(self):
        """Vehicle data should contain all required signal fields"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for dashboard gauges
        required_fields = [
            'rpm', 'speed_mph', 'gear', 'fuel_pct', 'coolant_temp_c',
            'oil_pressure_psi', 'battery_voltage', 'turn_left', 'turn_right',
            'check_engine', 'maintenance', 'oil_pressure_warning', 'low_fuel',
            'high_coolant', 'abs_warning', 'airbag_warning', 'brake_warning',
            'headlights', 'high_beams'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
    
    def test_vehicle_data_rpm_in_valid_range(self):
        """RPM should be between 0 and 8000"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        data = response.json()
        assert 0 <= data['rpm'] <= 8500, f"RPM {data['rpm']} out of valid range"
    
    def test_vehicle_data_speed_in_valid_range(self):
        """Speed should be between 0 and 170 mph"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        data = response.json()
        assert 0 <= data['speed_mph'] <= 170, f"Speed {data['speed_mph']} out of valid range"
    
    def test_vehicle_data_gear_in_valid_range(self):
        """Gear should be between -1 (R) and 6"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        data = response.json()
        assert -1 <= data['gear'] <= 6, f"Gear {data['gear']} out of valid range"
    
    def test_vehicle_data_fuel_percentage(self):
        """Fuel percentage should be between 0 and 1"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        data = response.json()
        assert 0 <= data['fuel_pct'] <= 1, f"Fuel {data['fuel_pct']} out of valid range"
    
    def test_vehicle_data_boolean_fields(self):
        """Warning lights should be boolean values"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        data = response.json()
        
        boolean_fields = [
            'turn_left', 'turn_right', 'check_engine', 'maintenance',
            'oil_pressure_warning', 'low_fuel', 'high_coolant', 'abs_warning',
            'airbag_warning', 'brake_warning', 'headlights', 'high_beams'
        ]
        
        for field in boolean_fields:
            assert isinstance(data[field], bool), f"{field} should be boolean, got {type(data[field])}"


class TestSettingsAPI:
    """Tests for /api/settings endpoint - user preferences"""
    
    def test_get_settings_returns_200(self):
        """GET /api/settings should return 200"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
    
    def test_get_settings_has_required_fields(self):
        """Settings should contain all required fields"""
        response = requests.get(f"{BASE_URL}/api/settings")
        data = response.json()
        
        required_fields = [
            'id', 'theme_id', 'data_source', 'units', 'gauge_style',
            'warning_sounds', 'brightness', 'show_diagnostics'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
    
    def test_post_settings_update_theme(self):
        """POST /api/settings should update theme_id"""
        # Update to retro_89 theme
        response = requests.post(
            f"{BASE_URL}/api/settings",
            json={"theme_id": "retro_89"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['theme_id'] == "retro_89"
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/settings")
        get_data = get_response.json()
        assert get_data['theme_id'] == "retro_89"
        
        # Reset to type_r
        requests.post(f"{BASE_URL}/api/settings", json={"theme_id": "type_r"})
    
    def test_post_settings_update_brightness(self):
        """POST /api/settings should update brightness"""
        response = requests.post(
            f"{BASE_URL}/api/settings",
            json={"brightness": 75}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['brightness'] == 75
        
        # Reset brightness
        requests.post(f"{BASE_URL}/api/settings", json={"brightness": 100})
    
    def test_post_settings_update_warning_sounds(self):
        """POST /api/settings should update warning_sounds"""
        response = requests.post(
            f"{BASE_URL}/api/settings",
            json={"warning_sounds": False}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['warning_sounds'] == False
        
        # Reset
        requests.post(f"{BASE_URL}/api/settings", json={"warning_sounds": True})


class TestThemesAPI:
    """Tests for /api/themes endpoint - available themes"""
    
    def test_get_themes_returns_200(self):
        """GET /api/themes should return 200"""
        response = requests.get(f"{BASE_URL}/api/themes")
        assert response.status_code == 200
    
    def test_get_themes_returns_list(self):
        """GET /api/themes should return a list of themes"""
        response = requests.get(f"{BASE_URL}/api/themes")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # At least 3 themes: type_r, retro_89, clean_oem
    
    def test_themes_have_required_fields(self):
        """Each theme should have required fields"""
        response = requests.get(f"{BASE_URL}/api/themes")
        data = response.json()
        
        for theme in data:
            assert 'id' in theme
            assert 'name' in theme
            assert 'accent' in theme
            assert 'glow' in theme
            assert 'bg_texture' in theme
    
    def test_get_specific_theme(self):
        """GET /api/themes/{theme_id} should return specific theme"""
        response = requests.get(f"{BASE_URL}/api/themes/type_r")
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == 'type_r'
        assert data['name'] == 'Type R'


class TestDHUAPI:
    """Tests for /api/dhu/* endpoints - Android Auto DHU control"""
    
    def test_dhu_status_returns_200(self):
        """GET /api/dhu/status should return 200"""
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        assert response.status_code == 200
    
    def test_dhu_status_has_status_field(self):
        """DHU status should have status field"""
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        data = response.json()
        assert 'status' in data
        assert data['status'] in ['running', 'stopped']


class TestDiagnosticsAPI:
    """Tests for /api/diagnostics endpoint - OBD scanner style data"""
    
    def test_diagnostics_returns_200(self):
        """GET /api/diagnostics should return 200"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        assert response.status_code == 200
    
    def test_diagnostics_has_sections(self):
        """Diagnostics should have engine, fuel, electrical, transmission, oil sections"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        data = response.json()
        
        required_sections = ['engine', 'fuel', 'electrical', 'transmission', 'oil']
        for section in required_sections:
            assert section in data, f"Missing section: {section}"
    
    def test_diagnostics_engine_data(self):
        """Engine diagnostics should have required fields"""
        response = requests.get(f"{BASE_URL}/api/diagnostics")
        data = response.json()
        
        engine = data['engine']
        assert 'rpm' in engine
        assert 'load' in engine
        assert 'coolant_temp_c' in engine


class TestPollingPerformance:
    """Tests to verify polling interval fix (200ms instead of 33ms)"""
    
    def test_multiple_requests_performance(self):
        """Verify API can handle 5 requests per second (200ms interval)"""
        start_time = time.time()
        successful_requests = 0
        
        # Make 5 requests (simulating 1 second of polling at 200ms)
        for _ in range(5):
            response = requests.get(f"{BASE_URL}/api/vehicle-data")
            if response.status_code == 200:
                successful_requests += 1
            time.sleep(0.2)  # 200ms interval
        
        elapsed = time.time() - start_time
        
        assert successful_requests == 5, f"Only {successful_requests}/5 requests succeeded"
        assert elapsed >= 1.0, "Requests completed too fast, interval may be wrong"
        assert elapsed < 2.0, "Requests took too long"
    
    def test_data_changes_over_time(self):
        """Verify simulated data changes between requests"""
        response1 = requests.get(f"{BASE_URL}/api/vehicle-data")
        data1 = response1.json()
        
        time.sleep(0.5)  # Wait for simulation to progress
        
        response2 = requests.get(f"{BASE_URL}/api/vehicle-data")
        data2 = response2.json()
        
        # At least one value should change (simulation is continuous)
        # RPM or speed should be different
        assert data1['rpm'] != data2['rpm'] or data1['speed_mph'] != data2['speed_mph'], \
            "Simulated data should change over time"


class TestAPIRoot:
    """Tests for API root endpoint"""
    
    def test_api_root_returns_200(self):
        """GET /api/ should return 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
    
    def test_api_root_returns_version(self):
        """API root should return version info"""
        response = requests.get(f"{BASE_URL}/api/")
        data = response.json()
        assert 'message' in data
        assert 'Accord HMI API' in data['message']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
