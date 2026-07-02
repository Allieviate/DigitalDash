import React, { useState, useCallback } from 'react';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { GaugePod } from './Retro89Cluster';
import { ShiftLightsBar, DigitalSpeed, GearDisplay } from './DashWidgets';
import { WarningLight, TurnSignalsRow, CriticalWarningBanner } from './WarningPanel';
import { FuelGauge, CoolantGauge, BatteryGauge, OilPressureGauge } from './InfoGauges';
import EditableWidget from './EditableWidget';
import EditModeLegend from './EditModeLegend';
import { useLayoutStore } from '../../hooks/useLayoutStore';
import { Settings, Activity, Pencil } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const GRID_SIZES = [0, 20, 40]; // 0 = off

const WARNING_KEYS = [
  'check_engine', 'oil_pressure_warning', 'high_coolant',
  'low_fuel', 'maintenance', 'brake_warning', 'abs_warning',
];

const AALogoIndicator = ({ visible, onStop }) => {
  if (!visible) return null;
  return (
    <button
      data-testid="aa-stop-btn"
      onClick={onStop}
      className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
      title="Stop Android Auto"
    >
      <svg width="20" height="20" viewBox="-0.72 -0.72 25.44 25.44" fill="none">
        <path d="M12 0c-.6 0-1.11.32-1.39.8L.48 18.4a1.6 1.6 0 0 0 1.39 2.4h2l7.7-13.58.43-.77 8.13 14.35h2a1.6 1.6 0 0 0 1.39-2.4L13.39.8A1.6 1.6 0 0 0 12 0zm0 7.47l-9.07 16 .54.53L12 20.8l8.53 3.2.54-.53z" fill="#22C55E" />
      </svg>
      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#22C55E' }}>AA ACTIVE</span>
    </button>
  );
};

