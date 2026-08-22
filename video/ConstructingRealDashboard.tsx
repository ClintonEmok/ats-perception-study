import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RealCube } from './real/RealCube';
import { RealMap } from './real/RealMap';
import { RealTimeline } from './real/RealTimeline';
import { RealWorkflowRail } from './real/RealWorkflowRail';
import { FONT_FAMILY } from './theme';

export type ConstructingRealDashboardProps = {
  heading: string;
  subtext: string;
};

type Layout = { x: number; y: number; width: number; height: number; rotate: number };

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const mix = (from: number, to: number, progress: number) => interpolate(progress, [0, 1], [from, to]);

function Surface({
  title,
  role,
  detail,
  accent,
  enterAt,
  isolated,
  assembled,
  assembly,
  opacity = 1,
  children,
}: {
  title: string;
  role: string;
  detail: string;
  accent: string;
  enterAt: number;
  isolated: Layout;
  assembled: Layout;
  assembly: number;
  opacity?: number;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame: frame - enterAt, fps, durationInFrames: 38, config: { damping: 20, stiffness: 140 } });
  const float = Math.sin((frame - enterAt) / 24) * 5 * (1 - assembly);
  const style: CSSProperties = {
    position: 'absolute',
    left: mix(isolated.x, assembled.x, assembly),
    top: mix(isolated.y, assembled.y, assembly) + float,
    width: mix(isolated.width, assembled.width, assembly),
    height: mix(isolated.height, assembled.height, assembly),
    border: '1px solid #d8d8d8',
    borderRadius: mix(18, 9, assembly),
    background: '#fff',
    boxShadow: `0 ${mix(30, 10, assembly)}px ${mix(80, 32, assembly)}px rgba(28,25,23,${mix(0.17, 0.1, assembly)})`,
    overflow: 'visible',
    opacity: entrance * opacity,
    transform: `translateY(${(1 - entrance) * 80}px) scale(${0.9 + entrance * 0.1}) rotate(${mix(isolated.rotate, assembled.rotate, assembly)}deg)`,
    transformOrigin: 'center',
  };
  const labelOpacity = interpolate(assembly, [0, 0.55], [1, 0], clamp);

  return (
    <div style={style}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden' }}>
        <div style={{ height: 39, borderBottom: '1px solid #e2e2e2', background: '#fafafa', padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1b1b1b', fontSize: 12, fontWeight: 680 }}><i style={{ width: 7, height: 7, borderRadius: 99, background: accent }} />{title}</div>
          <div style={{ color: '#888', fontSize: 8, letterSpacing: 1.7 }}>REAL WEEK · JUL 2025</div>
        </div>
        <div style={{ height: 'calc(100% - 39px)' }}>{children}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: -69, opacity: labelOpacity, whiteSpace: 'nowrap' }}>
        <div style={{ color: accent, fontSize: 10, fontWeight: 750, letterSpacing: 2.2, textTransform: 'uppercase' }}>{role}</div>
        <div style={{ color: '#181818', fontSize: 20, fontWeight: 620, marginTop: 5 }}>{detail}</div>
      </div>
    </div>
  );
}

