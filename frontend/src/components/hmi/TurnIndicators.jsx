import React from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

const TurnIndicators = ({ visible = true }) => {
  // 1. Pulling live, high-speed telemetry from your Pub/Sub store
  // Assuming your backend sends these as 1 (On) or 0 (Off) pulsing at the relay rate
  const leftTurn = useVehicleSignal('leftTurn'); 
  const rightTurn = useVehicleSignal('rightTurn');
  const hazards = useVehicleSignal('hazards');

  if (!visible) return null;

  // 2. Hazards override individual signals (Both flash)
  const leftOn = leftTurn === 1 || hazards === 1;
  const rightOn = rightTurn === 1 || hazards === 1;

  return (
    <div className="flex items-center justify-between w-full h-full px-8 pointer-events-none">
      <Arrow direction="left" on={leftOn} />
      
      {/* Optional: You can put a logo or dead space in the middle here depending on layout */}
      <div className="flex-1" />

      <Arrow direction="right" on={rightOn} />
    </div>
  );
};

// The "Dumb" visual component Base44 built, but tuned for the track
const Arrow = ({ direction, on }) => {
  const isLeft = direction === 'left';
  const points = isLeft
    ? '60,10 10,40 60,70 60,52 90,52 90,28 60,28'
    : '30,10 80,40 30,70 30,52 0,52 0,28 30,28';

  // OEM Track-Car Piercing Green
  const activeColor = '#39FF14'; 
  const inactiveColor = 'transparent';
  const strokeInactive = 'rgba(255,255,255,0.08)';

  return (
    <div className="relative w-[90px] h-[80px]">
      {/* The LED Bloom Effect */}
      {on && (
        <div
          className="absolute inset-0 rounded-lg blur-[16px]"
          style={{
            background: `radial-gradient(circle, rgba(57,255,20,0.5) 0%, transparent 70%)`,
          }}
        />
      )}
      <svg viewBox="0 0 90 80" className="w-full h-full z-10 relative">
        <polygon
          points={points}
          style={{
            fill: on ? activeColor : inactiveColor,
            stroke: on ? activeColor : strokeInactive,
            strokeWidth: 2,
            filter: on ? `drop-shadow(0 0 12px rgba(57,255,20,0.9))` : 'none',
            // Mechanic's Note: transition "none" when ON for an instant LED snap. 
            // 75ms fade out when OFF so it doesn't look cheap.
            transition: on ? 'none' : 'fill 0.075s ease-out, stroke 0.075s ease-out, filter 0.075s ease-out',
          }}
        />
      </svg>
    </div>
  );
};

export default TurnIndicators;
