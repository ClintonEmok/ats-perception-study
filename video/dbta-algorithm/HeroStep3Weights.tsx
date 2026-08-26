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

  // Silky smooth interpolation using standard smooth cubic bezier:
  // Beat 1 (0.00..0.18): 20% Initial uniform share hold
  // Beat 2 (0.18..0.76): Smooth, continuous redistribution up and down
  // Beat 3 (0.76..1.00): Stable final shares & delta badges
  const reallocateMorph = interpolate(progress, [0.18, 0.76], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  const deltaReveal = interpolate(progress, [0.68, 0.88], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const intervalsData = [
    {
      label: '12:00–13:00',
      events: 2,
      density: '2 ev/hr',
      initialShare: 20.0,
      finalShare: 11.2,
      delta: '-8.8%',
      deltaType: 'compress' as const,
      isBurst: false,
    },
    {
      label: '13:00–14:00',
      events: 6,
      density: '6 ev/hr',
      initialShare: 20.0,
      finalShare: 14.4,
      delta: '-5.6%',
      deltaType: 'compress' as const,
      isBurst: false,
    },
    {
      label: '14:00–15:00',
      events: 48,
      density: '48 ev/hr (ρ_max)',
      initialShare: 20.0,
      finalShare: 48.0,
      delta: '+28.0%',
      deltaType: 'expand' as const,
      isBurst: true,
    },
    {
      label: '15:00–16:00',
      events: 2,
      density: '2 ev/hr',
      initialShare: 20.0,
      finalShare: 11.2,
      delta: '-8.8%',
      deltaType: 'compress' as const,
      isBurst: false,
    },
    {
      label: '16:00–17:00',
      events: 7,
      density: '7 ev/hr',
      initialShare: 20.0,
      finalShare: 15.2,
      delta: '-4.8%',
      deltaType: 'compress' as const,
      isBurst: false,
    },
  ];

  // Visual scaling: 50% max share corresponds to maxPlotH
  const maxPlotH = stageH - 180;
  const uniformH = (20.0 / 50.0) * maxPlotH; // Height for 20%

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
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
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
            {'s_i = (w_i / Σ w_j) · 100%'}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Temporal Space Redistribution (From Uniform 20% to Density Shares)
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '0 70px 70px 70px',
          boxSizing: 'border-box',
        }}
      >
        {/* Uniform 20% Dashed Benchmark Line */}
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            bottom: 70 + uniformH,
            height: 1.5,
            borderTop: '2px dashed #94a3b8',
            zIndex: 12,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 10,
              top: -24,
              padding: '2px 10px',
              borderRadius: 6,
              backgroundColor: '#475569',
              color: '#ffffff',
              fontFamily: MONO_FONT,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            UNIFORM 20.0% BASELINE
          </div>
        </div>

        {/* 5 Dynamic Reallocation Column Blocks */}
        {intervalsData.map((d, i) => {
          // Current share interpolates from 20.0% to finalShare
          const currentShare = interpolate(
            reallocateMorph,
            [0, 1],
            [d.initialShare, d.finalShare],
            clamp
          );

          const currentBarH = (currentShare / 50.0) * maxPlotH;
          const isExpanding = d.deltaType === 'expand';

          return (
            <div
              key={`realloc-col-${i}`}
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
              {/* Top Share Value & Delta Pill */}
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
                    fontSize: 18,
                    fontWeight: 900,
                    color: isExpanding ? TUE_RED : DARK_TEXT,
                  }}
                >
                  {currentShare.toFixed(1)}%
                </span>

                {/* Delta Pill */}
                <div
                  style={{
                    opacity: deltaReveal,
                    transform: `translateY(${(1 - deltaReveal) * 6}px)`,
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: isExpanding
                      ? 'rgba(200, 16, 46, 0.12)'
                      : 'rgba(139, 92, 246, 0.12)',
                    border: `1px solid ${isExpanding ? TUE_RED : 'rgba(139, 92, 246, 0.3)'}`,
                    fontSize: 11.5,
                    fontFamily: MONO_FONT,
                    fontWeight: 800,
                    color: isExpanding ? TUE_RED : '#8b5cf6',
                  }}
                >
                  {d.delta} {isExpanding ? 'EXPAND' : 'COMPRESS'}
                </div>
              </div>

              {/* Bar Container */}
              <div
                style={{
                  width: '100%',
                  height: currentBarH,
                  backgroundColor: isExpanding ? TUE_RED : '#8b5cf6',
                  borderRadius: '10px 10px 4px 4px',
                  boxShadow: isExpanding
                    ? '0 10px 28px rgba(200, 16, 46, 0.28)'
                    : '0 6px 18px rgba(139, 92, 246, 0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Visual indicator inside bar */}
                <span
                  style={{
                    color: '#ffffff',
                    fontFamily: MONO_FONT,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {isExpanding ? 'BURST' : 'SPARSE'}
                </span>
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
                    color: isExpanding ? TUE_RED : MUTED_TEXT,
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
