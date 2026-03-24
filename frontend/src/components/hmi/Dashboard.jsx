import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { RpmGauge, SpeedGauge } from './CustomGauges';
import { ShiftLightsBar, DigitalSpeedGear } from './DashWidgets';
import { WarningPanel, TurnSignalsRow, CriticalWarningBanner } from './WarningPanel';
import AndroidAutoPanel from './AndroidAutoPanel';
import DevicePromptModal from './DevicePromptModal';
import { Settings, Activity } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export const Dashboard = ({ onOpenSettings }) => {
  const { theme, themeId } = useTheme();
  const { signals, isConnected } = useVehicleData();
  const { settings, updateSetting } = useSettings();

  // Phone/AA state — driven entirely by backend status polling
  const [phoneConnected, setPhoneConnected] = React.useState(false);
  const [dhuRunning, setDhuRunning] = React.useState(false);
  const [aaMode, setAaMode] = React.useState(null); // null | 'embedded' | 'fullscreen'
  const [pendingDevice, setPendingDevice] = React.useState(null);

  const isFullscreenAA = dhuRunning && aaMode === 'fullscreen';

  // Poll backend every 2s for phone state + device events
  React.useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dhu/status`);
        const data = await res.json();

        // Update phone connection state
        setPhoneConnected(data.phone_connected === true);

        // Update DHU running state
        setDhuRunning(data.status === 'running');

        // Handle device events
        if (data.device_event) {
          const evt = data.device_event;
          if (evt.type === 'prompt_needed') {
            setPendingDevice({ serial: evt.serial, name: evt.name });
          } else if (evt.type === 'auto_launched') {
            setDhuRunning(true);
            setAaMode(evt.mode || 'embedded');
          } else if (evt.type === 'disconnected') {
            setDhuRunning(false);
            setAaMode(null);
            setPendingDevice(null);
          }
        }
      } catch {
        // Backend unreachable
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  // User confirms device prompt
  const handleDeviceConfirm = React.useCallback(async ({ connectionType, mode }) => {
    setPendingDevice(null);
    updateSetting('aa_mode', mode);

    try {
      const res = await fetch(`${API_URL}/api/dhu/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, borderless: true, alwaysOnTop: true }),
      });
      const data = await res.json();
      if (data.status === 'running' || data.status === 'error') {
        setDhuRunning(data.status === 'running');
        setAaMode(mode);
      }
    } catch {
      // Launch failed
    }
  }, [updateSetting]);

  const handleDeviceDismiss = React.useCallback(() => {
    setPendingDevice(null);
  }, []);

  // Called by AndroidAutoPanel when mode changes or stop is pressed
  const handleAAModeChange = React.useCallback((mode) => {
    if (mode) {
      setAaMode(mode);
    } else {
      // Stopped
      setDhuRunning(false);
      setAaMode(null);
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

  // Should we show the AA panel in the center?
  // Only when: phone is connected OR DHU is running
  const showAAPanel = phoneConnected || dhuRunning;

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

      {/* Device prompt modal */}
      {pendingDevice && (
        <DevicePromptModal
          device={pendingDevice}
          onConfirm={handleDeviceConfirm}
          onDismiss={handleDeviceDismiss}
        />
      )}

      {/* Settings button */}
      <button
        onClick={onOpenSettings}
        className="absolute top-4 right-4 z-20 touch-btn p-4 rounded-lg hover:bg-white/5 transition-colors"
        data-testid="settings-btn"
      >
        <Settings size={25} className="text-zinc-400 hover:text-white transition-colors" />
      </button>

      {/* Connection status */}
      <div className="absolute top-5 right-20 z-20 flex items-center gap-2">
        <Activity
          size={14}
          className={isConnected ? 'text-green-500 animate-pulse' : 'text-red-500'}
        />
        <span className={`text-xs uppercase tracking-wider font-orbitron ${isConnected ? 'text-zinc-500' : 'text-red-400'}`}>
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
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

        {/* TOP CENTER — hidden in fullscreen AA */}
        {!isFullscreenAA && (
          <div className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center pt-4">
            <ShiftLightsBar className="mb-3" />
            <DigitalSpeedGear className="mb-3" />
            <TurnSignalsRow className="mb-3" />
          </div>
        )}

        {/* GAUGES + CENTER PANEL */}
        {isFullscreenAA ? (
          /* Fullscreen AA — takes over screen */
          <div className="absolute inset-0 z-20">
            <AndroidAutoPanel isActive={true} onModeChange={handleAAModeChange} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-end justify-center pb-24 px-8">
            {/* LEFT: RPM */}
            <div className="relative flex items-end justify-center">
              <RpmGauge size={640} vtecStartRpm={3000} shiftRpm={7800} maxRpm={8000} />
            </div>

            {/* CENTER: AA panel (only when phone connected) or empty gap */}
            {showAAPanel ? (
              <div
                className="flex flex-col items-center justify-start mx-6 pt-10"
                style={{ width: '500px', height: '450px' }}
              >
                <AndroidAutoPanel isActive={dhuRunning} onModeChange={handleAAModeChange} />
              </div>
            ) : (
              <div className="mx-6" style={{ width: '500px' }} />
            )}

            {/* RIGHT: Speed */}
            <div className="relative flex items-end justify-center">
              <SpeedGauge size={640} maxSpeed={170} />
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
