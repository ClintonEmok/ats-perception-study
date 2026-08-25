import React from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Flame,
  Focus,
  GitCompareArrows,
  Layers,
  LayoutDashboard,
  MapPin,
  Sliders,
} from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
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
];

export function RealDashboardRail({
  cubeActive = false,
  warpProgress = 0,
  multiplier = 1,
}: {
  cubeActive?: boolean;
  warpProgress?: number;
  multiplier?: number;
}) {
  const activeTab = cubeActive ? (warpProgress > 0.1 ? 'slices' : 'inspect') : 'overview';

  return (
    <aside
      style={{
        width: '100%',
        height: '100%',
        background: '#090d16',
        color: '#f8fafc',
        padding: '16px 18px',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* 1. Sidebar Tabs Header */}
      <div>
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: 3,
          }}
        >
          {TAB_SPECS.map(({ id, label, icon: Icon }) => {
            const active = id === activeTab;
            return (
              <div
                key={id}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '6px 2px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 750,
                  fontFamily: FONT_FAMILY,
                  background: active ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: active ? '#38bdf8' : '#64748b',
                  border: active ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon style={{ width: 12, height: 12 }} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        {/* 2. Active Selection Window Card */}
        <div
          style={{
            marginTop: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 10,
            padding: '12px 14px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar style={{ width: 13, height: 13, color: '#38bdf8' }} />
            <span style={{ fontSize: 8.5, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800, fontFamily: MONO_FONT }}>
              ACTIVE BRUSH WINDOW
            </span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 850, marginTop: 4, color: '#f8fafc' }}>
            Thursday, 31 July 2025
          </div>
          <div style={{ fontSize: 10, color: '#38bdf8', marginTop: 2, fontFamily: MONO_FONT, fontWeight: 700 }}>
            00:00 – 24:00 · Synchronized
          </div>
        </div>

        {/* 3. Live Metrics 2x2 Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          {[
            ['INCIDENTS', SOURCE_RECORD_COUNT.toLocaleString(), Activity, '#38bdf8'],
            ['SELECTED DAY', SELECTED_RECORD_COUNT.toLocaleString(), Flame, '#ef4444'],
            ['PEAK HOUR', `${String(SELECTED_PEAK_HOUR).padStart(2, '0')}:00`, Clock, '#f59e0b'],
            ['TOP CRIME', SELECTED_TOP_CRIME, MapPin, '#10b981'],
          ].map(([label, value, Icon, accentColor]) => (
            <div
              key={label as string}
              style={{
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '8px 10px',
                background: 'rgba(15, 23, 42, 0.65)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon style={{ width: 11, height: 11, color: accentColor as string }} />
                <span style={{ fontSize: 8, color: '#94a3b8', letterSpacing: 1, fontWeight: 700, fontFamily: MONO_FONT }}>
                  {label as string}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 850, marginTop: 3, color: '#f8fafc' }}>
                {value as string}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Adaptive Visual Allocation Control Card (Bottom) */}
      <div
        style={{
          border: warpProgress > 0.1
            ? '1.5px solid rgba(239, 68, 68, 0.5)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 10,
          padding: '12px 14px',
          background: warpProgress > 0.1
            ? 'rgba(239, 68, 68, 0.08)'
            : 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          boxShadow: warpProgress > 0.1
            ? '0 0 24px rgba(239, 68, 68, 0.2)'
            : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sliders style={{ width: 13, height: 13, color: warpProgress > 0.1 ? '#ef4444' : '#38bdf8' }} />
            <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800, fontFamily: MONO_FONT }}>
              VISUAL ALLOCATION
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 900,
              fontFamily: MONO_FONT,
              color: warpProgress > 0.1 ? '#ef4444' : '#38bdf8',
            }}
          >
            {multiplier.toFixed(1)}×
          </span>
        </div>

        {/* Warp Slider Track */}
        <div style={{ position: 'relative', height: 6, width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 99, marginTop: 10 }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${((multiplier - 1.0) / 1.5) * 100}%`,
              background: warpProgress > 0.1
                ? 'linear-gradient(90deg, #38bdf8, #ef4444)'
                : '#38bdf8',
              borderRadius: 99,
            }}
          />
          {/* Thumb */}
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
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              border: `2px solid ${warpProgress > 0.1 ? '#ef4444' : '#38bdf8'}`,
            }}
          />
        </div>

        {/* Mathematical Model Formula Badge */}
        <div
          style={{
            marginTop: 10,
            padding: '5px 8px',
            borderRadius: 6,
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 8.5,
            fontFamily: MONO_FONT,
            color: '#94a3b8',
          }}
        >
          <span>WARP MODEL</span>
          <span style={{ color: '#38bdf8', fontWeight: 800 }}>Δt′ = Δt · w(t)</span>
        </div>
      </div>
    </aside>
  );
}
