import React from 'react';
import { Easing, interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

interface HeroStep1PartitionProps {
  progress: number; // 0 to 1
  width: number;
  height: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const HeroStep1Partition: React.FC<HeroStep1PartitionProps> = ({
  progress,
  width,
  height,
}) => {
  const padX = 40;
  const stageW = width - 2 * padX;
  const stageH = height - 100;
  
  // Inner stage axis bounds with comfortable margins
  const axisMargin = 50;
  const axisW = stageW - 2 * axisMargin;
  const sliceW = axisW / 5;
  const axisY = stageH / 2 + 35;

  // Dot drop entrance progress
  const dotEntrance = interpolate(progress, [0.1, 0.45], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const intervals = [
    { start: '12:00', end: '13:00', count: 2, isBurst: false },
    { start: '13:00', end: '14:00', count: 6, isBurst: false },
    { start: '14:00', end: '15:00', count: 48, isBurst: true },
    { start: '15:00', end: '16:00', count: 2, isBurst: false },
    { start: '16:00', end: '17:00', count: 7, isBurst: false },
  ];

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
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563eb',
              fontFamily: MONO_FONT,
              fontSize: 14,
              fontWeight: 800,
              border: '1px solid rgba(37, 99, 235, 0.25)',
            }}
          >
            {'Δt_i = [t_i, t_{i+1}]'}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Uniform Clock-Time Discretization
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
        {intervals.map((inv, idx) => {
          const left = axisMargin + idx * sliceW;
          const isEven = idx % 2 === 0;

          let bg = isEven ? 'rgba(15, 23, 42, 0.015)' : 'rgba(15, 23, 42, 0.035)';
          if (inv.isBurst) {
            bg = 'rgba(200, 16, 46, 0.04)';
          }

          return (
            <div
              key={`inv-col-${idx}`}
              style={{
                position: 'absolute',
                left,
                top: 0,
                width: sliceW,
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
              {/* Interval Header Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 12px',
                  borderRadius: 999,
                  backgroundColor: inv.isBurst ? 'rgba(200, 16, 46, 0.1)' : 'rgba(15, 23, 42, 0.06)',
                  border: `1px solid ${inv.isBurst ? TUE_RED : 'rgba(15, 23, 42, 0.12)'}`,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 13,
                    fontWeight: 800,
                    color: inv.isBurst ? TUE_RED : DARK_TEXT,
                  }}
                >
                  {inv.start}–{inv.end}
                </span>
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 12,
                    fontWeight: 800,
                    backgroundColor: inv.isBurst ? TUE_RED : '#0f172a',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {inv.count} events
                </span>
              </div>

              {inv.isBurst && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '4px 10px',
                    borderRadius: 6,
                    backgroundColor: TUE_RED,
                    color: '#ffffff',
                    fontFamily: MONO_FONT,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                  }}
                >
                  HIGH DENSITY CLUSTER
                </div>
              )}
            </div>
          );
        })}

        {/* SVG Axis & Dots */}
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

          {/* Ticks */}
          {[0, 1, 2, 3, 4, 5].map((t) => {
            const x = axisMargin + t * sliceW;
            return (
              <g key={`tick-${t}`}>
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
                  {12 + t}:00
                </text>
              </g>
            );
          })}

          {/* Event Dots */}
          {/* Interval 0 (2 events) */}
          <circle cx={axisMargin + 0.3 * sliceW} cy={axisY} r={6} fill="#0f172a" opacity={dotEntrance} />
          <circle cx={axisMargin + 0.7 * sliceW} cy={axisY} r={6} fill="#0f172a" opacity={dotEntrance} />

          {/* Interval 1 (6 events) */}
          {[0.15, 0.35, 0.5, 0.65, 0.8, 0.92].map((f, i) => (
            <circle
              key={`i1-dot-${i}`}
              cx={axisMargin + sliceW + f * sliceW}
              cy={axisY}
              r={6}
              fill="#0f172a"
              opacity={dotEntrance}
            />
          ))}

          {/* Interval 2 (48 events - Clustered tightly) */}
          {Array.from({ length: 48 }).map((_, i) => {
            const x = axisMargin + 2 * sliceW + 10 + (i / 47) * (sliceW - 20);
            return (
              <circle
                key={`burst-dot-${i}`}
                cx={x}
                cy={axisY}
                r={6}
                fill={TUE_RED}
                stroke="#ffffff"
                strokeWidth={1}
                opacity={dotEntrance}
              />
            );
          })}

          {/* Interval 3 (2 events) */}
          <circle cx={axisMargin + 3 * sliceW + 0.35 * sliceW} cy={axisY} r={6} fill="#0f172a" opacity={dotEntrance} />
          <circle cx={axisMargin + 3 * sliceW + 0.75 * sliceW} cy={axisY} r={6} fill="#0f172a" opacity={dotEntrance} />

          {/* Interval 4 (7 events) */}
          {[0.12, 0.28, 0.44, 0.58, 0.72, 0.84, 0.94].map((f, i) => (
            <circle
              key={`i4-dot-${i}`}
              cx={axisMargin + 4 * sliceW + f * sliceW}
              cy={axisY}
              r={6}
              fill="#0f172a"
              opacity={dotEntrance}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};
