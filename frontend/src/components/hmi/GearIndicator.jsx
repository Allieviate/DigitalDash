import React, { useState, useEffect, useRef } from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

const GearIndicator = ({ visible = true }) => {
  const currentGear = useVehicleSignal('gear');
  const prevGearRef = useRef(currentGear);
  
  // We use this to force React to completely rebuild the div on shift
  const [animKey, setAnimKey] = useState(0); 
  const [shiftType, setShiftType] = useState('none'); // 'up' or 'down'

  useEffect(() => {
    if (currentGear !== prevGearRef.current) {
      if (currentGear > prevGearRef.current) {
        setShiftType('up');
      } else {
        setShiftType('down');
      }
      
      // Incrementing the key forces the animation to re-trigger perfectly
      setAnimKey(prev => prev + 1); 
      prevGearRef.current = currentGear;
    }
  }, [currentGear]);

  if (!visible) return null;

  const displayGear = currentGear === 0 ? 'N' : currentGear === -1 ? 'R' : currentGear;

  // Apply the specific animation class based on shift direction
  const animClass = shiftType === 'up' ? 'animate-upshift' : shiftType === 'down' ? 'animate-downshift' : '';

  return (
    <div className="flex items-center justify-center w-full h-full relative">
      {/* Hardwiring the Lambo CSS Keyframes directly so Tailwind can't ignore them */}
      <style>{`
        @keyframes upshift {
          0% { color: #FFFFFF; transform: scale(1.25); filter: drop-shadow(0 0 30px rgba(255,255,255,1)); }
          100% { color: #e4e4e7; transform: scale(1); filter: drop-shadow(0 0 0px rgba(255,255,255,0)); }
        }
        @keyframes downshift {
          0% { color: #ef4444; transform: scale(1.15); filter: drop-shadow(0 0 30px rgba(239,68,68,1)); }
          100% { color: #e4e4e7; transform: scale(1); filter: drop-shadow(0 0 0px rgba(239,68,68,0)); }
        }
        .animate-upshift {
          animation: upshift 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
        }
        .animate-downshift {
          animation: downshift 0.4s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
        }
      `}</style>
      
      <div
        key={animKey}
        className={`text-8xl font-black font-orbitron z-50 text-zinc-200 origin-center ${animClass}`}
      >
        {displayGear}
      </div>
    </div>
  );
};

export default GearIndicator;
