import React from 'react';
import { Fuel, Thermometer, Zap, Droplet } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { useSettings } from '../../contexts/SettingsContext';

const VerticalBar = ({ 
  value, 
  max, 
  label, 
  icon: Icon, 
  unit = '',
  warning = false,
  danger = false,
  className = '' 
}) => {
  const { theme } = useTheme();
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  let barColor = theme.accent;
  if (danger) barColor = '#EF4444';
  else if (warning) barColor = '#F59E0B';
  
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Icon */}
      <Icon 
        size={18} 
        className="text-zinc-500"
        style={{ color: danger || warning ? barColor : '#71717a' }}
      />
      
      {/* Vertical bar container */}
      <div 
        className="relative w-6 h-32 rounded-full overflow-hidden"
        style={{ background: '#18181b', border: '1px solid #27272a' }}
      >
        {/* Fill */}
        <div 
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
          style={{ 
            height: `${percentage}%`,
            background: barColor,
            boxShadow: `0 0 10px ${barColor}40`
          }}
        />
        
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <div 
            key={tick}
            className="absolute left-0 right-0 h-px bg-zinc-700"
            style={{ bottom: `${tick}%` }}
          />
        ))}
      </div>
      
      {/* Value */}
      <div className="text-center">
        <span 
          className="font-mono text-lg font-bold"
          style={{ color: danger || warning ? barColor : '#ffffff' }}
        >
          {Math.round(value)}
        </span>
        <span className="text-zinc-500 text-xs ml-0.5">{unit}</span>
      </div>
      
      {/* Label */}
      <span className="text-[10px] uppercase tracking-wider text-zinc-600">
        {label}
      </span>
    </div>
  );
};

const HorizontalBar = ({ 
  value, 
  max, 
  label, 
  icon: Icon,
  warning = false,
  danger = false,
  inverted = false,
  className = '' 
}) => {
  const { theme } = useTheme();
  let percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  let barColor = theme.accent;
  if (danger) barColor = '#EF4444';
  else if (warning) barColor = '#F59E0B';
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Icon 
        size={20} 
        style={{ color: danger || warning ? barColor : '#71717a' }}
      />
      
      <div className="flex-1">
        {/* Bar container */}
        <div 
          className="relative h-3 rounded-full overflow-hidden mb-1"
          style={{ background: '#18181b', border: '1px solid #27272a' }}
        >
          {/* Fill */}
          <div 
            className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-150"
            style={{ 
              width: `${percentage}%`,
              background: barColor,
              boxShadow: `0 0 8px ${barColor}40`
            }}
          />
        </div>
        
        {/* Label and value */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">
            {label}
          </span>
          <span 
            className="font-mono text-sm font-medium"
            style={{ color: danger || warning ? barColor : '#ffffff' }}
          >
            {Math.round(value)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const FuelGauge = ({ className = '' }) => {
  const { signals } = useVehicleData();
  const fuelPercent = signals.fuel_pct * 100;
  
  return (
    <HorizontalBar 
      value={fuelPercent}
      max={100}
      label="Fuel"
      icon={Fuel}
      warning={fuelPercent <= 20}
      danger={fuelPercent <= 10}
      className={className}
    />
  );
};

export const CoolantGauge = ({ className = '' }) => {
  const { signals } = useVehicleData();
  const { settings } = useSettings();
  const temp = settings.units === 'metric' 
    ? signals.coolant_temp_c 
    : (signals.coolant_temp_c * 9/5 + 32);
  const max = settings.units === 'metric' ? 120 : 250;
  const unit = settings.units === 'metric' ? '°C' : '°F';
  
  return (
    <VerticalBar 
      value={temp}
      max={max}
      label="Coolant"
      icon={Thermometer}
      unit={unit}
      warning={signals.coolant_temp_c >= 95}
      danger={signals.high_coolant}
      className={className}
    />
  );
};

export const BatteryGauge = ({ className = '' }) => {
  const { signals } = useVehicleData();
  
  return (
    <VerticalBar 
      value={signals.battery_voltage}
      max={15}
      label="Battery"
      icon={Zap}
      unit="V"
      warning={signals.battery_voltage < 12.0}
      danger={signals.battery_voltage < 11.5}
      className={className}
    />
  );
};

export const OilPressureGauge = ({ className = '' }) => {
  const { signals } = useVehicleData();
  
  return (
    <VerticalBar 
      value={signals.oil_pressure_psi}
      max={80}
      label="Oil"
      icon={Droplet}
      unit="PSI"
      warning={signals.oil_pressure_psi < 20}
      danger={signals.oil_pressure_warning}
      className={className}
    />
  );
};

export const InfoGaugesPanel = ({ className = '' }) => {
  return (
    <div className={`grid grid-cols-4 gap-4 ${className}`} data-testid="info-gauges">
      <CoolantGauge />
      <OilPressureGauge />
      <BatteryGauge />
      <div className="flex flex-col justify-end">
        <FuelGauge />
      </div>
    </div>
  );
};

export default InfoGaugesPanel;
