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
    let sweepTransitionTimer;
    const timers = BOOT_STEPS.map((step, index) =>
      setTimeout(() => {
        setVisibleSteps((prev) => [...prev, step.text]);
        if (index === BOOT_STEPS.length - 1) {
          sweepTransitionTimer = setTimeout(() => setPhase('sweep'), 400);
        }
      }, step.delay)
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      if (sweepTransitionTimer) {
        clearTimeout(sweepTransitionTimer);
      }
    };
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
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'complete') return;

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 200);

    return () => clearTimeout(completeTimer);
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
          {phase === 'logo' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              <motion.img
                src="/assets/gauges/honda-logo.png"
                alt="Honda"
                className="w-72 h-auto mb-8"
                initial={{ filter: 'brightness(0)' }}
                animate={{ filter: 'brightness(1)' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{
                  filter: 'drop-shadow(0 0 60px rgba(255, 255, 255, 0.2))',
                }}
              />
            </motion.div>
          )}

          {phase === 'name' && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.img
                src="/assets/gauges/honda-logo.png"
                alt="Honda"
                className="w-56 h-auto mb-6"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0.9, y: -10 }}
                transition={{ duration: 0.8 }}
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(255, 255, 255, 0.15))',
                }}
              />

              <div className="flex items-center justify-center mb-4">
                <motion.span
                  className="font-orbitron text-7xl font-bold tracking-tight"
                  style={{ color: '#ffffff', textShadow: '0 0 30px rgba(255, 255, 255, 0.3)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  FRAN
                </motion.span>

                <AnimatePresence>
                  {showK && (
                    <motion.span
                      className="font-orbitron text-7xl font-black tracking-tight"
                      style={{
                        color: '#DC2626',
                        textShadow: '0 0 40px rgba(220, 38, 38, 0.8), 0 0 80px rgba(220, 38, 38, 0.4)',
                      }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                    >
                      K
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.div
                className="text-base uppercase tracking-[0.4em] text-zinc-400 font-orbitron"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.8 }}
              >
                Digital Instrument Cluster
              </motion.div>
            </motion.div>
          )}

          {phase === 'text' && (
            <div className="flex flex-col items-center">
              <img src="/assets/gauges/honda-logo.png" alt="Honda" className="w-32 h-auto mb-6 opacity-60" />

              <div className="font-orbitron text-sm space-y-1 text-left w-72">
                {visibleSteps.map((text, index) => (
                  <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                    <span className="text-red-500">›</span>
                    <span className="text-zinc-400">{text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {phase === 'sweep' && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-56 h-56">
                <img src="/assets/gauges/rpm-gauge.png" alt="RPM" className="absolute inset-0 w-full h-full object-contain opacity-70" />
                <img src="/assets/gauges/rpm-numbers.png" alt="" className="absolute inset-0 w-full h-full object-contain opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '23%' }}>
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
                  <img src="/assets/gauges/rpm-needle-center.png" alt="" className="w-[15%] object-contain" />
                </div>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs uppercase tracking-widest text-zinc-500 font-orbitron">
                Gauge Sweep Test
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
