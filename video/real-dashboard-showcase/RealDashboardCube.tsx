import React from 'react';
import { interpolate } from 'remotion';
import { ChevronUp } from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  buildAdaptiveDayLayout,
  buildAdaptiveHourLayout,
  CUBE_CELLS,
  SELECTED_START,
  WEEK_START,
} from '../real/data';

const DAY_NAMES = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 31', 'Fri 01', 'Sat 02', 'Sun 03'];
const SELECTED_DAY_INDEX = 3;

// Crime category colors matching LIGHT palette in src/lib/palettes.ts
const COLOR_BY_TYPE: Record<string, string> = {
  THEFT: '#b8860b',
  BATTERY: '#b45309',
  ASSAULT: '#cc3700',
  'CRIMINAL DAMAGE': '#be123c',
  OTHER: '#64748b',
};

const colorForType = (type?: string) => (type ? COLOR_BY_TYPE[type] || '#64748b' : '#64748b');

// Canonical STKDE color stops from src/app/stkde-3d/lib/palette.ts
const STKDE_GRADIENT_CSS =
  'linear-gradient(90deg, #faf4d7 0%, #f4d788 25%, #e29147 50%, #be462d 75%, #842b20 90%, #4f1b1b 100%)';

interface ScreenPoint {
  x: number;
  y: number;
  depth: number;
}

// 3D Perspective Projection Function (matches Three.js CameraControls)
const project3D = (
  x: number, // East-West: -50 to +50
  z: number, // North-South: -50 to +50
  timeY: number, // Time Axis: 0 to 100
  yawDeg: number,
  pitchDeg: number,
  centerX = 800,
  centerY = 355,
  scale = 4.2,
  cameraDist = 580
): ScreenPoint => {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;

  const cX = x;
  const cY = z;
  const cZ = timeY - 50;

  const x1 = cX * Math.cos(yaw) - cY * Math.sin(yaw);
  const y1 = cX * Math.sin(yaw) + cY * Math.cos(yaw);
  const z1 = cZ;

  const x2 = x1;
  const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch);

  const factor = cameraDist / (cameraDist + y2);
  const screenX = centerX + x2 * scale * factor;
  const screenY = centerY - z2 * scale * factor;

  return { x: screenX, y: screenY, depth: y2 };
};

const polygon = (points: ScreenPoint[]) => points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

const cornersAt = (
  timeY: number,
  yaw: number,
  pitch: number,
  size = 50,
  centerX = 800,
  centerY = 355,
  scale = 4.2
): ScreenPoint[] => [
  project3D(-size, -size, timeY, yaw, pitch, centerX, centerY, scale),
  project3D(size, -size, timeY, yaw, pitch, centerX, centerY, scale),
  project3D(size, size, timeY, yaw, pitch, centerX, centerY, scale),
  project3D(-size, size, timeY, yaw, pitch, centerX, centerY, scale),
];

// Major Chicago Arterial Street network lines for authentic ground plane
const CHICAGO_STREETS: Array<Array<[number, number]>> = [
  // Lake Shore Drive (Coastline Curve)
  [[12, -48], [16, -30], [20, -10], [22, 5], [26, 25], [32, 45]],
  // I-90/I-94 Kennedy / Dan Ryan Expressway (NW to S diagonal)
  [[-38, -48], [-25, -28], [-10, -15], [3, -5], [5, 10], [-2, 30], [-10, 48]],
  // I-290 Eisenhower Expressway (West into Loop)
  [[-48, -4], [-30, -4], [-15, -4], [6, -4]],
  // North-South Arterials (Western Ave, Halsted, Michigan Ave, State St)
  [[-25, -48], [-25, 48]], // Western Ave
  [[-5, -48], [-5, 48]],   // Halsted St
  [[6, -45], [6, 45]],     // State St / Michigan Ave
  // East-West Arterials (North Ave, Chicago Ave, Madison, Roosevelt, 31st, 55th, 79th)
  [[-48, -25], [16, -25]], // North Ave
  [[-48, -12], [20, -12]], // Chicago Ave
  [[-48, 0], [22, 0]],     // Madison St (Zero Baseline)
  [[-48, 12], [24, 12]],   // Roosevelt Rd
  [[-48, 24], [26, 24]],   // 31st / Pershing
  [[-48, 36], [30, 36]],   // 55th / Garfield
];

