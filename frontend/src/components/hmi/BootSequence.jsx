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

  useEffect(() => {
    if (phase !== 'logo') return;
    const timer = setTimeout(() => setPhase('name'), 1800);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 2: Name animation - "Fran" fades, then "K" appears.
  useEffect(() => {
    if (phase !== 'name') return;

    const kTimer = setTimeout(() => setShowK(true), 1200);
    const nextTimer = setTimeout(() => setPhase('text'), 3000);

    return () => {
      clearTimeout(kTimer);
      clearTimeout(nextTimer);
    };
  }, [phase]);

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

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [phase]);

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
  }, [phase, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse 90% 100% at 50% 35%, #1a1a1a 0%, #0a0a0a 30%, #000000 100%)',
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          data-testid="boot-sequence"
        >
          {phase === 'logo' && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, scale: 0.86, filter: 'brightness(0.65)' }}
              animate={{ opacity: 1, scale: 1.02, filter: 'brightness(1.12)' }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="flex items-center justify-center"
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
              key="name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
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
                    </motion.span>
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
              </motion.p>
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
            </motion.div>
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

                <img src="/assets/gauges/rpm-needle-center.png" alt="RPM center" className="absolute inset-0 w-full h-full object-contain" />
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs uppercase tracking-widest text-zinc-500 font-orbitron">
                Gauge Sweep Test
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-56">
            <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #DC2626 0%, #ffffff 100%)',
                }}
                initial={{ width: '0%' }}
                animate={{
                  width:
                    phase === 'logo'
                      ? '20%'
                      : phase === 'name'
                      ? '45%'
                      : phase === 'text'
                      ? '70%'
                      : phase === 'sweep'
                      ? '95%'
                      : '100%',
                }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BootSequence;
