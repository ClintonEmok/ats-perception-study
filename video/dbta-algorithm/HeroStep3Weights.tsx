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

  // Animation: density bonus grows on top of the base weight 1.0
  const bonusGrowth = interpolate(progress, [0.15, 0.55], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const baseWeight = 1.0;
  const alpha = 5.0;

  const intervalsData = [
    { label: '12:00–13:00', normDensity: 0.04, isBurst: false },
    { label: '13:00–14:00', normDensity: 0.125, isBurst: false },
    { label: '14:00–15:00', normDensity: 1.0, isBurst: true },
    { label: '15:00–16:00', normDensity: 0.04, isBurst: false },
    { label: '16:00–17:00', normDensity: 0.15, isBurst: false },
  ];

  // Base bar height in pixels (representing base 1.0)
  const baseH = 80;
  // Maximum bonus height for the burst interval
  const maxBonusH = 260;

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
            w_i = 1 + α · (ρ_i / ρ_max)^k
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Additive Baseline Allocation (Base 1.0 + Contrast Scaling)
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
          <span>Guarantee: Additive Base 1.0 Prevents Any Interval Collapse</span>
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
          padding: '0 70px 70px 70px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Legend */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#3b82f6' }} />
            <span style={{ fontSize: 12, fontFamily: MONO_FONT, fontWeight: 800, color: DARK_TEXT }}>
              Base Floor (1.0)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: TUE_RED }} />
            <span style={{ fontSize: 12, fontFamily: MONO_FONT, fontWeight: 800, color: TUE_RED }}>
              Burst Expansion (+α·(ρ/ρ_max)³)
            </span>
          </div>
        </div>

        {/* Base 1.0 Dashed Benchmark Line across all columns */}
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            bottom: 70 + baseH,
            height: 1.5,
            borderTop: '2px dashed #94a3b8',
            zIndex: 12,
            pointerEvents: 'none',
          }}
        />

        {/* 5 Stacked Column Blocks */}
        {intervalsData.map((d, i) => {
          // Density contrast bonus: alpha * (normDensity^3)
          const contrastBonus = alpha * Math.pow(d.normDensity, 3);
          const currentBonus = contrastBonus * bonusGrowth;
          const totalWeight = baseWeight + currentBonus;

          const bonusH = (currentBonus / alpha) * maxBonusH;

          return (
            <div
              key={`stack-col-${i}`}
              style={{
                width: barColW - 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                position: 'relative',
                zIndex: 10,
              }}
            >
              {/* Total Weight Tag */}
              <div
                style={{
                  marginBottom: 10,
                  fontFamily: MONO_FONT,
                  fontSize: 16,
                  fontWeight: 900,
                  color: d.isBurst ? TUE_RED : '#0f172a',
                }}
              >
                w_{i + 1} = {d.isBurst ? (1.0 + currentBonus).toFixed(2) : totalWeight.toFixed(2)}
              </div>

              {/* Stack Container */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  position: 'relative',
                }}
              >
                {/* Top Bonus Block (Density Expansion) */}
                {bonusH > 2 && (
                  <div
                    style={{
                      width: '100%',
                      height: bonusH,
                      backgroundColor: d.isBurst ? TUE_RED : '#8b5cf6',
                      borderRadius: '8px 8px 0 0',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
                      boxShadow: d.isBurst ? '0 8px 24px rgba(200, 16, 46, 0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontFamily: MONO_FONT,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {d.isBurst && bonusGrowth > 0.6 ? `+${currentBonus.toFixed(1)} BURST` : ''}
                  </div>
                )}

                {/* Bottom Base 1.0 Block (Guaranteed Floor) */}
                <div
                  style={{
                    width: '100%',
                    height: baseH,
                    backgroundColor: '#3b82f6',
                    borderRadius: bonusH > 2 ? '0 0 4px 4px' : '8px 8px 4px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontFamily: MONO_FONT,
                    fontSize: 13,
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                  }}
                >
                  <span>1.0</span>
                  <span style={{ fontSize: 9.5, opacity: 0.85, fontWeight: 700 }}>BASE FLOOR</span>
                </div>
              </div>

              {/* Bottom Interval Label */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -50,
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
                  {d.label}
                </span>
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 11,
                    fontWeight: 600,
                    color: d.isBurst ? TUE_RED : MUTED_TEXT,
                  }}
                >
                  {d.isBurst ? '48 events (Burst)' : `${i === 1 ? '6' : i === 4 ? '7' : '2'} events`}
                </span>
              </div>
            </div>
          );
        })}

        {/* Baseline Bar */}
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            bottom: 70,
            height: 3.5,
            backgroundColor: '#0f172a',
            zIndex: 5,
          }}
        />
      </div>
    </div>
  );
};
