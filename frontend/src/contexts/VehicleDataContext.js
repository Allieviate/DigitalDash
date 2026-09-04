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

// Fallback polling rate.
//
// This was 250ms on the assumption the socket would almost always be
// up and polling would be a rare stopgap. When the socket could not
// connect, that assumption made the fallback the only path and the
// needles moved four times a second - visibly choppy.
//
// Back to the 60Hz the dash was built around. It is more requests than
// the websocket needs, but a fallback that looks broken is not a
// fallback.
const FALLBACK_POLL_MS = 1000 / 60;

const SOURCE_STATUS_POLL_MS = 2000;

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 10000;

// If the socket never opens - because nothing is proxying websockets
// at the served origin, for instance - stop retrying aggressively and
// settle on polling. Retrying twice a second forever is what made the
// dash feel glitchy.
const MAX_EAGER_ATTEMPTS = 5;
const IDLE_RETRY_MS = 60000;

// Data is considered live if something arrived recently, regardless of
// which transport delivered it.
const LIVE_WINDOW_MS = 2000;
const LIVENESS_TICK_MS = 500;

export const AVAILABILITY = {
  LIVE: 'live',
  SIMULATED: 'simulated',
  UNAVAILABLE: 'unavailable',
  UNKNOWN: 'unknown',
};

/**
 * Work out where the websocket lives.
 *
 * This is the bug that made the dash read OFFLINE while data was
 * arriving fine. The old fallback was window.location.host, which is
 * the port `serve` listens on. `serve` hands out static files and does
 * not proxy websockets, so the socket could never open there - while
 * axios, using REACT_APP_BACKEND_URL, talked to the backend happily.
 *
 * Order: an explicit REACT_APP_BACKEND_WS wins; otherwise derive from
 * the backend URL by swapping the scheme; only fall back to the page
 * origin when the backend URL is relative, which means something is
 * already proxying both.
 */
