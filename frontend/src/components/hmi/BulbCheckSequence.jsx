import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Battery, ChevronLeft, ChevronRight, Droplets, Wrench } from 'lucide-react';

const SEQUENCE_MS = 3000;
const SWEEP_UP_MS = 1200;
const SWEEP_DOWN_MS = 900;
const SWEEP_REST_MS = 300;

const RPM_RANGE = { minAngle: -135, maxAngle: 135, maxValue: 8000 };
const SPEED_RANGE = { minAngle: -135, maxAngle: 135, maxValue: 170 };

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const valueToAngle = (value, { minAngle, maxAngle, maxValue }) => {
  const normalized = clamp01(value / maxValue);
  return minAngle + normalized * (maxAngle - minAngle);
};

const SequenceGauge = ({ size, faceImage, ticksImage, numbersImage, needleImage, centerImage, value, range }) => {
  const angle = valueToAngle(value, range);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <img src={faceImage} alt="Gauge face" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
      <img src={ticksImage} alt="Gauge ticks" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
      <img src={numbersImage} alt="Gauge numbers" className="absolute inset-0 w-full h-full object-contain" draggable={false} />

      <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
        <img src={needleImage} alt="Gauge needle" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
      </div>

      <img src={centerImage} alt="Gauge center" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
    </div>
  );
};

const Indicator = ({ icon: Icon, label }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/60 flex items-center justify-center shadow-[0_0_14px_rgba(239,68,68,0.55)]">
      <Icon size={22} className="text-red-500" />
    </div>
    <span className="text-[10px] uppercase tracking-wider text-zinc-300 font-orbitron">{label}</span>
  </div>
);

export const BulbCheckSequence = ({ onComplete }) => {
  const [rpmValue, setRpmValue] = useState(0);
  const [speedValue, setSpeedValue] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const completedRef = useRef(false);

  const indicators = useMemo(
    () => [
      { icon: Wrench, label: 'Check Engine' },
      { icon: Droplets, label: 'Oil Pressure' },
      { icon: Battery, label: 'Battery' },
      { icon: ChevronLeft, label: 'Turn Left' },
      { icon: ChevronRight, label: 'Turn Right' },
      { icon: AlertTriangle, label: 'Shift Lights' },
    ],
    []
  );

  useEffect(() => {
    let frameId;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;

      if (elapsed <= SWEEP_UP_MS) {
        const t = easeOutCubic(clamp01(elapsed / SWEEP_UP_MS));
        setRpmValue(RPM_RANGE.maxValue * t);
        setSpeedValue(SPEED_RANGE.maxValue * t);
      } else if (elapsed <= SWEEP_UP_MS + SWEEP_DOWN_MS) {
        const downElapsed = elapsed - SWEEP_UP_MS;
        const t = easeOutCubic(clamp01(downElapsed / SWEEP_DOWN_MS));
        setRpmValue(RPM_RANGE.maxValue * (1 - t));
        setSpeedValue(SPEED_RANGE.maxValue * (1 - t));
      } else {
        setRpmValue(0);
        setSpeedValue(0);
      }

      if (elapsed < SWEEP_UP_MS + SWEEP_DOWN_MS + SWEEP_REST_MS) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    const fadeTimer = setTimeout(() => setIsFadingOut(true), 2200);
    const completeTimer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    }, SEQUENCE_MS);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="absolute inset-0 z-50 bg-black"
      data-testid="bulb-check-sequence"
      style={{
        transition: 'opacity 600ms ease',
        opacity: isFadingOut ? 0 : 1,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_40%,#2b2b2b_0%,#101010_30%,#000_100%)]" />

      <div className="relative h-full w-full flex flex-col items-center justify-between py-8">
        <div className="text-center">
          <p className="text-zinc-500 uppercase tracking-[0.32em] text-xs font-orbitron">Project Fran</p>
          <h1 className="text-white text-2xl font-bold tracking-[0.18em] font-orbitron mt-2">Functions Check</h1>
        </div>

        <div className="w-full flex items-end justify-center gap-10 px-8">
          <SequenceGauge
            size={430}
            faceImage="/assets/gauges/rpm-gauge.png"
            ticksImage="/assets/gauges/rpm-large-ticks.png"
            numbersImage="/assets/gauges/rpm-numbers.png"
            needleImage="/assets/gauges/rpm-needle.png"
            centerImage="/assets/gauges/rpm-needle-center.png"
            value={rpmValue}
            range={RPM_RANGE}
          />

          <div className="w-[440px] h-[280px] border border-zinc-800 rounded-xl bg-zinc-950/75 flex items-center justify-center">
            <span className="text-zinc-500 font-orbitron text-sm tracking-[0.28em] uppercase">Bulb Check Active</span>
          </div>

          <SequenceGauge
            size={430}
            faceImage="/assets/gauges/spd-gauge.png"
            ticksImage="/assets/gauges/spd-large-ticks.png"
            numbersImage="/assets/gauges/spd-numbers.png"
            needleImage="/assets/gauges/rpm-needle.png"
            centerImage="/assets/gauges/rpm-needle-center.png"
            value={speedValue}
            range={SPEED_RANGE}
          />
        </div>

        <div className="w-full flex items-center justify-center gap-6 pb-2">
          {indicators.map((indicator) => (
            <Indicator key={indicator.label} icon={indicator.icon} label={indicator.label} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BulbCheckSequence;
