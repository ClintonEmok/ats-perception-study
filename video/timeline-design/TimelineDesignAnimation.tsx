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
  // 1. CHOREOGRAPHY TIMELINE (30 fps, 1800 frames / 60s)
  // ==========================================
  // Phase 1 (0:00 - 0:03 / Frames 0-90): Overview Baseline
  // Phase 2 (0:03 - 0:06 / Frames 90-180): Select July in Overview
  // Phase 3 (0:06 - 0:10 / Frames 180-300): Temporal Detail Emergence (Uniform 31 Days)
  // Phase 4 (0:10 - 0:14 / Frames 300-420): DBTA Reapplication (Density-scaled morph)
  // Phase 5 (0:14 - 0:18 / Frames 420-540): Recomposition into Anatomy & Callout Entrance
  // Phase 6 (0:18 - 1:00 / Frames 540-1800): Living Anatomy View with Ambient Motion

  // Phase 2: Selection Progress (0 -> 1 between 90 and 165)
  const selectionProgress = interpolate(frame, [90, 165], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Phase 3: Detail Reveal (0 -> 1 between 180 and 260)
  const detailRevealProgress = interpolate(frame, [180, 260], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Phase 4: DBTA Morph Progress (0 -> 1 between 300 and 400)
  const dbtaProgress = interpolate(frame, [300, 400], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Phase 5: Recomposition & Anatomy Callouts (0 -> 1 between 440 and 540)
  const anatomyProgress = interpolate(frame, [440, 530], [0, 1], {
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
  // In Phase 1 & 2: centered at y = 380
  // In Phase 3..6: lifts to y = 220
  const overviewY = interpolate(frame, [170, 250], [360, 220], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  // Projection trapezoid connector opacity (fades in as detail emerges)
  const connectorOpacity = interpolate(frame, [190, 260], [0, 0.75], clamp);

  // Bottom Takeaway Bar entrance during Anatomy Phase
  const takeawayOpacity = interpolate(frame, [530, 580], [0, 1], clamp);

  // Dynamic Phase Status Label
  let phaseStatusText = 'PHASE 1 · FULL TEMPORAL OVERVIEW';
  if (frame >= 540) {
    phaseStatusText = 'ANATOMY OF THE TIMELINE · DESIGN RATIONALE';
  } else if (frame >= 420) {
    phaseStatusText = 'TRANSITIONING TO ANATOMY VIEW...';
  } else if (frame >= 300) {
    phaseStatusText = 'PHASE 4 · DBTA DENSITY-SCALED REALLOCATION';
  } else if (frame >= 180) {
    phaseStatusText = 'PHASE 3 · TEMPORAL DETAIL ADAPTATION (MONTH → DAYS)';
  } else if (frame >= 90) {
    phaseStatusText = 'PHASE 2 · TEMPORAL SELECTION IN CONTEXT (JULY)';
  }

  // July brush coordinates for SVG connector trapezoid:
  // July is 50% to 58.333% of timeline width (1320px) -> Left: 960px, Right: 1070px
  const brushTopLeftX = TIMELINE_LEFT + TIMELINE_WIDTH * 0.5;
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
            {frame < 440 ? 'Timeline Design — Overview to Selection' : 'Timeline Design'}
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
              Moving from a broad temporal overview to a selected domain of interest,
              adapting temporal granularity and visual space.
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
          isAnatomyPhase={isAnatomyPhase}
        />
      </div>

      {/* ==================================================== */}
      {/* 5. ANATOMY CALLOUTS (5 Cards & SVG Leader Lines)      */}
      {/* ==================================================== */}
      <AnatomyCallouts progress={anatomyProgress} />

      {/* ==================================================== */}
      {/* 6. BOTTOM CORE TAKEAWAY BANNER (Phase 6)             */}
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
            CORE TAKEAWAY
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 650, color: THEME.navy }}>
            The timeline is not just a histogram. It is the temporal navigation and focus mechanism of the system.
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
            <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 600 }}>Overview Context</span>
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
            <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 600 }}>Density-Scaled Space</span>
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
            <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 600 }}>Clock References</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
