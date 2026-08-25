import React from 'react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  SELECTED_PEAK_HOUR,
  SELECTED_RECORD_COUNT,
  SELECTED_TOP_CRIME,
  SOURCE_RECORD_COUNT,
} from '../real/data';

const METRICS = [
  ['INCIDENTS', SOURCE_RECORD_COUNT.toLocaleString()],
  ['SELECTED DAY', SELECTED_RECORD_COUNT.toLocaleString()],
  ['PEAK HOUR', `${String(SELECTED_PEAK_HOUR).padStart(2, '0')}:00`],
  ['TOP CRIME', SELECTED_TOP_CRIME],
];

export function ShowcaseWorkflowRail({
  cubeActive,
  warpProgress,
  multiplier,
}: {
  cubeActive: boolean;
  warpProgress: number;
  multiplier: number;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#ffffff',
        color: '#0f172a',
        padding: 16,
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* 1. Header & Active Window */}
      <div>
        <div
          style={{
            border: '1px solid rgba(15, 23, 42, 0.12)',
            borderRadius: 10,
            padding: 12,
            background: 'rgba(15, 23, 42, 0.02)',
          }}
        >
          <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: 700, fontFamily: MONO_FONT }}>
            ACTIVE BRUSH WINDOW
          </div>
          <div style={{ fontSize: 14, fontWeight: 850, marginTop: 4, color: '#0f172a' }}>
            Thursday, 31 July 2025
          </div>
          <div style={{ fontSize: 10, color: '#2563eb', marginTop: 2, fontFamily: MONO_FONT, fontWeight: 700 }}>
            00:00 – 24:00 · Synchronized
          </div>
        </div>

        {/* 2. Real Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          {METRICS.map(([label, value]) => (
            <div
              key={label}
              style={{
                border: '1px solid rgba(15, 23, 42, 0.1)',
                borderRadius: 8,
                padding: '9px 10px',
                background: '#ffffff',
              }}
            >
              <div style={{ fontSize: 8, color: '#64748b', letterSpacing: 1.2, fontWeight: 700, fontFamily: MONO_FONT }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 850, marginTop: 4, color: '#0f172a' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* 3. Mode Toggle (2D Map / 3D Cube) */}
        <div style={{ marginTop: 12, border: '1px solid rgba(15, 23, 42, 0.12)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1.8, fontWeight: 700, fontFamily: MONO_FONT }}>
            PRIMARY SPATIAL VIEW
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 8,
              padding: 4,
              background: 'rgba(15, 23, 42, 0.04)',
              borderRadius: 8,
            }}
          >
            {['2D MAP', '3D STKDE'].map((label, index) => {
              const active = cubeActive ? index === 1 : index === 0;
              return (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    borderRadius: 6,
                    padding: '6px 4px',
                    textAlign: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    fontFamily: MONO_FONT,
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#2563eb' : '#64748b',
                    boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : undefined,
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Adaptive Visual Allocation Controls */}
      <div>
        <div
          style={{
            border: `1.5px solid ${warpProgress > 0.1 ? '#2563eb' : 'rgba(15, 23, 42, 0.12)'}`,
            background: warpProgress > 0.1 ? 'rgba(37, 99, 235, 0.04)' : '#ffffff',
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1.5, fontWeight: 700, fontFamily: MONO_FONT }}>
                VISUAL ALLOCATION
              </div>
              <div style={{ marginTop: 2, fontSize: 12, fontWeight: 850, color: '#2563eb' }}>
                Adaptive Scaling
              </div>
            </div>
            <div
              style={{
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: 6,
                background: '#ffffff',
                padding: '4px 8px',
                color: '#2563eb',
                fontSize: 13,
                fontWeight: 850,
                fontFamily: MONO_FONT,
              }}
            >
              {multiplier.toFixed(1)}×
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              height: 6,
              marginTop: 12,
              borderRadius: 99,
              background: '#e2e8f0',
            }}
          >
            <div
              style={{
                width: `${20 + warpProgress * 70}%`,
                height: '100%',
                borderRadius: 99,
                background: '#2563eb',
              }}
            />
            <i
              style={{
                position: 'absolute',
                left: `${20 + warpProgress * 70}%`,
                top: '50%',
                width: 12,
                height: 12,
                borderRadius: 99,
                background: '#ffffff',
                border: '2.5px solid #2563eb',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              color: '#64748b',
              fontSize: 8,
              fontFamily: MONO_FONT,
              fontWeight: 700,
            }}
          >
            <span>1.0× (Uniform)</span>
            <span>2.5× (Adaptive)</span>
          </div>
        </div>

        {/* 5. Sync Status Card */}
        <div
          style={{
            marginTop: 10,
            border: '1px solid rgba(22, 163, 74, 0.25)',
            background: 'rgba(22, 163, 74, 0.05)',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i style={{ width: 8, height: 8, borderRadius: 99, background: '#16a34a' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', fontFamily: MONO_FONT }}>
            COORDINATION ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
}
