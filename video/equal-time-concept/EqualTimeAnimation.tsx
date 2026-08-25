import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ChicagoMapLibre } from './ChicagoMapLibre';
import { MorphingEventMarks } from './MorphingEventMarks';
import { TimelineAxis } from './TimelineAxis';

const TIMELINE_WIDTH = 1680;
const MAP_WIDTH = 1680; // Viewport-filling Map width
const MAP_HEIGHT = 960; // Viewport-filling Map height

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const EqualTimeAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 345 for 100% static hold starting at 11.5 seconds
  const effectiveFrame = Math.min(frame, 345);

  // 1. Initial Map entrance (frames 0–30 / 0.0s–1.0s)
  const mapEntrance = spring({
    frame: effectiveFrame - 2,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const mapEntranceOpacity = interpolate(mapEntrance, [0, 1], [0, 1], clamp);

  // 2. Direct, seamless morph starting right after points complete on the map (frames 222–315 / 7.4s–10.5s)
  const morphProgress = spring({
    frame: effectiveFrame - 222,
    fps,
    config: { damping: 22, stiffness: 42, mass: 1.15 },
  });

  const clampedMorph = Math.max(0, Math.min(1, morphProgress));

  // Map smoothly fades out as morph begins
  const mapOpacity = interpolate(clampedMorph, [0, 0.55], [1, 0], clamp) * mapEntranceOpacity;
  const mapScale = interpolate(clampedMorph, [0, 1], [1, 0.96], clamp);

  // Timeline axis fades in as morph progresses
  const timelineOpacity = interpolate(clampedMorph, [0.35, 1], [0, 1], clamp);

  const mapBounds = {
    x: (1920 - MAP_WIDTH) / 2, // 120
    y: (1080 - MAP_HEIGHT) / 2, // 60
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  };

  const timelineBounds = {
    x: (1920 - TIMELINE_WIDTH) / 2, // 120
    y: 540 + 25, // Aligned with the center baseline of the TimelineAxis
    width: TIMELINE_WIDTH,
  };

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
      }}
    >
      {/* 1. Glitch-Free Viewport-Filling CARTO Positron Light Map + 77 Community Areas */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${mapScale})`,
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
        }}
      >
        <ChicagoMapLibre
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          opacity={mapOpacity}
        />
      </div>

      {/* 2. 1D Horizontal Timeline Axis (Materializes under the points) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
        }}
      >
        <TimelineAxis
          totalWidth={TIMELINE_WIDTH}
          opacity={timelineOpacity}
        />
      </div>

      {/* 3. Morphing Crime Event Points (Map 2D Space -> 1D Time) */}
      <MorphingEventMarks
        mapBounds={mapBounds}
        timelineBounds={timelineBounds}
        morphProgress={clampedMorph}
      />
    </AbsoluteFill>
  );
};
