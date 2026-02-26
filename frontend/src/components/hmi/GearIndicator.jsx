import React, { useEffect, useRef, useState } from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

/**
 * GearIndicator - Lamborghini Urus-style gear display with aggressive shift animations
 * Features: Scale pop + bloom effect on gear changes
 * - Upshift: White flash with 1.2x scale
 * - Downshift: Red flash with 1.1x scale
 */
export const GearIndicator = ({
  visible = true,
  className = '',
  showPattern = true,
}) => {
  // Single signal subscription for high performance
  const gear = useVehicleSignal('gear') || 0;
  
  // Track previous gear for shift direction detection
  const prevGearRef = useRef(gear);
  const [shiftState, setShiftState] = useState('IDLE'); // 'IDLE' | 'UPSHIFT' | 'DOWNSHIFT'

  const GEAR_LABELS = {
    '-1': 'R',
    '0': 'N',
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
  };

  const gearLabel = GEAR_LABELS[String(gear)] || 'N';
  const isNeutral = gear === 0;
  const isReverse = gear === -1;

  // Detect gear changes and trigger animations
  useEffect(() => {
    const previousGear = prevGearRef.current;
    
    if (gear !== previousGear) {
      // Determine shift direction
      if (gear > previousGear) {
        setShiftState('UPSHIFT');
      } else {
        setShiftState('DOWNSHIFT');
      }
      
      // Update previous gear reference
      prevGearRef.current = gear;
      
      // Auto-reset to IDLE after 250ms
      const timer = setTimeout(() => {
        setShiftState('IDLE');
      }, 250);
      
      return () => clearTimeout(timer);
    }
  }, [gear]);

  if (!visible) return null;

  // Get inline styles for the gear number - URUS STYLE
  const getGearStyle = () => {
    if (shiftState === 'UPSHIFT') {
      return {
        color: '#FFFFFF',
        transform: 'scale(1.2)',
        filter: 'drop-shadow(0 0 25px rgba(255,255,255,1)) drop-shadow(0 0 40px rgba(255,255,255,0.8))',
        transition: 'none',
      };
    }
    
    if (shiftState === 'DOWNSHIFT') {
      return {
        color: '#FF0000',
        transform: 'scale(1.1)',
        filter: 'drop-shadow(0 0 25px rgba(255,0,0,1)) drop-shadow(0 0 40px rgba(255,0,0,0.8))',
        transition: 'none',
      };
    }
    
    // IDLE state - normal appearance with transition for fade effect
    return {
      color: isReverse ? '#EF4444' : isNeutral ? '#71717a' : '#DC2626',
      transform: 'scale(1.0)',
      filter: 'none',
      transition: 'all 250ms ease-out',
    };
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      data-testid="gear-indicator"
    >
      {/* Gear pattern row */}
      {showPattern && (
        <div className="flex items-center gap-1 mb-2">
          {Object.values(GEAR_LABELS).map((g) => (
            <span
              key={g}
              className="text-xs font-medium transition-all duration-150"
              style={{
                color: gearLabel === g ? '#DC2626' : '#71717a',
                opacity: gearLabel === g ? 1 : 0.3,
              }}
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Main gear display box */}
      <div
        className="relative w-24 h-24 flex items-center justify-center rounded-lg transition-all duration-150"
        style={{
          background: 'rgba(24, 24, 27, 0.8)',
          border: `2px solid ${isNeutral ? '#3f3f46' : '#DC2626'}`,
          boxShadow: isNeutral ? 'none' : '0 0 16px rgba(220, 38, 38, 0.6)',
        }}
      >
        <span
          className="font-mono text-5xl font-black"
          style={getGearStyle()}
          data-testid="gear-value"
          data-shift-state={shiftState}
        >
          {gearLabel}
        </span>
      </div>

      {/* Label */}
      <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 mt-2">
        GEAR
      </span>
    </div>
  );
};

export default GearIndicator;
