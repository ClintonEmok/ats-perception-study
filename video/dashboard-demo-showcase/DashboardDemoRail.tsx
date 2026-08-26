import React from 'react';
import {
  BarChart3,
  ChevronRight,
  Focus,
  GitCompareArrows,
  Layers,
  LayoutDashboard,
  Maximize2,
  Pause,
  RotateCcw,
  ZoomIn,
} from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  DAILY_COUNTS,
  SELECTED_HOURLY_COUNTS,
  SELECTED_PEAK_HOUR,
  SELECTED_TOP_CRIME,
  SOURCE_RECORD_COUNT,
} from '../real/data';
import { DASHBOARD_COLORS } from './palette';

const TAB_SPECS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'scan', label: 'STKDE', icon: BarChart3 },
  { id: 'slices', label: 'Slices', icon: Layers },
  { id: 'inspect', label: 'Inspect 3D', icon: Focus },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows },
] as const;

type RailTab = (typeof TAB_SPECS)[number]['id'];

const panel = {
  border: `1px solid ${DASHBOARD_COLORS.border}`,
  borderRadius: 8,
  background: DASHBOARD_COLORS.card,
};

function OverviewPanel() {
  const maximum = Math.max(...SELECTED_HOURLY_COUNTS, 1);
  const metricValues = [
    ['TOTAL CRIMES', SOURCE_RECORD_COUNT.toLocaleString()],
    ['AVG / DAY', Math.round(SOURCE_RECORD_COUNT / 7).toLocaleString()],
    ['PEAK HOUR', `${String(SELECTED_PEAK_HOUR).padStart(2, '0')}:00`],
    ['TOP CRIME', SELECTED_TOP_CRIME],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...panel, padding: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['START', '07/28/2025'],
            ['END', '08/04/2025'],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ color: DASHBOARD_COLORS.mutedForeground, fontSize: 8, letterSpacing: 1.7, fontFamily: MONO_FONT }}>{label}</div>
              <div style={{ marginTop: 5, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 4, padding: '7px 8px', fontSize: 10, fontFamily: MONO_FONT }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {metricValues.map(([label, value]) => (
          <div key={label} style={{ ...panel, padding: '9px 10px', minHeight: 48 }}>
            <div style={{ color: DASHBOARD_COLORS.mutedForeground, fontSize: 7.5, letterSpacing: 1.5, fontFamily: MONO_FONT }}>{label}</div>
            <div style={{ marginTop: 4, color: DASHBOARD_COLORS.foreground, fontSize: label === 'TOP CRIME' ? 10 : 13, fontWeight: 750 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ ...panel, padding: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: DASHBOARD_COLORS.mutedForeground, fontSize: 8, letterSpacing: 1.6, fontFamily: MONO_FONT }}>DISTRICTS</span>
          <span style={{ color: DASHBOARD_COLORS.mutedForeground, fontSize: 8 }}>Clear · All</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3, marginTop: 8 }}>
          {Array.from({ length: 25 }, (_, index) => (
            <div key={index} style={{ border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 3, padding: '3px 0', textAlign: 'center', color: DASHBOARD_COLORS.foreground, fontSize: 8 }}>{index + 1}</div>
          ))}
        </div>
      </div>
      <div style={{ ...panel, padding: 10 }}>
        <div style={{ color: DASHBOARD_COLORS.mutedForeground, fontSize: 8, letterSpacing: 1.6, fontFamily: MONO_FONT }}>HOURLY PULSE · 24H READ</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 70, gap: 2, marginTop: 8 }}>
          {SELECTED_HOURLY_COUNTS.map((count, index) => (
            <div key={index} style={{ flex: 1, height: `${Math.max(7, (count / maximum) * 100)}%`, borderRadius: '2px 2px 0 0', background: '#8b5cf6', opacity: 0.45 + (count / maximum) * 0.55 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Track({ value, color = DASHBOARD_COLORS.primary }: { value: number; color?: string }) {
  return (
    <div style={{ position: 'relative', height: 5, flex: 1, borderRadius: 99, background: DASHBOARD_COLORS.muted }}>
      <div style={{ position: 'absolute', inset: 0, right: `${100 - value}%`, borderRadius: 99, background: color }} />
      <div style={{ position: 'absolute', left: `${value}%`, top: '50%', width: 11, height: 11, transform: 'translate(-50%, -50%)', borderRadius: 99, background: DASHBOARD_COLORS.background, border: `2px solid ${color}` }} />
    </div>
  );
}

function InspectPanel({ warpProgress, multiplier, activeSlice }: { warpProgress: number; multiplier: number; activeSlice: number }) {
  const warpPercent = Math.round(warpProgress * 72);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <section style={{ ...panel, padding: 10 }}>
        <div style={{ ...panel, padding: 9, background: DASHBOARD_COLORS.background }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span>Temporal resolution</span><span style={{ color: DASHBOARD_COLORS.mutedForeground }}>1 day</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}><Track value={16} /><span style={{ color: DASHBOARD_COLORS.mutedForeground, fontSize: 9 }}>‹ ›</span></div>
        </div>
        <div style={{ ...panel, marginTop: 7, padding: 9, background: DASHBOARD_COLORS.background }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
            <span>Time scale</span>
            <span style={{ border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 4, padding: '4px 8px', color: DASHBOARD_COLORS.foreground, background: warpProgress > 0.08 ? DASHBOARD_COLORS.secondary : 'transparent' }}>{warpProgress > 0.08 ? 'Adaptive' : 'Linear'}</span>
          </div>
          {warpProgress > 0.08 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, fontSize: 9 }}><span>Warp factor</span><Track value={warpPercent} /><span style={{ width: 31, textAlign: 'right', fontFamily: MONO_FONT }}>{warpPercent}%</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, fontSize: 9 }}><span>Warp intensity</span><Track value={(multiplier / 4) * 100} /><span style={{ width: 31, textAlign: 'right', fontFamily: MONO_FONT }}>{multiplier.toFixed(1)}×</span></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, fontSize: 9 }}><span>Warp source</span><span style={{ border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 4, padding: '4px 7px', background: DASHBOARD_COLORS.secondary }}>Density</span></div>
            </>
          ) : null}
        </div>
        <div style={{ ...panel, marginTop: 7, padding: 9, background: DASHBOARD_COLORS.background, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
          <span>Cube scope</span>
          <div style={{ display: 'flex', gap: 3 }}><span style={{ padding: 4, borderRadius: 3, background: DASHBOARD_COLORS.secondary }}><Maximize2 size={11} /></span><span style={{ padding: 4, color: DASHBOARD_COLORS.mutedForeground }}><ZoomIn size={11} /></span></div>
        </div>
      </section>
      <section style={{ ...panel, padding: 10 }}>
        <div style={{ color: DASHBOARD_COLORS.foreground, fontSize: 12, fontWeight: 750 }}>Slice {activeSlice + 1}</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 9 }}>
          {[['Pause', Pause], ['Forward', RotateCcw], ['Stack', Focus]].map(([label, Icon]) => (
            <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 4, padding: '4px 6px', color: DASHBOARD_COLORS.mutedForeground, fontSize: 8 }}><Icon size={10} />{label as string}</div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 11 }}>
          {DAILY_COUNTS.map((count, index) => (
            <div key={index} style={{ flex: 1, height: 22, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: index === activeSlice ? DASHBOARD_COLORS.foreground : DASHBOARD_COLORS.muted, color: index === activeSlice ? DASHBOARD_COLORS.primaryForeground : DASHBOARD_COLORS.mutedForeground, fontSize: 8 }}>{index + 1}</div>
          ))}
        </div>
        {['Active events', 'Trajectories'].map((label, index) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 4, padding: '6px 7px', color: DASHBOARD_COLORS.mutedForeground, fontSize: 9 }}><span>{label}</span><span>{index === 0 ? 'Off' : 'On'}</span></div>
        ))}
      </section>
    </div>
  );
}

