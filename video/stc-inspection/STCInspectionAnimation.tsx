import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { BottomTimelineDesign } from './BottomTimelineDesign';
import { THEME, TIMELINE_WIDTH } from './data';
import { InspectionCallouts } from './InspectionCallouts';
import { SpaceTimeCubeCanvas } from './SpaceTimeCubeCanvas';
import { WorkflowIndicator } from './WorkflowIndicator';

const bezierEase = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const STCInspectionAnimation: React.FC = () => {
  const frame = useCurrentFrame();

  // ==========================================================
  // PHASE & SCENE CHOREOGRAPHY (1800 Frames / 60s @ 30fps)
  // ==========================================================

  // Scene 1: 0:00–0:03 (0–90f): Temporal Focus Continuity
  // Timeline starts in central focal position and smoothly settles to bottom resting position
  const timelineInitialReveal = interpolate(frame, [0, 20], [0, 1], clamp);
  const timelineSettleProgress = interpolate(frame, [45, 90], [0, 1], {
    easing: bezierEase,
    ...clamp,
  });

  // Timeline position: from center-stage (y=340) to bottom resting position (y=810)
  const timelineTopY = interpolate(timelineSettleProgress, [0, 1], [340, 810]);

  // Scene 2: 0:03–0:07 (90–210f): Flat 2D Chicago Map resolves
  const mapRevealProgress = interpolate(frame, [90, 170], [0, 1], {
    easing: bezierEase,
    ...clamp,
  });

  // Scene 3: 0:07–0:09 (210–270f): Hold flat map, spatial cluster halos appear
  const clusterHaloProgress = interpolate(frame, [210, 250], [0, 1], {
    easing: bezierEase,
    ...clamp,
  });

  // Scene 4: 0:09–0:11 (270–330f): Reveal limitation (temporal collapse on 2D map)
  const collapseRevealProgress = interpolate(frame, [270, 310], [0, 1], {
    easing: bezierEase,
    ...clamp,
  });

  // Scene 5: 0:11–0:16 (330–480f): Hero Unfolding Transition
  // Step 1: Camera tilts from flat 2D (0 deg) to 2.5D oblique (54 deg)
  const tiltProgress = interpolate(frame, [330, 420], [0, 1], {
    easing: bezierEase,
    ...clamp,
  });

  // Step 2 & 3: Vertical time axis rises & DBTA planes separate vertically
  const unfoldProgress = interpolate(frame, [360, 480], [0, 1], {
    easing: bezierEase,
    ...clamp,
  });

  // Scene 7: 0:19–0:55 (570–1650f): 3 Restrained Callouts
  const calloutsProgress = interpolate(frame, [570, 680], [0, 1], {
    easing: bezierEase,
    ...clamp,
  });

  // Dynamic Scene Subtitle / Speaker Cue
  const getSceneNarration = () => {
    if (frame < 90) {
      return {
        label: 'SCENE 1 · CONTINUITY: SELECTED TEMPORAL FOCUS',
        desc: 'We already know which temporal period to investigate (July 31 focus active via DBTA).',
      };
    }
    if (frame < 210) {
      return {
        label: 'SCENE 2 · SPATIAL RESOLUTION: 2D MAP OF INCIDENTS',
        desc: 'Once the temporal focus is selected, where did those events occur geographically?',
      };
    }
    if (frame < 270) {
      return {
        label: 'SCENE 3 · GEOGRAPHIC DISTRIBUTION: DETECTING SPATIAL CLUSTERS',
        desc: 'Selected incidents resolve onto Chicago coordinates: Loop & West Side concentrations.',
      };
    }
    if (frame < 330) {
      return {
        label: 'SCENE 4 · LIMITATION: TEMPORAL ORDER COLLAPSED ON 2D MAP',
        desc: 'On the flat map, temporal sequence is collapsed — the cube unfolds time vertically to show where + when.',
      };
    }
    if (frame < 480) {
      return {
        label: 'SCENE 5 · HERO UNFOLDING: 2D MAP BECOMES DBTA SPACE-TIME CUBE',
        desc: 'Map geometry is preserved on the base plane while time rises vertically with DBTA density room and STKDE hotspot planes.',
      };
    }
    if (frame < 570) {
      return {
        label: 'SCENE 6 · SETTLED PERSPECTIVE: COORDINATED MULTI-VIEW',
        desc: 'The Space-Time Cube establishes multi-view visual coordination with the bottom timeline.',
      };
    }
    return {
      label: 'INSPECTION ANATOMY · SPATIOTEMPORAL COORDINATION',
      desc: 'The Space-Time Cube preserves spatial fidelity (R4) while providing density-scaled room and STKDE hotspot fields to inspect progression.',
    };
  };

  const currentNarration = getSceneNarration();

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: THEME.bg,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Background Subtle Blueprint Grid Pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(15, 23, 42, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* ==================================================== */}
      {/* 1. TOP HEADER & WORKFLOW INDICATOR                   */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          top: 22,
          left: 50,
          right: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 50,
        }}
      >
        {/* Left Header Title & Workflow Stepper */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <WorkflowIndicator />
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: 11,
                fontWeight: 850,
                color: THEME.navy,
                letterSpacing: 1.2,
                opacity: 0.85,
              }}
            >
              {currentNarration.label}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 27,
                fontWeight: 900,
                color: THEME.navy,
                letterSpacing: -0.8,
              }}
            >
              Space–Time Cube — Inspection
            </h1>
          </div>
        </div>

        {/* Right Dynamic Analytical Subtitle */}
        <div
          style={{
            maxWidth: 680,
            textAlign: 'right',
            fontSize: 12.5,
            fontWeight: 650,
            color: THEME.navy,
            lineHeight: 1.4,
            opacity: 0.9,
          }}
        >
          {currentNarration.desc.split('—').map((part, idx, arr) => (
            <span key={idx}>
              {idx > 0 && ' — '}
              {part.includes('DBTA') || part.includes('STKDE') ? (
                <span style={{ color: THEME.tueRed, fontWeight: 800 }}>{part}</span>
              ) : (
                part
              )}
            </span>
          ))}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. HERO SPACE-TIME CUBE & 2D MAP CANVAS              */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 75,
          bottom: 250,
          zIndex: 10,
        }}
      >
        {mapRevealProgress > 0 && (
          <SpaceTimeCubeCanvas
            mapRevealProgress={mapRevealProgress}
            clusterHaloProgress={clusterHaloProgress}
            collapseRevealProgress={collapseRevealProgress}
            tiltProgress={tiltProgress}
            unfoldProgress={unfoldProgress}
          />
        )}
      </div>

      {/* ==================================================== */}
      {/* 3. RESTRAINED INSPECTION CALLOUT CARDS (Scene 7)     */}
      {/* ==================================================== */}
      <InspectionCallouts progress={calloutsProgress} />

      {/* ==================================================== */}
      {/* 4. BOTTOM TIMELINE (video/timeline-design Look)      */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          left: (1920 - TIMELINE_WIDTH) / 2,
          top: timelineTopY,
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        <BottomTimelineDesign revealProgress={timelineInitialReveal} />
      </div>
    </div>
  );
};
