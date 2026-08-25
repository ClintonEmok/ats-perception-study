import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  DARK_TEXT,
  MUTED_TEXT,
  TIMELINE_WIDTH,
  TUE_RED,
  UNIFORM_DURATIONS,
  UNIFORM_TIME_LABELS,
  WANG_DURATIONS,
  WANG_SLICE_NAMES,
} from './data';
import { NetworkGraphCard } from './NetworkGraphCard';
import { WangTimeline } from './WangTimeline';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const WangGraphAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 330 (11.0s) for 100% static hold for the remainder
  const effectiveFrame = Math.min(frame, 330);

  // 1. Boundary transformation (Frames 60 to 180 / 2.0s to 6.0s)
  const transformationProgress = interpolate(effectiveFrame, [60, 180], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // 2. Title & Citation entrance (Frames 10 to 45 / 0.3s to 1.5s)
  const titleSpring = spring({
    frame: effectiveFrame - 10,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1], clamp);
  const titleY = interpolate(titleSpring, [0, 1], [-12, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        fontFamily: FONT_FAMILY,
        padding: '36px 80px',
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER: TITLE & CITATION                      */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          zIndex: 20,
          marginBottom: 16,
          borderBottom: '1.5px solid rgba(15, 23, 42, 0.08)',
          paddingBottom: 14,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 900,
              color: DARK_TEXT,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            NON-UNIFORM TIMESLICING
          </h1>
          <div
            style={{
              marginTop: 4,
              fontSize: 15,
              fontWeight: 650,
              color: MUTED_TEXT,
            }}
          >
            Balancing visual complexity across dynamic graph snapshots
          </div>
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: DARK_TEXT,
            fontFamily: MONO_FONT,
            backgroundColor: 'rgba(15, 23, 42, 0.06)',
            padding: '6px 14px',
            borderRadius: 8,
          }}
        >
          Wang et al. (2019) · IEEE VIS
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. THE HERO NON-UNIFORM TIMELINE                     */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          width: TIMELINE_WIDTH,
          zIndex: 10,
          marginBottom: 20,
        }}
      >
        <WangTimeline
          progress={transformationProgress}
          width={TIMELINE_WIDTH}
          height={140}
          baselineY={70}
          eventDotSize={20}
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. RESULTING 5 LARGE DYNAMIC GRAPH SNAPSHOTS         */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          width: TIMELINE_WIDTH,
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Subheader Callout */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 850,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                padding: '4px 10px',
                borderRadius: 6,
              }}
            >
              GRAPH SNAPSHOTS (SMALL MULTIPLES)
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 650,
                color: MUTED_TEXT,
              }}
            >
              {transformationProgress < 0.5
                ? 'Uniform Timeslicing: Extreme clutter/hairball in burst interval 3'
                : 'Non-Uniform Timeslicing: Equal visual complexity across all 5 snapshots (~13 edges each)'}
            </span>
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 750,
              fontFamily: MONO_FONT,
              color: transformationProgress > 0.5 ? '#16a34a' : TUE_RED,
            }}
          >
            {transformationProgress > 0.5
              ? '✓ Visual Complexity Equalized'
              : '⚠️ High Variance in Visual Complexity'}
          </div>
        </div>

        {/* 5 Large Network Graph Cards (Height 560px) */}
        <div
          style={{
            display: 'flex',
            gap: 18,
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          {[0, 1, 2, 3, 4].map((idx) => {
            const uRange = `${UNIFORM_TIME_LABELS[idx]} – ${UNIFORM_TIME_LABELS[idx + 1]}`;
            const wRange = WANG_SLICE_NAMES[idx];
            const timeRange = transformationProgress > 0.65 ? wRange : uRange;

            const uDur = UNIFORM_DURATIONS[idx];
            const wDur = WANG_DURATIONS[idx];
            const duration = transformationProgress > 0.65 ? wDur : uDur;

            return (
              <NetworkGraphCard
                key={`graph-card-${idx}`}
                sliceIndex={idx}
                progress={transformationProgress}
                timeRange={timeRange}
                duration={duration}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
