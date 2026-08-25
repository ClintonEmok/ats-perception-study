import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  AXIS_COLOR,
  DARK_TEXT,
  FILTER_PRESERVED_IDS,
  HISTOGRAM_BINS,
  HOURLY_INTERVALS,
  TUE_RED,
} from './data';
import { TimelineTrack } from './TimelineTrack';

interface ThreeColumnSummaryProps {
  startFrame: number; // e.g. 495
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const ThreeColumnSummary: React.FC<ThreeColumnSummaryProps> = ({
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame - 5) return null;

  const localFrame = frame - startFrame;

  // Staggered entrance for the 3 columns
  const col1Entrance = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 110 },
  });
  const col2Entrance = spring({
    frame: localFrame - 6,
    fps,
    config: { damping: 18, stiffness: 110 },
  });
  const col3Entrance = spring({
    frame: localFrame - 12,
    fps,
    config: { damping: 18, stiffness: 110 },
  });

  const miniTimelineWidth = 460;
  const colWidth = 540;

  // Aggregate sub-bins geometry for miniature
  const intervalWidth = miniTimelineWidth / 5;
  const subBinWidth = (intervalWidth - 16) / 3;

  // Filtered dots calculation for miniature
  const allEvents = HOURLY_INTERVALS.flatMap((interval) => interval.events);
  const excludedEventIds = new Set(
    allEvents
      .filter((e) => !FILTER_PRESERVED_IDS.has(e.id))
      .map((e) => e.id)
  );

  // Focus + Detail geometry for miniature
  const focusX = intervalWidth * 2;
  const focusWidth = intervalWidth;
  const miniDetailWidth = miniTimelineWidth * 0.9;
  const miniDetailX = (miniTimelineWidth - miniDetailWidth) / 2;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        fontFamily: FONT_FAMILY,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 60,
        padding: '0 80px',
        boxSizing: 'border-box',
        zIndex: 30,
      }}
    >
      {/* ================= COLUMN 1: AGGREGATE ================= */}
      <div
        style={{
          width: colWidth,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: interpolate(col1Entrance, [0, 1], [0, 1], clamp),
          transform: `translateY(${interpolate(col1Entrance, [0, 1], [20, 0], clamp)}px)`,
        }}
      >
        <h3
          style={{
            margin: '0 0 50px 0',
            fontSize: 28,
            fontWeight: 900,
            color: DARK_TEXT,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          AGGREGATE
        </h3>

        {/* Mini Visual: Aggregate Bars */}
        <div
          style={{
            position: 'relative',
            width: miniTimelineWidth,
            height: 200,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          {/* Histogram Bars */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: 45, // Sits directly on baseline
              width: miniTimelineWidth,
              zIndex: 3,
            }}
          >
            {HISTOGRAM_BINS.map((bin, idx) => {
              const binHeight = bin.height * 0.7; // Scale for mini view
              const binX =
                bin.intervalIndex * intervalWidth +
                8 +
                bin.subIndex * (subBinWidth + 4);

              return (
                <div
                  key={`mini-bin-${idx}`}
                  style={{
                    position: 'absolute',
                    left: binX,
                    bottom: 0,
                    width: subBinWidth,
                    height: binHeight,
                    backgroundColor: bin.isBurst
                      ? TUE_RED
                      : 'rgba(15, 23, 42, 0.75)',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
              );
            })}
          </div>

          {/* Mini Timeline Track */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: miniTimelineWidth,
            }}
          >
            <TimelineTrack
              width={miniTimelineWidth}
              height={70}
              baselineY={25}
              baselineHeight={3}
              tickHeight={20}
              tickWidth={2}
              labelFontSize={14}
              customEvents={[]} // No dots, pure aggregate
              showLabels={true}
              showTicks={true}
              highlightBurst={false}
            />
          </div>
        </div>
      </div>

      {/* ================= COLUMN 2: FILTER ================= */}
      <div
        style={{
          width: colWidth,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: interpolate(col2Entrance, [0, 1], [0, 1], clamp),
          transform: `translateY(${interpolate(col2Entrance, [0, 1], [20, 0], clamp)}px)`,
        }}
      >
        <h3
          style={{
            margin: '0 0 50px 0',
            fontSize: 28,
            fontWeight: 900,
            color: DARK_TEXT,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          FILTER
        </h3>

        {/* Mini Visual: Filtered Subset */}
        <div
          style={{
            position: 'relative',
            width: miniTimelineWidth,
            height: 200,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: miniTimelineWidth,
            }}
          >
            <TimelineTrack
              width={miniTimelineWidth}
              height={70}
              baselineY={25}
              baselineHeight={3}
              tickHeight={20}
              tickWidth={2}
              labelFontSize={14}
              eventDotSize={14}
              eventDotBorderSize={2}
              fadedEventIds={excludedEventIds}
              fadedOpacity={0} // Filtered out
              showLabels={true}
              showTicks={true}
              highlightBurst={true}
            />
          </div>
        </div>
      </div>

      {/* ================= COLUMN 3: FOCUS + DETAIL ================= */}
      <div
        style={{
          width: colWidth,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: interpolate(col3Entrance, [0, 1], [0, 1], clamp),
          transform: `translateY(${interpolate(col3Entrance, [0, 1], [20, 0], clamp)}px)`,
        }}
      >
        <h3
          style={{
            margin: '0 0 50px 0',
            fontSize: 28,
            fontWeight: 900,
            color: DARK_TEXT,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          FOCUS + DETAIL
        </h3>

        {/* Mini Visual: Focus Bracket + Expanded Sub-window */}
        <div
          style={{
            position: 'relative',
            width: miniTimelineWidth,
            height: 200,
          }}
        >
          {/* Expanded Detail Track (Top) */}
          <div
            style={{
              position: 'absolute',
              left: miniDetailX,
              top: 15,
              width: miniDetailWidth,
              height: 45,
            }}
          >
            {/* Detail baseline */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 12,
                height: 2.5,
                backgroundColor: '#7c3aed',
                transform: 'translateY(-50%)',
                borderRadius: 1,
              }}
            />
            {/* Detail ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${pct * 100}%`,
                  top: 12,
                  width: 2,
                  height: 16,
                  backgroundColor: '#7c3aed',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
            {/* Detail tick labels */}
            {['14:00', '14:30', '15:00'].map((label, idx) => (
              <div
                key={label}
                style={{
                  position: 'absolute',
                  left: `${idx * 50}%`,
                  top: 24,
                  transform: 'translateX(-50%)',
                  fontSize: 10,
                  fontFamily: MONO_FONT,
                  fontWeight: 800,
                  color: DARK_TEXT,
                }}
              >
                {label}
              </div>
            ))}
            {/* Expanded dots */}
            {Array.from({ length: 14 }, (_, i) => (
              <div
                key={`mini-detail-dot-${i}`}
                style={{
                  position: 'absolute',
                  left: `${(i / 13) * 100}%`,
                  top: 12,
                  transform: 'translate(-50%, -50%)',
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: TUE_RED,
                  border: '1.5px solid #ffffff',
                }}
              />
            ))}
          </div>

          {/* SVG Connection Guide Lines */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: miniTimelineWidth,
              height: 200,
              overflow: 'visible',
              zIndex: 2,
            }}
          >
            <polygon
              points={`
                ${focusX},${145}
                ${focusX + focusWidth},${145}
                ${miniDetailX + miniDetailWidth},${45}
                ${miniDetailX},${45}
              `}
              fill="rgba(124, 58, 237, 0.08)"
            />
            <line
              x1={focusX}
              y1={145}
              x2={miniDetailX}
              y2={45}
              stroke="#7c3aed"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <line
              x1={focusX + focusWidth}
              y1={145}
              x2={miniDetailX + miniDetailWidth}
              y2={45}
              stroke="#7c3aed"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          </svg>

          {/* Selection Bracket on overview */}
          <div
            style={{
              position: 'absolute',
              left: focusX,
              top: 145,
              width: focusWidth,
              height: 22,
              border: '1.5px solid #7c3aed',
              borderRadius: 4,
              backgroundColor: 'rgba(124, 58, 237, 0.08)',
              zIndex: 5,
            }}
          />

          {/* Overview Timeline (Bottom) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: miniTimelineWidth,
            }}
          >
            <TimelineTrack
              width={miniTimelineWidth}
              height={70}
              baselineY={25}
              baselineHeight={3}
              tickHeight={20}
              tickWidth={2}
              labelFontSize={14}
              eventDotSize={12}
              eventDotBorderSize={1.5}
              showLabels={true}
              showTicks={true}
              highlightBurst={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
