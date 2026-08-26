import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  AXIS_COLOR,
  DARK_TEXT,
  DBTA_BOUNDARIES,
  EVENT_COUNTS,
  HOURLY_INTERVALS,
  MUTED_TEXT,
  TIME_LABELS,
  TUE_RED,
  UNIFORM_BOUNDARIES,
} from './data';

interface DBTATimelineProps {
  progress: number; // 0 = uniform, 1 = DBTA allocated
  width: number;
  height?: number;
  baselineY?: number;
  eventDotSize?: number;
  showIntervalLabels?: boolean;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const DBTATimeline: React.FC<DBTATimelineProps> = ({
  progress,
  width,
  height = 140,
  baselineY = 20,
  eventDotSize = 22,
  showIntervalLabels = true,
}) => {
  // Current boundary positions
  const currentBoundaries = UNIFORM_BOUNDARIES.map((uX, idx) => {
    const aX = DBTA_BOUNDARIES[idx];
    return interpolate(progress, [0, 1], [uX, aX], clamp);
  });

  // Flat list of all 65 events with dynamic X coordinates
  const allEvents = HOURLY_INTERVALS.flatMap((interval) => {
    const idx = interval.index;
    return interval.events.map((event) => {
      const leftB = currentBoundaries[idx];
      const rightB = currentBoundaries[idx + 1];
      const sliceW = rightB - leftB;
      const x = leftB + (event.xPercent / 100) * sliceW;
      return {
        ...event,
        x,
      };
    });
  });

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
      {/* ---------------------------------------------------- */}
      {/* 1. HORIZONTAL BASELINE AXIS BAR                      */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: baselineY,
          height: 4,
          backgroundColor: AXIS_COLOR,
          transform: 'translateY(-50%)',
          borderRadius: 2,
          zIndex: 2,
        }}
      />

      {/* ---------------------------------------------------- */}
      {/* 2. BOUNDARY TICKS & TIME LABELS                      */}
      {/* ---------------------------------------------------- */}
      {currentBoundaries.map((bX, idx) => {
        const timeLabel = TIME_LABELS[idx];
        const isEnd = idx === 0 || idx === 5;
        const tickHeight = 26;

        return (
          <React.Fragment key={`tick-${idx}`}>
            {/* Vertical Tick Line */}
            <div
              style={{
                position: 'absolute',
                left: bX,
                top: baselineY,
                width: isEnd ? 3.5 : 2.5,
                height: tickHeight,
                backgroundColor: AXIS_COLOR,
                transform: 'translate(-50%, -50%)',
                zIndex: 4,
                borderRadius: 1.5,
              }}
            />

            {/* Time Label (Fixed clock time, moving visual location) */}
            <div
              style={{
                position: 'absolute',
                left: bX,
                top: baselineY + tickHeight / 2 + 10,
                transform: 'translateX(-50%)',
                textAlign: 'center',
                zIndex: 5,
              }}
            >
              <div
                style={{
                  fontSize: 21,
                  fontFamily: MONO_FONT,
                  fontWeight: 850,
                  color: DARK_TEXT,
                  letterSpacing: -0.3,
                  whiteSpace: 'nowrap',
                }}
              >
                {timeLabel}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontFamily: FONT_FAMILY,
                  fontWeight: 600,
                  color: MUTED_TEXT,
                  marginTop: 2,
                }}
              >
                {idx === 0
                  ? 'Start'
                  : idx === 5
                  ? 'End'
                  : '1 hr tick'}
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* ---------------------------------------------------- */}
      {/* 3. EVENT DOTS (Smoothly dispersing during expansion) */}
      {/* ---------------------------------------------------- */}
      {allEvents.map((event) => {
        const isBurst = event.intervalIndex === 2;
        const dotColor = isBurst ? TUE_RED : DARK_TEXT;
        const shadow = isBurst
          ? '0 2px 8px rgba(200, 16, 46, 0.45)'
          : '0 2px 5px rgba(0, 0, 0, 0.2)';

        return (
          <div
            key={event.id}
            style={{
              position: 'absolute',
              left: event.x,
              top: baselineY,
              transform: 'translate(-50%, -50%)',
              width: eventDotSize,
              height: eventDotSize,
              borderRadius: '50%',
              backgroundColor: dotColor,
              border: '2.5px solid #ffffff',
              boxShadow: shadow,
              zIndex: isBurst ? 10 : 8,
              transition: 'background-color 0.2s ease',
            }}
          />
        );
      })}
    </div>
  );
};
