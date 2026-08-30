import React, { useMemo } from 'react';
import { useVehicleSignal } from '../../contexts/VehicleDataContext';

const DEG = Math.PI / 180;
const polar = (cx, cy, r, angleDeg) => ({
  x: cx + r * Math.cos(angleDeg * DEG),
  y: cy + r * Math.sin(angleDeg * DEG),
});

// Map gauge id to PNG background path
const GAUGE_BG = {
  tach: '/assets/gauges/rpm-gauge.png',
  speedo: '/assets/gauges/spd-gauge.png',
};

// Gauge face geometry. Matches the PNG bezel: 240 degree sweep from
// the 7:30 position to the 1:30 position.
const CX = 50;
const CY = 50;
const START_ANGLE = 150;
const END_ANGLE = 390;
const SWEEP = END_ANGLE - START_ANGLE;

const R_TICK = 44;        // outer edge of ticks — aligned to PNG bezel
const R_TICK_MAJOR = 38;  // inner edge of major ticks
const R_TICK_MINOR = 41;  // inner edge of minor ticks
const R_NUM = 32;         // number position radius — matches PNG

const MINOR_PER_MAJOR = 4;

function GaugePod({ value, max, ticks, unit, redlineStart, id, showDigitalValue, vtecRange }) {
  const bgSrc = GAUGE_BG[id];

  // Needle angle
  const clamped = Math.min(Math.max(value, 0), max);
  const needleAngle = START_ANGLE + (clamped / max) * SWEEP;

  // Ticks never move. They were being rebuilt on every render, which
  // at streaming rates meant roughly 50 SVG nodes per gauge recreated
  // and reconciled per frame, purely so the needle could rotate.
  //
  // ticks arrives as an inline array literal from the parent, so its
  // identity changes every render. Keying the memo on the joined
  // string makes it stable by content instead.
  const ticksKey = ticks.join(',');
  const tickValues = useMemo(() => ticksKey.split(',').map(Number), [ticksKey]);

  const { minorTickEls, majorTickEls } = useMemo(() => {
    const majorCount = tickValues.length;
    const majorStep = SWEEP / (majorCount - 1);
    const totalMinor = (majorCount - 1) * MINOR_PER_MAJOR;
    const minorStep = SWEEP / totalMinor;

    const redlineAngle = redlineStart !== undefined
      ? START_ANGLE + (redlineStart / max) * SWEEP
      : END_ANGLE + 1;

    const minors = [];
    for (let i = 0; i <= totalMinor; i += 1) {
      if (i % MINOR_PER_MAJOR === 0) continue;
      const angle = START_ANGLE + i * minorStep;
      const inRedline = angle >= redlineAngle;
      const outer = polar(CX, CY, R_TICK, angle);
      const inner = polar(CX, CY, R_TICK_MINOR, angle);
      minors.push(
        <line
          key={`mi-${i}`}
          x1={outer.x} y1={outer.y}
          x2={inner.x} y2={inner.y}
          stroke={inRedline ? '#dc2626' : 'rgba(255,255,255,0.6)'}
          strokeWidth="0.4"
        />
      );
    }

    const majors = tickValues.map((tickVal, i) => {
      const angle = START_ANGLE + i * majorStep;
      const inRedline = angle >= redlineAngle;
      const outer = polar(CX, CY, R_TICK, angle);
      const inner = polar(CX, CY, R_TICK_MAJOR, angle);
      const numPos = polar(CX, CY, R_NUM, angle);

      const fontSize = String(tickVal).length >= 3 ? '5px' : '6.5px';

      return (
        <g key={`ma-${i}`}>
          <line
            x1={outer.x} y1={outer.y}
            x2={inner.x} y2={inner.y}
            stroke={inRedline ? '#dc2626' : '#f0f0f0'}
            strokeWidth="1.1"
          />
          <text
            x={numPos.x}
            y={numPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={inRedline ? '#dc2626' : '#f0f0f0'}
            style={{
              fontSize,
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 500,
            }}
          >
            {tickVal}
          </text>
        </g>
      );
    });

    return { minorTickEls: minors, majorTickEls: majors };
  }, [tickValues, max, redlineStart]);

  // VTEC state
  const inVtec = vtecRange && value >= vtecRange.start && value <= vtecRange.end;
  const vtecProgress = inVtec
    ? Math.min(1, Math.max(0, (value - vtecRange.start) / Math.max(1, vtecRange.end - vtecRange.start)))
    : 0;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
      <defs>
        {/* VTEC glow filter */}
        {vtecRange && (
          <filter id={`vtec-glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.8 0"
              result="redGlow" />
            <feMerge>
              <feMergeNode in="redGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* PNG gauge background — the actual gauge face image */}
      {bgSrc && (
        <image href={bgSrc} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
      )}

      {/* Minor ticks */}
      {minorTickEls}

      {/* Major ticks + numbers */}
      {majorTickEls}

      {/* Unit label at bottom center */}
      <text
        x={CX}
        y={CY + 25}
        textAnchor="middle"
        fill="rgba(255,255,255,0.35)"
        style={{
          fontSize: '3px',
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: '0.1em',
        }}
      >
        {unit}
      </text>

      {/* VTEC indicator — inside gauge face */}
      {inVtec && (
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FF0000"
          filter={`url(#vtec-glow-${id})`}
          style={{
            fontSize: '5px',
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.15em',
            opacity: 0.6 + vtecProgress * 0.4,
          }}
          data-testid="vtec-indicator"
        >
          VTEC
        </text>
      )}

      {/* Digital value readout — inside gauge face */}
      {showDigitalValue && (
        <text
          x={CX}
          y={CY + 14}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.9)"
          style={{
            fontSize: '8px',
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 500,
            letterSpacing: '1px',
            textShadow: inVtec ? `0 0 ${3 + vtecProgress * 5}px rgba(255, 0, 0, 0.5)` : 'none',
          }}
          data-testid={`${id}-digital-readout`}
        >
          {Math.round(value)}
        </text>
      )}

      {/* Needle — uses CSS transform: rotate() for smooth animation.
          The 100ms transition is deliberate: Hondata cycles its packets
          at 100Hz across ten IDs, so rpm lands roughly every 70ms and
          the transition interpolates between arrivals. */}
      <line
        x1={CX - 5} y1={CY}
        x2={CX + 40} y2={CY}
        stroke="#f0f0f0"
        strokeWidth="1.3"
        strokeLinecap="round"
        style={{
          transformOrigin: `${CX}px ${CY}px`,
          transform: `rotate(${needleAngle}deg)`,
          transition: 'transform 100ms ease-out',
          willChange: 'transform',
        }}
      />

      {/* Center hub cap */}
      <circle cx={CX} cy={CY} r={3.5} fill="#333" stroke="#555" strokeWidth="0.4" />
    </svg>
  );
}

export default function Retro89Cluster() {
  const rpm = useVehicleSignal('rpm') || 0;
  const speed = useVehicleSignal('speed_mph') || 0;

  return (
    <div
      className="flex items-center justify-between w-full"
      data-testid="retro89-cluster"
      style={{ paddingLeft: 40, paddingRight: 40 }}
    >
      {/* TACHOMETER — far left */}
      <div style={{ width: 420, height: 420 }}>
        <GaugePod
          id="tach"
          value={rpm}
          max={8000}
          ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8]}
          unit="x1000r/min"
          redlineStart={7000}
          showDigitalValue
          vtecRange={{ start: 3000, end: 8000 }}
        />
      </div>

      {/* SPEEDOMETER — far right */}
      <div style={{ width: 420, height: 420 }}>
        <GaugePod
          id="speedo"
          value={speed}
          max={160}
          ticks={[0, 20, 40, 60, 80, 100, 120, 140, 160]}
          unit="mph"
        />
      </div>
    </div>
  );
}

export { GaugePod };
