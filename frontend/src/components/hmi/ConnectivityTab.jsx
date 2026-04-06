import React, { useState, useEffect } from 'react';
import { Wifi, Bluetooth, Volume2, Smartphone, Loader2 } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// ── Shared style constants ────────────────────────────────────────────────────

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

// ── Pill Toggle ──────────────────────────────────────────────────────────────

function PillToggle({ enabled, onChange, accentColor = '#CC0000', glowColor = 'rgba(204,0,0,0.5)' }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        background: enabled ? accentColor : 'rgba(255,255,255,0.1)',
        position: 'relative',
        transition: 'background 0.25s ease',
        boxShadow: enabled ? `0 0 12px ${glowColor}` : 'none',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3,
        left: enabled ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s ease',
      }} />
    </button>
  );
}

// ── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({ icon: Icon, label, sublabel, enabled, onChange, accentColor, glowColor, last }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 0',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Icon
          size={16}
          style={{
            color: enabled ? (accentColor || '#CC0000') : 'rgba(255,255,255,0.2)',
            transition: 'color 0.25s',
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 12,
            letterSpacing: '0.06em',
            color: enabled ? '#fff' : 'rgba(255,255,255,0.45)',
            transition: 'color 0.2s',
          }}>
            {label}
          </div>
          {sublabel && (
            <div style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 9,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: enabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
              marginTop: 3,
              transition: 'color 0.2s',
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

// ── Volume Slider ─────────────────────────────────────────────────────────────

function VolumeSlider({ value, onChange }) {
  const pct = value;
  const trackFill = '#2563EB';

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Volume2
            size={16}
            style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}
          />
          <span style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 12,
            letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.65)',
          }}>
            Master Volume
          </span>
        </div>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 18,
          fontWeight: 700,
          color: trackFill,
          minWidth: 36,
          textAlign: 'right',
        }}>
          {value}
        </span>
      </div>

      {/* Custom slider */}
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 4,
          borderRadius: 2, background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', left: 0,
          width: `${pct}%`, height: 4,
          borderRadius: 2,
          background: `linear-gradient(to right, rgba(37,99,235,0.4), ${trackFill})`,
          transition: 'width 0.08s ease',
          boxShadow: `0 0 8px ${trackFill}66`,
        }} />
        <input
          type="range" min={0} max={100} step={1} value={value}
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
        <span style={minMaxLabel}>0</span>
        <span style={minMaxLabel}>100</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ConnectivityTab() {
  const { settings, updateSetting } = useSettings();
  const wifiEnabled = settings.wifi_enabled ?? true;
  const bluetoothEnabled = settings.bluetooth_enabled ?? true;
  const volume = settings.chime_volume ?? 72;
  const setWifiEnabled = (val) => updateSetting('wifi_enabled', val);
  const setBluetoothEnabled = (val) => updateSetting('bluetooth_enabled', val);
  const setVolume = (val) => updateSetting('chime_volume', val);
  const [projectionLaunched, setProjectionLaunched] = useState(false);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [projectionError, setProjectionError] = useState(null);

  // Check OpenAuto status on mount
  useEffect(() => {
    checkDHUStatus();
  }, []);

  const checkDHUStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dhu/status`);
      const data = await response.json();
      setProjectionLaunched(data.status === 'running');
    } catch (err) {
      console.error('Failed to check DHU status:', err);
    }
  };

  const handleProjectionToggle = async () => {
    setProjectionLoading(true);
    setProjectionError(null);

    try {
      if (projectionLaunched) {
        // Stop OpenAuto
        const response = await fetch(`${API_URL}/api/dhu/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.status === 'stopped' || data.status === 'error') {
          setProjectionLaunched(false);
        }
      } else {
        // Start OpenAuto
        const response = await fetch(`${API_URL}/api/dhu/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.status === 'running') {
          setProjectionLaunched(true);
        } else if (data.status === 'error') {
          setProjectionError(data.message);
        }
      }
    } catch (err) {
      console.error('Failed to toggle projection:', err);
      setProjectionError('Failed to connect to backend');
    } finally {
      setProjectionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>

      {/* ── Network & Devices ── */}
      <div style={SECTION_LABEL}>Network &amp; Devices</div>
      <div style={CARD}>
        <ToggleRow
          icon={Wifi}
          label="Wi-Fi"
          sublabel={wifiEnabled ? 'Connected to Garage_Network' : 'Disconnected'}
          enabled={wifiEnabled}
          onChange={setWifiEnabled}
          accentColor="#2563EB"
          glowColor="rgba(37,99,235,0.5)"
        />
        <ToggleRow
          icon={Bluetooth}
          label="Bluetooth"
          sublabel={bluetoothEnabled ? "Paired: Fran's Pixel 8" : 'Off'}
          enabled={bluetoothEnabled}
          onChange={setBluetoothEnabled}
          accentColor="#7C3AED"
          glowColor="rgba(124,58,237,0.5)"
          last
        />
      </div>

      {/* ── Media & Projection ── */}
      <div style={{ ...SECTION_LABEL, marginTop: 8 }}>Media &amp; Projection</div>
      <div style={{ ...CARD, padding: '8px 28px 20px' }}>
        <VolumeSlider value={volume} onChange={setVolume} />

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, marginTop: 4 }}>
          <button
            onClick={handleProjectionToggle}
            disabled={projectionLoading}
            data-testid="projection-toggle-btn"
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 8,
              border: projectionLaunched
                ? '1px solid rgba(37,99,235,0.6)'
                : '1px solid rgba(37,99,235,0.25)',
              background: projectionLaunched
                ? 'rgba(37,99,235,0.25)'
                : 'rgba(37,99,235,0.08)',
              cursor: projectionLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              transition: 'all 0.2s ease',
              boxShadow: projectionLaunched ? '0 0 20px rgba(37,99,235,0.35)' : 'none',
              opacity: projectionLoading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!projectionLaunched && !projectionLoading) e.currentTarget.style.background = 'rgba(37,99,235,0.15)';
            }}
            onMouseLeave={e => {
              if (!projectionLaunched && !projectionLoading) e.currentTarget.style.background = 'rgba(37,99,235,0.08)';
            }}
          >
            {projectionLoading ? (
              <Loader2 size={16} style={{ color: '#2563EB', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Smartphone size={16} style={{ color: projectionLaunched ? '#60A5FA' : '#2563EB' }} />
            )}
            <span style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 500,
              color: projectionLaunched ? '#93C5FD' : '#2563EB',
              transition: 'color 0.2s',
            }}>
              {projectionLoading 
                ? (projectionLaunched ? 'Stopping...' : 'Launching...') 
                : (projectionLaunched ? 'Projection Active — Tap to Disconnect' : 'Launch Android Auto / CarPlay')}
            </span>
          </button>
          
          {/* Error message */}
          {projectionError && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: 6,
              color: '#FCA5A5',
              fontSize: 11,
              fontFamily: 'Helvetica Neue, sans-serif',
              letterSpacing: '0.03em',
            }}>
              {projectionError}
            </div>
          )}
        </div>
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
          OpenAuto launches as overlay — use wmctrl for window control
        </span>
      </div>
      
      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
