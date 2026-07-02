import React, { useRef, useState, useCallback } from 'react';

// Extract coordinates from mouse or touch events
function getXY(e) {
  if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function snap(val, gridSize) {
  if (!gridSize || gridSize <= 0) return val;
  return Math.round(val / gridSize) * gridSize;
}

export default function EditableWidget({ id, editing, transform, onUpdate, children, label, gridSize = 0 }) {
  const outerRef = useRef(null);
  const [active, setActive] = useState(false);
  const dragState = useRef({ mode: null });

  const t = { x: 0, y: 0, scale: 1, rotation: 0, ...(transform || {}) };

  /* ---- DRAG ---- */
  const startDrag = useCallback((e) => {
    if (!editing) return;
    e.stopPropagation();
    e.preventDefault();

    const { x: startX, y: startY } = getXY(e);
    const origTx = t.x;
    const origTy = t.y;
    dragState.current = { mode: 'drag' };
    setActive(true);

    const onMove = (ev) => {
      ev.preventDefault();
      const { x: cx, y: cy } = getXY(ev);
      const rawX = origTx + (cx - startX);
      const rawY = origTy + (cy - startY);
      onUpdate(id, { x: snap(rawX, gridSize), y: snap(rawY, gridSize) });
    };

    const onUp = () => {
      dragState.current = { mode: null };
      setActive(false);
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
      window.removeEventListener('touchmove', onMove, { capture: true });
      window.removeEventListener('touchend', onUp, true);
    };

    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    window.addEventListener('touchmove', onMove, { capture: true, passive: false });
    window.addEventListener('touchend', onUp, true);
  }, [editing, t.x, t.y, id, onUpdate, gridSize]);

  /* ---- SCALE (corner handle) ---- */
  const startScale = useCallback((e) => {
    if (!editing) return;
    e.stopPropagation();
    e.preventDefault();

    const rect = outerRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 0;
    const cy = rect ? rect.top + rect.height / 2 : 0;
    const { x: sx, y: sy } = getXY(e);
    const startDist = Math.hypot(sx - cx, sy - cy);
    const origScale = t.scale;
    dragState.current = { mode: 'scale' };
    setActive(true);

    const onMove = (ev) => {
      ev.preventDefault();
      const { x: mx, y: my } = getXY(ev);
      const dist = Math.hypot(mx - cx, my - cy);
      const ratio = dist / Math.max(startDist, 1);
      const newScale = Math.max(0.3, Math.min(3, origScale * ratio));
      onUpdate(id, { scale: Math.round(newScale * 100) / 100 });
    };

    const onUp = () => {
      dragState.current = { mode: null };
      setActive(false);
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
      window.removeEventListener('touchmove', onMove, { capture: true });
      window.removeEventListener('touchend', onUp, true);
    };

    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    window.addEventListener('touchmove', onMove, { capture: true, passive: false });
    window.addEventListener('touchend', onUp, true);
  }, [editing, t.scale, id, onUpdate]);

  /* ---- ROTATE (button increments) ---- */
  const rotate = useCallback((deg) => {
    onUpdate(id, { rotation: ((t.rotation || 0) + deg) % 360 });
  }, [id, t.rotation, onUpdate]);

  const style = {
    transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale}) rotate(${t.rotation}deg)`,
    transformOrigin: 'center center',
    position: 'relative',
    zIndex: active ? 50 : 'auto',
    cursor: editing ? (active ? 'grabbing' : 'grab') : 'default',
    transition: active ? 'none' : 'transform 0.15s ease-out',
    touchAction: editing ? 'none' : 'auto',
    userSelect: editing ? 'none' : 'auto',
  };

  return (
    <div
      ref={outerRef}
      style={style}
      data-testid={`editable-${id}`}
      onMouseDown={startDrag}
      onTouchStart={startDrag}
    >
      {children}

      {editing && (
        <>
          {/* Dashed outline */}
          <div style={{
            position: 'absolute', inset: -2,
            border: '1.5px dashed rgba(59,130,246,0.5)',
            borderRadius: 6,
            pointerEvents: 'none',
          }} />

          {/* Label badge */}
          <div style={{
            position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(59,130,246,0.8)', borderRadius: 4,
            padding: '2px 8px', whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 8,
              color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>{label || id}</span>
          </div>

          {/* Scale handle — bottom-right */}
          <div
            onMouseDown={(e) => { e.stopPropagation(); startScale(e); }}
            onTouchStart={(e) => { e.stopPropagation(); startScale(e); }}
            style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 14, height: 14, borderRadius: 3,
              background: '#3B82F6', cursor: 'nwse-resize',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              touchAction: 'none',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ pointerEvents: 'none' }}>
              <path d="M7 1L1 7M7 4L4 7M7 7L7 7" stroke="white" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>

          {/* Rotate buttons — top-right */}
          <div style={{ position: 'absolute', top: -6, right: -6, display: 'flex', gap: 2 }}>
            <button
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); rotate(-15); }}
              onTouchStart={e => { e.stopPropagation(); e.preventDefault(); rotate(-15); }}
              style={{
                width: 14, height: 14, borderRadius: 3, border: 'none',
                background: '#8B5CF6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)', touchAction: 'none',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ pointerEvents: 'none' }}>
                <path d="M2 1C1 2 1 5 4 6M1 1L3 1L1 3" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
              </svg>
            </button>
            <button
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); rotate(15); }}
              onTouchStart={e => { e.stopPropagation(); e.preventDefault(); rotate(15); }}
              style={{
                width: 14, height: 14, borderRadius: 3, border: 'none',
                background: '#8B5CF6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)', touchAction: 'none',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ pointerEvents: 'none' }}>
                <path d="M6 1C7 2 7 5 4 6M7 1L5 1L7 3" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
