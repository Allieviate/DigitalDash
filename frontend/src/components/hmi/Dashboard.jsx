import React, { useMemo } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';
import { RpmGauge, SpeedGauge } from './CustomGauges';
import { ShiftLightsBar, DigitalSpeedGear } from './DashWidgets';
import { CriticalWarningBanner, TurnSignalsRow, WarningPanel } from './WarningPanel';
import { AndroidAutoPanel } from './AndroidAutoPanel';
import { Settings } from 'lucide-react';

/**
 * Dynamic Widget Renderer
 * Maps layout.widgetType to actual React components
 */
const WidgetRegistry = {
  RpmGauge,
  SpeedGauge,
  ShiftLightsBar,
  DigitalSpeedGear,
  CriticalWarningBanner,
  TurnSignalsRow,
  WarningPanel,
  AndroidAutoPanel
};

/**
 * Refactored Dashboard.jsx - Master Layout Grid
 * 
 * Architecture:
 * 1. Reads layout array from SettingsContext
 * 2. Iterates through widgets
 * 3. Renders each widget based on type, passing layout props
 * 4. Applies absolute positioning or CSS Grid
 * 5. Respects visibility flag from layout
 * 
 * Performance:
 * - Only subscribed signals trigger re-renders (useSyncExternalStore)
 * - 60Hz telemetry updates don't re-render layout config
 * - Individual components use useVehicleSignal() for targeted updates
 */
export const Dashboard = ({ onOpenSettings }) => {
  const { settings } = useSettings();
  const speed = useVehicleSignal('speed_mph') || 0;

  // Background gradient transitions from gray to red above ~85 mph
  const redIntensity = Math.min(Math.max((speed - 85) / 35, 0), 1);

  const getBgGradient = useMemo(() => {
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
  }, [speed, redIntensity]);

  const getBreathingOverlay = useMemo(() => {
    if (speed <= 85) {
      return 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(60, 60, 60, 0.1) 0%, transparent 70%)';
    }
    const opacity = 0.1 + (0.1 * redIntensity);
    return `radial-gradient(ellipse 100% 80% at 50% 50%, rgba(${80 + 40 * redIntensity}, ${20 - 10 * redIntensity}, ${20 - 10 * redIntensity}, ${opacity}) 0%, transparent 70%)`;
  }, [speed, redIntensity]);

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-black"
      data-testid="dashboard"
      style={{ background: getBgGradient }}
    >
      {/* Animated Breathing Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: getBreathingOverlay,
          animation: 'breathing 4s ease-in-out infinite'
        }}
      />

      {/* Widget Container - Absolute Positioning */}
      <div className="relative w-full h-full">
        {settings.layout && settings.layout.map((widget) => {
          if (!widget.visible) return null;

          const Component = WidgetRegistry[widget.type];
          if (!Component) {
            console.warn(`Unknown widget type: ${widget.type}`);
            return null;
          }

          // Convert percentage positions to pixel values for 1920x1200 screen
          const pixelX = (widget.x / 100) * 1920;
          const pixelY = (widget.y / 100) * 1200;
          const pixelWidth = (widget.width / 100) * 1920;
          const pixelHeight = (widget.height / 100) * 1200;

          return (
            <div
              key={widget.id}
              className="absolute"
              style={{
                left: `${pixelX}px`,
                top: `${pixelY}px`,
                width: `${pixelWidth}px`,
                height: `${pixelHeight}px`,
                zIndex: widget.zIndex || 10
              }}
              data-testid={`widget-${widget.id}`}
            >
              <Component 
                visible={widget.visible}
                // Spread layout-specific props to component
                {...widget}
                // Override className to avoid conflicts
                className="w-full h-full flex items-center justify-center"
              />
            </div>
          );
        })}
      </div>

      {/* Settings Button (Fixed Position) */}
      <button
        onClick={onOpenSettings}
        className="absolute bottom-4 right-4 p-3 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 transition-colors z-50 flex items-center gap-2"
        data-testid="settings-button"
      >
        <Settings size={20} className="text-zinc-300" />
        <span className="text-xs uppercase font-orbitron tracking-wider text-zinc-400">Settings</span>
      </button>

      {/* CSS Animation for breathing effect */}
      <style>{`
        @keyframes breathing {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
