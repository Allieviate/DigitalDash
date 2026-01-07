import React, { useState, useEffect } from 'react';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { Fuel, Thermometer } from 'lucide-react';

// Shift lights bar - 7 LEDs that light up progressively with RPM
export const ShiftLightsBar = ({ className = '' }) => {
  const { signals } = useVehicleData();
  const rpm = signals.rpm;
  
  // Calculate opacity for each shift light based on RPM thresholds
  const getLightOpacity = (index) => {
    const threshold = (index + 1) * 1000; // 1000, 2000, 3000, etc.
    const opacity = Math.min(Math.max((rpm - threshold) / 1000, 0), 1);
    return opacity;
  };
  
  // Master opacity - flash at redline (7600+ RPM)
  const [flashState, setFlashState] = useState(1);
  const isRedline = rpm >= 7600;
  
  useEffect(() => {
    if (!isRedline) {
      setFlashState(1);
      return;
    }
    
    const interval = setInterval(() => {
      setFlashState(prev => prev === 1 ? 0.3 : 1);
    }, 70); // Fast aggressive flash
    
    return () => clearInterval(interval);
  }, [isRedline]);

  return (
    <div 
      className={`flex items-center justify-center gap-2 ${className}`}
      style={{ opacity: isRedline ? flashState : 1 }}
      data-testid="shift-lights-bar"
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="w-[22px] h-[22px] rounded-full transition-opacity duration-75"
          style={{
            opacity: getLightOpacity(i),
            background: 'radial-gradient(circle at 30% 30%, #FFFFF16A -20%, #FF0000 100%)',
            boxShadow: getLightOpacity(i) > 0.5 
              ? '0 0 12px 4px rgba(255, 0, 0, 0.6)' 
              : 'none'
          }}
        />
      ))}
    </div>
  );
};

// Digital Speed + Gear display - URUS LAMBORGHINI STYLE
export const DigitalSpeedGear = ({ className = '' }) => {
  const { signals } = useVehicleData();
  const [lastGear, setLastGear] = useState(signals.gear);
  const [flashType, setFlashType] = useState(null); // 'up' | 'down' | null
  
  const gear = signals.gear;
  const speed = Math.round(signals.speed_mph);
  
  // Gear text helpers
  const getGearText = (g) => {
    if (g === -1) return 'R';
    if (g === 0) return 'N';
    return String(g);
  };
  
  const getPrevGearText = (g) => {
    if (g === -1) return ' ';
    if (g === 0) return 'R';
    if (g === 1) return 'N';
    return String(g - 1);
  };
  
  const getNextGearText = (g) => {
    if (g === -1) return 'N';
    if (g === 0) return '1';
    if (g === 6) return ' ';
    return String(g + 1);
  };
  
  // Detect gear changes and trigger flash - URUS STYLE
  useEffect(() => {
    if (gear !== lastGear) {
      if (gear > lastGear) {
        setFlashType('up');
      } else {
        setFlashType('down');
      }
      setLastGear(gear);
      
      // Clear flash after animation
      const timer = setTimeout(() => setFlashType(null), 250);
      return () => clearTimeout(timer);
    }
  }, [gear, lastGear]);

  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="digital-speed-gear">
      {/* Speed - using Eurostar font */}
      <div 
        className="font-eurostar font-black text-white tracking-tight leading-none"
        style={{ fontSize: '56px' }}
        data-testid="digital-speed"
      >
        {speed}
      </div>
      <div className="font-eurostar text-white/70 text-lg tracking-widest -mt-1 mb-3">
        MPH
      </div>
      
      {/* Gear Row: prev / current / next - URUS LAMBORGHINI STYLE */}
      <div className="flex items-center justify-center" style={{ gap: '4px' }}>
        {/* Previous gear - 32px, 45% opacity */}
        <span 
          className="font-orbitron font-medium text-center"
          style={{ 
            width: '32px',
            fontSize: '22px',
            color: 'white',
            opacity: 0.45
          }}
        >
          {getPrevGearText(gear)}
        </span>
        
        {/* Current gear - 38-50px, with flash animation */}
        <span 
          className={`
            font-orbitron font-bold text-center transition-all duration-100
            ${flashType === 'up' ? 'animate-upshift' : ''}
            ${flashType === 'down' ? 'animate-downshift' : ''}
          `}
          style={{ 
            width: '48px',
            fontSize: '42px',
            color: flashType === 'down' ? '#DD4444' : 'white',
          }}
          data-testid="current-gear"
        >
          {getGearText(gear)}
        </span>
        
        {/* Next gear - 32px, 45% opacity */}
        <span 
          className="font-orbitron font-medium text-center"
          style={{ 
            width: '32px',
            fontSize: '22px',
            color: 'white',
            opacity: 0.45
          }}
        >
          {getNextGearText(gear)}
        </span>
      </div>
      
      <div className="font-eurostar text-white/70 text-sm tracking-widest mt-1">
        GEAR
      </div>
    </div>
  );
};

