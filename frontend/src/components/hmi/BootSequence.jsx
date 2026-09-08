import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_STEPS = [
  { text: 'ECU LINK: OK', delay: 0 },
  { text: 'SENSORS: ONLINE', delay: 200 },
  { text: 'VTEC: READY', delay: 400 },
  { text: 'DISPLAY: READY', delay: 600 },
];

/*
 * The logo used to be fetched from a Supabase bucket belonging to
 * whatever tool scaffolded this project, on three separate <img> tags.
 *
 * That is a network request on the boot path of a device that spends
 * its life in a car. Parked without wifi it fails, on a marginal
 * connection it stalls, and it depends on a third party's storage
 * continuing to exist.
 *
 * Local file now. If it is missing the inline mark below renders
 * instead, so a fresh checkout still boots to something rather than
 * three broken image icons.
 */
const LOGO_SRC = '/assets/branding/honda-logo.png';

/** Simple geometric fallback. Not a brand asset, just a shape. */
const FallbackMark = ({ size, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    style={style}
    aria-label="FRANK"
  >
    <rect
      x="6" y="22" width="88" height="56" rx="10"
      fill="none" stroke="#DC2626" strokeWidth="5"
    />
    <path
      d="M28 36 V64 M28 50 H72 M72 36 V64"
      stroke="#DC2626" strokeWidth="9"
      strokeLinecap="round" strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const BootLogo = ({ size = 220, style, className }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <FallbackMark size={size} style={style} />;
  }

  return (
    <img
      src={LOGO_SRC}
      alt="FRANK"
      className={className}
      onError={() => setFailed(true)}
      style={{ width: size, height: 'auto', objectFit: 'contain', ...style }}
    />
  );
};

/**
 * Hold a callback in a ref so timers do not depend on its identity.
 *
 * The timer effects listed onComplete in their dependencies, and
 * onComplete was a fresh arrow function on every parent render.
 * VehicleDataProvider polls /api/source-status every two seconds and
 * calls setSourceStatus with a fresh object, so the tree below it
 * re-renders on that schedule - which cleared and rescheduled the boot
 * timers every two seconds. The logo phase needs 3.2 uninterrupted
 * seconds to advance, so it never advanced.
 */
const useCallbackRef = (callback) => {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  }, [callback]);
  return ref;
};

const HondaLogoAnimation = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);
  const onCompleteRef = useCallbackRef(onComplete);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => onCompleteRef.current?.(), 3200);
    return () => [t1, t2, t3].forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 3px)',
        }}
      />

      <motion.div
        className="absolute rounded-full pointer-events-none"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{
          opacity: phase >= 1 ? [0, 0.18, 0.1] : 0,
          scale: phase >= 1 ? [0.3, 1.6, 1.2] : 0.3,
        }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        style={{
          width: 420, height: 420,
          background: 'radial-gradient(circle, rgba(200,0,0,0.55) 0%, rgba(180,0,0,0.15) 45%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      <motion.div
        className="absolute rounded-full pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 0.07 : 0 }}
        transition={{ duration: 1.2 }}
        style={{
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(210,0,0,0.5) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-20 flex flex-col items-center select-none">
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ scale: phase >= 1 ? 1.02 : 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute pointer-events-none rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 1.4 }}
            style={{
              width: 260, height: 260,
              background: 'radial-gradient(circle, rgba(200,0,0,0.35) 0%, rgba(160,0,0,0.12) 50%, transparent 70%)',
              filter: 'blur(28px)',
              zIndex: 0,
            }}
          />

          <BootLogo size={220} style={{ position: 'relative', zIndex: 1 }} />
        </motion.div>
      </div>
    </div>
  );
};

export const BootSequence = ({ onComplete }) => {
  const [phase, setPhase] = useState('logo');
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [sweepAngle, setSweepAngle] = useState(-120);
  const [showK, setShowK] = useState(false);

  const onCompleteRef = useCallbackRef(onComplete);

  // Stable across renders, so HondaLogoAnimation's timer effect is not
  // torn down every time this component re-renders.
  const handleLogoComplete = useRef(() => setPhase('name')).current;

  // Name phase: "Fran" fades, "K" slams in
  useEffect(() => {
    if (phase !== 'name') return;
    const kTimer = setTimeout(() => setShowK(true), 1200);
    const nextTimer = setTimeout(() => setPhase('text'), 3000);
    return () => { clearTimeout(kTimer); clearTimeout(nextTimer); };
  }, [phase]);

  // Text phase: system checks
  useEffect(() => {
    if (phase !== 'text') return;

    setVisibleSteps([]);

    const timers = BOOT_STEPS.map((step, index) =>
      setTimeout(() => {
        setVisibleSteps(prev => [...prev, step.text]);
        if (index === BOOT_STEPS.length - 1) {
          timers.push(setTimeout(() => setPhase('sweep'), 400));
        }
      }, step.delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Sweep phase: gauge test
  useEffect(() => {
    if (phase !== 'sweep') return;

    const duration = 1800;
    const startTime = Date.now();
    let frame = null;
    let doneTimer = null;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.5) {
        const t = progress * 2;
        setSweepAngle(-120 + (240 * (1 - Math.pow(1 - t, 3))));
      } else {
        const t = (progress - 0.5) * 2;
        setSweepAngle(120 - (240 * (1 - Math.pow(1 - t, 3))));
      }

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setSweepAngle(-120);
        doneTimer = setTimeout(() => {
          setPhase('complete');
          onCompleteRef.current?.();
        }, 200);
      }
    };
    frame = requestAnimationFrame(animate);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (doneTimer !== null) clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: '#000000' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          data-testid="boot-sequence"
        >
          {phase === 'logo' && (
            <HondaLogoAnimation onComplete={handleLogoComplete} />
          )}

          {phase === 'name' && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="mb-6"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0.9, y: -10 }}
                transition={{ duration: 0.8 }}
                style={{ filter: 'drop-shadow(0 0 40px rgba(200, 0, 0, 0.4))' }}
              >
                <BootLogo size={224} />
              </motion.div>

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
                      style={{ color: '#DC2626', textShadow: '0 0 40px rgba(220, 38, 38, 0.8), 0 0 80px rgba(220, 38, 38, 0.4)' }}
                      initial={{ opacity: 0, scale: 3, x: 50, rotate: -15 }}
                      animate={{ opacity: 1, scale: 1, x: 0, rotate: 0 }}
                      transition={{ duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55], scale: { duration: 0.3, ease: 'easeOut' } }}
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
              </motion.div>
            </motion.div>
          )}

          {phase === 'text' && (
            <div className="flex flex-col items-center">
              <div className="mb-6" style={{ opacity: 0.6 }}>
                <BootLogo size={128} />
              </div>
              <div className="font-orbitron text-sm space-y-1 text-left w-72">
                {visibleSteps.map((text, index) => (
                  <motion.div key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                    <span className="text-red-500">&rsaquo;</span>
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
                    style={{ transformOrigin: '50% 76.3%', transform: `rotate(${sweepAngle}deg)` }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/assets/gauges/rpm-needle-center.png" alt="" className="w-[15%] object-contain" />
                </div>
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs uppercase tracking-widest text-zinc-500 font-orbitron">
                Gauge Sweep Test
              </motion.div>
            </div>
          )}

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-56">
            <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #DC2626 0%, #ffffff 100%)' }}
                initial={{ width: '0%' }}
                animate={{
                  width: phase === 'logo' ? '25%' :
                         phase === 'name' ? '50%' :
                         phase === 'text' ? '75%' :
                         phase === 'sweep' ? '95%' : '100%'
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
