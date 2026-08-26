import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Compass, Eye, GitCompare, MousePointerClick, Search } from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DESIGN_COLORS } from './data';

interface ColumnProps {
  startFrame: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const AnalyticalTasksColumn: React.FC<ColumnProps> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerSpring = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const opacity = interpolate(containerSpring, [0, 1], [0, 1], clamp);
  const translateY = interpolate(containerSpring, [0, 1], [24, 0], clamp);

  const item1Spring = spring({ frame: frame - (startFrame + 8), fps, config: { damping: 18, stiffness: 140 } });
  const item2Spring = spring({ frame: frame - (startFrame + 18), fps, config: { damping: 18, stiffness: 140 } });
  const item3Spring = spring({ frame: frame - (startFrame + 28), fps, config: { damping: 18, stiffness: 140 } });
  const item4Spring = spring({ frame: frame - (startFrame + 38), fps, config: { damping: 18, stiffness: 140 } });

  return (
    <div
      style={{
        width: 588,
        height: 380,
        backgroundColor: DESIGN_COLORS.cardBg,
        borderRadius: 16,
        border: `1.5px solid ${DESIGN_COLORS.cardBorder}`,
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.04)',
        padding: '22px 20px 20px',
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
              backgroundColor: DESIGN_COLORS.tasks.accentLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: DESIGN_COLORS.tasks.accent,
            }}
          >
            <Compass size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.6,
                color: DESIGN_COLORS.tasks.accentDark,
                fontFamily: MONO_FONT,
                textTransform: 'uppercase',
              }}
            >
              Stream 01
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
              ANALYTICAL TASKS
            </h2>
          </div>
        </div>

        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: DESIGN_COLORS.tasks.badgeText,
            backgroundColor: DESIGN_COLORS.tasks.badge,
            padding: '5px 13px',
            borderRadius: 99,
          }}
        >
          Workflow Needs
        </span>
      </div>

      {/* 4 Visual Miniatures */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flex: 1 }}>
        {/* Miniature 1: OVERVIEW */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '12px 6px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: interpolate(item1Spring, [0, 1], [0, 1], clamp),
            transform: `translateY(${interpolate(item1Spring, [0, 1], [10, 0], clamp)}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Eye size={13} color="#6366f1" />
            <span style={{ fontSize: 11.5, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.4 }}>
              OVERVIEW
            </span>
          </div>

          {/* Glyph Visual: Full temporal range with activity dots */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 120 90">
              {/* Baseline Track */}
              <line x1="8" y1="45" x2="112" y2="45" stroke="#cbd5e1" strokeWidth="2.4" strokeLinecap="round" />
              {/* Start & End ticks */}
              <line x1="8" y1="36" x2="8" y2="54" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="112" y1="36" x2="112" y2="54" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" />
              
              {/* Activity event dots scattered across time */}
              {[
                { x: 20, y: 45, r: 3.2 },
                { x: 34, y: 45, r: 3.2 },
                { x: 54, y: 45, r: 4.8, active: true },
                { x: 64, y: 45, r: 5.2, active: true },
                { x: 72, y: 45, r: 4.8, active: true },
                { x: 88, y: 45, r: 3.2 },
                { x: 100, y: 45, r: 3.2 },
              ].map((dot, i) => (
                <circle
                  key={i}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.r}
                  fill={dot.active ? '#6366f1' : '#64748b'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              ))}

              <text x="60" y="74" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily={FONT_FAMILY} fontWeight="700">
                Full temporal range
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 10, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Macro baseline
          </div>
        </div>

        {/* Miniature 2: SELECT */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '12px 6px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: interpolate(item2Spring, [0, 1], [0, 1], clamp),
            transform: `translateY(${interpolate(item2Spring, [0, 1], [10, 0], clamp)}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <MousePointerClick size={13} color="#4f46e5" />
            <span style={{ fontSize: 11.5, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.4 }}>
              SELECT
            </span>
          </div>

          {/* Glyph Visual: Interactive brush window selection */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 120 90">
              {/* Baseline Track */}
              <line x1="8" y1="45" x2="112" y2="45" stroke="#cbd5e1" strokeWidth="2.4" strokeLinecap="round" />
              
              {/* Unselected outside dots */}
              <circle cx="16" cy="45" r="2.8" fill="#94a3b8" />
              <circle cx="28" cy="45" r="2.8" fill="#94a3b8" />
              <circle cx="92" cy="45" r="2.8" fill="#94a3b8" />
              <circle cx="104" cy="45" r="2.8" fill="#94a3b8" />

              {/* Brush Bracket Selection Window */}
              <rect x="38" y="24" width="44" height="42" rx="5" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="1.8" strokeDasharray="3 2" />
              
              {/* Selected Events */}
              <circle cx="48" cy="45" r="3.8" fill="#4f46e5" />
              <circle cx="60" cy="45" r="4.6" fill="#4f46e5" />
              <circle cx="72" cy="45" r="3.8" fill="#4f46e5" />

              {/* Brush Handles */}
              <line x1="38" y1="32" x2="38" y2="58" stroke="#6366f1" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="82" y1="32" x2="82" y2="58" stroke="#6366f1" strokeWidth="2.8" strokeLinecap="round" />

              <text x="60" y="74" textAnchor="middle" fontSize="9" fill="#4f46e5" fontFamily={FONT_FAMILY} fontWeight="800">
                Brush interval
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 10, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Subset query
          </div>
        </div>

        {/* Miniature 3: INSPECT */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '12px 6px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: interpolate(item3Spring, [0, 1], [0, 1], clamp),
            transform: `translateY(${interpolate(item3Spring, [0, 1], [10, 0], clamp)}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Search size={13} color="#4338ca" />
            <span style={{ fontSize: 11.5, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.4 }}>
              INSPECT
            </span>
          </div>

          {/* Glyph Visual: Target region highlighted with zoom bracket and arrow */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 120 90">
              {/* Baseline Track */}
              <line x1="8" y1="40" x2="112" y2="40" stroke="#cbd5e1" strokeWidth="2.4" strokeLinecap="round" />
              
              {/* Highlighted Window Bracket */}
              <rect x="36" y="24" width="48" height="32" rx="6" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="2" />
              
              {/* Highlighted internal events */}
              <circle cx="48" cy="40" r="4" fill="#4338ca" />
              <circle cx="60" cy="40" r="5.2" fill="#4338ca" />
              <circle cx="72" cy="40" r="4.2" fill="#4338ca" />
              <circle cx="18" cy="40" r="2.8" fill="#94a3b8" />
              <circle cx="102" cy="40" r="2.8" fill="#94a3b8" />

              {/* Inspection Pointer Arrow */}
              <path d="M 60 72 L 60 60 M 55 65 L 60 60 L 65 65" stroke="#6366f1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

              <text x="60" y="84" textAnchor="middle" fontSize="9" fill="#4338ca" fontFamily={MONO_FONT} fontWeight="900">
                FOCUS
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 10, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Target detail
          </div>
        </div>

        {/* Miniature 4: COMPARE */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '12px 6px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: interpolate(item4Spring, [0, 1], [0, 1], clamp),
            transform: `translateY(${interpolate(item4Spring, [0, 1], [10, 0], clamp)}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <GitCompare size={13} color="#6366f1" />
            <span style={{ fontSize: 11.5, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.4 }}>
              COMPARE
            </span>
          </div>

          {/* Glyph Visual: Two slices side-by-side with compare arrows */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 120 90">
              {/* Slice A */}
              <rect x="10" y="18" width="36" height="38" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.8" />
              <text x="28" y="34" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#6d28d9" fontFamily={MONO_FONT}>
                T₁
              </text>
              <circle cx="20" cy="46" r="3" fill="#6d28d9" />
              <circle cx="36" cy="46" r="3" fill="#6d28d9" />

              {/* Comparison Arrow */}
              <path d="M 52 37 L 68 37 M 56 33 L 52 37 L 56 41 M 64 33 L 68 37 L 64 41" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

              {/* Slice B */}
              <rect x="74" y="18" width="36" height="38" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.8" />
              <text x="92" y="34" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#6d28d9" fontFamily={MONO_FONT}>
                T₂
              </text>
              <circle cx="84" cy="46" r="3" fill="#6d28d9" />
              <circle cx="100" cy="46" r="3" fill="#6d28d9" />

              <text x="60" y="74" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily={FONT_FAMILY} fontWeight="700">
                Side-by-side
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 10, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Cross-interval
          </div>
        </div>
      </div>
    </div>
  );
};
