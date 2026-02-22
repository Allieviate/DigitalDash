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

const DEFAULT_LAYOUT = [
  {
    id: 'critical_warning_banner',
    type: 'CriticalWarningBanner',
    dataKey: 'check_engine',
    x: 0,
    y: 0,
    width: 100,
    height: 10,
    visible: true,
    zIndex: 90,
  },
  {
    id: 'shift_lights',
    type: 'ShiftLightsBar',
    dataKey: 'rpm',
    x: 26,
    y: 4,
    width: 48,
    height: 8,
    visible: true,
    zIndex: 40,
  },
  {
    id: 'digital_speed_gear',
    type: 'DigitalSpeedGear',
    dataKey: 'speed_mph',
    x: 35,
    y: 10,
    width: 30,
    height: 20,
    visible: true,
    zIndex: 40,
  },
  {
    id: 'turn_signals',
    type: 'TurnSignalsRow',
    dataKey: 'turn_left',
    x: 33,
    y: 30,
    width: 34,
    height: 10,
    visible: true,
    zIndex: 35,
  },
  {
    id: 'rpm_gauge_left',
    type: 'RpmGauge',
    dataKey: 'rpm',
    x: 0,
    y: 30,
    width: 32,
    height: 66,
    visible: true,
    zIndex: 30,
    faceImage: '/assets/gauges/rpm-gauge.png',
    needleImage: '/assets/gauges/rpm-needle.png',
    tickImage: '/assets/gauges/rpm-medium-ticks.png',
    min: 0,
    max: 8000,
    unit: 'rpm',
  },
  {
    id: 'android_auto_panel',
    type: 'AndroidAutoPanel',
    dataKey: 'speed_mph',
    x: 32,
    y: 32,
    width: 36,
    height: 56,
    visible: true,
    zIndex: 20,
  },
  {
    id: 'speed_gauge_right',
    type: 'SpeedGauge',
    dataKey: 'speed_mph',
    x: 68,
    y: 30,
    width: 32,
    height: 66,
    visible: true,
    zIndex: 30,
    faceImage: '/assets/gauges/spd-gauge.png',
    needleImage: '/assets/gauges/rpm-needle.png',
    tickImage: '/assets/gauges/spd-medium-ticks.png',
    min: 0,
    max: 170,
    unit: 'mph',
  },
  {
    id: 'warning_panel',
    type: 'WarningPanel',
    dataKey: 'oil_pressure_warning',
    x: 0,
    y: 90,
    width: 100,
    height: 10,
    visible: true,
    zIndex: 40,
  },
  {
    id: 'connection_status',
    type: 'ConnectionStatus',
    dataKey: 'speed_mph',
    x: 82,
    y: 4,
    width: 14,
    height: 8,
    visible: true,
    zIndex: 50,
  },
];

const DEFAULT_FEATURE_TOGGLES = {
  enableBoostGauge: false,
  enableACStatus: true,
  showTurnSignals: true,
  showDiagnostics: false,
  showAndroidAutoPanel: true,
};

const DEFAULT_SETTINGS = {
  version: 2,
  theme_id: 'type_r',
  units: 'imperial',
  data_source: 'simulation',
  performance_mode: 'high_performance',
  brightness: 100,
  warning_sounds: true,
  chime_volume: 70,
  bluetooth_enabled: true,
  gauge_style: 'modern',
  custom_gauges: {},
  layout: DEFAULT_LAYOUT,
  featureToggles: DEFAULT_FEATURE_TOGGLES,
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const sanitizeLayoutItem = (item, index) => {
  const base = DEFAULT_LAYOUT[index] || {};
  return {
    id: typeof item?.id === 'string' ? item.id : base.id || `widget_${index}`,
    type: typeof item?.type === 'string' ? item.type : base.type || 'InfoGauge',
    dataKey: typeof item?.dataKey === 'string' ? item.dataKey : base.dataKey || 'rpm',
    x: Number.isFinite(Number(item?.x)) ? Number(item.x) : base.x || 0,
    y: Number.isFinite(Number(item?.y)) ? Number(item.y) : base.y || 0,
    width: Number.isFinite(Number(item?.width)) ? Number(item.width) : base.width || 20,
    height: Number.isFinite(Number(item?.height)) ? Number(item.height) : base.height || 20,
    visible: typeof item?.visible === 'boolean' ? item.visible : base.visible ?? true,
    zIndex: Number.isFinite(Number(item?.zIndex)) ? Number(item.zIndex) : base.zIndex || 1,
    faceImage: typeof item?.faceImage === 'string' ? item.faceImage : base.faceImage,
    needleImage: typeof item?.needleImage === 'string' ? item.needleImage : base.needleImage,
    tickImage: typeof item?.tickImage === 'string' ? item.tickImage : base.tickImage,
    min: Number.isFinite(Number(item?.min)) ? Number(item.min) : base.min,
    max: Number.isFinite(Number(item?.max)) ? Number(item.max) : base.max,
    unit: typeof item?.unit === 'string' ? item.unit : base.unit,
  };
};

const sanitizeSettings = (incoming = {}) => {
  const layout = Array.isArray(incoming.layout)
    ? incoming.layout.map(sanitizeLayoutItem)
    : DEFAULT_LAYOUT.map(sanitizeLayoutItem);

  return {
    ...DEFAULT_SETTINGS,
    ...incoming,
    layout,
    featureToggles: {
      ...DEFAULT_FEATURE_TOGGLES,
      ...(isObject(incoming.featureToggles) ? incoming.featureToggles : {}),
    },
  };
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
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback(
    async (updates) => {
      store.setState((current) => ({ ...current, ...updates }));
      return true;
    },
    [store],
  );

  const updateSetting = useCallback((key, value) => updateSettings({ [key]: value }), [updateSettings]);

  const updateLayout = useCallback(
    (updater) => {
      store.setState((current) => {
        const nextLayout = typeof updater === 'function' ? updater(current.layout) : updater;
        return { ...current, layout: nextLayout };
      });
    },
    [store],
  );

  const updateFeatureToggle = useCallback(
    (toggleKey, enabled) => {
      store.setState((current) => ({
        ...current,
        featureToggles: {
          ...current.featureToggles,
          [toggleKey]: Boolean(enabled),
        },
      }));
    },
    [store],
  );

  const value = useMemo(
    () => ({
      isLoading: false,
      isSaving: false,
      updateSettings,
      updateSetting,
      updateLayout,
      updateFeatureToggle,
      reloadSettings: () => {},
      getSettingsSnapshot: store.getState,
      subscribeToSettings: store.subscribe,
    }),
    [store, updateFeatureToggle, updateLayout, updateSetting, updateSettings],
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
    updateLayout: context.updateLayout,
    updateFeatureToggle: context.updateFeatureToggle,
    reloadSettings: context.reloadSettings,
  };
};

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