/* Grid Overlay — visible lines when snap is active */
const GridOverlay = ({ gridSize }) => {
  if (!gridSize || gridSize <= 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-[5]" data-testid="grid-overlay">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
};

export const Dashboard = ({ onOpenSettings }) => {
  const { signals, isConnected } = useVehicleData();
  const { getWidgetTransform, updateWidget, resetLayout, layout, saveLayout } = useLayoutStore();

  const [editMode, setEditMode] = useState(false);
  const [preEditLayout, setPreEditLayout] = useState(null);
  const [gridSize, setGridSize] = useState(0);

  const enterEditMode = useCallback(() => {
    setPreEditLayout({ ...layout });
    setEditMode(true);
  }, [layout]);

  const saveAndExit = useCallback(() => {
    setEditMode(false);
    setPreEditLayout(null);
  }, []);

  const cancelEdit = useCallback(() => {
    if (preEditLayout) saveLayout(preEditLayout);
    setEditMode(false);
    setPreEditLayout(null);
  }, [preEditLayout, saveLayout]);

  const handleReset = useCallback(() => { resetLayout(); }, [resetLayout]);

  const toggleGrid = useCallback(() => {
    setGridSize(prev => {
      const idx = GRID_SIZES.indexOf(prev);
      return GRID_SIZES[(idx + 1) % GRID_SIZES.length];
    });
  }, []);

  // DHU state
  const [dhuRunning, setDhuRunning] = useState(false);
  React.useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dhu/status`);
        const data = await res.json();
        setDhuRunning(data.status === 'running');
      } catch { /* */ }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStopAA = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/dhu/stop`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      setDhuRunning(false);
    } catch { /* */ }
  }, []);

  // Background gradient
  const speed = signals.speed_mph;
  const redIntensity = Math.min(Math.max((speed - 85) / 35, 0), 1);
  const getBgGradient = () => {
    if (speed <= 85) return 'radial-gradient(ellipse 90% 100% at 50% 35%, #2B2B2B 0%, #101010 25%, #000000 100%)';
    const r1 = Math.round(43 + 18 * redIntensity), g1 = Math.round(43 - 22 * redIntensity), b1 = Math.round(43 - 22 * redIntensity);
    const r2 = Math.round(16 + 10 * redIntensity), g2 = Math.round(16 - 8 * redIntensity), b2 = Math.round(16 - 8 * redIntensity);
    return `radial-gradient(ellipse 90% 100% at 50% 35%, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 25%, #000000 100%)`;
  };

  // Shorthand for editable props
  const ep = (id) => ({
    id, editing: editMode, transform: getWidgetTransform(id),
    onUpdate: updateWidget, gridSize: editMode ? gridSize : 0,
  });

  const rpm = signals.rpm || 0;

  return (
    <div className="relative w-full h-screen overflow-hidden" data-testid="dashboard">
      {/* Background */}
      <div className="absolute inset-0 transition-all duration-1000 ease-out" style={{ background: getBgGradient() }} />

      <CriticalWarningBanner />

      {/* Edit mode overlay tint */}
      {editMode && (
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: 'rgba(0,0,0,0.15)', border: '2px solid rgba(59,130,246,0.3)' }} />
      )}

      {/* Grid overlay */}
      {editMode && <GridOverlay gridSize={gridSize} />}

      {/* Top-right: AA logo + status + edit + settings */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-3">
        <AALogoIndicator visible={dhuRunning} onStop={handleStopAA} />

        <EditableWidget {...ep('status')} label="Status">
          <div className="flex items-center gap-2">
            <Activity size={14} className={isConnected ? 'text-green-500 animate-pulse' : 'text-red-500'} />
            <span className={`text-xs uppercase tracking-wider font-orbitron ${isConnected ? 'text-zinc-500' : 'text-red-400'}`}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </EditableWidget>

        <button
          onClick={editMode ? saveAndExit : enterEditMode}
          className={`touch-btn p-3 rounded-lg transition-colors ${editMode ? 'bg-blue-500/20 hover:bg-blue-500/30' : 'hover:bg-white/5'}`}
          data-testid="edit-mode-btn"
          title={editMode ? 'Save Layout' : 'Edit Layout'}
        >
          <Pencil size={20} className={editMode ? 'text-blue-400' : 'text-zinc-500 hover:text-white'} style={{ transition: 'color 0.15s' }} />
        </button>

        <button onClick={onOpenSettings} className="touch-btn p-3 rounded-lg hover:bg-white/5 transition-colors" data-testid="settings-btn">
          <Settings size={22} className="text-zinc-400 hover:text-white transition-colors" />
        </button>
      </div>

      {/* Offline warning */}
      {!isConnected && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-red-900/80 border border-red-500/50 rounded-lg px-4 py-2 backdrop-blur-sm">
          <p className="text-red-200 text-sm font-medium">Backend Offline</p>
          <p className="text-red-300/70 text-xs">Check: sudo systemctl status frank-backend</p>
        </div>
      )}

      <div className="absolute inset-0">
        {/* ─── TOP CENTER ─── */}
        <div className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center pt-4">
          <EditableWidget {...ep('shift-lights')} label="Shift Lights">
            <ShiftLightsBar className="mb-3" />
          </EditableWidget>

          <EditableWidget {...ep('digital-speed')} label="Speed">
            <DigitalSpeed className="mb-2" />
          </EditableWidget>

          <EditableWidget {...ep('gear-display')} label="Gear">
            <GearDisplay className="mb-2" />
          </EditableWidget>

          <EditableWidget {...ep('turn-signals')} label="Turn Signals">
            <TurnSignalsRow className="mb-3" />
          </EditableWidget>
        </div>

        {/* ─── GAUGES + INFO (middle area) ─── */}
        <div className="absolute inset-0 flex items-center justify-center px-8">
          {/* Left info gauges — each independent */}
          <div className="flex flex-col items-center justify-center gap-4 mr-4">
            <EditableWidget {...ep('coolant')} label="Coolant">
              <CoolantGauge />
            </EditableWidget>
            <EditableWidget {...ep('oil-pressure')} label="Oil Pressure">
              <OilPressureGauge />
            </EditableWidget>
          </div>

          {/* Tachometer */}
          <EditableWidget {...ep('tachometer')} label="Tachometer">
            <div style={{ width: 420, height: 420 }}>
              <GaugePod id="tach" value={rpm} max={8000} ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8]} unit="x1000r/min" redlineStart={7000} />
            </div>
          </EditableWidget>

          {/* Speedometer */}
          <EditableWidget {...ep('speedometer')} label="Speedometer">
            <div style={{ width: 420, height: 420 }}>
              <GaugePod id="speedo" value={speed} max={170} ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170]} unit="mph" />
            </div>
          </EditableWidget>

          {/* Right info gauges — each independent */}
          <div className="flex flex-col items-center justify-center gap-4 ml-4">
            <EditableWidget {...ep('fuel')} label="Fuel">
              <FuelGauge />
            </EditableWidget>
            <EditableWidget {...ep('battery')} label="Battery">
              <BatteryGauge />
            </EditableWidget>
          </div>
        </div>

        {/* ─── BOTTOM: Warning lights — each independent ─── */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="flex items-center justify-center py-5 px-20" style={{ gap: '50px' }}>
            {WARNING_KEYS.map((warnKey) => (
              <EditableWidget key={warnKey} {...ep(`warn-${warnKey}`)} label={warnKey.replace(/_/g, ' ')}>
                <WarningLight type={warnKey} active={signals[warnKey]} />
              </EditableWidget>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Mode Legend */}
      {editMode && (
        <EditModeLegend
          onSave={saveAndExit}
          onReset={handleReset}
          onCancel={cancelEdit}
          gridSize={gridSize}
          onToggleGrid={toggleGrid}
        />
      )}
    </div>
  );
};

export default Dashboard;