// Quarter-circle Fuel Gauge - for inside speedometer gap
export const FuelQuarterGauge = ({ className = '' }) => {
  const { signals } = useVehicleData();
  const fuelPct = signals.fuel_pct * 100;
  const lowFuel = fuelPct <= 12;
  const veryLow = fuelPct <= 5;
  
  const percentage = Math.min(Math.max(fuelPct, 0), 100);
  
  // Arc parameters - quarter circle from bottom-left curving up
  const radius = 55;
  const strokeWidth = 8;
  const size = 120;
  const center = 60;
  
  // Arc from 180° (left) to 90° (top) - quarter circle
  const startAngle = 180;
  const endAngle = 90;
  
  const polarToCartesian = (angle) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
    };
  };
  
  const describeArc = (start, end) => {
    const startPt = polarToCartesian(start);
    const endPt = polarToCartesian(end);
    return `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 0 1 ${endPt.x} ${endPt.y}`;
  };
  
  const bgArc = describeArc(startAngle, endAngle);
  const currentAngle = startAngle - (90 * percentage / 100);
  const valueArc = percentage > 0 ? describeArc(startAngle, currentAngle) : '';
  
  let fillColor = '#10B981';
  if (veryLow) fillColor = '#EF4444';
  else if (lowFuel) fillColor = '#F59E0B';
  
  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="fuel-gauge">
      <svg width={size} height={size/2 + 20} viewBox={`0 0 ${size} ${size/2 + 20}`}>
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
            style={{ filter: `drop-shadow(0 0 8px ${fillColor}60)` }}
          />
        )}
        
        {/* Fuel icon */}
        <g transform={`translate(${center - 10}, ${center - 30})`}>
          <Fuel size={20} color={lowFuel ? fillColor : '#71717a'} />
        </g>
      </svg>
      
      {/* Value */}
      <span 
        className="font-orbitron text-sm font-medium -mt-1"
        style={{ color: veryLow ? '#EF4444' : lowFuel ? '#F59E0B' : '#a1a1aa' }}
      >
        {Math.round(fuelPct)}%
      </span>
    </div>
  );
};

// Quarter-circle Coolant Gauge - for inside tachometer gap
export const CoolantQuarterGauge = ({ className = '' }) => {
  const { signals } = useVehicleData();
  const temp = signals.coolant_temp_c;
  const highTemp = temp >= 95;
  const critical = temp >= 105;
  
  const percentage = Math.min(Math.max((temp / 120) * 100, 0), 100);
  
  // Arc parameters - quarter circle from bottom-right curving up
  const radius = 55;
  const strokeWidth = 8;
  const size = 120;
  const center = 60;
  
  // Arc from 0° (right) to 90° (top) - quarter circle, reversed direction
  const startAngle = 0;
  const endAngle = 90;
  
  const polarToCartesian = (angle) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
    };
  };
  
  const describeArc = (start, end) => {
    const startPt = polarToCartesian(start);
    const endPt = polarToCartesian(end);
    return `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 0 0 ${endPt.x} ${endPt.y}`;
  };
  
  const bgArc = describeArc(startAngle, endAngle);
  const currentAngle = startAngle + (90 * percentage / 100);
  const valueArc = percentage > 0 ? describeArc(startAngle, currentAngle) : '';
  
  let fillColor = '#06B6D4'; // cyan
  if (critical) fillColor = '#EF4444';
  else if (highTemp) fillColor = '#F59E0B';
  
  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="coolant-gauge">
      <svg width={size} height={size/2 + 20} viewBox={`0 0 ${size} ${size/2 + 20}`}>
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
            style={{ filter: `drop-shadow(0 0 8px ${fillColor}60)` }}
          />
        )}
        
        {/* Thermometer icon */}
        <g transform={`translate(${center - 10}, ${center - 30})`}>
          <Thermometer size={20} color={highTemp ? fillColor : '#71717a'} />
        </g>
      </svg>
      
      {/* Value */}
      <span 
        className="font-orbitron text-sm font-medium -mt-1"
        style={{ color: critical ? '#EF4444' : highTemp ? '#F59E0B' : '#a1a1aa' }}
      >
        {Math.round(temp)}°C
      </span>
    </div>
  );
};

export default ShiftLightsBar;
