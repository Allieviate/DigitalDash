import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, Trash2, Usb, Bluetooth, RefreshCw, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function SavedDevicesTab() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dhu/devices`);
      const data = await res.json();
      setDevices(data.devices || []);
    } catch {
      setDevices([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleDelete = async (device) => {
    const key = device.device_model || device.serial;
    setDeleting(key);
    try {
      await fetch(`${API_URL}/api/dhu/device-preferences/${encodeURIComponent(key)}`, { method: 'DELETE' });
      setDevices(prev => prev.filter(d => (d.device_model || d.serial) !== key));
    } catch {
      // Delete failed
    }
    setDeleting(null);
  };

  const handleToggleSkipPrompt = async (device) => {
    const updated = { ...device, skip_prompt: !device.skip_prompt };
    try {
      await fetch(`${API_URL}/api/dhu/device-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const key = device.device_model || device.serial;
      setDevices(prev => prev.map(d =>
        (d.device_model || d.serial) === key ? { ...d, skip_prompt: updated.skip_prompt } : d
      ));
    } catch {
      // Update failed
    }
  };

  const handleChangeConnectionType = async (device, newType) => {
    try {
      await fetch(`${API_URL}/api/dhu/device-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...device, connection_type: newType }),
      });
      const key = device.device_model || device.serial;
      setDevices(prev => prev.map(d =>
        (d.device_model || d.serial) === key ? { ...d, connection_type: newType } : d
      ));
    } catch {
      // Update failed
    }
  };

  return (
    <div data-testid="saved-devices-tab" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 9,
            letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)', marginBottom: 4,
          }}>
            Remembered Devices
          </div>
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
          }}>
            Devices that auto-launch Android Auto when connected
          </div>
        </div>
        <button
          onClick={fetchDevices}
          data-testid="refresh-devices-btn"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, padding: '6px 12px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        >
          <RefreshCw size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <span style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 9,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
          }}>Refresh</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 40, gap: 10,
        }}>
          <Loader2 size={16} style={{ color: 'rgba(255,255,255,0.3)', animation: 'spin 1s linear infinite' }} />
          <span style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 10,
            color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>Loading devices...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && devices.length === 0 && (
        <div data-testid="no-devices-message" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: 48, gap: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 10,
        }}>
          <Smartphone size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 12,
            color: 'rgba(255,255,255,0.35)', textAlign: 'center',
          }}>
            No saved devices yet
          </div>
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 10,
            color: 'rgba(255,255,255,0.2)', textAlign: 'center', maxWidth: 280,
          }}>
            Connect your phone via USB and check "Remember for this device" when prompted
          </div>
        </div>
      )}

      {/* Device cards */}
      {!loading && devices.map(device => {
        const key = device.device_model || device.serial;
        return (
          <DeviceCard
            key={key}
            device={device}
            deleting={deleting === key}
            onDelete={() => handleDelete(device)}
            onToggleSkipPrompt={() => handleToggleSkipPrompt(device)}
            onChangeConnectionType={(type) => handleChangeConnectionType(device, type)}
          />
        );
      })}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DeviceCard({ device, deleting, onDelete, onToggleSkipPrompt, onChangeConnectionType }) {
  const deviceKey = device.device_model || device.serial;

  return (
    <div
      data-testid={`device-card-${deviceKey}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Top row: device info + delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(37,99,235,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Smartphone size={16} style={{ color: '#60A5FA' }} />
          </div>
          <div>
            <div style={{
              fontFamily: 'Helvetica Neue, sans-serif', fontSize: 13,
              fontWeight: 600, color: '#fff',
            }}>
              {device.name || 'Unknown Device'}
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: 10,
              color: 'rgba(255,255,255,0.25)', marginTop: 2,
            }}>
              {device.device_model || device.serial}
            </div>
          </div>
        </div>

        <button
          onClick={onDelete}
          disabled={deleting}
          data-testid={`delete-device-${deviceKey}`}
          style={{
            background: deleting ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6, padding: '6px 10px',
            cursor: deleting ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s',
            opacity: deleting ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
          onMouseLeave={e => { if (!deleting) e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
        >
          <Trash2 size={11} style={{ color: '#EF4444' }} />
          <span style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 8,
            letterSpacing: '0.2em', textTransform: 'uppercase', color: '#EF4444',
          }}>
            {deleting ? 'Removing...' : 'Remove'}
          </span>
        </button>
      </div>

      {/* Connection type */}
      <div>
        <div style={{
          fontFamily: 'Helvetica Neue, sans-serif', fontSize: 8,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)', marginBottom: 6,
        }}>
          Connection
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 3, maxWidth: 200 }}>
          <MiniToggle
            icon={<Usb size={10} />}
            label="USB"
            active={device.connection_type === 'usb'}
            onClick={() => onChangeConnectionType('usb')}
            testId={`conn-usb-${deviceKey}`}
          />
          <MiniToggle
            icon={<Bluetooth size={10} />}
            label="BT"
            active={device.connection_type === 'bluetooth'}
            onClick={() => onChangeConnectionType('bluetooth')}
            testId={`conn-bt-${deviceKey}`}
          />
        </div>
      </div>

      {/* Auto-launch toggle */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.15)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div>
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 11,
            color: 'rgba(255,255,255,0.7)',
          }}>
            Auto-launch without prompt
          </div>
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif', fontSize: 9,
            color: 'rgba(255,255,255,0.25)', marginTop: 2,
          }}>
            {device.skip_prompt
              ? 'Launches Android Auto automatically when connected'
              : 'Shows preferences prompt each time this device connects'}
          </div>
        </div>
        <input
          type="checkbox"
          checked={device.skip_prompt || false}
          onChange={onToggleSkipPrompt}
          data-testid={`skip-prompt-${deviceKey}`}
          style={{ width: 18, height: 18, accentColor: '#2563EB', cursor: 'pointer' }}
        />
      </div>

      {/* Last updated */}
      {device.updated_at && (
        <div style={{
          fontFamily: 'Helvetica Neue, sans-serif', fontSize: 9,
          color: 'rgba(255,255,255,0.15)', textAlign: 'right',
        }}>
          Last updated: {new Date(device.updated_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function MiniToggle({ icon, label, active, onClick, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        padding: '5px 8px',
        borderRadius: 4,
        border: 'none',
        background: active ? 'rgba(37,99,235,0.2)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
    >
      <span style={{ color: active ? '#60A5FA' : 'rgba(255,255,255,0.25)' }}>{icon}</span>
      <span style={{
        fontFamily: 'Helvetica Neue, sans-serif', fontSize: 8,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: active ? '#60A5FA' : 'rgba(255,255,255,0.3)',
      }}>{label}</span>
    </button>
  );
}
