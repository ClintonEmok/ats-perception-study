import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FONT_FAMILY } from '../theme';
import {
  DARK_TEXT,
  MUTED_TEXT,
  TIMELINE_WIDTH,
  TIMELINE_X,
  TIMELINE_Y,
} from './data';
import { WangTimeline } from './WangTimeline';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const WangAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 330 (11.0s) for 100% static hold for the remainder
  const effectiveFrame = Math.min(frame, 330);

  // 1. Boundary transformation (Frames 60 to 180 / 2.0s to 6.0s)
  const transformationProgress = interpolate(effectiveFrame, [60, 180], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // 2. Title & Citation entrance (Frames 200 to 260 / 6.7s to 8.7s)
  const titleSpring = spring({
    frame: effectiveFrame - 200,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1], clamp);
  const titleY = interpolate(titleSpring, [0, 1], [-16, 0], clamp);

  const citationSpring = spring({
    frame: effectiveFrame - 215,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const citationOpacity = interpolate(citationSpring, [0, 1], [0, 1], clamp);
  const citationY = interpolate(citationSpring, [0, 1], [16, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. TOP TITLE (Fades in above timeline)               */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          top: 320,
          left: '50%',
          transform: `translateX(-50%) translateY(${titleY}px)`,
          textAlign: 'center',
          opacity: titleOpacity,
          pointerEvents: 'none',
          zIndex: 20,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 48,
            fontWeight: 900,
            color: DARK_TEXT,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
          }}
        >
          NON-UNIFORM TIMESLICING
        </h1>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. THE HERO NON-UNIFORM TIMELINE                     */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: TIMELINE_X,
          top: TIMELINE_Y - 70,
          width: TIMELINE_WIDTH,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <WangTimeline
          progress={transformationProgress}
          width={TIMELINE_WIDTH}
          height={220}
          baselineY={110}
          eventDotSize={22}
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. PROVENANCE CITATION (Fades in below timeline)     */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          top: 730,
          left: '50%',
          transform: `translateX(-50%) translateY(${citationY}px)`,
          textAlign: 'center',
          opacity: citationOpacity,
          pointerEvents: 'none',
          zIndex: 20,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: MUTED_TEXT,
            fontFamily: FONT_FAMILY,
            letterSpacing: 1.2,
          }}
        >
          Wang et al. (2019) · Ponciano et al. (2021)
        </div>
      </div>
    </AbsoluteFill>
  );
};
