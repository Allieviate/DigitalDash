import React, { useState, useEffect } from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

/**
 * ShiftLightsBar - Modular shift light LEDs
 * Consumes only RPM signal
 * 7 LED indicators that light up progressively with RPM
 */
export const ShiftLightsBar = ({
  visible = true,
  className = '',
  lightCount = 7,
  thresholdPerLight = 1000,
  redlineRpm = 7600,
}) => {
  // 🎯 Single signal subscription
  const rpm = useVehicleSignal('rpm') || 0;

  if (!visible) return null;

  const getLightOpacity = (index) => {
    const threshold = (index + 1) * thresholdPerLight;
    return Math.min(Math.max((rpm - threshold) / 1000, 0), 1);
  };

  const [flashState, setFlashState] = useState(1);
  const isRedline = rpm >= redlineRpm;

  useEffect(() => {
    if (!isRedline) {
      setFlashState(1);
      return;
    }
    const interval = setInterval(() => {
      setFlashState((prev) => (prev === 1 ? 0.3 : 1));
    }, 70);
    return () => clearInterval(interval);
  }, [isRedline]);

  return (
    <div
      className={`flex items-center justify-center gap-2 ${className}`}
      style={{ opacity: isRedline ? flashState : 1 }}
      data-testid="shift-lights-bar"
    >
      {Array.from({ length: lightCount }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-opacity duration-75"
          style={{
            width: '24px',
            height: '24px',
            opacity: getLightOpacity(i),
            background: 'radial-gradient(circle at 30% 30%, #FFCC4040 -20%, #FF6B35 60%, #E83A14 100%)',
            boxShadow:
              getLightOpacity(i) > 0.5
                ? '0 0 14px 4px rgba(255, 107, 53, 0.6)'
                : 'none',
          }}
          data-testid={`shift-light-${i}`}
        />
      ))}
    </div>
  );
};

/**
 * DigitalSpeedGear - Modular speed + gear display
 * URUS-style Lamborghini speedometer look with Orbitron font
 * Consumes RPM, SPEED, GEAR signals independently
 */
export const DigitalSpeedGear = ({
  visible = true,
  className = '',
  showGearPattern = true,
}) => {
  // 🎯 Three independent signal subscriptions (each triggers on their value only)
  const rpm = useVehicleSignal('rpm') || 0;
  const speed = useVehicleSignal('speed_mph') || 0;
  const gear = useVehicleSignal('gear') || 0;

  if (!visible) return null;

  const [lastGear, setLastGear] = useState(gear);
  const [flashType, setFlashType] = useState(null);

  const getGearText = (g) => {
    if (g === -1) return 'R';
    if (g === 0) return 'N';
    return String(g);
  };

  // Detect gear changes for animation
  useEffect(() => {
    if (gear !== lastGear) {
      setFlashType(gear > lastGear ? 'upshift' : 'downshift');
      setLastGear(gear);
      const timeout = setTimeout(() => setFlashType(null), 300);
      return () => clearTimeout(timeout);
    }
  }, [gear, lastGear]);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      data-testid="digital-speed-gear"
    >
      {/* Speed Display */}
      <div className="text-center">
        <div className="font-orbitron text-4xl font-black text-white">
          {Math.round(speed)}
        </div>
        <span className="text-xs uppercase tracking-wider text-zinc-400">MPH</span>
      </div>

      {/* Gear Display */}
      <div
        className="relative w-16 h-16 flex items-center justify-center rounded-lg transition-all duration-100"
        style={{
          background: 'rgba(24, 24, 27, 0.8)',
          border: `2px solid ${gear === 0 ? '#3f3f46' : '#DC2626'}`,
          boxShadow: gear === 0 ? 'none' : '0 0 16px rgba(220, 38, 38, 0.6)',
        }}
      >
        <span
          className={`font-orbitron text-3xl font-black transition-all duration-100 ${
            flashType ? 'animate-pulse' : ''
          }`}
          style={{
            color:
              gear === -1 ? '#EF4444' : gear === 0 ? '#71717a' : '#DC2626',
          }}
        >
          {getGearText(gear)}
        </span>
      </div>

      {/* Gear Pattern Row */}
      {showGearPattern && (
        <div className="flex items-center gap-1">
          {['R', 'N', '1', '2', '3', '4', '5', '6'].map((g) => (
            <span
              key={g}
              className="text-xs font-medium transition-all"
              style={{
                color: getGearText(gear) === g ? '#DC2626' : '#3f3f46',
                opacity: getGearText(gear) === g ? 1 : 0.3,
              }}
            >
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default { ShiftLightsBar, DigitalSpeedGear };
