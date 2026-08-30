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
  intake_air_temp_c: 25,
  throttle_pct: 0,
  map_kpa: 30,
  boost_psi: 0,
  vtec_active: false,
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

// Fallback polling only. The websocket is the normal path now, so this
// rate only applies while the socket is down.
const FALLBACK_POLL_MS = 250;

// The backend already tracks how old its own data is, so freshness is
// read from /api/source-status rather than timed on the client.
const SOURCE_STATUS_POLL_MS = 2000;

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 10000;

// Availability states a gauge can be in. Anything other than 'live'
// means the number on screen should not be trusted as the car.
export const AVAILABILITY = {
  LIVE: 'live',
  SIMULATED: 'simulated',
  UNAVAILABLE: 'unavailable',
  UNKNOWN: 'unknown',
};

const numeric = (incoming, key) =>
  Number.isFinite(Number(incoming[key])) ? Number(incoming[key]) : DEFAULT_SIGNALS[key];

const sanitizeSignals = (incoming = {}) => ({
  ...DEFAULT_SIGNALS,
  ...incoming,
  rpm: numeric(incoming, 'rpm'),
  speed_mph: numeric(incoming, 'speed_mph'),
  gear: numeric(incoming, 'gear'),
  fuel_pct: numeric(incoming, 'fuel_pct'),
  coolant_temp_c: numeric(incoming, 'coolant_temp_c'),
  oil_pressure_psi: numeric(incoming, 'oil_pressure_psi'),
  battery_voltage: numeric(incoming, 'battery_voltage'),
  intake_air_temp_c: numeric(incoming, 'intake_air_temp_c'),
  throttle_pct: numeric(incoming, 'throttle_pct'),
  map_kpa: numeric(incoming, 'map_kpa'),
  boost_psi: numeric(incoming, 'boost_psi'),
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
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [sourceStatus, setSourceStatus] = useState(null);

  const signalStoreRef = useRef(null);
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);

  if (!signalStoreRef.current) {
    signalStoreRef.current = createSignalStore(DEFAULT_SIGNALS);
  }

  const signalStore = signalStoreRef.current;

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/vehicle-data`);
      signalStore.setState(response.data);
      setConnectionError(null);
    } catch (error) {
      setIsConnected(false);
      setConnectionError(error.message);
    }
  }, [signalStore]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    fetchData();
    pollIntervalRef.current = setInterval(fetchData, FALLBACK_POLL_MS);
  }, [fetchData]);

  // ---- telemetry stream ----
  //
  // Previously this only opened a socket for data_source obd1/obd2 and
  // otherwise polled at 60Hz. Two problems: the URL was missing the
  // /api prefix so it could never have connected, and 60Hz polling
  // asks for data far more often than it changes. Hondata cycles its
  // packets at 100Hz across ten IDs, so any single channel lands
  // roughly every 70ms.
  //
  // The socket is now the normal path and the backend pushes on
  // change. Polling remains only as a real fallback, which is what
  // the old error message already claimed was happening.
  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let reconnectTimer = null;

    const connect = () => {
      if (disposed) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.REACT_APP_BACKEND_WS || `${wsProtocol}//${window.location.host}`;
      const wsUrl = `${wsHost}/api/ws/vehicle-data`;

      let socket;
      try {
        socket = new WebSocket(wsUrl);
      } catch (error) {
        setConnectionError(`Failed to open telemetry socket: ${error.message}`);
        startPolling();
        return;
      }

      wsRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setIsConnected(true);
        setConnectionError(null);
        stopPolling();
      };

      socket.onmessage = (event) => {
        try {
          signalStore.setState(JSON.parse(event.data));
        } catch (error) {
          // A malformed frame should not take the stream down.
          setConnectionError(`Bad telemetry frame: ${error.message}`);
        }
      };

      socket.onerror = () => {
        setConnectionError('Telemetry socket error, falling back to polling.');
      };

      socket.onclose = () => {
        wsRef.current = null;
        if (disposed) return;

        setIsConnected(false);
        startPolling();

        attempt += 1;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** (attempt - 1), RECONNECT_MAX_MS);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [signalStore, startPolling, stopPolling]);

  // ---- what is actually feeding us ----
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/source-status`);
        if (!cancelled) setSourceStatus(response.data);
      } catch (error) {
        if (!cancelled) setSourceStatus(null);
      }
    };

    poll();
    const timer = setInterval(poll, SOURCE_STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const liveFields = useMemo(() => {
    const fields = sourceStatus?.source?.live_fields;
    return Array.isArray(fields) ? new Set(fields) : null;
  }, [sourceStatus]);

  const availabilityFor = useCallback(
    (signalKey) => {
      if (!sourceStatus?.source) return AVAILABILITY.UNKNOWN;
      if (!sourceStatus.source.implemented) return AVAILABILITY.UNAVAILABLE;
      if (sourceStatus.source.name === 'simulation') return AVAILABILITY.SIMULATED;
      if (!liveFields) return AVAILABILITY.UNKNOWN;
      return liveFields.has(signalKey) ? AVAILABILITY.LIVE : AVAILABILITY.UNAVAILABLE;
    },
    [liveFields, sourceStatus],
  );

  const providerValue = useMemo(
    () => ({
      isConnected,
      connectionError,
      sourceStatus,
      availabilityFor,
      subscribeToSignals: signalStore.subscribe,
      getSignalsSnapshot: signalStore.getState,
    }),
    [availabilityFor, connectionError, isConnected, signalStore, sourceStatus],
  );

  return <VehicleDataContext.Provider value={providerValue}>{children}</VehicleDataContext.Provider>;
};

const useVehicleContext = (hookName) => {
  const context = useContext(VehicleDataContext);
  if (!context) {
    throw new Error(`${hookName} must be used within a VehicleDataProvider`);
  }
  return context;
};

export const useVehicleData = () => {
  const context = useVehicleContext('useVehicleData');

  const signals = useSyncExternalStore(
    context.subscribeToSignals,
    context.getSignalsSnapshot,
    context.getSignalsSnapshot,
  );

  const criticalWarnings = useMemo(
    () => ({
      hasWarning: signals.oil_pressure_warning || signals.high_coolant || signals.check_engine,
      warnings: [
        signals.oil_pressure_warning && 'LOW OIL PRESSURE',
        signals.high_coolant && 'ENGINE OVERHEAT',
        signals.low_fuel && 'LOW FUEL',
        signals.check_engine && 'CHECK ENGINE',
      ].filter(Boolean),
    }),
    [
      signals.oil_pressure_warning,
      signals.high_coolant,
      signals.low_fuel,
      signals.check_engine,
    ],
  );

  return {
    signals,
    isConnected: context.isConnected,
    connectionError: context.connectionError,
    sourceStatus: context.sourceStatus,
    criticalWarnings,
  };
};

/**
 * Subscribe to one signal. Prefer this over useVehicleData in widgets:
 * useVehicleData re-renders on every field change, which at streaming
 * rates means the whole tree redraws for a battery voltage tick.
 */
export const useVehicleSignal = (signalKey) => {
  const context = useVehicleContext('useVehicleSignal');

  return useSyncExternalStore(
    context.subscribeToSignals,
    () => context.getSignalsSnapshot()[signalKey],
    () => context.getSignalsSnapshot()[signalKey],
  );
};

/**
 * Subscribe to a derived value.
 *
 * The selector MUST return a primitive. Returning a fresh object or
 * array on each call makes useSyncExternalStore see a changed
 * snapshot every time it checks, and React will re-render forever.
 * Use several useVehicleSignal calls instead of selecting an object.
 */
export const useVehicleDataSelector = (selector) => {
  const context = useVehicleContext('useVehicleDataSelector');

  return useSyncExternalStore(
    context.subscribeToSignals,
    () => selector(context.getSignalsSnapshot()),
    () => selector(context.getSignalsSnapshot()),
  );
};

/**
 * Whether a signal has a real source behind it right now.
 *
 * Returns one of AVAILABILITY. A gauge reading 40 PSI because that is
 * the model default, on a car with no oil pressure sender wired, is
 * worse than a gauge reading nothing - so widgets should dim or hide
 * anything that is not 'live' or 'simulated'.
 */
export const useSignalAvailability = (signalKey) => {
  const context = useVehicleContext('useSignalAvailability');
  return context.availabilityFor(signalKey);
};

/** Raw source status: which source, whether it is receiving, decoder counters. */
export const useSourceStatus = () => useVehicleContext('useSourceStatus').sourceStatus;
