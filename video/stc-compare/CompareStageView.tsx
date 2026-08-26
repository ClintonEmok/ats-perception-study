import React from 'react';
import { interpolate } from 'remotion';
import { getStkdeIntensityColor, getStkdeSignedDifferenceColor } from '../../src/app/stkde-3d/lib/palette';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DASHBOARD_COLORS } from '../dashboard-demo-showcase/palette';
import {
  CELL_SIZE,
  DIFFERENCE_GRID,
  GRID_SIZE,
  LEFT_DAY_DATE,
  LEFT_DAY_LABEL,
  LEFT_EVENTS,
  LEFT_GRID,
  RIGHT_DAY_DATE,
  RIGHT_DAY_LABEL,
  RIGHT_EVENTS,
  RIGHT_GRID,
  VIEWBOX_SIZE,
} from './data';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

function HeatmapCard({
  label,
  eventCount,
  grid,
  tone,
  opacity = 1,
  left,
  width,
  height = 540,
}: {
  label: string;
  eventCount?: number;
  grid: number[];
  tone: 'left' | 'right' | 'difference';
  opacity?: number;
  left: number;
  width: number;
  height?: number;
}) {
  const borderColor = tone === 'left' ? '#38bdf8' : tone === 'right' ? '#fbbf24' : '#a78bfa';
  const headerColor = tone === 'left' ? '#0284c7' : tone === 'right' ? '#b45309' : '#7c3aed';

  return (
    <figure
      style={{
        position: 'absolute',
        left,
        top: 60,
        width,
        height,
        margin: 0,
        opacity,
        border: `2px solid ${borderColor}`,
        borderRadius: 10,
        background: 'rgba(255, 255, 255, 0.96)',
        padding: 12,
        boxSizing: 'border-box',
        boxShadow: `0 12px 36px ${borderColor}16`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <figcaption
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 8,
          fontFamily: MONO_FONT,
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        <span style={{ color: headerColor }}>{label}</span>
        {eventCount !== undefined ? (
          <span style={{ color: DASHBOARD_COLORS.mutedForeground, fontSize: 9.5 }}>
            {eventCount.toLocaleString()} events
          </span>
        ) : (
          <span style={{ color: '#7c3aed', fontSize: 9.5 }}>Normalized KDE(A) − KDE(B)</span>
        )}
      </figcaption>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          borderRadius: 6,
          overflow: 'hidden',
          border: `1px solid ${borderColor}50`,
          background: tone === 'difference' ? '#e2e8f0' : '#faf4d7',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          shapeRendering="crispEdges"
          style={{ display: 'block' }}
        >
          {grid.map((value, index) => {
            if (tone !== 'difference' && value <= 0) return null;
            if (tone === 'difference' && Math.abs(value) < 0.025) return null;
            const x = (index % GRID_SIZE) * CELL_SIZE;
            const y = (GRID_SIZE - 1 - Math.floor(index / GRID_SIZE)) * CELL_SIZE;
            return (
              <rect
                key={`${tone}-${index}`}
                x={x}
                y={y}
                width={CELL_SIZE + 0.25}
                height={CELL_SIZE + 0.25}
                fill={
                  tone === 'difference'
                    ? getStkdeSignedDifferenceColor(value, value === 0 ? 0.98 : 0.9)
                    : getStkdeIntensityColor(value, 0.34 + value * 0.64)
                }
              />
            );
          })}
        </svg>
      </div>
    </figure>
  );
}

export const CompareStageView: React.FC<{ differenceProgress: number }> = ({
  differenceProgress,
}) => {
  // Smoothly morphs from 2-card layout (side-by-side) to 3-card layout (with difference in center)
  const sideWidth = interpolate(differenceProgress, [0, 1], [660, 450], clamp);
  const leftPosition = interpolate(differenceProgress, [0, 1], [60, 30], clamp);
  const rightPosition = interpolate(differenceProgress, [0, 1], [760, 990], clamp);
  const differencePosition = interpolate(differenceProgress, [0, 1], [510, 510], clamp);
  const isDiffActive = differenceProgress > 0.4;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: DASHBOARD_COLORS.background,
        color: DASHBOARD_COLORS.foreground,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* 1. Compare Stage Top Action Bar with Toggle Button */}
      <div
        style={{
          position: 'absolute',
          left: 30,
          right: 30,
          top: 12,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          borderBottom: `1px solid ${DASHBOARD_COLORS.border}`,
        }}
      >
        <div
          style={{
            border: `1.5px solid ${isDiffActive ? '#a78bfa' : DASHBOARD_COLORS.border}`,
            borderRadius: 999,
            padding: '5px 12px',
            color: isDiffActive ? '#6d28d9' : DASHBOARD_COLORS.mutedForeground,
            background: isDiffActive ? 'rgba(139, 92, 246, 0.12)' : DASHBOARD_COLORS.card,
            fontFamily: MONO_FONT,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            boxShadow: isDiffActive ? '0 2px 10px rgba(139, 92, 246, 0.15)' : 'none',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 99,
              backgroundColor: isDiffActive ? '#7c3aed' : '#94a3b8',
            }}
          />
          {isDiffActive ? 'Hide A − B difference' : 'Show A − B difference'}
        </div>
      </div>

      {/* 2. Side-by-Side and Difference Heatmap Cards */}
      <HeatmapCard
        label={LEFT_DAY_LABEL}
        eventCount={LEFT_EVENTS}
        grid={LEFT_GRID}
        tone="left"
        left={leftPosition}
        width={sideWidth}
      />

      <HeatmapCard
        label="Signed difference · A − B"
        grid={DIFFERENCE_GRID}
        tone="difference"
        opacity={differenceProgress}
        left={differencePosition}
        width={450}
      />

      <HeatmapCard
        label={RIGHT_DAY_LABEL}
        eventCount={RIGHT_EVENTS}
        grid={RIGHT_GRID}
        tone="right"
        left={rightPosition}
        width={sideWidth}
      />

      {/* 3. Bottom Metadata Indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          border: `1px solid ${DASHBOARD_COLORS.border}`,
          borderRadius: 6,
          background: 'rgba(255, 255, 255, 0.94)',
          padding: '5px 14px',
          color: DASHBOARD_COLORS.mutedForeground,
          fontFamily: MONO_FONT,
          fontSize: 9,
          letterSpacing: 1,
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}
      >
        <span style={{ color: '#0284c7', fontWeight: 800 }}>A · {LEFT_DAY_DATE.toUpperCase()}</span>
        <span>·</span>
        <span style={{ color: DASHBOARD_COLORS.foreground, fontWeight: 700 }}>SHARED 30×30 SPARSE GRID</span>
        <span>·</span>
        <span style={{ color: '#b45309', fontWeight: 800 }}>B · {RIGHT_DAY_DATE.toUpperCase()}</span>
      </div>
    </div>
  );
};
