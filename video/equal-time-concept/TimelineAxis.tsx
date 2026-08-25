import React from 'react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { AXIS_COLOR, DARK_TEXT, HOURLY_INTERVALS, HOURLY_TIME_POINTS } from './data';

interface TimelineAxisProps {
  totalWidth: number;
  opacity: number;
}

export const TimelineAxis: React.FC<TimelineAxisProps> = ({
  totalWidth,
  opacity,
}) => {
  const intervalWidth = totalWidth / HOURLY_INTERVALS.length; // 336px per interval
  const numTicks = HOURLY_INTERVALS.length + 1; // 6 ticks (12:00 to 17:00)

  if (opacity <= 0.001) return null;

  return (
    <div
      style={{
        width: totalWidth,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      {/* 1. Neutral Hour Labels Row (All identical to represent equal time intervals) */}
      <div
        style={{
          width: totalWidth,
          position: 'relative',
          height: 44,
          marginBottom: 6,
        }}
      >
        {HOURLY_TIME_POINTS.map((time, idx) => (
          <div
            key={time}
            style={{
              position: 'absolute',
              left: idx * intervalWidth,
              transform: 'translateX(-50%)',
              fontSize: 26,
              fontFamily: MONO_FONT,
              fontWeight: 850,
              color: DARK_TEXT,
              letterSpacing: -0.4,
            }}
          >
            {time}
          </div>
        ))}
      </div>

      {/* 2. Main Open Timeline Baseline Track with Equal-Spaced Boundary Ticks */}
      <div
        style={{
          width: totalWidth,
          height: 120,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Continuous Horizontal Baseline Axis (5px thick) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 5,
            backgroundColor: AXIS_COLOR,
            transform: 'translateY(-50%)',
            zIndex: 1,
          }}
        />

        {/* Vertical Tick Marks at Each Interval Boundary (All uniform 4px wide, 52px high) */}
        {Array.from({ length: numTicks }, (_, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: idx * intervalWidth,
              top: '50%',
              width: 4,
              height: 52,
              backgroundColor: AXIS_COLOR,
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
              borderRadius: 1,
            }}
          />
        ))}
      </div>
    </div>
  );
};
