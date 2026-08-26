import React from 'react';
import { Easing, interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

interface HeroStep3WeightsProps {
  progress: number; // 0 to 1
  width: number;
  height: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const HeroStep3Weights: React.FC<HeroStep3WeightsProps> = ({
  progress,
  width,
  height,
}) => {
  const padX = 40;
  const stageW = width - 2 * padX;
  const stageH = height - 100;
  const barColW = stageW / 5;

  // Floor activation animation: floor line rises and catches the sparse bars
  const floorRise = interpolate(progress, [0.1, 0.45], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const bars = [
    { label: '12:00–13:00', raw: 4, allocated: 15, isBurst: false },
    { label: '13:00–14:00', raw: 12, allocated: 22, isBurst: false },
    { label: '14:00–15:00', raw: 96, allocated: 52, isBurst: true },
    { label: '15:00–16:00', raw: 4, allocated: 15, isBurst: false },
    { label: '16:00–17:00', raw: 14, allocated: 24, isBurst: false },
  ];

  const floorPercent = 15;
  const maxPlotH = stageH - 170;
  const floorY = stageH - 70 - (floorPercent / 100) * maxPlotH * 1.5;

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
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              color: '#8b5cf6',
              fontFamily: MONO_FONT,
              fontSize: 14,
              fontWeight: 800,
              border: `1px solid rgba(139, 92, 246, 0.25)`,
            }}
          >
            w_i = max(w_min, ρ_i^γ)
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Non-Linear Weight Allocation & Floor Guarantee
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 8,
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: 14,
            fontWeight: 700,
            color: DARK_TEXT,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span>Guarantee: No Temporal Collapse (w_i ≥ w_min &gt; 0)</span>
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '0 60px 70px 60px',
          boxSizing: 'border-box',
        }}
      >
        {/* Floor Guarantee Line */}
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            top: floorY,
            height: 2,
            borderTop: '2px dashed #8b5cf6',
            opacity: floorRise,
            zIndex: 15,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 20,
              top: -26,
              padding: '3px 12px',
              borderRadius: 6,
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              fontFamily: MONO_FONT,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            w_min FLOOR GUARANTEE (15% MIN ALLOCATION)
          </div>
        </div>

        {/* 5 Allocation Column Blocks */}
        {bars.map((b, i) => {
          const currentWeight = interpolate(
            floorRise,
            [0, 1],
            [b.raw, b.allocated],
            clamp
          );

          const barH = (currentWeight / 100) * maxPlotH * 1.5;
          const isFloorClamped = floorRise > 0.6 && b.raw < 15 && b.allocated === 15;

          return (
            <div
              key={`w-col-${i}`}
              style={{
                width: barColW - 70,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                position: 'relative',
                zIndex: 10,
              }}
            >
              {/* Floor protected badge floating high above */}
              {isFloorClamped && (
                <div
                  style={{
                    marginBottom: 6,
                    whiteSpace: 'nowrap',
                    fontSize: 10.5,
                    fontFamily: MONO_FONT,
                    fontWeight: 800,
                    color: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  FLOOR PROTECTED
                </div>
              )}

              {/* Value Label */}
              <div
                style={{
                  marginBottom: 8,
                  fontFamily: MONO_FONT,
                  fontSize: 16,
                  fontWeight: 900,
                  color: b.isBurst ? TUE_RED : '#8b5cf6',
                }}
              >
                w_{i + 1} = {Math.round(currentWeight)}%
              </div>

              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  height: barH,
                  backgroundColor: b.isBurst ? TUE_RED : '#8b5cf6',
                  borderRadius: '10px 10px 4px 4px',
                  boxShadow: b.isBurst
                    ? '0 8px 24px rgba(200, 16, 46, 0.25)'
                    : '0 6px 18px rgba(139, 92, 246, 0.15)',
                  position: 'relative',
                  transition: 'height 0.1s ease',
                }}
              />

              {/* Bottom Label */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -48,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 13,
                    fontWeight: 800,
                    color: DARK_TEXT,
                  }}
                >
                  {b.label}
                </span>
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 11,
                    fontWeight: 600,
                    color: MUTED_TEXT,
                  }}
                >
                  {b.isBurst ? 'Dense Interval' : 'Sparse Interval'}
                </span>
              </div>
            </div>
          );
        })}

        {/* Baseline */}
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            bottom: 60,
            height: 3,
            backgroundColor: '#0f172a',
            zIndex: 5,
          }}
        />
      </div>
    </div>
  );
};
