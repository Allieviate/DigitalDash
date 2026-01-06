import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const BOOT_STEPS = [
  { text: 'ACCORD HMI v2.0', delay: 0 },
  { text: 'INITIALIZING SYSTEMS...', delay: 500 },
  { text: 'ECU LINK: OK', delay: 800 },
  { text: 'SENSORS: ONLINE', delay: 1100 },
  { text: 'DISPLAY: READY', delay: 1400 },
  { text: 'LOADING DASHBOARD...', delay: 1700 },
];

export const BootSequence = ({ onComplete }) => {
  const { theme } = useTheme();
  const [phase, setPhase] = useState('logo'); // logo, text, sweep, complete
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [sweepProgress, setSweepProgress] = useState(0);

  // Phase 1: Logo display
  useEffect(() => {
    const timer = setTimeout(() => setPhase('text'), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Phase 2: System check text
  useEffect(() => {
    if (phase !== 'text') return;

    BOOT_STEPS.forEach((step, index) => {
      setTimeout(() => {
        setVisibleSteps(prev => [...prev, step.text]);
        if (index === BOOT_STEPS.length - 1) {
          setTimeout(() => setPhase('sweep'), 500);
        }
      }, step.delay);
    });
  }, [phase]);

  // Phase 3: Gauge sweep animation
  useEffect(() => {
    if (phase !== 'sweep') return;

    const duration = 2000; // 2 seconds for sweep
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-in-out curve for smooth sweep
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Go up to 100%, then back to 0%
      if (progress < 0.5) {
        setSweepProgress(eased * 2 * 100);
      } else {
        setSweepProgress((1 - (eased - 0.5) * 2) * 100);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSweepProgress(0);
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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
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
              {/* Honda-inspired Logo */}
              <div 
                className="text-6xl font-black tracking-tight mb-4"
                style={{ 
                  color: theme.accent,
                  textShadow: theme.glow
                }}
              >
                ACCORD
              </div>
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
                  <span style={{ color: theme.accent }}>›</span>
                  <span className="text-zinc-400">{text}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Sweep phase */}
          {phase === 'sweep' && (
            <div className="flex flex-col items-center gap-8">
              {/* Animated gauge representation */}
              <svg width="200" height="200" viewBox="0 0 200 200">
                {/* Background arc */}
                <path
                  d="M 30 150 A 85 85 0 1 1 170 150"
                  fill="none"
                  stroke="#27272a"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* Animated arc */}
                <path
                  d="M 30 150 A 85 85 0 1 1 170 150"
                  fill="none"
                  stroke={theme.accent}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="267"
                  strokeDashoffset={267 - (267 * sweepProgress / 100)}
                  style={{ filter: `drop-shadow(${theme.glow})` }}
                />
              </svg>
              
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
                className="h-full rounded-full"
                style={{ backgroundColor: theme.accent }}
                initial={{ width: '0%' }}
                animate={{ 
                  width: phase === 'logo' ? '20%' : 
                         phase === 'text' ? '60%' : 
                         phase === 'sweep' ? '90%' : '100%'
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