function Delta({ label, left, right, suffix = '' }: { label: string; left: number; right: number; suffix?: string }) {
  const maximum = Math.max(left, right, 1);
  return (
    <div style={{ ...panel, padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: DASHBOARD_COLORS.mutedForeground, fontSize: 8, letterSpacing: 1.2, fontFamily: MONO_FONT }}><span>{label}</span><span>{right >= left ? '▲' : '▼'} {Math.abs(right - left)}</span></div>
      {[
        ['Left', left, DASHBOARD_COLORS.chart1],
        ['Right', right, DASHBOARD_COLORS.chart2],
      ].map(([name, value, color]) => (
        <div key={name as string} style={{ display: 'grid', gridTemplateColumns: '38px 1fr 42px', alignItems: 'center', gap: 6, marginTop: 7, color: DASHBOARD_COLORS.mutedForeground, fontSize: 8 }}>
          <span>{name as string}</span><div style={{ height: 5, borderRadius: 99, background: DASHBOARD_COLORS.muted }}><div style={{ width: `${(Number(value) / maximum) * 100}%`, height: '100%', borderRadius: 99, background: color as string }} /></div><span style={{ color: DASHBOARD_COLORS.foreground, textAlign: 'right' }}>{Number(value).toLocaleString()}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

function ComparePanel() {
  const left = DAILY_COUNTS[2];
  const right = DAILY_COUNTS[3];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ borderBottom: `1px solid ${DASHBOARD_COLORS.border}`, paddingBottom: 8 }}>
        <div style={{ color: DASHBOARD_COLORS.mutedForeground, fontSize: 8, fontWeight: 750, letterSpacing: 1.7, fontFamily: MONO_FONT }}>COMPARE SLICES</div>
        <div style={{ marginTop: 3, color: DASHBOARD_COLORS.mutedForeground, fontSize: 8 }}>Pick two slices. Heatmaps render in the main viewport.</div>
      </div>
      {[
        ['LEFT SLOT', 'Slice 3 · Jul 30 → Jul 31', left],
        ['RIGHT SLOT', 'Slice 4 · Jul 31 → Aug 1', right],
      ].map(([label, value, count]) => (
        <div key={label as string} style={{ ...panel, padding: 9 }}>
          <div style={{ color: DASHBOARD_COLORS.mutedForeground, fontSize: 8, letterSpacing: 1.5, fontFamily: MONO_FONT }}>{label as string}</div>
          <div style={{ marginTop: 6, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 4, padding: 7, color: DASHBOARD_COLORS.foreground, fontSize: 9 }}>{value as string}</div>
          <div style={{ marginTop: 5, color: DASHBOARD_COLORS.mutedForeground, fontSize: 8 }}>{Number(count).toLocaleString()} events · 1 day</div>
        </div>
      ))}
      <div style={{ ...panel, padding: 9 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO_FONT, fontSize: 8 }}><span>SIGNED KDE COMPARISON</span><span style={{ color: DASHBOARD_COLORS.mutedForeground }}>success</span></div>
        <div style={{ marginTop: 5, color: DASHBOARD_COLORS.mutedForeground, fontSize: 8, lineHeight: 1.45 }}>A − B is evaluated on a shared sparse comparison grid.</div>
      </div>
      <div style={{ ...panel, padding: 9 }}>
        <div style={{ color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 8, letterSpacing: 1.5 }}>TIMELINE OVERLAP</div>
        {[['Slice 3', 12, 40, DASHBOARD_COLORS.chart1], ['Slice 4', 48, 40, DASHBOARD_COLORS.chart2]].map(([label, leftPct, width, color]) => (
          <div key={label as string} style={{ display: 'grid', gridTemplateColumns: '45px 1fr', alignItems: 'center', gap: 6, marginTop: 8, color: DASHBOARD_COLORS.mutedForeground, fontSize: 8 }}><span>{label as string}</span><div style={{ position: 'relative', height: 5, background: DASHBOARD_COLORS.muted, borderRadius: 99 }}><div style={{ position: 'absolute', left: `${leftPct}%`, width: `${width}%`, height: '100%', borderRadius: 99, background: color as string }} /></div></div>
        ))}
      </div>
      <Delta label="EVENT COUNT" left={left} right={right} />
      <Delta label="BURST INTENSITY" left={Math.round((left / Math.max(...DAILY_COUNTS)) * 100)} right={Math.round((right / Math.max(...DAILY_COUNTS)) * 100)} suffix="%" />
      <Delta label="DURATION" left={1} right={1} suffix="d" />
    </div>
  );
}

export function DashboardDemoRail({
  activeTab,
  warpProgress,
  multiplier,
  activeSlice,
}: {
  activeTab: RailTab;
  warpProgress: number;
  multiplier: number;
  activeSlice: number;
}) {
  return (
    <aside style={{ width: '100%', height: '100%', background: DASHBOARD_COLORS.card, borderLeft: `1px solid ${DASHBOARD_COLORS.border}`, color: DASHBOARD_COLORS.foreground, fontFamily: FONT_FAMILY, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ height: 46, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: `1px solid ${DASHBOARD_COLORS.border}`, background: DASHBOARD_COLORS.muted }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DASHBOARD_COLORS.mutedForeground }}><ChevronRight size={14} /></div>
      </div>
      <div style={{ padding: '8px 8px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, borderRadius: 6, background: DASHBOARD_COLORS.muted, padding: 3 }}>
          {TAB_SPECS.map(({ id, label, icon: Icon }) => (
            <div key={id} title={label} style={{ height: 28, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeTab === id ? DASHBOARD_COLORS.background : 'transparent', color: activeTab === id ? DASHBOARD_COLORS.foreground : DASHBOARD_COLORS.mutedForeground, boxShadow: activeTab === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}><Icon size={13} /></div>
          ))}
        </div>
      </div>
      <div style={{ padding: 8 }}>
        {activeTab === 'overview' ? <OverviewPanel /> : null}
        {activeTab === 'inspect' ? <InspectPanel warpProgress={warpProgress} multiplier={multiplier} activeSlice={activeSlice} /> : null}
        {activeTab === 'compare' ? <ComparePanel /> : null}
      </div>
    </aside>
  );
}
