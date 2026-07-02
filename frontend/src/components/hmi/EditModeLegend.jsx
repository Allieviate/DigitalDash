import React from 'react';
import { Move, Maximize2, RotateCw, Save, X, RotateCcw, Grid3x3 } from 'lucide-react';

export default function EditModeLegend({ onSave, onReset, onCancel, gridSize, onToggleGrid }) {
  const gridActive = gridSize > 0;

  return (
    <div
      data-testid="edit-mode-legend"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'rgba(15,15,15,0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding: '12px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* How-to hints */}
      <HintBadge icon={<Move size={12} />} color="#3B82F6" text="Drag to move" />
      <HintBadge icon={<Maximize2 size={12} />} color="#3B82F6" text="Corner to resize" />
      <HintBadge icon={<RotateCw size={12} />} color="#8B5CF6" text="Buttons to rotate" />

      <Divider />

      {/* Grid snap toggle */}
      <button
        onClick={onToggleGrid}
        data-testid="grid-snap-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 6,
          border: `1px solid ${gridActive ? '#06B6D4' : 'rgba(255,255,255,0.1)'}`,
          background: gridActive ? 'rgba(6,182,212,0.15)' : 'transparent',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <Grid3x3 size={13} style={{ color: gridActive ? '#06B6D4' : 'rgba(255,255,255,0.35)' }} />
        <span style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: 8,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          color: gridActive ? '#06B6D4' : 'rgba(255,255,255,0.35)',
        }}>
          Snap {gridActive ? `${gridSize}px` : 'Off'}
        </span>
      </button>

      <Divider />

      {/* Action buttons */}
      <ActionBtn icon={<RotateCcw size={13} />} label="Reset" color="#F59E0B" onClick={onReset} testId="edit-reset-btn" />
      <ActionBtn icon={<X size={13} />} label="Cancel" color="#EF4444" onClick={onCancel} testId="edit-cancel-btn" />
      <ActionBtn icon={<Save size={13} />} label="Save & Exit" color="#22C55E" onClick={onSave} testId="edit-save-btn" primary />
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />;
}

function HintBadge({ icon, color, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ color }}>{icon}</div>
      <span style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: 8,
        letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
      }}>{text}</span>
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick, testId, primary }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: primary ? '7px 16px' : '6px 12px',
        borderRadius: 6,
        border: `1px solid ${color}40`,
        background: primary ? `${color}20` : 'transparent',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}25`; }}
      onMouseLeave={e => { e.currentTarget.style.background = primary ? `${color}20` : 'transparent'; }}
    >
      <span style={{ color }}>{icon}</span>
      <span style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: 8,
        letterSpacing: '0.15em', textTransform: 'uppercase', color,
      }}>{label}</span>
    </button>
  );
}
