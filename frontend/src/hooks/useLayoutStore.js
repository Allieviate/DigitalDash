import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'frank-dash-layout';

// Default positions — will be used if nothing is saved
const DEFAULT_LAYOUT = {};

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
