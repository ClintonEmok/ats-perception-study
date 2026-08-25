import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_FAMILY } from '../theme';
import {
  DARK_TEXT,
  HISTOGRAM_BINS,
  HOURLY_INTERVALS,
  TIMELINE_WIDTH,
  TIMELINE_X,
  TIMELINE_Y,
  TUE_RED,
} from './data';
import { TimelineTrack } from './TimelineTrack';

interface AggregationSequenceProps {
  startFrame: number; // e.g. 30
  endFrame: number; // e.g. 165
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const AggregationSequence: React.FC<AggregationSequenceProps> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame - 5 || frame > endFrame + 15) return null;

  const localFrame = frame - startFrame;

  // 1. Label entrance (frames 0 to 20)
  const labelEntrance = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 140 },
  });
  const labelOpacity = interpolate(labelEntrance, [0, 1], [0, 1], clamp);
  const labelY = interpolate(labelEntrance, [0, 1], [-14, 0], clamp);

  // 2. Bar growth & dot convergence (frames 15 to 65 / ~1.7 seconds)
  const morphProgress = spring({
    frame: localFrame - 15,
    fps,
    config: { damping: 22, stiffness: 55, mass: 1.0 },
  });
  const clampedMorph = Math.max(0, Math.min(1, morphProgress));

  // 3. Reset / Fade transition before next sequence (frames 110 to 135)
  const exitOpacity = interpolate(
    localFrame,
    [endFrame - startFrame - 25, endFrame - startFrame],
    [1, 0],
    clamp
  );

  const totalOpacity = labelOpacity * exitOpacity;

  // Motion interpolations
  const barGrowth = clampedMorph;
  const dotOpacity = interpolate(clampedMorph, [0.15, 0.75], [1, 0], clamp);
  const dotLift = interpolate(clampedMorph, [0, 0.7], [0, -30], clamp);

  const intervalWidth = TIMELINE_WIDTH / 5; // 320px per hour
  const subBinWidth = (intervalWidth - 32) / 3; // ~96px per sub-bin

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: totalOpacity,
        pointerEvents: 'none',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Visual Technique Label (No box, no subtitle) */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          left: '50%',
          transform: `translateX(-50%) translateY(${labelY}px)`,
          textAlign: 'center',
          zIndex: 20,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 48,
            fontWeight: 900,
            color: DARK_TEXT,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          AGGREGATE
        </h2>
      </div>

      {/* Aggregate Density Bars / Bins rising from the baseline */}
      <div
        style={{
          position: 'absolute',
          left: TIMELINE_X,
          top: TIMELINE_Y,
          width: TIMELINE_WIDTH,
          zIndex: 6,
        }}
      >
        {HISTOGRAM_BINS.map((bin, idx) => {
          const binHeight = bin.height * barGrowth;
          const binX =
            bin.intervalIndex * intervalWidth +
            16 +
            bin.subIndex * (subBinWidth + 8);

          return (
            <div
              key={`bin-${idx}`}
              style={{
                position: 'absolute',
                left: binX,
                bottom: 0, // Sits directly on top of the baseline
                width: subBinWidth,
                height: binHeight,
                backgroundColor: bin.isBurst
                  ? TUE_RED
                  : 'rgba(15, 23, 42, 0.75)',
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                opacity: interpolate(barGrowth, [0.05, 1], [0, 1], clamp),
                boxShadow: bin.isBurst
                  ? '0 -4px 16px rgba(200, 16, 46, 0.35)'
                  : '0 -2px 8px rgba(0, 0, 0, 0.15)',
              }}
            />
          );
        })}
      </div>

      {/* Main Timeline Track with Event Dots (fading into the bars) */}
      <div
        style={{
          position: 'absolute',
          left: TIMELINE_X,
          top: TIMELINE_Y - 40,
          width: TIMELINE_WIDTH,
          zIndex: 10,
        }}
      >
        <TimelineTrack
          width={TIMELINE_WIDTH}
          height={100}
          baselineY={40}
          eventYOffset={() => dotLift}
          fadedOpacity={0}
          fadedEventIds={
            dotOpacity < 0.99
              ? new Set(
                  HOURLY_INTERVALS.flatMap((i) => i.events.map((e) => e.id))
                )
              : undefined
          }
          eventDotSize={24}
          showLabels={true}
          showTicks={true}
          highlightBurst={true}
        />
      </div>
    </div>
  );
};
