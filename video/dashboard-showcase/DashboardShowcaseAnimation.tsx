import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
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
  // 0:00 - 0:09 (0 - 270): Act 1: 2D Geographic Map & Incident Hotspots
  // 0:09 - 0:18 (270 - 540): Act 2: 3D STKDE Space-Time Cube & Slices Rising
  // 0:18 - 0:32 (540 - 960): Act 3: Top-Down Temporal Evolution Scan (NEW)
  // 0:32 - 0:42 (960 - 1260): Act 4: Dual Timeline & Multi-Scale Navigation
  // 0:42 - 0:49 (1260 - 1470): Act 5: Coordinated Cross-Filtering
  // 0:49 - 0:55 (1470 - 1650): Act 6: Adaptive Visual Allocation Climax (2.5x Z-expansion)
  // 0:55 - 1:00 (1650 - 1800): Act 7: Final Freeze Frame Hold (Last 5s)

  // 1. Act 1: 2D Map reveal & hotspot pulse
  const mapPointsReveal = interpolate(frame, [0, 120], [0.3, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const mapHotspotsActive = frame >= 90 && frame < 270;

  // Crossfade between 2D Map and 3D Cube in Primary Viewport (Frames 270 to 330)
  const cubeFade = interpolate(frame, [270, 330], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cubeIsActive = cubeFade > 0.5;

  // 2. Act 2: 3D Cube layer rising & initial orbital rotation
  const cubeBuild = interpolate(frame, [270, 480], [0.2, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cubeOrbit = interpolate(frame, [270, 1650], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // 3. Act 3: Top-Down Temporal Evolution Camera Tilt & Slice Scanning (Frames 540 to 960)
  // Camera tilts to overhead at 540-600, holds top-down 600-880, tilts back to 3D oblique 880-960
  const topDownProgress = interpolate(frame, [540, 600, 880, 940], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  // Active scanning through Day 0 to Day 6.99 (Monday to Sunday)
  const scanDayProgress = frame >= 600 && frame < 880
    ? interpolate(frame, [600, 880], [0, 6.99], clamp)
    : -1;

  // 4. Act 4: Timeline Brushing (Frames 960 to 1260)
  const timelineDensityHighlight = frame >= 960 && frame < 1100;
  const timelineDetailHighlight = frame >= 1100 && frame < 1260;
  const brushProgress = interpolate(frame, [1020, 1160], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // 5. Act 6: Adaptive Visual Allocation Expansion (1470 to 1590)
  const warpProgress = interpolate(frame, [1470, 1590], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const multiplier = interpolate(warpProgress, [0, 1], [1.0, 2.5]);

  // Chapter Badges (Bottom Floating Overlays)
  const badge1 = interpolate(frame, [10, 30, 245, 265], [0, 1, 1, 0], clamp);
  const badge2 = interpolate(frame, [275, 295, 515, 535], [0, 1, 1, 0], clamp);
  const badge3 = interpolate(frame, [545, 570, 930, 955], [0, 1, 1, 0], clamp);
  const badge4 = interpolate(frame, [965, 990, 1235, 1255], [0, 1, 1, 0], clamp);
  const badge5 = interpolate(frame, [1265, 1290, 1445, 1465], [0, 1, 1, 0], clamp);
  const badge6 = interpolate(frame, [1475, 1500, 1640, 1650], [0, 1, 1, 0], clamp);

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
            ['PRIMARY VIEW', cubeIsActive ? '3D STKDE DENSITY SLICES' : '2D GEOGRAPHIC MAP'],
            ['SYNC STATUS', 'SYNCHRONIZED'],
            ['DATASET', 'CHICAGO CRIME DATA'],
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
            {cubeIsActive
              ? topDownProgress > 0.5
                ? 'Top-Down STKDE Slice Scan (Temporal Evolution)'
                : '3D STKDE Space-Time Cube (Stacked Density Slices)'
              : '2D Geographic Map (Spatial View)'}
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
              topDownProgress={topDownProgress}
              scanDayProgress={scanDayProgress}
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
          'Chicago Basemap & Geocoded Incident Hotspots',
          '#2563eb',
        ],
        [
          badge2,
          '2. STKDE SPACE-TIME CUBE',
          '7 Daily STKDE Density Slices in 3D Perspective',
          '#C8102E',
        ],
        [
          badge3,
          '3. TOP-DOWN EVOLUTION',
          'Overhead STKDE Scan Reveals Hotspot Migration Across Days',
          '#6366f1',
        ],
        [
          badge4,
          '4. DUAL TIMELINE NAVIGATION',
          'Overview Density Strip + 24-Hour Detail Multi-Scale Brushing',
          '#0f172a',
        ],
        [
          badge5,
          '5. COORDINATED CONVERGENCE',
          'Brushing Thursday 31 July Instantly Synchronizes Map & 3D Cube',
          '#16a34a',
        ],
        [
          badge6,
          '6. VISUAL ALLOCATION',
          `Z-Axis Dynamically Expands Dense Crime Burst (${multiplier.toFixed(1)}×)`,
          '#2563eb',
        ],
      ].map(([opacity, tag, title, tagColor], index) => (
        <div
          key={`chapter-badge-${index}`}
          style={{
            position: 'absolute',
            left: 795,
            top: 116,
            transform: 'translateX(-50%)',
            opacity: Number(opacity),
            border: '1.5px solid rgba(15, 23, 42, 0.14)',
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.98)',
            padding: '10px 24px',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 60,
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: String(tagColor), fontSize: 10.5, fontWeight: 850, letterSpacing: 2, textTransform: 'uppercase', fontFamily: MONO_FONT }}>
            {String(tag)}
          </div>
          <div style={{ color: '#0f172a', fontSize: 16, fontWeight: 800, marginTop: 3 }}>
            {String(title)}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
}
