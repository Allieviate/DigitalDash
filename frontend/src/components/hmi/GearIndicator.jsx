import React, { useState, useEffect, useRef } from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext'; // Adjust import path if needed

const GearIndicator = ({ visible = true }) => {
  const currentGear = useVehicleSignal('gear'); // Pull high-speed data
  const [flashState, setFlashState] = useState('idle'); // 'idle', 'up', 'down'
  const prevGearRef = useRef(currentGear);

  useEffect(() => {
    // Only trigger if the gear actually changed
    if (currentGear !== prevGearRef.current) {
      if (currentGear > prevGearRef.current) {
        setFlashState('up');
      } else {
        setFlashState('down');
      }
      prevGearRef.current = currentGear;

      // Hold the pop for 50ms, then trigger the fade out
      const timer = setTimeout(() => {
        setFlashState('idle');
      }, 50); 
      
      return () => clearTimeout(timer);
    }
  }, [currentGear]);

  if (!visible) return null;

  // Default text styling
  let baseClass = "text-8xl font-black font-orbitron z-50 "; 
  let flashClass = "";
  let transitionClass = "";

  // The "Instant Pop, Slow Fade" Logic
  if (flashState === 'up') {
    flashClass = "text-white scale-125 drop-shadow-[0_0_30px_rgba(255,255,255,1)]";
    transitionClass = "transition-none"; // 0ms Instant Snap
  } else if (flashState === 'down') {
    flashClass = "text-red-500 scale-110 drop-shadow-[0_0_30px_rgba(255,0,0,1)]";
    transitionClass = "transition-none"; // 0ms Instant Snap
  } else {
    flashClass = "text-zinc-200 scale-100 drop-shadow-none";
    transitionClass = "transition-all duration-300 ease-out"; // 300ms Fade Out
  }

  // Handle Neutral (0) or Reverse (-1 if applicable)
  const displayGear = currentGear === 0 ? 'N' : currentGear === -1 ? 'R' : currentGear;

  return (
    <div className="flex items-center justify-center w-full h-full">
       <div className={`${baseClass} ${flashClass} ${transitionClass}`}>
         {displayGear}
       </div>
    </div>
  );
};

export default GearIndicator;
