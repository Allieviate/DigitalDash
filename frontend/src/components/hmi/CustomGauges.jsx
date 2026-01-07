import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';

// RPM Gauge using your custom PNG assets
export const RpmGauge = ({ 
  className = '',
  size = 600,
  vtecStartRpm = 3000,
  shiftRpm = 7800,
  maxRpm = 8000
}) => {
  const { theme } = useTheme();
  const { signals } = useVehicleData();
  const rpm = signals.rpm;

  // Calculate needle angle: 0 RPM = -135deg, 8000 RPM = +135deg (270 degree sweep)
  const needleAngle = useMemo(() => {
    const minAngle = -135;
    const maxAngle = 135;
    const clampedRpm = Math.min(Math.max(rpm, 0), maxRpm);
    return minAngle + (clampedRpm / maxRpm) * (maxAngle - minAngle);
  }, [rpm, maxRpm]);

  // VTEC engagement (above 3000 RPM)
  const inVtec = rpm >= vtecStartRpm;
  
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
        draggable={false}
      />
      
      {/* Small ticks */}
      <img 
        src="/assets/gauges/rpm-small-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      
      {/* Medium ticks */}
      <img 
        src="/assets/gauges/rpm-medium-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      
      {/* Large ticks */}
      <img 
        src="/assets/gauges/rpm-large-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      
      {/* Numbers */}
      <img 
        src="/assets/gauges/rpm-numbers.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      
      {/* x1000 RPM label - BIGGER and more visible */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '25%' }}>
        <img 
          src="/assets/gauges/x1000-rpm.png" 
          alt="x1000"
          className="w-[50%] object-contain"
          style={{ opacity: 0.95 }}
          draggable={false}
        />
      </div>
      
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
            transition: 'transform 0.1s ease-out'
          }}
          draggable={false}
        />
      </div>
      
      {/* VTEC Glow center (behind the cap) - RESTORED */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${inVtec ? 'opacity-100' : 'opacity-0'}`}
      >
        <img 
          src="/assets/gauges/rpm-needle-center.png" 
          alt=""
          className={`w-[15%] object-contain ${inVtec ? 'animate-vtec-glow' : ''}`}
          style={{
            filter: inVtec ? 'drop-shadow(0 0 28px rgba(255, 0, 0, 1)) drop-shadow(0 0 15px rgba(255, 0, 0, 0.8))' : 'none',
          }}
          draggable={false}
        />
      </div>
      
      {/* Needle center cap */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src="/assets/gauges/rpm-needle-center.png" 
          alt=""
          className="w-[15%] object-contain"
          draggable={false}
        />
      </div>
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
  const needleAngle = useMemo(() => {
    const minAngle = -135;
    const maxAngle = 135;
    const clampedSpeed = Math.min(Math.max(speed, 0), maxSpeed);
    return minAngle + (clampedSpeed / maxSpeed) * (maxAngle - minAngle);
  }, [speed, maxSpeed]);

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
        draggable={false}
      />
      
      {/* Medium ticks */}
      <img 
        src="/assets/gauges/spd-medium-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      
      {/* Large ticks */}
      <img 
        src="/assets/gauges/spd-large-ticks.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      
      {/* Numbers */}
      <img 
        src="/assets/gauges/spd-numbers.png" 
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
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
            transition: 'transform 0.1s ease-out'
          }}
          draggable={false}
        />
      </div>
      
      {/* Needle center cap */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src="/assets/gauges/rpm-needle-center.png" 
          alt=""
          className="w-[15%] object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
};

// Quarter-circle gauge for Fuel/Coolant - positioned inside the main gauges gap
export const QuarterGauge = ({
  value,
  max,
  label,
  icon,
  position = 'left', // 'left' for fuel (speedometer side), 'right' for coolant (tach side)
  warning = false,
  danger = false,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  // Calculate arc for quarter circle
  const radius = 60;
  const strokeWidth = 8;
  const center = 70;
  
  // For left side (fuel): arc from top to right (0 to 90 deg)
  // For right side (coolant): arc from top to left (0 to -90 deg)
  const startAngle = position === 'left' ? -90 : -90;
  const endAngle = position === 'left' ? 0 : -180;
  const sweepAngle = Math.abs(endAngle - startAngle);
  
  const polarToCartesian = (angle) => {
    const rad = (angle) * Math.PI / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
    };
  };
  
  const describeArc = (startAng, endAng) => {
    const start = polarToCartesian(startAng);
    const end = polarToCartesian(endAng);
    const largeArc = Math.abs(endAng - startAng) > 180 ? 1 : 0;
    const sweep = position === 'left' ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  };
  
  const bgArc = describeArc(startAngle, endAngle);
  const currentEndAngle = startAngle + (position === 'left' ? 1 : -1) * (sweepAngle * percentage / 100);
  const valueArc = percentage > 0 ? describeArc(startAngle, currentEndAngle) : '';
  
  let fillColor = '#10B981'; // green
  if (danger) fillColor = '#EF4444';
  else if (warning) fillColor = '#F59E0B';
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Background arc */}
        <path
          d={bgArc}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {valueArc && (
          <path
            d={valueArc}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${fillColor}50)` }}
          />
        )}
      </svg>
      
      {/* Icon and label */}
      <div className="flex items-center gap-1 -mt-2">
        <span className="text-lg">{icon}</span>
        <span 
          className="font-eurostar text-sm"
          style={{ color: danger ? '#EF4444' : warning ? '#F59E0B' : '#a1a1aa' }}
        >
          {label}
        </span>
      </div>
      
      {/* Value */}
      <span 
        className="font-orbitron text-base font-medium"
        style={{ color: danger ? '#EF4444' : warning ? '#F59E0B' : '#ffffff' }}
      >
        {typeof value === 'number' ? Math.round(value) : value}
        {label === 'FUEL' ? '%' : '°C'}
      </span>
    </div>
  );
};

export default RpmGauge;
