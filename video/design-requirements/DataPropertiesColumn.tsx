import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Activity, Clock, Database, MapPin } from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DESIGN_COLORS } from './data';

interface ColumnProps {
  startFrame: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const DataPropertiesColumn: React.FC<ColumnProps> = ({ startFrame }) => {
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
              backgroundColor: DESIGN_COLORS.data.accentLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: DESIGN_COLORS.data.accentDark,
            }}
          >
            <Database size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.6,
                color: DESIGN_COLORS.data.badgeText,
                fontFamily: MONO_FONT,
                textTransform: 'uppercase',
              }}
            >
              Stream 02
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
              DATA PROPERTIES
            </h2>
          </div>
        </div>

        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: DESIGN_COLORS.data.badgeText,
            backgroundColor: DESIGN_COLORS.data.badge,
            padding: '5px 13px',
            borderRadius: 99,
          }}
        >
          Spatiotemporal
        </span>
      </div>

      {/* 3 Visual Miniatures */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, flex: 1 }}>
        {/* Miniature 1: UNEVEN ACTIVITY */}
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
            <Activity size={14} color="#ea580c" />
            <span style={{ fontSize: 12, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.3 }}>
              UNEVEN ACTIVITY
            </span>
          </div>

          {/* Glyph Visual: Spark histogram with spike burst */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 160 90">
              {/* Baseline */}
              <line x1="10" y1="65" x2="150" y2="65" stroke="#cbd5e1" strokeWidth="2.2" />

              {/* Spark Histogram Bars */}
              {[
                { x: 16, h: 12, burst: false },
                { x: 32, h: 20, burst: false },
                { x: 48, h: 16, burst: false },
                { x: 64, h: 48, burst: true },
                { x: 80, h: 56, burst: true },
                { x: 96, h: 42, burst: true },
                { x: 112, h: 18, burst: false },
                { x: 128, h: 10, burst: false },
              ].map((bar, i) => (
                <rect
                  key={i}
                  x={bar.x}
                  y={65 - bar.h}
                  width="12"
                  height={bar.h}
                  rx="3.5"
                  fill={bar.burst ? '#ef4444' : '#94a3b8'}
                />
              ))}

              {/* Burst Annotation */}
              <text x="80" y="8" textAnchor="middle" fontSize="9.5" fill="#ef4444" fontFamily={MONO_FONT} fontWeight="900">
                DENSE BURST
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 11, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Bursty & sparse periods
          </div>
        </div>

        {/* Miniature 2: TIME */}
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
            <Clock size={14} color="#d97706" />
            <span style={{ fontSize: 13, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.6 }}>
              TIME
            </span>
          </div>

          {/* Glyph Visual: 12 --- 14 --- 16 Time axis */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 160 90">
              {/* Linear time axis line */}
              <line x1="14" y1="40" x2="146" y2="40" stroke="#d97706" strokeWidth="2.8" strokeLinecap="round" />
              
              {/* Tick 12:00 */}
              <line x1="28" y1="31" x2="28" y2="49" stroke="#d97706" strokeWidth="2.8" />
              <text x="28" y="68" textAnchor="middle" fontSize="11" fontWeight="900" fill="#92400e" fontFamily={MONO_FONT}>
                12:00
              </text>

              {/* Tick 14:00 */}
              <line x1="80" y1="28" x2="80" y2="52" stroke="#d97706" strokeWidth="3.2" />
              <text x="80" y="68" textAnchor="middle" fontSize="11" fontWeight="900" fill="#92400e" fontFamily={MONO_FONT}>
                14:00
              </text>

              {/* Tick 16:00 */}
              <line x1="132" y1="31" x2="132" y2="49" stroke="#d97706" strokeWidth="2.8" />
              <text x="132" y="68" textAnchor="middle" fontSize="11" fontWeight="900" fill="#92400e" fontFamily={MONO_FONT}>
                16:00
              </text>

              {/* Time arrow */}
              <path d="M 140 40 L 146 40 L 142 36" stroke="#d97706" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{ fontSize: 11, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Continuous timestamps
          </div>
        </div>

        {/* Miniature 3: SPACE */}
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
            <MapPin size={14} color="#ea580c" />
            <span style={{ fontSize: 13, fontWeight: 900, color: DESIGN_COLORS.textPrimary, letterSpacing: 0.6 }}>
              SPACE
            </span>
          </div>

          {/* Glyph Visual: Abstract 2D map with scattered incident dots */}
          <div style={{ width: '100%', height: 120, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="90" viewBox="0 0 160 90">
              {/* Abstract Map Boundary Shape */}
              <path
                d="M 28 18 C 52 14, 100 16, 136 22 C 142 40, 140 60, 128 72 C 98 78, 50 74, 30 66 C 20 54, 24 34, 28 18 Z"
                fill="rgba(245, 158, 11, 0.08)"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Geo Event Points */}
              <circle cx="54" cy="36" r="4" fill="#f59e0b" />
              <circle cx="72" cy="48" r="4.6" fill="#f59e0b" />
              <circle cx="90" cy="34" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1.6" />
              <circle cx="102" cy="44" r="5.2" fill="#ef4444" stroke="#ffffff" strokeWidth="1.6" />
              <circle cx="114" cy="54" r="4" fill="#f59e0b" />
              <circle cx="46" cy="56" r="3.5" fill="#f59e0b" />

              <text x="80" y="80" textAnchor="middle" fontSize="9.5" fill="#64748b" fontFamily={FONT_FAMILY} fontWeight="700">
                (x, y) coordinates
              </text>
            </svg>
          </div>

          <div style={{ fontSize: 11, color: DESIGN_COLORS.textSecondary, textAlign: 'center', fontWeight: 600 }}>
            Fixed geographic space
          </div>
        </div>
      </div>
    </div>
  );
};
