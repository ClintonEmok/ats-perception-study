import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_FAMILY } from '../theme';
import { AggregationSequence } from './AggregationSequence';
import { FilteringSequence } from './FilteringSequence';
import { FocusDetailSequence } from './FocusDetailSequence';
import { ThreeColumnSummary } from './ThreeColumnSummary';
import {
  TIMELINE_WIDTH,
  TIMELINE_X,
  TIMELINE_Y,
} from './data';
import { TimelineTrack } from './TimelineTrack';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const DensityApproachesAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 540 (18.0s) for 100% static hold until 60.0s (frame 1800)
  const effectiveFrame = Math.min(frame, 540);

  // Single baseline timeline visibility between transitions (frames 0 to 495)
  const singleTimelineOpacity = interpolate(effectiveFrame, [485, 510], [1, 0], clamp);

  // Is an active transformation sequence taking control of the baseline timeline?
  const isSequence1Active = effectiveFrame >= 30 && effectiveFrame < 165;
  const isSequence2Active = effectiveFrame >= 195 && effectiveFrame < 330;
  const isSequence3Active = effectiveFrame >= 360 && effectiveFrame < 495;
  const isSummaryActive = effectiveFrame >= 490;

  const showStandbyBaseline =
    !isSequence1Active &&
    !isSequence2Active &&
    !isSequence3Active &&
    !isSummaryActive;

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
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. STANDBY BASELINE TIMELINE (Continuity & Resets)   */}
      {/* ---------------------------------------------------- */}
      {showStandbyBaseline && (
        <div
          style={{
            position: 'absolute',
            left: TIMELINE_X,
            top: TIMELINE_Y - 40,
            width: TIMELINE_WIDTH,
            opacity: singleTimelineOpacity,
            zIndex: 5,
            pointerEvents: 'none',
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
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. SEQUENCE 1: AGGREGATE (Frames 30 – 165 / 1s–5.5s) */}
      {/* ---------------------------------------------------- */}
      <AggregationSequence startFrame={30} endFrame={165} />

      {/* ---------------------------------------------------- */}
      {/* 3. SEQUENCE 2: FILTER (Frames 195 – 330 / 6.5s–11s)  */}
      {/* ---------------------------------------------------- */}
      <FilteringSequence startFrame={195} endFrame={330} />

      {/* ---------------------------------------------------- */}
      {/* 4. SEQUENCE 3: FOCUS+DETAIL (Frames 360–495/12s–16.5s)*/}
      {/* ---------------------------------------------------- */}
      <FocusDetailSequence startFrame={360} endFrame={495} />

      {/* ---------------------------------------------------- */}
      {/* 5. SYNTHESIS: 3-COLUMN SUMMARY (Frames 495 – 1800)   */}
      {/* ---------------------------------------------------- */}
      {isSummaryActive && <ThreeColumnSummary startFrame={495} />}
    </AbsoluteFill>
  );
};
