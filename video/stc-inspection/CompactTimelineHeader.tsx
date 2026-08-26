import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  MONTH_NAMES,
  MONTHLY_COUNTS,
  MONTHLY_MAX,
  JULY_31_DAILY_COUNTS,
  JULY_31_MAX,
  getJulyMonthLayout,
} from '../timeline-design/data';
import { THEME } from './data';

interface CompactTimelineHeaderProps {
  liftProgress: number; // 0 (mid-screen) -> 1 (compact top bar)
  selectedDayFocus?: boolean;
}

export const CompactTimelineHeader: React.FC<CompactTimelineHeaderProps> = ({
  liftProgress,
  selectedDayFocus = true,
}) => {
  // Interpolate dimensions and positions based on liftProgress
  const containerWidth = interpolate(liftProgress, [0, 1], [1320, 1180]);
  const overviewHeight = interpolate(liftProgress, [0, 1], [46, 28]);
  const detailHeight = interpolate(liftProgress, [0, 1], [58, 34]);
  const gap = interpolate(liftProgress, [0, 1], [14, 8]);
  const fontSize = interpolate(liftProgress, [0, 1], [10, 8.5]);
  const paddingY = interpolate(liftProgress, [0, 1], [14, 8]);
  const paddingX = interpolate(liftProgress, [0, 1], [20, 14]);

  // July DBTA layout
  const julyDays = getJulyMonthLayout(1.0); // 100% DBTA morph already active from Slide 17

  return (
    <div
      style={{
        width: containerWidth,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(15, 23, 42, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        padding: `${paddingY}px ${paddingX}px`,
        display: 'flex',
        flexDirection: 'column',
        gap,
        boxSizing: 'border-box',
        transition: 'none',
      }}
    >
      {/* ==================================================== */}
      {/* TRACK 1: YEARLY OVERVIEW (12 Months, July Selected)   */}
      {/* ==================================================== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Track Label Badge */}
        <div
          style={{
            width: 140,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: fontSize,
              fontWeight: 800,
              color: THEME.navy,
              letterSpacing: 0.8,
            }}
          >
            OVERVIEW
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: fontSize * 0.85,
              fontWeight: 650,
              color: THEME.textMuted,
            }}
          >
            (12 MOS)
          </span>
        </div>

        {/* 12 Months Bar */}
        <div
          style={{
            flex: 1,
            height: overviewHeight,
            display: 'flex',
            position: 'relative',
            background: 'rgba(15, 23, 42, 0.025)',
            borderRadius: 6,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
          }}
        >
          {MONTH_NAMES.map((month, idx) => {
            const isJuly = idx === 6;
            const count = MONTHLY_COUNTS[idx];
            const heightPct = (count / MONTHLY_MAX) * 100;

            return (
              <div
                key={month}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  position: 'relative',
                  borderRight:
                    idx < 11 ? '1px solid rgba(15, 23, 42, 0.05)' : 'none',
                  background: isJuly ? THEME.tueRedBg : 'transparent',
                }}
              >
                {/* Mini Density Bar */}
                <div
                  style={{
                    width: '65%',
                    height: `${heightPct * 0.65}%`,
                    background: isJuly
                      ? THEME.tueRed
                      : 'rgba(100, 116, 139, 0.4)',
                    borderRadius: '2px 2px 0 0',
                    opacity: isJuly ? 1 : 0.6,
                  }}
                />

                {/* Month Name */}
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: fontSize * 0.8,
                    fontWeight: isJuly ? 850 : 600,
                    color: isJuly ? THEME.tueRed : THEME.textMuted,
                    marginBottom: 2,
                    lineHeight: 1,
                  }}
                >
                  {month}
                </span>

                {/* Selected Brush Highlight Box for July */}
                {isJuly && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      border: `1.5px solid ${THEME.tueRed}`,
                      borderRadius: 4,
                      boxShadow: '0 0 8px rgba(200, 16, 46, 0.25)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================== */}
      {/* TRACK 2: SELECTED DETAIL DOMAIN (July 31 Days, DBTA) */}
      {/* ==================================================== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Track Label Badge */}
        <div
          style={{
            width: 140,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: fontSize,
              fontWeight: 850,
              color: THEME.tueRed,
              letterSpacing: 0.8,
            }}
          >
            FOCUS DOMAIN
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: fontSize * 0.85,
              fontWeight: 650,
              color: THEME.textSecondary,
            }}
          >
            [JUL 31]
          </span>
        </div>

        {/* 31-Day DBTA Detail Bar */}
        <div
          style={{
            flex: 1,
            height: detailHeight,
            position: 'relative',
            background: 'rgba(15, 23, 42, 0.025)',
            borderRadius: 6,
            border: '1px solid rgba(200, 16, 46, 0.25)',
            overflow: 'hidden',
          }}
        >
          {julyDays.map((day) => {
            const isTargetDay = day.dayNumber === 31; // 31 July prime focus
            const isBurst = day.isBurst;
            const heightPct = (day.count / JULY_31_MAX) * 100;

            return (
              <div
                key={day.dayNumber}
                style={{
                  position: 'absolute',
                  left: `${day.startPct}%`,
                  width: `${day.widthPct}%`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  borderRight: '1px solid rgba(15, 23, 42, 0.06)',
                  background: isTargetDay
                    ? 'rgba(124, 58, 237, 0.12)'
                    : isBurst
                    ? THEME.tueRedBg
                    : 'transparent',
                }}
              >
                {/* Density Bar */}
                <div
                  style={{
                    width: '70%',
                    height: `${heightPct * 0.68}%`,
                    background: isTargetDay
                      ? THEME.violet
                      : isBurst
                      ? THEME.tueRed
                      : THEME.blue,
                    borderRadius: '2px 2px 0 0',
                    opacity: isTargetDay ? 1 : isBurst ? 0.9 : 0.65,
                  }}
                />

                {/* Day Label (Render every 5 days or if target day or expanded) */}
                {(day.dayNumber % 5 === 1 || isTargetDay || day.widthPct > 5.5) && (
                  <span
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: fontSize * 0.72,
                      fontWeight: isTargetDay ? 850 : isBurst ? 750 : 550,
                      color: isTargetDay
                        ? THEME.violet
                        : isBurst
                        ? THEME.tueRed
                        : THEME.textMuted,
                      marginBottom: 2,
                      lineHeight: 1,
                    }}
                  >
                    {day.label}
                  </span>
                )}

                {/* Active Focus Pill for Day 31 */}
                {isTargetDay && selectedDayFocus && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      border: `1.5px solid ${THEME.violet}`,
                      borderRadius: 4,
                      boxShadow: '0 0 10px rgba(124, 58, 237, 0.3)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* DBTA Allocation Pill Indicator */}
        <div
          style={{
            padding: '4px 8px',
            borderRadius: 4,
            backgroundColor: THEME.tueRedBg,
            border: `1px solid ${THEME.tueRedBorder}`,
            fontFamily: MONO_FONT,
            fontSize: fontSize * 0.85,
            fontWeight: 800,
            color: THEME.tueRed,
            letterSpacing: 0.8,
            flexShrink: 0,
          }}
        >
          DBTA ACTIVE
        </div>
      </div>
    </div>
  );
};
