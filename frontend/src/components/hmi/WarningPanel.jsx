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
        ${active ? 'opacity-100' : 'opacity-20'}
        ${className}
      `}
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
          color: active ? config.color : '#3f3f46',
          filter: active ? `drop-shadow(0 0 10px ${config.color})` : 'none'
        }}
      />
      <span 
        className="text-xs uppercase tracking-wider mt-2 font-medium font-orbitron"
        style={{ color: active ? config.color : '#3f3f46' }}
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
      style={{ gap: '40px' }}
      data-testid="warning-panel"
    >
      {warnings.map(({ type, active }) => (
        <WarningLight key={type} type={type} active={active} />
      ))}
    </div>
  );
};

// Turn Signal Arrow SVG Component - Clean automotive style
const TurnArrow = ({ direction, active }) => {
  const color = active ? '#28D86A' : '#3f3f46';
  const isLeft = direction === 'left';
  
  return (
    <svg 
      width="60" 
      height="44" 
      viewBox="0 0 48 36"
      style={{ 
        transform: isLeft ? 'scaleX(-1)' : 'none',
        filter: active ? `drop-shadow(0 0 10px ${color})` : 'none',
        transition: 'all 0.1s ease'
      }}
    >
      {/* Arrow shape - clean automotive style */}
      <path 
        d="M4 18 L20 4 L20 12 L44 12 L44 24 L20 24 L20 32 Z"
        fill={color}
        stroke={active ? '#3AD87A' : 'transparent'}
        strokeWidth="1"
      />
    </svg>
  );
};

// Turn Signals Row - Using clean arrow design (LEFT points left, RIGHT points right)
export const TurnSignalsRow = ({ className = '' }) => {
  const { signals } = useVehicleData();
  
  return (
    <div className={`flex items-center justify-center gap-16 ${className}`} data-testid="turn-signals">
      <div 
        className={`transition-opacity duration-100 ${signals.turn_left ? 'opacity-100' : 'opacity-25'}`}
      >
        <TurnArrow direction="right" active={signals.turn_left} />
      </div>
      <div 
        className={`transition-opacity duration-100 ${signals.turn_right ? 'opacity-100' : 'opacity-25'}`}
      >
        <TurnArrow direction="left" active={signals.turn_right} />
      </div>
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
