import React from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  Focus,
  GitCompareArrows,
  Layers,
  LayoutDashboard,
  MapPin,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  SELECTED_HOURLY_COUNTS,
  SELECTED_PEAK_HOUR,
  SELECTED_RECORD_COUNT,
  SELECTED_TOP_CRIME,
  SOURCE_RECORD_COUNT,
} from '../real/data';

const TAB_SPECS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'scan', label: 'STKDE', icon: BarChart3 },
  { id: 'slices', label: 'Slices', icon: Layers },
  { id: 'inspect', label: 'Inspect 3D', icon: Focus },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows },
];

export function RealDashboardRail({
  cubeActive = false,
  warpProgress = 0,
  multiplier = 1,
  activeTabOverride,
}: {
  cubeActive?: boolean;
  warpProgress?: number;
  multiplier?: number;
  activeTabOverride?: string;
}) {
  const activeTab =
    activeTabOverride ??
    (warpProgress > 0.1 ? 'slices' : cubeActive ? 'inspect' : 'overview');

  const warpPercent = Math.round(((multiplier - 1.0) / 1.5) * 100);

  return (
    <aside
      style={{
        width: '100%',
        height: '100%',
        background: '#ffffff',
        color: '#0f172a',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.04)',
      }}
    >
      {/* 1. Header with Collapse Arrow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles style={{ width: 14, height: 14, color: '#2563eb' }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>
            Workflow Rail
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 6,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
          }}
        >
          <ChevronRight style={{ width: 14, height: 14 }} />
        </div>
      </div>

      {/* 2. Tabs List Grid */}
      <div style={{ padding: '10px 12px 0 12px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 2,
            background: '#f1f5f9',
            borderRadius: 8,
            padding: 3,
            border: '1px solid #e2e8f0',
          }}
        >
          {TAB_SPECS.map(({ id, label, icon: Icon }) => {
            const active = id === activeTab;
            return (
              <div
                key={id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 0',
                  borderRadius: 6,
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? '#0f172a' : '#64748b',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                title={label}
              >
                <Icon style={{ width: 14, height: 14 }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Body Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'hidden',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Active Brush Window Card */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 12px',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar style={{ width: 13, height: 13, color: '#2563eb' }} />
              <span style={{ fontSize: 9, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800, fontFamily: MONO_FONT }}>
                ACTIVE BRUSH WINDOW
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, color: '#0f172a' }}>
              Thursday, 31 July 2025
            </div>
            <div style={{ fontSize: 10, color: '#2563eb', marginTop: 2, fontFamily: MONO_FONT, fontWeight: 700 }}>
              00:00 – 24:00 · Synchronized
            </div>
          </div>

          {/* 2x2 Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['INCIDENTS', SOURCE_RECORD_COUNT.toLocaleString(), Activity, '#2563eb'],
              ['SELECTED', SELECTED_RECORD_COUNT.toLocaleString(), Flame, '#dc2626'],
              ['PEAK HOUR', `${String(SELECTED_PEAK_HOUR).padStart(2, '0')}:00`, Clock, '#d97706'],
              ['TOP CRIME', SELECTED_TOP_CRIME, MapPin, '#059669'],
            ].map(([label, value, Icon, accentColor]) => (
              <div
                key={label as string}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon style={{ width: 11, height: 11, color: accentColor as string }} />
                  <span style={{ fontSize: 8.5, color: '#64748b', letterSpacing: 1, fontWeight: 700, fontFamily: MONO_FONT }}>
                    {label as string}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 3, color: '#0f172a' }}>
                  {value as string}
                </div>
              </div>
            ))}
          </div>

          {/* Hourly Distribution Sparkline */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 12px',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 8.5, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800, fontFamily: MONO_FONT }}>
                HOURLY CRIME PULSE
              </span>
              <span style={{ fontSize: 9, color: '#2563eb', fontFamily: MONO_FONT, fontWeight: 700 }}>
                24 Hours
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', height: 42, gap: 2 }}>
              {SELECTED_HOURLY_COUNTS.map((count, idx) => {
                const max = Math.max(...SELECTED_HOURLY_COUNTS);
                const heightPct = Math.max(12, (count / max) * 100);
                const isPeak = idx >= 17 && idx <= 20;

                return (
                  <div
                    key={`pulse-${idx}`}
                    style={{
                      flex: 1,
                      height: `${heightPct}%`,
                      borderRadius: 2,
                      background: isPeak ? '#ef4444' : '#3b82f6',
                      opacity: isPeak ? 1 : 0.65,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Global Warp Controls Card (Matching GlobalWarpControls.tsx) */}
        <div
          style={{
            border: warpProgress > 0.1
              ? '1.5px solid rgba(239, 68, 68, 0.6)'
              : '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '12px 14px',
            background: warpProgress > 0.1
              ? 'rgba(239, 68, 68, 0.04)'
              : '#f8fafc',
            boxShadow: warpProgress > 0.1
              ? '0 0 16px rgba(239, 68, 68, 0.12)'
              : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sliders style={{ width: 13, height: 13, color: warpProgress > 0.1 ? '#dc2626' : '#2563eb' }} />
              <span style={{ fontSize: 9, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800, fontFamily: MONO_FONT }}>
                GLOBAL WARP CONTROL
              </span>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                fontFamily: MONO_FONT,
                color: warpProgress > 0.1 ? '#dc2626' : '#2563eb',
              }}
            >
              {multiplier.toFixed(1)}× ({warpPercent}%)
            </span>
          </div>

          {/* Time Scale Mode Pill Switcher */}
          <div
            style={{
              display: 'flex',
              background: '#e2e8f0',
              borderRadius: 6,
              padding: 2,
              marginTop: 8,
              border: '1px solid #cbd5e1',
            }}
          >
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '4px 0',
                borderRadius: 4,
                fontSize: 9.5,
                fontWeight: 800,
                fontFamily: MONO_FONT,
                background: warpProgress <= 0.1 ? '#ffffff' : 'transparent',
                color: warpProgress <= 0.1 ? '#0f172a' : '#64748b',
                boxShadow: warpProgress <= 0.1 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Linear Mode
            </div>
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '4px 0',
                borderRadius: 4,
                fontSize: 9.5,
                fontWeight: 800,
                fontFamily: MONO_FONT,
                background: warpProgress > 0.1 ? '#ef4444' : 'transparent',
                color: warpProgress > 0.1 ? '#ffffff' : '#64748b',
                boxShadow: warpProgress > 0.1 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Adaptive Warp
            </div>
          </div>

          {/* Warp Slider Track */}
          <div style={{ position: 'relative', height: 6, width: '100%', background: '#e2e8f0', borderRadius: 99, marginTop: 10 }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${((multiplier - 1.0) / 1.5) * 100}%`,
                background: warpProgress > 0.1
                  ? 'linear-gradient(90deg, #3b82f6, #ef4444)'
                  : '#3b82f6',
                borderRadius: 99,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${((multiplier - 1.0) / 1.5) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 14,
                height: 14,
                borderRadius: 99,
                background: '#ffffff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                border: `2px solid ${warpProgress > 0.1 ? '#ef4444' : '#3b82f6'}`,
              }}
            />
          </div>

          {/* Model Mathematical Formula */}
          <div
            style={{
              marginTop: 8,
              padding: '5px 8px',
              borderRadius: 6,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 8.5,
              fontFamily: MONO_FONT,
              color: '#64748b',
            }}
          >
            <span>WARP CONTRACT</span>
            <span style={{ color: '#2563eb', fontWeight: 800 }}>Δt′ = Δt · w(t)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
