import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  DARK_TEXT,
  DBTA_BOUNDARIES,
  DENSITY_SAMPLE_POINTS,
  MUTED_TEXT,
  TUE_RED,
  UNIFORM_BOUNDARIES,
} from './data';

interface DensityCurveProps {
  progress: number; // 0 = uniform space, 1 = DBTA allocated space
  revealProgress: number; // 0 = hidden, 1 = fully drawn/risen
  width: number;
  height: number;
  showPeakLabel?: boolean;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

// Helper to convert time t (0..1) to current screen X based on boundary transformation
function timeToScreenX(t: number, progress: number, width: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const intervalIndex = Math.min(4, Math.floor(clampedT * 5));
  const fraction = clampedT * 5 - intervalIndex;

  const uLeft = UNIFORM_BOUNDARIES[intervalIndex];
  const uRight = UNIFORM_BOUNDARIES[intervalIndex + 1];
  const aLeft = DBTA_BOUNDARIES[intervalIndex];
  const aRight = DBTA_BOUNDARIES[intervalIndex + 1];

  const currentLeft = interpolate(progress, [0, 1], [uLeft, aLeft], clamp);
  const currentRight = interpolate(progress, [0, 1], [uRight, aRight], clamp);

  return currentLeft + fraction * (currentRight - currentLeft);
}

// Generate smooth cubic bezier SVG path from sample points
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const DensityCurve: React.FC<DensityCurveProps> = ({
  progress,
  revealProgress,
  width,
  height,
  showPeakLabel = true,
}) => {
  if (revealProgress <= 0.001) return null;

  // Calculate curve points with comfortable top clearance
  const points = DENSITY_SAMPLE_POINTS.map((pt) => {
    const x = timeToScreenX(pt.t, progress, width);
    // Scale peak height with 40px top clearance for badge and labels
    const maxCurveRise = height - 42;
    const yVal = pt.d * maxCurveRise * revealProgress;
    const y = height - yVal;
    return { x, y };
  });

  const pathD = buildSmoothPath(points);
  const areaPathD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  // Find peak point (around t = 0.5, i.e. 14:30)
  const peakIndex = points.findIndex((p, idx) => DENSITY_SAMPLE_POINTS[idx].d >= 0.99);
  const peakPt = peakIndex >= 0 ? points[peakIndex] : points[Math.floor(points.length / 2)];

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Subtle gradient fill under density curve */}
          <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TUE_RED} stopOpacity={0.24 * revealProgress} />
            <stop offset="60%" stopColor={TUE_RED} stopOpacity={0.09 * revealProgress} />
            <stop offset="100%" stopColor={TUE_RED} stopOpacity={0.01} />
          </linearGradient>

          {/* Peak accent glow filter */}
          <filter id="peakGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={TUE_RED} floodOpacity="0.45" />
          </filter>
        </defs>

        {/* 1. Shaded density area */}
        <path d={areaPathD} fill="url(#densityGradient)" />

        {/* 2. Density curve line */}
        <path
          d={pathD}
          fill="none"
          stroke={TUE_RED}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={revealProgress}
        />

        {/* 3. Peak marker & beacon ring */}
        {peakPt && revealProgress > 0.6 && (
          <g transform={`translate(${peakPt.x}, ${peakPt.y})`}>
            {/* Outer halo */}
            <circle
              r={8}
              fill="#ffffff"
              stroke={TUE_RED}
              strokeWidth={3}
              filter="url(#peakGlow)"
            />
            {/* Core dot */}
            <circle r={3.5} fill={TUE_RED} />
          </g>
        )}
      </svg>

      {/* 4. "MEASURED EVENT DENSITY" Tag */}
      {revealProgress > 0.4 && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: interpolate(revealProgress, [0.4, 0.9], [0, 1], clamp),
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              backgroundColor: 'rgba(200, 16, 46, 0.08)',
              border: `1.5px solid rgba(200, 16, 46, 0.25)`,
              borderRadius: 6,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: TUE_RED,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontFamily: FONT_FAMILY,
                fontWeight: 800,
                color: TUE_RED,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              MEASURED EVENT DENSITY
            </span>
          </div>

          <span
            style={{
              fontSize: 12,
              fontFamily: FONT_FAMILY,
              fontWeight: 600,
              color: MUTED_TEXT,
            }}
          >
            Input signal to allocation engine
          </span>
        </div>
      )}

      {/* 5. High Density Peak Callout Badge */}
      {showPeakLabel && peakPt && revealProgress > 0.7 && (
        <div
          style={{
            position: 'absolute',
            left: peakPt.x,
            top: peakPt.y - 30,
            transform: 'translateX(-50%)',
            opacity: interpolate(revealProgress, [0.7, 1], [0, 1], clamp),
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              padding: '3px 9px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: 4,
              fontSize: 11,
              fontFamily: MONO_FONT,
              fontWeight: 800,
              letterSpacing: 0.5,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            HIGH DENSITY BURST
          </div>
        </div>
      )}
    </div>
  );
};
