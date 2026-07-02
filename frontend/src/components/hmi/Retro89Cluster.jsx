import React from 'react';
import { useVehicleData } from '../../contexts/VehicleDataContext';

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

function GaugePod({ value, max, ticks, unit, redlineStart, id, showDigitalValue, vtecRange }) {
  const cx = 50, cy = 50;
  const startAngle = 135;
  const endAngle = 405;
  const sweep = endAngle - startAngle;

  const rTick = 45;       // outer edge of ticks
  const rTickMajor = 39;  // inner edge of major ticks
  const rTickMinor = 42;  // inner edge of minor ticks
  const rNum = 34;        // number position radius

  const bgSrc = GAUGE_BG[id];

  // Needle angle
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

      {/* VTEC indicator — inside gauge face */}
      {inVtec && (
        <text
          x={cx}
          y={cy - 8}
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
          x={cx}
          y={cy + 14}
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

      {/* Needle — uses CSS transform: rotate() for smooth animation */}
      <line
        x1={cx - 5} y1={cy}
        x2={cx + 40} y2={cy}
        stroke="#f0f0f0"
        strokeWidth="1.3"
        strokeLinecap="round"
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          transform: `rotate(${needleAngle}deg)`,
          transition: 'transform 100ms ease-out',
          willChange: 'transform',
        }}
      />

      {/* Center hub cap */}
      <circle cx={cx} cy={cy} r={3.5} fill="#333" stroke="#555" strokeWidth="0.4" />
    </svg>
  );
}

export default function Retro89Cluster() {
  const { signals } = useVehicleData();
  const rpm = signals.rpm || 0;
  const speed = signals.speed_mph || 0;

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
