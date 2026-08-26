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
      ? { text: '1. SPATIAL FOUNDATION', title: '2D MapLibre Basemap & Incident Points', color: '#2563eb', opacity: badge1 }
      : badge2 > 0
      ? { text: '2. 3D SPATIAL VIEW', title: '7 Daily STKDE Density Slices in Perspective Space', color: '#dc2626', opacity: badge2 }
      : badge3 > 0
      ? { text: '3. TOP-DOWN EVOLUTION', title: 'Overhead Scan Reveals Hotspot Migration Across Days', color: '#7c3aed', opacity: badge3 }
      : badge4 > 0
      ? { text: '4. DUAL TIMELINE NAVIGATION', title: 'Overview Density Strip + 24-Hour Detail Multi-Scale Brushing', color: '#2563eb', opacity: badge4 }
      : badge5 > 0
      ? { text: '5. COORDINATED CONVERGENCE', title: 'Brushing Thursday 31 July Synchronizes Map, Cube & Sidebar', color: '#059669', opacity: badge5 }
      : badge6 > 0
      ? { text: '6. GLOBAL ADAPTIVE WARP', title: `Z-Axis Dynamically Expands Dense Crime Burst (${multiplier.toFixed(1)}×)`, color: '#dc2626', opacity: badge6 }
      : { text: '', title: '', color: '#2563eb', opacity: 0 };

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
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* ---------------------------------------------------- */}
        {/* LEFT / CENTER REGION: 1600px width (pr-80 / 320px)   */}
        {/* ---------------------------------------------------- */}
        <div
          style={{
            width: 1600,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* ================================================== */}
          {/* UPPER SECTION: Shared Viewport (1600 x 710)        */}
          {/* ================================================== */}
          <section
            style={{
              position: 'relative',
              width: '100%',
              height: 710,
              overflow: 'hidden',
              background: '#ffffff',
            }}
            aria-label="dashboard demo shared viewport"
          >
            {/* 1. Floating Top-Left Preset Selector (DemoPresetSelect) */}
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: 16,
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: 'rgba(255, 255, 255, 0.92)',
                padding: '6px 12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(12px)',
                cursor: 'pointer',
              }}
            >
              <Sparkles style={{ width: 14, height: 14, color: '#2563eb' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                Chicago Crime Burst · July 28 – Aug 4, 2025
              </span>
              <ChevronDown style={{ width: 13, height: 13, color: '#64748b' }} />
            </div>

            {/* 2. Floating Top-Center Narrative Chapter Badge */}
            {currentBadge.opacity > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 45,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                  backdropFilter: 'blur(12px)',
                  opacity: currentBadge.opacity,
                  transition: 'opacity 0.2s ease',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 1.5,
                    fontFamily: MONO_FONT,
                    color: currentBadge.color,
                    textTransform: 'uppercase',
                  }}
                >
                  {currentBadge.text}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#0f172a',
                    marginTop: 2,
                  }}
                >
                  {currentBadge.title}
                </span>
              </div>
            ) : null}

            {/* 3. Floating Top-Right Viewport Switcher Pill */}
            <div
              style={{
                position: 'absolute',
                right: 16,
                top: 16,
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 99,
                border: '1px solid #e2e8f0',
                background: 'rgba(241, 245, 249, 0.85)',
                padding: 4,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* [Map] Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  background: !cubeIsActive ? '#ffffff' : 'transparent',
                  color: !cubeIsActive ? '#0f172a' : '#64748b',
                  boxShadow: !cubeIsActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
                title="Map"
              >
                <Map style={{ width: 14, height: 14 }} />
              </div>

              {/* [3D Cube] Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  background: cubeIsActive ? '#ffffff' : 'transparent',
                  color: cubeIsActive ? '#0f172a' : '#64748b',
                  boxShadow: cubeIsActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
                title="3D"
              >
                <Box style={{ width: 14, height: 14 }} />
              </div>

              {/* [Compare] Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  background: 'transparent',
                  color: '#94a3b8',
                }}
                title="Compare"
              >
                <GitCompareArrows style={{ width: 14, height: 14 }} />
              </div>

              {!cubeIsActive ? (
                <>
                  <div style={{ width: 1, height: 18, background: '#cbd5e1', margin: '0 2px' }} />
                  {/* POI Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      background: '#ffffff',
                      color: '#0f172a',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                    title="POI"
                  >
                    <MapPin style={{ width: 14, height: 14 }} />
                  </div>
                  {/* STKDE Flame Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      background: '#ffffff',
                      color: '#ef4444',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                    title="STKDE Flame"
                  >
                    <Flame style={{ width: 14, height: 14 }} />
                  </div>
                  {/* Heatmap Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      background: 'transparent',
                      color: '#64748b',
                    }}
                    title="Heatmap"
                  >
                    <Layers3 style={{ width: 14, height: 14 }} />
                  </div>
                </>
              ) : null}
            </div>

            {/* 4. Shared Viewport Canvas: 2D Map -> 3D Space-Time Cube Crossfade */}
            <div style={{ position: 'absolute', inset: 0 }}>
              {/* 2D Map View */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 1 - cubeFade,
                  pointerEvents: !cubeIsActive ? 'auto' : 'none',
                }}
              >
                <RealDashboardMap
                  selectionProgress={brushProgress}
                  revealProgress={mapPointsReveal}
                />
              </div>

              {/* 3D Space-Time Cube View */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: cubeFade,
                  pointerEvents: cubeIsActive ? 'auto' : 'none',
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

          {/* ================================================== */}
          {/* LOWER SECTION: Dual Timeline Panel (1600 x 370)    */}
          {/* ================================================== */}
          <div
            style={{
              width: '100%',
              height: 370,
              borderTop: '1px solid #e2e8f0',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(16px)',
              position: 'relative',
              zIndex: 30,
              boxSizing: 'border-box',
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
        {/* RIGHT SECTION: Fixed 320px Workflow Rail             */}
        {/* ---------------------------------------------------- */}
        <div
          style={{
            width: 320,
            height: '100%',
            position: 'relative',
            zIndex: 50,
          }}
        >
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
