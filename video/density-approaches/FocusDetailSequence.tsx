import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  AXIS_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  TIMELINE_WIDTH,
  TIMELINE_X,
  TIMELINE_Y,
  TUE_RED,
} from './data';
import { TimelineTrack } from './TimelineTrack';

interface FocusDetailSequenceProps {
  startFrame: number; // e.g. 330
  endFrame: number; // e.g. 490
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const FocusDetailSequence: React.FC<FocusDetailSequenceProps> = ({
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

  // 2. Focus Bracket & Detail Window Expansion (frames 15 to 65 / ~1.7 seconds)
  const focusSpring = spring({
    frame: localFrame - 15,
    fps,
    config: { damping: 22, stiffness: 55, mass: 1.05 },
  });
  const focusProgress = Math.max(0, Math.min(1, focusSpring));

  // 3. Exit Transition before synthesis (frames 135 to 160)
  const exitOpacity = interpolate(
    localFrame,
    [endFrame - startFrame - 25, endFrame - startFrame],
    [1, 0],
    clamp
  );

  const totalOpacity = labelOpacity * exitOpacity;

  // Geometry
  const intervalWidth = TIMELINE_WIDTH / 5;
  const focusX = TIMELINE_X + intervalWidth * 2;
  const focusWidth = intervalWidth;

  // Detail View dimensions (positioned above or below overview)
  const overviewY = TIMELINE_Y + 40;
  const detailWidth = TIMELINE_WIDTH * 0.85; // 1360px wide
  const detailX = (1920 - detailWidth) / 2;
  const detailY = overviewY - 260; // Detail view above overview

  const detailTicks = ['14:00', '14:15', '14:30', '14:45', '15:00'];
  const detailEvents = HOURLY_INTERVALS[2].events; // 48 dense events

  const detailScaleY = interpolate(focusProgress, [0, 1], [0.4, 1], clamp);
  const detailOpacity = interpolate(focusProgress, [0.15, 0.9], [0, 1], clamp);
  const bracketOpacity = interpolate(focusProgress, [0, 1], [0, 1], clamp);

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
          top: 130,
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
          FOCUS + DETAIL
        </h2>
      </div>

      {/* SVG Projection Guide Lines (from Overview selection up to Detail view) */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: 1920,
          height: 1080,
          opacity: detailOpacity,
          zIndex: 4,
          overflow: 'visible',
        }}
      >
        <defs>
          <linearGradient id="focusProjectionGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.03} />
          </linearGradient>
        </defs>

        {/* Shaded projection trapezoid */}
        <polygon
          points={`
            ${focusX},${overviewY - 18}
            ${focusX + focusWidth},${overviewY - 18}
            ${detailX + detailWidth},${detailY + 60}
            ${detailX},${detailY + 60}
          `}
          fill="url(#focusProjectionGrad)"
        />

        {/* Left guide line */}
        <line
          x1={focusX}
          y1={overviewY - 18}
          x2={detailX}
          y2={detailY + 60}
          stroke="#7c3aed"
          strokeWidth={2}
          strokeDasharray="4 4"
        />

        {/* Right guide line */}
        <line
          x1={focusX + focusWidth}
          y1={overviewY - 18}
          x2={detailX + detailWidth}
          y2={detailY + 60}
          stroke="#7c3aed"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      </svg>

      {/* Overview Selection Bracket Box */}
      <div
        style={{
          position: 'absolute',
          left: focusX,
          top: overviewY - 18,
          width: focusWidth,
          height: 36,
          opacity: bracketOpacity,
          border: '2.5px solid #7c3aed',
          borderRadius: 8,
          backgroundColor: 'rgba(124, 58, 237, 0.08)',
          zIndex: 6,
        }}
      />

      {/* Overview Timeline Track (At its natural baseline) */}
      <div
        style={{
          position: 'absolute',
          left: TIMELINE_X,
          top: overviewY - 40,
          width: TIMELINE_WIDTH,
          zIndex: 10,
        }}
      >
        <TimelineTrack
          width={TIMELINE_WIDTH}
          height={100}
          baselineY={40}
          eventDotSize={24}
          showLabels={true}
          showTicks={true}
          highlightBurst={true}
        />
      </div>

      {/* Expanded Detail View Track (Above overview) */}
      <div
        style={{
          position: 'absolute',
          left: detailX,
          top: detailY,
          width: detailWidth,
          height: 90,
          opacity: detailOpacity,
          transform: `scaleY(${detailScaleY})`,
          transformOrigin: 'bottom center',
          zIndex: 12,
        }}
      >
        {/* Baseline Bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 25,
            height: 4,
            backgroundColor: '#7c3aed',
            transform: 'translateY(-50%)',
            borderRadius: 2,
          }}
        />

        {/* Sub-ticks */}
        {detailTicks.map((tick, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${(idx / (detailTicks.length - 1)) * 100}%`,
              top: 25,
              width: 3,
              height: 32,
              backgroundColor: '#7c3aed',
              transform: 'translate(-50%, -50%)',
              borderRadius: 1,
            }}
          />
        ))}

        {/* Sub-tick labels below baseline */}
        <div
          style={{
            position: 'absolute',
            top: 46,
            left: 0,
            right: 0,
            height: 20,
          }}
        >
          {detailTicks.map((tick, idx) => (
            <div
              key={tick}
              style={{
                position: 'absolute',
                left: `${(idx / (detailTicks.length - 1)) * 100}%`,
                transform: 'translateX(-50%)',
                fontSize: 16,
                fontFamily: MONO_FONT,
                fontWeight: 800,
                color: DARK_TEXT,
              }}
            >
              {tick}
            </div>
          ))}
        </div>

        {/* 48 Event marks distributed along the expanded width */}
        {detailEvents.map((event, idx) => {
          const percent = (idx / (detailEvents.length - 1)) * 100;
          return (
            <div
              key={`detail-${event.id}`}
              style={{
                position: 'absolute',
                left: `${percent}%`,
                top: 25,
                transform: 'translate(-50%, -50%)',
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: TUE_RED,
                border: '2px solid #ffffff',
                boxShadow: '0 2px 6px rgba(200, 16, 46, 0.35)',
                zIndex: 10,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
