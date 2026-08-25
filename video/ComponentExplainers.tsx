import type { ReactNode } from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RealCube } from './real/RealCube';
import { RealTimeline } from './real/RealTimeline';
import { FONT_FAMILY } from './theme';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export function ExplainerShell({ title, subtitle, stages, activeStage, children }: {
  title: string;
  subtitle: string;
  stages: string[];
  activeStage: number;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, durationInFrames: 36, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ background: '#efefec', color: '#181818', fontFamily: FONT_FAMILY, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
      <header style={{ position: 'absolute', left: 80, right: 80, top: 54, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', opacity: entrance, transform: `translateY(${(1 - entrance) * 20}px)` }}>
        <div>
          <div style={{ color: '#6d28d9', fontSize: 11, fontWeight: 750, letterSpacing: 2.4, textTransform: 'uppercase' }}>Component explanation</div>
          <h1 style={{ margin: '9px 0 0', fontSize: 42, lineHeight: 1, letterSpacing: -1.8, fontWeight: 670 }}>{title}</h1>
        </div>
        <div style={{ width: 620, color: '#666', fontSize: 17, lineHeight: 1.45, textAlign: 'right' }}>{subtitle}</div>
      </header>
      {children}
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 48, display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: 8 }}>
        {stages.map((stage, index) => (
          <div key={stage} style={{ borderTop: `2px solid ${index === activeStage ? '#7c3aed' : '#cfcfcb'}`, paddingTop: 10, color: index === activeStage ? '#4c1d95' : '#888', fontSize: 11, fontWeight: index === activeStage ? 700 : 500, letterSpacing: 0.2 }}>
            <span style={{ marginRight: 8, color: index === activeStage ? '#7c3aed' : '#aaa' }}>{String(index + 1).padStart(2, '0')}</span>{stage}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export function TimelineExplainer() {
  const frame = useCurrentFrame();
  const selectionProgress = interpolate(frame, [150, 300], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const warpProgress = interpolate(frame, [430, 610], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const multiplier = interpolate(warpProgress, [0, 1], [1, 2.5]);
  const activeStage = frame < 150 ? 0 : frame < 320 ? 1 : frame < 430 ? 2 : 3;
  const notes = [
    'The overview preserves the complete seven-day context.',
    'The brush selects 31 July without changing the overview scale.',
    'The detail track resolves the selected day into hourly counts.',
    `Density-based scaling expands busy hours and compresses sparse hours · ${multiplier.toFixed(1)}×`,
  ];

  return (
    <ExplainerShell
      title="Dual timeline"
      subtitle="A linked overview-and-detail structure separates temporal navigation from close inspection."
      stages={['Weekly context', 'Brush selection', 'Hourly detail', 'Adaptive scale']}
      activeStage={activeStage}
    >
      <div style={{ position: 'absolute', left: 80, right: 80, top: 220, height: 405, border: '1px solid #d6d6d2', borderRadius: 12, background: '#fff', overflow: 'hidden', boxShadow: '0 14px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 45, borderBottom: '1px solid #e2e2e2', background: '#fafafa', padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}><i style={{ width: 7, height: 7, borderRadius: 99, background: '#7c3aed' }} />Temporal control</div>
          <div style={{ color: '#777', fontSize: 9, letterSpacing: 1.4 }}>28 JULY–4 AUGUST 2025</div>
        </div>
        <div style={{ height: 'calc(100% - 45px)', paddingTop: 24, boxSizing: 'border-box' }}>
          <RealTimeline selectionProgress={selectionProgress} warpProgress={warpProgress} multiplier={multiplier} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 80, top: 675, display: 'flex', alignItems: 'center', gap: 12, color: '#444', fontSize: 18, fontWeight: 610 }}>
        <i style={{ width: 28, height: 2, background: '#7c3aed' }} />{notes[activeStage]}
      </div>
    </ExplainerShell>
  );
}

export function CubeExplainer() {
  const frame = useCurrentFrame();
  const selectionProgress = interpolate(frame, [130, 310], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const warpProgress = interpolate(frame, [430, 610], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const multiplier = interpolate(warpProgress, [0, 1], [1, 2.5]);
  const activeStage = frame < 130 ? 0 : frame < 330 ? 1 : frame < 430 ? 2 : 3;
  const notes = [
    'Spatial intensity surfaces are initially stacked across the weekly domain.',
    'The timeline brush becomes the cube temporal domain.',
    'The selected day expands to reveal four six-hour intensity surfaces.',
    `The same adaptive scale repositions surfaces along the time axis · ${multiplier.toFixed(1)}×`,
  ];

  return (
    <ExplainerShell
      title="Space-time cube"
      subtitle="The cube uses the timeline brush as its temporal domain while preserving the spatial intensity field."
      stages={['Weekly stack', 'Brush domain', 'Six-hour layers', 'Synchronized warp']}
      activeStage={activeStage}
    >
      <div style={{ position: 'absolute', left: 220, right: 220, top: 155, height: 760, border: '1px solid #d6d6d2', borderRadius: 12, background: '#fff', overflow: 'hidden', boxShadow: '0 14px 40px rgba(0,0,0,0.08)' }}>
        <RealCube selectionProgress={selectionProgress} warpProgress={warpProgress} multiplier={multiplier} />
      </div>
      <div style={{ position: 'absolute', left: 80, bottom: 108, display: 'flex', alignItems: 'center', gap: 12, color: '#444', fontSize: 18, fontWeight: 610 }}>
        <i style={{ width: 28, height: 2, background: '#7c3aed' }} />{notes[activeStage]}
      </div>
    </ExplainerShell>
  );
}
