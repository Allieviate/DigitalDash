import React from 'react';
import { useVehicleData } from '../../contexts/VehicleDataContext';

// RPM Gauge using your custom PNG assets
export const RpmGauge = ({ 
  className = '',
  size = 600,
  vtecStartRpm = 3000,
  vtecEndRpm = 8000,
  shiftRpm = 7800,
  maxRpm = 8000
}) => {

  const mapValueToAngle = (val, minVal, maxVal, minAngle, maxAngle) => {
  // Clamp the value first so it never exceeds the gauge limits
  const clampedVal = Math.min(Math.max(val, minVal), maxVal);

  // Avoid divide-by-zero if someone misconfigures min/max
  if (maxVal === minVal) return minAngle;

  // Map to degrees
  return minAngle + ((clampedVal - minVal) / (maxVal - minVal)) * (maxAngle - minAngle);
};

  const { signals } = useVehicleData();
  const rpm = signals.rpm;

  // Calculate needle angle: 0 RPM = -135deg, 8000 RPM = +135deg (270 degree sweep)
 const minAngle = -100;
const maxAngle = 100;
const needleAngle = mapValueToAngle(rpm, 0, maxRpm, minAngle, maxAngle);

  // VTEC engagement (above 3000 RPM) - ORIGINAL CODE
  // VTEC glow band (mirrors the old DashViewModel demo behavior)
// - Glow ramps in from vtecStartRpm → vtecEndRpm
// - Past vtecEndRpm we stop the glow so the dash doesn't stay "washed" red
const inVtec = rpm >= vtecStartRpm && rpm <= vtecEndRpm;
const vtecProgress = inVtec
  ? Math.min(1, Math.max(0, (rpm - vtecStartRpm) / Math.max(1, (vtecEndRpm - vtecStartRpm))))
  : 0;
  
  // Shift light (near redline)
  const inShift = rpm >= shiftRpm;

  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      data-testid="rpm-gauge"
    >
      {/* Background gauge */}
      <img 
        src="/assets/gauges/rpm-gauge.png" 
        alt="RPM Gauge"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
        draggable={false}
      />
      
      {/* Small ticks */}
      <img 
        src="/assets/gauges/rpm-small-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
        draggable={false}
      />
      
      {/* Medium ticks */}
      <img 
        src="/assets/gauges/rpm-medium-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
        draggable={false}
      />
      
      {/* Large ticks */}
      <img 
        src="/assets/gauges/rpm-large-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
        draggable={false}
      />
      
      {/* Numbers */}
      <img 
        src="/assets/gauges/rpm-numbers.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
        draggable={false}
      />
      
      {/* Shift light at top */}
      <div 
        className={`
          absolute top-[5%] left-1/2 -translate-x-1/2
          w-9 h-9 rounded-full
          transition-opacity duration-150
          ${inShift ? 'animate-pulse' : ''}
        `}
        style={{
          backgroundColor: '#FF0000',
          opacity: inShift ? 1 : 0,
          boxShadow: inShift ? '0 0 40px 10px rgba(255, 0, 0, 0.8)' : 'none'
        }}
        data-testid="shift-light"
      />
      
      {/* Needle */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingBottom: '23%' }}
      >
        <img 
          src="/assets/gauges/rpm-needle.png" 
          alt="Needle"
          className="w-[43%] object-contain"
          style={{
            transformOrigin: '50% 76.3%',
            transform: `rotate(${needleAngle}deg)`,
            transition: 'transform 0.1s ease-out',
            imageRendering: 'auto'
          }}
          draggable={false}
        />
      </div>
      
      {/* VTEC Glow center - ORIGINAL CODE RESTORED */}
      {inVtec && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="/assets/gauges/rpm-needle-center.png" 
            alt=""
            className="w-[15%] object-contain animate-pulse"
            style={{
              filter: `drop-shadow(0 0 ${18 + vtecProgress * 22}px rgba(255, 0, 0, 1))`,
              opacity: 0.35 + vtecProgress * 0.55,
              imageRendering: 'auto'
            }}
            draggable={false}
          />
        </div>
      )}
      
      {/* Needle center cap - LARGER */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src="/assets/gauges/rpm-needle-center.png" 
          alt=""
          className="w-[20%] object-contain"
          style={{ imageRendering: 'auto' }}
          draggable={false}
        />
      </div>
      
      {/* RPM Digital Readout - with Orbitron font */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingTop: '42%' }}
      >
        <span 
          className="font-orbitron text-3xl font-medium text-white/90"
          style={{ 
            textShadow: inVtec ? `0 0 ${6 + vtecProgress * 10}px rgba(255, 0, 0, 0.55)` : 'none',
            letterSpacing: '2px'
          }}
        >
          {Math.round(rpm)}
        </span>
      </div>
      
      {/* x1000 RPM label - BELOW the RPM readout - LARGER */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '58%' }}>
        <img 
          src="/assets/gauges/x1000-rpm.png" 
          alt="x1000"
          className="w-[55%] object-contain"
          style={{ opacity: 0.9, imageRendering: 'auto' }}
          draggable={false}
        />
      </div>
      
      {/* VTEC Light Indicator - shows when in VTEC */}
      {inVtec && (
        <div 
          className="absolute flex items-center justify-center"
          style={{ 
            top: '68%', 
            left: '50%', 
            transform: 'translateX(-50%)'
          }}
        >
          <span 
            className="font-orbitron text-lg font-bold tracking-wider animate-pulse"
            style={{ 
              color: '#FF0000',
              textShadow: '0 0 15px rgba(255, 0, 0, 0.9), 0 0 30px rgba(255, 0, 0, 0.6)'
            }}
          >
            VTEC
          </span>
        </div>
      )}
    </div>
  );
};

// Speed Gauge using your custom PNG assets
export const SpeedGauge = ({ 
  className = '',
  size = 600,
  maxSpeed = 170
}) => {
  const { signals } = useVehicleData();
  const speed = signals.speed_mph;

  // Calculate needle angle: 0 MPH = -135deg, 170 MPH = +135deg (270 degree sweep)
  const minAngle = -135;
  const maxAngle = 135;
  const needleAngle = mapValueToAngle(speed, min, maxSpeed, minAngle, maxAngle);


  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      data-testid="speed-gauge"
    >
      {/* Background gauge */}
      <img 
        src="/assets/gauges/spd-gauge.png" 
        alt="Speed Gauge"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
        draggable={false}
      />
      
      {/* Medium ticks */}
      <img 
        src="/assets/gauges/spd-medium-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
        draggable={false}
      />
      
      {/* Large ticks */}
      <img 
        src="/assets/gauges/spd-large-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
        draggable={false}
      />
      
      {/* Numbers */}
      <img 
        src="/assets/gauges/spd-numbers.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ imageRendering: 'auto' }}
        draggable={false}
      />
      
      {/* Needle */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingBottom: '23%' }}
      >
        <img 
          src="/assets/gauges/rpm-needle.png" 
          alt="Needle"
          className="w-[43%] object-contain"
          style={{
            transformOrigin: '50% 76.4%',
            transform: `rotate(${needleAngle}deg)`,
            transition: 'transform 0.1s ease-out',
            imageRendering: 'auto'
          }}
          draggable={false}
        />
      </div>
      
      {/* Needle center cap - LARGER */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src="/assets/gauges/rpm-needle-center.png" 
          alt=""
          className="w-[20%] object-contain"
          style={{ imageRendering: 'auto' }}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default RpmGauge;
