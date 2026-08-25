import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  buildAdaptiveHourLayout,
  DAILY_COUNTS,
  SELECTED_HOURLY_COUNTS,
} from '../real/data';

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
  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);

  const brushX = (3 / 7) * 100;
  const brushWidth = (1 / 7) * 100;
  const currentBrushWidth = interpolate(selectionProgress, [0, 1], [100, brushWidth]);
  const currentBrushX = interpolate(selectionProgress, [0, 1], [0, brushX]);

  const maxDaily = Math.max(...DAILY_COUNTS);
  const maxHourly = Math.max(...SELECTED_HOURLY_COUNTS);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#090d16',
        color: '#f8fafc',
        padding: '14px 20px',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. OVERVIEW TIMELINE (7-Day Density Strip)           */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          border: highlightDensity
            ? '1.5px solid #38bdf8'
            : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 10,
          padding: '10px 14px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          boxShadow: highlightDensity
            ? '0 0 24px rgba(56, 189, 248, 0.25)'
            : '0 4px 16px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: '#38bdf8' }} />
            <span style={{ fontSize: 9.5, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800, fontFamily: MONO_FONT }}>
              OVERVIEW TEMPORAL RESOLUTION (7 DAYS · DENSITY STRIP)
            </span>
          </div>
          <span style={{ fontSize: 10, color: '#38bdf8', fontFamily: MONO_FONT, fontWeight: 750 }}>
            {selectionProgress > 0.5 ? 'BRUSH LOCKED: THU 31 JUL (723 INCIDENTS)' : 'DRAGGABLE BRUSH WINDOW'}
          </span>
        </div>

        {/* 7-Day Density Bars & Continuous Gradient */}
        <div style={{ position: 'relative', height: 44, width: '100%' }}>
          {/* Continuous STKDE 1D Density Heat Strip (Background) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 6,
              borderRadius: 3,
              background: 'linear-gradient(90deg, #224cff 0%, #00d4ff 35%, #ffd640 65%, #ff4060 100%)',
              opacity: 0.85,
            }}
          />

          {/* Interactive Brush Selection Window with Resize Grips */}
          <div
            style={{
              position: 'absolute',
              left: `${currentBrushX}%`,
              width: `${currentBrushWidth}%`,
              top: -2,
              bottom: -2,
              border: '2px solid #38bdf8',
              borderRadius: 6,
              background: 'rgba(56, 189, 248, 0.16)',
              boxShadow: '0 0 18px rgba(56, 189, 248, 0.4)',
              zIndex: 10,
              transition: 'all 0.1s ease',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 2px',
            }}
          >
            {/* Left Grip Handle */}
            <div style={{ width: 4, height: 16, background: '#38bdf8', borderRadius: 2, opacity: 0.8 }} />
            {/* Right Grip Handle */}
            <div style={{ width: 4, height: 16, background: '#38bdf8', borderRadius: 2, opacity: 0.8 }} />
          </div>

          {/* Daily Histogram Bars */}
          <div style={{ display: 'flex', height: '100%', width: '100%', gap: 6, alignItems: 'flex-end', paddingBottom: 8 }}>
            {DAILY_COUNTS.map((count, index) => {
              const heightPct = Math.max(15, (count / maxDaily) * 100);
              const isThu = index === 3;
              return (
                <div
                  key={DAY_LABELS[index]}
                  style={{
                    flex: 1,
                    height: `${heightPct}%`,
                    borderRadius: 4,
                    background: isThu
                      ? 'linear-gradient(180deg, #ef4444, #f59e0b)'
                      : 'linear-gradient(180deg, #38bdf8, #0284c7)',
                    opacity: isThu ? 1 : 0.45,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: 3,
                  }}
                >
                  <span style={{ fontSize: 8.5, fontWeight: 800, color: '#ffffff', fontFamily: MONO_FONT }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {DAY_LABELS.map((day, idx) => (
            <span
              key={day}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 9,
                color: idx === 3 ? '#38bdf8' : '#64748b',
                fontWeight: idx === 3 ? 850 : 600,
                fontFamily: MONO_FONT,
              }}
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. DETAIL TIMELINE (24-Hour Adaptive Resolution)      */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          border: highlightDetail
            ? '1.5px solid #38bdf8'
            : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 10,
          padding: '10px 14px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          boxShadow: highlightDetail
            ? '0 0 24px rgba(56, 189, 248, 0.25)'
            : '0 4px 16px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: warpProgress > 0.1 ? '#ef4444' : '#38bdf8' }} />
            <span style={{ fontSize: 9.5, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800, fontFamily: MONO_FONT }}>
              DETAIL TEMPORAL RESOLUTION · THURSDAY 31 JULY (24 HOURS)
            </span>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
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
              color: warpProgress > 0.1 ? '#ef4444' : '#38bdf8',
            }}
          >
            {warpProgress > 0.1
              ? `VISUAL ALLOCATION ACTIVE (${multiplier.toFixed(1)}× EXPANSION)`
              : 'UNIFORM 1-HOUR BINS'}
          </span>
        </div>

        {/* 24-Hour Adaptive Bins Layout */}
        <div style={{ position: 'relative', height: 44, width: '100%', display: 'flex', gap: 2 }}>
          {/* Continuous Adaptive Density Heat Strip (Bottom) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 5,
              borderRadius: 3,
              background: 'linear-gradient(90deg, #224cff 0%, #00d4ff 45%, #ffd640 70%, #ff4060 85%, #00d4ff 100%)',
              opacity: 0.85,
            }}
          />

          {hourLayout.map((hourBin, idx) => {
            const count = SELECTED_HOURLY_COUNTS[idx];
            const heightPct = Math.max(15, (count / maxHourly) * 100);
            const isBurst = idx >= 17 && idx <= 20;

            return (
              <div
                key={`hour-${idx}`}
                style={{
                  width: `${hourBin.width * 100}%`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  transition: 'width 0.1s ease',
                  paddingBottom: 7,
                }}
              >
                <div
                  style={{
                    height: `${heightPct}%`,
                    borderRadius: 3,
                    background: isBurst
                      ? 'linear-gradient(180deg, #ef4444, #f59e0b)'
                      : 'linear-gradient(180deg, #38bdf8, #0284c7)',
                    opacity: isBurst ? 1 : 0.55,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: 2,
                    boxShadow: isBurst ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none',
                  }}
                >
                  {hourBin.width > 0.035 ? (
                    <span style={{ fontSize: 8, fontWeight: 850, color: '#ffffff', fontFamily: MONO_FONT }}>
                      {count}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hour Ticks */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {[0, 4, 8, 12, 16, 18, 20, 24].map((h) => (
            <span
              key={`tick-${h}`}
              style={{
                fontSize: 8.5,
                color: h >= 17 && h <= 20 ? '#ef4444' : '#64748b',
                fontWeight: h >= 17 && h <= 20 ? 850 : 600,
                fontFamily: MONO_FONT,
              }}
            >
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

