import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSignalIsAvailable, useVehicleSignal } from '../../contexts/VehicleDataContext'; // The REAL wiring harness

// The Mechanic's Thresholds for a K24 Engine
const VITALS = [
  { key: 'coolant',    label: 'Coolant',   unit: '°F', warnAbove: 215, dangerAbove: 225 },
  { key: 'iat',        label: 'Intake Air', unit: '°F', warnAbove: 105, dangerAbove: 115 },
  { key: 'battery',    label: 'Battery',   unit: 'V',  warnBelow: 12.5, dangerBelow: 12.0 },
  { key: 'oilPressure', label: 'Oil Press',  unit: 'PSI', warnBelow: 25, dangerBelow: 15 },
];

function getColor(key, value) {
  const vital = VITALS.find(v => v.key === key);
  // No reading, no verdict. Colouring a missing value would put an
  // oil pressure sender that is not wired into the danger band.
  if (!vital || value === undefined || value === null) return '#ffffff';
  if (vital.dangerAbove  && value >= vital.dangerAbove)  return '#EF4444'; // Honda Red
  if (vital.warnAbove    && value >= vital.warnAbove)    return '#F59E0B'; // Amber Warning
  if (vital.dangerBelow  && value <= vital.dangerBelow)  return '#EF4444'; 
  if (vital.warnBelow    && value <= vital.warnBelow)    return '#F59E0B'; 
  return '#ffffff';
}

const cToF = (c) => (c * 9) / 5 + 32;

export default function DiagnosticsTab() {
  // ── Pulling directly from our Pub/Sub ECU Store ──
  //
  // This tab used to invent what it did not have: `?? 45` for oil,
  // `?? 14.2` for battery, `? : 195` for coolant, and intake air temp
  // computed from RPM as `77 + (rpm / 8000) * 36`. That last one is
  // the worst of them, because intake_air_temp_c is a real signal on
  // 0x661 - the tab was fabricating a number it could simply have
  // read. A diagnostics screen that makes numbers up is worse than no
  // diagnostics screen.
  const coolantC = useVehicleSignal('coolant_temp_c');
  const iatC = useVehicleSignal('intake_air_temp_c');
  const batteryV = useVehicleSignal('battery_voltage');
  const oilPsi = useVehicleSignal('oil_pressure_psi');

  const coolantLive = useSignalIsAvailable('coolant_temp_c');
  const iatLive = useSignalIsAvailable('intake_air_temp_c');
  const batteryLive = useSignalIsAvailable('battery_voltage');
  const oilLive = useSignalIsAvailable('oil_pressure_psi');

  const faultCodes = [];

  // null means "nothing behind this", and renders as dashes.
  const activeSignals = {
    coolant: coolantLive && coolantC != null ? cToF(coolantC) : null,
    iat: iatLive && iatC != null ? cToF(iatC) : null,
    battery: batteryLive ? batteryV ?? null : null,
    oilPressure: oilLive ? oilPsi ?? null : null,
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Vitals Grid ── */}
      <div className="grid grid-cols-2 gap-4">
        {VITALS.map(vital => {
          const value = activeSignals[vital.key];
          const color = getColor(vital.key, value);
          
          return (
            <div
              key={vital.key}
              style={{
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span style={{
                fontFamily: 'Helvetica Neue, sans-serif',
                fontSize: 9,
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
              }}>
                {vital.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1,
                  color,
                  letterSpacing: '-0.02em',
                  transition: 'color 0.4s ease',
                }}>
                  {/* Format Battery to 1 decimal, others to whole numbers */}
                  {value === null || value === undefined
                    ? '--'
                    : vital.key === 'battery'
                      ? Number(value).toFixed(1)
                      : Math.round(value)}
                </span>
                <span style={{
                  fontFamily: 'Helvetica Neue, sans-serif',
                  fontSize: 12,
                  color: '#CC0000',
                  letterSpacing: '0.08em',
                }}>
                  {vital.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ECU Diagnostics Panel ── */}
      <div
        style={{
          background: '#18181b',
          border: `1px solid ${faultCodes.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}`,
          borderRadius: 10,
          padding: '20px 24px',
          transition: 'border-color 0.4s ease',
        }}
      >
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'Helvetica Neue, sans-serif',
            fontSize: 9,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
          }}>
            ECU Diagnostics
          </span>
        </div>

        {faultCodes.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="#22C55E" />
            <span style={{
              fontFamily: 'Helvetica Neue, sans-serif',
              fontSize: 12,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#22C55E',
              textShadow: '0 0 12px rgba(34,197,94,0.6)',
            }}>
              No Active Faults — System Normal
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginBottom: 8 }}>
              <AlertTriangle size={16} color="#EF4444" />
              <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#EF4444' }}>
                {faultCodes.length} Active Fault{faultCodes.length > 1 ? 's' : ''}
              </span>
            </div>
            {faultCodes.map((code, i) => (
              <span key={i} style={{
                fontFamily: 'monospace',
                fontSize: 12,
                padding: '5px 12px',
                borderRadius: 4,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#FCA5A5',
                letterSpacing: '0.1em',
              }}>
                {code}
              </span>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
