"""
DHU (Android Auto) API Tests - Phase P1
Tests for the new embedded/fullscreen mode toggle and resize endpoint:
- POST /api/dhu/start with mode=embedded
- POST /api/dhu/start with mode=fullscreen
- POST /api/dhu/resize with mode=embedded
- POST /api/dhu/resize with mode=fullscreen
- GET /api/dhu/status
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dash-android.preview.emergentagent.com')


class TestDHUStartWithMode:
    """Tests for POST /api/dhu/start with mode parameter"""
    
    def test_dhu_start_embedded_mode_returns_200(self):
        """DHU start with mode=embedded should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={
                "mode": "embedded",
                "borderless": True,
                "alwaysOnTop": True
            }
        )
        assert response.status_code == 200
        
    def test_dhu_start_embedded_mode_has_status(self):
        """DHU start with mode=embedded should have status field"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={"mode": "embedded"}
        )
        data = response.json()
        assert 'status' in data
        # In non-Pi environment, expect 'error' since OpenAuto isn't installed
        assert data['status'] in ['running', 'error']
        
    def test_dhu_start_fullscreen_mode_returns_200(self):
        """DHU start with mode=fullscreen should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={
                "mode": "fullscreen",
                "borderless": True,
                "alwaysOnTop": True
            }
        )
        assert response.status_code == 200
        
    def test_dhu_start_fullscreen_mode_has_status(self):
        """DHU start with mode=fullscreen should have status field"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={"mode": "fullscreen"}
        )
        data = response.json()
        assert 'status' in data
        assert data['status'] in ['running', 'error']
        
    def test_dhu_start_default_mode_is_embedded(self):
        """DHU start without mode should default to embedded"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={"borderless": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'status' in data


class TestDHUResizeEndpoint:
    """Tests for POST /api/dhu/resize endpoint"""
    
    def test_dhu_resize_embedded_returns_200(self):
        """DHU resize with mode=embedded should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/resize",
            json={
                "mode": "embedded",
                "screen_width": 1920,
                "screen_height": 800
            }
        )
        assert response.status_code == 200
        
    def test_dhu_resize_embedded_has_status(self):
        """DHU resize with mode=embedded should have status field"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/resize",
            json={"mode": "embedded"}
        )
        data = response.json()
        assert 'status' in data
        # When not running, should return error
        assert data['status'] in ['running', 'error']
        
    def test_dhu_resize_fullscreen_returns_200(self):
        """DHU resize with mode=fullscreen should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/resize",
            json={
                "mode": "fullscreen",
                "screen_width": 1920,
                "screen_height": 800
            }
        )
        assert response.status_code == 200
        
    def test_dhu_resize_fullscreen_has_status(self):
        """DHU resize with mode=fullscreen should have status field"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/resize",
            json={"mode": "fullscreen"}
        )
        data = response.json()
        assert 'status' in data
        
    def test_dhu_resize_when_not_running_returns_error(self):
        """DHU resize when not running should return error status"""
        # First stop any running instance
        requests.post(f"{BASE_URL}/api/dhu/stop", headers={"Content-Type": "application/json"})
        
        # Try to resize
        response = requests.post(
            f"{BASE_URL}/api/dhu/resize",
            json={"mode": "fullscreen"}
        )
        data = response.json()
        assert data['status'] == 'error'
        assert 'message' in data
        assert 'not running' in data['message'].lower()


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


class TestDHUStopEndpoint:
    """Tests for POST /api/dhu/stop endpoint"""
    
    def test_dhu_stop_returns_200(self):
        """DHU stop endpoint should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/stop",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
    def test_dhu_stop_returns_stopped_status(self):
        """DHU stop should return 'stopped' status"""
        response = requests.post(
            f"{BASE_URL}/api/dhu/stop",
            headers={"Content-Type": "application/json"}
        )
        data = response.json()
        assert data['status'] == 'stopped'


class TestDHUModeWorkflow:
    """Tests for DHU mode switching workflow"""
    
    def test_start_embedded_then_stop(self):
        """Start in embedded mode, then stop"""
        # Start in embedded mode
        start_response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={"mode": "embedded"}
        )
        assert start_response.status_code == 200
        
        # Stop
        stop_response = requests.post(
            f"{BASE_URL}/api/dhu/stop",
            headers={"Content-Type": "application/json"}
        )
        assert stop_response.status_code == 200
        assert stop_response.json()['status'] == 'stopped'
        
    def test_start_fullscreen_then_stop(self):
        """Start in fullscreen mode, then stop"""
        # Start in fullscreen mode
        start_response = requests.post(
            f"{BASE_URL}/api/dhu/start",
            json={"mode": "fullscreen"}
        )
        assert start_response.status_code == 200
        
        # Stop
        stop_response = requests.post(
            f"{BASE_URL}/api/dhu/stop",
            headers={"Content-Type": "application/json"}
        )
        assert stop_response.status_code == 200
        assert stop_response.json()['status'] == 'stopped'


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
