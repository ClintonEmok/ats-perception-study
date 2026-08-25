import React from 'react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  AXIS_COLOR,
  DARK_TEXT,
  HOURLY_INTERVALS,
  HOURLY_TIME_POINTS,
  TUE_RED,
} from './data';

export interface TimelineTrackProps {
  width: number;
  height?: number;
  baselineY?: number;
  opacity?: number;
  showLabels?: boolean;
  labelFontSize?: number;
  showTicks?: boolean;
  tickHeight?: number;
  tickWidth?: number;
  baselineHeight?: number;
  eventDotSize?: number;
  eventDotBorderSize?: number;
  highlightBurst?: boolean;
  activeIntervalIndex?: number | null;
  hiddenEventIds?: Set<string>;
  fadedEventIds?: Set<string>;
  fadedOpacity?: number;
  eventColorOverride?: (eventId: string, intervalIndex: number) => string | undefined;
  eventYOffset?: (eventId: string, intervalIndex: number) => number;
  customEvents?: Array<{
    id: string;
    intervalIndex: number;
    xPercent: number;
    yPercent: number;
  }>;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  width,
  height = 100,
  baselineY = 40,
  opacity = 1,
  showLabels = true,
  labelFontSize = 24,
  showTicks = true,
  tickHeight = 44,
  tickWidth = 4,
  baselineHeight = 5,
  eventDotSize = 24,
  eventDotBorderSize = 3,
  highlightBurst = true,
  activeIntervalIndex = null,
  hiddenEventIds,
  fadedEventIds,
  fadedOpacity = 0.12,
  eventColorOverride,
  eventYOffset,
  customEvents,
}) => {
  const numIntervals = HOURLY_INTERVALS.length; // 5
  const intervalWidth = width / numIntervals;
  const numTicks = numIntervals + 1; // 6 (12:00 to 17:00)

  const eventsToRender =
    customEvents !== undefined
      ? customEvents
      : HOURLY_INTERVALS.flatMap((interval) =>
          interval.events.map((e) => ({
            id: e.id,
            intervalIndex: e.intervalIndex,
            xPercent: e.xPercent,
            yPercent: e.yPercent,
          }))
        );

  if (opacity <= 0.001) return null;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        opacity,
        fontFamily: FONT_FAMILY,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {/* 1. Horizontal Baseline Axis Bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: baselineY,
          height: baselineHeight,
          backgroundColor: AXIS_COLOR,
          transform: 'translateY(-50%)',
          zIndex: 1,
          borderRadius: baselineHeight / 2,
        }}
      />

      {/* 2. Vertical Boundary Ticks */}
      {showTicks &&
        Array.from({ length: numTicks }, (_, idx) => {
          const isActive =
            activeIntervalIndex !== null &&
            (idx === activeIntervalIndex || idx === activeIntervalIndex + 1);
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: idx * intervalWidth,
                top: baselineY,
                width: tickWidth,
                height: tickHeight,
                backgroundColor: isActive ? TUE_RED : AXIS_COLOR,
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                borderRadius: 1.5,
              }}
            />
          );
        })}

      {/* 3. Time Labels below baseline ticks */}
      {showLabels && (
        <div
          style={{
            position: 'absolute',
            top: baselineY + tickHeight / 2 + 10,
            left: 0,
            width,
            height: labelFontSize + 8,
          }}
        >
          {HOURLY_TIME_POINTS.map((time, idx) => {
            const isActive =
              activeIntervalIndex !== null &&
              (idx === activeIntervalIndex || idx === activeIntervalIndex + 1);
            return (
              <div
                key={time}
                style={{
                  position: 'absolute',
                  left: idx * intervalWidth,
                  transform: 'translateX(-50%)',
                  fontSize: labelFontSize,
                  fontFamily: MONO_FONT,
                  fontWeight: 850,
                  color: isActive ? TUE_RED : DARK_TEXT,
                  letterSpacing: -0.4,
                }}
              >
                {time}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Event Marks (Dots) */}
      {eventsToRender.map((event) => {
        if (hiddenEventIds && hiddenEventIds.has(event.id)) {
          return null;
        }

        const isFaded = fadedEventIds && fadedEventIds.has(event.id);
        const isBurst = event.intervalIndex === 2;
        const colorOverride = eventColorOverride?.(event.id, event.intervalIndex);
        const yOffset = eventYOffset?.(event.id, event.intervalIndex) || 0;

        const isRed = colorOverride
          ? colorOverride === TUE_RED
          : highlightBurst && isBurst;

        const eventX =
          event.intervalIndex * intervalWidth +
          (event.xPercent / 100) * intervalWidth;
        const eventY = baselineY + yOffset;

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
              backgroundColor: isRed ? TUE_RED : DARK_TEXT,
              border: `${eventDotBorderSize}px solid #ffffff`,
              boxShadow: isRed
                ? '0 2px 8px rgba(200, 16, 46, 0.4)'
                : '0 2px 6px rgba(0, 0, 0, 0.25)',
              opacity: isFaded ? fadedOpacity : 1,
              zIndex: isRed ? 5 : 4,
            }}
          />
        );
      })}
    </div>
  );
};
