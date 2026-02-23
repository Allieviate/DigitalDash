import React from 'react';
import {
  Fuel,
  Thermometer,
  Zap,
  Droplet,
  AlertCircle,
} from 'lucide-react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';
import { useSettings } from '../../contexts/SettingsContext';

/**
 * InfoGauge - Modular info tile for vertical/horizontal bar displays
 * Used for: Fuel, Coolant Temp, Battery, Oil Pressure, etc.
 */
const InfoGauge = ({
  visible = true,
  icon: Icon,
  label,
  value = 0,
  max = 100,
  unit = '',
  warning = false,
  danger = false,
  orientation = 'vertical', // 'vertical' or 'horizontal'
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  let barColor = '#0EA5E9'; // Default cyan
  if (danger) barColor = '#EF4444'; // Red
  else if (warning) barColor = '#F59E0B'; // Amber

  return (
    <div
      className={`flex ${
        orientation === 'vertical'
          ? 'flex-col items-center gap-2'
          : 'flex-row items-center gap-3'
      } ${className}`}
      data-testid={`info-gauge-${label}`}
    >
      {/* Icon */}
      <Icon
        size={18}
        style={{
          color: danger || warning ? barColor : '#71717a',
        }}
      />

      {orientation === 'vertical' ? (
        <>
          {/* Vertical bar container */}
          <div
            className="relative w-6 h-32 rounded-full overflow-hidden"
            style={{
              background: '#18181b',
              border: '1px solid #27272a',
            }}
          >
            {/* Fill */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
              style={{
                height: `${percentage}%`,
                background: barColor,
                boxShadow: `0 0 10px ${barColor}40`,
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
        </>
      ) : (
        <>
          {/* Horizontal layout */}
          <div className="flex-1">
            {/* Horizontal bar container */}
            <div
              className="relative h-3 rounded-full overflow-hidden mb-1"
              style={{
                background: '#18181b',
                border: '1px solid #27272a',
              }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-150"
                style={{
                  width: `${percentage}%`,
                  background: barColor,
                  boxShadow: `0 0 8px ${barColor}40`,
                }}
              />
            </div>

            {/* Value */}
            <div className="flex justify-between items-center text-xs">
              <span className="uppercase tracking-wider text-zinc-600">
                {label}
              </span>
              <span
                className="font-mono font-bold"
                style={{ color: danger || warning ? barColor : '#ffffff' }}
              >
                {Math.round(value)}
                {unit}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * FuelGauge - Fuel level indicator
 */
export const FuelGauge = ({ visible = true, className = '' }) => {
  const fuelPct = useVehicleSignal('fuel_pct') || 0;
  const lowFuel = fuelPct < 0.2;

  if (!visible) return null;

  return (
    <InfoGauge
      icon={Fuel}
      label="FUEL"
      value={fuelPct * 100}
      max={100}
      unit="%"
      danger={lowFuel}
      warning={fuelPct < 0.3}
      orientation="vertical"
      className={className}
    />
  );
};

/**
 * CoolantGauge - Engine coolant temperature
 */
export const CoolantGauge = ({ visible = true, className = '' }) => {
  const coolantTemp = useVehicleSignal('coolant_temp_c') || 0;
  const danger = coolantTemp > 100;
  const warning = coolantTemp > 90;

  if (!visible) return null;

  return (
    <InfoGauge
      icon={Thermometer}
      label="COOLANT"
      value={coolantTemp}
      max={120}
      unit="°C"
      danger={danger}
      warning={warning}
      orientation="vertical"
      className={className}
    />
  );
};

/**
 * BatteryGauge - Battery voltage
 */
export const BatteryGauge = ({ visible = true, className = '' }) => {
  const batteryVoltage = useVehicleSignal('battery_voltage') || 0;
  const danger = batteryVoltage < 11.5;
  const warning = batteryVoltage < 12;

  if (!visible) return null;

  return (
    <InfoGauge
      icon={Zap}
      label="BATTERY"
      value={batteryVoltage}
      max={15}
      unit="V"
      danger={danger}
      warning={warning}
      orientation="vertical"
      className={className}
    />
  );
};

/**
 * OilPressureGauge - Oil pressure indicator
 */
export const OilPressureGauge = ({ visible = true, className = '' }) => {
  const oilPressure = useVehicleSignal('oil_pressure_psi') || 0;
  const danger = oilPressure < 20;
  const warning = oilPressure < 30;

  if (!visible) return null;

  return (
    <InfoGauge
      icon={Droplet}
      label="OIL PRESSURE"
      value={oilPressure}
      max={80}
      unit="PSI"
      danger={danger}
      warning={warning}
      orientation="vertical"
      className={className}
    />
  );
};

export default {
  FuelGauge,
  CoolantGauge,
  BatteryGauge,
  OilPressureGauge,
  InfoGauge,
};
