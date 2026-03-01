import React, { useState } from 'react';
import { Gauge, Zap, Hash, Lightbulb, TrendingUp, Activity } from 'lucide-react';

// ── Shared styles ─────────────────────────────────────────────────────────────

const SECTION_LABEL = {
  fontFamily: 'Helvetica Neue, sans-serif',
  fontSize: 9,
  letterSpacing: '0.4em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.25)',
  marginBottom: 16,
};

const CARD = {
  background: '#18181b',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 10,
  marginBottom: 16,
};

const minMaxLabel = {
  fontFamily: 'Helvetica Neue, sans-serif',
  fontSize: 8,
  letterSpacing: '0.2em',
  color: 'rgba(255,255,255,0.15)',
};

// ── Layout Preset Button ──────────────────────────────────────────────────────

function PresetBtn({ label, sublabel, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '16px 12px',
        borderRadius: 8,
        border: active ? '1px solid rgba(204,0,0,0.55)' : '1px solid rgba(255,255,255,0.07)',
        background: active ? 'rgba(204,0,0,0.12)' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s ease',
        boxShadow: active ? '0 0 18px rgba(204,0,0,0.2)' : 'none',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
    >
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: active ? '#CC0000' : 'rgba(255,255,255,0.15)',
        boxShadow: active ? '0 0 8px #CC0000' : 'none',
        transition: 'all 0.2s',
      }} />
      <span style={{
        fontFamily: 'Helvetica Neue, sans-serif',
        fontSize: 11,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontWeight: active ? 600 : 400,
        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
        transition: 'color 0.2s',
      }}>
        {label}
      </span>
      {sublabel && (
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 8,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
        }}>
          {sublabel}
        </span>
      )}
    </button>
  );
}

// ── Widget Toggle Row ─────────────────────────────────────────────────────────

function WidgetRow({ icon: Icon, label, enabled, onChange, last }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Icon
          size={15}
          style={{
            color: enabled ? '#CC0000' : 'rgba(255,255,255,0.2)',
            transition: 'color 0.25s',
            flexShrink: 0,
          }}
        />
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 12,
          letterSpacing: '0.06em',
          color: enabled ? '#fff' : 'rgba(255,255,255,0.4)',
          transition: 'color 0.2s',
        }}>
          {label}
        </span>
      </div>

      {/* Pill toggle */}
      <button
        onClick={() => onChange(!enabled)}
        style={{
          width: 44, height: 24, borderRadius: 12,
          border: 'none', cursor: 'pointer',
          background: enabled ? '#CC0000' : 'rgba(255,255,255,0.1)',
          position: 'relative',
          transition: 'background 0.25s ease',
          boxShadow: enabled ? '0 0 12px rgba(204,0,0,0.5)' : 'none',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: enabled ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.25s ease',
        }} />
      </button>
    </div>
  );
}

// ── Gauge Scale Slider ────────────────────────────────────────────────────────

function GaugeScaleSlider({ value, onChange }) {
  const min = 75, max = 125;
  const pct = ((value - min) / (max - min)) * 100;
  const trackFill = '#CC0000';

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 12,
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.65)',
        }}>
          Gauge Scale / Size
        </span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 18,
          fontWeight: 700,
          color: trackFill,
        }}>
          {value}%
        </span>
      </div>

      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 4,
          borderRadius: 2, background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', left: 0,
          width: `${pct}%`, height: 4, borderRadius: 2,
          background: `linear-gradient(to right, rgba(204,0,0,0.4), ${trackFill})`,
          transition: 'width 0.08s ease',
          boxShadow: `0 0 8px ${trackFill}55`,
        }} />
        <input
          type="range" min={min} max={max} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', margin: 0,
          }}
        />
        <div style={{
          position: 'absolute',
          left: `calc(${pct}% - 8px)`,
          width: 16, height: 16, borderRadius: '50%',
          background: trackFill,
          boxShadow: `0 0 10px ${trackFill}`,
          pointerEvents: 'none',
          transition: 'left 0.08s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={minMaxLabel}>75%</span>
        <span style={minMaxLabel}>125%</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const PRESETS = [
  { id: 'street',     label: 'Street Mode',  sublabel: 'Full HUD' },
  { id: 'track',      label: 'Track Mode',   sublabel: 'Performance' },
  { id: 'minimalist', label: 'Minimalist',   sublabel: 'Clean View' },
];

const WIDGETS = [
  { id: 'rpm',         label: 'RPM Gauge',             icon: Gauge },
  { id: 'speed',       label: 'Speedometer',           icon: TrendingUp },
  { id: 'gear',        label: 'Gear Indicator',        icon: Hash },
  { id: 'shiftlights', label: 'Shift Lights',          icon: Lightbulb },
  { id: 'turnsignals', label: 'Turn Signals',          icon: Zap },
  { id: 'diagnostics', label: 'Mini-Diagnostics Overlay', icon: Activity },
];

export default function DashBuilderTab() {
  const [preset, setPreset] = useState('street');
  const [widgets, setWidgets] = useState({
    rpm: true, speed: true, gear: true,
    shiftlights: true, turnsignals: true, diagnostics: false,
  });
  const [gaugeScale, setGaugeScale] = useState(100);

  const toggleWidget = (id) => setWidgets(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ maxWidth: 600 }}>

      {/* ── Layout Presets ── */}
      <div style={SECTION_LABEL}>Layout Presets</div>
      <div style={{ ...CARD, padding: '20px' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {PRESETS.map(p => (
            <PresetBtn
              key={p.id}
              label={p.label}
              sublabel={p.sublabel}
              active={preset === p.id}
              onClick={() => setPreset(p.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Widget Toggles ── */}
      <div style={{ ...SECTION_LABEL, marginTop: 8 }}>Widget Visibility</div>
      <div style={{ ...CARD }}>
        {WIDGETS.map((w, i) => (
          <WidgetRow
            key={w.id}
            icon={w.icon}
            label={w.label}
            enabled={widgets[w.id]}
            onChange={() => toggleWidget(w.id)}
            last={i === WIDGETS.length - 1}
          />
        ))}
      </div>

      {/* ── Customization ── */}
      <div style={{ ...SECTION_LABEL, marginTop: 8 }}>Customization</div>
      <div style={CARD}>
        <GaugeScaleSlider value={gaugeScale} onChange={setGaugeScale} />
      </div>

      {/* Footer note */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 9,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 3,
          padding: '4px 10px',
        }}>
          Values saved locally — LayoutContext sync coming in Step 6
        </span>
      </div>
    </div>
  );
}
