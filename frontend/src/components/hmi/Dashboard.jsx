import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { Gauge } from './Gauge';
import { Speedometer } from './Speedometer';
import { GearIndicator } from './GearIndicator';
import { WarningPanel, CriticalWarningBanner } from './WarningPanel';
import { TurnIndicators } from './TurnIndicators';
import { FuelGauge, CoolantGauge, BatteryGauge, OilPressureGauge } from './InfoGauges';
import { Settings, Activity, Gauge as GaugeIcon } from 'lucide-react';

export const Dashboard = ({ onOpenSettings }) => {
  const { theme, themeId } = useTheme();
  const { signals, isConnected } = useVehicleData();

  // Texture overlay based on theme
  const textureClass = themeId === 'retro_89' ? 'texture-scanlines' : 
                       themeId === 'type_r' ? 'texture-carbon' : '';

  return (
    <div 
      className="relative w-full h-screen bg-[#050505] overflow-hidden"
      data-testid="dashboard"
    >
      {/* Background texture overlay */}
      {textureClass && (
        <div className={`absolute inset-0 pointer-events-none opacity-30 ${textureClass}`} />
      )}

      {/* Critical Warning Banner - Always on top */}
      <CriticalWarningBanner />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left - Turn signal */}
          <div className="w-32">
            <TurnIndicators />
          </div>

          {/* Center - Connection status */}
          <div className="flex items-center gap-2">
            <Activity 
              size={14} 
              className={isConnected ? 'text-green-500' : 'text-red-500'}
            />
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Right - Settings button */}
          <button
            onClick={onOpenSettings}
            className="touch-btn p-3 rounded-lg hover:bg-white/5 transition-colors"
            data-testid="settings-btn"
          >
            <Settings size={20} className="text-zinc-400 hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="h-full pt-16 pb-24 px-4 md:px-8">
        <div className="h-full grid grid-cols-12 gap-4 md:gap-6">
          
          {/* Left Panel - Secondary Gauges */}
          <div className="col-span-2 flex flex-col items-center justify-center gap-6">
            <CoolantGauge />
            <OilPressureGauge />
          </div>

          {/* Center Panel - Main Instruments */}
          <div className="col-span-8 flex flex-col items-center justify-center gap-4">
            
            {/* Top Row - Speed and Gear */}
            <div className="flex items-center justify-center gap-12 w-full">
              <Speedometer speed={signals.speed_mph} />
              <GearIndicator gear={signals.gear} />
            </div>

            {/* Center - RPM Tachometer (Hero Element) */}
            <div className="relative">
              <Gauge
                value={signals.rpm}
                min={0}
                max={8000}
                label="RPM"
                size={320}
                strokeWidth={14}
                redline={6500}
              />
              
              {/* RPM zone indicator */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                  x1000
                </span>
              </div>
            </div>

            {/* Fuel bar at bottom */}
            <div className="w-full max-w-md mt-4">
              <FuelGauge />
            </div>
          </div>

          {/* Right Panel - Secondary Gauges */}
          <div className="col-span-2 flex flex-col items-center justify-center gap-6">
            <BatteryGauge />
            {/* Additional info card */}
            <div className="glass-card p-4 w-full">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                Engine Load
              </div>
              <div className="flex items-baseline gap-1">
                <span 
                  className="font-mono text-2xl font-bold"
                  style={{ color: theme.accent }}
                >
                  {Math.round((signals.rpm / 8000) * 100)}
                </span>
                <span className="text-zinc-500 text-sm">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Warning Strip */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#09090b]/90 backdrop-blur-sm border-t border-zinc-800">
        <WarningPanel className="py-3 px-6" />
      </div>

      {/* Accent glow effect at edges */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 opacity-50"
        style={{ 
          background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
          boxShadow: theme.glow
        }}
      />
    </div>
  );
};

export default Dashboard;
