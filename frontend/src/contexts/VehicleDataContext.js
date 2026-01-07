import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

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

// Convert HTTP URL to WebSocket URL
const getWebSocketUrl = () => {
  const baseUrl = API_URL || '';
  // Replace http:// with ws:// or https:// with wss://
  const wsUrl = baseUrl.replace(/^http/, 'ws');
  return `${wsUrl}/api/ws/vehicle-data`;
};

export const VehicleDataProvider = ({ children }) => {
  const [signals, setSignals] = useState(DEFAULT_SIGNALS);
  const [dataSource, setDataSource] = useState('simulated');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_RECONNECT_DELAY = 1000; // 1 second

  const connectWebSocket = useCallback(() => {
    // Cleanup existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = getWebSocketUrl();
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Vehicle data WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setSignals(data);
        } catch (e) {
          console.error('Error parsing vehicle data:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else {
          setConnectionError('Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (dataSource === 'simulated') {
      connectWebSocket();
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [dataSource, connectWebSocket]);

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
