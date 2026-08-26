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
  const padX = 70;
  const stageW = width - 2 * padX;
  const stageH = height - 100;

  // Timeline geometry
  const timelinePadX = 80;
  const timelineW = stageW - 2 * timelinePadX;
  const sliceW = timelineW / 5;
  const axisY = stageH / 2 + 30;

  // Visual pacing beats:
  // Beat 1 (0.00..0.30): Uniform hourly bin dividers drop in
  // Beat 2 (0.30..0.65): Hourly bin badges reveal event counts per bin
  // Beat 3 (0.65..1.00): Burst interval highlight (14:00–15:00)
  const ticksEntrance = interpolate(progress, [0.05, 0.35], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const cardsEntrance = interpolate(progress, [0.35, 0.65], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const burstHighlight = interpolate(progress, [0.65, 0.85], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const intervals = [
    { label: '12:00–13:00', start: '12:00', events: 2, isBurst: false, index: 0 },
    { label: '13:00–14:00', start: '13:00', events: 6, isBurst: false, index: 1 },
    {
      label: '14:00–15:00',
      start: '14:00',
      events: 48,
      isBurst: true,
      index: 2,
      note: 'BURST BUCKET',
    },
    { label: '15:00–16:00', start: '15:00', events: 2, isBurst: false, index: 3 },
    { label: '16:00–17:00', start: '16:00', events: 7, isBurst: false, index: 4 },
  ];

  const ticks = [
    { label: '12:00', fraction: 0 },
    { label: '13:00', fraction: 0.2 },
    { label: '14:00', fraction: 0.4 },
    { label: '15:00', fraction: 0.6 },
    { label: '16:00', fraction: 0.8 },
    { label: '17:00', fraction: 1.0 },
  ];

  const burstX = timelinePadX + 2 * sliceW;

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
            {'Δt_i = [t_i, t_{i+1}], Δt = 1h'}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Uniform Temporal Discretization (Hourly Bins)
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
        {/* Burst Interval Highlighting Box */}
        <div
          style={{
            position: 'absolute',
            left: burstX,
            width: sliceW,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(200, 16, 46, 0.04)',
            borderLeft: `1.5px dashed rgba(200, 16, 46, ${0.5 * burstHighlight})`,
            borderRight: `1.5px dashed rgba(200, 16, 46, ${0.5 * burstHighlight})`,
            opacity: burstHighlight,
            zIndex: 2,
          }}
        />

        {/* Top Interval Badges */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: timelinePadX,
            width: timelineW,
            display: 'flex',
            justifyContent: 'space-between',
            zIndex: 20,
          }}
        >
          {intervals.map((inv, idx) => {
            const isBurst = inv.isBurst;
            const badgeOpacity = cardsEntrance;

            return (
              <div
                key={`badge-${idx}`}
                style={{
                  width: sliceW - 24,
                  opacity: badgeOpacity,
                  transform: `translateY(${(1 - badgeOpacity) * 10}px)`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 999,
                    backgroundColor: isBurst
                      ? 'rgba(200, 16, 46, 0.1)'
                      : 'rgba(15, 23, 42, 0.05)',
                    border: `1.5px solid ${isBurst ? TUE_RED : 'rgba(15, 23, 42, 0.12)'}`,
                    boxShadow: isBurst ? '0 4px 14px rgba(200, 16, 46, 0.18)' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 12,
                      fontWeight: 800,
                      color: isBurst ? TUE_RED : DARK_TEXT,
                    }}
                  >
                    {inv.label}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 11,
                      fontWeight: 800,
                      backgroundColor: isBurst ? TUE_RED : '#0f172a',
                      color: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: 999,
                    }}
                  >
                    {inv.events} events
                  </span>
                </div>

                {isBurst && (
                  <div
                    style={{
                      opacity: burstHighlight,
                      fontFamily: MONO_FONT,
                      fontSize: 11,
                      fontWeight: 900,
                      color: TUE_RED,
                      letterSpacing: 0.5,
                    }}
                  >
                    PEAK DENSITY BUCKET
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Continuous Baseline Axis */}
        <div
          style={{
            position: 'absolute',
            left: timelinePadX,
            top: axisY,
            width: timelineW,
            height: 3.5,
            backgroundColor: '#0f172a',
            zIndex: 5,
          }}
        />

        {/* 6 Hourly Grid Ticks */}
        {ticks.map((t, i) => {
          const x = timelinePadX + t.fraction * timelineW;
          const tickH = 26;

          return (
            <div
              key={`tick-${i}`}
              style={{
                position: 'absolute',
                left: x,
                top: axisY - tickH / 2 + 2,
                width: 2.5,
                height: tickH * ticksEntrance,
                backgroundColor: '#0f172a',
                zIndex: 10,
              }}
            >
              {/* Hourly Time Label */}
              <span
                style={{
                  position: 'absolute',
                  top: tickH + 10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontFamily: MONO_FONT,
                  fontSize: 14,
                  fontWeight: 800,
                  color: DARK_TEXT,
                  opacity: ticksEntrance,
                }}
              >
                {t.label}
              </span>
            </div>
          );
        })}

        {/* Event dots inside intervals */}
        {/* Interval 0: 2 dots */}
        <div
          style={{
            position: 'absolute',
            left: timelinePadX + 0.3 * sliceW - 5,
            top: axisY - 3,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#0f172a',
            zIndex: 8,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: timelinePadX + 0.7 * sliceW - 5,
            top: axisY - 3,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#0f172a',
            zIndex: 8,
          }}
        />

        {/* Interval 1: 6 dots */}
        {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((f, idx) => (
          <div
            key={`dot-1-${idx}`}
            style={{
              position: 'absolute',
              left: timelinePadX + sliceW + f * sliceW - 5,
              top: axisY - 3,
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#0f172a',
              zIndex: 8,
            }}
          />
        ))}

        {/* Interval 2: 48 burst dots */}
        {Array.from({ length: 48 }).map((_, idx) => {
          const dotX = burstX + 6 + (idx / 47) * (sliceW - 12);
          return (
            <div
              key={`burst-dot-${idx}`}
              style={{
                position: 'absolute',
                left: dotX - 5,
                top: axisY - 3,
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: TUE_RED,
                border: '1px solid #ffffff',
                boxShadow: '0 0 6px rgba(200, 16, 46, 0.4)',
                zIndex: 12,
              }}
            />
          );
        })}

        {/* Interval 3: 2 dots */}
        <div
          style={{
            position: 'absolute',
            left: timelinePadX + 3.35 * sliceW - 5,
            top: axisY - 3,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#0f172a',
            zIndex: 8,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: timelinePadX + 3.75 * sliceW - 5,
            top: axisY - 3,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#0f172a',
            zIndex: 8,
          }}
        />

        {/* Interval 4: 7 dots */}
        {[0.12, 0.25, 0.42, 0.58, 0.72, 0.85, 0.95].map((f, idx) => (
          <div
            key={`dot-4-${idx}`}
            style={{
              position: 'absolute',
              left: timelinePadX + 4 * sliceW + f * sliceW - 5,
              top: axisY - 3,
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#0f172a',
              zIndex: 8,
            }}
          />
        ))}
      </div>
    </div>
  );
};
