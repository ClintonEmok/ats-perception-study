import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

interface BottomPillsProps {
  revealProgress: number; // 0 to 1
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const BottomPills: React.FC<BottomPillsProps> = ({ revealProgress }) => {
  if (revealProgress <= 0.001) return null;

  const opacity = interpolate(revealProgress, [0, 0.8], [0, 1], clamp);
  const translateY = interpolate(revealProgress, [0, 1], [14, 0], clamp);

  const pills = [
    {
      prefix: 'Dense',
      action: 'expanded',
      dotColor: TUE_RED,
      bg: 'rgba(200, 16, 46, 0.06)',
      border: 'rgba(200, 16, 46, 0.22)',
    },
    {
      prefix: 'Sparse',
      action: 'compressed',
      dotColor: '#64748b',
      bg: 'rgba(100, 116, 139, 0.08)',
      border: 'rgba(100, 116, 139, 0.22)',
    },
    {
      prefix: 'Guaranteed',
      action: 'Nothing removed',
      dotColor: '#10b981', // Emerald
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.28)',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        opacity,
        transform: `translateY(${translateY}px)`,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {pills.map((pill, idx) => (
        <div
          key={`pill-${idx}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 24px',
            backgroundColor: pill.bg,
            border: `1.5px solid ${pill.border}`,
            borderRadius: 999,
            boxShadow: '0 3px 10px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: pill.dotColor,
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontFamily: FONT_FAMILY,
              fontWeight: 800,
              color: DARK_TEXT,
              letterSpacing: -0.2,
            }}
          >
            {pill.prefix}
          </span>
          <span
            style={{
              fontSize: 15,
              fontFamily: MONO_FONT,
              fontWeight: 800,
              color: MUTED_TEXT,
            }}
          >
            ➔
          </span>
          <span
            style={{
              fontSize: 16,
              fontFamily: FONT_FAMILY,
              fontWeight: 900,
              color: DARK_TEXT,
              letterSpacing: -0.2,
            }}
          >
            {pill.action}
          </span>
        </div>
      ))}
    </div>
  );
};
