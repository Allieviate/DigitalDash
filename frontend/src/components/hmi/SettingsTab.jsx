import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Activity, LayoutGrid, Sliders, Wifi, ChevronRight } from 'lucide-react';
import DiagnosticsTab from './DiagnosticsTab';

const DashBuilderTab = () => (
  <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'rgba(255,255,255,0.15)' }}>
    <LayoutGrid size={40} strokeWidth={1} />
    <span style={{ fontFamily: 'Helvetica Neue, sans-serif', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
      Dash Builder — Coming Soon
    </span>
  </div>
);

const VehicleParamsTab = () => (
  <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'rgba(255,255,255,0.15)' }}>
    <Sliders size={40} strokeWidth={1} />
    <span style={{ fontFamily: 'Helvetica Neue, sans-serif', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
      Vehicle Parameters — Coming Soon
    </span>
  </div>
);

const ConnectivityTab = () => (
  <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'rgba(255,255,255,0.15)' }}>
    <Wifi size={40} strokeWidth={1} />
    <span style={{ fontFamily: 'Helvetica Neue, sans-serif', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
      Connectivity — Coming Soon
    </span>
  </div>
);

// ── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'diagnostics',  label: 'Live Diagnostics',    icon: Activity,    component: DiagnosticsTab },
  { id: 'vehicle',      label: 'Vehicle Parameters',  icon: Sliders,     component: VehicleParamsTab },
  { id: 'connectivity', label: 'Connectivity',         icon: Wifi,        component: ConnectivityTab },
  { id: 'dash-builder', label: 'Dash Builder',         icon: LayoutGrid,  component: DashBuilderTab },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState('diagnostics');
  const activeItem = NAV_ITEMS.find(n => n.id === activeTab);
  const ActiveContent = activeItem?.component ?? DiagnosticsTab;

  return (
    <div
      className="w-full h-screen flex overflow-hidden"
      style={{ background: '#09090b', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}
    >
      {/* Scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.010) 0px, rgba(255,255,255,0.010) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* ── Left Sidebar ── */}
      <aside
        className="relative z-10 flex flex-col"
        style={{
          width: 240,
          minWidth: 240,
          background: '#0c0c0f',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand / Title */}
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 6 }}>
            Project Fran
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.08em', color: '#fff', textTransform: 'uppercase' }}>
            Settings
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1" style={{ padding: '16px 12px' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 6,
                  marginBottom: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(204,0,0,0.12)' : 'transparent',
                  borderLeft: isActive ? '2px solid #CC0000' : '2px solid transparent',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon
                  size={15}
                  style={{ color: isActive ? '#CC0000' : 'rgba(255,255,255,0.35)', flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                    fontWeight: isActive ? 500 : 400,
                    flex: 1,
                    textAlign: 'left',
                  }}
                >
                  {item.label}
                </span>
                {isActive && <ChevronRight size={12} style={{ color: '#CC0000', opacity: 0.7 }} />}
              </button>
            );
          })}
        </nav>

        {/* Back to Dash button */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '11px 14px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(204,0,0,0.15)';
              e.currentTarget.style.borderColor = 'rgba(204,0,0,0.5)';
              e.currentTarget.querySelector('span').style.color = '#fff';
              e.currentTarget.querySelector('svg').style.color = '#CC0000';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.querySelector('span').style.color = 'rgba(255,255,255,0.35)';
              e.currentTarget.querySelector('svg').style.color = 'rgba(255,255,255,0.25)';
            }}
          >
            <X size={14} style={{ color: 'rgba(255,255,255,0.25)', transition: 'color 0.2s' }} />
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 400, transition: 'color 0.2s' }}>
              Back to Dash
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Content header */}
        <div
          style={{
            padding: '28px 36px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontSize: 9, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 6 }}>
            Configuration
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.06em', color: '#fff', textTransform: 'uppercase' }}>
            {activeItem?.label}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto" style={{ padding: '36px' }}>
          <ActiveContent />
        </div>
      </main>
    </div>
  );
}
