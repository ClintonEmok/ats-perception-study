import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  buildAdaptiveHourLayout,
  DAILY_COUNTS,
  SELECTED_HOURLY_COUNTS,
} from '../real/data';

// Canonical constants copied directly from DualTimelineSurface.tsx
const OVERVIEW_HEIGHT = 42;
const DETAIL_HEIGHT = 60;
const AXIS_HEIGHT = 28;

const DENSITY_COLOR_STOPS = [
  { offset: 0, color: [34, 76, 255] as [number, number, number] },
  { offset: 0.5, color: [0, 212, 255] as [number, number, number] },
  { offset: 0.8, color: [255, 214, 64] as [number, number, number] },
  { offset: 1, color: [255, 64, 96] as [number, number, number] },
];
const TIME_CURSOR_COLOR = '#059669';

const OVERVIEW_MARGIN = { top: 8, right: 12, bottom: 10, left: 12 };
const DETAIL_MARGIN = { top: 8, right: 12, bottom: 12, left: 12 };

const DAY_LABELS = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 31', 'Fri 01', 'Sat 02', 'Sun 03'];

export function RealDashboardTimeline({
  selectionProgress = 0,
  warpProgress = 0,
  multiplier = 1,
  highlightDensity = false,
  highlightDetail = false,
}: {
  selectionProgress?: number;
  warpProgress?: number;
  multiplier?: number;
  highlightDensity?: boolean;
  highlightDetail?: boolean;
}) {
  const width = 1600;
  const overviewInnerWidth = width - OVERVIEW_MARGIN.left - OVERVIEW_MARGIN.right;
  const detailInnerWidth = width - DETAIL_MARGIN.left - DETAIL_MARGIN.right;

  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);

  // Brush window animation (Mon-Sun -> Thu 31 Jul)
  const fullWidth = overviewInnerWidth;
  const thuWidth = overviewInnerWidth / 7;
  const thuLeft = (3 / 7) * overviewInnerWidth;

  const currentBrushLeft = interpolate(selectionProgress, [0, 1], [0, thuLeft]);
  const currentBrushWidth = interpolate(selectionProgress, [0, 1], [fullWidth, thuWidth]);

  const maxDaily = Math.max(...DAILY_COUNTS);
  const maxHourly = Math.max(...SELECTED_HOURLY_COUNTS);

  // Time cursor position (scans across the 24h detail timeline)
  const cursorHour = interpolate(warpProgress, [0, 0.5, 1], [18, 18.5, 18.5]);
  const cursorIndex = Math.floor(cursorHour);
  const cursorFraction = cursorHour - cursorIndex;
  const cursorNormalized = hourLayout[cursorIndex].start + cursorFraction * hourLayout[cursorIndex].width;
  const cursorX = cursorNormalized * detailInnerWidth;

  // Burst window geometry for Thursday (17:00 - 20:00)
  const burstStartHour = 17;
  const burstEndHour = 20;
  const burstLeft = hourLayout[burstStartHour].start * detailInnerWidth;
  const burstRight = (hourLayout[burstEndHour].start + hourLayout[burstEndHour].width) * detailInnerWidth;
  const burstWidth = burstRight - burstLeft;

  const densityGradientCss = `linear-gradient(90deg, ${DENSITY_COLOR_STOPS.map(
    (stop) => `rgb(${stop.color.join(',')}) ${Math.round(stop.offset * 100)}%`
  ).join(', ')})`;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#ffffff',
        color: '#0f172a',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '10px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: '100%',
        }}
      >
        {/* ============================================================ */}
        {/* 1. OVERVIEW TIMELINE SURFACE (Matching DualTimelineSurface)   */}
        {/* ============================================================ */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            border: highlightDensity
              ? '1.5px solid #2563eb'
              : '1px solid transparent',
            borderRadius: 8,
            boxShadow: highlightDensity
              ? '0 0 20px rgba(37, 99, 235, 0.18)'
              : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Sparse -> Dense Legend & Continuous Density Strip */}
          <div
            style={{
              padding: '0 8px 4px 8px',
              marginLeft: OVERVIEW_MARGIN.left,
              marginRight: OVERVIEW_MARGIN.right,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#64748b',
                fontFamily: MONO_FONT,
                marginBottom: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: '#2563eb' }} />
                <span style={{ fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#1e293b' }}>
                  OVERVIEW TEMPORAL RESOLUTION (7 DAYS · DENSITY STRIP)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9.5 }}>Sparse</span>
                <span
                  style={{
                    height: 6,
                    width: 96,
                    borderRadius: 3,
                    border: '1px solid rgba(0, 0, 0, 0.15)',
                    background: densityGradientCss,
                    display: 'inline-block',
                  }}
                  aria-hidden="true"
                />
                <span style={{ fontSize: 9.5 }}>Dense</span>
              </div>
            </div>

            {/* Continuous 1D Density Heat Strip Bar */}
            <div style={{ position: 'relative', width: '100%', height: 10, borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: densityGradientCss,
                  opacity: 0.9,
                }}
              />
              {/* Density Strip Selection Box */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: currentBrushLeft,
                  width: currentBrushWidth,
                  borderRadius: 2,
                  border: '1px solid #2563eb',
                  background: 'rgba(37, 99, 235, 0.25)',
                  boxShadow: '0 0 10px rgba(37, 99, 235, 0.35)',
                }}
              />
            </div>
          </div>

          {/* Overview SVG Surface (Histogram Bins + D3 Brush + Axis) */}
          <svg width={width} height={OVERVIEW_HEIGHT + AXIS_HEIGHT} style={{ display: 'block' }}>
            <defs>
              <linearGradient id="overviewAdaptiveAxisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.12" />
              </linearGradient>
            </defs>

            <g transform={`translate(${OVERVIEW_MARGIN.left},${OVERVIEW_MARGIN.top})`}>
              {/* Daily Histogram Bins */}
              {DAILY_COUNTS.map((count, index) => {
                const dayWidth = overviewInnerWidth / 7;
                const x0 = index * dayWidth;
                const barWidth = Math.max(0, dayWidth - 4);
                const barHeight = (count / maxDaily) * OVERVIEW_HEIGHT;
                const isThu = index === 3;

                return (
                  <g key={`overview-bin-${index}`}>
                    <rect
                      x={x0 + 2}
                      y={OVERVIEW_HEIGHT - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx={3}
                      fill={isThu ? 'rgba(239, 68, 68, 0.22)' : 'rgba(59, 130, 246, 0.18)'}
                      stroke={isThu ? '#ef4444' : '#3b82f6'}
                      strokeWidth={1}
                    />
                    <text
                      x={x0 + dayWidth / 2}
                      y={OVERVIEW_HEIGHT - barHeight - 4}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={800}
                      fontFamily={MONO_FONT}
                      fill={isThu ? '#dc2626' : '#64748b'}
                    >
                      {count}
                    </text>
                  </g>
                );
              })}

              {/* D3 Brush Overlay (Exact visual structure from d3-brush) */}
              <g className="brush">
                {/* Brush Background Selection Rect */}
                <rect
                  className="selection"
                  x={currentBrushLeft}
                  y={0}
                  width={currentBrushWidth}
                  height={OVERVIEW_HEIGHT}
                  fill="rgba(37, 99, 235, 0.12)"
                  stroke="#2563eb"
                  strokeWidth={2}
                  rx={4}
                  style={{
                    filter: 'drop-shadow(0 1px 4px rgba(37, 99, 235, 0.25))',
                  }}
                />
                {/* West Resize Handle Grip */}
                <g transform={`translate(${currentBrushLeft - 4}, 0)`}>
                  <rect width={8} height={OVERVIEW_HEIGHT} fill="#2563eb" rx={3} opacity={0.9} />
                  <line x1={3} y1={14} x2={3} y2={28} stroke="#ffffff" strokeWidth={1.2} />
                  <line x1={5} y1={14} x2={5} y2={28} stroke="#ffffff" strokeWidth={1.2} />
                </g>
                {/* East Resize Handle Grip */}
                <g transform={`translate(${currentBrushLeft + currentBrushWidth - 4}, 0)`}>
                  <rect width={8} height={OVERVIEW_HEIGHT} fill="#2563eb" rx={3} opacity={0.9} />
                  <line x1={3} y1={14} x2={3} y2={28} stroke="#ffffff" strokeWidth={1.2} />
                  <line x1={5} y1={14} x2={5} y2={28} stroke="#ffffff" strokeWidth={1.2} />
                </g>
              </g>

              {/* Overview Axis & Date Ticks */}
              <g transform={`translate(0, ${OVERVIEW_HEIGHT})`} className="text-muted-foreground">
                {DAY_LABELS.map((day, index) => {
                  const dayWidth = overviewInnerWidth / 7;
                  const x = index * dayWidth + dayWidth / 2;
                  const isThu = index === 3;

                  return (
                    <g key={`overview-tick-${index}`} transform={`translate(${x}, 0)`}>
                      <line y2={6} stroke={isThu ? '#2563eb' : '#cbd5e1'} strokeWidth={1.2} />
                      <text
                        y={16}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={isThu ? 850 : 600}
                        fontFamily={MONO_FONT}
                        fill={isThu ? '#2563eb' : '#64748b'}
                      >
                        {day}
                      </text>
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>

        {/* ============================================================ */}
        {/* 2. DETAIL TIMELINE SURFACE (Matching DualTimelineSurface)     */}
        {/* ============================================================ */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            border: highlightDetail
              ? '1.5px solid #dc2626'
              : '1px solid transparent',
            borderRadius: 8,
            boxShadow: highlightDetail
              ? '0 0 20px rgba(220, 38, 38, 0.18)'
              : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Detail Header & Density Strip */}
          <div
            style={{
              padding: '0 8px 4px 8px',
              marginLeft: DETAIL_MARGIN.left,
              marginRight: DETAIL_MARGIN.right,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#64748b',
                fontFamily: MONO_FONT,
                marginBottom: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: warpProgress > 0.1 ? '#dc2626' : '#2563eb' }} />
                <span style={{ fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#1e293b' }}>
                  DETAIL TEMPORAL RESOLUTION · THURSDAY 31 JULY (24 HOURS)
                </span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#dc2626',
                    fontSize: 8.5,
                    fontWeight: 800,
                    fontFamily: MONO_FONT,
                  }}
                >
                  BURST: 17:00 – 20:00
                </span>
              </div>

              <span
                style={{
                  fontSize: 10,
                  fontFamily: MONO_FONT,
                  fontWeight: 800,
                  color: warpProgress > 0.1 ? '#dc2626' : '#2563eb',
                }}
              >
                {warpProgress > 0.1
                  ? `VISUAL ALLOCATION ACTIVE (${multiplier.toFixed(1)}× EXPANSION)`
                  : 'UNIFORM 1-HOUR BINS'}
              </span>
            </div>

            {/* Continuous Adaptive Density Heat Strip Bar */}
            <div style={{ position: 'relative', width: '100%', height: 10, borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #224cff 0%, #00d4ff 45%, #ffd640 70%, #ff4060 85%, #00d4ff 100%)',
                  opacity: 0.9,
                }}
              />
            </div>
          </div>

          {/* Detail SVG Surface (Adaptive Hourly Bins + Slices + Time Cursor + Axis) */}
          <svg width={width} height={DETAIL_HEIGHT + AXIS_HEIGHT} style={{ display: 'block' }}>
            <defs>
              <filter id="timeCursorGlowLight" x="-50%" y="-10%" width="200%" height="120%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor={TIME_CURSOR_COLOR} floodOpacity="0.45" />
              </filter>
            </defs>

            <g transform={`translate(${DETAIL_MARGIN.left},${DETAIL_MARGIN.top})`}>
              {/* Background Interactive Rect */}
              <rect
                width={detailInnerWidth}
                height={DETAIL_HEIGHT}
                fill="transparent"
                className="cursor-crosshair"
              />

              {/* 24-Hour Adaptive Hourly Bins */}
              {hourLayout.map((hourBin, idx) => {
                const count = SELECTED_HOURLY_COUNTS[idx];
                const x0 = hourBin.start * detailInnerWidth;
                const barWidth = Math.max(0, hourBin.width * detailInnerWidth - 2);
                const barHeight = (count / maxHourly) * DETAIL_HEIGHT;
                const isBurst = idx >= 17 && idx <= 20;

                return (
                  <g key={`detail-bin-${idx}`}>
                    <rect
                      x={x0 + 1}
                      y={DETAIL_HEIGHT - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx={2}
                      fill={isBurst ? 'rgba(239, 68, 68, 0.22)' : 'rgba(59, 130, 246, 0.16)'}
                      stroke={isBurst ? '#ef4444' : '#3b82f6'}
                      strokeWidth={1}
                    />
                    {hourBin.width > 0.032 ? (
                      <text
                        x={x0 + (hourBin.width * detailInnerWidth) / 2}
                        y={DETAIL_HEIGHT - barHeight - 4}
                        textAnchor="middle"
                        fontSize={8.5}
                        fontWeight={850}
                        fontFamily={MONO_FONT}
                        fill={isBurst ? '#dc2626' : '#475569'}
                      >
                        {count}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {/* Burst Slice Geometry Band (17:00 - 20:00) */}
              <g key="burst-slice-geometry">
                <rect
                  x={burstLeft}
                  y={2}
                  width={burstWidth}
                  height={DETAIL_HEIGHT - 4}
                  rx={4}
                  fill="rgba(251, 146, 60, 0.14)"
                  stroke="rgba(234, 88, 12, 0.85)"
                  strokeWidth={1.8}
                  strokeDasharray={warpProgress > 0.1 ? undefined : '5 3'}
                  opacity={0.9}
                />
                {warpProgress > 0.1 ? (
                  <rect
                    x={burstLeft}
                    y={1}
                    width={burstWidth}
                    height={DETAIL_HEIGHT - 2}
                    rx={4}
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth={2.2}
                    opacity={0.95}
                  />
                ) : null}
              </g>

              {/* Time Cursor Line & Head Indicator */}
              <g key="time-cursor-indicator">
                <line
                  x1={cursorX}
                  x2={cursorX}
                  y1={0}
                  y2={DETAIL_HEIGHT}
                  stroke={TIME_CURSOR_COLOR}
                  strokeWidth={2}
                  filter="url(#timeCursorGlowLight)"
                />
                <circle
                  cx={cursorX}
                  cy={0}
                  r={8}
                  fill="rgba(5, 150, 105, 0.15)"
                  stroke="rgba(5, 150, 105, 0.4)"
                  strokeWidth={1}
                />
                <circle
                  cx={cursorX}
                  cy={0}
                  r={5.5}
                  fill={TIME_CURSOR_COLOR}
                  stroke="#ffffff"
                  strokeWidth={2}
                  filter="url(#timeCursorGlowLight)"
                />
              </g>

              {/* Detail Axis & Hour Ticks */}
              <g transform={`translate(0, ${DETAIL_HEIGHT})`} className="text-muted-foreground">
                {[0, 2, 4, 6, 8, 10, 12, 14, 16, 17, 18, 19, 20, 22, 24].map((hour) => {
                  const localPos =
                    hour === 24
                      ? 1
                      : hourLayout[hour].start;
                  const x = localPos * detailInnerWidth;
                  const isBurstTick = hour >= 17 && hour <= 20;

                  return (
                    <g key={`detail-tick-${hour}`} transform={`translate(${x}, 0)`}>
                      <line
                        y2={isBurstTick ? 8 : 5}
                        stroke={isBurstTick ? '#dc2626' : '#cbd5e1'}
                        strokeWidth={isBurstTick ? 1.6 : 1}
                      />
                      <text
                        y={16}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight={isBurstTick ? 900 : 600}
                        fontFamily={MONO_FONT}
                        fill={isBurstTick ? '#dc2626' : '#64748b'}
                      >
                        {String(hour).padStart(2, '0')}:00
                      </text>
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
