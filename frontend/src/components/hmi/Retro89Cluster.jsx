import React from 'react';
import { useVehicleData } from '../../contexts/VehicleDataContext';

const DEG = Math.PI / 180;
const polar = (cx, cy, r, angleDeg) => ({
  x: cx + r * Math.cos(angleDeg * DEG),
  y: cy + r * Math.sin(angleDeg * DEG),
});

// Describes a horseshoe arc path (outer arc → connect → inner arc reversed)
function arcBandPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  const largeArc = sweep > 180 ? 1 : 0;
  const pOuterStart = polar(cx, cy, rOuter, startAngle);
  const pOuterEnd = polar(cx, cy, rOuter, endAngle);
  const pInnerStart = polar(cx, cy, rInner, endAngle);
  const pInnerEnd = polar(cx, cy, rInner, startAngle);
  return [
    `M${pOuterStart.x},${pOuterStart.y}`,
    `A${rOuter},${rOuter} 0 ${largeArc} 1 ${pOuterEnd.x},${pOuterEnd.y}`,
    `L${pInnerStart.x},${pInnerStart.y}`,
    `A${rInner},${rInner} 0 ${largeArc} 0 ${pInnerEnd.x},${pInnerEnd.y}`,
    'Z',
  ].join(' ');
}

function GaugePod({ value, max, ticks, unit, redlineStart, id }) {
  const cx = 50, cy = 50;
  const startAngle = 135;
  const endAngle = 405;
  const sweep = endAngle - startAngle;

  // Radii for the horseshoe band
  const rOuter = 47;
  const rInner = 28;
  const rTick = 45;       // outer edge of ticks
  const rTickMajor = 39;  // inner edge of major ticks
  const rTickMinor = 42;  // inner edge of minor ticks
  const rNum = 34;        // number position radius

  // Needle
  const clamped = Math.min(Math.max(value, 0), max);
  const needleAngle = startAngle + (clamped / max) * sweep;

  // Redline angle
  const redlineAngle = redlineStart !== undefined
    ? startAngle + (redlineStart / max) * sweep
    : endAngle + 1;

  // Major ticks
  const majorCount = ticks.length;
  const majorStep = sweep / (majorCount - 1);

  // Minor ticks (4 between each major)
  const minorPerMajor = 4;
  const totalMinor = (majorCount - 1) * minorPerMajor;
  const minorStep = sweep / totalMinor;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
      <defs>
        {/* Dark maroon gradient for the band */}
        <radialGradient id={`face-${id}`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#3d1219" />
          <stop offset="60%" stopColor="#2d0a0f" />
          <stop offset="100%" stopColor="#1a0508" />
        </radialGradient>
        {/* Chrome rim gradient */}
        <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#999" />
          <stop offset="35%" stopColor="#e0e0e0" />
          <stop offset="50%" stopColor="#fff" />
          <stop offset="65%" stopColor="#d0d0d0" />
          <stop offset="100%" stopColor="#777" />
        </linearGradient>
      </defs>

      {/* Horseshoe gauge face — maroon band */}
      <path
        d={arcBandPath(cx, cy, rOuter, rInner, startAngle, endAngle)}
        fill={`url(#face-${id})`}
      />

      {/* Chrome outer rim — just the outer arc */}
      <path
        d={(() => {
          const r = rOuter + 0.8;
          const p1 = polar(cx, cy, r, startAngle);
          const p2 = polar(cx, cy, r, endAngle);
          return `M${p1.x},${p1.y} A${r},${r} 0 1 1 ${p2.x},${p2.y}`;
        })()}
        fill="none"
        stroke={`url(#rim-${id})`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Thin inner rim */}
      <path
        d={(() => {
          const r = rInner - 0.3;
          const p1 = polar(cx, cy, r, startAngle);
          const p2 = polar(cx, cy, r, endAngle);
          return `M${p1.x},${p1.y} A${r},${r} 0 1 1 ${p2.x},${p2.y}`;
        })()}
        fill="none"
        stroke="rgba(100,100,100,0.3)"
        strokeWidth="0.3"
      />

      {/* Minor ticks */}
      {[...Array(totalMinor + 1)].map((_, i) => {
        const angle = startAngle + i * minorStep;
        if (i % minorPerMajor === 0) return null;
        const inRedline = angle >= redlineAngle;
        const outer = polar(cx, cy, rTick, angle);
        const inner = polar(cx, cy, rTickMinor, angle);
        return (
          <line
            key={`mi-${i}`}
            x1={outer.x} y1={outer.y}
            x2={inner.x} y2={inner.y}
            stroke={inRedline ? '#dc2626' : 'rgba(255,255,255,0.6)'}
            strokeWidth="0.4"
          />
        );
      })}

      {/* Major ticks + numbers */}
      {ticks.map((tickVal, i) => {
        const angle = startAngle + i * majorStep;
        const inRedline = angle >= redlineAngle;
        const outer = polar(cx, cy, rTick, angle);
        const inner = polar(cx, cy, rTickMajor, angle);
        const numPos = polar(cx, cy, rNum, angle);

        // Font size: smaller for 3-digit numbers
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
      })}

      {/* Unit label at bottom center */}
      <text
        x={cx}
        y={cy + 25}
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

      {/* Needle — originates from center, extends to tick area */}
      <line
        x1={polar(cx, cy, 5, needleAngle + 180).x}
        y1={polar(cx, cy, 5, needleAngle + 180).y}
        x2={polar(cx, cy, 40, needleAngle).x}
        y2={polar(cx, cy, 40, needleAngle).y}
        stroke="#f0f0f0"
        strokeWidth="1.3"
        strokeLinecap="round"
        style={{ transition: 'x1 80ms ease-out, y1 80ms ease-out, x2 80ms ease-out, y2 80ms ease-out' }}
      />
    </svg>
  );
}

export default function Retro89Cluster() {
  const { signals } = useVehicleData();
  const rpm = signals.rpm || 0;
  const speed = signals.speed_mph || 0;

  return (
    <div
      className="flex items-center justify-center"
      data-testid="retro89-cluster"
      style={{ gap: '12px' }}
    >
      {/* TACHOMETER */}
      <div style={{ width: 420, height: 420 }}>
        <GaugePod
          id="tach"
          value={rpm}
          max={8000}
          ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8]}
          unit="x1000r/min"
          redlineStart={7000}
        />
      </div>

      {/* SPEEDOMETER */}
      <div style={{ width: 420, height: 420 }}>
        <GaugePod
          id="speedo"
          value={speed}
          max={170}
          ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170]}
          unit="mph"
        />
      </div>
    </div>
  );
}

export { GaugePod };
