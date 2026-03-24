import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, Loader2, X, Monitor, Maximize2, Minimize2 } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function AndroidAutoPanel({ isActive: isActiveProp = false, onModeChange }) {
  const { settings, updateSetting } = useSettings();
  const aaMode = settings.aa_mode ?? 'embedded'; // 'embedded' or 'fullscreen'
  const [dhuStatus, setDhuStatus] = useState('stopped');
  const [errorMsg, setErrorMsg] = useState(null);

  const isProjectionActive = isActiveProp || dhuStatus === 'running';

  // Poll DHU status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dhu/status`);
        const data = await res.json();
        if (data.status === 'running' && dhuStatus !== 'stopping') {
          setDhuStatus('running');
        } else if (data.status === 'stopped' && dhuStatus !== 'launching') {
          setDhuStatus('stopped');
        }
      } catch {
        // Backend unreachable
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [dhuStatus]);

  const handleLaunch = useCallback(async (mode) => {
    const launchMode = mode || aaMode;
    setDhuStatus('launching');
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/dhu/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: launchMode,
          borderless: true,
          alwaysOnTop: true,
        }),
      });
      const data = await res.json();
      if (data.status === 'running') {
        setDhuStatus('running');
        if (onModeChange) onModeChange(launchMode);
      } else if (data.status === 'error') {
        setDhuStatus('error');
        setErrorMsg(data.message);
      }
    } catch (err) {
      setDhuStatus('error');
      setErrorMsg('Failed to connect to backend');
    }
  }, [aaMode, onModeChange]);

  const handleStop = useCallback(async () => {
    setDhuStatus('stopping');
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/dhu/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setDhuStatus(data.status === 'stopped' ? 'stopped' : 'error');
      if (onModeChange) onModeChange(null);
    } catch {
      setDhuStatus('error');
      setErrorMsg('Failed to stop projection');
    }
  }, [onModeChange]);

  const handleToggleMode = useCallback(async () => {
    const newMode = aaMode === 'embedded' ? 'fullscreen' : 'embedded';
    updateSetting('aa_mode', newMode);
    if (onModeChange) onModeChange(dhuStatus === 'running' ? newMode : null);

    // If currently running, resize the window live
    if (dhuStatus === 'running') {
      try {
        await fetch(`${API_URL}/api/dhu/resize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: newMode }),
        });
      } catch {
        // Resize failed — not critical
      }
    }
  }, [aaMode, dhuStatus, updateSetting, onModeChange]);

  // ─── Active state: projection running ───
  if (isProjectionActive) {
    return (
      <div
        data-testid="android-auto-active"
        style={{
          width: '100%',
          height: '100%',
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Top control bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
          zIndex: 10,
          opacity: 0.8,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Monitor size={11} style={{ color: '#60A5FA' }} />
            <span style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 9,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#60A5FA',
            }}>
              {aaMode === 'fullscreen' ? 'Fullscreen Projection' : 'Embedded Projection'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Mode toggle */}
            <button
              onClick={handleToggleMode}
              data-testid="toggle-aa-mode-btn"
              style={{
                background: 'rgba(96,165,250,0.12)',
                border: '1px solid rgba(96,165,250,0.25)',
                borderRadius: 4,
                padding: '3px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              title={aaMode === 'fullscreen' ? 'Switch to Embedded' : 'Switch to Fullscreen'}
            >
              {aaMode === 'fullscreen' ? (
                <Minimize2 size={9} style={{ color: '#60A5FA' }} />
              ) : (
                <Maximize2 size={9} style={{ color: '#60A5FA' }} />
              )}
              <span style={{
                fontFamily: 'Helvetica Neue, sans-serif',
                fontSize: 7,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#60A5FA',
              }}>
                {aaMode === 'fullscreen' ? 'Embedded' : 'Fullscreen'}
              </span>
            </button>

            {/* Disconnect */}
            <button
              onClick={handleStop}
              data-testid="stop-projection-btn"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 4,
                padding: '3px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <X size={9} style={{ color: '#EF4444' }} />
              <span style={{
                fontFamily: 'Helvetica Neue, sans-serif',
                fontSize: 7,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#EF4444',
              }}>
                Disconnect
              </span>
            </button>
          </div>
        </div>

        {/* Black canvas — OpenAuto renders here */}
        <div style={{ flex: 1, background: '#000000' }} />
      </div>
    );
  }

  const isLoading = dhuStatus === 'launching' || dhuStatus === 'stopping';

  // ─── Inactive state: sleek placeholder ───
  return (
    <div
      data-testid="android-auto-panel"
      style={{
        width: '100%',
        height: '100%',
        background: '#18181b',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      {/* Icon */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute',
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }} />
        <Smartphone
          size={32}
          style={{
            color: '#2563EB',
            filter: 'drop-shadow(0 0 10px rgba(37,99,235,0.7))',
            position: 'relative',
            zIndex: 1,
          }}
        />
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.75)',
        }}>
          Android Auto
        </span>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 9,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
        }}>
          Connect device via USB
        </span>
      </div>

      {/* Mode selector */}
      <div style={{
        display: 'flex',
        gap: 2,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 6,
        padding: 2,
      }}>
        {['embedded', 'fullscreen'].map((mode) => (
          <button
            key={mode}
            data-testid={`aa-mode-${mode}`}
            onClick={() => {
              updateSetting('aa_mode', mode);
            }}
            style={{
              padding: '5px 12px',
              borderRadius: 4,
              border: 'none',
              background: aaMode === mode ? 'rgba(37,99,235,0.2)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 8,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: aaMode === mode ? '#60A5FA' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {mode === 'embedded' ? <Minimize2 size={8} /> : <Maximize2 size={8} />}
            {mode}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 36, height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* Launch button */}
      <button
        onClick={() => handleLaunch()}
        disabled={isLoading}
        data-testid="launch-projection-btn"
        style={{
          padding: '9px 20px',
          borderRadius: 6,
          border: '1px solid rgba(37,99,235,0.35)',
          background: isLoading ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)',
          cursor: isLoading ? 'wait' : 'pointer',
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 9,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#2563EB',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: isLoading ? 0.7 : 1,
        }}
        onMouseEnter={e => {
          if (!isLoading) {
            e.currentTarget.style.background = 'rgba(37,99,235,0.2)';
            e.currentTarget.style.borderColor = 'rgba(37,99,235,0.7)';
          }
        }}
        onMouseLeave={e => {
          if (!isLoading) {
            e.currentTarget.style.background = 'rgba(37,99,235,0.08)';
            e.currentTarget.style.borderColor = 'rgba(37,99,235,0.35)';
          }
        }}
      >
        {isLoading && (
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
        )}
        {dhuStatus === 'launching' ? 'Launching...' : dhuStatus === 'stopping' ? 'Stopping...' : 'Launch Projection'}
      </button>

      {/* Error */}
      {dhuStatus === 'error' && errorMsg && (
        <div style={{
          padding: '6px 12px',
          background: 'rgba(220, 38, 38, 0.12)',
          border: '1px solid rgba(220, 38, 38, 0.25)',
          borderRadius: 6,
          maxWidth: '100%',
        }}>
          <span style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 9,
            letterSpacing: '0.05em',
            color: '#FCA5A5',
          }}>
            {errorMsg}
          </span>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
