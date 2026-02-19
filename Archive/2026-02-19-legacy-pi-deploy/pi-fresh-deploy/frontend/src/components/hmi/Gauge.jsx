import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export const Gauge = ({ 
  value = 0, 
  min = 0, 
  max = 8000, 
  label = 'RPM',
  size = 280,
  strokeWidth = 12,
  showValue = true,
  redline = null,
  segments = null,
  className = ''
}) => {
  const { theme } = useTheme();
  
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  
  // Arc configuration (270 degrees, starting from bottom-left)
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;
  
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalAngle / 360) * circumference;
  
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = (normalizedValue - min) / (max - min);
  const valueArcLength = arcLength * percentage;
  
  // Calculate the path for the arc
  const polarToCartesian = (angle) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
    };
  };
  
  const describeArc = (start, end) => {
    const startPoint = polarToCartesian(start);
    const endPoint = polarToCartesian(end);
    const largeArc = (end - start) > 180 ? 1 : 0;
    return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;
  };
  
  const backgroundArc = describeArc(startAngle, endAngle);
  const currentAngle = startAngle + (totalAngle * percentage);
  const valueArc = percentage > 0 ? describeArc(startAngle, currentAngle) : '';
  
  // Redline arc
  const redlineArc = useMemo(() => {
    if (!redline) return null;
    const redlinePercentage = (redline - min) / (max - min);
    const redlineStartAngle = startAngle + (totalAngle * redlinePercentage);
    return describeArc(redlineStartAngle, endAngle);
  }, [redline, min, max, startAngle, totalAngle]);
  
  // Generate tick marks
  const ticks = useMemo(() => {
    const count = 9;
    const tickArray = [];
    for (let i = 0; i <= count; i++) {
      const tickPercentage = i / count;
      const tickAngle = startAngle + (totalAngle * tickPercentage);
      const tickValue = min + (max - min) * tickPercentage;
      const isMajor = i % 2 === 0;
      
      const innerRadius = radius - (isMajor ? 25 : 15);
      const outerRadius = radius - 5;
      
      const rad = (tickAngle - 90) * Math.PI / 180;
      const x1 = center + innerRadius * Math.cos(rad);
      const y1 = center + innerRadius * Math.sin(rad);
      const x2 = center + outerRadius * Math.cos(rad);
      const y2 = center + outerRadius * Math.sin(rad);
      
      // Label position
      const labelRadius = radius - 45;
      const lx = center + labelRadius * Math.cos(rad);
      const ly = center + labelRadius * Math.sin(rad);
      
      tickArray.push({
        x1, y1, x2, y2,
        lx, ly,
        value: tickValue,
        isMajor,
        isRedline: redline && tickValue >= redline
      });
    }
    return tickArray;
  }, [min, max, radius, center, startAngle, totalAngle, redline]);
  
  // Determine if value is in danger zone
  const isDanger = redline && value >= redline;
  const accentColor = isDanger ? '#EF4444' : theme.accent;
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={backgroundArc}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Redline zone */}
        {redlineArc && (
          <path
            d={redlineArc}
            fill="none"
            stroke="rgba(239, 68, 68, 0.3)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        
        {/* Value arc */}
        {valueArc && (
          <path
            d={valueArc}
            fill="none"
            stroke={accentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="gauge-arc"
            style={{
              filter: isDanger ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : `drop-shadow(${theme.glow})`
            }}
          />
        )}
        
        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.isRedline ? '#EF4444' : '#52525b'}
              strokeWidth={tick.isMajor ? 2 : 1}
            />
            {tick.isMajor && (
              <text
                x={tick.lx}
                y={tick.ly}
                fill={tick.isRedline ? '#EF4444' : '#71717a'}
                fontSize="12"
                fontFamily="Chivo"
                fontWeight="500"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {Math.round(tick.value / 1000)}
              </text>
            )}
          </g>
        ))}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <>
            <span 
              className="font-mono text-5xl font-bold tracking-tighter"
              style={{ color: accentColor, textShadow: theme.glow }}
              data-testid="gauge-value"
            >
              {Math.round(value)}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 mt-1">
              {label}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default Gauge;
