import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, WANG_DURATIONS, WANG_SLICE_NAMES } from './data';

interface WangSnapshotsProps {
  opacity: number;
  translateY: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const WangSnapshots: React.FC<WangSnapshotsProps> = ({ opacity, translateY }) => {
  return (
    <div
      style={{
        width: 1600,
        opacity,
        transform: `translateY(${translateY}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
        userSelect: 'none',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            padding: '4px 12px',
            borderRadius: 999,
          }}
        >
          Resulting Graph Snapshots (Small Multiples)
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: MUTED_TEXT,
          }}
        >
          Each snapshot contains roughly the same number of events (N = 13)
        </span>
      </div>

      {/* 5 Equal-Sized Snapshot Cards */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        {[0, 1, 2, 3, 4].map((idx) => {
          const timeRange = WANG_SLICE_NAMES[idx];
          const duration = WANG_DURATIONS[idx];

          return (
            <div
              key={`snapshot-card-${idx}`}
              style={{
                flex: 1,
                height: 120,
                backgroundColor: '#ffffff',
                border: '1.5px solid rgba(15, 23, 42, 0.15)',
                borderRadius: 10,
                padding: '12px 14px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                position: 'relative',
              }}
            >
              {/* Card Header: Badge & Time */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: MONO_FONT,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 750,
                      fontFamily: MONO_FONT,
                      color: DARK_TEXT,
                    }}
                  >
                    {timeRange}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {duration}
                </span>
              </div>

              {/* Card Body: 13 Evenly Distributed Mini-Dots (Equal Complexity) */}
              <div
                style={{
                  height: 38,
                  backgroundColor: 'rgba(15, 23, 42, 0.03)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  padding: '0 8px',
                  position: 'relative',
                }}
              >
                {Array.from({ length: 13 }).map((_, dotIdx) => (
                  <div
                    key={`mini-dot-${idx}-${dotIdx}`}
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      backgroundColor: '#0f172a',
                      border: '1.5px solid #ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                ))}
              </div>

              {/* Card Footer: Complexity Metric */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  fontFamily: MONO_FONT,
                  color: MUTED_TEXT,
                  fontWeight: 650,
                }}
              >
                <span>Complexity: Balanced</span>
                <span style={{ color: DARK_TEXT, fontWeight: 800 }}>13 events</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
