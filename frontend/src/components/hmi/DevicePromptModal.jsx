import React, { useState } from 'react';
import { Smartphone, Usb, Bluetooth, Monitor, Maximize2, Minimize2, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function DevicePromptModal({ device, onConfirm, onDismiss }) {
  const [connectionType, setConnectionType] = useState('usb');
  const [mode, setMode] = useState('embedded');
  const [skipPrompt, setSkipPrompt] = useState(false);

  if (!device) return null;

  const handleConfirm = async () => {
    // Save device preferences
    try {
      await fetch(`${API_URL}/api/dhu/device-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial: device.serial,
          name: device.name,
          connection_type: connectionType,
          aa_mode: mode,
          auto_launch: true,
          skip_prompt: skipPrompt,
        }),
      });
    } catch {
      // Save failed — still launch
    }

    onConfirm({ connectionType, mode });
  };

  return (
    <div
      data-testid="device-prompt-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        data-testid="device-prompt-modal"
        style={{
          background: '#1c1c1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 32,
          width: 420,
          maxWidth: '90vw',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(37,99,235,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Smartphone size={20} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <div style={{
                fontFamily: 'Helvetica Neue, sans-serif',
                fontSize: 14, fontWeight: 600, color: '#fff',
              }}>
                Device Connected
              </div>
              <div style={{
                fontFamily: 'Helvetica Neue, sans-serif',
                fontSize: 11, color: 'rgba(255,255,255,0.4)',
                marginTop: 2,
              }}>
                {device.name || 'Android Device'}
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            data-testid="device-prompt-dismiss"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 4, borderRadius: 6,
            }}
          >
            <X size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </button>
        </div>

        {/* Connection Type */}
        <div>
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)', marginBottom: 8,
          }}>
            Connection Type
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <OptionButton
              icon={<Usb size={14} />}
              label="Wired (USB)"
              selected={connectionType === 'usb'}
              onClick={() => setConnectionType('usb')}
              testId="conn-type-usb"
            />
            <OptionButton
              icon={<Bluetooth size={14} />}
              label="Bluetooth"
              selected={connectionType === 'bluetooth'}
              onClick={() => setConnectionType('bluetooth')}
              testId="conn-type-bluetooth"
            />
          </div>
        </div>

        {/* Display Mode */}
        <div>
          <div style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)', marginBottom: 8,
          }}>
            Display Mode
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <OptionButton
              icon={<Minimize2 size={14} />}
              label="Embedded"
              desc="Between gauges"
              selected={mode === 'embedded'}
              onClick={() => setMode('embedded')}
              testId="display-mode-embedded"
            />
            <OptionButton
              icon={<Maximize2 size={14} />}
              label="Fullscreen"
              desc="Takes over screen"
              selected={mode === 'fullscreen'}
              onClick={() => setMode('fullscreen')}
              testId="display-mode-fullscreen"
            />
          </div>
        </div>

        {/* Remember checkbox */}
        <label
          data-testid="skip-prompt-checkbox"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <input
            type="checkbox"
            checked={skipPrompt}
            onChange={(e) => setSkipPrompt(e.target.checked)}
            style={{
              width: 16, height: 16, accentColor: '#2563EB',
              cursor: 'pointer',
            }}
          />
          <div>
            <div style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 11, color: 'rgba(255,255,255,0.7)',
            }}>
              Remember for this device
            </div>
            <div style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 9, color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
            }}>
              Skip this prompt next time "{device.name || 'this device'}" connects
            </div>
          </div>
        </label>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          data-testid="device-prompt-confirm"
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 8,
            border: 'none',
            background: '#2563EB',
            cursor: 'pointer',
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#fff',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}
        >
          Connect Android Auto
        </button>
      </div>
    </div>
  );
}

function OptionButton({ icon, label, desc, selected, onClick, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 14px',
        borderRadius: 8,
        border: selected ? '1px solid rgba(37,99,235,0.5)' : '1px solid rgba(255,255,255,0.08)',
        background: selected ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ color: selected ? '#60A5FA' : 'rgba(255,255,255,0.3)' }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'Helvetica Neue, sans-serif',
        fontSize: 10, fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: selected ? '#60A5FA' : 'rgba(255,255,255,0.4)',
      }}>
        {label}
      </div>
      {desc && (
        <div style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 8, color: 'rgba(255,255,255,0.2)',
        }}>
          {desc}
        </div>
      )}
    </button>
  );
}
