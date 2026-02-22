import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import axios from 'axios';
import { useSettingsSelector } from './SettingsContext';

const VehicleDataContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const DEFAULT_SIGNALS = {
  rpm: 0,
  speed_mph: 0,
  gear: 0,
  fuel_pct: 1,
  coolant_temp_c: 25,
  oil_pressure_psi: 40,
  battery_voltage: 12.6,
  boost_psi: 0,
  ac_on: false,
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
  high_beams: false,
};

const POLL_INTERVALS = {
  high_performance: 1000 / 60,
  low_performance: 1000 / 30,
};

const sanitizeSignals = (incoming = {}) => ({
  ...DEFAULT_SIGNALS,
  ...incoming,
  rpm: Number.isFinite(Number(incoming.rpm)) ? Number(incoming.rpm) : DEFAULT_SIGNALS.rpm,
  speed_mph: Number.isFinite(Number(incoming.speed_mph)) ? Number(incoming.speed_mph) : DEFAULT_SIGNALS.speed_mph,
  gear: Number.isFinite(Number(incoming.gear)) ? Number(incoming.gear) : DEFAULT_SIGNALS.gear,
  fuel_pct: Number.isFinite(Number(incoming.fuel_pct)) ? Number(incoming.fuel_pct) : DEFAULT_SIGNALS.fuel_pct,
  coolant_temp_c: Number.isFinite(Number(incoming.coolant_temp_c))
    ? Number(incoming.coolant_temp_c)
    : DEFAULT_SIGNALS.coolant_temp_c,
  oil_pressure_psi: Number.isFinite(Number(incoming.oil_pressure_psi))
    ? Number(incoming.oil_pressure_psi)
    : DEFAULT_SIGNALS.oil_pressure_psi,
  battery_voltage: Number.isFinite(Number(incoming.battery_voltage))
    ? Number(incoming.battery_voltage)
    : DEFAULT_SIGNALS.battery_voltage,
  boost_psi: Number.isFinite(Number(incoming.boost_psi)) ? Number(incoming.boost_psi) : DEFAULT_SIGNALS.boost_psi,
});

const createSignalStore = (initialSignals) => {
  let state = initialSignals;
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (next) => {
      state = sanitizeSignals(typeof next === 'function' ? next(state) : next);
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const VehicleDataProvider = ({ children }) => {
  const dataSourceSetting = useSettingsSelector((state) => state.data_source || 'simulation');
  const performanceMode = useSettingsSelector((state) => state.performance_mode || 'high_performance');

  const [dataSource, setDataSource] = useState(dataSourceSetting);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const signalStoreRef = useRef(null);
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);

  if (!signalStoreRef.current) {
    signalStoreRef.current = createSignalStore(DEFAULT_SIGNALS);
  }

  const signalStore = signalStoreRef.current;
  const pollIntervalMs = POLL_INTERVALS[performanceMode] || POLL_INTERVALS.high_performance;

  const stopStreams = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/vehicle-data`);
      signalStore.setState(response.data);
      setIsConnected(true);
      setConnectionError(null);
    } catch (error) {
      setIsConnected(false);
      setConnectionError(error.message);
    }
  }, [signalStore]);

  useEffect(() => {
    setDataSource(dataSourceSetting);
  }, [dataSourceSetting]);

  useEffect(() => {
    stopStreams();

    if (dataSource === 'obd1' || dataSource === 'obd2') {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.REACT_APP_BACKEND_WS || `${wsProtocol}//${window.location.host}`;
      const wsUrl = `${wsHost}/ws/vehicle-data`;

      try {
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onopen = () => {
          setIsConnected(true);
          setConnectionError(null);
        };
        wsRef.current.onmessage = (event) => {
          const payload = JSON.parse(event.data);
          signalStore.setState(payload);
        };
        wsRef.current.onerror = () => {
          setConnectionError('WebSocket telemetry unavailable, falling back to polling.');
          setIsConnected(false);
        };
        wsRef.current.onclose = () => {
          setIsConnected(false);
        };
      } catch (error) {
        setConnectionError(`Failed to initialize WebSocket: ${error.message}`);
        setIsConnected(false);
      }

      return stopStreams;
    }

    fetchData();
    pollIntervalRef.current = setInterval(fetchData, pollIntervalMs);

    return stopStreams;
  }, [dataSource, fetchData, pollIntervalMs, signalStore, stopStreams]);

  const switchDataSource = useCallback((source) => {
    setDataSource(source);
  }, []);

  const providerValue = useMemo(
    () => ({
      dataSource,
      switchDataSource,
      isConnected,
      connectionError,
      subscribeToSignals: signalStore.subscribe,
      getSignalsSnapshot: signalStore.getState,
    }),
    [connectionError, dataSource, isConnected, signalStore, switchDataSource],
  );

  return <VehicleDataContext.Provider value={providerValue}>{children}</VehicleDataContext.Provider>;
};

export const useVehicleData = () => {
  const context = useContext(VehicleDataContext);
  if (!context) {
    throw new Error('useVehicleData must be used within a VehicleDataProvider');
  }

  const signals = useSyncExternalStore(
    context.subscribeToSignals,
    context.getSignalsSnapshot,
    context.getSignalsSnapshot,
  );

  const criticalWarnings = {
    hasWarning: signals.oil_pressure_warning || signals.high_coolant || signals.check_engine,
    warnings: [
      signals.oil_pressure_warning && 'LOW OIL PRESSURE',
      signals.high_coolant && 'ENGINE OVERHEAT',
      signals.low_fuel && 'LOW FUEL',
      signals.check_engine && 'CHECK ENGINE',
    ].filter(Boolean),
  };

  return {
    signals,
    dataSource: context.dataSource,
    switchDataSource: context.switchDataSource,
    isConnected: context.isConnected,
    connectionError: context.connectionError,
    criticalWarnings,
  };
};

export const useVehicleSignal = (signalKey) => {
  const context = useContext(VehicleDataContext);
  if (!context) {
    throw new Error('useVehicleSignal must be used within a VehicleDataProvider');
  }

  return useSyncExternalStore(
    context.subscribeToSignals,
    () => context.getSignalsSnapshot()[signalKey],
    () => context.getSignalsSnapshot()[signalKey],
  );
};

export const useVehicleDataSelector = (selector) => {
  const context = useContext(VehicleDataContext);
  if (!context) {
    throw new Error('useVehicleDataSelector must be used within a VehicleDataProvider');
  }

  return useSyncExternalStore(
    context.subscribeToSignals,
    () => selector(context.getSignalsSnapshot()),
    () => selector(context.getSignalsSnapshot()),
  );
};
