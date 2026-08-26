import React from 'react';
import { interpolate, spring } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

interface MappingIndicatorProps {
  revealProgress: number; // 0 to 1
  isTransforming?: boolean;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const MappingIndicator: React.FC<MappingIndicatorProps> = ({
  revealProgress,
  isTransforming = false,
}) => {
  if (revealProgress <= 0.001) return null;

  const opacity = interpolate(revealProgress, [0, 0.8], [0, 1], clamp);
  const translateY = interpolate(revealProgress, [0, 1], [-12, 0], clamp);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {/* 1. Main Equation Pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 28px',
          backgroundColor: '#ffffff',
          border: '2px solid #0f172a',
          borderRadius: 999,
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.12)',
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontFamily: FONT_FAMILY,
            fontWeight: 900,
            color: TUE_RED,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          EVENT DENSITY
        </span>

        <span
          style={{
            fontSize: 22,
            fontFamily: MONO_FONT,
            fontWeight: 900,
            color: DARK_TEXT,
          }}
        >
          ➔
        </span>

        <span
          style={{
            fontSize: 20,
            fontFamily: FONT_FAMILY,
            fontWeight: 900,
            color: '#2563eb', // Rich visual blue for visual space
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          VISUAL SPACE
        </span>
      </div>

      {/* 2. Sub-rules (High density -> larger, Low density -> smaller) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          marginTop: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            color: DARK_TEXT,
            backgroundColor: 'rgba(200, 16, 46, 0.06)',
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid rgba(200, 16, 46, 0.2)',
          }}
        >
          <span style={{ color: TUE_RED, fontWeight: 900 }}>High density</span>
          <span style={{ color: MUTED_TEXT }}>➔</span>
          <span style={{ color: DARK_TEXT, fontWeight: 800 }}>Larger visual allocation</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            color: DARK_TEXT,
            backgroundColor: 'rgba(15, 23, 42, 0.04)',
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid rgba(15, 23, 42, 0.12)',
          }}
        >
          <span style={{ color: MUTED_TEXT, fontWeight: 800 }}>Low density</span>
          <span style={{ color: MUTED_TEXT }}>➔</span>
          <span style={{ color: MUTED_TEXT, fontWeight: 700 }}>Compressed allocation</span>
        </div>
      </div>
    </div>
  );
};
