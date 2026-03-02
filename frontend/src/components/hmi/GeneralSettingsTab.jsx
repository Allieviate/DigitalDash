import React, { useState } from 'react';
import { Sun, Moon, RefreshCw } from 'lucide-react';

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
  padding: '8px 28px',
  marginBottom: 16,
};

const minMaxLabel = {
  fontFamily: 'Helvetica Neue, sans-serif',
  fontSize: 8,
  letterSpacing: '0.2em',
  color: 'rgba(255,255,255,0.15)',
};

// ── Pill Toggle ───────────────────────────────────────────────────────────────

function PillToggle({ enabled, onChange, accentColor = '#CC0000', glowColor = 'rgba(204,0,0,0.5)' }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        border: 'none', cursor: 'pointer',
        background: enabled ? accentColor : 'rgba(255,255,255,0.1)',
        position: 'relative',
        transition: 'background 0.25s ease',
        boxShadow: enabled ? `0 0 12px ${glowColor}` : 'none',
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
  );
}

// ── Toggle Row ────────────────────────────────────────────────────────────────

function ToggleRow({ icon: Icon, label, sublabel, enabled, onChange, accentColor = '#CC0000', glowColor, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 0',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Icon size={16} style={{ color: enabled ? accentColor : 'rgba(255,255,255,0.2)', transition: 'color 0.25s', flexShrink: 0 }} />
        <div>
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 12,
            letterSpacing: '0.06em',
            color: enabled ? '#fff' : 'rgba(255,255,255,0.45)',
            transition: 'color 0.2s',
          }}>
            {label}
          </div>
          {sublabel && (
            <div style={{
              fontFamily: 'Helvetica Neue, sans-serif', fontSize: 9,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: enabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
              marginTop: 3, transition: 'color 0.2s',
            }}>
              {sublabel}
            </div>
          )}
        </div>
      </div>
      <PillToggle enabled={enabled} onChange={onChange} accentColor={accentColor} glowColor={glowColor} />
    </div>
  );
}

// ── Brightness Slider ─────────────────────────────────────────────────────────

function BrightnessSlider({ value, onChange }) {
  const pct = value;
  const trackFill = '#F59E0B';

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sun size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'Helvetica Neue, sans-serif', fontSize: 12, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.65)' }}>
            Global Brightness
          </span>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: trackFill, minWidth: 44, textAlign: 'right' }}>
          {value}%
        </span>
      </div>

      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{
          position: 'absolute', left: 0, width: `${pct}%`, height: 4, borderRadius: 2,
          background: `linear-gradient(to right, rgba(245,158,11,0.35), ${trackFill})`,
          transition: 'width 0.08s ease',
          boxShadow: `0 0 8px ${trackFill}66`,
        }} />
        <input
          type="range" min={0} max={100} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
        <div style={{
          position: 'absolute', left: `calc(${pct}% - 8px)`,
          width: 16, height: 16, borderRadius: '50%',
          background: trackFill, boxShadow: `0 0 10px ${trackFill}`,
          pointerEvents: 'none', transition: 'left 0.08s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={minMaxLabel}>0%</span>
        <span style={minMaxLabel}>100%</span>
      </div>
    </div>
  );
}

// ── Units Segmented Control ───────────────────────────────────────────────────

function UnitsToggle({ value, onChange }) {
  const options = [
    { id: 'imperial', label: 'Imperial', sub: 'MPH · °F · PSI' },
    { id: 'metric',   label: 'Metric',   sub: 'KPH · °C · BAR' },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ fontFamily: 'Helvetica Neue, sans-serif', fontSize: 12, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>
        Measurement Units
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {options.map(opt => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 8,
                border: active ? '1px solid rgba(204,0,0,0.55)' : '1px solid rgba(255,255,255,0.07)',
                background: active ? 'rgba(204,0,0,0.12)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s ease',
                boxShadow: active ? '0 0 14px rgba(204,0,0,0.18)' : 'none',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            >
              <div style={{
                fontFamily: 'Helvetica Neue, sans-serif', fontSize: 11,
                letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'color 0.2s',
              }}>
                {opt.label}
              </div>
              <div style={{
                fontFamily: 'Helvetica Neue, sans-serif', fontSize: 8,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
                marginTop: 4,
              }}>
                {opt.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GeneralSettingsTab() {
  const [brightness, setBrightness] = useState(80);
  const [autoDim, setAutoDim]       = useState(false);
  const [units, setUnits]           = useState('imperial');
  const [rebooting, setRebooting]   = useState(false);

  const handleReboot = () => {
    setRebooting(true);
    setTimeout(() => setRebooting(false), 3000);
  };

  return (
    <div style={{ maxWidth: 600 }}>

      {/* ── Display & Appearance ── */}
      <div style={SECTION_LABEL}>Display &amp; Appearance</div>
      <div style={CARD}>
        <BrightnessSlider value={brightness} onChange={setBrightness} />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <ToggleRow
            icon={Moon}
            label="Auto-Dim at Night"
            sublabel="Headlight Sync"
            enabled={autoDim}
            onChange={setAutoDim}
            accentColor="#7C3AED"
            glowColor="rgba(124,58,237,0.5)"
            last
          />
        </div>
      </div>

      {/* ── Localization ── */}
      <div style={{ ...SECTION_LABEL, marginTop: 8 }}>Localization</div>
      <div style={CARD}>
        <UnitsToggle value={units} onChange={setUnits} />
      </div>

      {/* ── System Power ── */}
      <div style={{ ...SECTION_LABEL, marginTop: 8 }}>System Power</div>
      <div style={{ ...CARD, padding: '20px 28px' }}>
        <button
          onClick={handleReboot}
          disabled={rebooting}
          style={{
            width: '100%', padding: '16px 24px', borderRadius: 8,
            border: rebooting ? '1px solid rgba(251,146,60,0.25)' : '1px solid rgba(251,146,60,0.4)',
            background: rebooting ? 'rgba(251,146,60,0.05)' : 'rgba(251,146,60,0.1)',
            cursor: rebooting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            transition: 'all 0.2s ease',
            boxShadow: rebooting ? 'none' : '0 0 16px rgba(251,146,60,0.15)',
            opacity: rebooting ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!rebooting) e.currentTarget.style.background = 'rgba(251,146,60,0.18)'; }}
          onMouseLeave={e => { if (!rebooting) e.currentTarget.style.background = 'rgba(251,146,60,0.1)'; }}
        >
          <RefreshCw
            size={16}
            style={{
              color: '#FB923C',
              animation: rebooting ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 11,
            letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 500,
            color: rebooting ? 'rgba(251,146,60,0.5)' : '#FB923C',
            transition: 'color 0.2s',
          }}>
            {rebooting ? 'Rebooting System...' : 'Reboot System'}
          </span>
        </button>

        <div style={{
          marginTop: 12, fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.15)', textAlign: 'center',
        }}>
          This will restart the HMI process
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Footer note */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif', fontSize: 9,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 3, padding: '4px 10px',
        }}>
          Values saved locally — GlobalContext sync coming in Step 7
        </span>
      </div>
    </div>
  );
}
