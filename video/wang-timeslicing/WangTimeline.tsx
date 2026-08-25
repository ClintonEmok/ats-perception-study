import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  AXIS_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  HOURLY_TIME_POINTS,
  MUTED_TEXT,
  TUE_RED,
  UNIFORM_BOUNDARIES,
  UNIFORM_DURATIONS,
  UNIFORM_EVENT_COUNTS,
  UNIFORM_TIME_LABELS,
  WANG_BOUNDARIES,
  WANG_DURATIONS,
  WANG_EVENT_COUNTS,
  WANG_TIME_LABELS,
} from './data';

interface WangTimelineProps {
  progress: number; // 0 = uniform timeslicing, 1 = non-uniform timeslicing
  width: number;
  height?: number;
  baselineY?: number;
  eventDotSize?: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const BADGE_CIRCLES = ['①', '②', '③', '④', '⑤'];

export const WangTimeline: React.FC<WangTimelineProps> = ({
  progress,
  width,
  height = 200,
  baselineY = 90,
  eventDotSize = 20,
}) => {
  // Current boundary positions
  const currentBoundaries = UNIFORM_BOUNDARIES.map((uX, idx) => {
    const wX = WANG_BOUNDARIES[idx];
    return interpolate(progress, [0, 1], [uX, wX], clamp);
  });

  // Flat list of all 65 events with their exact pixel positions
  const allEvents = HOURLY_INTERVALS.flatMap((interval) => {
    const sliceW = width / 5;
    const uLeft = interval.index * sliceW;
    return interval.events.map((event) => ({
      ...event,
      x: uLeft + (event.xPercent / 100) * sliceW,
    }));
  });

  // Color interpolation for burst dots (from red to slate/dark)
  const redToDark = interpolate(progress, [0.4, 0.9], [0, 1], clamp);
  const burstR = Math.round(interpolate(redToDark, [0, 1], [200, 15], clamp));
  const burstG = Math.round(interpolate(redToDark, [0, 1], [16, 23], clamp));
  const burstB = Math.round(interpolate(redToDark, [0, 1], [46, 42], clamp));
  const burstColor = `rgb(${burstR}, ${burstG}, ${burstB})`;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        fontFamily: FONT_FAMILY,
        userSelect: 'none',
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. SLICE TINT BACKGROUND BANDS                        */}
      {/* ---------------------------------------------------- */}
      {[0, 1, 2, 3, 4].map((idx) => {
        const left = currentBoundaries[idx];
        const right = currentBoundaries[idx + 1];
        const sliceW = right - left;
        const isEven = idx % 2 === 0;

        return (
          <div
            key={`slice-band-${idx}`}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width: sliceW,
              height,
              backgroundColor: isEven ? 'rgba(15, 23, 42, 0.025)' : 'rgba(15, 23, 42, 0.055)',
              borderLeft: idx > 0 ? '1.5px dashed rgba(15, 23, 42, 0.25)' : 'none',
              borderRight: idx < 4 ? '1.5px dashed rgba(15, 23, 42, 0.25)' : 'none',
              boxSizing: 'border-box',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        );
      })}

