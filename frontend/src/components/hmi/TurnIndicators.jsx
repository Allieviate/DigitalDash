import React from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

const TurnIndicators = ({ visible = true }) => {
  const leftTurn = useVehicleSignal('turn_left'); 
  const rightTurn = useVehicleSignal('turn_right');
  const hazards = false;

  if (!visible) return null;

  const leftOn = leftTurn === true || leftTurn === 1 || hazards;
  const rightOn = rightTurn === true || rightTurn === 1 || hazards;

  return (
    <div className="flex items-center justify-between w-full h-full px-8 pointer-events-none">
      <Arrow direction="left" on={leftOn} />
      <div className="flex-1" />
      <Arrow direction="right" on={rightOn} />
    </div>
  );
};

const Arrow = ({ direction, on }) => {
  const isLeft = direction === 'left';
  const points = isLeft
    ? '60,10 10,40 60,70 60,52 90,52 90,28 60,28'
    : '30,10 80,40 30,70 30,52 0,52 0,28 30,28';

  const activeColor = '#39FF14';
  const strokeInactive = 'rgba(255,255,255,0.08)';
  const filterId = `glow-${direction}`;

  return (
    <div
      data-testid={`turn-signal-${direction}`}
      style={{
        position: 'relative',
        width: 90,
        height: 80,
      }}
    >
      {/* Bloom glow layer — ALWAYS MOUNTED, opacity toggled for reliable rendering */}
      <div
        style={{
          position: 'absolute',
          inset: -8,
          borderRadius: 12,
          background: 'radial-gradient(circle, rgba(57,255,20,0.55) 0%, rgba(57,255,20,0.15) 40%, transparent 70%)',
          filter: 'blur(14px)',
          opacity: on ? 1 : 0,
          transition: on ? 'opacity 0.02s' : 'opacity 0.08s ease-out',
          willChange: 'opacity',
          pointerEvents: 'none',
        }}
      />

      <svg
        viewBox="0 0 90 80"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.22
                      0 0 0 0 1
                      0 0 0 0 0.08
                      0 0 0 0.9 0"
              result="greenGlow"
            />
            <feMerge>
              <feMergeNode in="greenGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polygon
          points={points}
          style={{
            fill: on ? activeColor : 'transparent',
            stroke: on ? activeColor : strokeInactive,
            strokeWidth: 2,
            filter: on ? `url(#${filterId})` : 'none',
            transition: on ? 'none' : 'fill 0.075s ease-out, stroke 0.075s ease-out',
          }}
        />
      </svg>
    </div>
  );
};

export default TurnIndicators;
