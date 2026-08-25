import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  buildAdaptiveHourLayout,
  type AdaptiveDayLayout,
  REAL_WEEK_RECORDS,
  SELECTED_END,
  SELECTED_START,
  WEEK_END,
  WEEK_START,
} from '../real/data';

const buildBins = (start: number, end: number, count: number): number[] => {
  const bins = Array.from({ length: count }, () => 0);
  for (const record of REAL_WEEK_RECORDS) {
    if (record.timestamp < start || record.timestamp >= end) continue;
    const index = Math.min(count - 1, Math.floor(((record.timestamp - start) / (end - start)) * count));
    bins[index] += 1;
  }
  return bins;
};

const OVERVIEW_BINS = buildBins(WEEK_START, WEEK_END, 56);
const DETAIL_BINS = buildBins(SELECTED_START, SELECTED_END, 24);
const OVERVIEW_MAX = Math.max(...OVERVIEW_BINS);
const DETAIL_MAX = Math.max(...DETAIL_BINS);
const DAY_LABELS = ['MON 28', 'TUE 29', 'WED 30', 'THU 31', 'FRI 01', 'SAT 02', 'SUN 03'];
const DENSITY_COLORS = ['#38bdf8', '#60a5fa', '#818cf8', '#f59e0b', '#f97316', '#C8102E'];

function DensityStrip({
  bins,
  maximum,
  layout,
  selectionLeft,
  selectionWidth,
}: {
  bins: number[];
  maximum: number;
  layout?: AdaptiveDayLayout[];
  selectionLeft?: number;
  selectionWidth?: number;
}) {
  return (
    <div
      style={{
        position: 'relative',
        height: 10,
        display: layout ? 'block' : 'flex',
        overflow: 'hidden',
        border: '1px solid rgba(15, 23, 42, 0.12)',
        borderRadius: 3,
      }}
    >
      {bins.map((value, index) => {
        const colorIndex = Math.min(
          DENSITY_COLORS.length - 1,
          Math.floor((value / maximum) * DENSITY_COLORS.length)
        );
        const adaptiveStyle = layout
          ? {
              position: 'absolute' as const,
              left: `${layout[index].start * 100}%`,
              width: `${layout[index].width * 100 + 0.08}%`,
              top: 0,
              bottom: 0,
            }
          : { flex: 1 };
        return <i key={`${index}-${value}`} style={{ ...adaptiveStyle, background: DENSITY_COLORS[colorIndex] }} />;
      })}
      {selectionLeft !== undefined && selectionWidth !== undefined ? (
        <i
          style={{
            position: 'absolute',
            left: `${selectionLeft}%`,
            width: `${selectionWidth}%`,
            top: -1,
            bottom: -1,
            border: '2px solid #2563eb',
            background: 'rgba(37, 99, 235, 0.16)',
            boxSizing: 'border-box',
          }}
        />
      ) : null}
    </div>
  );
}

