import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { RpmGauge, SpeedGauge } from './CustomGauges';
import { ShiftLightsBar, DigitalSpeedGear, IndicatorsRow, FuelCoolantBars } from './DashWidgets';
import { CriticalWarningBanner } from './WarningPanel';
import { Settings, Activity } from 'lucide-react';

export const Dashboard = ({ onOpenSettings }) => {
  const { theme, themeId } = useTheme();
  const { isConnected } = useVehicleData();

  return (
    <div 
      className="relative w-full h-screen overflow-hidden"
      style={{
        // Radial gradient background matching your WPF design
        background: 'radial-gradient(ellipse 90% 100% at 50% 35%, #2B2B2B 0%, #101010 25%, #000000 100%)'
      }}
      data-testid="dashboard"
    >
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

      {/* Connection status - top right (next to settings) */}
      <div className="absolute top-5 right-16 z-20 flex items-center gap-2">
        <Activity 
          size={14} 
          className={isConnected ? 'text-green-500' : 'text-red-500'}
        />
        <span className="text-xs uppercase tracking-wider text-zinc-500">
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Main Layout - Two Column Grid */}
      <div className="absolute inset-0 grid grid-cols-2 px-8 py-3">
        
        {/* TOP CENTER OVERLAY (spans both columns) */}
        <div className="col-span-2 absolute top-0 left-0 right-0 z-10 flex flex-col items-center pt-3">
          
          {/* Shift Lights Bar */}
          <ShiftLightsBar className="mb-3" />
          
          {/* Digital Speed + Gear */}
          <DigitalSpeedGear className="mb-3" />
          
          {/* Indicators Row */}
          <IndicatorsRow className="mb-3" />
          
          {/* Fuel + Coolant Bars */}
          <FuelCoolantBars />
        </div>

        {/* LEFT: RPM Gauge */}
        <div className="flex items-end justify-center pb-4">
          <RpmGauge 
            size={550}
            vtecStartRpm={3000}
            shiftRpm={7800}
            maxRpm={8000}
            className="drop-shadow-[0_0_40px_rgba(0,0,0,0.55)]"
          />
        </div>

        {/* RIGHT: Speed Gauge */}
        <div className="flex items-end justify-center pb-4">
          <SpeedGauge 
            size={550}
            maxSpeed={170}
            className="drop-shadow-[0_0_40px_rgba(0,0,0,0.55)]"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
