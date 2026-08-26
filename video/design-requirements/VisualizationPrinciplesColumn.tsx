import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Layers, Network, ShieldCheck, Sparkles } from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DESIGN_COLORS } from './data';

interface ColumnProps {
  startFrame: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const VisualizationPrinciplesColumn: React.FC<ColumnProps> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerSpring = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const opacity = interpolate(containerSpring, [0, 1], [0, 1], clamp);
  const translateY = interpolate(containerSpring, [0, 1], [24, 0], clamp);

  const item1Spring = spring({ frame: frame - (startFrame + 10), fps, config: { damping: 18, stiffness: 140 } });
  const item2Spring = spring({ frame: frame - (startFrame + 22), fps, config: { damping: 18, stiffness: 140 } });
  const item3Spring = spring({ frame: frame - (startFrame + 34), fps, config: { damping: 18, stiffness: 140 } });

  return (
    <div
      style={{
        width: 588,
        height: 380,
        backgroundColor: DESIGN_COLORS.cardBg,
        borderRadius: 16,
        border: `1.5px solid ${DESIGN_COLORS.cardBorder}`,
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.04)',
        padding: '22px 24px 20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        opacity,
        transform: `translateY(${translateY}px)`,
        fontFamily: FONT_FAMILY,
        position: 'relative',
      }}
    >
      {/* Column Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: DESIGN_COLORS.principles.accentLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: DESIGN_COLORS.principles.accentDark,
            }}
          >
            <Sparkles size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.6,
                color: DESIGN_COLORS.principles.badgeText,
                fontFamily: MONO_FONT,
                textTransform: 'uppercase',
              }}
            >
              Stream 03
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 21,
                fontWeight: 900,
                color: DESIGN_COLORS.textPrimary,
                letterSpacing: -0.4,
              }}
            >
              VISUALIZATION PRINCIPLES
            </h2>
          </div>
        </div>

        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: DESIGN_COLORS.principles.badgeText,
            backgroundColor: DESIGN_COLORS.principles.badge,
            padding: '5px 13px',
            borderRadius: 99,
          }}
        >
          Design Foundations
        </span>
      </div>

      {/* 3 Visual Miniatures */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, flex: 1 }}>
        {/* Miniature 1: OVERVIEW + DETAIL */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '14px 10px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: interpolate(item1Spring, [0, 1], [0, 1], clamp),
            transform: `translateY(${interpolate(item1Spring, [0, 1], [10, 0], clamp)}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={14} color="#0284c7" />
            <span style={{ fontSize: 12, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.2 }}>
              OVERVIEW + DETAIL
            </span>
          </div>

          {/* Glyph Visual: Overview track + Zoom Projection -> Detail box */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 160 90">
              {/* Macro overview track (top) */}
              <line x1="12" y1="20" x2="148" y2="20" stroke="#94a3b8" strokeWidth="2.8" strokeLinecap="round" />
              {/* Selected Window Bracket on overview */}
              <rect x="56" y="11" width="48" height="18" rx="4" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />

              {/* Projection Lines */}
              <line x1="56" y1="29" x2="28" y2="48" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="104" y1="29" x2="132" y2="48" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="3 3" />

              {/* Expanded Detail Box (bottom) */}
              <rect x="28" y="48" width="104" height="30" rx="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />
              {/* Detail internal events */}
              <circle cx="48" cy="63" r="3.5" fill="#16a34a" />
              <circle cx="64" cy="63" r="4.2" fill="#16a34a" />
              <circle cx="80" cy="63" r="4.8" fill="#16a34a" />
              <circle cx="96" cy="63" r="4.2" fill="#16a34a" />
              <circle cx="112" cy="63" r="3.5" fill="#16a34a" />
            </svg>
          </div>

          <div style={{ fontSize: 11, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Macro + micro context
          </div>
        </div>

        {/* Miniature 2: SPATIAL STABILITY */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '14px 10px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: interpolate(item2Spring, [0, 1], [0, 1], clamp),
            transform: `translateY(${interpolate(item2Spring, [0, 1], [10, 0], clamp)}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} color="#0369a1" />
            <span style={{ fontSize: 12, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.2 }}>
              SPATIAL STABILITY
            </span>
          </div>

          {/* Glyph Visual: Unmoving fixed spatial anchor points */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 160 90">
              {/* Coordinate Grid Box */}
              <rect x="16" y="14" width="128" height="62" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.4" strokeDasharray="4 4" />
              
              {/* Center Lock Badge */}
              <rect x="46" y="20" width="68" height="20" rx="5" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="1.4" />
              <text x="80" y="34" textAnchor="middle" fontSize="10" fill="#0369a1" fontFamily={MONO_FONT} fontWeight="900">
                FIXED (X, Y)
              </text>

              {/* Stable Anchor Dots around the grid */}
              <circle cx="32" cy="30" r="4.5" fill="#0284c7" />
              <circle cx="128" cy="30" r="4.5" fill="#0284c7" />
              <circle cx="42" cy="60" r="5.5" fill="#0284c7" />
              <circle cx="80" cy="62" r="6" fill="#0284c7" />
              <circle cx="118" cy="60" r="5.5" fill="#0284c7" />
            </svg>
          </div>

          <div style={{ fontSize: 11, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Unwarped coordinates
          </div>
        </div>

        {/* Miniature 3: COORDINATED VIEWS */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '14px 10px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: interpolate(item3Spring, [0, 1], [0, 1], clamp),
            transform: `translateY(${interpolate(item3Spring, [0, 1], [10, 0], clamp)}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Network size={14} color="#0284c7" />
            <span style={{ fontSize: 12, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.2 }}>
              COORDINATED VIEWS
            </span>
          </div>

          {/* Glyph Visual: [ Timeline ] <-> [ Map ] linked selection */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 160 90">
              {/* Timeline View Chip */}
              <rect x="12" y="22" width="56" height="38" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
              <text x="40" y="38" textAnchor="middle" fontSize="10" fontWeight="900" fill="#6d28d9" fontFamily={MONO_FONT}>
                TIME
              </text>
              <line x1="20" y1="48" x2="60" y2="48" stroke="#8b5cf6" strokeWidth="2.2" />

              {/* Linking Sync Arrow */}
              <path d="M 74 41 L 90 41 M 78 36 L 74 41 L 78 46 M 86 36 L 90 41 L 86 46" stroke="#0284c7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

              {/* Map View Chip */}
              <rect x="96" y="22" width="56" height="38" rx="6" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
              <text x="124" y="38" textAnchor="middle" fontSize="10" fontWeight="900" fill="#0369a1" fontFamily={MONO_FONT}>
                MAP
              </text>
              <circle cx="114" cy="48" r="3.5" fill="#0284c7" />
              <circle cx="132" cy="48" r="3.5" fill="#0284c7" />

              <text x="80" y="76" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily={FONT_FAMILY} fontWeight="700">
                Shared selection
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 11, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Unified cross-view state
          </div>
        </div>
      </div>
    </div>
  );
};
