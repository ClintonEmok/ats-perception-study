import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ArrowRight, Clock, Eye, Layers, Maximize2, ShieldCheck, Target } from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DESIGN_COLORS, GOALS_DATA } from './data';

interface GoalsRowProps {
  startFrame: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const ICONS = [
  Maximize2,    // Salience
  Clock,        // Referenceability
  ShieldCheck,  // Fidelity
  ArrowRight,   // Order
  Layers,       // Context
];

export const DesignGoalsRow: React.FC<GoalsRowProps> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1], clamp);
  const titleY = interpolate(titleSpring, [0, 1], [14, 0], clamp);

  return (
    <div
      style={{
        width: 1820,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Central Goals Tier Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 14,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div style={{ width: 80, height: 2, background: 'linear-gradient(90deg, transparent, #0d9488)' }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 20px',
            borderRadius: 99,
            background: '#f0fdfa',
            border: '1.5px solid #99f6e4',
            boxShadow: '0 2px 12px rgba(13, 148, 136, 0.09)',
          }}
        >
          <Target size={17} color="#0d9488" strokeWidth={2.6} />
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 900,
              letterSpacing: 2.4,
              color: '#0f766e',
              fontFamily: MONO_FONT,
              textTransform: 'uppercase',
            }}
          >
            DESIGN GOALS
          </span>
        </div>
        <div style={{ width: 80, height: 2, background: 'linear-gradient(90deg, #0d9488, transparent)' }} />
      </div>

      {/* 5 Horizontal Goal Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 18,
          width: '100%',
        }}
      >
        {GOALS_DATA.map((goal, index) => {
          const itemSpring = spring({
            frame: frame - (startFrame + 8 + index * 6),
            fps,
            config: { damping: 18, stiffness: 130 },
          });

          const itemOpacity = interpolate(itemSpring, [0, 1], [0, 1], clamp);
          const itemTranslateY = interpolate(itemSpring, [0, 1], [16, 0], clamp);
          const itemScale = interpolate(itemSpring, [0, 1], [0.95, 1], clamp);

          const IconComponent = ICONS[index];

          return (
            <div
              key={goal.id}
              style={{
                backgroundColor: goal.bg,
                border: `1.5px solid ${goal.border}`,
                borderRadius: 16,
                padding: '18px 20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.03)',
                opacity: itemOpacity,
                transform: `translateY(${itemTranslateY}px) scale(${itemScale})`,
                position: 'relative',
              }}
            >
              {/* Top Accent Icon Pill */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                  border: `1.5px solid ${goal.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: goal.accent,
                  marginBottom: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <IconComponent size={19} strokeWidth={2.6} />
              </div>

              {/* Shorter Primary Term (Bold Hero) */}
              <div
                style={{
                  fontSize: 18.5,
                  fontWeight: 900,
                  color: goal.text,
                  letterSpacing: 1.3,
                  textTransform: 'uppercase',
                  fontFamily: MONO_FONT,
                  lineHeight: 1.1,
                }}
              >
                {goal.short}
              </div>

              {/* Smaller Full Name */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: DESIGN_COLORS.textSecondary,
                  marginTop: 5,
                  lineHeight: 1.2,
                }}
              >
                {goal.name}
              </div>

              {/* Micro Rationale Hint */}
              <div
                style={{
                  fontSize: 11,
                  color: DESIGN_COLORS.textMuted,
                  marginTop: 7,
                  lineHeight: 1.35,
                  fontWeight: 600,
                }}
              >
                {goal.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
