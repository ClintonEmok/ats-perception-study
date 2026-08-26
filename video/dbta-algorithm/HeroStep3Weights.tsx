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

  // Visual pacing beats:
  // Beat 1 (0.00..0.25): Base floor 1.0 is established across all bins
  // Beat 2 (0.25..0.65): Density proportional stacks grow across ALL 5 bins
  // Beat 3 (0.65..1.00): Visual share percentages fade in showing full dynamic resizing
  const baseEntrance = interpolate(progress, [0.05, 0.25], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const stackGrowth = interpolate(progress, [0.25, 0.65], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const sharesReveal = interpolate(progress, [0.65, 0.85], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  // Mathematically exact values:
  // rho = [2, 6, 48, 2, 7]
  // rho_hat = [0.042, 0.125, 1.000, 0.042, 0.146]
  // alpha = 4.0
  // w_i = 1.0 + alpha * rho_hat
  // w = [1.17, 1.50, 5.00, 1.17, 1.58], sum = 10.42
  // visual shares s_i = [11.2%, 14.4%, 48.0%, 11.2%, 15.2%]
  const intervalsData = [
    {
      label: '12:00–13:00',
      events: 2,
      density: '2 ev/hr',
      base: 1.0,
      bonus: 0.17,
      totalWeight: 1.17,
      share: '11.2%',
      isBurst: false,
    },
    {
      label: '13:00–14:00',
      events: 6,
      density: '6 ev/hr',
      base: 1.0,
      bonus: 0.5,
      totalWeight: 1.5,
      share: '14.4%',
      isBurst: false,
    },
    {
      label: '14:00–15:00',
      events: 48,
      density: '48 ev/hr (ρ_max)',
      base: 1.0,
      bonus: 4.0,
      totalWeight: 5.0,
      share: '48.0%',
      isBurst: true,
    },
    {
      label: '15:00–16:00',
      events: 2,
      density: '2 ev/hr',
      base: 1.0,
      bonus: 0.17,
      totalWeight: 1.17,
      share: '11.2%',
      isBurst: false,
    },
    {
      label: '16:00–17:00',
      events: 7,
      density: '7 ev/hr',
      base: 1.0,
      bonus: 0.58,
      totalWeight: 1.58,
      share: '15.2%',
      isBurst: false,
    },
  ];

  // Visual bar scaling heights
  const maxBarH = stageH - 180;
  const unitH = maxBarH / 5.0; // height per 1.0 weight unit (~60px)

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
            {'w_i = 1 + α · (ρ_i / ρ_max)'}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Proportional Weight Allocation across All Temporal Bins
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
          <span>Guarantee: Every Bin Resizes Proportionately (Base 1.0 Preserves Sparse Bins)</span>
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
            gap: 20,
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#3b82f6' }} />
            <span style={{ fontSize: 12, fontFamily: MONO_FONT, fontWeight: 800, color: DARK_TEXT }}>
              Base Allocation Floor (1.0)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#8b5cf6' }} />
            <span style={{ fontSize: 12, fontFamily: MONO_FONT, fontWeight: 800, color: '#8b5cf6' }}>
              Density Additions (+α·ρ̂)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: TUE_RED }} />
            <span style={{ fontSize: 12, fontFamily: MONO_FONT, fontWeight: 800, color: TUE_RED }}>
              Burst Expansion (+4.0)
            </span>
          </div>
        </div>

        {/* Base 1.0 Dashed Benchmark Line */}
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            bottom: 70 + unitH * baseEntrance,
            height: 1.5,
            borderTop: '2px dashed #94a3b8',
            zIndex: 12,
            pointerEvents: 'none',
            opacity: baseEntrance,
          }}
        />

        {/* 5 Stacked Column Blocks */}
        {intervalsData.map((d, i) => {
          const currentBonus = d.bonus * stackGrowth;
          const currentTotalWeight = d.base * baseEntrance + currentBonus;

          const baseBarH = unitH * baseEntrance;
          const bonusBarH = currentBonus * unitH;

          return (
            <div
              key={`stack-col-${i}`}
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
              {/* Top Weight Value & Visual Share Tag */}
              <div
                style={{
                  marginBottom: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 17,
                    fontWeight: 900,
                    color: d.isBurst ? TUE_RED : '#0f172a',
                  }}
                >
                  w_{i + 1} = {currentTotalWeight.toFixed(2)}
                </span>

                {/* Resulting Visual Share Pill */}
                <div
                  style={{
                    opacity: sharesReveal,
                    transform: `translateY(${(1 - sharesReveal) * 6}px)`,
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: d.isBurst ? 'rgba(200, 16, 46, 0.12)' : 'rgba(15, 23, 42, 0.08)',
                    border: `1px solid ${d.isBurst ? TUE_RED : 'rgba(15, 23, 42, 0.15)'}`,
                    fontSize: 12,
                    fontFamily: MONO_FONT,
                    fontWeight: 800,
                    color: d.isBurst ? TUE_RED : DARK_TEXT,
                  }}
                >
                  Share: {d.share}
                </div>
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
                {bonusBarH > 1 && (
                  <div
                    style={{
                      width: '100%',
                      height: bonusBarH,
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
                      transition: 'height 0.05s linear',
                    }}
                  >
                    {bonusBarH > 20 && `+${currentBonus.toFixed(2)}`}
                  </div>
                )}

                {/* Bottom Base 1.0 Block (Guaranteed Floor) */}
                <div
                  style={{
                    width: '100%',
                    height: baseBarH,
                    backgroundColor: '#3b82f6',
                    borderRadius: bonusBarH > 1 ? '0 0 4px 4px' : '8px 8px 4px 4px',
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
                  <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 700 }}>BASE FLOOR</span>
                </div>
              </div>

              {/* Bottom Interval Info */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -52,
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
                    fontFamily: MONO_FONT,
                    fontSize: 11,
                    fontWeight: 700,
                    color: d.isBurst ? TUE_RED : MUTED_TEXT,
                  }}
                >
                  {d.density}
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
