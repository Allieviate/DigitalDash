import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const VehicleDataContext = createContext();

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_SIGNALS = {
  rpm: 0,
  speed_mph: 0,
  gear: 0,
  fuel_pct: 1.0,
  coolant_temp_c: 25.0,
  oil_pressure_psi: 40.0,
  battery_voltage: 12.6,
  turn_left: false,
  turn_right: false,
  check_engine: false,
  maintenance: false,
  oil_pressure_warning: false,
  low_fuel: false,
  high_coolant: false,
  abs_warning: false,
  airbag_warning: false,
  brake_warning: false,
  headlights: false,
  high_beams: false
};

// Polling interval: 50ms (20fps) for smooth gauge animations
const POLL_INTERVAL_MS = 50;

export const VehicleDataProvider = ({ children }) => {
  const [signals, setSignals] = useState(DEFAULT_SIGNALS);
  const [dataSource, setDataSource] = useState('simulated');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  const pollIntervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Simple HTTP polling - most reliable for all environments
  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const response = await axios.get(`${API_URL}/api/vehicle-data`);
      if (mountedRef.current) {
        setSignals(response.data);
        setIsConnected(true);
        setConnectionError(null);
      }
    } catch (error) {
      if (mountedRef.current) {
        setConnectionError(error.message);
        setIsConnected(false);
      }
    }
  }, []);

  // Start polling on mount
  useEffect(() => {
    mountedRef.current = true;
    
    if (dataSource === 'simulated') {
      console.log(`Starting HTTP polling at ${POLL_INTERVAL_MS}ms interval (${1000/POLL_INTERVAL_MS} fps)`);
      
      // Initial fetch
      fetchData();
      
      // Start polling interval
      pollIntervalRef.current = setInterval(fetchData, POLL_INTERVAL_MS);
    }

    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [dataSource, fetchData]);

  const switchDataSource = (source) => {
    setDataSource(source);
    if (source === 'obd') {
      console.log('OBD mode not yet implemented');
    }
  };

  // Computed values
  const criticalWarnings = {
    hasWarning: signals.oil_pressure_warning || signals.high_coolant || signals.check_engine,
    warnings: [
      signals.oil_pressure_warning && 'LOW OIL PRESSURE',
      signals.high_coolant && 'ENGINE OVERHEAT',
      signals.low_fuel && 'LOW FUEL',
      signals.check_engine && 'CHECK ENGINE'
    ].filter(Boolean)
  };

  return (
    <VehicleDataContext.Provider value={{
      signals,
      dataSource,
      switchDataSource,
      isConnected,
      connectionError,
      criticalWarnings
    }}>
      {children}
    </VehicleDataContext.Provider>
  );
};

export const useVehicleData = () => {
  const context = useContext(VehicleDataContext);
  if (!context) {
    throw new Error('useVehicleData must be used within a VehicleDataProvider');
  }
  return context;
};