      {/* ---------------------------------------------------- */}
      {/* 2. BASELINE AXIS BAR                                 */}
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
      {/* 3. STATIC TIME SCALE MARKS (12:00 -> 17:00 at bottom) */}
      {/* ---------------------------------------------------- */}
      {HOURLY_TIME_POINTS.map((label, idx) => {
        const x = (idx / 5) * width;
        return (
          <div
            key={`fixed-tick-${idx}`}
            style={{
              position: 'absolute',
              left: x,
              top: baselineY,
              transform: 'translateX(-50%)',
              textAlign: 'center',
              zIndex: 3,
            }}
          >
            <div
              style={{
                width: 2,
                height: 12,
                backgroundColor: 'rgba(15, 23, 42, 0.3)',
                margin: '0 auto',
              }}
            />
            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                fontFamily: MONO_FONT,
                fontWeight: 600,
                color: MUTED_TEXT,
                opacity: 0.65,
              }}
            >
              {label}
            </div>
          </div>
        );
      })}

      {/* ---------------------------------------------------- */}
      {/* 4. DYNAMIC SLICE BOUNDARY LINES & NON-UNIFORM TICKS  */}
      {/* ---------------------------------------------------- */}
      {currentBoundaries.map((bX, idx) => {
        const isEnd = idx === 0 || idx === 5;
        const uniformLabel = UNIFORM_TIME_LABELS[idx];
        const wangLabel = WANG_TIME_LABELS[idx];
        const label = progress > 0.65 ? wangLabel : uniformLabel;

        return (
          <div
            key={`boundary-line-${idx}`}
            style={{
              position: 'absolute',
              left: bX,
              top: 0,
              bottom: 0,
              width: 2,
              transform: 'translateX(-50%)',
              zIndex: 4,
              pointerEvents: 'none',
            }}
          >
            {/* Vertical Dotted Divider */}
            <div
              style={{
                width: 2,
                height: height - 40,
                borderLeft: isEnd ? '2.5px solid #0f172a' : '2px dashed #0f172a',
                opacity: isEnd ? 0.9 : 0.6,
              }}
            />

            {/* Boundary Timestamp Badge */}
            <div
              style={{
                position: 'absolute',
                top: baselineY - 45,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 14,
                fontFamily: MONO_FONT,
                fontWeight: 800,
                color: progress > 0.5 && !isEnd ? '#2563eb' : DARK_TEXT,
                backgroundColor: '#ffffff',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid rgba(15, 23, 42, 0.15)',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              {label}
            </div>
          </div>
        );
      })}

      {/* ---------------------------------------------------- */}
      {/* 5. SLICE NUMBERED BADGES & EVENT COUNTS (Above)      */}
      {/* ---------------------------------------------------- */}
      {[0, 1, 2, 3, 4].map((idx) => {
        const left = currentBoundaries[idx];
        const right = currentBoundaries[idx + 1];
        const midX = (left + right) / 2;

        const uCount = UNIFORM_EVENT_COUNTS[idx];
        const wCount = WANG_EVENT_COUNTS[idx];
        const count = Math.round(interpolate(progress, [0, 1], [uCount, wCount], clamp));

        const uDur = UNIFORM_DURATIONS[idx];
        const wDur = WANG_DURATIONS[idx];
        const duration = progress > 0.65 ? wDur : uDur;

        const isBurstSlice = idx === 2 && progress < 0.5;

        return (
          <div
            key={`slice-header-${idx}`}
            style={{
              position: 'absolute',
              left: midX,
              top: 10,
              transform: 'translateX(-50%)',
              textAlign: 'center',
              zIndex: 5,
              whiteSpace: 'nowrap',
            }}
          >
            {/* Numbered Slice Circle Badge ① ② ③ ④ ⑤ */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: isBurstSlice ? TUE_RED : '#0f172a',
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 800,
                fontFamily: MONO_FONT,
                boxShadow: isBurstSlice
                  ? '0 2px 8px rgba(200, 16, 46, 0.4)'
                  : '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              {idx + 1}
            </div>


            {/* Duration Tag */}
            <div
              style={{
                marginTop: 3,
                fontSize: 11,
                fontFamily: FONT_FAMILY,
                fontWeight: 600,
                color: MUTED_TEXT,
              }}
            >
              {duration}
            </div>
          </div>
        );
      })}

      {/* ---------------------------------------------------- */}
      {/* 6. STATIC EVENT MARKS                                */}
      {/* ---------------------------------------------------- */}
      {allEvents.map((event) => {
        const isBurst = event.intervalIndex === 2;
        const dotColor = isBurst ? burstColor : DARK_TEXT;
        const shadow = isBurst
          ? `0 2px 8px rgba(${burstR}, ${burstG}, ${burstB}, ${0.4 - redToDark * 0.2})`
          : '0 2px 6px rgba(0, 0, 0, 0.25)';

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
              border: '3px solid #ffffff',
              boxShadow: shadow,
              zIndex: isBurst ? 10 : 8,
            }}
          />
        );
      })}
    </div>
  );
};