export function RealDashboardCube({
  selectionProgress = 0,
  warpProgress = 0,
  multiplier = 1,
  cameraProgress = 0,
  buildProgress = 1,
  topDownProgress = 0,
  scanDayProgress = -1,
}: {
  selectionProgress?: number;
  warpProgress?: number;
  multiplier?: number;
  cameraProgress?: number;
  buildProgress?: number;
  topDownProgress?: number;
  scanDayProgress?: number;
}) {
  const dayLayout = buildAdaptiveDayLayout(warpProgress, multiplier);
  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);
  const selectedDay = SELECTED_DAY_INDEX;

  const dayCells = Array.from({ length: 7 }, (_, dayIndex) =>
    CUBE_CELLS.filter(
      (cell) => Math.min(6, Math.max(0, Math.floor((cell.time - WEEK_START) / 86400))) === dayIndex
    )
  );

  const selectedTimeLayers = Array.from(
    new Set(dayCells[selectedDay].map((c) => c.time))
  ).sort((a, b) => a - b);

  // Camera Orbit Angles (Matches Three.js CameraControls smoothly)
  const baseYaw = interpolate(cameraProgress, [0, 0.25, 0.5, 0.75, 1], [-32, -24, -18, -26, -22], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const basePitch = interpolate(cameraProgress, [0, 0.25, 0.5, 0.75, 1], [30, 25, 20, 27, 24], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Top-Down Overhead Camera Sweep (85.5 degrees)
  const yaw = interpolate(topDownProgress, [0, 1], [baseYaw, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pitch = interpolate(topDownProgress, [0, 1], [basePitch, 85.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const centerX = 800;
  const centerY = interpolate(topDownProgress, [0, 1], [355, 340], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(topDownProgress, [0, 1], [4.2, 5.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cubeHeight = 100;
  const base = cornersAt(0, yaw, pitch, 50, centerX, centerY, scale);
  const top = cornersAt(cubeHeight, yaw, pitch, 50, centerX, centerY, scale);

  const visibleLayersCount = interpolate(buildProgress, [0.15, 0.85], [1, 7], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const isScanning = scanDayProgress >= 0;
  const currentScanDay = Math.min(6, Math.max(0, Math.floor(scanDayProgress)));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#f4f1eb',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 1600 710" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Authentic Continuous STKDE Gaussian Radial Multi-Stop Gradients */}
          <radialGradient id="stkde-gaussian-low" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#faf4d7" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#f4d788" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#f4d788" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#faf4d7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="stkde-gaussian-mid" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e29147" stopOpacity="0.98" />
            <stop offset="35%" stopColor="#f4d788" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#faf4d7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#faf4d7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="stkde-gaussian-high" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4f1b1b" stopOpacity="1" />
            <stop offset="25%" stopColor="#842b20" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#be462d" stopOpacity="0.85" />
            <stop offset="75%" stopColor="#e29147" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#faf4d7" stopOpacity="0" />
          </radialGradient>

          {/* Pedestal Base Face Gradients */}
          <linearGradient id="pedestal-side-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dedbd2" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="pedestal-side-left" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
        </defs>

        {/* ============================================================ */}
        {/* 1. BEVELED BASE PEDESTAL BLOCK (MAP_PLANE_Y = -38 in 3D)     */}
        {/* ============================================================ */}
        <g opacity={1 - topDownProgress * 0.4}>
          {/* Front Bevel Edge (Y: -3 to 0, Z: 50) */}
          {(() => {
            const p1 = project3D(-50, 50, -3, yaw, pitch, centerX, centerY, scale);
            const p2 = project3D(50, 50, -3, yaw, pitch, centerX, centerY, scale);
            const p3 = project3D(50, 50, 0, yaw, pitch, centerX, centerY, scale);
            const p4 = project3D(-50, 50, 0, yaw, pitch, centerX, centerY, scale);
            return (
              <polygon
                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                fill="url(#pedestal-side-front)"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            );
          })()}

          {/* Left Bevel Edge (Y: -3 to 0, X: -50) */}
          {(() => {
            const p1 = project3D(-50, -50, -3, yaw, pitch, centerX, centerY, scale);
            const p2 = project3D(-50, 50, -3, yaw, pitch, centerX, centerY, scale);
            const p3 = project3D(-50, 50, 0, yaw, pitch, centerX, centerY, scale);
            const p4 = project3D(-50, -50, 0, yaw, pitch, centerX, centerY, scale);
            return (
              <polygon
                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                fill="url(#pedestal-side-left)"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            );
          })()}
        </g>

        {/* ============================================================ */}
        {/* 2. GROUND MAPLIBRE BASEMAP PLANE (Y = 0)                     */}
        {/* ============================================================ */}
        <polygon points={polygon(base)} fill="#f8f7f4" stroke="#b8a99a" strokeWidth="1.5" />

        {/* Lake Michigan Water Body on East Edge */}
        {(() => {
          const w1 = project3D(18, -50, 0, yaw, pitch, centerX, centerY, scale);
          const w2 = project3D(50, -50, 0, yaw, pitch, centerX, centerY, scale);
          const w3 = project3D(50, 50, 0, yaw, pitch, centerX, centerY, scale);
          const w4 = project3D(34, 50, 0, yaw, pitch, centerX, centerY, scale);
          const w5 = project3D(28, 25, 0, yaw, pitch, centerX, centerY, scale);
          const w6 = project3D(22, 5, 0, yaw, pitch, centerX, centerY, scale);
          const w7 = project3D(16, -30, 0, yaw, pitch, centerX, centerY, scale);
          return (
            <polygon
              points={`${w1.x},${w1.y} ${w2.x},${w2.y} ${w3.x},${w3.y} ${w4.x},${w4.y} ${w5.x},${w5.y} ${w6.x},${w6.y} ${w7.x},${w7.y}`}
              fill="rgba(186, 230, 253, 0.65)"
              stroke="rgba(59, 130, 246, 0.45)"
              strokeWidth="1.2"
            />
          );
        })()}

        {/* Authentic Chicago Arterial Street Network Lines */}
        <g stroke="#cbd5e1" strokeWidth="0.9" fill="none" opacity="0.8">
          {CHICAGO_STREETS.map((street, sIdx) => {
            const pts = street.map(([sx, sz]) => project3D(sx, sz, 0, yaw, pitch, centerX, centerY, scale));
            const pathStr = pts.map((p, pIdx) => `${pIdx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            return <path key={`street-${sIdx}`} d={pathStr} strokeDasharray={sIdx === 0 ? undefined : '3 2'} />;
          })}
        </g>

        {/* Ground 10x10 Coordinate Grid Lines */}
        {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((coord) => {
          const a = project3D(-50, coord, 0, yaw, pitch, centerX, centerY, scale);
          const b = project3D(50, coord, 0, yaw, pitch, centerX, centerY, scale);
          const c = project3D(coord, -50, 0, yaw, pitch, centerX, centerY, scale);
          const d = project3D(coord, 50, 0, yaw, pitch, centerX, centerY, scale);
          return (
            <g key={`ground-grid-${coord}`} opacity="0.35">
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#b8a99a" strokeWidth="0.6" strokeDasharray="2 2" />
              <line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#b8a99a" strokeWidth="0.6" strokeDasharray="2 2" />
            </g>
          );
        })}

        {/* ============================================================ */}
        {/* 3. REAR WALL BACKDROP & SLICE BOUNDARIES (Z = -50)           */}
        {/* ============================================================ */}
        <g opacity={1 - topDownProgress * 0.9}>
          {/* Rear Wall Plane Quad */}
          {(() => {
            const r1 = project3D(-50, -50, 0, yaw, pitch, centerX, centerY, scale);
            const r2 = project3D(50, -50, 0, yaw, pitch, centerX, centerY, scale);
            const r3 = project3D(50, -50, cubeHeight, yaw, pitch, centerX, centerY, scale);
            const r4 = project3D(-50, -50, cubeHeight, yaw, pitch, centerX, centerY, scale);
            return (
              <polygon
                points={`${r1.x},${r1.y} ${r2.x},${r2.y} ${r3.x},${r3.y} ${r4.x},${r4.y}`}
                fill="rgba(214, 211, 209, 0.05)"
                stroke="#b8a99a"
                strokeWidth="0.8"
                strokeDasharray="4 4"
              />
            );
          })()}

          {/* Horizontal Slice Boundary Reference Lines on Rear Wall */}
          {dayLayout.map((day, dayIdx) => {
            const timeVal = day.center * cubeHeight;
            const b1 = project3D(-50, -50, timeVal, yaw, pitch, centerX, centerY, scale);
            const b2 = project3D(50, -50, timeVal, yaw, pitch, centerX, centerY, scale);
            return (
              <line
                key={`backdrop-line-${dayIdx}`}
                x1={b1.x}
                y1={b1.y}
                x2={b2.x}
                y2={b2.y}
                stroke="#78716c"
                strokeWidth="0.75"
                opacity="0.35"
              />
            );
          })}
        </g>

        {/* ============================================================ */}
        {/* 4. ADAPTIVE WARP AXIS COLUMN (Instanced Bins along Z = -50)  */}
        {/* ============================================================ */}
        <g opacity={1 - topDownProgress}>
          {/* Main Axis Spine Line */}
          {(() => {
            const origin = project3D(-54, -50, 0, yaw, pitch, centerX, centerY, scale);
            const peak = project3D(-54, -50, cubeHeight, yaw, pitch, centerX, centerY, scale);
            return (
              <g>
                <line x1={origin.x} y1={origin.y} x2={peak.x} y2={peak.y} stroke="#2563eb" strokeWidth="2.5" />
                <circle cx={peak.x} cy={peak.y} r="4" fill="#2563eb" />
                <text
                  x={peak.x - 36}
                  y={peak.y - 12}
                  fill="#0f172a"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily={MONO_FONT}
                >
                  TIME (Z)
                </text>
              </g>
            );
          })()}

          {/* Instanced Vertical Day/Hour Bins on Axis */}
          {dayLayout.map((day, dayIdx) => {
            const timeA = day.start * cubeHeight;
            const timeB = day.end * cubeHeight;
            const isSelected = dayIdx === selectedDay;

            const p1 = project3D(-54, -50, timeA, yaw, pitch, centerX, centerY, scale);
            const p2 = project3D(-51, -50, timeA, yaw, pitch, centerX, centerY, scale);
            const p3 = project3D(-51, -50, timeB, yaw, pitch, centerX, centerY, scale);
            const p4 = project3D(-54, -50, timeB, yaw, pitch, centerX, centerY, scale);

            const binColor =
              warpProgress > 0.1
                ? isSelected
                  ? '#dc2626'
                  : '#2563eb'
                : isSelected
                ? '#2563eb'
                : '#7c6858';

            return (
              <polygon
                key={`warp-axis-day-${dayIdx}`}
                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                fill={binColor}
                opacity={isSelected ? 0.9 : 0.4}
                stroke={binColor}
                strokeWidth="0.5"
              />
            );
          })}

          {/* Floating Label Tick Chips (7 Days Mon-Sun consistently positioned) */}
          {DAY_NAMES.map((dayName, index) => {
            const timeVal = dayLayout[index].center * cubeHeight;
            const pt = project3D(-54, -50, timeVal, yaw, pitch, centerX, centerY, scale);
            const isSel = index === selectedDay;

            return (
              <g key={`axis-day-label-${dayName}`}>
                <line x1={pt.x - 8} y1={pt.y} x2={pt.x} y2={pt.y} stroke={isSel ? '#2563eb' : '#94a3b8'} strokeWidth="1.5" />
                <g transform={`translate(${pt.x - 12}, ${pt.y})`}>
                  <rect
                    x={-48}
                    y={-9}
                    width={46}
                    height={18}
                    rx={4}
                    fill="rgba(255, 255, 255, 0.95)"
                    stroke={isSel ? '#2563eb' : '#e2e8f0'}
                    strokeWidth="1"
                  />
                  <text
                    x={-25}
                    y={3.5}
                    textAnchor="middle"
                    fill={isSel ? '#2563eb' : '#475569'}
                    fontSize="9"
                    fontWeight={isSel ? 900 : 700}
                    fontFamily={MONO_FONT}
                  >
                    {dayName}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* ============================================================ */}
        {/* 5. GLASS BOUNDING PILLARS & CORNER POSTS                     */}
        {/* ============================================================ */}
        <g opacity={1 - topDownProgress * 0.85}>
          {base.map((point, index) => (
            <line
              key={`pillar-${index}`}
              x1={point.x}
              y1={point.y}
              x2={top[index].x}
              y2={top[index].y}
              stroke="#94a3b8"
              strokeWidth="1.2"
              opacity="0.45"
            />
          ))}
          <polygon points={polygon(top)} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
        </g>

        {/* ============================================================ */}
        {/* 6. CONSISTENT 7 DAILY STKDE DENSITY SLICES (Mon 28 – Sun 03) */}
        {/* ============================================================ */}
        {Array.from({ length: 7 }, (_, day) => {
          if (day >= visibleLayersCount) return null;
          const layerRise = interpolate(visibleLayersCount, [day, day + 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const dayInfo = dayLayout[day];
          const sliceTime = dayInfo.center * cubeHeight * layerRise;
          const points = cornersAt(sliceTime, yaw, pitch, 50, centerX, centerY, scale);
          const isSelected = day === selectedDay && !isScanning;
          const isCurrentScan = isScanning && day === currentScanDay;

          // Slices remain consistent and fully visible throughout the video
          const sliceOpacity = isScanning
            ? isCurrentScan
              ? 1.0
              : 0.15
            : isSelected
            ? 0.98
            : 0.72;

          return (
            <g key={`slice-day-${day}`} opacity={sliceOpacity * layerRise}>
              {/* Slice Plane Surface Mesh (Matching PlaneGeometry in Three.js) */}
              <polygon
                points={polygon(points)}
                fill={
                  isCurrentScan || isSelected
                    ? 'rgba(37, 99, 235, 0.08)'
                    : 'rgba(255, 255, 255, 0.75)'
                }
                stroke={isCurrentScan || isSelected ? '#2563eb' : '#b8a99a'}
                strokeWidth={isCurrentScan || isSelected ? 1.8 : 0.8}
              />

              {/* Internal Coordinate Grid Helper (Matching gridHelper in Three.js) */}
              {[-30, -10, 10, 30].map((gridLine) => {
                const g1 = project3D(-50, gridLine, sliceTime, yaw, pitch, centerX, centerY, scale);
                const g2 = project3D(50, gridLine, sliceTime, yaw, pitch, centerX, centerY, scale);
                const g3 = project3D(gridLine, -50, sliceTime, yaw, pitch, centerX, centerY, scale);
                const g4 = project3D(gridLine, 50, sliceTime, yaw, pitch, centerX, centerY, scale);
                return (
                  <g key={`slice-grid-${day}-${gridLine}`} opacity="0.18">
                    <line x1={g1.x} y1={g1.y} x2={g2.x} y2={g2.y} stroke="#b8a99a" strokeWidth="0.5" />
                    <line x1={g3.x} y1={g3.y} x2={g4.x} y2={g4.y} stroke="#b8a99a" strokeWidth="0.5" />
                  </g>
                );
              })}

              {/* Continuous STKDE Heatmap Texture Kernels (Smooth Blended Gaussian Plumes) */}
              {dayCells[day].map((cell, index) => {
                const pt = project3D(cell.x, cell.z, sliceTime, yaw, pitch, centerX, centerY, scale);
                const intensity = Math.min(1, cell.count / 7);
                const gradient =
                  intensity > 0.66
                    ? 'url(#stkde-gaussian-high)'
                    : intensity > 0.32
                    ? 'url(#stkde-gaussian-mid)'
                    : 'url(#stkde-gaussian-low)';
                const radius = (12 + Math.sqrt(cell.count) * 6.5) * (isCurrentScan ? 1.35 : 1);

                return (
                  <circle
                    key={`stkde-gaussian-${day}-${index}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={radius}
                    fill={gradient}
                    opacity={isCurrentScan ? 0.95 : 0.85}
                  />
                );
              })}
            </g>
          );
        })}

        {/* ============================================================ */}
        {/* 7. ACTIVE THURSDAY DURATION SLAB VOLUME & SPATIOTEMPORAL STALKS */}
        {/* ============================================================ */}
        {!isScanning && visibleLayersCount >= 4 ? (
          <g>
            {/* Glass Duration Volume Enclosure (Y_start to Y_end for Thursday) */}
            {(() => {
              const thuStart = dayLayout[selectedDay].start * cubeHeight;
              const thuEnd = dayLayout[selectedDay].end * cubeHeight;

              const botCorners = cornersAt(thuStart, yaw, pitch, 50, centerX, centerY, scale);
              const topCorners = cornersAt(thuEnd, yaw, pitch, 50, centerX, centerY, scale);

              return (
                <g opacity={0.85}>
                  <polygon
                    points={polygon(botCorners)}
                    fill="rgba(37, 99, 235, 0.04)"
                    stroke="#2563eb"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <polygon
                    points={polygon(topCorners)}
                    fill="rgba(37, 99, 235, 0.04)"
                    stroke="#2563eb"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  {botCorners.map((p, idx) => (
                    <line
                      key={`thu-post-${idx}`}
                      x1={p.x}
                      y1={p.y}
                      x2={topCorners[idx].x}
                      y2={topCorners[idx].y}
                      stroke="#2563eb"
                      strokeWidth="1.4"
                      opacity="0.75"
                    />
                  ))}

                  {/* Inset Resize Handle Spheres (Matching StkdeSliceStack.tsx) */}
                  {(() => {
                    const topH = project3D(50, 0, thuEnd, yaw, pitch, centerX, centerY, scale);
                    const botH = project3D(50, 0, thuStart, yaw, pitch, centerX, centerY, scale);
                    return (
                      <g>
                        <circle cx={topH.x} cy={topH.y} r="4" fill="#b45309" stroke="#ffffff" strokeWidth="1.2" />
                        <circle cx={botH.x} cy={botH.y} r="4" fill="#b45309" stroke="#ffffff" strokeWidth="1.2" />
                      </g>
                    );
                  })()}
                </g>
              );
            })()}

            {/* 3D Spatiotemporal Incident Stalks Rising from Map Plane into Thursday */}
            {selectionProgress > 0.2
              ? dayCells[selectedDay]
                  .filter((c) => c.count >= 3)
                  .map((cell, index) => {
                    const thuSliceTime = dayLayout[selectedDay].center * cubeHeight;
                    const pt = project3D(cell.x, cell.z, thuSliceTime, yaw, pitch, centerX, centerY, scale);
                    const groundPt = project3D(cell.x, cell.z, 0, yaw, pitch, centerX, centerY, scale);

                    return (
                      <g key={`stalk-${cell.x}-${cell.z}-${index}`} opacity={interpolate(selectionProgress, [0.2, 0.6], [0, 0.9])}>
                        <line
                          x1={pt.x}
                          y1={groundPt.y}
                          x2={pt.x}
                          y2={pt.y}
                          stroke={colorForType(cell.dominantType)}
                          strokeWidth="2.0"
                          strokeDasharray="3 2"
                          opacity="0.65"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="3.8"
                          fill={colorForType(cell.dominantType)}
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}
                        />
                      </g>
                    );
                  })
              : null}
          </g>
        ) : null}

        {/* ============================================================ */}
        {/* 8. TOP-DOWN DAY NAVIGATION PILL (Active in Act 3 Scan)       */}
        {/* ============================================================ */}
        {isScanning ? (
          <g transform="translate(800, 640)">
            <rect
              x={-180}
              y={-18}
              width={360}
              height={36}
              rx={8}
              fill="rgba(255, 255, 255, 0.95)"
              stroke="#e2e8f0"
              strokeWidth="1"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}
            />
            {DAY_NAMES.map((name, idx) => {
              const isCurrent = idx === currentScanDay;
              const xPos = -150 + idx * 50;
              return (
                <g key={`scan-pill-${name}`}>
                  {isCurrent ? (
                    <rect
                      x={xPos - 20}
                      y={-12}
                      width={40}
                      height={24}
                      rx={5}
                      fill="#2563eb"
                    />
                  ) : null}
                  <text
                    x={xPos}
                    y={4}
                    textAnchor="middle"
                    fill={isCurrent ? '#ffffff' : '#64748b'}
                    fontSize="9"
                    fontWeight={isCurrent ? 900 : 600}
                    fontFamily={MONO_FONT}
                  >
                    {name}
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>

      {/* ============================================================ */}
      {/* 9. FLOATING STKDE INTENSITY LEGEND PILL                      */}
      {/* ============================================================ */}
      <aside
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          zIndex: 30,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '10px 14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(12px)',
          minWidth: 200,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, fontWeight: 850, letterSpacing: 1.5, color: '#0f172a', fontFamily: MONO_FONT }}>
            STKDE INTENSITY
          </span>
          <ChevronUp style={{ width: 13, height: 13, color: '#64748b' }} />
        </div>

        {/* Continuous Gradient Bar */}
        <div
          style={{
            height: 8,
            borderRadius: 99,
            marginTop: 6,
            background: STKDE_GRADIENT_CSS,
            border: '1px solid rgba(0, 0, 0, 0.1)',
          }}
        />

        {/* Min / Max Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8.5, color: '#64748b', fontFamily: MONO_FONT }}>
          <span>0.00 Low</span>
          <span>1.00 High</span>
        </div>
      </aside>
    </div>
  );
}
