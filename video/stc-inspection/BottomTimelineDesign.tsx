import React from 'react';
import { interpolate } from 'remotion';
import { MONO_FONT } from '../theme';
import {
  ANNUAL_SUB_BINS,
  ANNUAL_SUB_BINS_MAX,
  DAY14_HOURLY_COUNTS,
  DAY14_HOURLY_MAX,
  DENSITY_HEAT_STOPS,
  getJulyMonthLayout,
  JULY_31_MAX,
  MONTH_NAMES,
} from '../timeline-design/data';
import { THEME } from './data';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

interface BottomTimelineDesignProps {
  revealProgress: number; // 0 -> 1 entrance
}

export const BottomTimelineDesign: React.FC<BottomTimelineDesignProps> = ({
  revealProgress = 1,
}) => {
  const TIMELINE_W = 1320;
  const julyStartPct = (6 / 12) * 100; // 50.0%
  const julyWidthPct = (1 / 12) * 100; // 8.333%

  // DBTA layout for July (31 days)
  const julyLayout = getJulyMonthLayout(1.0); // 100% DBTA morph active

  const brushOpacity = 0.18;

  const cardOpacity = interpolate(revealProgress, [0, 0.4], [0, 1], clamp);
  const cardTranslateY = interpolate(revealProgress, [0, 1], [24, 0], clamp);

  return (
    <div
      style={{
        width: TIMELINE_W,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: cardOpacity,
        transform: `translateY(${cardTranslateY}px)`,
        position: 'relative',
        zIndex: 35,
      }}
    >
      {/* ==================================================== */}
      {/* CARD 1: YEARLY TEMPORAL OVERVIEW                     */}
      {/* ==================================================== */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid rgba(15, 23, 42, 0.09)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          padding: '10px 18px 8px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Header Line inside the Overview Card */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
            borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
            paddingBottom: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: 9,
                fontWeight: 850,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: THEME.navy,
                backgroundColor: 'rgba(15, 23, 42, 0.06)',
                padding: '2px 6px',
                borderRadius: 3,
              }}
            >
              OVERVIEW
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: THEME.textPrimary }}>
              Yearly Temporal Overview
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10,
                fontWeight: 600,
                color: THEME.textMuted,
              }}
            >
              (12 Months · Monthly Granularity)
            </span>
          </div>

          {/* Density Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: THEME.textMuted,
              fontSize: 9,
              fontFamily: MONO_FONT,
              fontWeight: 650,
            }}
          >
            <span>Sparse</span>
            <div
              style={{
                width: 76,
                height: 6,
                borderRadius: 2,
                border: '1px solid rgba(15, 23, 42, 0.1)',
                background: `linear-gradient(90deg, ${DENSITY_HEAT_STOPS.join(',')})`,
              }}
            />
            <span>Dense</span>
          </div>
        </div>

        {/* 1. Annual Density Heat Strip (48 Sub-bins) */}
        <div
          style={{
            position: 'relative',
            height: 7,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            display: 'flex',
            marginBottom: 4,
          }}
        >
          {ANNUAL_SUB_BINS.map((value, index) => {
            const colorIndex = Math.min(
              DENSITY_HEAT_STOPS.length - 1,
              Math.floor((value / ANNUAL_SUB_BINS_MAX) * DENSITY_HEAT_STOPS.length)
            );
            return (
              <div
                key={`heat-${index}`}
                style={{
                  flex: 1,
                  backgroundColor: DENSITY_HEAT_STOPS[colorIndex],
                }}
              />
            );
          })}

          {/* Selected Region Highlight in Heatstrip */}
          <div
            style={{
              position: 'absolute',
              left: `${julyStartPct}%`,
              width: `${julyWidthPct}%`,
              top: -1,
              bottom: -1,
              border: `1.5px solid ${THEME.tueRed}`,
              background: `rgba(200, 16, 46, ${brushOpacity})`,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 2. Histogram Activity Track & Month Grid */}
        <div
          style={{
            position: 'relative',
            height: 32,
            borderBottom: '1px solid #cbd5e1',
            borderTop: '1px solid rgba(15, 23, 42, 0.05)',
            background: 'rgba(248, 250, 252, 0.5)',
            overflow: 'hidden',
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

          {/* Granular Activity Bars */}
          {ANNUAL_SUB_BINS.map((value, index) => {
            const heightPx = Math.max(3, (value / ANNUAL_SUB_BINS_MAX) * 28);
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

          {/* Interactive Selection Brush Window [ JUL ] */}
          <div
            style={{
              position: 'absolute',
              left: `${julyStartPct}%`,
              width: `${julyWidthPct}%`,
              top: 0,
              bottom: 0,
              border: `1.8px solid ${THEME.tueRed}`,
              backgroundColor: `rgba(200, 16, 46, ${brushOpacity})`,
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
                height: 16,
                borderRadius: 2,
                backgroundColor: THEME.tueRed,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 1, height: 8, backgroundColor: '#ffffff', opacity: 0.85 }} />
            </div>
            {/* Right Handle */}
            <div
              style={{
                position: 'absolute',
                right: -3,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 5,
                height: 16,
                borderRadius: 2,
                backgroundColor: THEME.tueRed,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 1, height: 8, backgroundColor: '#ffffff', opacity: 0.85 }} />
            </div>
          </div>
        </div>

        {/* Month Labels */}
        <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
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
                  fontSize: 9,
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
      {/* SVG TRAPEZOID CONNECTOR (Between Overview & Detail)   */}
      {/* ==================================================== */}
      <div style={{ height: 10, position: 'relative', width: '100%', overflow: 'visible' }}>
        <svg
          width={TIMELINE_W}
          height={10}
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          <polygon
            points={`
              ${TIMELINE_W * (6 / 12)},0
              ${TIMELINE_W * (7 / 12)},0
              ${TIMELINE_W},10
              0,10
            `}
            fill="rgba(200, 16, 46, 0.05)"
            stroke="rgba(200, 16, 46, 0.25)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>
      </div>

      {/* ==================================================== */}
      {/* CARD 2: SELECTED DETAIL DOMAIN (July 31 Days, DBTA)  */}
      {/* ==================================================== */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid rgba(15, 23, 42, 0.09)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          padding: '10px 18px 8px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Header Line inside the Detail Card */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
            borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
            paddingBottom: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: 9,
                fontWeight: 850,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: THEME.blue,
                backgroundColor: THEME.blueBg,
                padding: '2px 6px',
                borderRadius: 3,
                border: `1px solid ${THEME.blueBorder}`,
              }}
            >
              DETAIL (JULY)
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 750, color: THEME.textPrimary }}>
              Selected Month Domain: 01 July – 31 July
            </span>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10,
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
                padding: '2px 6px',
                borderRadius: 3,
                backgroundColor: THEME.violetBg,
                border: `1px solid rgba(124, 58, 237, 0.3)`,
                fontFamily: MONO_FONT,
                fontSize: 8.5,
                fontWeight: 800,
                color: THEME.violet,
                letterSpacing: 0.8,
              }}
            >
              INSPECTION FOCUS: 31 JULY
            </div>
            <div
              style={{
                padding: '2px 6px',
                borderRadius: 3,
                backgroundColor: THEME.tueRedBg,
                border: `1px solid ${THEME.tueRedBorder}`,
                fontFamily: MONO_FONT,
                fontSize: 8.5,
                fontWeight: 800,
                color: THEME.tueRed,
                letterSpacing: 0.8,
              }}
            >
              DBTA ALLOCATION APPLIED
            </div>
          </div>
        </div>

        {/* 1. Daily Density Heat Strip (31 Days with DBTA Variable Widths) */}
        <div
          style={{
            position: 'relative',
            height: 7,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            marginBottom: 4,
          }}
        >
          {julyLayout.map((day) => {
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

        {/* 2. Histogram Activity Track & DBTA Bars */}
        <div
          style={{
            position: 'relative',
            height: 38,
            borderBottom: '1px solid #cbd5e1',
            borderTop: '1px solid rgba(15, 23, 42, 0.05)',
            background: 'rgba(248, 250, 252, 0.6)',
            overflow: 'hidden',
          }}
        >
          {/* Day Grid Lines */}
          {julyLayout.map((day) => (
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
                  : 'rgba(100, 116, 139, 0.12)',
              }}
            />
          ))}

          {/* 31 Daily Activity Bars */}
          {julyLayout.map((day) => {
            const isTarget = day.dayNumber === 31;
            const isDay14 = day.isTargetDay;
            const heightPx = Math.max(3.5, (day.count / JULY_31_MAX) * 34);
            const barWidth = Math.max(1.8, day.widthPct);
            const isPeak = day.isBurst;

            // Day 14 renders internal hourly resolution
            if (isDay14) {
              return (
                <div
                  key={`day-bar-${day.dayIndex}`}
                  style={{
                    position: 'absolute',
                    left: `${day.startPct}%`,
                    width: `${day.widthPct}%`,
                    top: 0,
                    bottom: 0,
                    borderLeft: `1px solid ${THEME.tueRed}`,
                    borderRight: `1px solid ${THEME.tueRed}`,
                    backgroundColor: 'rgba(200, 16, 46, 0.06)',
                    boxSizing: 'border-box',
                  }}
                >
                  {DAY14_HOURLY_COUNTS.map((hCount, hIdx) => {
                    const hHeight = Math.max(2.5, (hCount / DAY14_HOURLY_MAX) * 34);
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
                          borderRadius: '0.8px 0.8px 0 0',
                        }}
                      />
                    );
                  })}
                </div>
              );
            }

            return (
              <div
                key={`day-bar-${day.dayIndex}`}
                style={{
                  position: 'absolute',
                  left: `${day.startPct}%`,
                  width: `${barWidth - 0.2}%`,
                  bottom: 0,
                  height: `${heightPx}px`,
                  backgroundColor: isTarget
                    ? THEME.violet
                    : isPeak
                    ? THEME.tueRed
                    : day.count > 25
                    ? '#3b82f6'
                    : 'rgba(15, 23, 42, 0.24)',
                  borderRadius: '1px 1px 0 0',
                }}
              />
            );
          })}

          {/* July 31 Target Focus Box */}
          {(() => {
            const day31 = julyLayout[30];
            if (!day31) return null;
            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${day31.startPct}%`,
                  width: `${day31.widthPct}%`,
                  top: 0,
                  bottom: 0,
                  border: `1.8px solid ${THEME.violet}`,
                  backgroundColor: 'rgba(124, 58, 237, 0.12)',
                  borderRadius: 2,
                  boxShadow: '0 0 10px rgba(124, 58, 237, 0.35)',
                  boxSizing: 'border-box',
                  zIndex: 15,
                }}
              />
            );
          })()}
        </div>

        {/* Date Labels */}
        <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
          {julyLayout.map((day) => {
            const isTarget = day.dayNumber === 31;
            const isShow = day.dayNumber % 5 === 1 || isTarget || day.widthPct > 5.0;
            if (!isShow) return null;

            return (
              <div
                key={day.dayNumber}
                style={{
                  position: 'absolute',
                  left: `${day.startPct + day.widthPct / 2}%`,
                  transform: 'translateX(-50%)',
                  fontFamily: MONO_FONT,
                  fontSize: 8.5,
                  fontWeight: isTarget ? 900 : day.isBurst ? 800 : 600,
                  color: isTarget ? THEME.violet : day.isBurst ? THEME.tueRed : THEME.textMuted,
                  letterSpacing: 0.5,
                }}
              >
                {day.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
