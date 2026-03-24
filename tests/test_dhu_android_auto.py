"""
DHU (Android Auto) API Tests - Phase 1 (P0)
Tests for the Android Auto DHU control endpoints:
- /api/dhu/status - Get current DHU status
- /api/dhu/start - Start Android Auto projection
- /api/dhu/stop - Stop Android Auto projection
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dash-android.preview.emergentagent.com')


class TestDHUStatusEndpoint:
    """Tests for GET /api/dhu/status endpoint"""
    
    def test_dhu_status_returns_200(self):
        """DHU status endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        assert response.status_code == 200
        
    def test_dhu_status_has_status_field(self):
        """DHU status should have 'status' field"""
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        data = response.json()
        assert 'status' in data
        
    def test_dhu_status_valid_values(self):
        """DHU status should be 'running' or 'stopped'"""
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        data = response.json()
        assert data['status'] in ['running', 'stopped']


class TestDHUStartEndpoint:
    """Tests for POST /api/dhu/start endpoint"""
    
    def test_dhu_start_returns_200(self):
        """DHU start endpoint should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={
                "x": 640,
                "y": 160,
                "width": 640,
                "height": 480,
                "borderless": True,
                "alwaysOnTop": True
            }
        )
        assert response.status_code == 200
        
    def test_dhu_start_has_status_field(self):
        """DHU start response should have 'status' field"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={"x": 640, "y": 160, "width": 640, "height": 480}
        )
        data = response.json()
        assert 'status' in data
        
    def test_dhu_start_has_message_field(self):
        """DHU start response should have 'message' field"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={"x": 640, "y": 160, "width": 640, "height": 480}
        )
        data = response.json()
        assert 'message' in data
        
    def test_dhu_start_valid_status_values(self):
        """DHU start status should be 'running' or 'error' (error expected in non-Pi environment)"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={"x": 640, "y": 160, "width": 640, "height": 480}
        )
        data = response.json()
        # In non-Pi environment, we expect 'error' since OpenAuto isn't installed
        assert data['status'] in ['running', 'error']


class TestDHUStopEndpoint:
    """Tests for POST /api/dhu/stop endpoint"""
    
    def test_dhu_stop_returns_200(self):
        """DHU stop endpoint should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/stop",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
    def test_dhu_stop_has_status_field(self):
        """DHU stop response should have 'status' field"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/stop",
            headers={"Content-Type": "application/json"}
        )
        data = response.json()
        assert 'status' in data
        
    def test_dhu_stop_returns_stopped_status(self):
        """DHU stop should return 'stopped' status"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/stop",
            headers={"Content-Type": "application/json"}
        )
        data = response.json()
        assert data['status'] == 'stopped'
        
    def test_dhu_stop_has_message(self):
        """DHU stop should return success message"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/stop",
            headers={"Content-Type": "application/json"}
        )
        data = response.json()
        assert 'message' in data
        assert 'stopped' in data['message'].lower() or 'success' in data['message'].lower()


class TestDHUWorkflow:
    """Tests for DHU start/stop workflow"""
    
    def test_status_after_stop(self):
        """After stop, status should be 'stopped'"""
        # First stop any running instance
        requests.post(f"{BASE_URL}/api/dhu/stop", headers={"Content-Type": "application/json"})
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/dhu/status")
        data = response.json()
        assert data['status'] == 'stopped'


class TestVehicleDataOilPressure:
    """Tests for oil_pressure_psi field in vehicle data"""
    
    def test_vehicle_data_has_oil_pressure(self):
        """Vehicle data should include oil_pressure_psi field"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        data = response.json()
        assert 'oil_pressure_psi' in data
        
    def test_oil_pressure_in_valid_range(self):
        """Oil pressure should be in valid range (0-100 PSI)"""
        response = requests.get(f"{BASE_URL}/api/vehicle-data")
        data = response.json()
        assert 0 <= data['oil_pressure_psi'] <= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
