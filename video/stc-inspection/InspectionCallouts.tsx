import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { THEME } from './data';

interface InspectionCalloutsProps {
  progress: number; // 0 -> 1 entrance
}

export const InspectionCallouts: React.FC<InspectionCalloutsProps> = ({
  progress,
}) => {
  if (progress <= 0) return null;

  // Staggered entrances
  const c1Entrance = interpolate(progress, [0, 0.45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const c2Entrance = interpolate(progress, [0.25, 0.75], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const c3Entrance = interpolate(progress, [0.55, 1.0], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* SVG Leader Lines with Exact 3D Projected Coordinates */}
      <svg
        width={1920}
        height={1080}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        {/* Leader Line 1: Spatial Fidelity (R4) -> Base Map South Anchor (943.8, 577.7) */}
        {c1Entrance > 0 && (
          <g opacity={c1Entrance}>
            <circle cx={943.8} cy={577.7} r={3.5} fill={THEME.blue} />
            <circle cx={943.8} cy={577.7} r={7} fill="rgba(37, 99, 235, 0.2)" />
            <path
              d="M 943.8 577.7 L 943.8 690 L 520 690"
              fill="none"
              stroke={THEME.blue}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          </g>
        )}

        {/* Leader Line 2: Temporal Order (R2/R3) -> Vertical Time Axis Mid (594.8, 429.6) */}
        {c2Entrance > 0 && (
          <g opacity={c2Entrance}>
            <circle cx={594.8} cy={429.6} r={3.5} fill={THEME.emerald} />
            <circle cx={594.8} cy={429.6} r={7} fill="rgba(5, 150, 105, 0.2)" />
            <path
              d="M 594.8 429.6 L 380 429.6 L 380 310 L 360 310"
              fill="none"
              stroke={THEME.emerald}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          </g>
        )}

        {/* Leader Line 3: DBTA Allocation -> Thursday Active Slab (1141.3, 330.0) */}
        {c3Entrance > 0 && (
          <g opacity={c3Entrance}>
            <circle cx={1141.3} cy={330.0} r={3.5} fill={THEME.tueRed} />
            <circle cx={1141.3} cy={330.0} r={7} fill="rgba(200, 16, 46, 0.2)" />
            <path
              d="M 1141.3 330.0 L 1380 330.0 L 1380 280 L 1530 280"
              fill="none"
              stroke={THEME.tueRed}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          </g>
        )}
      </svg>

      {/* ==================================================== */}
      {/* 1. CALLOUT 1: SPATIAL FIDELITY (R4)                  */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          left: 230,
          top: 650,
          width: 290,
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid rgba(37, 99, 235, 0.25)',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.12)',
          padding: '10px 14px',
          opacity: c1Entrance,
          transform: `translateY(${(1 - c1Entrance) * 12}px)`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span
            style={{
              backgroundColor: THEME.blueBg,
              color: THEME.blue,
              fontSize: 8.5,
              fontWeight: 850,
              fontFamily: MONO_FONT,
              padding: '1.5px 5px',
              borderRadius: 3,
              border: `1px solid ${THEME.blueBorder}`,
              letterSpacing: 0.6,
            }}
          >
            R4
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 850,
              color: THEME.navy,
              letterSpacing: 0.6,
              fontFamily: MONO_FONT,
            }}
          >
            SPATIAL FIDELITY (MAPLIBRE)
          </span>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 750, color: THEME.navy, marginBottom: 2 }}>
          x / y coordinates remain invariant
        </div>
        <div style={{ fontSize: 9.5, color: THEME.textMuted, lineHeight: 1.35 }}>
          MapLibre base plane preserves geographic coordinates; spatial relations never distorted.
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. CALLOUT 2: TEMPORAL ORDER (R2 / R3)               */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          top: 270,
          width: 270,
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid rgba(5, 150, 105, 0.25)',
          boxShadow: '0 8px 24px rgba(5, 150, 105, 0.12)',
          padding: '10px 14px',
          opacity: c2Entrance,
          transform: `translateY(${(1 - c2Entrance) * 12}px)`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span
            style={{
              backgroundColor: THEME.emeraldBg,
              color: THEME.emerald,
              fontSize: 8.5,
              fontWeight: 850,
              fontFamily: MONO_FONT,
              padding: '1.5px 5px',
              borderRadius: 3,
              border: `1px solid rgba(5, 150, 105, 0.3)`,
              letterSpacing: 0.6,
            }}
          >
            R2 · R3
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 850,
              color: THEME.navy,
              letterSpacing: 0.6,
              fontFamily: MONO_FONT,
            }}
          >
            TEMPORAL ORDER
          </span>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 750, color: THEME.navy, marginBottom: 2 }}>
          earlier → later
        </div>
        <div style={{ fontSize: 9.5, color: THEME.textMuted, lineHeight: 1.35 }}>
          Chronological sequence preserved along calibrated vertical axis.
        </div>
      </div>

      {/* ==================================================== */}
      {/* 3. CALLOUT 3: DBTA ALLOCATION (Density-Scaled Spacing)*/}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          left: 1530,
          top: 245,
          width: 300,
          background: '#ffffff',
          borderRadius: 8,
          border: `1px solid ${THEME.tueRedBorder}`,
          boxShadow: '0 8px 24px rgba(200, 16, 46, 0.12)',
          padding: '10px 14px',
          opacity: c3Entrance,
          transform: `translateY(${(1 - c3Entrance) * 12}px)`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span
            style={{
              backgroundColor: THEME.tueRedBg,
              color: THEME.tueRed,
              fontSize: 8.5,
              fontWeight: 850,
              fontFamily: MONO_FONT,
              padding: '1.5px 5px',
              borderRadius: 3,
              border: `1px solid ${THEME.tueRedBorder}`,
              letterSpacing: 0.6,
            }}
          >
            DBTA ALLOCATION
          </span>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 750, color: THEME.navy, marginBottom: 2 }}>
          Dense intervals expand · Sparse compress
        </div>
        <div style={{ fontSize: 9.5, color: THEME.textMuted, lineHeight: 1.35 }}>
          Inherits density allocation from Slide 16; separates overlapping burst incidents vertically.
        </div>
      </div>
    </div>
  );
};