const resolveWsUrl = () => {
  const explicit = process.env.REACT_APP_BACKEND_WS;
  if (explicit) return `${explicit.replace(/\/$/, '')}/api/ws/vehicle-data`;

  if (/^https?:\/\//i.test(API_URL)) {
    const wsBase = API_URL.replace(/^http/i, 'ws').replace(/\/$/, '');
    return `${wsBase}/api/ws/vehicle-data`;
  }

  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}/api/ws/vehicle-data`;
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
  const [transport, setTransport] = useState('connecting');
  const [connectionError, setConnectionError] = useState(null);
  const [sourceStatus, setSourceStatus] = useState(null);

  const signalStoreRef = useRef(null);
  const wsRef = useRef(null);
  const pollTimerRef = useRef(null);
  const pollInFlightRef = useRef(false);
  const lastDataAtRef = useRef(0);

  if (!signalStoreRef.current) {
    signalStoreRef.current = createSignalStore(DEFAULT_SIGNALS);
  }

  const signalStore = signalStoreRef.current;

  const markData = useCallback(() => {
    lastDataAtRef.current = Date.now();
  }, []);

  const fetchData = useCallback(async () => {
    // At 60Hz a slow response would otherwise stack requests on top of
    // each other until the Pi falls over.
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const response = await axios.get(`${API_URL}/api/vehicle-data`);
      signalStore.setState(response.data);
      markData();
      setConnectionError(null);
    } catch (error) {
      setConnectionError(error.message);
    } finally {
      pollInFlightRef.current = false;
    }
  }, [markData, signalStore]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    setTransport('polling');
    fetchData();
    pollTimerRef.current = setInterval(fetchData, FALLBACK_POLL_MS);
  }, [fetchData]);

  // ---- liveness ----
  //
  // isConnected used to mean "the websocket is open", which reported
  // the dash as OFFLINE while polling was delivering data perfectly
  // well. It now means what the label on screen claims: data is
  // arriving.
  useEffect(() => {
    const timer = setInterval(() => {
      const live = Date.now() - lastDataAtRef.current < LIVE_WINDOW_MS;
      setIsConnected((prev) => (prev === live ? prev : live));
    }, LIVENESS_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // ---- telemetry stream ----
  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let reconnectTimer = null;

    const scheduleReconnect = () => {
      if (disposed) return;
      attempt += 1;
      const delay = attempt > MAX_EAGER_ATTEMPTS
        ? IDLE_RETRY_MS
        : Math.min(RECONNECT_BASE_MS * 2 ** (attempt - 1), RECONNECT_MAX_MS);
      reconnectTimer = setTimeout(connect, delay);
    };

    function connect() {
      if (disposed) return;

      let socket;
      try {
        socket = new WebSocket(resolveWsUrl());
      } catch (error) {
        startPolling();
        scheduleReconnect();
        return;
      }

      wsRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setTransport('websocket');
        setConnectionError(null);
        stopPolling();
      };

      socket.onmessage = (event) => {
        try {
          signalStore.setState(JSON.parse(event.data));
          markData();
        } catch (error) {
          setConnectionError(`Bad telemetry frame: ${error.message}`);
        }
      };

      socket.onerror = () => {
        // onclose always follows, so recovery is handled there. Doing
        // it here as well would start polling twice.
      };

      socket.onclose = () => {
        wsRef.current = null;
        if (disposed) return;
        startPolling();
        scheduleReconnect();
      };
    }

    // Poll immediately so the dash has data while the socket is still
    // deciding whether it can connect at all.
    startPolling();
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
  }, [markData, signalStore, startPolling, stopPolling]);

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

      // Freshness gates everything below it.
      //
      // Two cases this catches, both of which used to read as healthy.
      // If nothing has ever arrived - a CAN interface that is down -
      // the signals object still holds the backend's model defaults,
      // which are a plausible idling engine. And if frames arrived and
      // then stopped - ignition off, connector shaken loose - the
      // values freeze at their last reading while live_fields still
      // lists every field that was ever seen, because it accumulates
      // and is never cleared.
      //
      // In both cases what is on screen is not measurement.
      if (!sourceStatus.fresh) return AVAILABILITY.UNAVAILABLE;

      if (sourceStatus.source.name === 'simulation') return AVAILABILITY.SIMULATED;
      if (!liveFields) return AVAILABILITY.UNKNOWN;
      return liveFields.has(signalKey) ? AVAILABILITY.LIVE : AVAILABILITY.UNAVAILABLE;
    },
    [liveFields, sourceStatus],
  );

  const providerValue = useMemo(
    () => ({
      isConnected,
      transport,
      connectionError,
      sourceStatus,
      availabilityFor,
      subscribeToSignals: signalStore.subscribe,
      getSignalsSnapshot: signalStore.getState,
    }),
    [availabilityFor, connectionError, isConnected, signalStore, sourceStatus, transport],
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
    transport: context.transport,
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
 * worse than a gauge reading nothing.
 */
export const useSignalAvailability = (signalKey) => {
  const context = useVehicleContext('useSignalAvailability');
  return context.availabilityFor(signalKey);
};

/**
 * Is there something real behind this signal right now?
 *
 * The boolean form, for widgets that only need to decide between
 * drawing a value and drawing dashes. Simulated counts as available on
 * purpose: the simulator exists to make the dash provable on the
 * bench, and a bench full of dimmed gauges proves nothing.
 *
 * UNKNOWN also counts as available - it means we have not heard from
 * /api/source-status yet, which is not evidence of a problem, and
 * dimming on it would make the whole cluster flicker whenever that
 * poll misses.
 */
export const useSignalIsAvailable = (signalKey) =>
  useSignalAvailability(signalKey) !== AVAILABILITY.UNAVAILABLE;

/** Raw source status: which source, whether it is receiving, decoder counters. */
export const useSourceStatus = () => useVehicleContext('useSourceStatus').sourceStatus;
