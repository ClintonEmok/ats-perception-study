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
import { AnatomyCallouts } from './AnatomyCallouts';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  THEME,
  TIMELINE_LEFT,
  TIMELINE_WIDTH,
} from './data';
import { DetailTrack } from './DetailTrack';
import { OverviewTrack } from './OverviewTrack';
import { WorkflowIndicator } from './WorkflowIndicator';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const TimelineDesignAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ==========================================
  // 1. EXACT MULTISCALE CHOREOGRAPHY (30 fps, 1800 frames / 60s)
  // ==========================================
  // Scene 1 (0:00 - 0:03 / Frames 0-90): Yearly Overview (12 Months)
  // Scene 2 (0:03 - 0:06 / Frames 90-180): Select Month July [ JUL ]
  // Scene 3 (0:06 - 0:10 / Frames 180-300): Detail Reveals July (31 Days, Uniform Daily)
  // Scene 4 (0:10 - 0:14 / Frames 300-420): DBTA Reapplies (Active days expand, quiet days compress)
  // Scene 5 (0:14 - 0:18 / Frames 420-540): In-situ Granularity Shift (Expanded Day 14 resolves hourly)
  // Scene 6/7 (0:18 - 1:00 / Frames 540-1800): Final Explanatory State & Ambient Motion

  // Scene 2: Selection Progress (0 -> 1 between 90 and 160)
  const selectionProgress = interpolate(frame, [90, 160], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Scene 3: Detail Reveal Progress (0 -> 1 between 180 and 260)
  const detailRevealProgress = interpolate(frame, [180, 260], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Scene 4: DBTA Morph Progress across 31 days (0 -> 1 between 300 and 400)
  const dbtaProgress = interpolate(frame, [300, 400], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Scene 5: In-situ Hourly Granularity Shift in Day 14 (0 -> 1 between 420 and 500)
  const hourlyShiftProgress = interpolate(frame, [420, 500], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Scene 6/7: Callouts Entrance (0 -> 1 between 460 and 540)
  const calloutsProgress = interpolate(frame, [460, 540], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  const isAnatomyPhase = frame >= 540;

  // Header spring entrance
  const headerEntrance = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  // Overview track vertical position:
  // In Scene 1..2 (0..170): centered at y = 360
  // In Scene 3..7 (170..250): lifts to y = 220
  const overviewY = interpolate(frame, [170, 250], [360, 220], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Projection connector trapezoid opacity (fades in as detail emerges in Scene 3)
  const connectorOpacity = interpolate(frame, [190, 260], [0, 0.75], clamp);

  // Bottom Takeaway Bar entrance during Scene 7
  const takeawayOpacity = interpolate(frame, [530, 580], [0, 1], clamp);

  // Dynamic Phase Status Label
  let phaseStatusText = 'SCENE 1 · YEARLY TEMPORAL OVERVIEW (12 MONTHS)';
  if (frame >= 540) {
    phaseStatusText = 'TIMELINE DESIGN · OVERVIEW TO SELECTION';
  } else if (frame >= 420) {
    phaseStatusText = 'SCENE 5 · EXTRA SPACE ENABLES HOURLY GRANULARITY (DAY 14)';
  } else if (frame >= 300) {
    phaseStatusText = 'SCENE 4 · DBTA REDISTRIBUTES SPACE: ACTIVE DAYS EXPAND';
  } else if (frame >= 180) {
    phaseStatusText = 'SCENE 3 · DETAIL TIMELINE REVEALS JULY (31 DAILY INTERVALS)';
  } else if (frame >= 90) {
    phaseStatusText = 'SCENE 2 · SELECTING MONTH DOMAIN OF INTEREST (JULY)';
  }

  // July brush coordinates for SVG connector trapezoid (Month index 6 of 12 = 50% to 58.33%):
  const brushTopLeftX = TIMELINE_LEFT + TIMELINE_WIDTH * (6 / 12);
  const brushTopRightX = TIMELINE_LEFT + TIMELINE_WIDTH * (7 / 12);
  const overviewBottomY = overviewY + 128;
  const detailTopY = 460;
  const detailLeftX = TIMELINE_LEFT;
  const detailRightX = TIMELINE_LEFT + TIMELINE_WIDTH;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        fontFamily: FONT_FAMILY,
        color: THEME.textPrimary,
      }}
    >
      {/* Subtle Background Construction Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(15, 23, 42, 0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.028) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />

      {/* ==================================================== */}
      {/* 1. TOP HEADER (Workflow Indicator + Title)            */}
      {/* ==================================================== */}
      <header
        style={{
          width: 1820,
          marginTop: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          opacity: headerEntrance,
          transform: `translateY(${(1 - headerEntrance) * -16}px)`,
          zIndex: 50,
        }}
      >
        <div>
          {/* Workflow indicator: OVERVIEW -> SELECT highlighted */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <WorkflowIndicator />
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10.5,
                fontWeight: 750,
                color: frame >= 540 ? THEME.tueRed : THEME.blue,
                letterSpacing: 1.2,
              }}
            >
              {phaseStatusText}
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: -1.2,
              color: THEME.navy,
              lineHeight: 1.1,
            }}
          >
            Timeline Design — Overview to Selection
          </h1>
        </div>

        {/* Right side subtitle */}
        <div
          style={{
            maxWidth: 680,
            fontSize: 14.5,
            fontWeight: 550,
            color: THEME.textSecondary,
            textAlign: 'right',
            lineHeight: 1.4,
          }}
        >
          {frame < 440 ? (
            <>
              Temporal focus creates room for finer granularity; DBTA then redistributes that room according to activity.
            </>
          ) : (
            <>
              The timeline is not just a histogram — it is the{' '}
              <strong style={{ color: THEME.tueRed, fontWeight: 800 }}>
                temporal navigation and focus mechanism
              </strong>{' '}
              of the coordinated system.
            </>
          )}
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. SVG PROJECTION CONNECTOR TRAPEZOID                 */}
      {/* ==================================================== */}
      {connectorOpacity > 0 && (
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            pointerEvents: 'none',
            zIndex: 15,
            opacity: connectorOpacity,
          }}
        >
          <defs>
            <linearGradient id="projection-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8102E" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Shaded Projection Trapezoid */}
          <polygon
            points={`${brushTopLeftX},${overviewBottomY} ${brushTopRightX},${overviewBottomY} ${detailRightX},${detailTopY} ${detailLeftX},${detailTopY}`}
            fill="url(#projection-grad)"
          />

          {/* Left Guide Projection Line */}
          <line
            x1={brushTopLeftX}
            y1={overviewBottomY}
            x2={detailLeftX}
            y2={detailTopY}
            stroke={THEME.tueRed}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.65}
          />

          {/* Right Guide Projection Line */}
          <line
            x1={brushTopRightX}
            y1={overviewBottomY}
            x2={detailRightX}
            y2={detailTopY}
            stroke={THEME.tueRed}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.65}
          />
        </svg>
      )}

      {/* ==================================================== */}
      {/* 3. OVERVIEW TRACK (Track 1: 12 Months)                */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          left: TIMELINE_LEFT,
          top: overviewY,
          zIndex: 20,
        }}
      >
        <OverviewTrack
          selectionProgress={selectionProgress}
          isAnatomyPhase={isAnatomyPhase}
        />
      </div>

      {/* ==================================================== */}
      {/* 4. DETAIL TRACK (Track 2: 31 Days of July)            */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          left: TIMELINE_LEFT,
          top: 460,
          zIndex: 20,
        }}
      >
        <DetailTrack
          revealProgress={detailRevealProgress}
          dbtaProgress={dbtaProgress}
          hourlyShiftProgress={hourlyShiftProgress}
          isAnatomyPhase={isAnatomyPhase}
        />
      </div>

      {/* ==================================================== */}
      {/* 5. RESTRAINED ANATOMY CALLOUTS (5 Cards & SVG Leaders)*/}
      {/* ==================================================== */}
      <AnatomyCallouts progress={calloutsProgress} />

      {/* ==================================================== */}
      {/* 6. BOTTOM CORE PRINCIPLE BANNER (Scene 7)             */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          left: TIMELINE_LEFT,
          width: TIMELINE_WIDTH,
          bottom: 40,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          border: '1px solid rgba(15, 23, 42, 0.1)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: takeawayOpacity,
          transform: `translateY(${(1 - takeawayOpacity) * 8}px)`,
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              backgroundColor: THEME.tueRedBg,
              border: `1px solid ${THEME.tueRedBorder}`,
              fontFamily: MONO_FONT,
              fontSize: 10,
              fontWeight: 850,
              color: THEME.tueRed,
              letterSpacing: 1.2,
            }}
          >
            CORE PRINCIPLE
          </div>
          <span style={{ fontSize: 13, fontWeight: 650, color: THEME.navy }}>
            Temporal focus creates room for finer granularity; DBTA redistributes that room according to activity.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10,
                fontWeight: 800,
                color: '#0f172a',
                backgroundColor: 'rgba(15, 23, 42, 0.08)',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              R5a
            </span>
            <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 600 }}>Overview + Focus</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10,
                fontWeight: 800,
                color: THEME.violet,
                backgroundColor: THEME.violetBg,
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              R1
            </span>
            <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 600 }}>Activity Allocation</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10,
                fontWeight: 800,
                color: THEME.emerald,
                backgroundColor: THEME.emeraldBg,
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              R3
            </span>
            <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 600 }}>Calendar & Clocks</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
