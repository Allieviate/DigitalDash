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

// Polling interval: 200ms (5fps) - enough for smooth dashboard updates
// without overwhelming production servers (was 33ms/30fps before)
const POLL_INTERVAL_MS = 200;

// Convert HTTP URL to WebSocket URL
const getWebSocketUrl = () => {
  const baseUrl = API_URL || '';
  const wsUrl = baseUrl.replace(/^http/, 'ws');
  return `${wsUrl}/api/ws/vehicle-data`;
};

export const VehicleDataProvider = ({ children }) => {
  const [signals, setSignals] = useState(DEFAULT_SIGNALS);
  const [dataSource, setDataSource] = useState('simulated');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [connectionMode, setConnectionMode] = useState('initializing'); // 'websocket', 'polling', 'initializing'
  
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const wsFailedRef = useRef(false);
  const mountedRef = useRef(true);

  // HTTP polling fallback (for production/cloud environments)
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

  const startPolling = useCallback(() => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    console.log(`Starting HTTP polling at ${POLL_INTERVAL_MS}ms interval`);
    setConnectionMode('polling');
    
    // Initial fetch
    fetchData();
    
    // Start polling interval
    pollIntervalRef.current = setInterval(fetchData, POLL_INTERVAL_MS);
  }, [fetchData]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // WebSocket connection (preferred for local/Pi deployment)
  const connectWebSocket = useCallback(() => {
    if (wsFailedRef.current || !mountedRef.current) {
      return;
    }

    // Cleanup existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = getWebSocketUrl();
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout, falling back to polling');
          ws.close();
          wsFailedRef.current = true;
          startPolling();
        }
      }, 3000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('Vehicle data WebSocket connected');
        setConnectionMode('websocket');
        setIsConnected(true);
        setConnectionError(null);
        stopPolling(); // Ensure polling is stopped if WS connects
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          setSignals(data);
        } catch (e) {
          console.error('Error parsing vehicle data:', e);
        }
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        // WebSocket failed, fall back to polling
        if (!wsFailedRef.current && mountedRef.current) {
          console.log('WebSocket error, falling back to HTTP polling');
          wsFailedRef.current = true;
          startPolling();
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        wsRef.current = null;

        // Only set disconnected if we're not already polling
        // This prevents race condition where ws.onclose runs after polling starts
        if (!wsFailedRef.current) {
          setIsConnected(false);
          // If WebSocket was working but closed, try to reconnect
          if (connectionMode === 'websocket') {
            console.log('WebSocket closed, attempting reconnect...');
            setTimeout(connectWebSocket, 1000);
          }
        }
      };
    } catch (error) {
      console.log('WebSocket not available, using HTTP polling');
      wsFailedRef.current = true;
      startPolling();
    }
  }, [startPolling, stopPolling, connectionMode]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (dataSource === 'simulated') {
      // Try WebSocket first, fall back to polling if it fails
      connectWebSocket();
    }

    return () => {
      mountedRef.current = false;
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [dataSource, connectWebSocket, stopPolling]);

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