export function ShowcaseTimeline({
  selectionProgress,
  warpProgress,
  multiplier,
}: {
  selectionProgress: number;
  warpProgress: number;
  multiplier: number;
}) {
  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);
  const selectedDay = 3; // Thursday
  const selectedLeft = (selectedDay / 7) * 100;
  const selectedFullWidth = 100 / 7;
  const selectedWidth = interpolate(selectionProgress, [0, 1], [2.2, selectedFullWidth]);
  const currentLeft = selectedLeft + (selectedFullWidth - selectedWidth) / 2;
  const detailReveal = interpolate(selectionProgress, [0.18, 0.72], [0.18, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#ffffff',
        color: '#0f172a',
        padding: '12px 24px',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* 1. Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          paddingBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              padding: '2px 8px',
              borderRadius: 4,
              fontFamily: MONO_FONT,
            }}
          >
            DUAL TIMELINE
          </span>
          <span style={{ fontSize: 13, fontWeight: 750, color: '#0f172a' }}>
            Synchronized Temporal Navigation
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#64748b', fontSize: 10, fontFamily: MONO_FONT, fontWeight: 650 }}>
          <span>Sparse</span>
          <div
            style={{
              width: 90,
              height: 7,
              borderRadius: 2,
              border: '1px solid rgba(15,23,42,0.12)',
              background: `linear-gradient(90deg, ${DENSITY_COLORS.join(',')})`,
            }}
          />
          <span>Dense</span>
        </div>
      </div>

      {/* 2. Overview Strip (Week) */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', columnGap: 12, alignItems: 'center' }}>
          <div style={{ color: '#64748b', fontSize: 10, fontFamily: MONO_FONT, fontWeight: 750 }}>
            OVERVIEW
          </div>
          <DensityStrip
            bins={OVERVIEW_BINS}
            maximum={OVERVIEW_MAX}
            selectionLeft={currentLeft}
            selectionWidth={selectedWidth}
          />
        </div>

        {/* Overview Bars & Days */}
        <div style={{ position: 'relative', height: 44, margin: '4px 0 0 92px', borderBottom: '1px solid #cbd5e1' }}>
          {Array.from({ length: 7 }, (_, index) => (
            <i
              key={`slice-${index}`}
              style={{
                position: 'absolute',
                left: `${(index / 7) * 100}%`,
                width: `${100 / 7}%`,
                top: 0,
                bottom: 0,
                borderLeft: '1px solid rgba(100,116,139,0.2)',
                borderRight: '1px solid rgba(100,116,139,0.1)',
                background: index % 2 === 0 ? 'rgba(148,163,184,0.03)' : 'transparent',
                boxSizing: 'border-box',
              }}
            />
          ))}
          {OVERVIEW_BINS.map((value, index) => {
            const day = Math.min(6, Math.floor(index / 8));
            const slot = index % 8;
            return (
              <i
                key={`${index}-${value}`}
                style={{
                  position: 'absolute',
                  left: `${((day + slot / 8) / 7) * 100}%`,
                  width: `${100 / 56 - 0.12}%`,
                  bottom: 0,
                  height: `${Math.max(3, (value / OVERVIEW_MAX) * 36)}px`,
                  background: 'rgba(15,23,42,0.18)',
                  borderRadius: '1px 1px 0 0',
                }}
              />
            );
          })}
          {/* Brush Window */}
          <div
            style={{
              position: 'absolute',
              left: `${currentLeft}%`,
              width: `${selectedWidth}%`,
              top: 0,
              bottom: 0,
              border: '2px solid #2563eb',
              background: 'rgba(37,99,235,0.15)',
              boxSizing: 'border-box',
            }}
          >
            <i
              style={{
                position: 'absolute',
                left: -3,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 6,
                height: 22,
                borderRadius: 2,
                background: '#2563eb',
              }}
            />
            <i
              style={{
                position: 'absolute',
                right: -3,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 6,
                height: 22,
                borderRadius: 2,
                background: '#2563eb',
              }}
            />
          </div>
        </div>

        {/* Day Labels */}
        <div style={{ position: 'relative', marginLeft: 92, height: 14, color: '#64748b', fontSize: 10, fontFamily: MONO_FONT, paddingTop: 2 }}>
          {DAY_LABELS.map((label, index) => (
            <span
              key={label}
              style={{
                position: 'absolute',
                left: `${((index + 0.5) / 7) * 100}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                color: index === selectedDay ? '#2563eb' : '#64748b',
                fontWeight: index === selectedDay ? 800 : 500,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Detail Strip (24 Hours with Adaptive Visual Allocation) */}
      <div style={{ opacity: detailReveal }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', columnGap: 12, alignItems: 'center' }}>
          <div style={{ color: '#2563eb', fontSize: 10, fontFamily: MONO_FONT, fontWeight: 800 }}>
            DETAIL (24H)
          </div>
          <DensityStrip bins={DETAIL_BINS} maximum={DETAIL_MAX} layout={hourLayout} />
        </div>

        {/* Adaptive Detail Bars */}
        <div style={{ position: 'relative', height: 48, margin: '4px 0 0 92px', borderBottom: '1px solid #cbd5e1' }}>
          {DETAIL_BINS.map((value, index) => (
            <i
              key={`detail-bar-${index}`}
              style={{
                position: 'absolute',
                left: `${hourLayout[index].start * 100}%`,
                width: `${hourLayout[index].width * 100 - 0.15}%`,
                bottom: 0,
                height: `${Math.max(3, (value / DETAIL_MAX) * 42)}px`,
                background:
                  value / DETAIL_MAX > 0.65
                    ? '#C8102E'
                    : value / DETAIL_MAX > 0.35
                    ? '#f59e0b'
                    : '#2563eb',
                opacity: 0.75,
                borderRadius: '2px 2px 0 0',
              }}
            />
          ))}
        </div>

        {/* Hour Ticks */}
        <div style={{ position: 'relative', marginLeft: 92, height: 14, color: '#64748b', fontSize: 9, fontFamily: MONO_FONT, paddingTop: 2 }}>
          {[0, 4, 8, 12, 16, 20, 24].map((hour) => {
            const position = hour === 24 ? 100 : hourLayout[hour].start * 100;
            return (
              <span
                key={hour}
                style={{
                  position: 'absolute',
                  left: `${position}%`,
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontWeight: 650,
                  color: '#475569',
                }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
