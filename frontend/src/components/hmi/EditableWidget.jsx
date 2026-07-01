import React, { useRef, useState, useCallback, useEffect } from 'react';

export default function EditableWidget({ id, editing, transform, onUpdate, children, label }) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startRef = useRef({ px: 0, py: 0, tx: 0, ty: 0, scale: 1, dist: 0 });

  const t = transform || { x: 0, y: 0, scale: 1, rotation: 0 };

  // DRAG
  const onDragStart = useCallback((e) => {
    if (!editing) return;
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    const pt = e.touches ? e.touches[0] : e;
    startRef.current = { px: pt.clientX, py: pt.clientY, tx: t.x, ty: t.y };
  }, [editing, t.x, t.y]);

  const onDragMove = useCallback((e) => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - startRef.current.px;
    const dy = pt.clientY - startRef.current.py;
    onUpdate(id, { x: startRef.current.tx + dx, y: startRef.current.ty + dy });
  }, [dragging, id, onUpdate]);

  const onDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  // SCALE via corner handle
  const onScaleStart = useCallback((e) => {
    if (!editing) return;
    e.stopPropagation();
    e.preventDefault();
    setResizing(true);
    const pt = e.touches ? e.touches[0] : e;
    const rect = ref.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 0;
    const cy = rect ? rect.top + rect.height / 2 : 0;
    const dist = Math.hypot(pt.clientX - cx, pt.clientY - cy);
    startRef.current = { ...startRef.current, scale: t.scale, dist, cx, cy };
  }, [editing, t.scale]);

  const onScaleMove = useCallback((e) => {
    if (!resizing) return;
    const pt = e.touches ? e.touches[0] : e;
    const { cx, cy } = startRef.current;
    const dist = Math.hypot(pt.clientX - cx, pt.clientY - cy);
    const ratio = dist / Math.max(startRef.current.dist, 1);
    const newScale = Math.max(0.3, Math.min(3, startRef.current.scale * ratio));
    onUpdate(id, { scale: Math.round(newScale * 100) / 100 });
  }, [resizing, id, onUpdate]);

  const onScaleEnd = useCallback(() => {
    setResizing(false);
  }, []);

  // ROTATE via button increments (simpler for touch screens)
  const rotate = useCallback((deg) => {
    onUpdate(id, { rotation: (t.rotation + deg) % 360 });
  }, [id, t.rotation, onUpdate]);

  // Global move/end listeners
  useEffect(() => {
    if (!dragging && !resizing) return;
    const moveHandler = dragging ? onDragMove : onScaleMove;
    const endHandler = dragging ? onDragEnd : onScaleEnd;
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', endHandler);
    window.addEventListener('touchmove', moveHandler, { passive: false });
    window.addEventListener('touchend', endHandler);
    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', endHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', endHandler);
    };
  }, [dragging, resizing, onDragMove, onDragEnd, onScaleMove, onScaleEnd]);

  const style = {
    transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale}) rotate(${t.rotation}deg)`,
    transformOrigin: 'center center',
    position: 'relative',
    zIndex: dragging || resizing ? 50 : 'auto',
    cursor: editing ? (dragging ? 'grabbing' : 'grab') : 'default',
    transition: dragging || resizing ? 'none' : 'transform 0.15s ease-out',
  };

  return (
    <div ref={ref} style={style} data-testid={`editable-${id}`}>
      {/* Drag area */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{ position: 'relative' }}
      >
        {children}
      </div>

      {/* Edit controls — only visible in edit mode */}
      {editing && (
        <>
          {/* Outline */}
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

          {/* Scale handle — bottom-right corner */}
          <div
            onMouseDown={onScaleStart}
            onTouchStart={onScaleStart}
            style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 14, height: 14, borderRadius: 3,
              background: '#3B82F6', cursor: 'nwse-resize',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M7 1L1 7M7 4L4 7M7 7L7 7" stroke="white" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>

          {/* Rotate buttons — top-right */}
          <div style={{
            position: 'absolute', top: -6, right: -6,
            display: 'flex', gap: 2,
          }}>
            <button
              onMouseDown={e => { e.stopPropagation(); rotate(-15); }}
              onTouchStart={e => { e.stopPropagation(); rotate(-15); }}
              style={{
                width: 14, height: 14, borderRadius: 3, border: 'none',
                background: '#8B5CF6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M2 1C1 2 1 5 4 6M1 1L3 1L1 3" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
              </svg>
            </button>
            <button
              onMouseDown={e => { e.stopPropagation(); rotate(15); }}
              onTouchStart={e => { e.stopPropagation(); rotate(15); }}
              style={{
                width: 14, height: 14, borderRadius: 3, border: 'none',
                background: '#8B5CF6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M6 1C7 2 7 5 4 6M7 1L5 1L7 3" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
