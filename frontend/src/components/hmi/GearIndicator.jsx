import React from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

/**
 * GearIndicator - Modular gear display
 * Consumes only GEAR signal
 */
export const GearIndicator = ({
  visible = true,
  className = '',
  showPattern = true,
}) => {
  // 🎯 Single signal subscription
  const gear = useVehicleSignal('gear') || 0;

  if (!visible) return null;

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
          border: `2px solid ${
            isNeutral ? '#3f3f46' : '#DC2626'
          }`,
          boxShadow: isNeutral ? 'none' : '0 0 16px rgba(220, 38, 38, 0.6)',
        }}
      >
        <span
          className="font-mono text-5xl font-black transition-colors duration-150"
          style={{
            color: isReverse ? '#EF4444' : isNeutral ? '#71717a' : '#DC2626',
          }}
          data-testid="gear-value"
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
