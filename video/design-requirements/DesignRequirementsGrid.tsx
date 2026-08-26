import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  ArrowRight,
  Clock,
  Layers,
  Link,
  MapPin,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DESIGN_COLORS, REQUIREMENTS_DATA } from './data';

interface RequirementsGridProps {
  startFrame: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const ICONS_MAP: Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Maximize2,
  ArrowRight,
  Clock,
  MapPin,
  Layers,
  Link,
};

export const DesignRequirementsGrid: React.FC<RequirementsGridProps> = ({ startFrame }) => {
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
      {/* Central Requirements Tier Header */}
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
        <div style={{ width: 80, height: 2, background: 'linear-gradient(90deg, transparent, #4f46e5)' }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 20px',
            borderRadius: 99,
            background: '#eef2ff',
            border: '1.5px solid #c7d2fe',
            boxShadow: '0 2px 12px rgba(79, 70, 229, 0.09)',
          }}
        >
          <Sparkles size={17} color="#4f46e5" strokeWidth={2.6} />
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 900,
              letterSpacing: 2.4,
              color: '#3730a3',
              fontFamily: MONO_FONT,
              textTransform: 'uppercase',
            }}
          >
            DESIGN REQUIREMENTS
          </span>
        </div>
        <div style={{ width: 80, height: 2, background: 'linear-gradient(90deg, #4f46e5, transparent)' }} />
      </div>

      {/* 6 Compact Visual Chips in 2 rows of 3 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
          width: '100%',
        }}
      >
        {REQUIREMENTS_DATA.map((req, index) => {
          const itemSpring = spring({
            frame: frame - (startFrame + 8 + index * 5),
            fps,
            config: { damping: 18, stiffness: 130 },
          });

          const itemOpacity = interpolate(itemSpring, [0, 1], [0, 1], clamp);
          const itemTranslateY = interpolate(itemSpring, [0, 1], [14, 0], clamp);
          const itemScale = interpolate(itemSpring, [0, 1], [0.96, 1], clamp);

          const IconComponent = ICONS_MAP[req.icon] ?? Sparkles;

          return (
            <div
              key={req.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 16,
                padding: '16px 24px 16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.03)',
                opacity: itemOpacity,
                transform: `translateY(${itemTranslateY}px) scale(${itemScale})`,
                position: 'relative',
                overflow: 'hidden',
                minHeight: 92,
                boxSizing: 'border-box',
              }}
            >
              {/* Left Color Accent Bar */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 5.5,
                  backgroundColor: req.accent,
                }}
              />

              {/* Left Content Area: ID + Title + Subtitle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginLeft: 8 }}>
                {/* Chip Badge (R1, R2, etc.) */}
                <div
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 9,
                    padding: '8px 12px',
                    fontFamily: MONO_FONT,
                    fontSize: 15,
                    fontWeight: 900,
                    color: '#1e293b',
                    letterSpacing: 0.5,
                    minWidth: 42,
                    textAlign: 'center',
                  }}
                >
                  {req.id}
                </div>

                <div>
                  {/* Punchy 2-Word Headline */}
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: DESIGN_COLORS.textPrimary,
                      letterSpacing: 0.9,
                      fontFamily: MONO_FONT,
                      textTransform: 'uppercase',
                      lineHeight: 1.15,
                    }}
                  >
                    {req.title}
                  </div>

                  {/* Micro Description */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 650,
                      color: DESIGN_COLORS.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    {req.subtitle}
                  </div>
                </div>
              </div>

              {/* Right Visual Icon Pill */}
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: req.accent,
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <IconComponent size={20} strokeWidth={2.6} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
