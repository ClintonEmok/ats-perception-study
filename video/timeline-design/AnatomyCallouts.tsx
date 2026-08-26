import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MONO_FONT } from '../theme';
import { THEME, TIMELINE_LEFT, TIMELINE_WIDTH } from './data';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

interface AnatomyCalloutsProps {
  // Entrance progress for callouts (0 -> 1 during frames 460..540)
  progress: number;
}

export const AnatomyCallouts: React.FC<AnatomyCalloutsProps> = ({ progress }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (progress <= 0) return null;

  // Independent desynchronized floating offsets (2.5px amplitude, periods 5.5s - 7.8s)
  const float1 = Math.sin((frame * 2 * Math.PI) / (6.2 * fps)) * 2.5;
  const float2 = Math.sin(((frame + 45) * 2 * Math.PI) / (5.5 * fps)) * 2.5;
  const float3 = Math.sin(((frame + 90) * 2 * Math.PI) / (7.1 * fps)) * 2.2;
  const float4 = Math.sin(((frame + 135) * 2 * Math.PI) / (6.8 * fps)) * 2.5;
  const float5 = Math.sin(((frame + 180) * 2 * Math.PI) / (7.8 * fps)) * 2.2;

  // Staggered spring entrances for the 5 callouts
  const s1 = spring({ frame: Math.max(0, frame - 450), fps, config: { damping: 18, stiffness: 120 } });
  const s2 = spring({ frame: Math.max(0, frame - 470), fps, config: { damping: 18, stiffness: 120 } });
  const s3 = spring({ frame: Math.max(0, frame - 490), fps, config: { damping: 18, stiffness: 120 } });
  const s4 = spring({ frame: Math.max(0, frame - 510), fps, config: { damping: 18, stiffness: 120 } });
  const s5 = spring({ frame: Math.max(0, frame - 530), fps, config: { damping: 18, stiffness: 120 } });

  // Anchor dot pulse
  const anchorPulse = 0.5 + 0.5 * Math.sin(frame / 12);

  // Geometry Coordinates:
  // Overview top: 220, bottom: 350
  // Detail top: 460, bottom: 620

  // Callout 1 Anchor: Overview month axis (APR area -> x: 300 + 1320 * 0.28 = 670, y: 220)
  const c1Anchor = { x: TIMELINE_LEFT + TIMELINE_WIDTH * 0.26, y: 220 };
  const c1Card = { x: TIMELINE_LEFT + 10, y: 106 + float1, width: 380, height: 68 };

  // Callout 2 Anchor: Overview selection brush [JUL] top edge (x: 300 + 1320 * 0.541 = 1014, y: 220)
  const c2Anchor = { x: TIMELINE_LEFT + TIMELINE_WIDTH * (6.5 / 12), y: 220 };
  const c2Card = { x: TIMELINE_LEFT + TIMELINE_WIDTH * 0.44, y: 106 + float2, width: 420, height: 68 };

  // Callout 3 Anchor: Detail header / resolution switch (x: 300 + 24 = 324, y: 485)
  const c3Anchor = { x: TIMELINE_LEFT + 22, y: 485 };
  const c3Card = { x: 36, y: 456 + float3, width: 244, height: 78 };

  // Callout 4 Anchor: Expanded burst day Jul 05 (x: 300 + 1320 * 0.17 = 524, y: 620)
  const c4Anchor = { x: TIMELINE_LEFT + TIMELINE_WIDTH * 0.168, y: 620 };
  const c4Card = { x: TIMELINE_LEFT + TIMELINE_WIDTH * 0.36, y: 668 + float4, width: 440, height: 68 };

  // Callout 5 Anchor: Detail date reference Jul 01 (x: 300 + 1320 * 0.02 = 326, y: 620)
  const c5Anchor = { x: TIMELINE_LEFT + 26, y: 620 };
  const c5Card = { x: TIMELINE_LEFT + 10, y: 668 + float5, width: 380, height: 68 };

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
        {/* 1. Leader Line 1: Callout 1 -> Overview Track */}
        {s1 > 0 && (
          <g opacity={s1}>
            <path
              d={`M ${c1Card.x + 190} ${c1Card.y + c1Card.height} L ${c1Card.x + 190} ${c1Anchor.y - 12} L ${c1Anchor.x} ${c1Anchor.y}`}
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

        {/* 2. Leader Line 2: Callout 2 -> Selection Window */}
        {s2 > 0 && (
          <g opacity={s2}>
            <path
              d={`M ${c2Card.x + 180} ${c2Card.y + c2Card.height} L ${c2Card.x + 180} ${c2Anchor.y - 12} L ${c2Anchor.x} ${c2Anchor.y}`}
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

        {/* 3. Leader Line 3: Callout 3 -> Detail Granularity Switch */}
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

        {/* 4. Leader Line 4: Callout 4 -> Density-Scaled Burst Days */}
        {s4 > 0 && (
          <g opacity={s4}>
            <path
              d={`M ${c4Card.x + 110} ${c4Card.y} L ${c4Card.x + 110} ${c4Anchor.y + 16} L ${c4Anchor.x} ${c4Anchor.y}`}
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

        {/* 5. Leader Line 5: Callout 5 -> Original Calendar Ticks */}
        {s5 > 0 && (
          <g opacity={s5}>
            <path
              d={`M ${c5Card.x + 140} ${c5Card.y} L ${c5Card.x + 140} ${c5Anchor.y + 16} L ${c5Anchor.x} ${c5Anchor.y}`}
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
      {/* CALLOUT CARDS (HTML Layer for crisp subpixel typography) */}
      {/* ========================================================= */}

      {/* CALLOUT 1: FULL TEMPORAL OVERVIEW (R5a) */}
      <div
        style={{
          position: 'absolute',
          left: c1Card.x,
          top: c1Card.y,
          width: c1Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: '1.5px solid rgba(15, 23, 42, 0.12)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          padding: '10px 14px',
          boxSizing: 'border-box',
          opacity: s1,
          transform: `translateY(${(1 - s1) * 8}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: 9,
                fontWeight: 900,
                fontFamily: MONO_FONT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              1
            </div>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 11,
                fontWeight: 850,
                letterSpacing: 0.8,
                color: THEME.navy,
              }}
            >
              FULL TEMPORAL OVERVIEW
            </span>
          </div>
          {/* Requirement Tag R5a */}
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10,
              fontWeight: 850,
              color: '#0f172a',
              backgroundColor: 'rgba(15, 23, 42, 0.08)',
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid rgba(15, 23, 42, 0.14)',
            }}
          >
            R5a
          </span>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.35, color: THEME.textSecondary, fontWeight: 550 }}>
          Selected focus remains situated within the complete analysis period.
        </div>
      </div>

      {/* CALLOUT 2: TEMPORAL FOCUS */}
      <div
        style={{
          position: 'absolute',
          left: c2Card.x,
          top: c2Card.y,
          width: c2Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: `1.5px solid ${THEME.tueRedBorder}`,
          boxShadow: '0 4px 16px rgba(200, 16, 46, 0.08)',
          padding: '10px 14px',
          boxSizing: 'border-box',
          opacity: s2,
          transform: `translateY(${(1 - s2) * 8}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: THEME.tueRed,
                color: '#ffffff',
                fontSize: 9,
                fontWeight: 900,
                fontFamily: MONO_FONT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              2
            </div>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 11,
                fontWeight: 850,
                letterSpacing: 0.8,
                color: THEME.tueRed,
              }}
            >
              TEMPORAL FOCUS
            </span>
          </div>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 9,
              fontWeight: 700,
              color: THEME.tueRed,
              backgroundColor: THEME.tueRedBg,
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            PRIMARY INTERACTION
          </span>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.35, color: THEME.textSecondary, fontWeight: 550 }}>
          The analyst defines the period to investigate directly through the timeline.
        </div>
      </div>

      {/* CALLOUT 3: ADAPTIVE DETAIL (Left side) */}
      <div
        style={{
          position: 'absolute',
          left: c3Card.x,
          top: c3Card.y,
          width: c3Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: `1.5px solid ${THEME.blueBorder}`,
          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.08)',
          padding: '10px 12px',
          boxSizing: 'border-box',
          opacity: s3,
          transform: `translateY(${(1 - s3) * 8}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: THEME.blue,
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 900,
              fontFamily: MONO_FONT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            3
          </div>
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 11,
              fontWeight: 850,
              letterSpacing: 0.8,
              color: THEME.blue,
            }}
          >
            ADAPTIVE DETAIL
          </span>
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.35, color: THEME.textSecondary, fontWeight: 550 }}>
          Temporal granularity automatically responds to the selected domain scale.
        </div>
      </div>

      {/* CALLOUT 5: ORIGINAL TIME REFERENCE (R3) - Bottom Left */}
      <div
        style={{
          position: 'absolute',
          left: c5Card.x,
          top: c5Card.y,
          width: c5Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: '1.5px solid rgba(5, 150, 105, 0.28)',
          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.06)',
          padding: '10px 14px',
          boxSizing: 'border-box',
          opacity: s5,
          transform: `translateY(${(1 - s5) * 8}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: THEME.emerald,
                color: '#ffffff',
                fontSize: 9,
                fontWeight: 900,
                fontFamily: MONO_FONT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              5
            </div>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 11,
                fontWeight: 850,
                letterSpacing: 0.8,
                color: THEME.emerald,
              }}
            >
              ORIGINAL TIME REFERENCE
            </span>
          </div>
          {/* Requirement Tag R3 */}
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10,
              fontWeight: 850,
              color: THEME.emerald,
              backgroundColor: THEME.emeraldBg,
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid rgba(5, 150, 105, 0.22)',
            }}
          >
            R3
          </span>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.35, color: THEME.textSecondary, fontWeight: 550 }}>
          Clock-time boundaries and calendar dates remain explicitly accessible.
        </div>
      </div>

      {/* CALLOUT 4: DENSITY-SCALED ALLOCATION (R1) - Bottom Center/Right */}
      <div
        style={{
          position: 'absolute',
          left: c4Card.x,
          top: c4Card.y,
          width: c4Card.width,
          background: '#ffffff',
          borderRadius: 8,
          border: '1.5px solid rgba(124, 58, 237, 0.28)',
          boxShadow: '0 4px 16px rgba(124, 58, 237, 0.08)',
          padding: '10px 14px',
          boxSizing: 'border-box',
          opacity: s4,
          transform: `translateY(${(1 - s4) * 8}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: THEME.violet,
                color: '#ffffff',
                fontSize: 9,
                fontWeight: 900,
                fontFamily: MONO_FONT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              4
            </div>
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 11,
                fontWeight: 850,
                letterSpacing: 0.8,
                color: THEME.violet,
              }}
            >
              DENSITY-SCALED ALLOCATION
            </span>
          </div>
          {/* Requirement Tag R1 */}
          <span
            style={{
              fontFamily: MONO_FONT,
              fontSize: 10,
              fontWeight: 850,
              color: THEME.violet,
              backgroundColor: THEME.violetBg,
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid rgba(124, 58, 237, 0.22)',
            }}
          >
            R1
          </span>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.35, color: THEME.textSecondary, fontWeight: 550 }}>
          Within the domain, DBTA allocates more visual room to high-activity intervals.
        </div>
      </div>
    </div>
  );
};
