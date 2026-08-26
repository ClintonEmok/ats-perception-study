import React from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  ChevronRight,
  Focus,
  GitCompareArrows,
  Layers,
  LayoutDashboard,
  Pause,
  RotateCcw,
  X,
} from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DASHBOARD_COLORS } from '../dashboard-demo-showcase/palette';
import { LEFT_EVENTS, RIGHT_EVENTS } from './data';

const TAB_SPECS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'scan', label: 'STKDE', icon: BarChart3 },
  { id: 'slices', label: 'Slices', icon: Layers },
  { id: 'inspect', label: 'Inspect 3D', icon: Focus },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows },
] as const;

export type RailTab = (typeof TAB_SPECS)[number]['id'];

const panelStyle = {
  border: `1px solid ${DASHBOARD_COLORS.border}`,
  borderRadius: 7,
  background: DASHBOARD_COLORS.card,
};

function DeltaBar({
  label,
  left,
  right,
  suffix = '',
}: {
  label: string;
  left: number;
  right: number;
  suffix?: string;
}) {
  const maximum = Math.max(left, right, 1);
  const delta = right - left;

  return (
    <div style={{ ...panelStyle, padding: '6px 8px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: DASHBOARD_COLORS.mutedForeground,
          fontSize: 8,
          letterSpacing: 1.1,
          fontFamily: MONO_FONT,
          fontWeight: 800,
        }}
      >
        <span>{label}</span>
        <span style={{ color: delta > 0 ? '#b45309' : '#0284c7', fontWeight: 850 }}>
          {delta >= 0 ? '▲ +' : '▼ '}
          {Math.abs(delta).toLocaleString()}
          {suffix}
        </span>
      </div>

      {[
        ['Left', left, '#0284c7'],
        ['Right', right, '#b45309'],
      ].map(([name, value, color]) => (
        <div
          key={name as string}
          style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr 44px',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            color: DASHBOARD_COLORS.mutedForeground,
            fontSize: 8,
          }}
        >
          <span style={{ fontWeight: 650 }}>{name as string}</span>
          <div
            style={{
              position: 'relative',
              height: 4,
              borderRadius: 99,
              background: DASHBOARD_COLORS.muted,
            }}
          >
            <div
              style={{
                width: `${(Number(value) / maximum) * 100}%`,
                height: '100%',
                borderRadius: 99,
                background: color as string,
              }}
            />
          </div>
          <span
            style={{
              color: DASHBOARD_COLORS.foreground,
              textAlign: 'right',
              fontFamily: MONO_FONT,
              fontWeight: 750,
              fontSize: 8,
            }}
          >
            {Number(value).toLocaleString()}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

function ComparePanel() {
  const left = LEFT_EVENTS;
  const right = RIGHT_EVENTS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Compare Header with Swap & Clear */}
      <div
        style={{
          borderBottom: `1px solid ${DASHBOARD_COLORS.border}`,
          paddingBottom: 6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              color: DASHBOARD_COLORS.foreground,
              fontSize: 9,
              fontWeight: 850,
              letterSpacing: 1.4,
              fontFamily: MONO_FONT,
            }}
          >
            COMPARE SLICES
          </div>
          <div style={{ marginTop: 1, color: DASHBOARD_COLORS.mutedForeground, fontSize: 7.5 }}>
            Pick two slices. Heatmaps render in main viewport.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              border: `1px solid ${DASHBOARD_COLORS.border}`,
              borderRadius: 4,
              padding: '2px 5px',
              fontSize: 7.5,
              color: DASHBOARD_COLORS.mutedForeground,
              background: DASHBOARD_COLORS.muted,
            }}
          >
            <ArrowLeftRight size={8} /> Swap
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              border: `1px solid ${DASHBOARD_COLORS.border}`,
              borderRadius: 4,
              padding: '2px 5px',
              fontSize: 7.5,
              color: DASHBOARD_COLORS.mutedForeground,
              background: DASHBOARD_COLORS.muted,
            }}
          >
            <X size={8} /> Clear
          </div>
        </div>
      </div>

      {/* Slot Pickers: Left Slot & Right Slot */}
      {[
        ['LEFT SLOT', 'Slice 3 · Jul 30 → Jul 31', left, '#0284c7'],
        ['RIGHT SLOT', 'Slice 4 · Jul 31 → Aug 1', right, '#b45309'],
      ].map(([label, value, count, color]) => (
        <div
          key={label as string}
          style={{
            ...panelStyle,
            padding: '6px 8px',
            borderLeft: `3px solid ${color as string}`,
          }}
        >
          <div
            style={{
              color: color as string,
              fontSize: 7.5,
              fontWeight: 850,
              letterSpacing: 1.3,
              fontFamily: MONO_FONT,
            }}
          >
            {label as string}
          </div>
          <div
            style={{
              marginTop: 3,
              border: `1px solid ${DASHBOARD_COLORS.border}`,
              borderRadius: 4,
              padding: '3px 6px',
              color: DASHBOARD_COLORS.foreground,
              fontSize: 8.5,
              fontWeight: 700,
              background: '#f8fafc',
            }}
          >
            {value as string}
          </div>
          <div
            style={{
              marginTop: 3,
              color: DASHBOARD_COLORS.mutedForeground,
              fontSize: 7.5,
              fontFamily: MONO_FONT,
            }}
          >
            {Number(count).toLocaleString()} events · 1 day interval
          </div>
        </div>
      ))}

      {/* Signed KDE Comparison Box */}
      <div style={{ ...panelStyle, padding: '5px 8px', background: '#f8fafc' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: MONO_FONT,
            fontSize: 7.5,
            fontWeight: 800,
          }}
        >
          <span>SIGNED KDE COMPARISON</span>
          <span style={{ color: '#059669' }}>READY</span>
        </div>
        <div
          style={{
            marginTop: 2,
            color: DASHBOARD_COLORS.mutedForeground,
            fontSize: 7.5,
            lineHeight: 1.3,
          }}
        >
          A − B evaluated on shared 30×30 sparse comparison grid.
        </div>
      </div>

      {/* Timeline Overlap Bar */}
      <div style={{ ...panelStyle, padding: '5px 8px' }}>
        <div
          style={{
            color: DASHBOARD_COLORS.mutedForeground,
            fontFamily: MONO_FONT,
            fontSize: 7.5,
            fontWeight: 800,
            letterSpacing: 1.1,
            marginBottom: 4,
          }}
        >
          TIMELINE OVERLAP
        </div>
        {[
          ['Slice 3', 15, 38, '#0284c7'],
          ['Slice 4', 45, 42, '#b45309'],
        ].map(([label, leftPct, width, color]) => (
          <div
            key={label as string}
            style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr',
              alignItems: 'center',
              gap: 6,
              marginTop: 3,
              color: DASHBOARD_COLORS.mutedForeground,
              fontSize: 7.5,
            }}
          >
            <span>{label as string}</span>
            <div
              style={{
                position: 'relative',
                height: 4,
                background: DASHBOARD_COLORS.muted,
                borderRadius: 99,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  width: `${width}%`,
                  height: '100%',
                  borderRadius: 99,
                  background: color as string,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Quantitative Delta Bars */}
      <DeltaBar label="EVENT COUNT" left={left} right={right} />
      <DeltaBar label="BURST INTENSITY" left={68} right={86} suffix="%" />
      <DeltaBar label="DURATION" left={1} right={1} suffix="d" />
    </div>
  );
}

function InspectPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <section style={{ ...panelStyle, padding: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
          <span>Temporal resolution</span>
          <span style={{ color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT }}>1 day</span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9 }}>
          <span>Time scale</span>
          <span
            style={{
              border: `1px solid ${DASHBOARD_COLORS.border}`,
              borderRadius: 4,
              padding: '2px 6px',
              color: '#7c3aed',
              fontWeight: 750,
              fontSize: 8,
              background: 'rgba(124, 58, 237, 0.08)',
              fontFamily: MONO_FONT,
            }}
          >
            Adaptive (DBTA)
          </span>
        </div>
      </section>
      <section style={{ ...panelStyle, padding: 8 }}>
        <div style={{ color: DASHBOARD_COLORS.foreground, fontSize: 9.5, fontWeight: 750 }}>
          Evolution Scrubbing
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {[
            ['Pause', Pause],
            ['Forward', RotateCcw],
            ['Stack', Focus],
          ].map(([label, Icon]) => (
            <div
              key={label as string}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                border: `1px solid ${DASHBOARD_COLORS.border}`,
                borderRadius: 4,
                padding: '3px 5px',
                color: DASHBOARD_COLORS.mutedForeground,
                fontSize: 7.5,
                background: DASHBOARD_COLORS.muted,
              }}
            >
              <Icon size={9} />
              {label as string}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export const CompareSidebarRail: React.FC<{ activeTab: RailTab }> = ({ activeTab }) => {
  return (
    <aside
      style={{
        width: '100%',
        height: '100%',
        background: DASHBOARD_COLORS.card,
        borderLeft: `1px solid ${DASHBOARD_COLORS.border}`,
        color: DASHBOARD_COLORS.foreground,
        fontFamily: FONT_FAMILY,
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Rail Header */}
      <div
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          borderBottom: `1px solid ${DASHBOARD_COLORS.border}`,
          background: DASHBOARD_COLORS.muted,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 9,
            fontWeight: 850,
            letterSpacing: 1.4,
            color: DASHBOARD_COLORS.mutedForeground,
          }}
        >
          ANALYTICAL WORKSPACE
        </span>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: DASHBOARD_COLORS.mutedForeground,
          }}
        >
          <ChevronRight size={13} />
        </div>
      </div>

      {/* Rail Tabs Bar */}
      <div style={{ padding: '6px 6px 0', flexShrink: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 2,
            borderRadius: 6,
            background: DASHBOARD_COLORS.muted,
            padding: 2,
          }}
        >
          {TAB_SPECS.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              title={label}
              style={{
                height: 26,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: activeTab === id ? DASHBOARD_COLORS.background : 'transparent',
                color:
                  activeTab === id
                    ? id === 'compare'
                      ? '#7c3aed'
                      : DASHBOARD_COLORS.foreground
                    : DASHBOARD_COLORS.mutedForeground,
                boxShadow: activeTab === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Icon size={12} />
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content without scrolling or cropping */}
      <div style={{ padding: '8px 8px 6px', flex: 1, overflow: 'hidden' }}>
        {activeTab === 'inspect' ? <InspectPanel /> : <ComparePanel />}
      </div>
    </aside>
  );
};
