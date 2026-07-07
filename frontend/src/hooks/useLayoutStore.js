import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'frank-dash-layout';

// Factory default layout — matches the CSS-driven positions exactly.
// Every widget starts at its natural CSS position (x:0, y:0) with no scaling or rotation.
// This ensures a consistent layout on first boot or after a reset, even with empty localStorage.
const WIDGET_IDS = [
  'shift-lights', 'digital-speed', 'gear-display', 'turn-left', 'turn-right',
  'coolant', 'oil-pressure', 'tachometer', 'rpm-readout', 'speedometer',
  'fuel', 'battery', 'status',
  'warn-check_engine', 'warn-oil_pressure_warning', 'warn-high_coolant',
  'warn-low_fuel', 'warn-maintenance', 'warn-brake_warning', 'warn-abs_warning',
];

const DEFAULT_LAYOUT = Object.fromEntries(
  WIDGET_IDS.map(id => [id, { x: 0, y: 0, scale: 1, rotation: 0 }])
);

export function useLayoutStore() {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  });

  const saveLayout = useCallback((newLayout) => {
    setLayout(newLayout);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  const updateWidget = useCallback((id, transform) => {
    setLayout(prev => {
      const updated = { ...prev, [id]: { ...(prev[id] || {}), ...transform } };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  const getWidgetTransform = useCallback((id) => {
    return layout[id] || { x: 0, y: 0, scale: 1, rotation: 0 };
  }, [layout]);

  return { layout, saveLayout, updateWidget, resetLayout, getWidgetTransform };
}
