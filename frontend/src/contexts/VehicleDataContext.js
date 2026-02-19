import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSettings } from './SettingsContext';

const VehicleDataContext = createContext();

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

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

// Polling interval: ~60fps for smooth gauge animations
const POLL_INTERVAL_MS = 1000 / 60;

const sanitizeSignals = (incoming = {}) => ({
  ...DEFAULT_SIGNALS,
  ...incoming,
  rpm: Number.isFinite(Number(incoming.rpm)) ? Number(incoming.rpm) : DEFAULT_SIGNALS.rpm,
  speed_mph: Number.isFinite(Number(incoming.speed_mph)) ? Number(incoming.speed_mph) : DEFAULT_SIGNALS.speed_mph,
  gear: Number.isFinite(Number(incoming.gear)) ? Number(incoming.gear) : DEFAULT_SIGNALS.gear,
  fuel_pct: Number.isFinite(Number(incoming.fuel_pct)) ? Number(incoming.fuel_pct) : DEFAULT_SIGNALS.fuel_pct,
  coolant_temp_c: Number.isFinite(Number(incoming.coolant_temp_c)) ? Number(incoming.coolant_temp_c) : DEFAULT_SIGNALS.coolant_temp_c,
  oil_pressure_psi: Number.isFinite(Number(incoming.oil_pressure_psi)) ? Number(incoming.oil_pressure_psi) : DEFAULT_SIGNALS.oil_pressure_psi,
  battery_voltage: Number.isFinite(Number(incoming.battery_voltage)) ? Number(incoming.battery_voltage) : DEFAULT_SIGNALS.battery_voltage,
});


export const VehicleDataProvider = ({ children }) => {
  const { settings } = useSettings();
  const [signals, setSignals] = useState(DEFAULT_SIGNALS);
  const [dataSource, setDataSource] = useState('simulation');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  const pollIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const performanceMode = settings.performance_mode || 'high_performance';
  const pollIntervalMs = POLL_INTERVALS[performanceMode] || POLL_INTERVALS.high_performance;

  // Simple HTTP polling - most reliable for all environments
  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const response = await axios.get(`${API_URL}/api/vehicle-data`);
      if (mountedRef.current) {
        setSignals(sanitizeSignals(response.data));
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
    
    if (dataSource === 'simulation' || dataSource === 'simulated') {
      console.log(`Starting HTTP polling at ${POLL_INTERVAL_MS}ms interval (${1000/POLL_INTERVAL_MS} fps)`);
      
      // Initial fetch
      fetchData();
      
      // Start polling interval
      pollIntervalRef.current = setInterval(fetchData, pollIntervalMs);
    }

    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [dataSource, fetchData, performanceMode, pollIntervalMs]);

  const switchDataSource = (source) => {
    setDataSource(source);
    if (source === 'obd1' || source === 'obd2') {
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
