import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Compass, Eye, GitCompare, Search } from 'lucide-react';
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

      {/* 3 Visual Miniatures */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, flex: 1 }}>
        {/* Miniature 1: OVERVIEW */}
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
            <Eye size={14} color="#6366f1" />
            <span style={{ fontSize: 13, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.6 }}>
              OVERVIEW
            </span>
          </div>

          {/* Glyph Visual: Full temporal range with activity dots */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 160 90">
              {/* Baseline Track */}
              <line x1="10" y1="45" x2="150" y2="45" stroke="#cbd5e1" strokeWidth="3.2" strokeLinecap="round" />
              {/* Start & End ticks */}
              <line x1="10" y1="34" x2="10" y2="56" stroke="#94a3b8" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="150" y1="34" x2="150" y2="56" stroke="#94a3b8" strokeWidth="2.8" strokeLinecap="round" />
              
              {/* Activity event dots scattered across time */}
              {[
                { x: 26, y: 45, r: 4.2 },
                { x: 44, y: 45, r: 4.2 },
                { x: 72, y: 45, r: 6, active: true },
                { x: 84, y: 45, r: 6.5, active: true },
                { x: 94, y: 45, r: 6, active: true },
                { x: 108, y: 45, r: 4.2 },
                { x: 134, y: 45, r: 4.2 },
              ].map((dot, i) => (
                <circle
                  key={i}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.r}
                  fill={dot.active ? '#6366f1' : '#64748b'}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              ))}

              <text x="80" y="74" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily={FONT_FAMILY} fontWeight="700">
                Full temporal range
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 11, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Macro baseline pattern
          </div>
        </div>

        {/* Miniature 2: INSPECT */}
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
            <Search size={14} color="#4338ca" />
            <span style={{ fontSize: 13, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.6 }}>
              INSPECT
            </span>
          </div>

          {/* Glyph Visual: Target region highlighted with zoom bracket and arrow */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 160 90">
              {/* Baseline Track */}
              <line x1="10" y1="40" x2="150" y2="40" stroke="#cbd5e1" strokeWidth="3.2" strokeLinecap="round" />
              
              {/* Highlighted Window Bracket */}
              <rect x="54" y="24" width="52" height="32" rx="6" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="2.2" />
              
              {/* Highlighted internal events */}
              <circle cx="66" cy="40" r="4.5" fill="#4338ca" />
              <circle cx="80" cy="40" r="6" fill="#4338ca" />
              <circle cx="94" cy="40" r="5" fill="#4338ca" />
              <circle cx="26" cy="40" r="3.2" fill="#94a3b8" />
              <circle cx="134" cy="40" r="3.2" fill="#94a3b8" />

              {/* Inspection Pointer Arrow */}
              <path d="M 80 74 L 80 60 M 74 66 L 80 60 L 86 66" stroke="#6366f1" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

              <text x="80" y="85" textAnchor="middle" fontSize="9.5" fill="#4338ca" fontFamily={MONO_FONT} fontWeight="900">
                FOCUS
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 11, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Isolate target burst
          </div>
        </div>

        {/* Miniature 3: COMPARE */}
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
            <GitCompare size={14} color="#6366f1" />
            <span style={{ fontSize: 13, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.6 }}>
              COMPARE
            </span>
          </div>

          {/* Glyph Visual: Two slices side-by-side with compare arrows */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 160 90">
              {/* Slice A */}
              <rect x="18" y="16" width="46" height="42" rx="7" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2.2" />
              <text x="41" y="34" textAnchor="middle" fontSize="12" fontWeight="900" fill="#6d28d9" fontFamily={MONO_FONT}>
                T₁
              </text>
              <circle cx="31" cy="47" r="3.5" fill="#6d28d9" />
              <circle cx="49" cy="47" r="3.5" fill="#6d28d9" />

              {/* Comparison Arrow */}
              <path d="M 70 37 L 90 37 M 75 32 L 70 37 L 75 42 M 85 32 L 90 37 L 85 42" stroke="#6366f1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

              {/* Slice B */}
              <rect x="96" y="16" width="46" height="42" rx="7" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2.2" />
              <text x="119" y="34" textAnchor="middle" fontSize="12" fontWeight="900" fill="#6d28d9" fontFamily={MONO_FONT}>
                T₂
              </text>
              <circle cx="109" cy="47" r="3.5" fill="#6d28d9" />
              <circle cx="127" cy="47" r="3.5" fill="#6d28d9" />

              <text x="80" y="74" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily={FONT_FAMILY} fontWeight="700">
                Side-by-side
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 11, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Cross-interval evaluation
          </div>
        </div>
      </div>
    </div>
  );
};
