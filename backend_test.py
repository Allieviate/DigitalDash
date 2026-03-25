#!/usr/bin/env python3
"""
Vehicle HMI Backend API Test Suite
Tests all API endpoints for the Honda Accord HMI dashboard
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any

class VehicleHMITester:
    def __init__(self, base_url="https://car-dash-hmi.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"name": name, "details": details})

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and "message" in data:
                self.log_test("API Root", True, f"Message: {data['message']}")
            else:
                self.log_test("API Root", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("API Root", False, f"Error: {str(e)}")
            return False

    def test_vehicle_data(self):
        """Test vehicle data endpoint"""
        try:
            response = requests.get(f"{self.base_url}/vehicle-data", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ['rpm', 'speed_mph', 'gear', 'fuel_pct', 'coolant_temp_c']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Vehicle Data", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Validate data types and ranges
                if not isinstance(data['rpm'], (int, float)) or data['rpm'] < 0:
                    self.log_test("Vehicle Data", False, "Invalid RPM value")
                    return False
                
                if not isinstance(data['speed_mph'], (int, float)) or data['speed_mph'] < 0:
                    self.log_test("Vehicle Data", False, "Invalid speed value")
                    return False
                
                self.log_test("Vehicle Data", True, f"RPM: {data['rpm']}, Speed: {data['speed_mph']} MPH")
                return True
            else:
                self.log_test("Vehicle Data", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Vehicle Data", False, f"Error: {str(e)}")
            return False

    def test_themes(self):
        """Test themes endpoints"""
        try:
            # Test get all themes
            response = requests.get(f"{self.base_url}/themes", timeout=10)
            success = response.status_code == 200
            
            if not success:
                self.log_test("Themes List", False, f"Status: {response.status_code}")
                return False
            
            themes = response.json()
            if not isinstance(themes, list) or len(themes) == 0:
                self.log_test("Themes List", False, "No themes returned")
                return False
            
            theme_names = [theme.get('name', 'Unknown') for theme in themes]
            self.log_test("Themes List", True, f"Found themes: {', '.join(theme_names)}")
            
            # Test specific theme
            if themes:
                theme_id = themes[0].get('id', 'type_r')
                response = requests.get(f"{self.base_url}/themes/{theme_id}", timeout=10)
                success = response.status_code == 200
                
                if success:
                    theme = response.json()
                    required_fields = ['id', 'name', 'accent']
                    missing_fields = [field for field in required_fields if field not in theme]
                    
                    if missing_fields:
                        self.log_test("Specific Theme", False, f"Missing fields: {missing_fields}")
                        return False
                    
                    self.log_test("Specific Theme", True, f"Theme: {theme['name']}, Accent: {theme['accent']}")
                    return True
                else:
                    self.log_test("Specific Theme", False, f"Status: {response.status_code}")
                    return False
            
            return True
            
        except Exception as e:
            self.log_test("Themes", False, f"Error: {str(e)}")
            return False

    def test_settings(self):
        """Test settings endpoints"""
        try:
            # Test get settings
            response = requests.get(f"{self.base_url}/settings", timeout=10)
            success = response.status_code == 200
            
            if not success:
                self.log_test("Get Settings", False, f"Status: {response.status_code}")
                return False
            
            settings = response.json()
            required_fields = ['theme_id', 'data_source', 'units', 'brightness']
            missing_fields = [field for field in required_fields if field not in settings]
            
            if missing_fields:
                self.log_test("Get Settings", False, f"Missing fields: {missing_fields}")
                return False
            
            self.log_test("Get Settings", True, f"Theme: {settings['theme_id']}, Source: {settings['data_source']}")
            
            # Test update settings
            update_data = {
                "brightness": 85,
                "warning_sounds": True
            }
            
            response = requests.post(f"{self.base_url}/settings", json=update_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                updated_settings = response.json()
                if updated_settings.get('brightness') == 85:
                    self.log_test("Update Settings", True, "Settings updated successfully")
                    return True
                else:
                    self.log_test("Update Settings", False, "Settings not updated properly")
                    return False
            else:
                self.log_test("Update Settings", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Settings", False, f"Error: {str(e)}")
            return False

    def test_diagnostics(self):
        """Test diagnostics endpoint"""
        try:
            response = requests.get(f"{self.base_url}/diagnostics", timeout=10)
            success = response.status_code == 200
            
            if not success:
                self.log_test("Diagnostics", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            required_sections = ['engine', 'fuel', 'electrical', 'transmission', 'oil']
            missing_sections = [section for section in required_sections if section not in data]
            
            if missing_sections:
                self.log_test("Diagnostics", False, f"Missing sections: {missing_sections}")
                return False
            
            # Validate engine data
            engine = data['engine']
            if 'rpm' not in engine or 'coolant_temp_c' not in engine:
                self.log_test("Diagnostics", False, "Missing engine data")
                return False
            
            # Validate fuel data
            fuel = data['fuel']
            if 'fuel_level_pct' not in fuel:
                self.log_test("Diagnostics", False, "Missing fuel data")
                return False
            
            self.log_test("Diagnostics", True, f"Engine RPM: {engine['rpm']}, Fuel: {fuel['fuel_level_pct']}%")
            return True
            
        except Exception as e:
            self.log_test("Diagnostics", False, f"Error: {str(e)}")
            return False

    def test_data_consistency(self):
        """Test data consistency between vehicle-data and diagnostics"""
        try:
            # Get vehicle data
            vehicle_response = requests.get(f"{self.base_url}/vehicle-data", timeout=10)
            diag_response = requests.get(f"{self.base_url}/diagnostics", timeout=10)
            
            if vehicle_response.status_code != 200 or diag_response.status_code != 200:
                self.log_test("Data Consistency", False, "Failed to fetch data")
                return False
            
            vehicle_data = vehicle_response.json()
            diag_data = diag_response.json()
            
            # Check RPM consistency
            vehicle_rpm = vehicle_data.get('rpm', 0)
            diag_rpm = diag_data.get('engine', {}).get('rpm', 0)
            
            rpm_diff = abs(vehicle_rpm - diag_rpm)
            if rpm_diff > 100:  # Allow some variance due to timing
                self.log_test("Data Consistency", False, f"RPM mismatch: {vehicle_rpm} vs {diag_rpm}")
                return False
            
            # Check fuel consistency
            vehicle_fuel = vehicle_data.get('fuel_pct', 0) * 100
            diag_fuel = diag_data.get('fuel', {}).get('fuel_level_pct', 0)
            
            fuel_diff = abs(vehicle_fuel - diag_fuel)
            if fuel_diff > 5:  # Allow 5% variance
                self.log_test("Data Consistency", False, f"Fuel mismatch: {vehicle_fuel}% vs {diag_fuel}%")
                return False
            
            self.log_test("Data Consistency", True, "Vehicle data and diagnostics are consistent")
            return True
            
        except Exception as e:
            self.log_test("Data Consistency", False, f"Error: {str(e)}")
            return False

    def test_dhu_endpoints(self):
        """Test Android Auto DHU endpoints"""
        try:
            # Test DHU status
            response = requests.get(f"{self.base_url}/dhu/status", timeout=10)
            success = response.status_code == 200
            
            if not success:
                self.log_test("DHU Status", False, f"Status: {response.status_code}")
                return False
            
            status_data = response.json()
            if 'status' not in status_data:
                self.log_test("DHU Status", False, "Missing status field")
                return False
            
            self.log_test("DHU Status", True, f"DHU Status: {status_data['status']}")
            
            # Test DHU start (expected to fail in this environment)
            start_data = {"x": 750, "y": 180, "width": 420, "height": 340}
            response = requests.post(f"{self.base_url}/dhu/start", json=start_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                start_result = response.json()
                if 'status' in start_result:
                    self.log_test("DHU Start", True, f"DHU Start Response: {start_result['status']}")
                else:
                    self.log_test("DHU Start", False, "Missing status in response")
                    return False
            else:
                self.log_test("DHU Start", False, f"Status: {response.status_code}")
                return False
            
            # Test DHU stop
            response = requests.post(f"{self.base_url}/dhu/stop", timeout=10)
            success = response.status_code == 200
            
            if success:
                stop_result = response.json()
                if 'status' in stop_result:
                    self.log_test("DHU Stop", True, f"DHU Stop Response: {stop_result['status']}")
                else:
                    self.log_test("DHU Stop", False, "Missing status in response")
                    return False
            else:
                self.log_test("DHU Stop", False, f"Status: {response.status_code}")
                return False
            
            return True
            
        except Exception as e:
            self.log_test("DHU Endpoints", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚗 Starting Vehicle HMI Backend Tests")
        print("=" * 50)
        
        # Test API connectivity first
        if not self.test_api_root():
            print("\n❌ API is not accessible. Stopping tests.")
            return False
        
        # Run all tests
        tests = [
            self.test_vehicle_data,
            self.test_themes,
            self.test_settings,
            self.test_diagnostics,
            self.test_data_consistency,
            self.test_dhu_endpoints
        ]
        
        for test in tests:
            test()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"✅ Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = VehicleHMITester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())