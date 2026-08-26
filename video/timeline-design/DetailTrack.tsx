import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { MONO_FONT } from '../theme';
import {
  DAY14_HOURLY_COUNTS,
  DAY14_HOURLY_MAX,
  DENSITY_HEAT_STOPS,
  getJulyMonthLayout,
  JULY_31_DAILY_COUNTS,
  JULY_31_MAX,
  THEME,
  TIMELINE_WIDTH,
} from './data';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

interface DetailTrackProps {
  // Detail reveal progress (Scene 3: frames 180..260)
  revealProgress: number;
  // DBTA morph progress (Scene 4: frames 300..400)
  dbtaProgress: number;
  // Hourly granularity shift progress inside Day 14 (Scene 5: frames 420..500)
  hourlyShiftProgress: number;
  // Ambient pulse during Scene 7
  isAnatomyPhase?: boolean;
}

export const DetailTrack: React.FC<DetailTrackProps> = ({
  revealProgress,
  dbtaProgress,
  hourlyShiftProgress,
  isAnatomyPhase = false,
}) => {
  const frame = useCurrentFrame();

  const layout = getJulyMonthLayout(dbtaProgress);
  const targetDay = layout.find((d) => d.isTargetDay) || layout[13];

  // Micro-shimmer on peak burst bars during anatomy phase
  const shimmer = isAnatomyPhase ? 1 + 0.035 * Math.sin(frame / 18) : 1;

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
            DETAIL (JULY)
          </div>
          <span style={{ fontSize: 13, fontWeight: 750, color: THEME.textPrimary }}>
            Selected Month Domain: 01 July – 31 July
          </span>
        </div>

        {/* State Badge: Uniform vs DBTA vs Adaptive Granularity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 9px',
            borderRadius: 6,
            background:
              hourlyShiftProgress > 0.5
                ? 'rgba(5, 150, 105, 0.08)'
                : dbtaProgress > 0.5
                ? THEME.violetBg
                : 'rgba(15, 23, 42, 0.04)',
            border: `1px solid ${
              hourlyShiftProgress > 0.5
                ? 'rgba(5, 150, 105, 0.28)'
                : dbtaProgress > 0.5
                ? 'rgba(124, 58, 237, 0.25)'
                : 'rgba(15, 23, 42, 0.08)'
            }`,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor:
                hourlyShiftProgress > 0.5
                  ? THEME.emerald
                  : dbtaProgress > 0.5
                  ? THEME.violet
                  : THEME.textMuted,
            }}
          />
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10,
              fontWeight: 700,
              color:
                hourlyShiftProgress > 0.5
                  ? THEME.emerald
                  : dbtaProgress > 0.5
                  ? THEME.violet
                  : THEME.textSecondary,
              letterSpacing: 0.5,
            }}
          >
            {hourlyShiftProgress > 0.5
              ? 'EXPANDED DAYS: HOURLY GRANULARITY'
              : dbtaProgress < 0.2
              ? 'UNIFORM DAILY INTERVALS'
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
            Math.floor((day.count / JULY_31_MAX) * DENSITY_HEAT_STOPS.length)
          );
          return (
            <div
              key={`detail-heat-${day.dayIndex}`}
              style={{
                position: 'absolute',
                left: `${day.startPct}%`,
                width: `${day.widthPct + 0.08}%`,
                top: 0,
                bottom: 0,
                backgroundColor: DENSITY_HEAT_STOPS[colorIndex],
              }}
            />
          );
        })}
      </div>

      {/* 2. Histogram Activity Track & Day Grid */}
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
              backgroundColor: day.isTargetDay
                ? 'rgba(200, 16, 46, 0.3)'
                : 'rgba(100, 116, 139, 0.14)',
            }}
          />
        ))}

        {/* Regular Daily Activity Bars (all days except Day 14 when hourly sub-structure is resolved) */}
        {layout.map((day) => {
          const heightPx = Math.max(5, (day.count / JULY_31_MAX) * 56);
          const barWidth = Math.max(2, day.widthPct);
          const isPeak = day.isBurst;

          // If this is Day 14 and hourly shift is active, crossfade the daily bar into 24 hourly sub-bars
          if (day.isTargetDay && hourlyShiftProgress > 0) {
            return null; // Rendered below with internal hourly structure
          }

          return (
            <div
              key={`day-bar-${day.dayIndex}`}
              style={{
                position: 'absolute',
                left: `${day.startPct}%`,
                width: `${barWidth - 0.25}%`,
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

        {/* =================================================================== */}
        {/* THE KEY INSIGHT: INTERNAL HOURLY STRUCTURE INSIDE EXPANDED DAY 14   */}
        {/* =================================================================== */}
        {targetDay && (
          <div
            style={{
              position: 'absolute',
              left: `${targetDay.startPct}%`,
              width: `${targetDay.widthPct}%`,
              top: 0,
              bottom: 0,
              borderLeft: `1.5px solid ${THEME.tueRed}`,
              borderRight: `1.5px solid ${THEME.tueRed}`,
              backgroundColor: `rgba(200, 16, 46, 0.05)`,
              boxSizing: 'border-box',
              zIndex: 10,
            }}
          >
            {/* If hourly shift is active, render 24 hourly bars inside this wide slot */}
            {hourlyShiftProgress > 0 && (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  opacity: hourlyShiftProgress,
                }}
              >
                {DAY14_HOURLY_COUNTS.map((hCount, hIdx) => {
                  const hHeight = Math.max(4, (hCount / DAY14_HOURLY_MAX) * 56);
                  const isHourPeak = hCount >= 13;
                  return (
                    <div
                      key={`d14-h-${hIdx}`}
                      style={{
                        position: 'absolute',
                        left: `${(hIdx / 24) * 100}%`,
                        width: `${100 / 24 - 0.2}%`,
                        bottom: 0,
                        height: `${hHeight}px`,
                        backgroundColor: isHourPeak ? THEME.tueRed : '#3b82f6',
                        borderRadius: '1px 1px 0 0',
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Daily Date / Timestamp Axis */}
      <div
        style={{
          position: 'relative',
          height: 22,
          marginTop: 4,
        }}
      >
        {layout.map((day) => {
          // If Day 14 is expanded and hourly shift is active, show clock-time milestones inside Day 14
          if (day.isTargetDay && hourlyShiftProgress > 0.5) {
            return (
              <div
                key={`label-${day.dayIndex}`}
                style={{
                  position: 'absolute',
                  left: `${day.startPct}%`,
                  width: `${day.widthPct}%`,
                  top: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0 4px',
                  boxSizing: 'border-box',
                  fontFamily: MONO_FONT,
                  fontSize: 8.5,
                  fontWeight: 900,
                  color: THEME.tueRed,
                }}
              >
                <span>14 [00h]</span>
                <span>12h</span>
                <span>24h</span>
              </div>
            );
          }

          // Show readable day numbers for milestone days
          const showLabel =
            day.dayNumber === 1 ||
            day.dayNumber === 3 ||
            day.dayNumber === 5 ||
            day.dayNumber === 8 ||
            day.dayNumber === 10 ||
            day.dayNumber === 14 ||
            day.dayNumber === 19 ||
            day.dayNumber === 23 ||
            day.dayNumber === 27 ||
            day.dayNumber === 31;

          if (!showLabel) {
            return (
              <div
                key={`tick-${day.dayIndex}`}
                style={{
                  position: 'absolute',
                  left: `${day.centerPct}%`,
                  top: 5,
                  width: 1.5,
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
                fontSize: day.isTargetDay ? 10.5 : isBurstDay ? 10 : 9,
                fontWeight: day.isTargetDay ? 950 : isBurstDay ? 850 : 600,
                color: day.isTargetDay ? THEME.tueRed : isBurstDay ? THEME.navy : THEME.textMuted,
              }}
            >
              {day.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};
