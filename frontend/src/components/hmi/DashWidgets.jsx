import React, { useState, useEffect, memo } from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';
import { useSettingsSelector } from '../../contexts/SettingsContext';

// Each widget subscribes only to the signal it draws.
//
// These previously called useVehicleData(), which returns the whole
// signals object. Any field changing - battery voltage, intake air
// temp, a turn signal blink - re-rendered every widget in the tree.
// useVehicleSignal re-renders only when that one value changes, so
// the speed readout no longer redraws because coolant moved a tenth
// of a degree.

const LIGHT_COUNT = 7;

// Classic bar colour, unchanged.
const CLASSIC_GRADIENT =
  'radial-gradient(circle at 30% 30%, #FFCC4040 -20%, #FF6B35 60%, #E83A14 100%)';

// Sequential ramp stops: green through amber into red.
const RAMP_GREEN = [34, 197, 94];
const RAMP_AMBER = [251, 191, 36];
const RAMP_RED = [239, 68, 68];

const mix = (a, b, t) => a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));

/**
 * Colour for one LED by its position along the bar.
 *
 * First half ramps green into amber, second half amber into red, so
 * the bar reads as a progression toward redline rather than seven
 * identical lamps.
 */
const rampColor = (position, forceRed) => {
  if (forceRed) return RAMP_RED;
  if (position <= 0.5) return mix(RAMP_GREEN, RAMP_AMBER, position / 0.5);
  return mix(RAMP_AMBER, RAMP_RED, (position - 0.5) / 0.5);
};

const rgb = ([r, g, b], alpha) =>
  alpha === undefined ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;

// Shift lights bar
export const ShiftLightsBar = memo(({ className = '' }) => {
  const rpm = useVehicleSignal('rpm');

  // These three sliders live in Settings > Vehicle Parameters and,
  // until now, were saved and never read. The bar hardcoded a light
  // every 1000rpm starting at 1000, which meant lamps lit at idle,
  // and flashed at a hardcoded 7600 that matched no setting.
  const style = useSettingsSelector((s) => s.shift_light_style ?? 'classic');
  const yellowShift = useSettingsSelector((s) => Number(s.yellow_shift) || 7000);
  const redShift = useSettingsSelector((s) => Number(s.red_shift) || 7800);
  const redline = useSettingsSelector((s) => Number(s.redline) || 8500);

  const sequential = style === 'sequential';

  // Lamps span stage 1 up to the hard redline, so the first lights at
  // yellowShift and the last at redline.
  const span = Math.max(redline - yellowShift, 1);
  const step = span / (LIGHT_COUNT - 1);

  const thresholdFor = (index) => yellowShift + step * index;

  const getLightOpacity = (index) => {
    const threshold = thresholdFor(index);
    // Fade in over the gap between this lamp and the previous one.
    return Math.min(Math.max((rpm - threshold) / step + 1, 0), 1);
  };

  const isRedline = rpm >= redline;

  const [flashState, setFlashState] = useState(1);

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
      data-style={style}
    >
      {Array.from({ length: LIGHT_COUNT }, (_, i) => {
        const opacity = getLightOpacity(i);
        const position = i / (LIGHT_COUNT - 1);

        if (!sequential) {
          return (
            <div
              key={i}
              className="w-[28px] h-[28px] rounded-full transition-opacity duration-75"
              style={{
                opacity,
                background: CLASSIC_GRADIENT,
                boxShadow: opacity > 0.5
                  ? '0 0 16px 5px rgba(255, 107, 53, 0.6)'
                  : 'none',
              }}
            />
          );
        }

        // Anything at or past stage 2 is full red regardless of where
        // it sits on the ramp, so the slider stays meaningful.
        const color = rampColor(position, thresholdFor(i) >= redShift);

        return (
          <div
            key={i}
            className="w-[28px] h-[28px] rounded-full transition-opacity duration-75"
            style={{
              // Unlit lamps keep a dim tint of their own colour so the
              // bar reads as a bar rather than appearing out of thin
              // air one lamp at a time.
              background: `radial-gradient(circle at 30% 30%, ${rgb(color, 0.25 + opacity * 0.75)} -20%, ${rgb(color, 0.15 + opacity * 0.85)} 60%, ${rgb(color, 0.1 + opacity * 0.9)} 100%)`,
              opacity: 0.12 + opacity * 0.88,
              boxShadow: opacity > 0.5 ? `0 0 16px 5px ${rgb(color, 0.55)}` : 'none',
            }}
          />
        );
      })}
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
