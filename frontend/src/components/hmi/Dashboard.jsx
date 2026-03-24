import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { RpmGauge, SpeedGauge } from './CustomGauges';
import { ShiftLightsBar, DigitalSpeedGear } from './DashWidgets';
import { WarningPanel, TurnSignalsRow, CriticalWarningBanner } from './WarningPanel';
import AndroidAutoPanel from './AndroidAutoPanel';
import DevicePromptModal from './DevicePromptModal';
import { Settings, Activity, Smartphone } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export const Dashboard = ({ onOpenSettings }) => {
  const { theme, themeId } = useTheme();
  const { signals, isConnected } = useVehicleData();
  const { settings, updateSetting } = useSettings();
  const [showAndroidAuto, setShowAndroidAuto] = React.useState(false);
  const [aaActiveMode, setAaActiveMode] = React.useState(null);
  const [phoneConnected, setPhoneConnected] = React.useState(true);
  const [pendingDevice, setPendingDevice] = React.useState(null);

  const isFullscreenAA = aaActiveMode === 'fullscreen';

  const handleAAModeChange = React.useCallback((mode) => {
    setAaActiveMode(mode);
    if (mode) setShowAndroidAuto(true);
    else setShowAndroidAuto(false);
  }, []);

  // Poll DHU status for device events (auto-detect from udev)
  React.useEffect(() => {
    const pollDeviceEvents = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dhu/status`);
        const data = await res.json();

        if (data.device_event) {
          const evt = data.device_event;
          if (evt.type === 'prompt_needed') {
            setPendingDevice({ serial: evt.serial, name: evt.name });
          } else if (evt.type === 'auto_launched') {
            setShowAndroidAuto(true);
            setAaActiveMode(evt.mode);
          } else if (evt.type === 'disconnected') {
            setShowAndroidAuto(false);
            setAaActiveMode(null);
            setPendingDevice(null);
          }
        }
      } catch {
        // Backend unreachable
      }
    };

    const interval = setInterval(pollDeviceEvents, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleDeviceConfirm = React.useCallback(async ({ connectionType, mode }) => {
    setPendingDevice(null);
    updateSetting('aa_mode', mode);

    // Launch OpenAuto with chosen preferences
    try {
      await fetch(`${API_URL}/api/dhu/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, borderless: true, alwaysOnTop: true }),
      });
      setShowAndroidAuto(true);
      setAaActiveMode(mode);
    } catch {
      // Launch failed
    }
  }, [updateSetting]);

  const handleDeviceDismiss = React.useCallback(() => {
    setPendingDevice(null);
  }, []);

  // Calculate background color - GRADUAL transition from 86-120 mph
  const speed = signals.speed_mph;
  
  // Calculate red intensity: 0 at 85mph, 1 at 120mph (gradual transition)
  const redIntensity = Math.min(Math.max((speed - 85) / 35, 0), 1);
  
  // Interpolate background colors based on speed
  const getBgGradient = () => {
    if (speed <= 85) {
      return 'radial-gradient(ellipse 90% 100% at 50% 35%, #2B2B2B 0%, #101010 25%, #000000 100%)';
    }
    
    // Gradual transition: interpolate between gray and red
    const r1 = Math.round(43 + (61 - 43) * redIntensity); // #2B to #3D
    const g1 = Math.round(43 + (21 - 43) * redIntensity); // #2B to #15
    const b1 = Math.round(43 + (21 - 43) * redIntensity); // #2B to #15
    
    const r2 = Math.round(16 + (26 - 16) * redIntensity); // #10 to #1A
    const g2 = Math.round(16 + (8 - 16) * redIntensity);  // #10 to #08
    const b2 = Math.round(16 + (8 - 16) * redIntensity);  // #10 to #08
    
    return `radial-gradient(ellipse 90% 100% at 50% 35%, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 25%, #000000 100%)`;
  };
  
  // Breathing overlay color also transitions
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
      {/* Animated breathing background with gradual red transition */}
      <div 
        className="absolute inset-0 transition-all duration-1000 ease-out"
        style={{ background: getBgGradient() }}
      />
      
      {/* PS3 breathing animation overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none ${speed > 85 ? 'animate-breathe-red' : 'animate-breathe'}`}
        style={{ background: getBreathingOverlay() }}
      />

      {/* Critical Warning Banner - Always on top */}
      <CriticalWarningBanner />

      {/* Device connection prompt modal */}
      {pendingDevice && (
        <DevicePromptModal
          device={pendingDevice}
          onConfirm={handleDeviceConfirm}
          onDismiss={handleDeviceDismiss}
        />
      )}

      {/* Settings button - top right - BIGGER for easier tapping */}
      <button
        onClick={onOpenSettings}
        className="absolute top-4 right-4 z-20 touch-btn p-4 rounded-lg hover:bg-white/5 transition-colors"
        data-testid="settings-btn"
      >
        <Settings size={25} className="text-zinc-400 hover:text-white transition-colors" />
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
          className={isConnected ? 'text-green-500 animate-pulse' : 'text-red-500'}
        />
        <span className={`text-xs uppercase tracking-wider font-orbitron ${isConnected ? 'text-zinc-500' : 'text-red-400'}`}>
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Offline warning banner */}
      {!isConnected && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-red-900/80 border border-red-500/50 rounded-lg px-4 py-2 backdrop-blur-sm">
          <p className="text-red-200 text-sm font-medium">Backend Offline</p>
          <p className="text-red-300/70 text-xs">Check: sudo systemctl status frank-backend</p>
        </div>
      )}

      {/* Main Layout */}
      <div className="absolute inset-0">
        
        {/* TOP CENTER SECTION — hidden in fullscreen AA */}
        {!isFullscreenAA && (
          <div className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center pt-4">
            
            {/* Shift Lights Bar */}
            <ShiftLightsBar className="mb-3" />
            
            {/* Digital Speed + Gear (URUS style) */}
            <DigitalSpeedGear className="mb-3" />
            
            {/* Turn Signals */}
            <TurnSignalsRow className="mb-3" />
          </div>
        )}

        {/* GAUGES ROW / FULLSCREEN AA */}
        {isFullscreenAA ? (
          /* Fullscreen Android Auto — takes over entire screen */
          <div className="absolute inset-0 z-20">
            <AndroidAutoPanel isActive={showAndroidAuto} onModeChange={handleAAModeChange} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-end justify-center pb-24 px-8">
            
            {/* LEFT: RPM Gauge */}
            <div className="relative flex items-end justify-center">
              <RpmGauge 
                size={640}
                vtecStartRpm={3000}
                shiftRpm={7800}
                maxRpm={8000}
              />
            </div>

            {/* CENTER GAP - Android Auto */}
            <div 
              className="flex flex-col items-center justify-start mx-6 pt-10" 
              style={{ width: '500px', height: '450px' }}
            >
              <AndroidAutoPanel isActive={showAndroidAuto} onModeChange={handleAAModeChange} />
            </div>

            {/* RIGHT: Speed Gauge */}
            <div className="relative flex items-end justify-center">
              <SpeedGauge 
                size={640}
                maxSpeed={170}
              />
            </div>
          </div>
        )}

        {/* Bottom Warning Strip — hidden in fullscreen AA */}
        {!isFullscreenAA && (
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <WarningPanel className="py-5 px-20" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
