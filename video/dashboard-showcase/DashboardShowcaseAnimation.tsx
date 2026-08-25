import React, { type CSSProperties, type ReactNode } from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { ShowcaseCube } from './ShowcaseCube';
import { ShowcaseMap } from './ShowcaseMap';
import { ShowcaseTimeline } from './ShowcaseTimeline';
import { ShowcaseWorkflowRail } from './ShowcaseWorkflowRail';

type Layout = { x: number; y: number; width: number; height: number; rotate: number };

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const mix = (from: number, to: number, progress: number) =>
  interpolate(progress, [0, 1], [from, to]);

function DashboardSurface({
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
  const entrance = spring({
    frame: frame - enterAt,
    fps,
    durationInFrames: 38,
    config: { damping: 20, stiffness: 140 },
  });
  const float = Math.sin((frame - enterAt) / 24) * 4 * (1 - assembly);

  const style: CSSProperties = {
    position: 'absolute',
    left: mix(isolated.x, assembled.x, assembly),
    top: mix(isolated.y, assembled.y, assembly) + float,
    width: mix(isolated.width, assembled.width, assembly),
    height: mix(isolated.height, assembled.height, assembly),
    border: '1.5px solid rgba(15, 23, 42, 0.14)',
    borderRadius: mix(16, 10, assembly),
    background: '#ffffff',
    boxShadow: `0 ${mix(24, 8, assembly)}px ${mix(60, 24, assembly)}px rgba(15, 23, 42, ${mix(0.12, 0.06, assembly)})`,
    overflow: 'visible',
    opacity: entrance * opacity,
    transform: `translateY(${(1 - entrance) * 70}px) scale(${0.92 + entrance * 0.08}) rotate(${mix(isolated.rotate, assembled.rotate, assembly)}deg)`,
    transformOrigin: 'center',
    fontFamily: FONT_FAMILY,
  };

  const labelOpacity = interpolate(assembly, [0, 0.5], [1, 0], clamp);

  return (
    <div style={style}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden' }}>
        {/* Surface Title Bar */}
        <div
          style={{
            height: 38,
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
            background: 'rgba(15, 23, 42, 0.025)',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 12, fontWeight: 800 }}>
            <i style={{ width: 8, height: 8, borderRadius: 99, background: accent }} />
            {title}
          </div>
          <div style={{ color: '#64748b', fontSize: 9, fontFamily: MONO_FONT, letterSpacing: 1.2, fontWeight: 700 }}>
            CHICAGO CRIME · JUL 2025
          </div>
        </div>

        {/* Content Viewport */}
        <div style={{ height: 'calc(100% - 38px)' }}>{children}</div>
      </div>

      {/* Initial Floating Role Callout (Disappears on assembly) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: -64,
          opacity: labelOpacity,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        <div style={{ color: accent, fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontFamily: MONO_FONT }}>
          {role}
        </div>
        <div style={{ color: '#0f172a', fontSize: 20, fontWeight: 850, marginTop: 4 }}>
          {detail}
        </div>
      </div>
    </div>
  );
}

export function DashboardShowcaseAnimation() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation Choreography
  const titleIn = spring({ frame, fps, durationInFrames: 45, config: { damping: 200 } });
  const titleOut = interpolate(frame, [60, 95], [1, 0], clamp);

  // 1. Assembly into coordinated dashboard (Frames 100 to 220 / 3.3s to 7.3s)
  const assembly = interpolate(frame, [100, 220], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // 2. Brush temporal selection (Frames 230 to 330 / 7.6s to 11.0s)
  const selection = interpolate(frame, [230, 330], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // 3. Switch between 2D Map and 3D Space-Time Cube (Frames 335 to 400 / 11.1s to 13.3s)
  const toggle = interpolate(frame, [335, 400], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // 4. Adaptive Visual Allocation Activation (Frames 410 to 500 / 13.6s to 16.6s)
  const warpProgress = interpolate(frame, [410, 500], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const multiplier = interpolate(warpProgress, [0, 1], [1.0, 2.5]);

  const cubeIsActive = toggle > 0.5;
  const mapAssemblyOpacity =
    interpolate(assembly, [0, 0.65, 1], [1, 1, 1], clamp) * (1 - toggle);
  const cubeAssemblyOpacity =
    interpolate(assembly, [0, 0.45, 0.9, 1], [1, 1, 0, 0], clamp) + toggle;
  const dashboardChrome = interpolate(assembly, [0.5, 1], [0, 1], clamp);

  // Dynamic Narrative Captions
  const caption1 = interpolate(frame, [110, 140, 200, 225], [0, 1, 1, 0], clamp);
  const caption2 = interpolate(frame, [235, 260, 315, 335], [0, 1, 1, 0], clamp);
  const caption3 = interpolate(frame, [415, 435, 490, 515], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: FONT_FAMILY,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. INITIAL TITLE CARD (Fades in, then clears out)   */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          top: 320,
          width: 1300,
          opacity: titleIn * titleOut,
          transform: `translateY(${(1 - titleIn) * 30}px)`,
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#2563eb',
            fontSize: 13,
            fontWeight: 850,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            marginBottom: 20,
            fontFamily: MONO_FONT,
          }}
        >
          <i style={{ width: 40, height: 3, background: '#2563eb', borderRadius: 2 }} />
          Prototype Showcase · Solution Demonstration
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 68,
            lineHeight: 1.05,
            letterSpacing: -2.5,
            fontWeight: 900,
            color: '#0f172a',
          }}
        >
          Adaptive Space-Time Cube
        </h1>
        <p
          style={{
            margin: '22px 0 0',
            maxWidth: 960,
            color: '#475569',
            fontSize: 24,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          A coordinated analytical environment keeping a 3D Space-Time Cube, 2D Map, and Dual Timeline synchronized around adaptive visual scaling.
        </p>
        <p
          style={{
            margin: '14px 0 0',
            color: '#64748b',
            fontSize: 14,
            fontFamily: MONO_FONT,
            fontWeight: 700,
          }}
        >
          5,152 Chicago Incidents · 28 July – 4 August 2025
        </p>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. TOP DASHBOARD NAVIGATION BAR                      */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 24,
          width: 1840,
          height: 66,
          border: '1.5px solid rgba(15, 23, 42, 0.12)',
          borderRadius: 10,
          background: 'rgba(255, 255, 255, 0.96)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          boxSizing: 'border-box',
          opacity: dashboardChrome,
          zIndex: 30,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', letterSpacing: 0.5 }}>
            Adaptive Space-Time Cube
          </div>
          <div style={{ color: '#64748b', fontSize: 10, marginTop: 2, letterSpacing: 1.2, fontFamily: MONO_FONT, fontWeight: 700 }}>
            COORDINATED SPATIOTEMPORAL ANALYTICS · CHICAGO CRIME DATASET
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {[
            ['ACTIVE VIEW', cubeIsActive ? '3D CUBE (Z-WARP)' : '2D MAP (SPATIAL)'],
            ['SYNC STATUS', 'SYNCHRONIZED'],
            ['DATASET WINDOW', '28 JUL – 4 AUG (5,152 INCIDENTS)'],
          ].map(([label, value], index) => (
            <div
              key={label}
              style={{
                width: 180,
                border: '1px solid rgba(15, 23, 42, 0.1)',
                borderRadius: 7,
                padding: '6px 12px',
                background: 'rgba(15, 23, 42, 0.02)',
              }}
            >
              <div style={{ color: '#64748b', fontSize: 8, letterSpacing: 1.2, fontFamily: MONO_FONT, fontWeight: 700 }}>
                {label}
              </div>
              <div
                style={{
                  color: index === 1 ? '#16a34a' : '#2563eb',
                  fontSize: 10,
                  fontWeight: 850,
                  marginTop: 2,
                  fontFamily: MONO_FONT,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. SURFACE A: 2D MAP (Left Viewport)                 */}
      {/* ---------------------------------------------------- */}
      <DashboardSurface
        title="2D Map"
        role="Spatial Mode"
        detail="Locate incident hotspots in geographic space"
        accent="#2563eb"
        enterAt={80}
        isolated={{ x: 70, y: 240, width: 780, height: 460, rotate: -2.0 }}
        assembled={{ x: 40, y: 104, width: 1510, height: 580, rotate: 0 }}
        assembly={assembly}
        opacity={mapAssemblyOpacity}
      >
        <ShowcaseMap selectionProgress={selection} />
      </DashboardSurface>

      {/* ---------------------------------------------------- */}
      {/* 4. SURFACE B: 3D SPACE-TIME CUBE (Right Viewport)    */}
      {/* ---------------------------------------------------- */}
      <DashboardSurface
        title="3D Space-Time Cube"
        role="Spatiotemporal Mode"
        detail="Inspect sequence, clusters, and temporal trajectories"
        accent="#C8102E"
        enterAt={180}
        isolated={{ x: 1070, y: 230, width: 780, height: 460, rotate: 2.2 }}
        assembled={{ x: 40, y: 104, width: 1510, height: 580, rotate: 0 }}
        assembly={assembly}
        opacity={Math.min(1, cubeAssemblyOpacity)}
      >
        <ShowcaseCube
          selectionProgress={selection}
          warpProgress={warpProgress}
          multiplier={multiplier}
        />
      </DashboardSurface>

      {/* ---------------------------------------------------- */}
      {/* 5. SURFACE C: DUAL TIMELINE (Bottom Control Strip)   */}
      {/* ---------------------------------------------------- */}
      <DashboardSurface
        title="Dual Timeline"
        role="Temporal Control"
        detail="Brush time intervals and scale resolution"
        accent="#0f172a"
        enterAt={130}
        isolated={{ x: 380, y: 780, width: 1160, height: 260, rotate: -0.6 }}
        assembled={{ x: 40, y: 700, width: 1510, height: 340, rotate: 0 }}
        assembly={assembly}
      >
        <ShowcaseTimeline
          selectionProgress={selection}
          warpProgress={warpProgress}
          multiplier={multiplier}
        />
      </DashboardSurface>

      {/* ---------------------------------------------------- */}
      {/* 6. RIGHT-SIDE WORKFLOW & METRICS RAIL                */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 1566,
          top: 104,
          width: 314,
          height: 936,
          border: '1.5px solid rgba(15, 23, 42, 0.14)',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          opacity: dashboardChrome,
          transform: `translateX(${(1 - dashboardChrome) * 60}px)`,
          zIndex: 25,
        }}
      >
        <ShowcaseWorkflowRail
          cubeActive={cubeIsActive}
          warpProgress={warpProgress}
          multiplier={multiplier}
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* 7. FLOATING DYNAMIC NARRATIVE CAPTIONS               */}
      {/* ---------------------------------------------------- */}
      {[
        [caption1, 'Separate views converge.', ' One synchronized analytical dashboard.'],
        [caption2, 'Brushing 31 July.', ' Synchronously filters 2D map & 3D space-time slice.'],
        [caption3, 'Visual Allocation triggers.', ` Dense burst expands vertically (${multiplier.toFixed(1)}×).`],
      ].map(([captionOpacity, first, second], idx) => (
        <div
          key={`caption-${idx}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: 480,
            transform: 'translate(-50%, -50%)',
            opacity: Number(captionOpacity),
            border: '1.5px solid rgba(15, 23, 42, 0.16)',
            borderRadius: 10,
            padding: '14px 24px',
            background: 'rgba(255, 255, 255, 0.98)',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14)',
            fontSize: 22,
            fontWeight: 800,
            zIndex: 60,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#0f172a' }}>{String(first)} </span>
          <span style={{ color: '#2563eb' }}>{String(second)}</span>
        </div>
      ))}
    </AbsoluteFill>
  );
}
