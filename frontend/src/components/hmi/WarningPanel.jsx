import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useVehicleSignal, useVehicleDataSelector } from '../../contexts/VehicleDataContext';

/**
 * RefactoredCriticalWarningBanner
 * - Top of screen indicator for critical warnings
 * - Subscribes to specific warning signals only
 */
export const CriticalWarningBanner = ({ 
  visible = true,
  className = ''
}) => {
  const checkEngine = useVehicleSignal('check_engine');
  const oilPressure = useVehicleSignal('oil_pressure_warning');
  const highCoolant = useVehicleSignal('high_coolant');

  if (!visible) return null;

  const hasWarning = checkEngine || oilPressure || highCoolant;
  const warnings = [
    checkEngine && 'CHECK ENGINE',
    oilPressure && 'LOW OIL PRESSURE',
    highCoolant && 'ENGINE OVERHEAT'
  ].filter(Boolean);

  if (!hasWarning) return null;

  return (
    <div 
      className={`w-full px-4 py-2 bg-red-950/80 border-b-2 border-red-600 flex items-center gap-3 ${className}`}
      data-testid="critical-warning-banner"
    >
      <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
      <div className="flex-1">
        <div className="font-orbitron text-sm font-bold text-red-400 uppercase tracking-wider">
          ⚠ CRITICAL
        </div>
        <div className="font-mono text-xs text-red-300">
          {warnings.join(' • ')}
        </div>
      </div>
    </div>
  );
};

/**
 * RefactoredTurnSignalsRow
 * - Left/Right turn indicators
 */
export const TurnSignalsRow = ({ 
  visible = true,
  className = ''
}) => {
  const turnLeft = useVehicleSignal('turn_left');
  const turnRight = useVehicleSignal('turn_right');

  if (!visible) return null;

  return (
    <div className={`flex items-center justify-between gap-8 ${className}`} data-testid="turn-signals">
      {/* Left */}
      <div 
        className="flex items-center gap-2"
        style={{
          opacity: turnLeft ? 1 : 0.2,
          transition: 'opacity 100ms'
        }}
      >
        <ChevronLeft size={32} className="text-green-400" />
        <ChevronLeft size={32} className="text-green-400 -ml-4" />
      </div>

      {/* Right */}
      <div 
        className="flex items-center gap-2"
        style={{
          opacity: turnRight ? 1 : 0.2,
          transition: 'opacity 100ms'
        }}
      >
        <ChevronRight size={32} className="text-green-400 -mr-4" />
        <ChevronRight size={32} className="text-green-400" />
      </div>
    </div>
  );
};

/**
 * RefactoredWarningPanel
 * - Secondary warnings display
 */
export const WarningPanel = ({ 
  visible = true,
  className = ''
}) => {
  const lowFuel = useVehicleSignal('low_fuel');
  const airbagWarning = useVehicleSignal('airbag_warning');
  const brakeWarning = useVehicleSignal('brake_warning');

  if (!visible) return null;

  const warnings = [
    { icon: '⛽', label: 'FUEL', active: lowFuel },
    { icon: '🛡️', label: 'AIRBAG', active: airbagWarning },
    { icon: '🛑', label: 'BRAKE', active: brakeWarning }
  ];

  return (
    <div className={`flex gap-4 ${className}`} data-testid="warning-panel">
      {warnings.map(w => (
        <div
          key={w.label}
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            background: w.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(24, 24, 27, 0.8)',
            border: w.active ? '1px solid #ef4444' : '1px solid #3f3f46'
          }}
        >
          <span className="text-lg">{w.icon}</span>
          <span className="text-xs uppercase tracking-wider font-orbitron" style={{ color: w.active ? '#ef4444' : '#71717a' }}>
            {w.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default { CriticalWarningBanner, TurnSignalsRow, WarningPanel };
