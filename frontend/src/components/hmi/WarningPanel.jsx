import React from 'react';
import { 
  AlertTriangle, 
  Droplet, 
  Thermometer, 
  Fuel, 
  CircleAlert,
  ShieldAlert,
  CircleDot
} from 'lucide-react';
import { useVehicleData } from '../../contexts/VehicleDataContext';

const WARNING_CONFIG = {
  check_engine: {
    icon: CircleAlert,
    label: 'CHECK ENGINE',
    color: '#EF4444',
    critical: true
  },
  oil_pressure_warning: {
    icon: Droplet,
    label: 'OIL PRESSURE',
    color: '#EF4444',
    critical: true
  },
  high_coolant: {
    icon: Thermometer,
    label: 'TEMP HIGH',
    color: '#EF4444',
    critical: true
  },
  low_fuel: {
    icon: Fuel,
    label: 'LOW FUEL',
    color: '#F59E0B',
    critical: false
  },
  maintenance: {
    icon: AlertTriangle,
    label: 'SERVICE',
    color: '#F59E0B',
    critical: false
  },
  brake_warning: {
    icon: CircleDot,
    label: 'BRAKE',
    color: '#EF4444',
    critical: true
  },
  abs_warning: {
    icon: ShieldAlert,
    label: 'ABS',
    color: '#F59E0B',
    critical: false
  }
};

export const WarningLight = ({ type, active, className = '' }) => {
  const config = WARNING_CONFIG[type];
  if (!config) return null;
  
  const Icon = config.icon;
  
  return (
    <div 
      className={`
        flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200
        ${className}
      `}
      style={{ opacity: active ? 1 : 0.35 }}
      data-testid={`warning-${type}`}
      data-active={active}
    >
      <Icon 
        size={32} 
        className={`
          warning-light
          ${active ? (config.critical ? 'critical' : 'active animate-pulse-glow') : ''}
        `}
        style={{ 
          color: active ? config.color : '#52525b',
          filter: active ? `drop-shadow(0 0 10px ${config.color})` : 'none'
        }}
      />
      <span 
        className="text-xs uppercase tracking-wider mt-2 font-medium font-orbitron"
        style={{ color: active ? config.color : '#52525b' }}
      >
        {config.label}
      </span>
    </div>
  );
};

// WARNING PANEL - MORE SPREAD OUT
export const WarningPanel = ({ className = '' }) => {
  const { signals } = useVehicleData();
  
  const warnings = [
    { type: 'check_engine', active: signals.check_engine },
    { type: 'oil_pressure_warning', active: signals.oil_pressure_warning },
    { type: 'high_coolant', active: signals.high_coolant },
    { type: 'low_fuel', active: signals.low_fuel },
    { type: 'maintenance', active: signals.maintenance },
    { type: 'brake_warning', active: signals.brake_warning },
    { type: 'abs_warning', active: signals.abs_warning },
  ];
  
  return (
    <div 
      className={`flex items-center justify-center ${className}`} 
      style={{ gap: '50px' }}
      data-testid="warning-panel"
    >
      {warnings.map(({ type, active }) => (
        <WarningLight key={type} type={type} active={active} />
      ))}
    </div>
  );
};

// Turn Signal Arrow — thick solid chevron, ALWAYS filled, never hollow
// Active: bright green with soft glow | Inactive: dim dark green
const TurnArrow = ({ direction, active }) => {
  const isLeft = direction === 'left';
  const filterId = `turn-glow-${direction}`;

  // Active: deep green fill with glow | Inactive: very dark green, still visible
  const fillColor = active ? '#2D8C4E' : '#152118';
  const strokeColor = active ? '#3DA864' : '#1e3326';

  // Original arrow shape — with shaft, always solid filled
  const chevronPath = 'M4 18 L20 4 L20 12 L44 12 L44 24 L20 24 L20 32 Z';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 80, height: 70 }}
    >
      {/* Soft bloom glow — always mounted, opacity toggled */}
      <div
        style={{
          position: 'absolute',
          inset: -12,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,140,78,0.55) 0%, rgba(45,140,78,0.12) 50%, transparent 75%)',
          filter: 'blur(18px)',
          opacity: active ? 1 : 0,
          transition: active ? 'opacity 0.02s' : 'opacity 0.12s ease-out',
          willChange: 'opacity',
          pointerEvents: 'none',
        }}
      />

      <svg
        width="72"
        height="52"
        viewBox="0 0 48 36"
        style={{
          transform: isLeft ? 'none' : 'scaleX(-1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <defs>
          <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.18
                      0 0 0 0 0.55
                      0 0 0 0 0.31
                      0 0 0 0.7 0"
              result="greenGlow"
            />
            <feMerge>
              <feMergeNode in="greenGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={chevronPath}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
          filter={active ? `url(#${filterId})` : 'none'}
        />
      </svg>
    </div>
  );
};

// Turn Signals Row — always visible, solid filled
export const TurnSignalsRow = ({ className = '' }) => {
  const { signals } = useVehicleData();

  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} data-testid="turn-signals">
      <TurnArrow direction="left" active={signals.turn_left} />
      <TurnArrow direction="right" active={signals.turn_right} />
    </div>
  );
};

export const CriticalWarningBanner = ({ className = '' }) => {
  const { criticalWarnings } = useVehicleData();
  
  if (!criticalWarnings.hasWarning) return null;
  
  const primaryWarning = criticalWarnings.warnings[0];
  
  return (
    <div 
      className={`
        absolute top-0 left-0 right-0 z-50
        py-3 px-6 flex items-center justify-center gap-3
        bg-red-950/90 border-b border-red-500/50
        animate-pulse-glow
        ${className}
      `}
      style={{ boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)' }}
      data-testid="critical-warning-banner"
    >
      <AlertTriangle className="text-red-500" size={24} />
      <span className="text-red-500 font-bold text-lg uppercase tracking-widest font-orbitron">
        {primaryWarning}
      </span>
      <AlertTriangle className="text-red-500" size={24} />
    </div>
  );
};

export default WarningPanel;
