import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';

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

// Digital Speed + Gear display (top center)
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
  
  // Detect gear changes and trigger flash
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
      {/* Speed */}
      <div className="text-white font-bold text-5xl font-mono tracking-tight" data-testid="digital-speed">
        {speed}
      </div>
      <div className="text-white/70 text-lg tracking-wider -mt-1 mb-2">
        MPH
      </div>
      
      {/* Gear Row: prev / current / next */}
      <div className="flex items-center justify-center gap-0">
        {/* Previous gear (faded) */}
        <span className="w-7 text-center text-lg text-white/20 font-mono">
          {getPrevGearText(gear)}
        </span>
        
        {/* Current gear */}
        <span 
          className={`
            w-10 text-center text-3xl font-bold font-mono transition-all duration-100
            ${flashType === 'up' ? 'opacity-40' : ''}
            ${flashType === 'down' ? 'text-red-400' : 'text-white'}
          `}
          data-testid="current-gear"
        >
          {getGearText(gear)}
        </span>
        
        {/* Next gear (faded) */}
        <span className="w-7 text-center text-lg text-white/20 font-mono">
          {getNextGearText(gear)}
        </span>
      </div>
      
      <div className="text-white/70 text-sm tracking-wider">
        GEAR
      </div>
    </div>
  );
};

// Indicator dots with labels
export const IndicatorLight = ({ 
  active, 
  color, 
  label, 
  icon = null,
  className = '' 
}) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div 
        className="w-4 h-4 rounded-full transition-opacity duration-150"
        style={{
          backgroundColor: color,
          opacity: active ? 1 : 0.15,
          boxShadow: active ? `0 0 10px 2px ${color}` : 'none'
        }}
      />
      <span 
        className="text-xs font-semibold text-white/90 transition-opacity duration-150"
        style={{ opacity: active ? 1 : 0.20 }}
      >
        {icon || label}
      </span>
    </div>
  );
};

// Indicators row (Left Turn, CEL, MAINT, Right Turn)
export const IndicatorsRow = ({ className = '' }) => {
  const { signals } = useVehicleData();
  
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`} data-testid="indicators-row">
      <IndicatorLight 
        active={signals.turn_left} 
        color="#28D86A" 
        label=""
        icon="◀"
      />
      <IndicatorLight 
        active={signals.check_engine} 
        color="#FFB020" 
        label="CEL"
      />
      <IndicatorLight 
        active={signals.maintenance} 
        color="#4AA3FF" 
        label="MAINT"
      />
      <IndicatorLight 
        active={signals.turn_right} 
        color="#28D86A" 
        label=""
        icon="▶"
      />
    </div>
  );
};

// Fuel + Coolant bars (Phase 1 UI)
export const FuelCoolantBars = ({ className = '' }) => {
  const { signals } = useVehicleData();
  
  const fuelPct = signals.fuel_pct * 100;
  const coolantTemp = signals.coolant_temp_c;
  
  // Warning states
  const lowFuel = fuelPct <= 12;
  const highCoolant = coolantTemp >= 105;
  
  return (
    <div className={`flex items-start justify-center gap-4 ${className}`} data-testid="fuel-coolant-bars">
      {/* Fuel */}
      <div className="flex flex-col items-center w-24">
        <span className="text-white/70 text-xs mb-1.5">FUEL</span>
        <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${fuelPct}%`,
              backgroundColor: lowFuel ? '#FFB020' : '#10B981'
            }}
          />
        </div>
        <span className={`text-xs mt-1 ${lowFuel ? 'text-amber-400' : 'text-white/40'}`}>
          {Math.round(fuelPct)}%
        </span>
      </div>
      
      {/* Divider */}
      <div className="w-px h-12 bg-white/10 rounded-full" />
      
      {/* Coolant */}
      <div className="flex flex-col items-center w-24">
        <span className="text-white/70 text-xs mb-1.5">COOLANT</span>
        <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min((coolantTemp / 120) * 100, 100)}%`,
              backgroundColor: highCoolant ? '#EF4444' : '#06B6D4'
            }}
          />
        </div>
        <span className={`text-xs mt-1 ${highCoolant ? 'text-red-400' : 'text-white/40'}`}>
          {Math.round(coolantTemp)}°C
        </span>
      </div>
    </div>
  );
};

export default ShiftLightsBar;
