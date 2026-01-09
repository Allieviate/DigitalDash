import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const GEAR_LABELS = {
  '-1': 'R',
  '0': 'N',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6'
};

export const GearIndicator = ({ gear = 0, className = '' }) => {
  const { theme } = useTheme();
  const gearLabel = GEAR_LABELS[String(gear)] || 'N';
  const isNeutral = gear === 0;
  const isReverse = gear === -1;
  
  return (
    <div 
      className={`flex flex-col items-center justify-center ${className}`}
      data-testid="gear-indicator"
    >
      {/* Gear pattern display */}
      <div className="flex items-center gap-1 mb-2">
        {['R', 'N', '1', '2', '3', '4', '5', '6'].map((g, i) => {
          const isActive = gearLabel === g;
          return (
            <span
              key={g}
              className={`
                text-xs font-medium transition-all duration-150
                ${isActive 
                  ? 'opacity-100' 
                  : 'opacity-20'
                }
              `}
              style={{ 
                color: isActive ? theme.accent : '#71717a',
                textShadow: isActive ? theme.glow : 'none'
              }}
            >
              {g}
            </span>
          );
        })}
      </div>
      
      {/* Main gear display */}
      <div 
        className="relative w-24 h-24 flex items-center justify-center"
        style={{
          background: 'rgba(24, 24, 27, 0.8)',
          borderRadius: '12px',
          border: `2px solid ${isNeutral ? '#3f3f46' : theme.accent}`,
          boxShadow: isNeutral ? 'none' : theme.glow
        }}
      >
        <span 
          className="font-mono text-5xl font-black"
          style={{ 
            color: isReverse ? '#EF4444' : (isNeutral ? '#71717a' : theme.accent),
            textShadow: isNeutral ? 'none' : theme.glow
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
