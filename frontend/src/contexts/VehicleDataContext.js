import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const VehicleDataContext = createContext();

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

export const VehicleDataProvider = ({ children }) => {
  const [signals, setSignals] = useState(DEFAULT_SIGNALS);
  const [dataSource, setDataSource] = useState('simulated');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/vehicle-data`);
      setSignals(response.data);
      setIsConnected(true);
      setConnectionError(null);
    } catch (error) {
      setConnectionError(error.message);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (dataSource === 'simulated') {
      // Poll at ~30fps for simulated data
      fetchData();
      intervalRef.current = setInterval(fetchData, 33);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [dataSource, fetchData]);

  const switchDataSource = (source) => {
    setDataSource(source);
    if (source === 'obd') {
      // Future: implement OBD connection
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
