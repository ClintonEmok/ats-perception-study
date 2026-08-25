import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { ShowcaseCube } from './ShowcaseCube';
import { ShowcaseMap } from './ShowcaseMap';
import { ShowcaseTimeline } from './ShowcaseTimeline';
import { ShowcaseWorkflowRail } from './ShowcaseWorkflowRail';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

export function DashboardShowcaseAnimation() {
  const frame = useCurrentFrame();

  // ---------------------------------------------------------
  // 60-SECOND SHOWCASE TIMELINE (1800 frames @ 30fps)
  // ---------------------------------------------------------
  // 0:00 - 0:12 (0 - 360): Act 1: 2D Geographic Map & Incident Hotspots
  // 0:12 - 0:26 (360 - 780): Act 2: 3D Space-Time Cube & Smooth Orbital Camera
  // 0:26 - 0:38 (780 - 1140): Act 3: Dual Timeline & Multi-Scale Navigation
  // 0:38 - 0:48 (1140 - 1440): Act 4: Coordinated Cross-Filtering
  // 0:48 - 0:55 (1440 - 1650): Act 5: Adaptive Visual Allocation Climax (Z-axis 2.5x expansion)
  // 0:55 - 1:00 (1650 - 1800): Act 6: Final Freeze Frame Hold (Last 5s)

  // 1. Act 1: 2D Map reveal & hotspot pulse
  const mapPointsReveal = interpolate(frame, [0, 150], [0.3, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const mapHotspotsActive = frame >= 120 && frame < 360;

  // 2. Act 2: 3D Cube layer rising & continuous orbital camera rotation
  const cubeBuild = interpolate(frame, [360, 600], [0.2, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cubeOrbit = interpolate(frame, [360, 1650], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // 3. Act 3 & 4: Timeline Brushing
  const timelineDensityHighlight = frame >= 780 && frame < 940;
  const timelineDetailHighlight = frame >= 940 && frame < 1140;
  const brushProgress = interpolate(frame, [860, 1020], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // Crossfade between 2D Map and 3D Cube in Primary Viewport
  // Frame 0-360: Map (100%), Frame 360-420: Crossfade to Cube, Frame 420-1800: Cube active
  const cubeFade = interpolate(frame, [360, 420], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cubeIsActive = cubeFade > 0.5;

  // 4. Act 5: Adaptive Visual Allocation Expansion (1440 to 1580)
  const warpProgress = interpolate(frame, [1440, 1580], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const multiplier = interpolate(warpProgress, [0, 1], [1.0, 2.5]);

  // Chapter Badges (Bottom Floating Overlays)
  const badge1 = interpolate(frame, [10, 30, 330, 355], [0, 1, 1, 0], clamp);
  const badge2 = interpolate(frame, [365, 390, 750, 775], [0, 1, 1, 0], clamp);
  const badge3 = interpolate(frame, [785, 810, 1110, 1135], [0, 1, 1, 0], clamp);
  const badge4 = interpolate(frame, [1145, 1170, 1400, 1425], [0, 1, 1, 0], clamp);
  const badge5 = interpolate(frame, [1445, 1470, 1640, 1650], [0, 1, 1, 0], clamp);

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
      {/* 1. TOP DASHBOARD NAVIGATION BAR                      */}
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
          background: 'rgba(255, 255, 255, 0.98)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          boxSizing: 'border-box',
          zIndex: 30,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
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
            ['PRIMARY VIEW', cubeIsActive ? '3D SPACE-TIME CUBE' : '2D GEOGRAPHIC MAP'],
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
      {/* 2. PRIMARY VIEWPORT CONTAINER (Top Left: 1510x580)    */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 104,
          width: 1510,
          height: 580,
          border: '1.5px solid rgba(15, 23, 42, 0.13)',
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
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
            <i style={{ width: 8, height: 8, borderRadius: 99, background: cubeIsActive ? '#C8102E' : '#2563eb' }} />
            {cubeIsActive ? '3D Space-Time Cube (Spatiotemporal View)' : '2D Geographic Map (Spatial View)'}
          </div>
          <div style={{ color: '#64748b', fontSize: 9, fontFamily: MONO_FONT, letterSpacing: 1.2, fontWeight: 700 }}>
            CHICAGO CRIME · 28 JUL – 4 AUG 2025
          </div>
        </div>

        {/* Viewport Content with Smooth Crossfade */}
        <div style={{ position: 'relative', height: 'calc(100% - 38px)', width: '100%' }}>
          {/* 2D Map Layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 1 - cubeFade,
              pointerEvents: cubeFade >= 1 ? 'none' : 'auto',
            }}
          >
            <ShowcaseMap
              selectionProgress={brushProgress}
              revealProgress={mapPointsReveal}
              highlightHotspots={mapHotspotsActive}
            />
          </div>

          {/* 3D Space-Time Cube Layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: cubeFade,
              pointerEvents: cubeFade <= 0 ? 'none' : 'auto',
            }}
          >
            <ShowcaseCube
              selectionProgress={brushProgress}
              warpProgress={warpProgress}
              multiplier={multiplier}
              cameraProgress={cubeOrbit}
              buildProgress={cubeBuild}
            />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. DUAL TIMELINE CONTAINER (Bottom Left: 1510x340)   */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 700,
          width: 1510,
          height: 340,
          border: '1.5px solid rgba(15, 23, 42, 0.13)',
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        {/* Header */}
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
            <i style={{ width: 8, height: 8, borderRadius: 99, background: '#0f172a' }} />
            Dual Timeline (Temporal Navigation & Visual Allocation)
          </div>
          <div style={{ color: '#64748b', fontSize: 9, fontFamily: MONO_FONT, letterSpacing: 1.2, fontWeight: 700 }}>
            MULTI-SCALE TEMPORAL RESOLUTION
          </div>
        </div>

        {/* Timeline Viewport */}
        <div style={{ height: 'calc(100% - 38px)' }}>
          <ShowcaseTimeline
            selectionProgress={brushProgress}
            warpProgress={warpProgress}
            multiplier={multiplier}
            highlightDensity={timelineDensityHighlight}
            highlightDetail={timelineDetailHighlight}
          />
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. RIGHT WORKFLOW RAIL (1566x104, Width=314)         */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 1566,
          top: 104,
          width: 314,
          height: 936,
          border: '1.5px solid rgba(15, 23, 42, 0.14)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
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
      {/* 5. FLOATING CHAPTER NARRATIVE BADGES                 */}
      {/* ---------------------------------------------------- */}
      {[
        [
          badge1,
          '1. SPATIAL FOUNDATION',
          'Chicago Basemap & 5,152 Geocoded Incident Hotspots',
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
          'Brushing Thursday 31 July Instantly Synchronizes Map & 3D Cube',
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
            left: 795,
            bottom: 44,
            transform: 'translateX(-50%)',
            opacity: Number(opacity),
            border: '1.5px solid rgba(15, 23, 42, 0.14)',
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.98)',
            padding: '12px 28px',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14)',
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
