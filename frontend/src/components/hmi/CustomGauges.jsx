import React from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

/**
 * RefactoredRpmGauge
 * - Consumes only RPM signal via useVehicleSignal('rpm')
 * - Accepts faceImage, needleImage, centerImage from layout JSON
 * - Supports dynamic sizing and positioning via layout props
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
  min = 0
}) => {
  // ✅ Single signal subscription (60Hz safe on Pi)
  const rpm = useVehicleSignal('rpm') || 0;

  if (!visible) return null;

  // Calculate needle angle: 0 RPM = -135deg, 8000 RPM = +135deg (270° sweep)
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
      {/* Background gauge face */}
      <img 
        src={faceImage}
        alt="RPM Gauge"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />
      
      {/* Tick marks */}
      <img 
        src={tickImage}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />
      
      {/* Numbers */}
      <img 
        src={numbersImage}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />
      
      {/* Shift light (redline indicator) */}
      <div 
        className={`absolute top-[5%] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full transition-opacity duration-150 ${inShift ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: '#FF0000',
          opacity: inShift ? 1 : 0,
          boxShadow: inShift ? '0 0 32px 8px rgba(255, 0, 0, 0.8)' : 'none'
        }}
        data-testid="rpm-shift-light"
      />
      
      {/* Needle with rotation */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingBottom: '23%', transform: `rotate(${needleAngle}deg)`, transformOrigin: 'center' }}
      >
        <img 
          src={needleImage}
          alt="Needle"
          className="w-[40%] object-contain"
          style={{ imageRendering: 'crisp-edges' }}
          draggable={false}
        />
      </div>
      
      {/* Center cap */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src={centerImage}
          alt=""
          className="w-[12%] object-contain"
          style={{ imageRendering: 'crisp-edges' }}
          draggable={false}
        />
      </div>
    </div>
  );
};

/**
 * RefactoredSpeedGauge
 * - Consumes only SPEED signal via useVehicleSignal('speed_mph')
 * - Mirror of RpmGauge but for speed
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
  min = 0
}) => {
  // ✅ Single signal subscription
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
        alt="Speed Gauge"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />
      
      <img 
        src={tickImage}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />
      
      <img 
        src={numbersImage}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'crisp-edges' }}
        draggable={false}
      />
      
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingBottom: '23%', transform: `rotate(${needleAngle}deg)`, transformOrigin: 'center' }}
      >
        <img 
          src={needleImage}
          alt="Needle"
          className="w-[40%] object-contain"
          style={{ imageRendering: 'crisp-edges' }}
          draggable={false}
        />
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src={centerImage}
          alt=""
          className="w-[12%] object-contain"
          style={{ imageRendering: 'crisp-edges' }}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default { RpmGauge, SpeedGauge };
