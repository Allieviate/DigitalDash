import React, { useMemo } from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

/**
 * RpmGauge - Isolated RPM signal subscription (60Hz safe)
 * Accepts layout props: visible, faceImage, needleImage, tickImage, etc.
 * Uses absolute positioning and asset images from SettingsContext layout JSON
 */
export const RpmGauge = ({
  visible = true,
  className = '',
  size = 320,
  faceImage = '/assets/gauges/rpm-gauge.png',
  tickImage = '/assets/gauges/rpm-medium-ticks.png',
  numbersImage = '/assets/gauges/rpm-numbers.png',
  needleImage = '/assets/gauges/rpm-needle.png',
  centerImage = '/assets/gauges/rpm-needle-center.png',
  vtecStartRpm = 3000,
  shiftRpm = 7800,
  maxRpm = 8000,
  min = 0,
}) => {
  // 🎯 Single signal subscription - only updates when RPM changes
  const rpm = useVehicleSignal('rpm') || 0;

  if (!visible) return null;

  // Calculate needle rotation: -135° (0 RPM) to +135° (8000 RPM)
  const minAngle = -135;
  const maxAngle = 135;
  const clampedRpm = Math.min(Math.max(rpm, min), maxRpm);
  const needleAngle = minAngle + (clampedRpm / maxRpm) * (maxAngle - minAngle);

  const inVtec = rpm >= vtecStartRpm;
  const inShift = rpm >= shiftRpm;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      data-testid="rpm-gauge"
    >
      {/* Gauge face background */}
      <img
        src={faceImage}
        alt="RPM Gauge Face"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />

      {/* Tick marks layer */}
      <img
        src={tickImage}
        alt="RPM Ticks"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />

      {/* Numbers layer */}
      <img
        src={numbersImage}
        alt="RPM Numbers"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />

      {/* Shift light indicator (red dot at top) */}
      <div
        className={`absolute top-[5%] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full transition-opacity duration-150 ${
          inShift ? 'animate-pulse' : ''
        }`}
        style={{
          backgroundColor: '#DC2626',
          opacity: inShift ? 1 : 0,
          boxShadow: inShift ? '0 0 32px 8px rgba(220, 38, 38, 0.8)' : 'none',
        }}
        data-testid="rpm-shift-light"
      />

      {/* VTEC indicator (optional glow) */}
      {inVtec && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 20px rgba(220, 38, 38, 0.3)',
          }}
        />
      )}

      {/* Needle with rotation */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          paddingBottom: '23%',
        }}
      >
        <div
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '23%',
          }}
        >
          <img
            src={needleImage}
            alt="RPM Needle"
            className="w-[40%] object-contain"
            style={{ imageRendering: 'crisp-edges' }}
            draggable={false}
          />
        </div>
      </div>

      {/* Center cap */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={centerImage}
          alt="Needle Center"
          className="w-[12%] object-contain"
          style={{ imageRendering: 'crisp-edges' }}
          draggable={false}
        />
      </div>
    </div>
  );
};

/**
 * SpeedGauge - Isolated speed_mph signal subscription
 * Mirror of RpmGauge for vehicle speed display
 */
export const SpeedGauge = ({
  visible = true,
  className = '',
  size = 320,
  faceImage = '/assets/gauges/spd-gauge.png',
  tickImage = '/assets/gauges/spd-medium-ticks.png',
  numbersImage = '/assets/gauges/spd-numbers.png',
  needleImage = '/assets/gauges/rpm-needle.png',
  centerImage = '/assets/gauges/rpm-needle-center.png',
  maxSpeed = 170,
  min = 0,
}) => {
  // 🎯 Single signal subscription
  const speed = useVehicleSignal('speed_mph') || 0;

  if (!visible) return null;

  const minAngle = -135;
  const maxAngle = 135;
  const clampedSpeed = Math.min(Math.max(speed, min), maxSpeed);
  const needleAngle = minAngle + (clampedSpeed / maxSpeed) * (maxAngle - minAngle);

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      data-testid="speed-gauge"
    >
      <img
        src={faceImage}
        alt="Speed Gauge Face"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />

      <img
        src={tickImage}
        alt="Speed Ticks"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />

      <img
        src={numbersImage}
        alt="Speed Numbers"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          paddingBottom: '23%',
        }}
      >
        <div
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '23%',
          }}
        >
          <img
            src={needleImage}
            alt="Speed Needle"
            className="w-[40%] object-contain"
            style={{ imageRendering: 'crisp-edges' }}
            draggable={false}
          />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={centerImage}
          alt="Needle Center"
          className="w-[12%] object-contain"
          style={{ imageRendering: 'crisp-edges' }}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default { RpmGauge, SpeedGauge };
