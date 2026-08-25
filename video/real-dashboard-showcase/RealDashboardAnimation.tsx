import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { FONT_FAMILY } from '../theme';
import { RealDashboardCube } from './RealDashboardCube';
import { RealDashboardHeader } from './RealDashboardHeader';
import { RealDashboardMap } from './RealDashboardMap';
import { RealDashboardRail } from './RealDashboardRail';
import { RealDashboardTimeline } from './RealDashboardTimeline';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

export function RealDashboardAnimation() {
  const frame = useCurrentFrame();

  // ---------------------------------------------------------
  // 60-SECOND DASHBOARD DEMO TIMELINE (1800 frames @ 30fps)
  // ---------------------------------------------------------
  // 0:00 - 0:09 (0 - 270): Act 1: 2D MapLibre Spatial Foundation
  // 0:09 - 0:18 (270 - 540): Act 2: 3D STKDE Space-Time Cube & Slices Rising
  // 0:18 - 0:32 (540 - 960): Act 3: Top-Down Temporal Evolution Scan (Mon->Sun)
  // 0:32 - 0:42 (960 - 1260): Act 4: Dual Timeline Navigation & Brushing (31 Jul)
  // 0:42 - 0:49 (1260 - 1470): Act 5: Coordinated Cross-Filtering
  // 0:49 - 0:55 (1470 - 1650): Act 6: Adaptive Visual Allocation Climax (2.5x expansion)
  // 0:55 - 1:00 (1650 - 1800): Act 7: Final 5-Second Freeze Frame Hold

  // 1. Act 1: Map Reveal
  const mapPointsReveal = interpolate(frame, [0, 120], [0.35, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  // Crossfade between 2D Map and 3D Cube in Primary Viewport (Frames 270 to 330)
  const cubeFade = interpolate(frame, [270, 330], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cubeIsActive = cubeFade > 0.5;

  // 2. Act 2: 3D Cube layer rising & orbital camera sweep
  const cubeBuild = interpolate(frame, [270, 480], [0.2, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cubeOrbit = interpolate(frame, [270, 1650], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // 3. Act 3: Top-Down Temporal Evolution Camera Tilt & Slice Scanning (Frames 540 to 960)
  const topDownProgress = interpolate(frame, [540, 600, 880, 940], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const scanDayProgress =
    frame >= 600 && frame < 880
      ? interpolate(frame, [600, 880], [0, 6.99], clamp)
      : -1;

  // 4. Act 4: Timeline Brushing (Frames 960 to 1260)
  const timelineDensityHighlight = frame >= 960 && frame < 1100;
  const timelineDetailHighlight = frame >= 1100 && frame < 1260;
  const brushProgress = interpolate(frame, [1020, 1160], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // 5. Act 6: Adaptive Visual Allocation Expansion (1470 to 1590)
  const warpProgress = interpolate(frame, [1470, 1590], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const multiplier = interpolate(warpProgress, [0, 1], [1.0, 2.5]);

  // Chapter Badges (Top Center Overlays in Header)
  const badge1 = interpolate(frame, [10, 30, 245, 265], [0, 1, 1, 0], clamp);
  const badge2 = interpolate(frame, [275, 295, 515, 535], [0, 1, 1, 0], clamp);
  const badge3 = interpolate(frame, [545, 570, 930, 955], [0, 1, 1, 0], clamp);
  const badge4 = interpolate(frame, [965, 990, 1235, 1255], [0, 1, 1, 0], clamp);
  const badge5 = interpolate(frame, [1265, 1290, 1445, 1465], [0, 1, 1, 0], clamp);
  const badge6 = interpolate(frame, [1475, 1500, 1640, 1650], [0, 1, 1, 0], clamp);

  const currentBadge =
    badge1 > 0
      ? { text: '1. SPATIAL FOUNDATION', title: 'Chicago Basemap & Incident Hotspots', color: '#38bdf8', opacity: badge1 }
      : badge2 > 0
      ? { text: '2. STKDE SPACE-TIME CUBE', title: '7 Daily STKDE Density Slices in 3D Perspective', color: '#ef4444', opacity: badge2 }
      : badge3 > 0
      ? { text: '3. TOP-DOWN EVOLUTION', title: 'Overhead STKDE Scan Reveals Hotspot Migration Across Days', color: '#a855f7', opacity: badge3 }
      : badge4 > 0
      ? { text: '4. DUAL TIMELINE NAVIGATION', title: 'Overview Density Strip + 24-Hour Detail Multi-Scale Brushing', color: '#38bdf8', opacity: badge4 }
      : badge5 > 0
      ? { text: '5. COORDINATED CONVERGENCE', title: 'Brushing Thursday 31 July Instantly Synchronizes Map & 3D Cube', color: '#10b981', opacity: badge5 }
      : badge6 > 0
      ? { text: '6. VISUAL ALLOCATION', title: `Z-Axis Dynamically Expands Dense Crime Burst (${multiplier.toFixed(1)}×)`, color: '#ef4444', opacity: badge6 }
      : { text: '', title: '', color: '#38bdf8', opacity: 0 };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020617',
        color: '#f8fafc',
        fontFamily: FONT_FAMILY,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. TOP AUTHENTIC DASHBOARD HEADER                    */}
      {/* ---------------------------------------------------- */}
      <RealDashboardHeader
        cubeActive={cubeIsActive}
        topDownActive={topDownProgress > 0.5}
        badgeText={currentBadge.text}
        badgeTitle={currentBadge.title}
        badgeColor={currentBadge.color}
        badgeOpacity={currentBadge.opacity}
      />

      {/* ---------------------------------------------------- */}
      {/* 2. PRIMARY VIEWPORT CONTAINER (Top Left: 1530x590)   */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 24,
          top: 96,
          width: 1530,
          height: 590,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          background: '#090d16',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        {/* 2D Map Layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 1 - cubeFade,
            pointerEvents: cubeFade >= 1 ? 'none' : 'auto',
          }}
        >
          <RealDashboardMap
            selectionProgress={brushProgress}
            revealProgress={mapPointsReveal}
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
          <RealDashboardCube
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

      {/* ---------------------------------------------------- */}
      {/* 3. DUAL TIMELINE CONTAINER (Bottom Left: 1530x354)   */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 24,
          top: 702,
          width: 1530,
          height: 354,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          background: '#090d16',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        <RealDashboardTimeline
          selectionProgress={brushProgress}
          warpProgress={warpProgress}
          multiplier={multiplier}
          highlightDensity={timelineDensityHighlight}
          highlightDetail={timelineDetailHighlight}
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. RIGHT WORKFLOW RAIL (1572x96, Width=324, H=960)   */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 1572,
          top: 96,
          width: 324,
          height: 960,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
          zIndex: 25,
        }}
      >
        <RealDashboardRail
          cubeActive={cubeIsActive}
          warpProgress={warpProgress}
          multiplier={multiplier}
        />
      </div>
    </AbsoluteFill>
  );
}
