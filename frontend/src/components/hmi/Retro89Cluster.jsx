import React from 'react';
import { useVehicleData } from '../../contexts/VehicleDataContext';

// Math helpers
const DEG = Math.PI / 180;
const polar = (cx, cy, r, angleDeg) => ({
  x: cx + r * Math.cos(angleDeg * DEG),
  y: cy + r * Math.sin(angleDeg * DEG),
});

// Single gauge SVG pod
function GaugePod({ value, max, ticks, label, unit, redlineStart, size = 380, id }) {
  const cx = 50, cy = 50;
  const startAngle = 135;   // bottom-left
  const endAngle = 405;     // bottom-right (270° sweep)
  const sweep = endAngle - startAngle;

  // Needle angle
  const clamped = Math.min(Math.max(value, 0), max);
  const needleAngle = startAngle + (clamped / max) * sweep;

  // Generate major ticks + numbers
  const majorCount = ticks.length;
  const majorStep = sweep / (majorCount - 1);

  // Generate minor ticks (4 between each major)
  const minorPerMajor = 4;
  const totalMinor = (majorCount - 1) * minorPerMajor;
  const minorStep = sweep / totalMinor;

  // Redline angle
  const redlineAngle = redlineStart !== undefined
    ? startAngle + (redlineStart / max) * sweep
    : endAngle + 1; // no redline

  return (
    <div style={{ width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <defs>
          {/* Deep red gradient matching reference */}
          <radialGradient id={`bg-${id}`} cx="50%" cy="45%" r="52%">
            <stop offset="0%" stopColor="#2a0a0a" />
            <stop offset="70%" stopColor="#3d0c0c" />
            <stop offset="95%" stopColor="#1a0505" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
          {/* Chrome rim gradient */}
          <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#888" />
            <stop offset="30%" stopColor="#ddd" />
            <stop offset="50%" stopColor="#fff" />
            <stop offset="70%" stopColor="#ccc" />
            <stop offset="100%" stopColor="#666" />
          </linearGradient>
          {/* Needle glow */}
          <filter id={`needle-glow-${id}`}>
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Chrome outer rim */}
        <circle cx={cx} cy={cy} r="49" fill="none" stroke={`url(#rim-${id})`} strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r="47.5" fill={`url(#bg-${id})`} stroke="#333" strokeWidth="0.3" />

        {/* Redline arc */}
        {redlineStart !== undefined && (() => {
          const r = 41;
          const a1 = redlineAngle;
          const a2 = endAngle;
          const p1 = polar(cx, cy, r, a1);
          const p2 = polar(cx, cy, r, a2);
          const arcSweep = (a2 - a1) > 180 ? 1 : 0;
          return (
            <path
              d={`M${p1.x},${p1.y} A${r},${r} 0 ${arcSweep} 1 ${p2.x},${p2.y}`}
              fill="none"
              stroke="#dc2626"
              strokeWidth="3"
              opacity="0.5"
            />
          );
        })()}

        {/* Minor ticks */}
        {[...Array(totalMinor + 1)].map((_, i) => {
          const angle = startAngle + i * minorStep;
          // Skip positions that land on major ticks
          if (i % minorPerMajor === 0) return null;
          const inRedline = angle >= redlineAngle;
          const outer = polar(cx, cy, 43, angle);
          const inner = polar(cx, cy, 40, angle);
          return (
            <line
              key={`mi-${i}`}
              x1={outer.x} y1={outer.y}
              x2={inner.x} y2={inner.y}
              stroke={inRedline ? '#ef4444' : 'rgba(244,244,245,0.5)'}
              strokeWidth="0.4"
            />
          );
        })}

        {/* Major ticks + numbers */}
        {ticks.map((tickVal, i) => {
          const angle = startAngle + i * majorStep;
          const inRedline = angle >= redlineAngle;
          const outerR = 43;
          const innerR = 37;
          const numR = 33;
          const outer = polar(cx, cy, outerR, angle);
          const inner = polar(cx, cy, innerR, angle);
          const numPos = polar(cx, cy, numR, angle);
          return (
            <g key={`ma-${i}`}>
              <line
                x1={outer.x} y1={outer.y}
                x2={inner.x} y2={inner.y}
                stroke={inRedline ? '#ef4444' : '#f4f4f5'}
                strokeWidth="1.2"
              />
              <text
                x={numPos.x}
                y={numPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={inRedline ? '#ef4444' : '#e4e4e7'}
                style={{
                  fontSize: tickVal >= 100 ? '4.5px' : '5.5px',
                  fontFamily: "'Helvetica Neue', 'Arial Narrow', sans-serif",
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                {tickVal}
              </text>
            </g>
          );
        })}

        {/* Center label */}
        <text
          x={cx} y={cy + 16}
          textAnchor="middle"
          fill="#71717a"
          style={{
            fontSize: '3px',
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          {unit}
        </text>

        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={polar(cx, cy, 36, needleAngle).x}
          y2={polar(cx, cy, 36, needleAngle).y}
          stroke="#f4f4f5"
          strokeWidth="1.4"
          strokeLinecap="round"
          filter={`url(#needle-glow-${id})`}
          style={{ transition: 'x2 80ms ease-out, y2 80ms ease-out' }}
        />
        {/* Counter-weight stub */}
        <line
          x1={cx} y1={cy}
          x2={polar(cx, cy, 6, needleAngle + 180).x}
          y2={polar(cx, cy, 6, needleAngle + 180).y}
          stroke="#a1a1aa"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Center cap */}
        <circle cx={cx} cy={cy} r="3" fill="#1a1a1a" stroke="#404040" strokeWidth="0.5" />
        <circle cx={cx} cy={cy} r="1.5" fill="#262626" stroke="#525252" strokeWidth="0.3" />
      </svg>
    </div>
  );
}

// Main cluster component
export default function Retro89Cluster() {
  const { signals } = useVehicleData();

  const rpm = signals.rpm || 0;
  const speed = signals.speed_mph || 0;

  return (
    <div
      className="flex items-center justify-center gap-8"
      data-testid="retro89-cluster"
    >
      {/* TACHOMETER */}
      <GaugePod
        id="tach"
        value={rpm}
        max={8000}
        ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8]}
        label="Tachometer"
        unit="x1000r/min"
        redlineStart={6500}
        size={380}
      />

      {/* SPEEDOMETER */}
      <GaugePod
        id="speedo"
        value={speed}
        max={170}
        ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170]}
        label="Speedometer"
        unit="mph"
        size={380}
      />
    </div>
  );
}

export { GaugePod };
