import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import {
  Box,
  ChevronDown,
  Flame,
  GitCompareArrows,
  Layers3,
  Map,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { RealDashboardCube } from './RealDashboardCube';
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
  // 0:42 - 0:49 (1260 - 1470): Act 5: Coordinated Convergence
  // 0:49 - 0:55 (1470 - 1650): Act 6: Adaptive Visual Allocation Climax (2.5x expansion)
  // 0:55 - 1:00 (1650 - 1800): Act 7: Final 5-Second Freeze Frame Hold

  // 1. Act 1: Map Reveal
  const mapPointsReveal = interpolate(frame, [0, 120], [0.35, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  // Crossfade between 2D Map and 3D Cube in Shared Viewport (Frames 270 to 330)
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

  // Active Tab for Right Workflow Rail
  const railActiveTab =
    frame >= 1470
      ? 'slices'
      : frame >= 960
      ? 'overview'
      : frame >= 540
      ? 'scan'
      : frame >= 270
      ? 'inspect'
      : 'overview';

  // Chapter Badges (Top Center Floating Chip)
  const badge1 = interpolate(frame, [10, 30, 245, 265], [0, 1, 1, 0], clamp);
  const badge2 = interpolate(frame, [275, 295, 515, 535], [0, 1, 1, 0], clamp);
  const badge3 = interpolate(frame, [545, 570, 930, 955], [0, 1, 1, 0], clamp);
  const badge4 = interpolate(frame, [965, 990, 1235, 1255], [0, 1, 1, 0], clamp);
  const badge5 = interpolate(frame, [1265, 1290, 1445, 1465], [0, 1, 1, 0], clamp);
  const badge6 = interpolate(frame, [1475, 1500, 1640, 1650], [0, 1, 1, 0], clamp);

  const currentBadge =
    badge1 > 0
      ? { text: '1. SPATIAL FOUNDATION', title: '2D MapLibre Basemap & Incident Points', color: '#38bdf8', opacity: badge1 }
      : badge2 > 0
      ? { text: '2. 3D SPATIAL VIEW', title: '7 Daily STKDE Density Slices in Perspective Space', color: '#ef4444', opacity: badge2 }
      : badge3 > 0
      ? { text: '3. TOP-DOWN EVOLUTION', title: 'Overhead Scan Reveals Hotspot Migration Across Days', color: '#a855f7', opacity: badge3 }
      : badge4 > 0
      ? { text: '4. DUAL TIMELINE NAVIGATION', title: 'Overview Density Strip + 24-Hour Detail Multi-Scale Brushing', color: '#38bdf8', opacity: badge4 }
      : badge5 > 0
      ? { text: '5. COORDINATED CONVERGENCE', title: 'Brushing Thursday 31 July Synchronizes Map, Cube & Sidebar', color: '#10b981', opacity: badge5 }
      : badge6 > 0
      ? { text: '6. GLOBAL ADAPTIVE WARP', title: `Z-Axis Dynamically Expands Dense Crime Burst (${multiplier.toFixed(1)}×)`, color: '#ef4444', opacity: badge6 }
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
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* ---------------------------------------------------- */}
        {/* LEFT COLUMN: MAIN WORKSPACE (Width: 1600px)          */}
        {/* ---------------------------------------------------- */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, position: 'relative' }}>
          
          {/* A. UPPER SHARED VIEWPORT (Height: 710px) */}
          <section
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              background: '#090d16',
            }}
          >
            {/* 1. Top Left: DemoPresetSelect Dropdown Pill */}
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: 16,
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: '7px 12px',
                color: '#f8fafc',
                fontSize: 12,
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Sparkles style={{ width: 14, height: 14, color: '#38bdf8' }} />
              <span>Chicago Crime Burst · July 28 – Aug 4, 2025</span>
              <ChevronDown style={{ width: 13, height: 13, color: '#94a3b8' }} />
            </div>

            {/* 2. Top Center: Chapter Narrative Explanation Chip */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 16,
                transform: 'translateX(-50%)',
                zIndex: 40,
                opacity: currentBadge.opacity,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'none',
                padding: '6px 20px',
                borderRadius: 8,
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #1e293b',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  color: currentBadge.color,
                  fontSize: 9.5,
                  fontWeight: 850,
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                  fontFamily: MONO_FONT,
                }}
              >
                {currentBadge.text}
              </div>
              <div style={{ color: '#ffffff', fontSize: 13.5, fontWeight: 750, marginTop: 2 }}>
                {currentBadge.title}
              </div>
            </div>

            {/* 3. Top Right: Viewport Mode Switcher Pill (Matching DashboardDemoShell) */}
            <div
              style={{
                position: 'absolute',
                right: 16,
                top: 16,
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 9999,
                border: '1px solid #1e293b',
                background: 'rgba(15, 23, 42, 0.8)',
                padding: 4,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Map Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  background: !cubeIsActive ? '#1e293b' : 'transparent',
                  color: !cubeIsActive ? '#f8fafc' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
                title="Map"
              >
                <Map style={{ width: 14, height: 14 }} />
              </div>

              {/* 3D Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  background: cubeIsActive ? '#1e293b' : 'transparent',
                  color: cubeIsActive ? '#f8fafc' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
                title="3D"
              >
                <Box style={{ width: 14, height: 14 }} />
              </div>

              {/* Compare Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  background: 'transparent',
                  color: '#64748b',
                }}
                title="Compare"
              >
                <GitCompareArrows style={{ width: 14, height: 14 }} />
              </div>

              {/* Separator & Map Layer Toggles when Map is active */}
              {!cubeIsActive ? (
                <>
                  <div style={{ width: 1, height: 16, background: '#334155', margin: '0 2px' }} />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 9999,
                      background: 'transparent',
                      color: '#94a3b8',
                    }}
                    title="POIs"
                  >
                    <MapPin style={{ width: 14, height: 14 }} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 9999,
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                    }}
                    title="STKDE"
                  >
                    <Flame style={{ width: 14, height: 14 }} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 9999,
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                    }}
                    title="Heatmap"
                  >
                    <Layers3 style={{ width: 14, height: 14 }} />
                  </div>
                </>
              ) : null}
            </div>

            {/* Viewport Content with Smooth Crossfade */}
            <div style={{ position: 'absolute', inset: 0 }}>
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
          </section>

          {/* B. LOWER TIMELINE PANEL (Height: 370px) */}
          <div
            style={{
              height: 370,
              borderTop: '1px solid #1e293b',
              background: '#0f172a',
              position: 'relative',
              zIndex: 20,
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
        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT COLUMN: FIXED WORKFLOW RAIL (Width: 320px)     */}
        {/* ---------------------------------------------------- */}
        <div style={{ width: 320, height: '100%', flexShrink: 0, position: 'relative', zIndex: 30 }}>
          <RealDashboardRail
            cubeActive={cubeIsActive}
            warpProgress={warpProgress}
            multiplier={multiplier}
            activeTabOverride={railActiveTab}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}
