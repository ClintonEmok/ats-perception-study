import React from 'react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { buildAdaptiveHourLayout, DAILY_COUNTS, SELECTED_HOURLY_COUNTS } from '../real/data';
import { DASHBOARD_COLORS, DENSITY_GRADIENT } from '../dashboard-demo-showcase/palette';

const DAY_LABELS = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 31', 'Fri 01', 'Sat 02', 'Sun 03'];

export interface CompareTimelineViewProps {
  warpProgress?: number;
  multiplier?: number;
  activeComparisonPhase?: number;
}

export const CompareTimelineView: React.FC<CompareTimelineViewProps> = ({
  warpProgress = 1,
  multiplier = 2.2,
}) => {
  const VIEW_WIDTH = 1480;
  const margin = 12;
  const innerWidth = VIEW_WIDTH - margin * 2;
  const overviewHeight = 44;
  const detailHeight = 62;

  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);
  const maximumDay = Math.max(...DAILY_COUNTS, 1);
  const maximumHour = Math.max(...SELECTED_HOURLY_COUNTS, 1);

  // Overview brush positioned on Thu 31 (day index 3)
  const brushLeft = (3 / 7) * innerWidth;
  const brushWidth = innerWidth / 7;

  // Multiple Slices across the 24-hour Detail domain:
  const slices = [
    {
      id: 'slice-1',
      label: 'Slice 1',
      startHour: 0,
      endHour: 6,
      color: '#64748b',
      bg: 'rgba(148, 163, 184, 0.08)',
      borderColor: 'rgba(148, 163, 184, 0.4)',
      isCompared: false,
    },
    {
      id: 'slice-2',
      label: 'Slice 2',
      startHour: 6,
      endHour: 12,
      color: '#64748b',
      bg: 'rgba(148, 163, 184, 0.08)',
      borderColor: 'rgba(148, 163, 184, 0.4)',
      isCompared: false,
    },
    {
      id: 'slice-3',
      label: 'Slice 3 (A)',
      startHour: 12,
      endHour: 16.5,
      color: '#0284c7',
      bg: 'rgba(56, 189, 248, 0.16)',
      borderColor: '#38bdf8',
      borderWidth: 2,
      isCompared: true,
    },
    {
      id: 'slice-4',
      label: 'Slice 4 (B)',
      startHour: 17,
      endHour: 21,
      color: '#b45309',
      bg: 'rgba(251, 191, 36, 0.18)',
      borderColor: '#fbbf24',
      borderWidth: 2,
      isCompared: true,
    },
    {
      id: 'slice-5',
      label: 'Slice 5',
      startHour: 21,
      endHour: 24,
      color: '#64748b',
      bg: 'rgba(148, 163, 184, 0.08)',
      borderColor: 'rgba(148, 163, 184, 0.4)',
      isCompared: false,
    },
  ];

  const getHourX = (hourFloat: number): number => {
    const intHour = Math.min(23, Math.floor(hourFloat));
    const fract = hourFloat - intHour;
    const item = hourLayout[intHour];
    if (!item) return innerWidth;
    return (item.start + fract * item.width) * innerWidth;
  };

  const cursorHour = 18.5;
  const cursorX = getHourX(cursorHour);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: DASHBOARD_COLORS.card,
        color: DASHBOARD_COLORS.foreground,
        fontFamily: FONT_FAMILY,
        padding: '6px 0 4px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* 1. TOP ROW: YEARLY/WEEKLY OVERVIEW TIMELINE */}
      <div style={{ margin: `0 ${margin}px` }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 14,
            color: DASHBOARD_COLORS.mutedForeground,
            fontSize: 8.5,
            padding: '0 4px',
            fontFamily: MONO_FONT,
          }}
        >
          <span style={{ fontWeight: 700 }}>OVERVIEW · WEEK OF 28 JUL – 03 AUG 2025</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Sparse</span>
            <span
              style={{
                width: 72,
                height: 5,
                borderRadius: 2,
                border: `1px solid ${DASHBOARD_COLORS.border}`,
                background: DENSITY_GRADIENT,
              }}
            />
            <span>Dense</span>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${overviewHeight + 16}`}
          style={{ width: '100%', height: overviewHeight + 16, display: 'block' }}
        >
          <g transform={`translate(${margin},2)`}>
            {/* Daily Bars */}
            {DAILY_COUNTS.map((count, index) => {
              const dayWidth = innerWidth / 7;
              const barHeight = (count / maximumDay) * overviewHeight;
              return (
                <g key={index}>
                  <rect
                    x={index * dayWidth + 2}
                    y={overviewHeight - barHeight}
                    width={dayWidth - 4}
                    height={barHeight}
                    rx={2}
                    fill="rgba(23, 23, 23, 0.16)"
                  />
                  <text
                    x={index * dayWidth + dayWidth / 2}
                    y={overviewHeight - barHeight - 2}
                    textAnchor="middle"
                    fill={DASHBOARD_COLORS.mutedForeground}
                    fontSize="7.5"
                    fontFamily={MONO_FONT}
                  >
                    {count}
                  </text>
                </g>
              );
            })}

            {/* Brush Range Box (Thu 31) */}
            <rect
              x={brushLeft}
              y={0}
              width={brushWidth}
              height={overviewHeight}
              fill="rgba(139, 92, 246, 0.16)"
              stroke={DASHBOARD_COLORS.brushStroke}
              strokeWidth="1.5"
            />
            <rect
              x={brushLeft - 2}
              y={0}
              width={4}
              height={overviewHeight}
              rx={1}
              fill={DASHBOARD_COLORS.brushHandle}
            />
            <rect
              x={brushLeft + brushWidth - 2}
              y={0}
              width={4}
              height={overviewHeight}
              rx={1}
              fill={DASHBOARD_COLORS.brushHandle}
            />

            {/* Day Labels */}
            {DAY_LABELS.map((label, index) => (
              <text
                key={label}
                x={(index + 0.5) * (innerWidth / 7)}
                y={overviewHeight + 13}
                textAnchor="middle"
                fill={index === 3 ? '#7c3aed' : DASHBOARD_COLORS.mutedForeground}
                fontSize="8.5"
                fontWeight={index === 3 ? 800 : 500}
                fontFamily={MONO_FONT}
              >
                {label}
              </text>
            ))}
          </g>
        </svg>
      </div>

      {/* 2. BOTTOM ROW: DETAIL TIMELINE WITH MULTIPLE COMMITTED SLICES */}
      <div style={{ margin: `2px ${margin}px 0` }}>
        <div
          style={{
            height: 14,
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: DASHBOARD_COLORS.mutedForeground,
            fontFamily: MONO_FONT,
            fontSize: 8.5,
            letterSpacing: 0.8,
          }}
        >
          <span style={{ fontWeight: 800, color: '#0f172a' }}>
            DETAIL TIMELINE · 5 APPLIED SLICES (MULTIPLE INTERVALS PRESERVED)
          </span>
          <span style={{ color: '#ea580c', fontWeight: 800 }}>
            ADAPTIVE DBTA · {multiplier.toFixed(1)}×
          </span>
        </div>

        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${detailHeight + 22}`}
          style={{ width: '100%', height: detailHeight + 22, display: 'block' }}
        >
          <g transform={`translate(${margin},2)`}>
            {/* Hourly Adaptive Bars */}
            {hourLayout.map((hour, index) => {
              const count = SELECTED_HOURLY_COUNTS[index];
              const x = hour.start * innerWidth;
              const barWidth = Math.max(1, hour.width * innerWidth - 2);
              const barHeight = (count / maximumHour) * (detailHeight - 12);
              return (
                <rect
                  key={index}
                  x={x + 1}
                  y={detailHeight - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  fill="rgba(23, 23, 23, 0.14)"
                />
              );
            })}

            {/* MULTIPLE SLICES RENDERED ACROSS THE DETAIL DOMAIN */}
            {slices.map((slice) => {
              const x0 = getHourX(slice.startHour);
              const x1 = getHourX(slice.endHour);
              const sliceWidth = Math.max(4, x1 - x0);

              return (
                <g key={slice.id}>
                  {/* Slice Bounding Band */}
                  <rect
                    x={x0}
                    y={2}
                    width={sliceWidth}
                    height={detailHeight - 4}
                    rx={4}
                    fill={slice.bg}
                    stroke={slice.borderColor}
                    strokeWidth={slice.borderWidth ?? 1}
                    strokeDasharray={slice.isCompared ? 'none' : '3 2'}
                  />

                  {/* Slice Top Label Badge */}
                  <g transform={`translate(${x0 + 4}, 4)`}>
                    <rect
                      x={0}
                      y={0}
                      width={slice.isCompared ? 74 : 44}
                      height={12}
                      rx={3}
                      fill="#ffffff"
                      stroke={slice.borderColor}
                      strokeWidth={1}
                    />
                    <text
                      x={slice.isCompared ? 37 : 22}
                      y={8.5}
                      textAnchor="middle"
                      fill={slice.color}
                      fontSize="6.5"
                      fontWeight="850"
                      fontFamily={MONO_FONT}
                    >
                      {slice.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Time Cursor */}
            <line
              x1={cursorX}
              x2={cursorX}
              y1={0}
              y2={detailHeight}
              stroke={DASHBOARD_COLORS.timeCursor}
              strokeWidth="2"
            />
            <circle
              cx={cursorX}
              cy={0}
              r="4"
              fill={DASHBOARD_COLORS.timeCursor}
              stroke="#ffffff"
              strokeWidth="1.5"
            />

            {/* Axis Hour Ticks */}
            {[0, 4, 8, 12, 16, 17, 18, 19, 20, 24].map((hour) => {
              const x = hour === 24 ? innerWidth : hourLayout[hour].start * innerWidth;
              const isPeak = hour >= 12 && hour <= 21;
              return (
                <text
                  key={hour}
                  x={x}
                  y={detailHeight + 14}
                  textAnchor="middle"
                  fill={isPeak ? '#0f172a' : DASHBOARD_COLORS.mutedForeground}
                  fontSize="7.5"
                  fontWeight={isPeak ? 750 : 500}
                  fontFamily={MONO_FONT}
                >
                  {String(hour).padStart(2, '0')}:00
                </text>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
