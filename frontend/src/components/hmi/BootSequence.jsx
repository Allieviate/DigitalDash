import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const BOOT_STEPS = [
  { text: 'ECU LINK: OK', delay: 0 },
  { text: 'SENSORS: ONLINE', delay: 220 },
  { text: 'VTEC: READY', delay: 440 },
  { text: 'DISPLAY: READY', delay: 660 },
];

const PHASE_PROGRESS = {
  logo: '20%',
  name: '45%',
  text: '70%',
  sweep: '95%',
  complete: '100%',
};

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const BootSequence = ({ onComplete }) => {
  const [phase, setPhase] = useState('logo');
  const [showK, setShowK] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [sweepAngle, setSweepAngle] = useState(-135);

  const progressWidth = useMemo(() => PHASE_PROGRESS[phase] ?? '20%', [phase]);

  // Phase 1: Logo fade in for 1800ms
  useEffect(() => {
    if (phase !== 'logo') return;
    const timer = setTimeout(() => setPhase('name'), 1800);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 2: Name animation - "Fran" fades, then "K" bounces in
  useEffect(() => {
    if (phase !== 'name') return;

    const kTimer = setTimeout(() => setShowK(true), 1200);
    const nextTimer = setTimeout(() => setPhase('text'), 3000);

    return () => {
      clearTimeout(kTimer);
      clearTimeout(nextTimer);
    };
  }, [phase]);

  // Phase 3: Boot steps text cascade
  useEffect(() => {
    if (phase !== 'text') return;

    setVisibleSteps([]);
    const timers = BOOT_STEPS.map((step, index) =>
      setTimeout(() => {
        setVisibleSteps((prev) => [...prev, step.text]);
        if (index === BOOT_STEPS.length - 1) {
          setTimeout(() => setPhase('sweep'), 400);
        }
      }, step.delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Phase 4: Gauge needle sweep (forward then backward)
  useEffect(() => {
    if (phase !== 'sweep') return;

    let raf = 0;
    const duration = 1800;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.5) {
        const t = progress * 2;
        const eased = 1 - Math.pow(1 - t, 3);
        setSweepAngle(-135 + 270 * eased);
      } else {
        const t = (progress - 0.5) * 2;
        const eased = 1 - Math.pow(1 - t, 3);
        setSweepAngle(135 - 270 * eased);
      }

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        setSweepAngle(-135);
        setPhase('complete');
        onComplete?.();
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [phase, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          data-testid="boot-sequence"
        >
          {/* Progress bar at bottom */}
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-600 to-red-900"
            initial={{ width: '0%' }}
            animate={{ width: progressWidth }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Phase 1: Logo */}
          <AnimatePresence>
            {phase === 'logo' && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="w-32 h-32 mx-auto mb-8 rounded-full border-4 border-red-600 flex items-center justify-center bg-zinc-900/50">
                  <span className="text-5xl font-black text-red-600 font-orbitron">F</span>
                </div>
                <p className="text-sm uppercase tracking-widest text-zinc-400 font-orbitron">Digital Instrument Cluster</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 2: Name animation */}
          <AnimatePresence>
            {phase === 'name' && (
              <motion.div
                key="name"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ delay: 1.2, duration: 0.4 }}
                  className="text-6xl font-black text-zinc-300 mb-12 font-orbitron"
                >
                  Fran
                </motion.div>

                <AnimatePresence>
                  {showK && (
                    <motion.div
                      key="k-letter"
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        transition: {
                          type: 'spring',
                          stiffness: 120,
                          damping: 15,
                        },
                      }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="text-6xl font-black text-red-600 font-orbitron"
                    >
                      K
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 3: Boot steps */}
          <AnimatePresence>
            {phase === 'text' && (
              <motion.div
                key="boot-steps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="space-y-3">
                  {visibleSteps.map((step, idx) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      className="text-sm font-mono uppercase tracking-wider text-green-400"
                    >
                      → {step}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 4: Gauge sweep */}
          <AnimatePresence>
            {phase === 'sweep' && (
              <motion.div
                key="sweep"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="relative w-48 h-48"
              >
                {/* Gauge face */}
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(220, 38, 38, 0.3))' }}
                >
                  {/* Background arc */}
                  <circle cx="100" cy="100" r="90" fill="none" stroke="#27272a" strokeWidth="2" />
                  
                  {/* Tick marks */}
                  {Array.from({ length: 9 }).map((_, i) => {
                    const angle = -135 + (i / 8) * 270;
                    const rad = (angle * Math.PI) / 180;
                    const x1 = 100 + 75 * Math.cos(rad);
                    const y1 = 100 + 75 * Math.sin(rad);
                    const x2 = 100 + 85 * Math.cos(rad);
                    const y2 = 100 + 85 * Math.sin(rad);
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#3f3f46"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Needle */}
                  <g style={{ transform: `rotate(${sweepAngle}deg)`, transformOrigin: '100px 100px' }}>
                    <line x1="100" y1="100" x2="100" y2="30" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
                  </g>

                  {/* Center cap */}
                  <circle cx="100" cy="100" r="8" fill="#DC2626" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BootSequence;
