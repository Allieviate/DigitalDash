import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

const SettingsContext = createContext(null);

const SETTINGS_STORAGE_KEY = 'fran.dashboard.settings.v2';

/**
 * Every setting the dash actually has.
 *
 * Anything not listed here is dropped on load and on save. That
 * matters: sanitizeSettings used to spread ...incoming wholesale, so
 * any key ever written to localStorage survived forever and removing
 * a setting from this file would not remove it from a Pi that had
 * already saved it.
 *
 * Removed in the settings cleanup, all of them written by a control
 * and read by nothing:
 *   layout / DEFAULT_LAYOUT   - a second layout system. Dashboard uses
 *                               useLayoutStore with different widget
 *                               ids; this one was never rendered, and
 *                               it held the stale 170 and 180 speedo
 *                               maxima that disagreed with the real
 *                               gauges at 160.
 *   layout_preset             - Dash Builder tab
 *   widget_visibility         - Dash Builder tab
 *   gauge_scale               - Dash Builder tab, gauge size is 420px
 *                               hardcoded in Dashboard
 *   warn_coolant / warn_oil   - checkboxes nothing consulted
 *   featureToggles            - never read
 *   gauge_style               - never read
 *   custom_gauges             - never read
 *   aa_mode                   - never read
 *   data_source               - moved to SIGNAL_SOURCE in backend/.env
 *                               in phase 2; which source runs is a
 *                               deployment property, not a preference
 *
 * wifi_enabled and auto_dim are kept deliberately. Nothing acts on
 * them yet either, but they are placeholders for functionality that
 * is wanted rather than leftovers.
 */
const DEFAULT_SETTINGS = {
  version: 2,

  // appearance
  theme_id: 'type_r',
  brightness: 100,
  // Chrome around each MIL tell-tale. Off by default: the border and
  // fill were drawn whether or not a lamp was lit, so the bottom row
  // read as seven empty boxes.
  mil_borders: false,

  // units and behaviour
  units: 'imperial',
  performance_mode: 'high_performance',

  // audio
  warning_sounds: true,
  chime_volume: 70,

  // shift lights
  yellow_shift: 7000,
  red_shift: 7800,
  redline: 8500,

  // connectivity
  bluetooth_enabled: true,
  wifi_enabled: true,

  // placeholder, not yet acted on
  auto_dim: false,
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

const sanitizeSettings = (incoming = {}) => {
  const next = { ...DEFAULT_SETTINGS };

  for (const key of SETTING_KEYS) {
    if (incoming[key] === undefined) continue;

    const fallback = DEFAULT_SETTINGS[key];
    const value = incoming[key];

    if (typeof fallback === 'number') {
      next[key] = Number.isFinite(Number(value)) ? Number(value) : fallback;
    } else if (typeof fallback === 'boolean') {
      next[key] = typeof value === 'boolean' ? value : fallback;
    } else if (typeof fallback === 'string') {
      next[key] = typeof value === 'string' ? value : fallback;
    }
  }

  return next;
};

const loadInitialSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(saved));
  } catch (error) {
    console.warn('Unable to load saved dashboard settings, using defaults.', error);
    return DEFAULT_SETTINGS;
  }
};

const createSettingsStore = (initialState) => {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (updater) => {
      const next = typeof updater === 'function' ? updater(state) : updater;
      state = sanitizeSettings(next);
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const SettingsProvider = ({ children }) => {
  const storeRef = useRef(null);

  if (!storeRef.current) {
    storeRef.current = createSettingsStore(loadInitialSettings());
  }

  const store = storeRef.current;

  const subscribe = useCallback((listener) => store.subscribe(listener), [store]);
  const getSnapshot = useCallback(() => store.getState(), [store]);
  const settings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage full or unavailable
    }
  }, [settings]);

  const updateSettings = useCallback(
    async (updates) => {
      store.setState((current) => ({ ...current, ...updates }));
      return true;
    },
    [store],
  );

  const updateSetting = useCallback((key, value) => updateSettings({ [key]: value }), [updateSettings]);

  const value = useMemo(
    () => ({
      isLoading: false,
      isSaving: false,
      updateSettings,
      updateSetting,
      reloadSettings: () => {},
      getSettingsSnapshot: store.getState,
      subscribeToSettings: store.subscribe,
    }),
    [store, updateSetting, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  const settings = useSyncExternalStore(
    context.subscribeToSettings,
    context.getSettingsSnapshot,
    context.getSettingsSnapshot,
  );

  return {
    settings,
    isLoading: context.isLoading,
    isSaving: context.isSaving,
    updateSettings: context.updateSettings,
    updateSetting: context.updateSetting,
    reloadSettings: context.reloadSettings,
  };
};

/**
 * Subscribe to one derived setting.
 *
 * The selector MUST return a primitive. Returning a fresh object or
 * array on each call makes useSyncExternalStore see a changed
 * snapshot every time it checks, and React will re-render forever.
 */
export const useSettingsSelector = (selector) => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsSelector must be used within a SettingsProvider');
  }

  return useSyncExternalStore(
    context.subscribeToSettings,
    () => selector(context.getSettingsSnapshot()),
    () => selector(context.getSettingsSnapshot()),
  );
};
