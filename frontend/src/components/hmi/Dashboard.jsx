import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { RpmGauge, SpeedGauge } from './CustomGauges';
import { ShiftLightsBar, DigitalSpeedGear } from './DashWidgets';
import { WarningPanel, TurnSignalsRow, CriticalWarningBanner } from './WarningPanel';
import { AndroidAutoPanel } from './AndroidAutoPanel';
import { Settings, Activity, Smartphone } from 'lucide-react';

export const Dashboard = ({ onOpenSettings }) => {
  const { theme, themeId } = useTheme();
  const { signals, isConnected } = useVehicleData();
  const [showAndroidAuto, setShowAndroidAuto] = React.useState(false);
  const [phoneConnected, setPhoneConnected] = React.useState(true); // Simulated for demo

  // Calculate background color based on speed (PS3 breathing style)
  const speed = signals.speed_mph;
  const isHighSpeed = speed >= 85;

  return (
    <div 
      className="relative w-full h-screen overflow-hidden"
      data-testid="dashboard"
    >
      {/* Animated PS3-style breathing background */}
      <div 
        className="absolute inset-0 transition-all duration-[3000ms] ease-in-out"
        style={{
          background: isHighSpeed 
            ? 'radial-gradient(ellipse 90% 100% at 50% 35%, #3D1515 0%, #1A0808 25%, #000000 100%)'
            : 'radial-gradient(ellipse 90% 100% at 50% 35%, #2B2B2B 0%, #101010 25%, #000000 100%)'
        }}
      />
      
      {/* PS3 breathing animation overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none ${isHighSpeed ? 'animate-breathe-red' : 'animate-breathe'}`}
        style={{
          background: isHighSpeed
            ? 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(80, 20, 20, 0.15) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(60, 60, 60, 0.1) 0%, transparent 70%)'
        }}
      />

      {/* Critical Warning Banner - Always on top */}
      <CriticalWarningBanner />

      {/* Settings button - top right */}
      <button
        onClick={onOpenSettings}
        className="absolute top-4 right-4 z-20 touch-btn p-3 rounded-lg hover:bg-white/5 transition-colors"
        data-testid="settings-btn"
      >
        <Settings size={20} className="text-zinc-400 hover:text-white transition-colors" />
      </button>

      {/* Android Auto button - below settings (only when phone connected) */}
      {phoneConnected && (
        <button
          onClick={() => setShowAndroidAuto(!showAndroidAuto)}
          className={`
            absolute top-16 right-4 z-20 touch-btn p-3 rounded-lg transition-all
            ${showAndroidAuto ? 'bg-blue-500/20 border border-blue-500/50' : 'hover:bg-white/5'}
          `}
          data-testid="android-auto-btn"
        >
          <Smartphone 
            size={20} 
            className={`transition-colors ${showAndroidAuto ? 'text-blue-400' : 'text-zinc-400 hover:text-white'}`} 
          />
        </button>
      )}

      {/* Connection status - top right */}
      <div className="absolute top-5 right-28 z-20 flex items-center gap-2">
        <Activity 
          size={14} 
          className={isConnected ? 'text-green-500' : 'text-red-500'}
        />
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-orbitron">
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Main Layout */}
      <div className="absolute inset-0">
        
        {/* TOP CENTER SECTION */}
        <div className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center pt-2">
          
          {/* Shift Lights Bar */}
          <ShiftLightsBar className="mb-2" />
          
          {/* Digital Speed + Gear (URUS style) */}
          <DigitalSpeedGear className="mb-2" />
          
          {/* Turn Signals */}
          <TurnSignalsRow className="mb-2" />
        </div>

        {/* GAUGES ROW */}
        <div className="absolute inset-0 flex items-end justify-center pb-4 px-4">
          
          {/* LEFT: RPM Gauge */}
          <div className="relative flex items-end justify-center">
            <RpmGauge 
              size={520}
              vtecStartRpm={3000}
              shiftRpm={7800}
              maxRpm={8000}
              className="drop-shadow-[0_0_40px_rgba(0,0,0,0.55)]"
            />
          </div>

          {/* CENTER GAP - Android Auto or empty */}
          <div className="flex flex-col items-center justify-center mx-4" style={{ width: '400px', height: '400px' }}>
            {showAndroidAuto ? (
              <AndroidAutoPanel onClose={() => setShowAndroidAuto(false)} />
            ) : (
              <div className="w-full h-full" /> 
            )}
          </div>

          {/* RIGHT: Speed Gauge */}
          <div className="relative flex items-end justify-center">
            <SpeedGauge 
              size={520}
              maxSpeed={170}
              className="drop-shadow-[0_0_40px_rgba(0,0,0,0.55)]"
            />
          </div>
        </div>

        {/* Bottom Warning Strip - MORE SPREAD OUT */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <WarningPanel className="py-4 px-12" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
