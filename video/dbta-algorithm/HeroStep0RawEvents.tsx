import React from 'react';
import { Easing, interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

interface HeroStep0RawEventsProps {
  progress: number; // 0 to 1
  width: number;
  height: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const HeroStep0RawEvents: React.FC<HeroStep0RawEventsProps> = ({
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
  const axisY = stageH / 2 + 30;

  // Visual pacing beats:
  // Beat 1 (0.00..0.25): Continuous axis entrance
  // Beat 2 (0.25..0.65): Raw event dots spawn with continuous timestamps
  // Beat 3 (0.65..1.00): Highlight cluster occlusion zone
  const axisEntrance = interpolate(progress, [0.05, 0.25], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const dotsEntrance = interpolate(progress, [0.2, 0.65], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });

  const clusterHighlight = interpolate(progress, [0.65, 0.85], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  // Generate 65 raw timestamps mapped to [0, 1] relative to [12:00, 17:00] (5 hours total)
  // Interval 1 (12-13, 0.0-0.2): 2 events
  // Interval 2 (13-14, 0.2-0.4): 6 events
  // Interval 3 (14-15, 0.4-0.6): 48 events (Burst cluster)
  // Interval 4 (15-16, 0.6-0.8): 2 events
  // Interval 5 (16-17, 0.8-1.0): 7 events
  const rawEvents = [
    // 12-13
    { t: 0.05, isBurst: false },
    { t: 0.14, isBurst: false },
    // 13-14
    { t: 0.22, isBurst: false },
    { t: 0.27, isBurst: false },
    { t: 0.31, isBurst: false },
    { t: 0.34, isBurst: false },
    { t: 0.37, isBurst: false },
    { t: 0.39, isBurst: false },
    // 14-15 (48 burst events tightly packed)
    ...Array.from({ length: 48 }).map((_, i) => ({
      t: 0.405 + (i / 47) * 0.19,
      isBurst: true,
    })),
    // 15-16
    { t: 0.68, isBurst: false },
    { t: 0.76, isBurst: false },
    // 16-17
    { t: 0.82, isBurst: false },
    { t: 0.85, isBurst: false },
    { t: 0.89, isBurst: false },
    { t: 0.92, isBurst: false },
    { t: 0.94, isBurst: false },
    { t: 0.97, isBurst: false },
    { t: 0.99, isBurst: false },
  ];

  const burstStartX = timelinePadX + 0.4 * timelineW;
  const burstEndX = timelinePadX + 0.6 * timelineW;

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
              backgroundColor: 'rgba(71, 85, 105, 0.1)',
              color: '#334155',
              fontFamily: MONO_FONT,
              fontSize: 14,
              fontWeight: 800,
              border: '1px solid rgba(71, 85, 105, 0.25)',
            }}
          >
            {'T = {t_1, t_2, ..., t_N}'}
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DARK_TEXT }}>
            Continuous Temporal Event Sequence (Unbinned Timestamps)
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
        {/* Top Info Badges */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 30,
            right: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 20,
          }}
        >
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              backgroundColor: 'rgba(15, 23, 42, 0.05)',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              fontFamily: MONO_FONT,
              fontSize: 13,
              fontWeight: 800,
              color: DARK_TEXT,
            }}
          >
            65 CONTINUOUS CRIME EVENTS
          </div>

          <div
            style={{
              opacity: clusterHighlight,
              transform: `translateY(${(1 - clusterHighlight) * 6}px)`,
              padding: '6px 14px',
              borderRadius: 999,
              backgroundColor: 'rgba(200, 16, 46, 0.1)',
              border: `1px solid ${TUE_RED}`,
              fontFamily: MONO_FONT,
              fontSize: 13,
              fontWeight: 800,
              color: TUE_RED,
            }}
          >
            ⚠️ SEVERE OVERPLOTTING & POINT OCCLUSION
          </div>
        </div>

        {/* Burst Cluster Shaded Region */}
        <div
          style={{
            position: 'absolute',
            left: burstStartX,
            width: burstEndX - burstStartX,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(200, 16, 46, 0.04)',
            borderLeft: `1.5px dashed rgba(200, 16, 46, ${0.4 * clusterHighlight})`,
            borderRight: `1.5px dashed rgba(200, 16, 46, ${0.4 * clusterHighlight})`,
            opacity: clusterHighlight,
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: axisY - 70,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '4px 12px',
              borderRadius: 6,
              backgroundColor: TUE_RED,
              color: '#ffffff',
              fontFamily: MONO_FONT,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            48 EVENTS OVERLAPPING
          </div>
        </div>

        {/* Continuous Baseline Axis */}
        <div
          style={{
            position: 'absolute',
            left: timelinePadX,
            top: axisY,
            width: timelineW * axisEntrance,
            height: 3.5,
            backgroundColor: '#0f172a',
            zIndex: 5,
          }}
        />

        {/* Start & End Domain Labels */}
        <div
          style={{
            position: 'absolute',
            left: timelinePadX,
            top: axisY - 14,
            width: 3.5,
            height: 32,
            backgroundColor: '#0f172a',
            opacity: axisEntrance,
            zIndex: 6,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: MONO_FONT,
              fontSize: 15,
              fontWeight: 800,
              color: DARK_TEXT,
            }}
          >
            12:00
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: timelinePadX + timelineW,
            top: axisY - 14,
            width: 3.5,
            height: 32,
            backgroundColor: '#0f172a',
            opacity: axisEntrance,
            zIndex: 6,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: MONO_FONT,
              fontSize: 15,
              fontWeight: 800,
              color: DARK_TEXT,
            }}
          >
            17:00
          </span>
        </div>

        {/* Continuous Event Dots */}
        {rawEvents.map((ev, i) => {
          const visibleCount = Math.floor(dotsEntrance * rawEvents.length);
          const isVisible = i < visibleCount;
          if (!isVisible) return null;

          const dotX = timelinePadX + ev.t * timelineW;

          return (
            <div
              key={`raw-dot-${i}`}
              style={{
                position: 'absolute',
                left: dotX - 5,
                top: axisY - 3,
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: ev.isBurst ? TUE_RED : '#0f172a',
                border: '1.5px solid #ffffff',
                boxShadow: ev.isBurst
                  ? '0 0 8px rgba(200, 16, 46, 0.4)'
                  : '0 1px 3px rgba(0,0,0,0.2)',
                zIndex: ev.isBurst ? 12 : 8,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