export function ConstructingRealDashboard({ heading, subtext }: ConstructingRealDashboardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleIn = spring({ frame, fps, durationInFrames: 45, config: { damping: 200 } });
  const titleOut = interpolate(frame, [72, 112], [1, 0], clamp);
  const assembly = interpolate(frame, [360, 515], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const selection = interpolate(frame, [520, 610], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const toggle = interpolate(frame, [615, 680], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const warpProgress = interpolate(frame, [690, 775], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const multiplier = interpolate(warpProgress, [0, 1], [1, 2.5]);
  const cubeIsActive = toggle > 0.5;
  const mapAssemblyOpacity = interpolate(assembly, [0, 0.65, 1], [1, 1, 1], clamp) * (1 - toggle);
  const cubeAssemblyOpacity = interpolate(assembly, [0, 0.45, 0.9, 1], [1, 1, 0, 0], clamp) + toggle;
  const dashboardChrome = interpolate(assembly, [0.6, 1], [0, 1], clamp);
  const convergeCaption = interpolate(frame, [380, 415, 500, 535], [0, 1, 1, 0], clamp);
  const selectionCaption = interpolate(frame, [520, 545, 595, 620], [0, 1, 1, 0], clamp);
  const toggleCaption = interpolate(frame, [620, 640, 675, 700], [0, 1, 1, 0], clamp);
  const warpCaption = interpolate(frame, [690, 710, 770, 798], [0, 1, 1, 0], clamp);
  const closing = spring({ frame: frame - 805, fps, durationInFrames: 42, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ background: '#efefec', color: '#181818', fontFamily: FONT_FAMILY, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)', backgroundSize: '54px 54px' }} />

      <div style={{ position: 'absolute', left: 118, top: 282, width: 1320, opacity: titleIn * titleOut, transform: `translateY(${(1 - titleIn) * 40}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#6d28d9', fontSize: 12, fontWeight: 750, letterSpacing: 3.2, textTransform: 'uppercase', marginBottom: 25 }}><i style={{ width: 48, height: 2, background: '#7c3aed' }} />Real data · component construction</div>
        <h1 style={{ margin: 0, fontSize: 82, lineHeight: 1, letterSpacing: -4.6, fontWeight: 650, maxWidth: 1250 }}>{heading}</h1>
        <p style={{ margin: '27px 0 0', maxWidth: 1020, color: '#666', fontSize: 27, lineHeight: 1.45 }}>{subtext}</p>
        <p style={{ margin: '17px 0 0', color: '#8a8a8a', fontSize: 13, letterSpacing: 0.5 }}>5,152 Chicago crime records · 28 July–4 August 2025</p>
      </div>

      <div style={{ position: 'absolute', left: 40, top: 34, width: 1840, height: 82, border: '1px solid #d7d7d7', borderRadius: 9, background: 'rgba(255,255,255,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box', opacity: dashboardChrome }}>
        <div><div style={{ fontSize: 15, fontWeight: 700 }}>Adaptive Space-Time Cube</div><div style={{ color: '#777', fontSize: 9, marginTop: 4, letterSpacing: 1.2 }}>COORDINATED WEEKLY ANALYSIS · REAL CHICAGO RECORDS</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['WORKFLOW', 'INSPECT'], ['SYNC STATUS', 'SYNCHRONIZED'], ['WINDOW', '28 JUL–4 AUG']].map(([label, value], index) => <div key={label} style={{ width: 165, border: '1px solid #e0e0e0', borderRadius: 6, padding: '8px 10px', background: '#fafafa' }}><div style={{ color: '#888', fontSize: 7, letterSpacing: 1.2 }}>{label}</div><div style={{ color: index === 1 ? '#059669' : '#6d28d9', fontSize: 9, fontWeight: 750, marginTop: 4 }}>{value}</div></div>)}
        </div>
      </div>

      <Surface
        title="2D map"
        role="Spatial mode"
        detail="Locate where incidents concentrate"
        accent="#0891b2"
        enterAt={105}
        isolated={{ x: 78, y: 270, width: 780, height: 440, rotate: -2.2 }}
        assembled={{ x: 40, y: 130, width: 1540, height: 590, rotate: 0 }}
        assembly={assembly}
        opacity={mapAssemblyOpacity}
      >
        <RealMap selectionProgress={selection} />
      </Surface>

      <Surface
        title="3D cube"
        role="Spatiotemporal mode"
        detail="Inspect how patterns evolve"
        accent="#ea580c"
        enterAt={235}
        isolated={{ x: 1070, y: 260, width: 770, height: 440, rotate: 2.4 }}
        assembled={{ x: 40, y: 130, width: 1540, height: 590, rotate: 0 }}
        assembly={assembly}
        opacity={Math.min(1, cubeAssemblyOpacity)}
      >
        <RealCube selectionProgress={selection} warpProgress={warpProgress} multiplier={multiplier} />
      </Surface>

      <Surface
        title="Dual timeline"
        role="Temporal control"
        detail="Select when to investigate"
        accent="#7c3aed"
        enterAt={170}
        isolated={{ x: 405, y: 830, width: 1110, height: 215, rotate: -0.7 }}
        assembled={{ x: 40, y: 735, width: 1540, height: 305, rotate: 0 }}
        assembly={assembly}
      >
        <RealTimeline selectionProgress={selection} warpProgress={warpProgress} multiplier={multiplier} />
      </Surface>

      <div style={{ position: 'absolute', left: 1592, top: 130, width: 288, height: 910, border: '1px solid #d8d8d8', borderRadius: 9, overflow: 'hidden', boxShadow: '0 10px 32px rgba(0,0,0,0.08)', opacity: dashboardChrome, transform: `translateX(${(1 - dashboardChrome) * 70}px)` }}>
        <RealWorkflowRail cubeActive={cubeIsActive} warpProgress={warpProgress} multiplier={multiplier} />
      </div>

      <div style={{ position: 'absolute', left: 1508, top: 145, display: 'flex', padding: 4, gap: 4, border: '1px solid #ddd', borderRadius: 99, background: '#fff', opacity: dashboardChrome }}>
        {['2D', '3D'].map((label, index) => {
          const active = cubeIsActive ? index === 1 : index === 0;
          return <div key={label} style={{ width: 38, height: 26, borderRadius: 99, display: 'grid', placeItems: 'center', background: active ? '#171717' : '#fff', color: active ? '#fff' : '#777', fontSize: 8, fontWeight: 750 }}>{label}</div>;
        })}
      </div>

      {[
        [convergeCaption, 'Two spatial modes.', ' One shared viewport.'],
        [selectionCaption, 'One day selected.', ' Every view responds.'],
        [toggleCaption, 'The viewport changes mode.', ' The selection persists.'],
        [warpCaption, 'Density controls analytical space.', ` Multiplier ${multiplier.toFixed(1)}×.`],
      ].map(([opacity, first, second]) => (
        <div key={String(first)} style={{ position: 'absolute', left: '50%', top: 500, transform: 'translate(-50%, -50%)', opacity: Number(opacity), border: '1px solid #d7d7d7', borderRadius: 8, padding: '13px 20px', background: 'rgba(255,255,255,0.96)', boxShadow: '0 16px 45px rgba(0,0,0,0.14)', fontSize: 22, fontWeight: 650 }}>{String(first)}<span style={{ color: '#6d28d9' }}>{String(second)}</span></div>
      ))}

      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: closing, pointerEvents: 'none' }}>
        <div style={{ width: 1370, border: '1px solid #d0d0d0', borderRadius: 15, background: 'rgba(255,255,255,0.96)', padding: '40px 52px 44px', boxShadow: '0 28px 90px rgba(0,0,0,0.18)', transform: `translateY(${(1 - closing) * 34}px)` }}>
          <div style={{ color: '#6d28d9', fontSize: 11, fontWeight: 750, letterSpacing: 2.7, textTransform: 'uppercase' }}>Research contribution · coordinated analytical workflow</div>
          <div style={{ marginTop: 18, fontSize: 50, lineHeight: 1.08, letterSpacing: -2.5, fontWeight: 650 }}>The contribution is a <span style={{ color: '#7c3aed' }}>workflow</span>,<br />not only an axis transformation.</div>
          <div style={{ marginTop: 25, color: '#666', fontSize: 14 }}>Real weekly records remain linked as the analyst moves between timeline, 2D map, and 3D cube.</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
