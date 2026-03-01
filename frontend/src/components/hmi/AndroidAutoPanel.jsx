import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';

export default function AndroidAutoPanel({ isActive: isActiveProp = false }) {
  const [forceActive, setForceActive] = useState(false);
  const isActive = isActiveProp || forceActive;

  // State 2: Active — pure black canvas hole for OpenAuto window
  if (isActive) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#000000',
        display: 'block',
      }} />
    );
  }

  // State 1: Inactive — sleek placeholder
  return (
    <div style={{
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
    }}>

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
      <div style={{
        width: 40,
        height: 1,
        background: 'rgba(255,255,255,0.08)',
      }} />

      {/* Force Launch button */}
      <button
        onClick={() => setForceActive(true)}
        style={{
          padding: '10px 22px',
          borderRadius: 6,
          border: '1px solid rgba(37,99,235,0.35)',
          background: 'rgba(37,99,235,0.08)',
          cursor: 'pointer',
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 9,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#2563EB',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(37,99,235,0.2)';
          e.currentTarget.style.borderColor = 'rgba(37,99,235,0.7)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(37,99,235,0.08)';
          e.currentTarget.style.borderColor = 'rgba(37,99,235,0.35)';
        }}
      >
        Force Launch Projection
      </button>
    </div>
  );
}
