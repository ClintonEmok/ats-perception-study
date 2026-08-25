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

type Layout = { x: number; y: number; width: number; height: number; scale: number; rotate: number; opacity: number };

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const mix = (from: number, to: number, progress: number) =>
  interpolate(progress, [0, 1], [from, to]);

function DashboardSurface({
  title,
  accent,
  layout,
  children,
}: {
  title: string;
  accent: string;
  layout: Layout;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    position: 'absolute',
    left: layout.x,
    top: layout.y,
    width: layout.width,
    height: layout.height,
    border: '1.5px solid rgba(15, 23, 42, 0.13)',
    borderRadius: 12,
    background: '#ffffff',
    boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08)',
    overflow: 'hidden',
    opacity: layout.opacity,
    transform: `scale(${layout.scale}) rotate(${layout.rotate}deg)`,
    transformOrigin: 'center center',
    fontFamily: FONT_FAMILY,
    zIndex: Math.round(layout.scale * 10),
  };

  return (
    <div style={style}>
      {/* Surface Header Bar */}
      <div
        style={{
          height: 38,
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'rgba(15, 23, 42, 0.02)',
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

      {/* Surface Viewport */}
      <div style={{ height: 'calc(100% - 38px)' }}>{children}</div>
    </div>
  );
}

export function DashboardShowcaseAnimation() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---------------------------------------------------------
  // TIMELINE CHAPTERS (Total 1800 frames / 60 seconds @ 30fps)
  // ---------------------------------------------------------
  // 0:00 - 0:04 (0 - 120): Opening Title Card
  // 0:04 - 0:14 (120 - 420): Chapter 1: 2D Spatial Map Deep-Dive
  // 0:14 - 0:27 (420 - 810): Chapter 2: 3D Space-Time Cube & Orbital Camera
  // 0:27 - 0:38 (810 - 1140): Chapter 3: Dual Timeline & Multi-Scale Brushing
  // 0:38 - 0:48 (1140 - 1440): Chapter 4: Full Synchronized Convergence
  // 0:48 - 0:55 (1440 - 1650): Chapter 5: Adaptive Visual Allocation Climax
  // 0:55 - 1:00 (1650 - 1800): Chapter 6: Final Freeze Frame Hold (Last 5s)

  // 1. Opening Title Card
  const titleIn = spring({ frame, fps, durationInFrames: 45, config: { damping: 200 } });
  const titleOut = interpolate(frame, [80, 115], [1, 0], clamp);

  // 2. Progressive Chapter Progress Variables
  const mapBuild = interpolate(frame, [120, 360], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const mapHotspots = frame >= 270 && frame < 420;

  const cubeBuild = interpolate(frame, [420, 680], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cubeOrbit = interpolate(frame, [420, 1650], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  const timelineDensityHighlight = frame >= 810 && frame < 960;
  const timelineBrushProgress = interpolate(frame, [880, 1020], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const timelineDetailHighlight = frame >= 980 && frame < 1140;

  // Chapter 4: Assembling into unified dashboard (1140 to 1260)
  const dashboardAssembly = interpolate(frame, [1140, 1260], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // Chapter 5: Visual Allocation Expansion (1440 to 1580)
  const warpProgress = interpolate(frame, [1440, 1580], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const multiplier = interpolate(warpProgress, [0, 1], [1.0, 2.5]);

  // Chrome UI (Nav bar and workflow rail)
  const chromeOpacity = interpolate(dashboardAssembly, [0.3, 1], [0, 1], clamp);

  // ---------------------------------------------------------
  // CAMERA / SURFACE INTERPOLATIONS ACROSS CHAPTERS
  // ---------------------------------------------------------
  // Define layout states:
  // Map Hero (120-420), Cube Hero (420-810), Timeline Hero (810-1140), Assembled Grid (1140-1800)

  const getMapLayout = (): Layout => {
    if (frame < 120) {
      return { x: 260, y: 160, width: 1400, height: 780, scale: 0.95, rotate: -1, opacity: 0 };
    }
    if (frame < 420) {
      // Hero Stage for Map
      const enter = spring({ frame: frame - 120, fps, durationInFrames: 35, config: { damping: 20 } });
      return { x: 260, y: 160, width: 1400, height: 780, scale: enter, rotate: 0, opacity: enter };
    }
    if (frame < 810) {
      // Map slides to background left while Cube is hero
      const trans = interpolate(frame, [420, 480], [0, 1], clamp);
      return {
        x: mix(260, 40, trans),
        y: mix(160, 104, trans),
        width: mix(1400, 740, trans),
        height: mix(780, 580, trans),
        scale: mix(1, 0.96, trans),
        rotate: mix(0, -1, trans),
        opacity: mix(1, 0.25, trans),
      };
    }
    if (frame < 1140) {
      // Map remains small background
      return { x: 40, y: 104, width: 740, height: 580, scale: 0.96, rotate: -1, opacity: 0.25 };
    }
    // Assembled Layout (Crossfades or shares viewport with Cube)
    const activeToggle = frame >= 1320 ? 0 : 1; // Shows 2D map first in coordinated mode, then switches to 3D cube
    return {
      x: 40,
      y: 104,
      width: 1510,
      height: 580,
      scale: 1,
      rotate: 0,
      opacity: dashboardAssembly * activeToggle,
    };
  };

  const getCubeLayout = (): Layout => {
    if (frame < 420) {
      return { x: 260, y: 160, width: 1400, height: 780, scale: 0.9, rotate: 2, opacity: 0 };
    }
    if (frame < 810) {
      // Hero Stage for 3D Cube
      const enter = spring({ frame: frame - 420, fps, durationInFrames: 38, config: { damping: 22 } });
      return { x: 260, y: 160, width: 1400, height: 780, scale: enter, rotate: 0, opacity: enter };
    }
    if (frame < 1140) {
      // Cube slides to background while Timeline is hero
      const trans = interpolate(frame, [810, 870], [0, 1], clamp);
      return {
        x: mix(260, 40, trans),
        y: mix(160, 104, trans),
        width: mix(1400, 1510, trans),
        height: mix(780, 580, trans),
        scale: mix(1, 0.96, trans),
        rotate: mix(0, 0.5, trans),
        opacity: mix(1, 0.25, trans),
      };
    }
    // Assembled Layout
    const activeToggle = frame >= 1320 ? 1 : 0;
    return {
      x: 40,
      y: 104,
      width: 1510,
      height: 580,
      scale: 1,
      rotate: 0,
      opacity: dashboardAssembly * activeToggle,
    };
  };

  const getTimelineLayout = (): Layout => {
    if (frame < 810) {
      return { x: 260, y: 320, width: 1400, height: 460, scale: 0.9, rotate: -1, opacity: 0 };
    }
    if (frame < 1140) {
      // Hero Stage for Timeline
      const enter = spring({ frame: frame - 810, fps, durationInFrames: 35, config: { damping: 20 } });
      return { x: 260, y: 320, width: 1400, height: 460, scale: enter, rotate: 0, opacity: enter };
    }
    // Assembled Layout (Bottom strip)
    const trans = interpolate(frame, [1140, 1260], [0, 1], clamp);
    return {
      x: mix(260, 40, trans),
      y: mix(320, 700, trans),
      width: mix(1400, 1510, trans),
      height: mix(460, 340, trans),
      scale: 1,
      rotate: 0,
      opacity: 1,
    };
  };

  // Chapter Badges (Top Center Overlays)
  const badge1 = interpolate(frame, [125, 150, 390, 415], [0, 1, 1, 0], clamp);
  const badge2 = interpolate(frame, [425, 450, 780, 805], [0, 1, 1, 0], clamp);
  const badge3 = interpolate(frame, [815, 840, 1110, 1135], [0, 1, 1, 0], clamp);
  const badge4 = interpolate(frame, [1150, 1175, 1400, 1425], [0, 1, 1, 0], clamp);
  const badge5 = interpolate(frame, [1445, 1470, 1630, 1650], [0, 1, 1, 0], clamp);

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
      {/* 1. INITIAL HERO TITLE                                */}
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
          Solution Showcase · Interactive Architecture
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
          Building a synchronized spatiotemporal visualization system that scales visual space around crime density bursts.
        </p>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. TOP NAVIGATION BAR (Active in Assembled State)    */}
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
          opacity: chromeOpacity,
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
            ['PRIMARY VIEW', frame >= 1320 ? '3D SPACE-TIME CUBE' : '2D GEOGRAPHIC MAP'],
            ['SYNC STATUS', 'SYNCHRONIZED'],
            ['DATASET', '5,152 CHICAGO RECORDS'],
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
      {/* 3. SURFACE A: 2D MAP                                 */}
      {/* ---------------------------------------------------- */}
      <DashboardSurface title="2D Map (Spatial View)" accent="#2563eb" layout={getMapLayout()}>
        <ShowcaseMap
          selectionProgress={timelineBrushProgress}
          buildProgress={mapBuild}
          highlightHotspots={mapHotspots}
        />
      </DashboardSurface>

      {/* ---------------------------------------------------- */}
      {/* 4. SURFACE B: 3D SPACE-TIME CUBE                     */}
      {/* ---------------------------------------------------- */}
      <DashboardSurface title="3D Space-Time Cube (Spatiotemporal View)" accent="#C8102E" layout={getCubeLayout()}>
        <ShowcaseCube
          selectionProgress={timelineBrushProgress}
          warpProgress={warpProgress}
          multiplier={multiplier}
          cameraProgress={cubeOrbit}
          buildProgress={cubeBuild}
        />
      </DashboardSurface>

      {/* ---------------------------------------------------- */}
      {/* 5. SURFACE C: DUAL TIMELINE                          */}
      {/* ---------------------------------------------------- */}
      <DashboardSurface title="Dual Timeline (Temporal Control)" accent="#0f172a" layout={getTimelineLayout()}>
        <ShowcaseTimeline
          selectionProgress={timelineBrushProgress}
          warpProgress={warpProgress}
          multiplier={multiplier}
          highlightDensity={timelineDensityHighlight}
          highlightDetail={timelineDetailHighlight}
        />
      </DashboardSurface>

      {/* ---------------------------------------------------- */}
      {/* 6. RIGHT WORKFLOW RAIL                               */}
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
          opacity: chromeOpacity,
          transform: `translateX(${(1 - chromeOpacity) * 60}px)`,
          zIndex: 25,
        }}
      >
        <ShowcaseWorkflowRail
          cubeActive={frame >= 1320}
          warpProgress={warpProgress}
          multiplier={multiplier}
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* 7. CINEMATIC CHAPTER ANNOTATION BADGES               */}
      {/* ---------------------------------------------------- */}
      {[
        [
          badge1,
          '1. SPATIAL FOUNDATION',
          'Chicago Basemap & 5,152 Geocoded Crime Incidents',
          '#2563eb',
        ],
        [
          badge2,
          '2. 3D SPACE-TIME CUBE',
          '7 Daily Temporal Layers Rise with Dynamic 3D Camera Orbit',
          '#C8102E',
        ],
        [
          badge3,
          '3. DUAL TIMELINE NAVIGATION',
          'Overview Density Strip + 24-Hour Detail Multi-Scale Brushing',
          '#0f172a',
        ],
        [
          badge4,
          '4. COORDINATED CONVERGENCE',
          'Brushing Thursday 31 July Instantly Slices Map & 3D Volume',
          '#16a34a',
        ],
        [
          badge5,
          '5. VISUAL ALLOCATION',
          `Z-Axis Dynamically Expands Dense Crime Burst (${multiplier.toFixed(1)}×)`,
          '#2563eb',
        ],
      ].map(([opacity, tag, title, tagColor], index) => (
        <div
          key={`chapter-badge-${index}`}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 48,
            transform: 'translateX(-50%)',
            opacity: Number(opacity),
            border: '1.5px solid rgba(15, 23, 42, 0.14)',
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.98)',
            padding: '12px 28px',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 60,
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: String(tagColor), fontSize: 11, fontWeight: 850, letterSpacing: 2, textTransform: 'uppercase', fontFamily: MONO_FONT }}>
            {String(tag)}
          </div>
          <div style={{ color: '#0f172a', fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            {String(title)}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
}
