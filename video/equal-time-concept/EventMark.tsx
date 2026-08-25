import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { DARK_TEXT, TUE_RED } from './data';
import { EventItem } from './types';

interface EventMarkProps {
  event: EventItem;
  containerWidth: number;
  containerHeight: number;
  isDenseInterval: boolean;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const EventMark: React.FC<EventMarkProps> = ({
  event,
  containerWidth,
  containerHeight,
  isDenseInterval,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 200 for 100% static hold after ~6.7s
  const effectiveFrame = Math.min(frame, 200);

  if (effectiveFrame < event.appearFrame) return null;

  const entrance = spring({
    frame: effectiveFrame - event.appearFrame,
    fps,
    config: {
      damping: 14,
      mass: 0.4,
      stiffness: 200,
    },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1], clamp);
  const scale = interpolate(entrance, [0, 1], [0.2, 1], clamp);
  const dropOffset = interpolate(entrance, [0, 1], [-28, 0], clamp);

  // Position along the horizontal line
  const x = (event.xPercent / 100) * containerWidth;
  const y = (event.yPercent / 100) * containerHeight + dropOffset;

  // Emphasis transition (frames 125–170 / 4.2s–5.7s)
  const redEmphasisProgress = interpolate(effectiveFrame, [125, 170], [0, 1], clamp);
  const isRed = isDenseInterval && redEmphasisProgress > 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        width: 24, // Bigger 24px event dots for maximum visibility
        height: 24,
        borderRadius: '50%',
        backgroundColor: isRed
          ? `rgba(200, 16, 46, ${0.85 + redEmphasisProgress * 0.15})`
          : DARK_TEXT,
        border: isRed ? `3px solid ${TUE_RED}` : '3px solid #ffffff',
        boxShadow: isRed
          ? '0 3px 12px rgba(200, 16, 46, 0.4)'
          : '0 2px 8px rgba(0, 0, 0, 0.28)',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
};
