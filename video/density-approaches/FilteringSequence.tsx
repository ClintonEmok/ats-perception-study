import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_FAMILY } from '../theme';
import {
  DARK_TEXT,
  FILTER_PRESERVED_IDS,
  HOURLY_INTERVALS,
  TIMELINE_WIDTH,
  TIMELINE_X,
  TIMELINE_Y,
} from './data';
import { TimelineTrack } from './TimelineTrack';

interface FilteringSequenceProps {
  startFrame: number; // e.g. 180
  endFrame: number; // e.g. 315
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const FilteringSequence: React.FC<FilteringSequenceProps> = ({
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

  // 2. Filter transformation (frames 15 to 55 / ~1.3 seconds)
  const filterSpring = spring({
    frame: localFrame - 15,
    fps,
    config: { damping: 20, stiffness: 70 },
  });
  const filterProgress = Math.max(0, Math.min(1, filterSpring));

  // 3. Reset / Fade transition (frames 105 to 135)
  const exitOpacity = interpolate(
    localFrame,
    [endFrame - startFrame - 25, endFrame - startFrame],
    [1, 0],
    clamp
  );

  const totalOpacity = labelOpacity * exitOpacity;

  // Excluded dots calculation (fade out to 0)
  const allEvents = HOURLY_INTERVALS.flatMap((interval) => interval.events);
  const excludedEventIds = new Set(
    allEvents
      .filter((e) => !FILTER_PRESERVED_IDS.has(e.id))
      .map((e) => e.id)
  );

  const excludedDotOpacity = interpolate(filterProgress, [0, 1], [1, 0], clamp);

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
          FILTER
        </h2>
      </div>

      {/* Main Timeline Track with Filtered Subset Remaining */}
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
          fadedEventIds={excludedEventIds}
          fadedOpacity={excludedDotOpacity}
          eventDotSize={24}
          showLabels={true}
          showTicks={true}
          highlightBurst={true}
        />
      </div>
    </div>
  );
};
