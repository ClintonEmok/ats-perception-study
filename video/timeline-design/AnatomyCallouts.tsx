import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MONO_FONT } from '../theme';
import { THEME, TIMELINE_LEFT, TIMELINE_WIDTH } from './data';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

interface AnatomyCalloutsProps {
  // Entrance progress for callouts (0 -> 1 during frames 480..560)
  progress: number;
}

export const AnatomyCallouts: React.FC<AnatomyCalloutsProps> = ({ progress }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (progress <= 0) return null;

  // Restrained desynchronized floating offsets (~2.0px amplitude, periods 5.5s - 7.8s)
  const float1 = Math.sin((frame * 2 * Math.PI) / (6.2 * fps)) * 2.0;
  const float2 = Math.sin(((frame + 45) * 2 * Math.PI) / (5.5 * fps)) * 2.0;
  const float3 = Math.sin(((frame + 90) * 2 * Math.PI) / (7.1 * fps)) * 1.8;
  const float4 = Math.sin(((frame + 135) * 2 * Math.PI) / (6.8 * fps)) * 2.0;
  const float5 = Math.sin(((frame + 180) * 2 * Math.PI) / (7.8 * fps)) * 1.8;
  const floatR5a = Math.sin(((frame + 220) * 2 * Math.PI) / (6.0 * fps)) * 1.5;

  // Staggered spring entrances
  const s1 = spring({ frame: Math.max(0, frame - 460), fps, config: { damping: 18, stiffness: 130 } });
  const s2 = spring({ frame: Math.max(0, frame - 480), fps, config: { damping: 18, stiffness: 130 } });
  const s3 = spring({ frame: Math.max(0, frame - 500), fps, config: { damping: 18, stiffness: 130 } });
  const s4 = spring({ frame: Math.max(0, frame - 520), fps, config: { damping: 18, stiffness: 130 } });
  const s5 = spring({ frame: Math.max(0, frame - 540), fps, config: { damping: 18, stiffness: 130 } });
  const sR5a = spring({ frame: Math.max(0, frame - 490), fps, config: { damping: 18, stiffness: 130 } });

  // Anchor dot gentle pulse
  const anchorPulse = 0.5 + 0.5 * Math.sin(frame / 14);

  // Coordinates:
  // Overview top: 220, bottom: 350
  // Detail top: 460, bottom: 620

  // 1. OVERVIEW (YEARLY): Apr area (x: 300 + 1320 * (3.5/12) = 685, y: 220)
  const c1Anchor = { x: TIMELINE_LEFT + TIMELINE_WIDTH * (3.5 / 12), y: 220 };
  const c1Card = { x: TIMELINE_LEFT + 20, y: 130 + float1, width: 330, height: 54 };

  // 2. SELECT [ JULY ]: July brush in overview (x: 300 + 1320 * (6.5/12) = 1015, y: 220)
  const c2Anchor = { x: TIMELINE_LEFT + TIMELINE_WIDTH * (6.5 / 12), y: 220 };
  const c2Card = { x: TIMELINE_LEFT + TIMELINE_WIDTH * 0.44, y: 130 + float2, width: 340, height: 54 };

  // 3. ADAPTIVE GRANULARITY (Left side): Points to Detail header / resolution switch (x: 300 + 22 = 322, y: 485)
  const c3Anchor = { x: TIMELINE_LEFT + 22, y: 485 };
  const c3Card = { x: 36, y: 456 + float3, width: 244, height: 76 };

  // 4. DENSITY-BASED ALLOCATION & HOURLY RESOLUTION (R1): Points to expanded Day 14 slot (around 46% of detail -> x: 300 + 1320 * 0.46 = 907, y: 620)
  const c4Anchor = { x: TIMELINE_LEFT + TIMELINE_WIDTH * 0.46, y: 620 };
  const c4Card = { x: TIMELINE_LEFT + TIMELINE_WIDTH * 0.42, y: 668 + float4, width: 440, height: 56 };

  // 5. CLOCK-TIME REFERENCES (R3): Detail tick 01 (x: 300 + 20 = 320, y: 620)
  const c5Anchor = { x: TIMELINE_LEFT + 20, y: 620 };
  const c5Card = { x: TIMELINE_LEFT + 10, y: 668 + float5, width: 360, height: 56 };

  // R5a connector badge midpoint (x: 1015, y: 395)
  const r5aPos = { x: TIMELINE_LEFT + TIMELINE_WIDTH * (6.5 / 12) + 24, y: 395 + floatR5a };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
        opacity: progress,
      }}
    >
      {/* SVG Leader Lines Layer */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: 1920,
          height: 1080,
        }}
      >
        {/* 1. Leader Line 1: OVERVIEW */}
        {s1 > 0 && (
          <g opacity={s1}>
            <path
              d={`M ${c1Card.x + 165} ${c1Card.y + c1Card.height} L ${c1Card.x + 165} ${c1Anchor.y - 12} L ${c1Anchor.x} ${c1Anchor.y}`}
              fill="none"
              stroke="#0f172a"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.65}
            />
            <circle cx={c1Anchor.x} cy={c1Anchor.y} r={4} fill="#0f172a" />
            <circle
              cx={c1Anchor.x}
              cy={c1Anchor.y}
              r={7}
              fill="none"
              stroke="#0f172a"
              strokeWidth={1.5}
              opacity={0.3 + 0.4 * anchorPulse}
            />
          </g>
        )}

        {/* 2. Leader Line 2: SELECT [ JULY ] */}
        {s2 > 0 && (
          <g opacity={s2}>
            <path
              d={`M ${c2Card.x + 150} ${c2Card.y + c2Card.height} L ${c2Card.x + 150} ${c2Anchor.y - 12} L ${c2Anchor.x} ${c2Anchor.y}`}
              fill="none"
              stroke={THEME.tueRed}
              strokeWidth={1.8}
              strokeDasharray="4 3"
              opacity={0.8}
            />
            <circle cx={c2Anchor.x} cy={c2Anchor.y} r={4.5} fill={THEME.tueRed} />
            <circle
              cx={c2Anchor.x}
              cy={c2Anchor.y}
              r={8}
              fill="none"
              stroke={THEME.tueRed}
              strokeWidth={1.5}
              opacity={0.3 + 0.5 * anchorPulse}
            />
          </g>
        )}

        {/* 3. Leader Line 3: ADAPTIVE GRANULARITY */}
        {s3 > 0 && (
          <g opacity={s3}>
            <path
              d={`M ${c3Card.x + c3Card.width} ${c3Card.y + 36} L ${c3Anchor.x - 8} ${c3Anchor.y} L ${c3Anchor.x} ${c3Anchor.y}`}
              fill="none"
              stroke={THEME.blue}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <circle cx={c3Anchor.x} cy={c3Anchor.y} r={4} fill={THEME.blue} />
            <circle
              cx={c3Anchor.x}
              cy={c3Anchor.y}
              r={7}
              fill="none"
              stroke={THEME.blue}
              strokeWidth={1.5}
              opacity={0.3 + 0.4 * anchorPulse}
            />
          </g>
        )}

        {/* 4. Leader Line 4: DENSITY ALLOCATION & HOURLY SUB-STRUCTURE (R1) */}
        {s4 > 0 && (
          <g opacity={s4}>
            <path
              d={`M ${c4Card.x + 160} ${c4Card.y} L ${c4Card.x + 160} ${c4Anchor.y + 14} L ${c4Anchor.x} ${c4Anchor.y}`}
              fill="none"
              stroke={THEME.violet}
              strokeWidth={1.8}
              strokeDasharray="4 3"
              opacity={0.75}
            />
            <circle cx={c4Anchor.x} cy={c4Anchor.y} r={4} fill={THEME.violet} />
            <circle
              cx={c4Anchor.x}
              cy={c4Anchor.y}
              r={7}
              fill="none"
              stroke={THEME.violet}
              strokeWidth={1.5}
              opacity={0.3 + 0.4 * anchorPulse}
            />
          </g>
        )}

        {/* 5. Leader Line 5: CLOCK REFERENCES (R3) */}
        {s5 > 0 && (
          <g opacity={s5}>
            <path
              d={`M ${c5Card.x + 140} ${c5Card.y} L ${c5Card.x + 140} ${c5Anchor.y + 14} L ${c5Anchor.x} ${c5Anchor.y}`}
              fill="none"
              stroke={THEME.emerald}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.75}
            />
            <circle cx={c5Anchor.x} cy={c5Anchor.y} r={4} fill={THEME.emerald} />
            <circle
              cx={c5Anchor.x}
              cy={c5Anchor.y}
              r={7}
              fill="none"
              stroke={THEME.emerald}
              strokeWidth={1.5}
              opacity={0.3 + 0.4 * anchorPulse}
            />
          </g>
        )}
      </svg>

      {/* ========================================================= */}
      {/* RESTRAINED HIGHLIGHT PILLS & BADGES                        */}
      {/* ========================================================= */}

      {/* 1. OVERVIEW (YEARLY) */}
      <div
        style={{
          position: 'absolute',
          left: c1Card.x,
          top: c1Card.y,
          width: c1Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: '1.5px solid rgba(15, 23, 42, 0.12)',
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.04)',
          padding: '8px 12px',
          boxSizing: 'border-box',
          opacity: s1,
          transform: `translateY(${(1 - s1) * 6}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10.5,
              fontWeight: 850,
              letterSpacing: 0.8,
              color: THEME.navy,
            }}
          >
            OVERVIEW
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 650,
              color: THEME.textMuted,
              fontFamily: MONO_FONT,
            }}
          >
            (12 MONTHS)
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: THEME.textSecondary, fontWeight: 550 }}>
          Complete yearly temporal range situated above.
        </div>
      </div>

      {/* 2. SELECT [ JULY ] */}
      <div
        style={{
          position: 'absolute',
          left: c2Card.x,
          top: c2Card.y,
          width: c2Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: `1.5px solid ${THEME.tueRedBorder}`,
          boxShadow: '0 3px 12px rgba(200, 16, 46, 0.06)',
          padding: '8px 12px',
          boxSizing: 'border-box',
          opacity: s2,
          transform: `translateY(${(1 - s2) * 6}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10.5,
              fontWeight: 850,
              letterSpacing: 0.8,
              color: THEME.tueRed,
            }}
          >
            SELECT [ JULY ]
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 9,
              fontWeight: 750,
              color: THEME.tueRed,
              backgroundColor: THEME.tueRedBg,
              padding: '1px 5px',
              borderRadius: 3,
            }}
          >
            MONTH FOCUS
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: THEME.textSecondary, fontWeight: 550 }}>
          Domain of interest defined directly in context.
        </div>
      </div>

      {/* R5a CONNECTOR BADGE (Between Year and Month) */}
      <div
        style={{
          position: 'absolute',
          left: r5aPos.x,
          top: r5aPos.y,
          background: '#ffffff',
          borderRadius: 6,
          border: '1.5px solid rgba(15, 23, 42, 0.14)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          opacity: sR5a,
          transform: `translateX(-50%) translateY(${(1 - sR5a) * 6}px)`,
          zIndex: 45,
        }}
      >
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 9.5,
            fontWeight: 900,
            color: '#0f172a',
            backgroundColor: 'rgba(15, 23, 42, 0.08)',
            padding: '1px 5px',
            borderRadius: 3,
          }}
        >
          R5a
        </span>
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 10,
            fontWeight: 750,
            color: THEME.navy,
            letterSpacing: 0.5,
          }}
        >
          OVERVIEW + FOCUS PERSISTENCE
        </span>
      </div>

      {/* 3. ADAPTIVE GRANULARITY (Left side) */}
      <div
        style={{
          position: 'absolute',
          left: c3Card.x,
          top: c3Card.y,
          width: c3Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: `1.5px solid ${THEME.blueBorder}`,
          boxShadow: '0 3px 12px rgba(37, 99, 235, 0.06)',
          padding: '8px 10px',
          boxSizing: 'border-box',
          opacity: s3,
          transform: `translateY(${(1 - s3) * 6}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10.5,
              fontWeight: 850,
              letterSpacing: 0.8,
              color: THEME.blue,
            }}
          >
            MONTH DETAIL
          </span>
        </div>
        <div style={{ fontSize: 11, color: THEME.textSecondary, fontWeight: 550, lineHeight: 1.3 }}>
          July expands into 31 daily intervals with DBTA active allocation.
        </div>
      </div>

      {/* 5. CLOCK-TIME REFERENCES (R3) - Bottom Left */}
      <div
        style={{
          position: 'absolute',
          left: c5Card.x,
          top: c5Card.y,
          width: c5Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: '1.5px solid rgba(5, 150, 105, 0.25)',
          boxShadow: '0 3px 12px rgba(5, 150, 105, 0.05)',
          padding: '8px 12px',
          boxSizing: 'border-box',
          opacity: s5,
          transform: `translateY(${(1 - s5) * 6}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10.5,
              fontWeight: 850,
              letterSpacing: 0.8,
              color: THEME.emerald,
            }}
          >
            CALENDAR TICKS
          </span>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 9.5,
              fontWeight: 850,
              color: THEME.emerald,
              backgroundColor: THEME.emeraldBg,
              padding: '1px 5px',
              borderRadius: 3,
            }}
          >
            R3
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: THEME.textSecondary, fontWeight: 550 }}>
          Calendar day labels and clock references remain explicit.
        </div>
      </div>

      {/* 4. DENSITY ALLOCATION & HOURLY SHIFT (R1) - Bottom Center/Right */}
      <div
        style={{
          position: 'absolute',
          left: c4Card.x,
          top: c4Card.y,
          width: c4Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: '1.5px solid rgba(124, 58, 237, 0.25)',
          boxShadow: '0 3px 12px rgba(124, 58, 237, 0.06)',
          padding: '8px 12px',
          boxSizing: 'border-box',
          opacity: s4,
          transform: `translateY(${(1 - s4) * 6}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10.5,
                fontWeight: 850,
                letterSpacing: 0.8,
                color: THEME.violet,
              }}
            >
              EXTRA SPACE → HOURLY GRANULARITY
            </span>
          </div>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 9.5,
              fontWeight: 850,
              color: THEME.violet,
              backgroundColor: THEME.violetBg,
              padding: '1px 5px',
              borderRadius: 3,
            }}
          >
            R1
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: THEME.textSecondary, fontWeight: 550 }}>
          DBTA expands dense Day 14; with extra space, that day resolves its 24h hourly sub-structure.
        </div>
      </div>
    </div>
  );
};
