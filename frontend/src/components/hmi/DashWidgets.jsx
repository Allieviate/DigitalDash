import React, { useState, useEffect, memo } from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

// Each widget subscribes only to the signal it draws.
//
// These previously called useVehicleData(), which returns the whole
// signals object. Any field changing - battery voltage, intake air
// temp, a turn signal blink - re-rendered every widget in the tree.
// useVehicleSignal re-renders only when that one value changes, so
// the speed readout no longer redraws because coolant moved a tenth
// of a degree.

// Shift lights bar - 7 LEDs, ORANGISH-RED color
export const ShiftLightsBar = memo(({ className = '' }) => {
  const rpm = useVehicleSignal('rpm');

  // Calculate opacity for each shift light based on RPM thresholds
  const getLightOpacity = (index) => {
    const threshold = (index + 1) * 1000;
    const opacity = Math.min(Math.max((rpm - threshold) / 1000, 0), 1);
    return opacity;
  };

  // Flash at redline (7600+ RPM)
  const [flashState, setFlashState] = useState(1);
  const isRedline = rpm >= 7600;

  useEffect(() => {
    if (!isRedline) {
      setFlashState(1);
      return;
    }

    const interval = setInterval(() => {
      setFlashState(prev => prev === 1 ? 0.3 : 1);
    }, 70);

    return () => clearInterval(interval);
  }, [isRedline]);

  return (
    <div 
      className={`flex items-center justify-center gap-3 ${className}`}
      style={{ opacity: isRedline ? flashState : 1 }}
      data-testid="shift-lights-bar"
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="w-[28px] h-[28px] rounded-full transition-opacity duration-75"
          style={{
            opacity: getLightOpacity(i),
            // ORANGISH-RED gradient
            background: 'radial-gradient(circle at 30% 30%, #FFCC4040 -20%, #FF6B35 60%, #E83A14 100%)',
            boxShadow: getLightOpacity(i) > 0.5 
              ? '0 0 16px 5px rgba(255, 107, 53, 0.6)' 
              : 'none'
          }}
        />
      ))}
    </div>
  );
});
ShiftLightsBar.displayName = 'ShiftLightsBar';

// Digital Speed display - Orbitron font
export const DigitalSpeed = memo(({ className = '' }) => {
  const speedRaw = useVehicleSignal('speed_mph');
  const speed = Math.round(speedRaw);

  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="digital-speed">
      <div
        className="font-orbitron font-medium text-white tracking-tight leading-none"
        style={{ fontSize: '72px' }}
      >
        {speed}
      </div>
      <div className="font-orbitron text-white/70 text-xl tracking-widest -mt-1">
        MPH
      </div>
    </div>
  );
});
DigitalSpeed.displayName = 'DigitalSpeed';

// Gear display - URUS LAMBORGHINI STYLE with Instant Pop, Slow Fade
export const GearDisplay = memo(({ className = '' }) => {
  const gear = useVehicleSignal('gear');
  const [lastGear, setLastGear] = useState(gear);
  const [flashType, setFlashType] = useState(null);

  const getGearText = (g) => { if (g === -1) return 'R'; if (g === 0) return 'N'; return String(g); };
  const getPrevGearText = (g) => { if (g === -1) return ' '; if (g === 0) return 'R'; if (g === 1) return 'N'; return String(g - 1); };
  const getNextGearText = (g) => { if (g === -1) return 'N'; if (g === 0) return '1'; if (g === 6) return ' '; return String(g + 1); };

  useEffect(() => {
    if (gear !== lastGear) {
      setFlashType(gear > lastGear ? 'up' : 'down');
      setLastGear(gear);
      const timer = setTimeout(() => setFlashType(null), 50);
      return () => clearTimeout(timer);
    }
  }, [gear, lastGear]);

  let gearFlashClass = "";
  let gearTransitionClass = "";
  if (flashType === 'up') {
    gearFlashClass = "text-white scale-125 drop-shadow-[0_0_30px_rgba(255,255,255,1)]";
    gearTransitionClass = "transition-none";
  } else if (flashType === 'down') {
    gearFlashClass = "text-red-500 scale-110 drop-shadow-[0_0_30px_rgba(255,0,0,1)]";
    gearTransitionClass = "transition-none";
  } else {
    gearFlashClass = "text-red-600 scale-100 drop-shadow-none";
    gearTransitionClass = "transition-all duration-300 ease-out";
  }

  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="gear-display">
      <div className="flex items-center justify-center" style={{ gap: '6px' }}>
        <span className="font-orbitron font-medium text-center" style={{ width: '40px', fontSize: '28px', color: 'white', opacity: 0.45 }}>
          {getPrevGearText(gear)}
        </span>
        <span
          className={`font-orbitron font-bold text-center ${gearFlashClass} ${gearTransitionClass}`}
          style={{ width: '60px', fontSize: '54px' }}
          data-testid="current-gear"
          data-flash-type={flashType || 'idle'}
        >
          {getGearText(gear)}
        </span>
        <span className="font-orbitron font-medium text-center" style={{ width: '40px', fontSize: '28px', color: 'white', opacity: 0.45 }}>
          {getNextGearText(gear)}
        </span>
      </div>
      <div className="font-orbitron text-white/70 text-base tracking-widest mt-2">
        GEAR
      </div>
    </div>
  );
});
GearDisplay.displayName = 'GearDisplay';

// Combined for backward compat
export const DigitalSpeedGear = ({ className = '' }) => (
  <div className={`flex flex-col items-center ${className}`} data-testid="digital-speed-gear">
    <DigitalSpeed className="mb-4" />
    <GearDisplay />
  </div>
);

export default ShiftLightsBar;
