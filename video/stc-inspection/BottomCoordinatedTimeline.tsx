import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { MONO_FONT } from '../theme';
import {
  ANNUAL_SUB_BINS,
  ANNUAL_SUB_BINS_MAX,
  DENSITY_HEAT_STOPS,
  MONTH_NAMES,
  getJulyMonthLayout,
  JULY_31_DAILY_COUNTS,
  JULY_31_MAX,
} from '../timeline-design/data';
import { THEME, TIMELINE_WIDTH } from './data';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

interface BottomCoordinatedTimelineProps {
  revealProgress: number;
  isAnatomyPhase?: boolean;
}

export const BottomCoordinatedTimeline: React.FC<BottomCoordinatedTimelineProps> = ({
  revealProgress = 1,
  isAnatomyPhase = false,
}) => {
  const frame = useCurrentFrame();

  // July spans from index 6/12 to 7/12 (50.0% to 58.333%)
  const julyStartPct = (6 / 12) * 100; // 50.0%
  const julyWidthPct = (1 / 12) * 100; // 8.333%

  // DBTA layout for July (31 days)
  const julyDays = getJulyMonthLayout(1.0); // 100% DBTA morph already active from Slide 17

  // Subtle breathing pulse during anatomy phase
  const breathingOpacity = isAnatomyPhase
    ? 0.15 + 0.08 * Math.sin(frame / 24)
    : 0.16;

  const cardOpacity = interpolate(revealProgress, [0, 0.4], [0, 1], clamp);
  const cardTranslateY = interpolate(revealProgress, [0, 1], [24, 0], clamp);

  return (
    <div
      style={{
        width: TIMELINE_WIDTH,
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid rgba(15, 23, 42, 0.09)',
        boxShadow: '0 6px 26px rgba(0, 0, 0, 0.06)',
        padding: '14px 20px 12px',
        boxSizing: 'border-box',
        position: 'relative',
        opacity: cardOpacity,
        transform: `translateY(${cardTranslateY}px)`,
      }}
    >
      {/* ==================================================== */}
      {/* 1. TOP TRACK: YEARLY OVERVIEW (12 Months, July Active)*/}
      {/* ==================================================== */}
      <div style={{ marginBottom: 10 }}>
        {/* Track 1 Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
            paddingBottom: 4,
            borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: 9.5,
                fontWeight: 850,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: THEME.navy,
                backgroundColor: 'rgba(15, 23, 42, 0.06)',
                padding: '2px 7px',
                borderRadius: 4,
              }}
            >
              TRACK 1 · OVERVIEW
            </div>
            <span style={{ fontSize: 12, fontWeight: 750, color: THEME.textPrimary }}>
              Yearly Temporal Overview
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10.5,
                fontWeight: 600,
                color: THEME.textMuted,
              }}
            >
              (12 Months · July Focus Selected)
            </span>
          </div>

          {/* Density Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: THEME.textMuted,
              fontSize: 9.5,
              fontFamily: MONO_FONT,
              fontWeight: 650,
            }}
          >
            <span>Sparse</span>
            <div
              style={{
                width: 72,
                height: 6,
                borderRadius: 2,
                border: '1px solid rgba(15, 23, 42, 0.1)',
                background: `linear-gradient(90deg, ${DENSITY_HEAT_STOPS.join(',')})`,
              }}
            />
            <span>Dense</span>
          </div>
        </div>

        {/* Overview Track Histogram & Selection Brush */}
        <div
          style={{
            position: 'relative',
            height: 38,
            borderBottom: '1px solid #cbd5e1',
            borderTop: '1px solid rgba(15, 23, 42, 0.05)',
            background: 'rgba(248, 250, 252, 0.5)',
            overflow: 'hidden',
            borderRadius: 4,
          }}
        >
          {/* Month Columns */}
          {Array.from({ length: 12 }, (_, monthIdx) => {
            const isSelectedMonth = monthIdx === 6; // July
            return (
              <div
                key={`month-col-${monthIdx}`}
                style={{
                  position: 'absolute',
                  left: `${(monthIdx / 12) * 100}%`,
                  width: `${100 / 12}%`,
                  top: 0,
                  bottom: 0,
                  borderRight:
                    monthIdx < 11 ? '1px solid rgba(100, 116, 139, 0.12)' : 'none',
                  backgroundColor: isSelectedMonth
                    ? 'rgba(200, 16, 46, 0.04)'
                    : monthIdx % 2 === 0
                    ? 'rgba(148, 163, 184, 0.03)'
                    : 'transparent',
                  boxSizing: 'border-box',
                }}
              />
            );
          })}

          {/* Granular Sub-bins */}
          {ANNUAL_SUB_BINS.map((value, index) => {
            const heightPx = Math.max(3, (value / ANNUAL_SUB_BINS_MAX) * 32);
            const isJulySubBin = index >= 24 && index < 28;
            return (
              <div
                key={`bar-${index}`}
                style={{
                  position: 'absolute',
                  left: `${(index / 48) * 100}%`,
                  width: `${100 / 48 - 0.25}%`,
                  bottom: 0,
                  height: `${heightPx}px`,
                  backgroundColor: isJulySubBin
                    ? THEME.tueRed
                    : 'rgba(15, 23, 42, 0.22)',
                  borderRadius: '1px 1px 0 0',
                }}
              />
            );
          })}

          {/* July Red Brush Box */}
          <div
            style={{
              position: 'absolute',
              left: `${julyStartPct}%`,
              width: `${julyWidthPct}%`,
              top: 0,
              bottom: 0,
              border: `1.8px solid ${THEME.tueRed}`,
              backgroundColor: `rgba(200, 16, 46, ${breathingOpacity})`,
              boxSizing: 'border-box',
              boxShadow: '0 0 12px rgba(200, 16, 46, 0.25)',
              zIndex: 10,
            }}
          >
            {/* Left Handle */}
            <div
              style={{
                position: 'absolute',
                left: -3,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 5,
                height: 18,
                borderRadius: 2,
                backgroundColor: THEME.tueRed,
              }}
            />
            {/* Right Handle */}
            <div
              style={{
                position: 'absolute',
                right: -3,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 5,
                height: 18,
                borderRadius: 2,
                backgroundColor: THEME.tueRed,
              }}
            />
          </div>
        </div>

        {/* Month Labels */}
        <div style={{ position: 'relative', height: 16, marginTop: 2 }}>
          {MONTH_NAMES.map((name, index) => {
            const isSelected = index === 6;
            return (
              <div
                key={name}
                style={{
                  position: 'absolute',
                  left: `${((index + 0.5) / 12) * 100}%`,
                  transform: 'translateX(-50%)',
                  fontFamily: MONO_FONT,
                  fontSize: 9.5,
                  fontWeight: isSelected ? 900 : 600,
                  color: isSelected ? THEME.tueRed : THEME.textMuted,
                  letterSpacing: 0.6,
                }}
              >
                {name}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. BOTTOM TRACK: SELECTED DETAIL DOMAIN (July, DBTA) */}
      {/* ==================================================== */}
      <div>
        {/* Track 2 Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
            paddingBottom: 4,
            borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: 9.5,
                fontWeight: 850,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: THEME.blue,
                backgroundColor: THEME.blueBg,
                padding: '2px 7px',
                borderRadius: 4,
                border: `1px solid ${THEME.blueBorder}`,
              }}
            >
              TRACK 2 · FOCUS DOMAIN
            </div>
            <span style={{ fontSize: 12, fontWeight: 750, color: THEME.textPrimary }}>
              Selected Month Domain: 01 July – 31 July
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10.5,
                fontWeight: 600,
                color: THEME.textMuted,
              }}
            >
              (31 Daily Intervals · DBTA Density Redistribution Active)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                padding: '2px 7px',
                borderRadius: 4,
                backgroundColor: THEME.violetBg,
                border: `1px solid rgba(124, 58, 237, 0.3)`,
                fontFamily: MONO_FONT,
                fontSize: 9,
                fontWeight: 800,
                color: THEME.violet,
                letterSpacing: 0.8,
              }}
            >
              INSPECTION FOCUS: 31 JULY
            </div>
            <div
              style={{
                padding: '2px 7px',
                borderRadius: 4,
                backgroundColor: THEME.tueRedBg,
                border: `1px solid ${THEME.tueRedBorder}`,
                fontFamily: MONO_FONT,
                fontSize: 9,
                fontWeight: 800,
                color: THEME.tueRed,
                letterSpacing: 0.8,
              }}
            >
              DBTA ALLOCATION APPLIED
            </div>
          </div>
        </div>

        {/* Detail Track 31-Day DBTA Bar */}
        <div
          style={{
            position: 'relative',
            height: 48,
            borderBottom: '1px solid #cbd5e1',
            borderTop: '1px solid rgba(15, 23, 42, 0.05)',
            background: 'rgba(248, 250, 252, 0.5)',
            overflow: 'hidden',
            borderRadius: 4,
          }}
        >
          {julyDays.map((day) => {
            const isTargetDay = day.dayNumber === 31; // 31 July prime focus
            const isBurst = day.isBurst;
            const heightPx = Math.max(4, (day.count / JULY_31_MAX) * 40);

            return (
              <div
                key={day.dayNumber}
                style={{
                  position: 'absolute',
                  left: `${day.startPct}%`,
                  width: `${day.widthPct}%`,
                  top: 0,
                  bottom: 0,
                  borderRight: '1px solid rgba(15, 23, 42, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  backgroundColor: isTargetDay
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
                    height: `${heightPx}px`,
                    background: isTargetDay
                      ? THEME.violet
                      : isBurst
                      ? THEME.tueRed
                      : THEME.blue,
                    borderRadius: '1.5px 1.5px 0 0',
                    opacity: isTargetDay ? 1 : isBurst ? 0.9 : 0.65,
                  }}
                />

                {/* Day Label inside bar */}
                {(day.dayNumber % 5 === 1 || isTargetDay || day.widthPct > 5.2) && (
                  <span
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 8.5,
                      fontWeight: isTargetDay ? 900 : isBurst ? 800 : 600,
                      color: isTargetDay
                        ? THEME.violet
                        : isBurst
                        ? THEME.tueRed
                        : THEME.textMuted,
                      marginBottom: 1,
                      lineHeight: 1,
                    }}
                  >
                    {day.label}
                  </span>
                )}

                {/* Target Day Highlight Pill */}
                {isTargetDay && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      border: `1.8px solid ${THEME.violet}`,
                      borderRadius: 3,
                      boxShadow: '0 0 10px rgba(124, 58, 237, 0.3)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Coordinated Connection Subtext */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 600 }}>
            ← Earlier (01 July)
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10,
              color: THEME.navy,
              fontWeight: 750,
            }}
          >
            TEMPORAL COORDINATION: Vertical span of Space-Time Cube matches selected 24h domain (31 July)
          </span>
          <span style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 600 }}>
            Later (31 July) →
          </span>
        </div>
      </div>
    </div>
  );
};
