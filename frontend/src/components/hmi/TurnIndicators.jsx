import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

/**
 * TurnIndicator - Individual left/right indicator
 */
const TurnIndicator = ({ direction, active, className = '' }) => {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  const color = '#10B981'; // Green

  return (
    <div
      className={`flex items-center justify-center p-2 rounded-lg transition-all duration-100 ${className}`}
      style={{
        opacity: active ? 1 : 0.2,
      }}
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
              }}
            />
            <Icon
              size={32}
              style={{
                color: active ? color : '#27272a',
                filter: active ? `drop-shadow(0 0 10px ${color})` : 'none',
                marginLeft: -16,
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
              }}
            />
            <Icon
              size={32}
              style={{
                color: active ? color : '#27272a',
                filter: active ? `drop-shadow(0 0 10px ${color})` : 'none',
                marginLeft: -16,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

/**
 * TurnIndicators - Left + Right turn display
 * Consumes: turn_left, turn_right signals
 */
export const TurnIndicators = ({
  visible = true,
  className = '',
}) => {
  // 🎯 Individual signal subscriptions
  const turnLeft = useVehicleSignal('turn_left');
  const turnRight = useVehicleSignal('turn_right');

  if (!visible) return null;

  return (
    <div
      className={`flex items-center justify-between w-full ${className}`}
      data-testid="turn-indicators"
    >
      <TurnIndicator direction="left" active={turnLeft} />
      <TurnIndicator direction="right" active={turnRight} />
    </div>
  );
};

export default TurnIndicators;
