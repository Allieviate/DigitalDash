import React from 'react';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { RpmGauge, SpeedGauge } from './CustomGauges';
import { ShiftLightsBar, DigitalSpeedGear } from './DashWidgets';
import { WarningPanel, TurnSignalsRow, CriticalWarningBanner } from './WarningPanel';
import { FuelGauge, CoolantGauge, BatteryGauge, OilPressureGauge } from './InfoGauges';
import { Settings, Activity } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Android Auto logo — clickable to launch/stop AA manually
const AALogoIndicator = ({ visible, onStop }) => {
  if (visible) {
    // AA is running — show active indicator with stop action
    return (
      <button
        data-testid="aa-stop-btn"
        onClick={onStop}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
        title="Stop Android Auto"
      >
        <svg width="20" height="20" viewBox="-0.72 -0.72 25.44 25.44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 0c-.6 0-1.11.32-1.39.8L.48 18.4a1.6 1.6 0 0 0 1.39 2.4h2l7.7-13.58.43-.77 8.13 14.35h2a1.6 1.6 0 0 0 1.39-2.4L13.39.8A1.6 1.6 0 0 0 12 0zm0 7.47l-9.07 16 .54.53L12 20.8l8.53 3.2.54-.53z"
            fill="#22C55E"
          />
        </svg>
        <span style={{
          fontFamily: 'Helvetica Neue, sans-serif',
          fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
          color: '#22C55E',
        }}>
          AA ACTIVE
        </span>
      </button>
    );
  }
  return null;
};

export const Dashboard = ({ onOpenSettings }) => {
  const { signals, isConnected } = useVehicleData();

  // DHU state — simple polling, no auto-detect
  const [dhuRunning, setDhuRunning] = React.useState(false);

  React.useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dhu/status`);
        const data = await res.json();
        setDhuRunning(data.status === 'running');
      } catch {
        // Backend unreachable
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchAA = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/dhu/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.status === 'running') {
        setDhuRunning(true);
      }
    } catch {
      // Launch failed
    }
  }, []);

  const handleStopAA = React.useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/dhu/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setDhuRunning(false);
    } catch {
      // Stop failed
    }
  }, []);

  // Background color based on speed
  const speed = signals.speed_mph;
  const redIntensity = Math.min(Math.max((speed - 85) / 35, 0), 1);

  const getBgGradient = () => {
    if (speed <= 85) {
      return 'radial-gradient(ellipse 90% 100% at 50% 35%, #2B2B2B 0%, #101010 25%, #000000 100%)';
    }
    const r1 = Math.round(43 + (61 - 43) * redIntensity);
    const g1 = Math.round(43 + (21 - 43) * redIntensity);
    const b1 = Math.round(43 + (21 - 43) * redIntensity);
    const r2 = Math.round(16 + (26 - 16) * redIntensity);
    const g2 = Math.round(16 + (8 - 16) * redIntensity);
    const b2 = Math.round(16 + (8 - 16) * redIntensity);
    return `radial-gradient(ellipse 90% 100% at 50% 35%, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 25%, #000000 100%)`;
  };

  const getBreathingOverlay = () => {
    if (speed <= 85) {
      return 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(60, 60, 60, 0.1) 0%, transparent 70%)';
    }
    const opacity = 0.1 + (0.1 * redIntensity);
    return `radial-gradient(ellipse 100% 80% at 50% 50%, rgba(${80 + 40 * redIntensity}, ${20 - 10 * redIntensity}, ${20 - 10 * redIntensity}, ${opacity}) 0%, transparent 70%)`;
  };


  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      data-testid="dashboard"
    >
      {/* Background */}
      <div
        className="absolute inset-0 transition-all duration-1000 ease-out"
        style={{ background: getBgGradient() }}
      />
      <div
        className={`absolute inset-0 pointer-events-none ${speed > 85 ? 'animate-breathe-red' : 'animate-breathe'}`}
        style={{ background: getBreathingOverlay() }}
      />

      {/* Critical Warning Banner */}
      <CriticalWarningBanner />

      {/* Top-right: AA logo + connection status + settings */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
        <AALogoIndicator visible={dhuRunning} onStop={handleStopAA} />
        <div className="flex items-center gap-2">
          <Activity
            size={14}
            className={isConnected ? 'text-green-500 animate-pulse' : 'text-red-500'}
          />
          <span className={`text-xs uppercase tracking-wider font-orbitron ${isConnected ? 'text-zinc-500' : 'text-red-400'}`}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <button
          onClick={onOpenSettings}
          className="touch-btn p-3 rounded-lg hover:bg-white/5 transition-colors"
          data-testid="settings-btn"
        >
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

      {/* Main Layout */}
      <div className="absolute inset-0">

        {/* TOP CENTER */}
        <div className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center pt-4">
          <ShiftLightsBar className="mb-3" />
          <DigitalSpeedGear className="mb-3" />
          <TurnSignalsRow className="mb-3" />
        </div>

        {/* GAUGES + CENTER PANEL */}
        <div className="absolute inset-0 flex items-end justify-center pb-24 px-8">
          {/* FAR LEFT: Info Gauges (Coolant + Oil) */}
          <div
            className="flex flex-col items-center justify-end gap-4 pb-16 mr-2"
            data-testid="info-gauges-left"
          >
            <CoolantGauge />
            <OilPressureGauge />
          </div>

          {/* LEFT: RPM */}
          <div className="relative flex items-end justify-center">
            <RpmGauge size={640} vtecStartRpm={3000} shiftRpm={7800} maxRpm={8000} />
          </div>

          {/* CENTER: gap between gauges */}
          <div className="mx-6" style={{ width: '500px' }} />

          {/* RIGHT: Speed */}
          <div className="relative flex items-end justify-center">
            <SpeedGauge size={640} maxSpeed={170} />
          </div>

          {/* FAR RIGHT: Info Gauges (Fuel + Battery) */}
          <div
            className="flex flex-col items-center justify-end gap-4 pb-16 ml-2"
            data-testid="info-gauges-right"
          >
            <FuelGauge />
            <BatteryGauge />
          </div>
        </div>

        {/* Bottom Warning Strip */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <WarningPanel className="py-5 px-20" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
