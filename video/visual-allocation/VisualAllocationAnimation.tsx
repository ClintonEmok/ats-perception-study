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
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DARK_TEXT,
  MUTED_TEXT,
  TIMELINE_WIDTH,
  TIMELINE_X,
  TIMELINE_Y,
} from './data';
import { VisualAllocationTimeline } from './VisualAllocationTimeline';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const VisualAllocationAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 360 (12.0s) for 100% static stillness for the remaining 48s
  const effectiveFrame = Math.min(frame, 360);

  // 1. Boundary Emphasis (Frames 60 to 105 / 2.0s to 3.5s)
  const boundaryEmphasis = interpolate(effectiveFrame, [60, 95], [0, 1], clamp);

  // 2. Boundary Recalibration Movement (Frames 105 to 240 / 3.5s to 8.0s)
  // Use smooth cubic easing for a natural mathematical coordinate transformation
  const transformationProgress = interpolate(effectiveFrame, [105, 240], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // 3. Prior-work Title & Citation Entrance (Frames 300 to 350 / 10.0s to 11.7s)
  const titleEntrance = spring({
    frame: effectiveFrame - 300,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const titleOpacity = interpolate(titleEntrance, [0, 1], [0, 1], clamp);
  const titleY = interpolate(titleEntrance, [0, 1], [-14, 0], clamp);

  const citationEntrance = spring({
    frame: effectiveFrame - 315,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const citationOpacity = interpolate(citationEntrance, [0, 1], [0, 1], clamp);
  const citationY = interpolate(citationEntrance, [0, 1], [14, 0], clamp);

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
      {/* 1. PRIOR-WORK TITLE (Fades in at 0:10 above timeline) */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          top: 360,
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
          VISUAL ALLOCATION
        </h1>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. THE HERO TIMELINE (1600px width centered at Y=540) */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: TIMELINE_X,
          top: TIMELINE_Y - 40,
          width: TIMELINE_WIDTH,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <VisualAllocationTimeline
          progress={transformationProgress}
          boundaryEmphasis={boundaryEmphasis}
          width={TIMELINE_WIDTH}
          height={120}
          baselineY={40}
          eventDotSize={22}
        />
      </div>
    </AbsoluteFill>
  );
};
