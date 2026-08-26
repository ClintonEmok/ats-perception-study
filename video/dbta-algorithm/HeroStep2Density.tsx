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
  const maxPlotH = stageH - 180;

  // Visual pacing beats:
  // Beat 1 (0.05..0.45): Histogram bars rise to measured event counts
  // Beat 2 (0.45..0.75): Peak frequency pulse badge
  // Beat 3 (0.75..1.00): Stable hold
  const barsRise = interpolate(progress, [0.08, 0.48], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  const peakPulse = interpolate(progress, [0.45, 0.65, 0.85, 1.0], [0, 1, 0.95, 1], clamp);

  const binData = [
    { label: '12:00–13:00', count: 2, isBurst: false },
    { label: '13:00–14:00', count: 6, isBurst: false },
    { label: '14:00–15:00', count: 48, isBurst: true },
    { label: '15:00–16:00', count: 2, isBurst: false },
    { label: '16:00–17:00', count: 7, isBurst: false },
  ];

  const maxCount = 48;

  // Envelope curve points through the tops of the bars
  const envelopePoints = binData.map((d, i) => {
    const cx = axisMargin + (i + 0.5) * sliceW;
    const h = (d.count / maxCount) * maxPlotH * barsRise;
    const cy = axisY - h;
    return { x: cx, y: cy };
  });

  const pathD = `M ${axisMargin} ${axisY} ` +
    `Q ${envelopePoints[0].x} ${envelopePoints[0].y}, ${(envelopePoints[0].x + envelopePoints[1].x) / 2} ${(envelopePoints[0].y + envelopePoints[1].y) / 2} ` +
    `Q ${envelopePoints[1].x} ${envelopePoints[1].y}, ${(envelopePoints[1].x + envelopePoints[2].x) / 2} ${envelopePoints[2].y + 60 * (1 - barsRise)} ` +
    `Q ${envelopePoints[2].x} ${envelopePoints[2].y}, ${(envelopePoints[2].x + envelopePoints[3].x) / 2} ${envelopePoints[2].y + 60 * (1 - barsRise)} ` +
    `Q ${envelopePoints[3].x} ${envelopePoints[3].y}, ${(envelopePoints[3].x + envelopePoints[4].x) / 2} ${(envelopePoints[3].y + envelopePoints[4].y) / 2} ` +
    `Q ${envelopePoints[4].x} ${envelopePoints[4].y}, ${axisMargin + axisW} ${axisY}`;

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
              backgroundColor: 'rgba(200, 16, 46, 0.1)',
              color: TUE_RED,
              fontFamily: MONO_FONT,
              fontSize: 14,
              fontWeight: 800,
              border: `1px solid rgba(200, 16, 46, 0.25)`,
            }}
          >
            {'N_i = Count(Δt_i)'}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Hourly Event Frequency Quantification
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
        {/* SVG Activity Envelope Layer */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          <defs>
            <linearGradient id="freqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TUE_RED} stopOpacity={0.25 * barsRise} />
              <stop offset="100%" stopColor={TUE_RED} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <path d={areaD} fill="url(#freqGrad)" />
          <path
            d={pathD}
            fill="none"
            stroke={TUE_RED}
            strokeWidth={3}
            strokeLinecap="round"
            strokeOpacity={0.85 * barsRise}
          />
        </svg>

        {/* 5 Hourly Frequency Columns */}
        {binData.map((d, i) => {
          const colX = axisMargin + i * sliceW;
          const barH = (d.count / maxCount) * maxPlotH * barsRise;
          const isBurst = d.isBurst;

          return (
            <div
              key={`freq-bin-${i}`}
              style={{
                position: 'absolute',
                left: colX + 16,
                width: sliceW - 32,
                bottom: 70,
                height: barH,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                zIndex: 10,
              }}
            >
              {/* Count Value Badge above bar */}
              <div
                style={{
                  position: 'absolute',
                  top: -30,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  opacity: barsRise,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: isBurst ? 18 : 14,
                    fontWeight: 900,
                    color: isBurst ? TUE_RED : DARK_TEXT,
                  }}
                >
                  {Math.round(d.count * barsRise)}
                </span>
                <span
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 11,
                    fontWeight: 700,
                    color: isBurst ? TUE_RED : MUTED_TEXT,
                  }}
                >
                  ev
                </span>
              </div>

              {/* Bar Fill */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: isBurst ? TUE_RED : 'rgba(71, 85, 105, 0.15)',
                  borderRadius: '6px 6px 0 0',
                  border: isBurst ? `1.5px solid ${TUE_RED}` : '1px solid rgba(71, 85, 105, 0.25)',
                  boxShadow: isBurst ? '0 8px 24px rgba(200, 16, 46, 0.25)' : 'none',
                }}
              />

              {/* Bottom Interval Label */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -46,
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
              </div>
            </div>
          );
        })}

        {/* Peak Frequency Callout Tag */}
        {peakPulse > 0 && (
          <div
            style={{
              position: 'absolute',
              left: axisMargin + 2.5 * sliceW,
              top: axisY - maxPlotH * barsRise - 60,
              transform: `translateX(-50%) scale(${peakPulse})`,
              opacity: peakPulse,
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: '#ffffff',
              border: `2px solid ${TUE_RED}`,
              boxShadow: '0 6px 20px rgba(200, 16, 46, 0.2)',
              zIndex: 25,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TUE_RED }} />
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 13,
                fontWeight: 900,
                color: TUE_RED,
                letterSpacing: 0.5,
              }}
            >
              PEAK ACTIVITY N_max = 48 events/hr
            </span>
          </div>
        )}

        {/* Baseline Bar */}
        <div
          style={{
            position: 'absolute',
            left: axisMargin,
            width: axisW,
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
