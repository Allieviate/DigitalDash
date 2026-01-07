import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const BOOT_STEPS = [
  { text: 'ACCORD HMI v2.0', delay: 0 },
  { text: 'INITIALIZING SYSTEMS...', delay: 400 },
  { text: 'ECU LINK: OK', delay: 700 },
  { text: 'SENSORS: ONLINE', delay: 1000 },
  { text: 'VTEC: READY', delay: 1300 },
  { text: 'DISPLAY: READY', delay: 1500 },
];

export const BootSequence = ({ onComplete }) => {
  const { theme } = useTheme();
  const [phase, setPhase] = useState('logo'); // logo, text, sweep, complete
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [sweepAngle, setSweepAngle] = useState(-135);

  // Phase 1: Logo display (with your Honda Frankenstein logo)
  useEffect(() => {
    const timer = setTimeout(() => setPhase('text'), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Phase 2: System check text
  useEffect(() => {
    if (phase !== 'text') return;

    BOOT_STEPS.forEach((step, index) => {
      setTimeout(() => {
        setVisibleSteps(prev => [...prev, step.text]);
        if (index === BOOT_STEPS.length - 1) {
          setTimeout(() => setPhase('sweep'), 400);
        }
      }, step.delay);
    });
  }, [phase]);

  // Phase 3: Gauge sweep animation
  useEffect(() => {
    if (phase !== 'sweep') return;

    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Sweep from -135 to +135 and back
      if (progress < 0.5) {
        // Sweep up
        const t = progress * 2;
        const eased = 1 - Math.pow(1 - t, 3); // ease-out
        setSweepAngle(-135 + (270 * eased));
      } else {
        // Sweep down
        const t = (progress - 0.5) * 2;
        const eased = 1 - Math.pow(1 - t, 3);
        setSweepAngle(135 - (270 * eased));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSweepAngle(-135);
        setTimeout(() => {
          setPhase('complete');
          onComplete?.();
        }, 300);
      }
    };

    requestAnimationFrame(animate);
  }, [phase, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse 90% 100% at 50% 35%, #2B2B2B 0%, #101010 25%, #000000 100%)'
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          data-testid="boot-sequence"
        >
          {/* Logo phase */}
          {phase === 'logo' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              {/* Your Honda Frankenstein Logo */}
              <img 
                src="/assets/gauges/honda-logo.png"
                alt="Honda"
                className="w-48 h-auto mb-6"
                style={{
                  filter: 'drop-shadow(0 0 30px rgba(255, 255, 255, 0.3))'
                }}
              />
              <div className="text-sm uppercase tracking-[0.5em] text-zinc-500">
                Digital Instrument Cluster
              </div>
            </motion.div>
          )}

          {/* Text phase */}
          {phase === 'text' && (
            <div className="font-mono text-sm space-y-1 text-left w-80">
              {visibleSteps.map((text, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-red-500">›</span>
                  <span className="text-zinc-400">{text}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Sweep phase - shows gauge with animated needle */}
          {phase === 'sweep' && (
            <div className="flex flex-col items-center gap-6">
              {/* Mini gauge preview with needle sweep */}
              <div className="relative w-64 h-64">
                <img 
                  src="/assets/gauges/rpm-gauge.png"
                  alt="RPM"
                  className="absolute inset-0 w-full h-full object-contain opacity-80"
                />
                <img 
                  src="/assets/gauges/rpm-numbers.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain opacity-80"
                />
                {/* Animated needle */}
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
                      transform: `rotate(${sweepAngle}deg)`,
                    }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src="/assets/gauges/rpm-needle-center.png" 
                    alt=""
                    className="w-[15%] object-contain"
                  />
                </div>
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm uppercase tracking-widest text-zinc-500"
              >
                Gauge Sweep Test
              </motion.div>
            </div>
          )}

          {/* Progress bar at bottom */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64">
            <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-red-600"
                initial={{ width: '0%' }}
                animate={{ 
                  width: phase === 'logo' ? '25%' : 
                         phase === 'text' ? '60%' : 
                         phase === 'sweep' ? '95%' : '100%'
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BootSequence;
