import React, { useState, useCallback } from 'react';
import { Loader2, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function AndroidAutoPanel({ isActive = false, onModeChange }) {
  const [launching, setLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLaunch = useCallback(async () => {
    setLaunching(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/dhu/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.status === 'running') {
        if (onModeChange) onModeChange('active');
      } else if (data.status === 'error') {
        setErrorMsg(data.message);
      }
    } catch {
      setErrorMsg('Failed to connect to backend');
    }
    setLaunching(false);
  }, [onModeChange]);

  const handleStop = useCallback(async () => {
    setErrorMsg(null);
    try {
      await fetch(`${API_URL}/api/dhu/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (onModeChange) onModeChange(null);
    } catch {
      setErrorMsg('Failed to stop Android Auto');
    }
  }, [onModeChange]);

  // Active: OpenAuto is running
  if (isActive) {
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
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {/* Stop button overlay */}
        <div
          style={{
            position: 'absolute',
            top: 8, right: 8,
            zIndex: 10,
            opacity: 0.6,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
        >
          <button
            onClick={handleStop}
            data-testid="stop-projection-btn"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6, padding: '4px 10px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <X size={10} style={{ color: '#EF4444' }} />
            <span style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#EF4444',
            }}>Disconnect</span>
          </button>
        </div>

        {/* Black canvas for OpenAuto overlay */}
        <div style={{ flex: 1, background: '#000000' }} />
      </div>
    );
  }

  // Inactive: Phone connected but AA not launched
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
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      {/* Android Auto Logo */}
      <svg width="48" height="48" viewBox="-0.72 -0.72 25.44 25.44" fill="none" xmlns="http://www.w3.org/2000/svg" data-testid="aa-logo">
        <path
          d="M12 0c-.6 0-1.11.32-1.39.8L.48 18.4a1.6 1.6 0 0 0 1.39 2.4h2l7.7-13.58.43-.77 8.13 14.35h2a1.6 1.6 0 0 0 1.39-2.4L13.39.8A1.6 1.6 0 0 0 12 0zm0 7.47l-9.07 16 .54.53L12 20.8l8.53 3.2.54-.53z"
          fill="#2563EB"
        />
      </svg>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.75)',
        }}>Phone Connected</span>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
        }}>Ready to launch Android Auto</span>
      </div>

      {/* Launch button */}
      <button
        onClick={handleLaunch}
        disabled={launching}
        data-testid="launch-projection-btn"
        style={{
          padding: '9px 20px', borderRadius: 6,
          border: '1px solid rgba(37,99,235,0.35)',
          background: launching ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)',
          cursor: launching ? 'wait' : 'pointer',
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase',
          color: '#2563EB', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', gap: 8,
          opacity: launching ? 0.7 : 1,
        }}
        onMouseEnter={e => {
          if (!launching) { e.currentTarget.style.background = 'rgba(37,99,235,0.2)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.7)'; }
        }}
        onMouseLeave={e => {
          if (!launching) { e.currentTarget.style.background = 'rgba(37,99,235,0.08)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.35)'; }
        }}
      >
        {launching && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
        {launching ? 'Launching...' : 'Launch Android Auto'}
      </button>

      {errorMsg && (
        <div style={{
          padding: '6px 12px',
          background: 'rgba(220, 38, 38, 0.12)',
          border: '1px solid rgba(220, 38, 38, 0.25)',
          borderRadius: 6,
        }}>
          <span style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 9, letterSpacing: '0.05em', color: '#FCA5A5',
          }}>{errorMsg}</span>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
