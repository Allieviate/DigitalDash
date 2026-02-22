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

  useEffect(() => {
    if (phase !== 'name') return;

    const kTimer = setTimeout(() => setShowK(true), 1200);
    const nextTimer = setTimeout(() => setPhase('text'), 2600);

    return () => {
      clearTimeout(kTimer);
      clearTimeout(nextTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'text') return;

    setVisibleSteps([]);
    const timers = BOOT_STEPS.map((step) =>
      setTimeout(() => {
        setVisibleSteps((prev) => [...prev, step.text]);
      }, step.delay)
    );

    const nextTimer = setTimeout(() => setPhase('sweep'), 1700);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(nextTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'sweep') return;

    let raf;
    const sweepDuration = 1800;
    const start = performance.now();

    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / sweepDuration, 1);

      if (progress < 0.5) {
        const t = easeInOutCubic(progress * 2);
        setSweepAngle(-135 + 270 * t);
      } else {
        const t = easeInOutCubic((progress - 0.5) * 2);
        setSweepAngle(135 - 270 * t);
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
    const timer = setTimeout(() => onComplete?.(), 280);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-black" data-testid="boot-sequence">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_45%,rgba(48,48,48,0.45)_0%,rgba(16,16,16,0.6)_45%,#000_100%)]" />

      <div className="relative h-full w-full flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {phase === 'logo' && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, scale: 0.86, filter: 'brightness(0.65)' }}
              animate={{ opacity: 1, scale: 1.02, filter: 'brightness(1.12)' }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="flex items-center justify-center"
            >
              <img
                src="/assets/gauges/honda-logo.png"
                alt="Honda"
                className="w-[320px] h-[320px] object-contain"
                draggable={false}
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
                className="w-28 h-28 object-contain mb-6"
                initial={{ y: 0, scale: 1 }}
                animate={{ y: -36, scale: 0.88, opacity: 0.65 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                draggable={false}
              />

              <div className="flex items-end">
                <motion.span
                  initial={{ opacity: 0, x: -88 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1.05, ease: [0.2, 0.84, 0.28, 1] }}
                  className="text-7xl md:text-8xl font-bold tracking-[0.35em] text-white font-orbitron"
                >
                  FRAN
                </motion.span>

                <AnimatePresence>
                  {showK && (
                    <motion.span
                      initial={{ opacity: 0, x: 110, y: -10, scale: 1.9 }}
                      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                      transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
                      className="ml-3 text-7xl md:text-8xl font-bold text-red-600 font-orbitron"
                    >
                      K
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: showK ? 1 : 0, y: showK ? 0 : 16 }}
                transition={{ duration: 0.45 }}
                className="mt-4 text-zinc-400 tracking-[0.36em] uppercase text-xs md:text-sm font-orbitron"
              >
                Digital Instrument Cluster
              </motion.p>
            </motion.div>
          )}

          {phase === 'text' && (
            <motion.div
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-3xl"
            >
              <img
                src="/assets/gauges/honda-logo.png"
                alt="Honda watermark"
                className="mx-auto mb-10 w-20 h-20 opacity-25"
                draggable={false}
              />

              <div className="space-y-2 font-orbitron">
                {BOOT_STEPS.map((step) => {
                  const isVisible = visibleSteps.includes(step.text);
                  return (
                    <motion.div
                      key={step.text}
                      initial={{ opacity: 0, x: -35 }}
                      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -35 }}
                      className="text-zinc-100 tracking-[0.24em] uppercase text-sm md:text-base"
                    >
                      {step.text}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {phase === 'sweep' && (
            <motion.div
              key="sweep"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              <div className="relative w-[460px] h-[460px]">
                <img src="/assets/gauges/rpm-gauge.png" alt="RPM Gauge" className="absolute inset-0 w-full h-full object-contain" />
                <img src="/assets/gauges/rpm-large-ticks.png" alt="RPM ticks" className="absolute inset-0 w-full h-full object-contain" />
                <img src="/assets/gauges/rpm-numbers.png" alt="RPM numbers" className="absolute inset-0 w-full h-full object-contain" />

                <div className="absolute inset-0" style={{ transform: `rotate(${sweepAngle}deg)` }}>
                  <img src="/assets/gauges/rpm-needle.png" alt="RPM needle" className="absolute inset-0 w-full h-full object-contain" />
                </div>

                <img src="/assets/gauges/rpm-needle-center.png" alt="RPM center" className="absolute inset-0 w-full h-full object-contain" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900/90">
        <motion.div
          className="h-full bg-red-600"
          animate={{ width: progressWidth }}
          transition={{ duration: phase === 'sweep' ? 0.2 : 0.45, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default BootSequence;
