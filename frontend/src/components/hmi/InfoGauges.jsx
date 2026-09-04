import React from 'react';
import {
  Fuel,
  Thermometer,
  Zap,
  Droplet,
  AlertCircle,
} from 'lucide-react';
import { useSignalIsAvailable, useVehicleSignal } from '../../contexts/VehicleDataContext';
import { useSettingsSelector } from '../../contexts/SettingsContext';

/**
 * InfoGauge - Modular info tile for vertical/horizontal bar displays
 * Used for: Fuel, Coolant Temp, Battery, Oil Pressure, etc.
 */
const InfoGauge = ({
  available = true,
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
  // Nothing behind this gauge: no bar, dashes instead of a number, and
  // no warning colour. The danger band especially has to go - an oil
  // pressure sender that is not wired yet reads as 0 PSI, and 0 PSI is
  // exactly what a spun bearing looks like. A red lamp for a sender
  // that does not exist teaches you to ignore the red lamp.
  const percentage = available
    ? Math.min(Math.max((value / max) * 100, 0), 100)
    : 0;

  let barColor = '#0EA5E9'; // Default cyan
  if (!available) barColor = '#3f3f46'; // Zinc: present, but saying nothing
  else if (danger) barColor = '#EF4444'; // Red
  else if (warning) barColor = '#F59E0B'; // Amber

  const alert = available && (danger || warning);
  const valueText = available ? Math.round(value) : '--';

  return (
    <div
      className={`flex ${
        orientation === 'vertical'
          ? 'flex-col items-center gap-2'
          : 'flex-row items-center gap-3'
      } ${className}`}
      data-testid={`info-gauge-${label}`}
      data-available={available}
      style={{ opacity: available ? 1 : 0.45 }}
      title={available ? undefined : `${label}: no signal`}
    >
      {/* Icon */}
      <Icon
        size={16}
        style={{
          color: alert ? barColor : '#52525b',
        }}
      />

      {orientation === 'vertical' ? (
        <>
          {/* Vertical bar container */}
          <div
            className="relative w-3 h-28 rounded-full overflow-hidden"
            style={{
              background: '#0c0c0e',
              border: '1px solid #27272a',
            }}
          >
            {/* Fill */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
              style={{
                height: `${percentage}%`,
                background: `linear-gradient(to top, ${barColor}, ${barColor}cc)`,
                boxShadow: `0 0 8px ${barColor}50, inset 0 0 4px ${barColor}30`,
              }}
            />

            {/* Tick marks */}
            {[25, 50, 75].map((tick) => (
              <div
                key={tick}
                className="absolute left-0 right-0 h-px"
                style={{ bottom: `${tick}%`, background: '#27272a' }}
              />
            ))}
          </div>

          {/* Value */}
          <div className="text-center">
            <span
              className="font-orbitron text-sm font-bold"
              style={{ color: alert ? barColor : '#e4e4e7' }}
            >
              {valueText}
            </span>
            {available && (
              <span className="text-zinc-600 text-[10px] ml-0.5">{unit}</span>
            )}
          </div>

          {/* Label */}
          <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-orbitron">
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
                style={{ color: alert ? barColor : '#ffffff' }}
              >
                {valueText}
                {available ? unit : ''}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Should this gauge be drawn at all?
 *
 * Two independent questions, and it matters that they stay separate:
 *
 *   visibility  - your choice. A gauge switched off in settings is
 *                 gone, whether or not its signal exists.
 *   availability - the car's answer. A gauge left on but with nothing
 *                 behind it renders dimmed with dashes, and comes
 *                 alive on its own the moment data arrives.
 *
 * The selector returns a boolean rather than the gauge_visibility
 * object, because useSyncExternalStore compares snapshots by identity
 * and a fresh object each check would re-render forever.
 */
const useGaugeVisible = (key, override) => {
  const enabled = useSettingsSelector((s) => s.gauge_visibility?.[key] !== false);
  return override ?? enabled;
};

/**
 * FuelGauge - Fuel level indicator
 *
 * fuel_pct has no source until a sender is wired into a KPro analog
 * input, so on the car as it stands this sits dimmed.
 */
export const FuelGauge = ({ visible, className = '' }) => {
  const fuelPct = useVehicleSignal('fuel_pct') ?? 0;
  const available = useSignalIsAvailable('fuel_pct');
  const shown = useGaugeVisible('fuel', visible);

  if (!shown) return null;

  return (
    <InfoGauge
      icon={Fuel}
      label="FUEL"
      available={available}
      value={fuelPct * 100}
      max={100}
      unit="%"
      danger={fuelPct < 0.2}
      warning={fuelPct < 0.3}
      orientation="vertical"
      className={className}
    />
  );
};

/**
 * CoolantGauge - Engine coolant temperature
 */
export const CoolantGauge = ({ visible, className = '' }) => {
  const coolantTemp = useVehicleSignal('coolant_temp_c') ?? 0;
  const available = useSignalIsAvailable('coolant_temp_c');
  const shown = useGaugeVisible('coolant', visible);

  if (!shown) return null;

  return (
    <InfoGauge
      icon={Thermometer}
      label="COOLANT"
      available={available}
      value={coolantTemp}
      max={120}
      unit="°C"
      danger={coolantTemp > 100}
      warning={coolantTemp > 90}
      orientation="vertical"
      className={className}
    />
  );
};

/**
 * BatteryGauge - Battery voltage
 */
export const BatteryGauge = ({ visible, className = '' }) => {
  const batteryVoltage = useVehicleSignal('battery_voltage') ?? 0;
  const available = useSignalIsAvailable('battery_voltage');
  const shown = useGaugeVisible('battery', visible);

  if (!shown) return null;

  return (
    <InfoGauge
      icon={Zap}
      label="BATTERY"
      available={available}
      value={batteryVoltage}
      max={15}
      unit="V"
      danger={batteryVoltage < 11.5}
      warning={batteryVoltage < 12}
      orientation="vertical"
      className={className}
    />
  );
};

/**
 * OilPressureGauge - Oil pressure indicator
 *
 * The gauge this whole change exists for. oil_pressure_psi has no
 * source until a sender is wired into a KPro analog input, and the
 * backend model default is 40 PSI - so before this it drew a
 * confident, healthy 40 PSI on a car with nothing plumbed in. The
 * `|| 0` here was worse still: it turned a missing reading into 0 PSI,
 * sitting in the danger band, which is what a spun bearing looks like.
 */
export const OilPressureGauge = ({ visible, className = '' }) => {
  const oilPressure = useVehicleSignal('oil_pressure_psi') ?? 0;
  const available = useSignalIsAvailable('oil_pressure_psi');
  const shown = useGaugeVisible('oil_pressure', visible);

  if (!shown) return null;

  return (
    <InfoGauge
      icon={Droplet}
      label="OIL PRESSURE"
      available={available}
      value={oilPressure}
      max={80}
      unit="PSI"
      danger={oilPressure < 20}
      warning={oilPressure < 30}
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
