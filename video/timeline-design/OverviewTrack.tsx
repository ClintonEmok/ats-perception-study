import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MONO_FONT } from '../theme';
import {
  ANNUAL_SUB_BINS,
  ANNUAL_SUB_BINS_MAX,
  DENSITY_HEAT_STOPS,
  MONTH_NAMES,
  MONTHLY_COUNTS,
  MONTHLY_MAX,
  THEME,
  TIMELINE_WIDTH,
} from './data';

interface OverviewTrackProps {
  // Selection animation progress: 0 (no selection) -> 1 (July fully selected)
  selectionProgress: number;
  // Ambient pulse for Phase 6
  isAnatomyPhase?: boolean;
}

export const OverviewTrack: React.FC<OverviewTrackProps> = ({
  selectionProgress,
  isAnatomyPhase = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // July spans from index 6/12 to 7/12 (50.0% to 58.333%)
  const julyStartPct = (6 / 12) * 100; // 50.0%
  const julyWidthPct = (1 / 12) * 100; // 8.333%

  // Brush emergence: starts near center or shrinks in from 0 width to July
  const currentBrushWidthPct = interpolate(
    selectionProgress,
    [0, 1],
    [0, julyWidthPct],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const currentBrushLeftPct = julyStartPct + (julyWidthPct - currentBrushWidthPct) / 2;
  const brushOpacity = interpolate(selectionProgress, [0, 0.25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Ambient breathing opacity during Phase 6 (540+ frames)
  const breathingOpacity = isAnatomyPhase
    ? 0.15 + 0.08 * Math.sin(frame / 24)
    : 0.16;

  return (
    <div
      style={{
        width: TIMELINE_WIDTH,
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid rgba(15, 23, 42, 0.09)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        padding: '16px 22px 14px',
        boxSizing: 'border-box',
        position: 'relative',
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
              color: THEME.navy,
              backgroundColor: 'rgba(15, 23, 42, 0.06)',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            OVERVIEW
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textPrimary }}>
            Complete Annual Temporal Domain
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 11,
              fontWeight: 600,
              color: THEME.textMuted,
            }}
          >
            (12 Months · 365 Days)
          </span>
        </div>

        {/* Density Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            color: THEME.textMuted,
            fontSize: 10,
            fontFamily: MONO_FONT,
            fontWeight: 650,
          }}
        >
          <span>Sparse</span>
          <div
            style={{
              width: 100,
              height: 7,
              borderRadius: 3,
              border: '1px solid rgba(15, 23, 42, 0.1)',
              background: `linear-gradient(90deg, ${DENSITY_HEAT_STOPS.join(',')})`,
            }}
          />
          <span>Dense</span>
        </div>
      </div>

      {/* 1. Density Heat Strip (48 Sub-bins) */}
      <div
        style={{
          position: 'relative',
          height: 10,
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid rgba(15, 23, 42, 0.12)',
          display: 'flex',
          marginBottom: 6,
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

        {/* Selected Region Highlight inside Heatstrip */}
        {brushOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${currentBrushLeftPct}%`,
              width: `${currentBrushWidthPct}%`,
              top: -1,
              bottom: -1,
              border: `2px solid ${THEME.tueRed}`,
              background: `rgba(200, 16, 46, ${breathingOpacity})`,
              boxSizing: 'border-box',
              opacity: brushOpacity,
            }}
          />
        )}
      </div>

      {/* 2. Histogram Activity Track & Month Grid */}
      <div
        style={{
          position: 'relative',
          height: 52,
          borderBottom: '1px solid #cbd5e1',
          borderTop: '1px solid rgba(15, 23, 42, 0.05)',
          background: 'rgba(248, 250, 252, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Month Column Dividers & Alternating Fills */}
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
                  monthIdx < 11 ? '1px solid rgba(100, 116, 139, 0.15)' : 'none',
                backgroundColor:
                  isSelectedMonth && brushOpacity > 0
                    ? `rgba(200, 16, 46, 0.04)`
                    : monthIdx % 2 === 0
                    ? 'rgba(148, 163, 184, 0.03)'
                    : 'transparent',
                boxSizing: 'border-box',
              }}
            />
          );
        })}

        {/* Granular Activity Bars (48 sub-bins) */}
        {ANNUAL_SUB_BINS.map((value, index) => {
          const heightPx = Math.max(4, (value / ANNUAL_SUB_BINS_MAX) * 44);
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
                backgroundColor:
                  isJulySubBin && brushOpacity > 0.5
                    ? THEME.tueRed
                    : 'rgba(15, 23, 42, 0.22)',
                borderRadius: '1.5px 1.5px 0 0',
                transition: 'background-color 0.2s ease',
              }}
            />
          );
        })}

        {/* 3. Interactive Selection Brush Window [ JUL ] */}
        {brushOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${currentBrushLeftPct}%`,
              width: `${currentBrushWidthPct}%`,
              top: 0,
              bottom: 0,
              border: `2px solid ${THEME.tueRed}`,
              backgroundColor: `rgba(200, 16, 46, ${breathingOpacity})`,
              boxSizing: 'border-box',
              opacity: brushOpacity,
              boxShadow: `0 0 16px rgba(200, 16, 46, ${0.25 + (isAnatomyPhase ? 0.1 * Math.sin(frame / 20) : 0)})`,
              zIndex: 10,
            }}
          >
            {/* Left Handle Pill */}
            <div
              style={{
                position: 'absolute',
                left: -4,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 7,
                height: 24,
                borderRadius: 3,
                backgroundColor: THEME.tueRed,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 1,
                  height: 10,
                  backgroundColor: '#ffffff',
                  opacity: 0.85,
                }}
              />
            </div>

            {/* Right Handle Pill */}
            <div
              style={{
                position: 'absolute',
                right: -4,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 7,
                height: 24,
                borderRadius: 3,
                backgroundColor: THEME.tueRed,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 1,
                  height: 10,
                  backgroundColor: '#ffffff',
                  opacity: 0.85,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Month Axis Ticks and Labels */}
      <div
        style={{
          position: 'relative',
          height: 20,
          marginTop: 4,
        }}
      >
        {MONTH_NAMES.map((name, index) => {
          const isSelected = index === 6; // July
          const isHighlight = isSelected && brushOpacity > 0.5;

          return (
            <div
              key={name}
              style={{
                position: 'absolute',
                left: `${((index + 0.5) / 12) * 100}%`,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontFamily: MONO_FONT,
                fontSize: 10.5,
                fontWeight: isHighlight ? 900 : 600,
                color: isHighlight ? THEME.tueRed : THEME.textMuted,
                letterSpacing: 0.8,
              }}
            >
              {name}
            </div>
          );
        })}
      </div>
    </div>
  );
};
