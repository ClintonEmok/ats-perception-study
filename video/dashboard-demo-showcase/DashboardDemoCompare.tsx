import React from 'react';
import { interpolate } from 'remotion';
import { getStkdeIntensityColor, getStkdeSignedDifferenceColor } from '../../src/app/stkde-3d/lib/palette';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { CUBE_CELLS, DAILY_COUNTS, WEEK_START } from '../real/data';
import { DASHBOARD_COLORS } from './palette';

const GRID_SIZE = 30;
const VIEWBOX_SIZE = 600;
const CELL_SIZE = VIEWBOX_SIZE / GRID_SIZE;

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const aggregateDay = (dayIndex: number): number[] => {
  const values = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => 0);
  for (const cell of CUBE_CELLS) {
    const day = Math.min(6, Math.max(0, Math.floor((cell.time - WEEK_START) / 86400)));
    if (day !== dayIndex) continue;
    const x = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(((cell.x + 50) / 100) * GRID_SIZE)));
    const y = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(((cell.z + 50) / 100) * GRID_SIZE)));
    values[y * GRID_SIZE + x] += cell.count;
  }
  const maximum = Math.max(...values, 1);
  return values.map((value) => value / maximum);
};

const LEFT_DAY = 2;
const RIGHT_DAY = 3;
const LEFT_GRID = aggregateDay(LEFT_DAY);
const RIGHT_GRID = aggregateDay(RIGHT_DAY);
const rawDifference = LEFT_GRID.map((value, index) => value - (RIGHT_GRID[index] ?? 0));
const maxDifference = Math.max(...rawDifference.map(Math.abs), 1);
const DIFFERENCE_GRID = rawDifference.map((value) => value / maxDifference);

function HeatmapCard({
  label,
  eventCount,
  grid,
  tone,
  opacity = 1,
  left,
  width,
}: {
  label: string;
  eventCount?: number;
  grid: number[];
  tone: 'left' | 'right' | 'difference';
  opacity?: number;
  left: number;
  width: number;
}) {
  const borderColor = tone === 'left' ? '#38bdf8' : tone === 'right' ? '#fbbf24' : '#a78bfa';
  return (
    <figure
      style={{
        position: 'absolute',
        left,
        top: 78,
        width,
        margin: 0,
        opacity,
        border: `2px solid ${borderColor}`,
        borderRadius: 12,
        background: 'rgba(255, 255, 255, 0.92)',
        padding: 12,
        boxSizing: 'border-box',
        boxShadow: `0 18px 50px ${borderColor}18`,
      }}
    >
      <figcaption
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 9,
          color: DASHBOARD_COLORS.mutedForeground,
          fontFamily: MONO_FONT,
          fontSize: 10,
          fontWeight: 750,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        <span>{label}</span>
        {eventCount !== undefined ? <span>{eventCount.toLocaleString()} events</span> : null}
      </figcaption>
      <svg
        width="100%"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="crispEdges"
        style={{ display: 'block', borderRadius: 7, background: tone === 'difference' ? '#e2e8f0' : '#faf4d7' }}
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
              fill={tone === 'difference'
                ? getStkdeSignedDifferenceColor(value, value === 0 ? 0.98 : 0.9)
                : getStkdeIntensityColor(value, 0.34 + value * 0.64)}
            />
          );
        })}
      </svg>
    </figure>
  );
}

export function DashboardDemoCompare({ differenceProgress }: { differenceProgress: number }) {
  const sideWidth = interpolate(differenceProgress, [0, 1], [570, 425], clamp);
  const leftPosition = interpolate(differenceProgress, [0, 1], [120, 42], clamp);
  const rightPosition = interpolate(differenceProgress, [0, 1], [910, 1133], clamp);
  const differencePosition = interpolate(differenceProgress, [0, 1], [665, 587], clamp);

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
      <div
        style={{
          position: 'absolute',
          left: 28,
          right: 28,
          top: 22,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${DASHBOARD_COLORS.border}`,
        }}
      >
        <div
          style={{
            border: `1px solid ${differenceProgress > 0.5 ? '#a78bfa' : DASHBOARD_COLORS.border}`,
            borderRadius: 999,
            padding: '7px 12px',
            color: differenceProgress > 0.5 ? '#6d28d9' : DASHBOARD_COLORS.mutedForeground,
            background: differenceProgress > 0.5 ? 'rgba(139, 92, 246, 0.1)' : DASHBOARD_COLORS.card,
            fontFamily: MONO_FONT,
            fontSize: 10,
            fontWeight: 750,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {differenceProgress > 0.5 ? 'Hide A − B difference' : 'Show A − B difference'}
        </div>
      </div>

      <HeatmapCard
        label="Slice 3 (A)"
        eventCount={DAILY_COUNTS[LEFT_DAY]}
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
        width={425}
      />
      <HeatmapCard
        label="Slice 4 (B)"
        eventCount={DAILY_COUNTS[RIGHT_DAY]}
        grid={RIGHT_GRID}
        tone="right"
        left={rightPosition}
        width={sideWidth}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          border: `1px solid ${DASHBOARD_COLORS.border}`,
          borderRadius: 9,
          background: 'rgba(255, 255, 255, 0.92)',
          padding: '8px 14px',
          color: DASHBOARD_COLORS.mutedForeground,
          fontFamily: MONO_FONT,
          fontSize: 9,
          letterSpacing: 1,
        }}
      >
        <span style={{ color: '#0284c7' }}>A · WED 30 JUL</span>
        <span>Shared sparse grid</span>
        <span style={{ color: '#b45309' }}>B · THU 31 JUL</span>
      </div>
    </div>
  );
}
