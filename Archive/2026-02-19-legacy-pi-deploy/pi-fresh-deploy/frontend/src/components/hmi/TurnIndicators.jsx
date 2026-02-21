import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useVehicleData } from '../../contexts/VehicleDataContext';

export const TurnIndicator = ({ direction, active, className = '' }) => {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  const color = '#10B981'; // Green for turn signals
  
  return (
    <div 
      className={`
        flex items-center justify-center p-2 rounded-lg transition-all duration-100
        turn-signal
        ${active ? 'active' : ''}
        ${className}
      `}
      data-testid={`turn-${direction}`}
      data-active={active}
    >
      <div className="flex items-center">
        {direction === 'left' && (
          <>
            <Icon 
              size={32} 
              style={{ 
                color: active ? color : '#27272a',
                filter: active ? `drop-shadow(0 0 10px ${color})` : 'none',
                opacity: active ? 1 : 0.3
              }}
            />
            <Icon 
              size={32} 
              style={{ 
                color: active ? color : '#27272a',
                filter: active ? `drop-shadow(0 0 10px ${color})` : 'none',
                opacity: active ? 1 : 0.3,
                marginLeft: -16
              }}
            />
          </>
        )}
        {direction === 'right' && (
          <>
            <Icon 
              size={32} 
              style={{ 
                color: active ? color : '#27272a',
                filter: active ? `drop-shadow(0 0 10px ${color})` : 'none',
                opacity: active ? 1 : 0.3
              }}
            />
            <Icon 
              size={32} 
              style={{ 
                color: active ? color : '#27272a',
                filter: active ? `drop-shadow(0 0 10px ${color})` : 'none',
                opacity: active ? 1 : 0.3,
                marginLeft: -16
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export const TurnIndicators = ({ className = '' }) => {
  const { signals } = useVehicleData();
  
  return (
    <div className={`flex items-center justify-between w-full ${className}`} data-testid="turn-indicators">
      <TurnIndicator direction="left" active={signals.turn_left} />
      <TurnIndicator direction="right" active={signals.turn_right} />
    </div>
  );
};

export default TurnIndicators;
