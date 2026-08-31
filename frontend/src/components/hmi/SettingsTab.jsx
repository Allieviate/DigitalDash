import React, { useState } from 'react';
import { X, Activity, Sliders, Wifi, ChevronRight } from 'lucide-react';
import DiagnosticsTab from './DiagnosticsTab';
import ConnectivityTab from './ConnectivityTab';
import { Settings2, Smartphone } from 'lucide-react'; 
import GeneralSettingsTab from './GeneralSettingsTab';
import SavedDevicesTab from './SavedDevicesTab';
import { useSettings } from '../../contexts/SettingsContext';

// ── Vehicle Parameters Tab with RPM & Shift Light Controls ──
const VehicleParamsTab = () => {
  const { settings, updateSetting } = useSettings();
  
  // Read from persisted settings, fallback to defaults
  const yellowShift = settings.yellow_shift ?? 7000;
  const redShift = settings.red_shift ?? 7800;
  const redline = settings.redline ?? 8500;
  const milBorders = settings.mil_borders ?? false;

  const setYellowShift = (val) => updateSetting('yellow_shift', val);
  const setRedShift = (val) => updateSetting('red_shift', val);
  const setRedline = (val) => updateSetting('redline', val);
  const setMilBorders = (val) => updateSetting('mil_borders', val);

  // A helper component for our custom sliders
  const CustomSlider = ({ label, value, min, max, step, onChange, color }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'Helvetica Neue, sans-serif', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', color: color }}>
          {value} RPM
        </span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          appearance: 'none',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          outline: 'none',
          cursor: 'pointer'
        }}
        className={`slider-${color.replace('#', '')}`}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-8 h-full">
      
      {/* ── RPM & Shift Lights Section ── */}
      <div style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '24px' }}>
        <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 16, color: '#fff', marginBottom: 20, letterSpacing: '0.1em' }}>
          RPM & SHIFT LIGHTS
        </h3>

        {/* These three are persisted but ShiftLightsBar still hardcodes
            its thresholds. Wiring them up is the next piece of work. */}
        <div style={{ fontFamily: 'Helvetica Neue, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 18, lineHeight: 1.5 }}>
          Saved, but not yet driving the shift lights.
        </div>

        <CustomSlider 
          label="Stage 1 (Yellow)" 
          value={yellowShift} min={3000} max={9000} step={100} 
          onChange={setYellowShift} color="#FBBF24"
        />
        
        <CustomSlider 
          label="Stage 2 (Red)" 
          value={redShift} min={3000} max={9000} step={100} 
          onChange={setRedShift} color="#EF4444"
        />
        
        <CustomSlider 
          label="Hard Redline" 
          value={redline} min={5000} max={10000} step={100} 
          onChange={setRedline} color="#DC2626"
        />
      </div>

      {/* ── Warning Lights Section ── */}
      <div style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '24px' }}>
        <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 16, color: '#fff', marginBottom: 20, letterSpacing: '0.1em' }}>
          WARNING LIGHTS
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div>
             <div style={{ fontFamily: 'Helvetica Neue, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
               Show borders around tell-tales
             </div>
             <div style={{ fontFamily: 'Helvetica Neue, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
               Off means the icons sit directly on the background.
             </div>
           </div>
           <input type="checkbox" checked={milBorders} onChange={(e) => setMilBorders(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: '#EF4444' }}/>
        </div>

      </div>

    </div>
  );
};

// ── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'diagnostics',  label: 'Live Diagnostics',    icon: Activity,    component: DiagnosticsTab },
  { id: 'general',      label: 'General Settings',    icon: Settings2,   component: GeneralSettingsTab },
  { id: 'devices',      label: 'Saved Devices',       icon: Smartphone,  component: SavedDevicesTab },
  { id: 'vehicle',      label: 'Vehicle Parameters',  icon: Sliders,     component: VehicleParamsTab },
  { id: 'connectivity', label: 'Connectivity',         icon: Wifi,        component: ConnectivityTab },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings({ onClose }) {
  const [activeTab, setActiveTab] = useState('diagnostics');
  const activeItem = NAV_ITEMS.find(n => n.id === activeTab);
  const ActiveContent = activeItem?.component ?? DiagnosticsTab;

  // Handle close - use prop if provided, otherwise go back
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 w-full h-screen flex overflow-hidden"
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
            onClick={handleClose}
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

// Named export for compatibility with App.js
export { Settings as SettingsPanel };
