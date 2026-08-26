import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { MONO_FONT } from '../theme';
import {
  DENSITY_HEAT_STOPS,
  getJulyLayout,
  JULY_DAILY_COUNTS,
  JULY_DAILY_MAX,
  THEME,
  TIMELINE_WIDTH,
} from './data';

interface DetailTrackProps {
  // Detail reveal progress (Phase 3: 0 -> 1)
  revealProgress: number;
  // DBTA morph progress (Phase 4: 0 = uniform -> 1 = DBTA density scaled)
  dbtaProgress: number;
  // Ambient pulse during Phase 6
  isAnatomyPhase?: boolean;
}

export const DetailTrack: React.FC<DetailTrackProps> = ({
  revealProgress,
  dbtaProgress,
  isAnatomyPhase = false,
}) => {
  const frame = useCurrentFrame();

  const layout = getJulyLayout(dbtaProgress);

  // Micro-shimmer on burst bars during anatomy phase
  const shimmer = isAnatomyPhase ? 1 + 0.04 * Math.sin(frame / 18) : 1;

  if (revealProgress <= 0) return null;

  return (
    <div
      style={{
        width: TIMELINE_WIDTH,
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid rgba(15, 23, 42, 0.09)',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.05)',
        padding: '16px 22px 14px',
        boxSizing: 'border-box',
        position: 'relative',
        opacity: revealProgress,
        transform: `translateY(${(1 - revealProgress) * 16}px)`,
      }}
    >
      {/* Header Line inside the card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
          paddingBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10,
              fontWeight: 850,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: THEME.blue,
              backgroundColor: THEME.blueBg,
              padding: '3px 8px',
              borderRadius: 4,
              border: `1px solid ${THEME.blueBorder}`,
            }}
          >
            DETAIL (DAILY)
          </div>
          <span style={{ fontSize: 13, fontWeight: 750, color: THEME.textPrimary }}>
            Selected Domain: 01 JULY – 31 JULY
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 11,
              fontWeight: 600,
              color: THEME.textMuted,
            }}
          >
            (31 Sub-intervals · Δt = 24 Hours)
          </span>
        </div>

        {/* State Badge: Linear vs DBTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 9px',
            borderRadius: 6,
            background: dbtaProgress > 0.5 ? THEME.violetBg : 'rgba(15, 23, 42, 0.04)',
            border: `1px solid ${dbtaProgress > 0.5 ? 'rgba(124, 58, 237, 0.25)' : 'rgba(15, 23, 42, 0.08)'}`,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: dbtaProgress > 0.5 ? THEME.violet : THEME.textMuted,
            }}
          />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10,
              fontWeight: 700,
              color: dbtaProgress > 0.5 ? THEME.violet : THEME.textSecondary,
              letterSpacing: 0.5,
            }}
          >
            {dbtaProgress < 0.2
              ? 'UNIFORM INTERVALS'
              : dbtaProgress < 0.85
              ? 'DBTA REDISTRIBUTING...'
              : 'DBTA DENSITY-SCALED'}
          </span>
        </div>
      </div>

      {/* 1. Daily Density Heat Strip (Morphing Widths) */}
      <div
        style={{
          position: 'relative',
          height: 10,
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid rgba(15, 23, 42, 0.12)',
          marginBottom: 6,
        }}
      >
        {layout.map((day) => {
          const colorIndex = Math.min(
            DENSITY_HEAT_STOPS.length - 1,
            Math.floor((day.count / JULY_DAILY_MAX) * DENSITY_HEAT_STOPS.length)
          );
          return (
            <div
              key={`detail-heat-${day.dayIndex}`}
              style={{
                position: 'absolute',
                left: `${day.startPct}%`,
                width: `${day.widthPct + 0.06}%`,
                top: 0,
                bottom: 0,
                backgroundColor: DENSITY_HEAT_STOPS[colorIndex],
              }}
            />
          );
        })}
      </div>

      {/* 2. Daily Histogram & Partition Grid */}
      <div
        style={{
          position: 'relative',
          height: 64,
          borderBottom: '1px solid #cbd5e1',
          borderTop: '1px solid rgba(15, 23, 42, 0.05)',
          background: 'rgba(248, 250, 252, 0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Day Grid Lines */}
        {layout.map((day) => (
          <div
            key={`grid-${day.dayIndex}`}
            style={{
              position: 'absolute',
              left: `${day.startPct}%`,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: 'rgba(100, 116, 139, 0.14)',
            }}
          />
        ))}

        {/* Daily Activity Bars */}
        {layout.map((day) => {
          const heightPx = Math.max(5, (day.count / JULY_DAILY_MAX) * 56);
          const barWidth = Math.max(2, day.widthPct);

          const isPeak = day.count >= 48;

          return (
            <div
              key={`day-bar-${day.dayIndex}`}
              style={{
                position: 'absolute',
                left: `${day.startPct}%`,
                width: `${barWidth - 0.2}%`,
                bottom: 0,
                height: `${heightPx * (isPeak ? shimmer : 1)}px`,
                backgroundColor: isPeak
                  ? THEME.tueRed
                  : day.count > 25
                  ? '#3b82f6'
                  : 'rgba(15, 23, 42, 0.24)',
                borderRadius: '1.5px 1.5px 0 0',
                boxShadow:
                  isPeak && isAnatomyPhase
                    ? '0 0 10px rgba(200, 16, 46, 0.35)'
                    : 'none',
              }}
            />
          );
        })}
      </div>

      {/* 3. Daily Date / Timestamp Axis */}
      <div
        style={{
          position: 'relative',
          height: 22,
          marginTop: 4,
        }}
      >
        {layout.map((day, idx) => {
          // Show ticks for 01..07 to demonstrate the visual redistribution example, plus key milestone days
          const showLabel =
            idx === 0 || // 01
            idx === 1 || // 02
            idx === 2 || // 03 (burst)
            idx === 3 || // 04
            idx === 4 || // 05 (burst)
            idx === 5 || // 06
            idx === 6 || // 07
            idx === 9 || // 10
            idx === 11 || // 12 (burst)
            idx === 15 || // 16
            idx === 18 || // 19 (burst)
            idx === 22 || // 23
            idx === 26 || // 27 (burst)
            idx === 30; // 31

          if (!showLabel) {
            // Render small tick mark dot
            return (
              <div
                key={`tick-${day.dayIndex}`}
                style={{
                  position: 'absolute',
                  left: `${day.centerPct}%`,
                  top: 5,
                  width: 2,
                  height: 3,
                  backgroundColor: 'rgba(100, 116, 139, 0.35)',
                  transform: 'translateX(-50%)',
                }}
              />
            );
          }

          const isBurstDay = day.isBurst;

          return (
            <div
              key={`label-${day.dayIndex}`}
              style={{
                position: 'absolute',
                left: `${day.centerPct}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontFamily: MONO_FONT,
                fontSize: isBurstDay ? 10.5 : 9.5,
                fontWeight: isBurstDay ? 900 : 600,
                color: isBurstDay ? THEME.tueRed : THEME.textMuted,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span>{day.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
