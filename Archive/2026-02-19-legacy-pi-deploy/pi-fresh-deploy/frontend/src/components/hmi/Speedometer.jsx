import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';

export const Speedometer = ({ speed = 0, className = '' }) => {
  const { theme } = useTheme();
  const { settings } = useSettings();
  
  const displaySpeed = settings.units === 'metric' 
    ? Math.round(speed * 1.60934) 
    : Math.round(speed);
  
  const unit = settings.units === 'metric' ? 'KM/H' : 'MPH';
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} data-testid="speedometer">
      <div className="relative">
        {/* Speed value */}
        <span 
          className="font-mono text-8xl font-bold tracking-tighter"
          style={{ 
            color: theme.accent,
            textShadow: theme.glow 
          }}
          data-testid="speed-value"
        >
          {displaySpeed}
        </span>
      </div>
      
      {/* Unit label */}
      <span className="text-sm uppercase tracking-[0.3em] text-zinc-500 mt-2">
        {unit}
      </span>
    </div>
  );
};

export default Speedometer;
