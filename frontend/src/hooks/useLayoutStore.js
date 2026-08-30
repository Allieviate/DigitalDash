import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'frank-dash-layout';

// localStorage.setItem is synchronous and blocks the main thread. The
// previous version wrote inside updateWidget, which EditableWidget
// calls on every pointer move, so a drag meant a JSON.stringify of the
// whole layout plus a disk write per frame. That is the jank you feel
// when moving a widget on the Pi.
//
// State still updates immediately, so dragging stays smooth. Only the
// persisting is throttled.
const WRITE_THROTTLE_MS = 300;

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

const writeLayout = (layout) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage full or unavailable
  }
};

export function useLayoutStore() {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  });

  const pendingRef = useRef(null);
  const timerRef = useRef(null);
  // Stops the initial mount from writing back what it just read.
  const dirtyRef = useRef(false);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current === null) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    writeLayout(pending);
  }, []);

  const scheduleWrite = useCallback((next) => {
    pendingRef.current = next;
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flush();
    }, WRITE_THROTTLE_MS);
  }, [flush]);

  // Persist as a reaction to state, not as a side effect inside the
  // updater. Updater functions can run twice under StrictMode, which
  // would have meant double writes.
  useEffect(() => {
    if (!dirtyRef.current) return;
    scheduleWrite(layout);
  }, [layout, scheduleWrite]);

  // A kiosk losing power mid-drag should not lose the move. pagehide
  // fires on navigation and on tab teardown; the unmount cleanup
  // covers the rest.
  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);

  const saveLayout = useCallback((newLayout) => {
    // Explicit save (leaving edit mode, cancelling). Write now rather
    // than waiting out the throttle.
    dirtyRef.current = false;
    pendingRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setLayout(newLayout);
    writeLayout(newLayout);
  }, []);

  const updateWidget = useCallback((id, transform) => {
    dirtyRef.current = true;
    setLayout(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...transform } }));
  }, []);

  const resetLayout = useCallback(() => {
    dirtyRef.current = false;
    pendingRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setLayout(DEFAULT_LAYOUT);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  const getWidgetTransform = useCallback((id) => {
    return layout[id] || { x: 0, y: 0, scale: 1, rotation: 0 };
  }, [layout]);

  return { layout, saveLayout, updateWidget, resetLayout, getWidgetTransform, flushLayout: flush };
}
