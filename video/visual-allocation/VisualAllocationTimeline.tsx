import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  AXIS_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  HOURLY_TIME_POINTS,
  NON_UNIFORM_BOUNDARIES,
  TUE_RED,
  UNIFORM_BOUNDARIES,
} from './data';

interface VisualAllocationTimelineProps {
  progress: number; // 0 (uniform) -> 1 (non-uniform)
  boundaryEmphasis?: number; // 0 -> 1 subtle prominence before moving
  width: number; // e.g. 1600
  height?: number; // e.g. 120
  baselineY?: number; // e.g. 40
  eventDotSize?: number; // e.g. 22
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const VisualAllocationTimeline: React.FC<VisualAllocationTimelineProps> = ({
  progress,
  boundaryEmphasis = 0,
  width,
  height = 120,
  baselineY = 40,
  eventDotSize = 22,
}) => {
  // Current position of each boundary tick
  const currentBoundaries = UNIFORM_BOUNDARIES.map((uniformX, idx) => {
    const nonUniformX = NON_UNIFORM_BOUNDARIES[idx];
    return interpolate(progress, [0, 1], [uniformX, nonUniformX], clamp);
  });

  // Tick visual dimensions
  const baseTickHeight = 44;
  const emphasizedTickHeight = 52;
  const tickHeight = interpolate(
    boundaryEmphasis,
    [0, 1],
    [baseTickHeight, emphasizedTickHeight],
    clamp
  );
  const tickWidth = interpolate(boundaryEmphasis, [0, 1], [4, 5], clamp);

  // Red to dark color transition for burst events in interval 2
  const redToDark = interpolate(progress, [0.3, 0.9], [0, 1], clamp);

  // Color helper: interpolate RGB between TU/e Red (#C8102E = 200, 16, 46) and Dark Text (#0f172a = 15, 23, 42)
  const burstR = Math.round(interpolate(redToDark, [0, 1], [200, 15], clamp));
  const burstG = Math.round(interpolate(redToDark, [0, 1], [16, 23], clamp));
  const burstB = Math.round(interpolate(redToDark, [0, 1], [46, 42], clamp));
  const burstColor = `rgb(${burstR}, ${burstG}, ${burstB})`;

  const allEvents = HOURLY_INTERVALS.flatMap((interval) => interval.events);

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        fontFamily: FONT_FAMILY,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {/* 1. Horizontal Baseline Axis Bar (Total width is strictly constant) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: baselineY,
          height: 5,
          backgroundColor: AXIS_COLOR,
          transform: 'translateY(-50%)',
          zIndex: 1,
          borderRadius: 2.5,
        }}
      />

      {/* 2. Boundary Ticks & Moving Time Labels */}
      {currentBoundaries.map((boundaryX, idx) => {
        const timeLabel = HOURLY_TIME_POINTS[idx];

        return (
          <React.Fragment key={`boundary-${idx}`}>
            {/* Vertical Tick Mark */}
            <div
              style={{
                position: 'absolute',
                left: boundaryX,
                top: baselineY,
                width: tickWidth,
                height: tickHeight,
                backgroundColor: AXIS_COLOR,
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                borderRadius: 1.5,
                transition: 'background-color 0.2s ease',
              }}
            />

            {/* Time Label (Moves along with its boundary) */}
            <div
              style={{
                position: 'absolute',
                left: boundaryX,
                top: baselineY + tickHeight / 2 + 10,
                transform: 'translateX(-50%)',
                fontSize: 24,
                fontFamily: MONO_FONT,
                fontWeight: 850,
                color: DARK_TEXT,
                letterSpacing: -0.4,
                whiteSpace: 'nowrap',
              }}
            >
              {timeLabel}
            </div>
          </React.Fragment>
        );
      })}

      {/* 3. Event Marks (Moving mathematically with their slice) */}
      {allEvents.map((event) => {
        const intervalIdx = event.intervalIndex;
        const leftBoundary = currentBoundaries[intervalIdx];
        const rightBoundary = currentBoundaries[intervalIdx + 1];
        const sliceWidth = rightBoundary - leftBoundary;

        // Position event proportionally within its moving slice
        const eventX = leftBoundary + (event.xPercent / 100) * sliceWidth;
        const eventY = baselineY;

        const isBurst = intervalIdx === 2;
        const dotColor = isBurst ? burstColor : DARK_TEXT;

        // Shadow transitions from red glow to neutral dark drop-shadow
        const shadowGlow = isBurst
          ? `0 2px 8px rgba(${burstR}, ${burstG}, ${burstB}, ${0.4 - redToDark * 0.15})`
          : '0 2px 6px rgba(0, 0, 0, 0.25)';

        return (
          <div
            key={event.id}
            style={{
              position: 'absolute',
              left: eventX,
              top: eventY,
              transform: 'translate(-50%, -50%)',
              width: eventDotSize,
              height: eventDotSize,
              borderRadius: '50%',
              backgroundColor: dotColor,
              border: '3px solid #ffffff',
              boxShadow: shadowGlow,
              zIndex: isBurst ? 5 : 4,
            }}
          />
        );
      })}
    </div>
  );
};
