import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, Loader2, X, Monitor } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function AndroidAutoPanel({ isActive: isActiveProp = false }) {
  const [dhuStatus, setDhuStatus] = useState('stopped'); // stopped | launching | running | stopping | error
  const [errorMsg, setErrorMsg] = useState(null);

  const isProjectionActive = isActiveProp || dhuStatus === 'running';

  // Poll DHU status every 3 seconds
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
        // Backend unreachable — don't override launching/stopping states
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [dhuStatus]);

  const handleLaunch = useCallback(async () => {
    setDhuStatus('launching');
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/dhu/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: 640,
          y: 160,
          width: 640,
          height: 480,
          borderless: true,
          alwaysOnTop: true,
        }),
      });
      const data = await res.json();

      if (data.status === 'running') {
        setDhuStatus('running');
      } else if (data.status === 'error') {
        setDhuStatus('error');
        setErrorMsg(data.message);
      }
    } catch (err) {
      setDhuStatus('error');
      setErrorMsg('Failed to connect to backend');
    }
  }, []);

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
    } catch {
      setDhuStatus('error');
      setErrorMsg('Failed to stop projection');
    }
  }, []);

  // Active state — pure black canvas hole for OpenAuto window overlay
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
        {/* Thin status bar at top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
          zIndex: 10,
          opacity: 0.7,
          transition: 'opacity 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Monitor size={10} style={{ color: '#60A5FA' }} />
            <span style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 8,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#60A5FA',
            }}>
              Projection Active
            </span>
          </div>
          <button
            onClick={handleStop}
            data-testid="stop-projection-btn"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 4,
              padding: '3px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <X size={8} style={{ color: '#EF4444' }} />
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

        {/* The black canvas — OpenAuto renders here via X11 overlay */}
        <div style={{ flex: 1, background: '#000000' }} />
      </div>
    );
  }

  const isLoading = dhuStatus === 'launching' || dhuStatus === 'stopping';

  // Inactive state — sleek placeholder
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
        gap: 16,
        padding: 32,
        boxSizing: 'border-box',
      }}
    >
      {/* Icon with glow */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute',
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }} />
        <Smartphone
          size={36}
          style={{
            color: '#2563EB',
            filter: 'drop-shadow(0 0 10px rgba(37,99,235,0.7))',
            position: 'relative',
            zIndex: 1,
          }}
        />
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.75)',
        }}>
          Android Auto / CarPlay
        </span>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 10,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
        }}>
          Connect device via USB or Bluetooth
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.08)' }} />

      {/* Launch button */}
      <button
        onClick={handleLaunch}
        disabled={isLoading}
        data-testid="launch-projection-btn"
        style={{
          padding: '10px 22px',
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

      {/* Error message */}
      {dhuStatus === 'error' && errorMsg && (
        <div style={{
          padding: '8px 14px',
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

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
