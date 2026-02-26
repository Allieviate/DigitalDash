import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_STEPS = [
  { text: 'ECU LINK: OK', delay: 0 },
  { text: 'SENSORS: ONLINE', delay: 200 },
  { text: 'VTEC: READY', delay: 400 },
  { text: 'DISPLAY: READY', delay: 600 },
];

// Animated Honda Logo Component - Premium boot animation
const HondaLogoAnimation = ({ onComplete }) => {
  const [logoPhase, setLogoPhase] = useState(0);
  // logoPhase 0: black
  // logoPhase 1: logo fades + scales in from center
  // logoPhase 2: glow pulse
  // logoPhase 3: hold, then complete

  useEffect(() => {
    const t1 = setTimeout(() => setLogoPhase(1), 600);
    const t2 = setTimeout(() => setLogoPhase(2), 2000);
    const t3 = setTimeout(() => setLogoPhase(3), 3000);
    const t4 = setTimeout(() => {
      onComplete?.();
    }, 4000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Subtle scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Center glow — blooms when logoPhase >= 2 */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{
          opacity: logoPhase >= 2 ? [0, 0.18, 0.1] : 0,
          scale: logoPhase >= 2 ? [0.3, 1.6, 1.2] : 0.3,
        }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        style={{
          width: 420,
          height: 420,
          background:
            'radial-gradient(circle, rgba(200,0,0,0.55) 0%, rgba(180,0,0,0.15) 45%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Persistent soft ambient glow once logo is visible */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: logoPhase >= 3 ? 0.07 : 0 }}
        transition={{ duration: 1.2 }}
        style={{
          width: 600,
          height: 600,
          background:
            'radial-gradient(circle, rgba(210,0,0,0.5) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Main stack */}
      <div className="relative z-20 flex flex-col items-center select-none">
        {/* Honda Logo */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{
            opacity: logoPhase >= 1 ? 1 : 0,
            scale: logoPhase >= 1 ? 1 : 0.55,
          }}
          transition={{
            duration: 1.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Glow placed BEHIND logo as a separate div, not on the image itself */}
          <motion.div
            className="absolute pointer-events-none rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: logoPhase >= 2 ? 1 : 0 }}
            transition={{ duration: 1.4 }}
            style={{
              width: 260,
              height: 260,
              background: 'radial-gradient(circle, rgba(200,0,0,0.35) 0%, rgba(160,0,0,0.12) 50%, transparent 70%)',
              filter: 'blur(28px)',
              zIndex: 0,
            }}
          />

          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_699be97dec012b23d1ab481d/ab8fac882_honda-logo.png"
            alt="Honda H"
            style={{
              width: 220,
              height: 220,
              objectFit: 'contain',
              position: 'relative',
              zIndex: 1,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export const BootSequence = ({ onComplete }) => {
  const [phase, setPhase] = useState('logo'); // logo, name, text, sweep, complete
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [sweepAngle, setSweepAngle] = useState(-120);
  const [showK, setShowK] = useState(false);

  // Handle logo animation complete
  const handleLogoComplete = () => {
    setPhase('name');
  };

  // Phase 2: Name animation - "Fran" fades, then "K" slams in
  useEffect(() => {
    if (phase !== 'name') return;
    
    // Show "K" after "Fran" has faded in
    const kTimer = setTimeout(() => setShowK(true), 1200);
    
    // Move to text phase
    const nextTimer = setTimeout(() => setPhase('text'), 3000);
    
    return () => {
      clearTimeout(kTimer);
      clearTimeout(nextTimer);
    };
  }, [phase]);

  // Phase 3: System check text
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

  // Phase 4: Gauge sweep animation
  useEffect(() => {
    if (phase !== 'sweep') return;

    const duration = 1800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 0.5) {
        const t = progress * 2;
        const eased = 1 - Math.pow(1 - t, 3);
        setSweepAngle(-120 + (240 * eased));
      } else {
        const t = (progress - 0.5) * 2;
        const eased = 1 - Math.pow(1 - t, 3);
        setSweepAngle(120 - (240 * eased));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSweepAngle(-120);
        setTimeout(() => {
          setPhase('complete');
          onComplete?.();
        }, 200);
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
            background: '#080808'
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          data-testid="boot-sequence"
        >
          {/* Logo phase - NEW Animated Honda Logo */}
          {phase === 'logo' && (
            <HondaLogoAnimation onComplete={handleLogoComplete} />
          )}

          {/* Name phase - "FRAN" fades in, then "K" slams in aggressively */}
          {phase === 'name' && (
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Logo stays visible but smaller */}
              <motion.img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_699be97dec012b23d1ab481d/ab8fac882_honda-logo.png"
                alt="Honda"
                className="w-56 h-auto mb-6"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0.9, y: -10 }}
                transition={{ duration: 0.8 }}
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(200, 0, 0, 0.4))'
                }}
              />
              
              {/* "FRAN" + "K" Name Animation */}
              <div className="flex items-center justify-center mb-4">
                {/* "FRAN" - Dramatic fade in */}
                <motion.span
                  className="font-orbitron text-7xl font-bold tracking-tight"
                  style={{ 
                    color: '#ffffff',
                    textShadow: '0 0 30px rgba(255, 255, 255, 0.3)'
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    duration: 1.0, 
                    ease: [0.25, 0.46, 0.45, 0.94] // Custom easing for dramatic effect
                  }}
                >
                  FRAN
                </motion.span>
                
                {/* "K" - Aggressive slam in with Type R red */}
                <AnimatePresence>
                  {showK && (
                    <motion.span
                      className="font-orbitron text-7xl font-black tracking-tight"
                      style={{ 
                        color: '#DC2626',
                        textShadow: '0 0 40px rgba(220, 38, 38, 0.8), 0 0 80px rgba(220, 38, 38, 0.4)'
                      }}
                      initial={{ 
                        opacity: 0, 
                        scale: 3,
                        x: 50,
                        rotate: -15
                      }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        x: 0,
                        rotate: 0
                      }}
                      transition={{ 
                        duration: 0.4,
                        ease: [0.68, -0.55, 0.265, 1.55], // Aggressive bounce
                        scale: { duration: 0.3, ease: 'easeOut' }
                      }}
                    >
                      K
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              
              {/* "Digital Instrument Cluster" subtitle */}
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

          {/* Text phase - System checks */}
          {phase === 'text' && (
            <div className="flex flex-col items-center">
              {/* Small logo */}
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_699be97dec012b23d1ab481d/ab8fac882_honda-logo.png"
                alt="Honda"
                className="w-32 h-auto mb-6 opacity-60"
              />
              
              <div className="font-orbitron text-sm space-y-1 text-left w-72">
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
            </div>
          )}

          {/* Sweep phase - Gauge test */}
          {phase === 'sweep' && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-56 h-56">
                <img 
                  src="/assets/gauges/rpm-gauge.png"
                  alt="RPM"
                  className="absolute inset-0 w-full h-full object-contain opacity-70"
                />
                <img 
                  src="/assets/gauges/rpm-numbers.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain opacity-70"
                />
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
                className="text-xs uppercase tracking-widest text-zinc-500 font-orbitron"
              >
                Gauge Sweep Test
              </motion.div>
            </div>
          )}

          {/* Progress bar */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-56">
            <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ 
                  background: 'linear-gradient(90deg, #DC2626 0%, #ffffff 100%)'
                }}
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
