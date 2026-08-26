import React from 'react';
import { Easing, interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

interface HeroStep4IntegrationProps {
  progress: number; // 0 to 1
  width: number;
  height: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const HeroStep4Integration: React.FC<HeroStep4IntegrationProps> = ({
  progress,
  width,
  height,
}) => {
  const padX = 40;
  const stageW = width - 2 * padX;
  const stageH = height - 100;

  const axisMargin = 50;
  const axisW = stageW - 2 * axisMargin;
  const axisY = stageH / 2 + 35;

  // Warp transformation progress (0 to 1)
  const warpProgress = interpolate(progress, [0.15, 0.7], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // Mathematically exact prefix-sum cumulative bounds from Step 3:
  // s = [11.2%, 14.4%, 48.0%, 11.2%, 15.2%]
  const uniformBoundaries = [0, 0.2 * axisW, 0.4 * axisW, 0.6 * axisW, 0.8 * axisW, axisW];
  const dbtaBoundaries = [0, 0.112 * axisW, 0.256 * axisW, 0.736 * axisW, 0.848 * axisW, axisW];

  const currentBoundaries = uniformBoundaries.map((uX, idx) => {
    const aX = dbtaBoundaries[idx];
    return interpolate(warpProgress, [0, 1], [uX, aX], clamp);
  });

  const burstLeft = axisMargin + currentBoundaries[2];
  const burstRight = axisMargin + currentBoundaries[3];
  const burstWidth = burstRight - burstLeft;

  const timeLabels = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const finalShares = ['11.2%', '14.4%', '48.0%', '11.2%', '15.2%'];

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* 1. Header Info Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: stageW,
          marginTop: 10,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontFamily: MONO_FONT,
              fontSize: 14,
              fontWeight: 800,
              border: `1px solid rgba(16, 185, 129, 0.25)`,
            }}
          >
            {'x_k = W · (Σ_{i=1}^k s_i) / 100%'}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Prefix-Sum Cumulative Coordinate Mapping
          </span>
        </div>
      </div>

      {/* 2. Full-Width Interactive Stage */}
      <div
        style={{
          position: 'relative',
          width: stageW,
          height: stageH,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          border: '1.5px solid rgba(15, 23, 42, 0.1)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Interval Background Columns */}
        {[0, 1, 2, 3, 4].map((idx) => {
          const left = axisMargin + currentBoundaries[idx];
          const right = axisMargin + currentBoundaries[idx + 1];
          const widthCol = right - left;
          const isBurst = idx === 2;

          let bg = idx % 2 === 0 ? 'rgba(15, 23, 42, 0.015)' : 'rgba(15, 23, 42, 0.035)';
          if (isBurst) {
            bg = 'rgba(16, 185, 129, 0.05)';
          }

          return (
            <div
              key={`col-${idx}`}
              style={{
                position: 'absolute',
                left,
                top: 0,
                width: widthCol,
                height: '100%',
                backgroundColor: bg,
                borderLeft: idx === 0 ? '1.5px dashed rgba(15, 23, 42, 0.12)' : 'none',
                borderRight: '1.5px dashed rgba(15, 23, 42, 0.12)',
                boxSizing: 'border-box',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Interval Header Tag */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 999,
                  backgroundColor: isBurst ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.06)',
                  border: `1px solid ${isBurst ? '#10b981' : 'rgba(15, 23, 42, 0.12)'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 12,
                    fontWeight: 800,
                    color: isBurst ? '#10b981' : DARK_TEXT,
                  }}
                >
                  {timeLabels[idx]}–{timeLabels[idx + 1]}
                </span>
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 11,
                    fontWeight: 800,
                    backgroundColor: isBurst ? '#10b981' : '#0f172a',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: 999,
                  }}
                >
                  {finalShares[idx]}
                </span>
              </div>

              {isBurst && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '4px 12px',
                    borderRadius: 6,
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontFamily: MONO_FONT,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 1,
                  }}
                >
                  EXPANDED VISUAL SPACE (+140% ALLOCATION)
                </div>
              )}
            </div>
          );
        })}

        {/* SVG Axis & Dispersed Dots */}
        <svg
          width={stageW}
          height={stageH}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
        >
          {/* Baseline Axis */}
          <line
            x1={axisMargin}
            y1={axisY}
            x2={axisMargin + axisW}
            y2={axisY}
            stroke="#0f172a"
            strokeWidth={3.5}
            strokeLinecap="round"
          />

          {/* Warped Ticks */}
          {currentBoundaries.map((rx, idx) => {
            const x = axisMargin + rx;
            return (
              <g key={`w-tick-${idx}`}>
                <line
                  x1={x}
                  y1={axisY - 14}
                  x2={x}
                  y2={axisY + 14}
                  stroke="#0f172a"
                  strokeWidth={2.5}
                />
                <text
                  x={x}
                  y={axisY + 36}
                  textAnchor="middle"
                  fontSize={14}
                  fontFamily={MONO_FONT}
                  fontWeight={800}
                  fill={DARK_TEXT}
                >
                  {timeLabels[idx]}
                </text>
              </g>
            );
          })}

          {/* Sparse Events before burst */}
          <circle cx={axisMargin + currentBoundaries[0] + 0.3 * (currentBoundaries[1] - currentBoundaries[0])} cy={axisY} r={6} fill="#0f172a" />
          <circle cx={axisMargin + currentBoundaries[0] + 0.7 * (currentBoundaries[1] - currentBoundaries[0])} cy={axisY} r={6} fill="#0f172a" />

          {/* Moderate Interval 2 (6 events) */}
          {[0.15, 0.32, 0.48, 0.65, 0.8, 0.92].map((f, i) => (
            <circle
              key={`w-i1-dot-${i}`}
              cx={axisMargin + currentBoundaries[1] + f * (currentBoundaries[2] - currentBoundaries[1])}
              cy={axisY}
              r={6}
              fill="#0f172a"
            />
          ))}

          {/* 48 Burst Events (Dispersing smoothly across the expanding burst interval) */}
          {Array.from({ length: 48 }).map((_, i) => {
            const fraction = i / 47;
            const x = burstLeft + 14 + fraction * (burstWidth - 28);
            return (
              <circle
                key={`disp-dot-${i}`}
                cx={x}
                cy={axisY}
                r={6}
                fill={TUE_RED}
                stroke="#ffffff"
                strokeWidth={1}
              />
            );
          })}

          {/* Sparse Events after burst */}
          <circle cx={axisMargin + currentBoundaries[3] + 0.35 * (currentBoundaries[4] - currentBoundaries[3])} cy={axisY} r={6} fill="#0f172a" />
          <circle cx={axisMargin + currentBoundaries[3] + 0.75 * (currentBoundaries[4] - currentBoundaries[3])} cy={axisY} r={6} fill="#0f172a" />

          {/* Moderate Interval 5 (7 events) */}
          {[0.12, 0.26, 0.42, 0.58, 0.72, 0.84, 0.94].map((f, i) => (
            <circle
              key={`w-i4-dot-${i}`}
              cx={axisMargin + currentBoundaries[4] + f * (currentBoundaries[5] - currentBoundaries[4])}
              cy={axisY}
              r={6}
              fill="#0f172a"
            />
          ))}
        </svg>
      </div>
    </div>
  );
};
