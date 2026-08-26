import React from 'react';
import { Easing, interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

interface HeroStep2DensityProps {
  progress: number; // 0 to 1
  width: number;
  height: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const HeroStep2Density: React.FC<HeroStep2DensityProps> = ({
  progress,
  width,
  height,
}) => {
  const padX = 40;
  const stageW = width - 2 * padX;
  const stageH = height - 100;
  
  const axisMargin = 50;
  const axisW = stageW - 2 * axisMargin;
  const sliceW = axisW / 5;
  const axisY = stageH - 70;

  // Curve rise animation
  const curveRise = interpolate(progress, [0.1, 0.45], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const peakPulse = interpolate(progress, [0.5, 0.7, 0.9, 1.0], [1, 1.15, 1, 1.1], clamp);

  // Density curve control points
  const p1 = { x: axisMargin, y: axisY - 10 * curveRise };
  const p2 = { x: axisMargin + sliceW, y: axisY - 20 * curveRise };
  const p3 = { x: axisMargin + 1.8 * sliceW, y: axisY - 55 * curveRise };
  const peak = { x: axisMargin + 2.5 * sliceW, y: axisY - 260 * curveRise };
  const p4 = { x: axisMargin + 3.2 * sliceW, y: axisY - 55 * curveRise };
  const p5 = { x: axisMargin + 4 * sliceW, y: axisY - 20 * curveRise };
  const p6 = { x: axisMargin + axisW, y: axisY - 12 * curveRise };

  const pathD = `M ${p1.x} ${p1.y} C ${axisMargin + 0.6 * sliceW} ${p1.y}, ${axisMargin + 1.3 * sliceW} ${p2.y}, ${p3.x} ${p3.y} C ${axisMargin + 2.0 * sliceW} ${axisY - 180 * curveRise}, ${axisMargin + 2.2 * sliceW} ${peak.y}, ${peak.x} ${peak.y} C ${axisMargin + 2.8 * sliceW} ${peak.y}, ${axisMargin + 3.0 * sliceW} ${axisY - 180 * curveRise}, ${p4.x} ${p4.y} C ${axisMargin + 3.7 * sliceW} ${p5.y}, ${axisMargin + 4.4 * sliceW} ${p6.y}, ${p6.x} ${p6.y}`;
  const areaD = `${pathD} L ${axisMargin + axisW} ${axisY} L ${axisMargin} ${axisY} Z`;

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
              backgroundColor: 'rgba(200, 16, 46, 0.1)',
              color: TUE_RED,
              fontFamily: MONO_FONT,
              fontSize: 14,
              fontWeight: 800,
              border: `1px solid rgba(200, 16, 46, 0.25)`,
            }}
          >
            ρ_i = N_i / |Δt_i|
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Continuous Temporal Density Signal Estimation
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
        {/* Interval Grid Guides */}
        {[0, 1, 2, 3, 4, 5].map((t) => (
          <div
            key={`guide-${t}`}
            style={{
              position: 'absolute',
              left: axisMargin + t * sliceW,
              top: 0,
              width: 1,
              height: stageH,
              borderLeft: '1.5px dashed rgba(15, 23, 42, 0.1)',
            }}
          />
        ))}

        {/* SVG Curve & Signal */}
        <svg
          width={stageW}
          height={stageH}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
        >
          <defs>
            <linearGradient id="heroDensityGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TUE_RED} stopOpacity={0.36} />
              <stop offset="60%" stopColor={TUE_RED} stopOpacity={0.12} />
              <stop offset="100%" stopColor={TUE_RED} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill="url(#heroDensityGrad2)" />

          {/* Density Signal Line */}
          <path
            d={pathD}
            fill="none"
            stroke={TUE_RED}
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* Peak Indicator Beacon */}
          {curveRise > 0.6 && (
            <g transform={`translate(${peak.x}, ${peak.y})`}>
              <circle r={18 * peakPulse} fill={TUE_RED} opacity={0.25} />
              <circle r={9} fill="#ffffff" stroke={TUE_RED} strokeWidth={3.5} />
              <circle r={4} fill={TUE_RED} />
            </g>
          )}

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

          {/* Ticks & Labels */}
          {[0, 1, 2, 3, 4, 5].map((t) => {
            const x = axisMargin + t * sliceW;
            return (
              <g key={`d-tick-${t}`}>
                <line
                  x1={x}
                  y1={axisY - 10}
                  x2={x}
                  y2={axisY + 10}
                  stroke="#0f172a"
                  strokeWidth={2}
                />
                <text
                  x={x}
                  y={axisY + 32}
                  textAnchor="middle"
                  fontSize={14}
                  fontFamily={MONO_FONT}
                  fontWeight={800}
                  fill={DARK_TEXT}
                >
                  {12 + t}:00
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Peak Card */}
        {curveRise > 0.7 && (
          <div
            style={{
              position: 'absolute',
              left: peak.x,
              top: peak.y - 70,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 16px',
              borderRadius: 10,
              backgroundColor: '#ffffff',
              border: `2px solid ${TUE_RED}`,
              boxShadow: '0 8px 24px rgba(200, 16, 46, 0.18)',
            }}
          >
            <span style={{ fontSize: 11, fontFamily: MONO_FONT, fontWeight: 800, color: TUE_RED }}>
              PEAK DENSITY INTERVAL [14:00–15:00]
            </span>
            <span style={{ fontSize: 16, fontFamily: MONO_FONT, fontWeight: 900, color: DARK_TEXT }}>
              ρ_max = 48 events / hr
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
