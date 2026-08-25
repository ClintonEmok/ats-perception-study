import React from 'react';
import { interpolate } from 'remotion';
import { ChevronUp } from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  buildAdaptiveHourLayout,
  CUBE_CELLS,
  SELECTED_START,
  WEEK_START,
} from '../real/data';

const DAY_NAMES = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 31', 'Fri 01', 'Sat 02', 'Sun 03'];
const SELECTED_DAY_INDEX = 3;

// Color types matching crime classification
const COLOR_BY_TYPE: Record<string, string> = {
  THEFT: '#3b82f6',
  BATTERY: '#ef4444',
  ASSAULT: '#f59e0b',
  'CRIMINAL DAMAGE': '#8b5cf6',
  OTHER: '#64748b',
};

const colorForType = (type?: string) => (type ? COLOR_BY_TYPE[type] || '#64748b' : '#64748b');

// Authentic STKDE color stops copied directly from src/app/stkde-3d/lib/palette.ts
const STKDE_GRADIENT_CSS =
  'linear-gradient(90deg, #faf4d7 0%, #f4d788 25%, #e29147 50%, #be462d 75%, #842b20 90%, #4f1b1b 100%)';

interface ScreenPoint {
  x: number;
  y: number;
  depth: number;
}

// 3D Perspective Projection Function (matches Three.js camera transformation)
const project3D = (
  x: number,
  y: number,
  timeZ: number,
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
  const cY = y;
  const cZ = timeZ - 50;

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
  timeZ: number,
  yaw: number,
  pitch: number,
  size = 55,
  centerX = 800,
  centerY = 355,
  scale = 4.2
): ScreenPoint[] => [
  project3D(-size, -size, timeZ, yaw, pitch, centerX, centerY, scale),
  project3D(size, -size, timeZ, yaw, pitch, centerX, centerY, scale),
  project3D(size, size, timeZ, yaw, pitch, centerX, centerY, scale),
  project3D(-size, size, timeZ, yaw, pitch, centerX, centerY, scale),
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
  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);
  const selectedDay = SELECTED_DAY_INDEX;

  const dayCells = Array.from({ length: 7 }, (_, dayIndex) =>
    CUBE_CELLS.filter(
      (cell) => Math.min(6, Math.max(0, Math.floor((cell.time - WEEK_START) / 86400))) === dayIndex
    )
  );

  const trajectoryPoints = Array.from({ length: 7 }, (_, dayIndex) => {
    const cells = dayCells[dayIndex];
    if (!cells || cells.length === 0) return { x: 0, y: 0 };
    let sumX = 0;
    let sumZ = 0;
    let total = 0;
    for (const c of cells) {
      sumX += c.x * c.count;
      sumZ += c.z * c.count;
      total += c.count;
    }
    return { x: sumX / total, y: sumZ / total };
  });

  const selectedTimeLayers = Array.from(
    new Set(dayCells[selectedDay].map((c) => c.time))
  ).sort((a, b) => a - b);

  // Camera Orbit Angles
  const baseYaw = interpolate(cameraProgress, [0, 0.25, 0.5, 0.75, 1], [-36, -26, -20, -28, -24], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const basePitch = interpolate(cameraProgress, [0, 0.25, 0.5, 0.75, 1], [32, 26, 22, 28, 25], {
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

  const domainProgress = interpolate(selectionProgress, [0.35, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contextOpacity =
    interpolate(selectionProgress, [0.12, 0.8], [0.7, 0.08], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    (1 - domainProgress);

  const selectedOpacity = interpolate(selectionProgress, [0.2, 0.75], [0.55, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cubeHeight = 100;
  const base = cornersAt(0, yaw, pitch, 55, centerX, centerY, scale);
  const top = cornersAt(cubeHeight, yaw, pitch, 55, centerX, centerY, scale);

  const adaptiveHourPosition = (hour: number) => {
    const index = Math.max(0, Math.min(23, Math.floor(hour)));
    return hourLayout[index].start + (hour - index) * hourLayout[index].width;
  };

  const detailDomainTime = (localTime: number) =>
    interpolate(domainProgress, [0, 1], [(selectedDay + localTime) / 7, localTime]) * cubeHeight;

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
        background: '#090d16',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 1600 710" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Authentic STKDE Gradients matching StkdeSliceStack and StkdeIntensityLegend */}
          <radialGradient id="stkde-intensity-low">
            <stop offset="0%" stopColor="#f4d788" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#faf4d7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#faf4d7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="stkde-intensity-mid">
            <stop offset="0%" stopColor="#e29147" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#f4d788" stopOpacity="0.65" />
            <stop offset="85%" stopColor="#faf4d7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#faf4d7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="stkde-intensity-high">
            <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#be462d" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#e29147" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#faf4d7" stopOpacity="0" />
          </radialGradient>

          {/* Carto Positron Ground Plane Grid Gradient */}
          <linearGradient id="ground-basemap-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(15, 23, 42, 0.85)" />
            <stop offset="100%" stopColor="rgba(30, 41, 59, 0.95)" />
          </linearGradient>

          {/* Adaptive Warp Axis Gradient (COLOR_STOPS from AdaptiveWarpAxis.tsx) */}
          <linearGradient id="warp-axis-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5c4635" />
            <stop offset="40%" stopColor="#b78f5b" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#993723" />
          </linearGradient>
        </defs>

        {/* 1. Base Geographic Map Plane (Ground Plane matching MAP_PLANE_Y) */}
        <polygon points={polygon(base)} fill="url(#ground-basemap-fill)" stroke="#334155" strokeWidth="1.6" />

        {/* Base Cartographic Grid Lines */}
        {[-0.6, -0.3, 0, 0.3, 0.6].map((factor) => {
          const a = project3D(-50, factor * 50, 0, yaw, pitch, centerX, centerY, scale);
          const b = project3D(50, factor * 50, 0, yaw, pitch, centerX, centerY, scale);
          const c = project3D(factor * 50, -50, 0, yaw, pitch, centerX, centerY, scale);
          const d = project3D(factor * 50, 50, 0, yaw, pitch, centerX, centerY, scale);
          return (
            <g key={`dark-grid-${factor}`} opacity="0.4">
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#475569" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#475569" strokeWidth="0.8" strokeDasharray="3 3" />
            </g>
          );
        })}

        {/* Lake Michigan Water Body Silhouette on East side */}
        {(() => {
          const w1 = project3D(20, -50, 0, yaw, pitch, centerX, centerY, scale);
          const w2 = project3D(50, -50, 0, yaw, pitch, centerX, centerY, scale);
          const w3 = project3D(50, 50, 0, yaw, pitch, centerX, centerY, scale);
          const w4 = project3D(35, 50, 0, yaw, pitch, centerX, centerY, scale);
          const w5 = project3D(18, 10, 0, yaw, pitch, centerX, centerY, scale);
          return (
            <polygon
              points={`${w1.x},${w1.y} ${w2.x},${w2.y} ${w3.x},${w3.y} ${w4.x},${w4.y} ${w5.x},${w5.y}`}
              fill="rgba(56, 189, 248, 0.08)"
              stroke="rgba(56, 189, 248, 0.25)"
              strokeWidth="1"
            />
          );
        })()}

        {/* 2. Glass Bounding Pillars (Fade out when in Top-Down view) */}
        <g opacity={1 - topDownProgress * 0.85}>
          {base.map((point, index) => (
            <line
              key={`dark-pillar-${index}`}
              x1={point.x}
              y1={point.y}
              x2={top[index].x}
              y2={top[index].y}
              stroke="#334155"
              strokeWidth="1.2"
              opacity="0.6"
            />
          ))}
          <polygon points={polygon(top)} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
        </g>

        {/* 3. Hotspot Trajectory 3D Splines (Matching HotspotTrajectoryOverlay.tsx) */}
        <g opacity={1 - topDownProgress * 0.6}>
          {trajectoryPoints.map((pt, idx) => {
            if (idx === trajectoryPoints.length - 1) return null;
            const nextPt = trajectoryPoints[idx + 1];

            const timeA = ((idx + 0.5) / 7) * cubeHeight;
            const timeB = ((idx + 1.5) / 7) * cubeHeight;

            const screenA = project3D(pt.x, pt.y, timeA, yaw, pitch, centerX, centerY, scale);
            const screenB = project3D(nextPt.x, nextPt.y, timeB, yaw, pitch, centerX, centerY, scale);

            return (
              <g key={`traj-segment-${idx}`}>
                <line
                  x1={screenA.x}
                  y1={screenA.y}
                  x2={screenB.x}
                  y2={screenB.y}
                  stroke="#fbbf24"
                  strokeWidth="2.2"
                  strokeDasharray="4 2"
                  opacity="0.75"
                />
                <circle cx={screenA.x} cy={screenA.y} r="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
              </g>
            );
          })}
        </g>

        {/* 4. Weekly Context STKDE Slices (7 Rising Slices) */}
        {Array.from({ length: 7 }, (_, day) => {
          if (day >= visibleLayersCount) return null;
          const layerRise = interpolate(visibleLayersCount, [day, day + 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const normalizedTime = (((day + 0.5) / 7) * cubeHeight) * layerRise;
          const points = cornersAt(normalizedTime, yaw, pitch, 55, centerX, centerY, scale);
          const selected = day === selectedDay && !isScanning;

          const isCurrentScan = isScanning && day === currentScanDay;
          const layerOpacity = isScanning
            ? isCurrentScan
              ? 1
              : 0.12
            : contextOpacity * layerRise;

          if (selected) return null;

          return (
            <g key={`dark-week-stkde-slice-${day}`} opacity={layerOpacity}>
              <polygon
                points={polygon(points)}
                fill={isCurrentScan ? 'rgba(56, 189, 248, 0.08)' : 'rgba(30, 41, 59, 0.25)'}
                stroke={isCurrentScan ? '#38bdf8' : '#334155'}
                strokeWidth={isCurrentScan ? 2.2 : 0.8}
              />

              {dayCells[day].map((cell, index) => {
                const pt = project3D(cell.x, cell.z, normalizedTime, yaw, pitch, centerX, centerY, scale);
                const intensity = Math.min(1, cell.count / 7);
                const gradient =
                  intensity > 0.66
                    ? 'url(#stkde-intensity-high)'
                    : intensity > 0.32
                    ? 'url(#stkde-intensity-mid)'
                    : 'url(#stkde-intensity-low)';
                const radius = (8 + Math.sqrt(cell.count) * 5.2) * (isCurrentScan ? 1.25 : 1);

                return (
                  <g key={`dark-stkde-cell-${day}-${index}`}>
                    <circle cx={pt.x} cy={pt.y} r={radius} fill={gradient} opacity={isCurrentScan ? 0.95 : 0.75} />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={radius * 0.65}
                      fill="none"
                      stroke={intensity > 0.66 ? '#ef4444' : intensity > 0.32 ? '#f59e0b' : '#38bdf8'}
                      strokeWidth={isCurrentScan ? 1.2 : 0.6}
                      opacity={isCurrentScan ? 0.9 : 0.4}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* 5. Active Selected STKDE Slab (Thursday 31 July) */}
        {!isScanning ? (
          <g opacity={selectedOpacity}>
            {/* Glass Enclosure Slabs */}
            <polygon
              points={polygon(cornersAt(detailDomainTime(0), yaw, pitch, 55, centerX, centerY, scale))}
              fill="rgba(56, 189, 248, 0.06)"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <polygon
              points={polygon(cornersAt(detailDomainTime(1), yaw, pitch, 55, centerX, centerY, scale))}
              fill="rgba(56, 189, 248, 0.06)"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            {cornersAt(detailDomainTime(0), yaw, pitch, 55, centerX, centerY, scale).map((point, index) => {
              const end = cornersAt(detailDomainTime(1), yaw, pitch, 55, centerX, centerY, scale)[index];
              return (
                <line
                  key={`dark-slab-wall-${index}`}
                  x1={point.x}
                  y1={point.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#38bdf8"
                  strokeWidth="1.6"
                  opacity="0.75"
                />
              );
            })}

            {/* Hourly STKDE Density Slices */}
            {selectedTimeLayers.map((time) => {
              const hour = (time - SELECTED_START) / 3600;
              const normalizedTime = detailDomainTime(adaptiveHourPosition(hour));
              const cells = dayCells[selectedDay].filter((c) => c.time === time);
              const sliceCorners = cornersAt(normalizedTime, yaw, pitch, 55, centerX, centerY, scale);

              return (
                <g key={`dark-stkde-layer-${time}`}>
                  <polygon
                    points={polygon(sliceCorners)}
                    fill="rgba(30, 41, 59, 0.35)"
                    stroke="rgba(56, 189, 248, 0.4)"
                    strokeWidth="0.85"
                  />

                  {cells.map((cell, index) => {
                    const pt = project3D(cell.x, cell.z, normalizedTime, yaw, pitch, centerX, centerY, scale);
                    const intensity = Math.min(1, cell.count / 7);
                    const gradient =
                      intensity > 0.66
                        ? 'url(#stkde-intensity-high)'
                        : intensity > 0.32
                        ? 'url(#stkde-intensity-mid)'
                        : 'url(#stkde-intensity-low)';
                    const radius = 9 + Math.sqrt(cell.count) * 5.5;

                    return (
                      <g key={`dark-active-stkde-kernel-${cell.x}-${cell.z}-${index}`}>
                        <circle cx={pt.x} cy={pt.y} r={radius} fill={gradient} opacity="0.9" />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={radius * 0.65}
                          fill="none"
                          stroke={intensity > 0.66 ? '#ef4444' : intensity > 0.32 ? '#f59e0b' : '#38bdf8'}
                          strokeWidth={0.8}
                          opacity="0.8"
                        />
                        <circle cx={pt.x} cy={pt.y} r="2.5" fill="#ffffff" opacity="0.95" />
                      </g>
                    );
                  })}

                  {/* 3D Spatiotemporal Incident Extrusions */}
                  {selectionProgress > 0.45
                    ? cells
                        .filter((c) => c.count >= 3)
                        .map((cell, index) => {
                          const pt = project3D(cell.x, cell.z, normalizedTime, yaw, pitch, centerX, centerY, scale);
                          const colHeight = 10 + cell.count * 2.4;
                          return (
                            <g key={`dark-col-${cell.x}-${cell.z}-${index}`}>
                              <line
                                x1={pt.x}
                                y1={pt.y}
                                x2={pt.x}
                                y2={pt.y - colHeight}
                                stroke={colorForType(cell.dominantType)}
                                strokeWidth="3"
                                strokeLinecap="round"
                                opacity="0.9"
                              />
                              <circle
                                cx={pt.x}
                                cy={pt.y - colHeight}
                                r="4.2"
                                fill={colorForType(cell.dominantType)}
                                stroke="#ffffff"
                                strokeWidth="1.4"
                                style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))' }}
                              />
                            </g>
                          );
                        })
                    : null}
                </g>
              );
            })}
          </g>
        ) : null}

        {/* 6. Left Vertical Adaptive Warp Timeline Axis (Matching AdaptiveWarpAxis.tsx) */}
        <g opacity={1 - topDownProgress}>
          {(() => {
            const axisOrigin = project3D(-65, -55, 0, yaw, pitch, centerX, centerY, scale);
            const axisPeak = project3D(-65, -55, cubeHeight, yaw, pitch, centerX, centerY, scale);
            return (
              <g>
                <line x1={axisOrigin.x} y1={axisOrigin.y} x2={axisPeak.x} y2={axisPeak.y} stroke="#38bdf8" strokeWidth="2.4" />
                <circle cx={axisPeak.x} cy={axisPeak.y} r="3.5" fill="#38bdf8" />
                <text
                  x={axisPeak.x - 38}
                  y={axisPeak.y - 10}
                  fill="#38bdf8"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily={FONT_FAMILY}
                >
                  TIME (Z)
                </text>
              </g>
            );
          })()}

          {/* Dynamic Axis Ticks & Time Labels */}
          <g opacity={1 - domainProgress}>
            {DAY_NAMES.map((day, index) => {
              const timeVal = ((index + 0.5) / 7) * cubeHeight;
              const pt = project3D(-65, -55, timeVal, yaw, pitch, centerX, centerY, scale);
              const isSel = index === selectedDay;
              return (
                <g key={`dark-axis-day-${day}`}>
                  <line x1={pt.x - 6} y1={pt.y} x2={pt.x + 6} y2={pt.y} stroke={isSel ? '#38bdf8' : '#475569'} strokeWidth="1.5" />
                  <text
                    x={pt.x - 12}
                    y={pt.y + 4}
                    textAnchor="end"
                    fill={isSel ? '#38bdf8' : '#94a3b8'}
                    fontSize="9"
                    fontWeight={isSel ? 850 : 600}
                    fontFamily={FONT_FAMILY}
                  >
                    {day}
                  </text>
                </g>
              );
            })}
          </g>

          <g opacity={domainProgress}>
            {[0, 4, 8, 12, 16, 20, 24].map((hour) => {
              const localTime = hour === 24 ? 1 : hourLayout[hour].start;
              const timeVal = detailDomainTime(localTime);
              const pt = project3D(-65, -55, timeVal, yaw, pitch, centerX, centerY, scale);
              return (
                <g key={`dark-axis-hour-${hour}`}>
                  <line x1={pt.x - 6} y1={pt.y} x2={pt.x + 6} y2={pt.y} stroke="#38bdf8" strokeWidth="1.8" />
                  <text
                    x={pt.x - 12}
                    y={pt.y + 4}
                    textAnchor="end"
                    fill="#38bdf8"
                    fontSize="9.5"
                    fontWeight="850"
                    fontFamily={FONT_FAMILY}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </text>
                </g>
              );
            })}
          </g>
        </g>

        {/* 7. Top-Down Day Navigation Pill (Visible during Act 3 Scan) */}
        {isScanning ? (
          <g transform="translate(800, 640)">
            <rect
              x={-180}
              y={-18}
              width={360}
              height={36}
              rx={8}
              fill="rgba(15, 23, 42, 0.9)"
              stroke="#334155"
              strokeWidth="1"
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
                      box-shadow="0 0 10px rgba(37,99,235,0.5)"
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

      {/* 8. Floating STKDE Intensity Legend Pill (Matching StkdeIntensityLegend.tsx) */}
      <aside
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          zIndex: 30,
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: '10px 14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
          minWidth: 200,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, fontWeight: 850, letterSpacing: 1.5, color: '#e2e8f0', fontFamily: MONO_FONT }}>
            STKDE INTENSITY
          </span>
          <ChevronUp style={{ width: 13, height: 13, color: '#94a3b8' }} />
        </div>

        {/* Gradient Bar */}
        <div
          style={{
            height: 8,
            borderRadius: 99,
            marginTop: 6,
            background: STKDE_GRADIENT_CSS,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        />

        {/* Min / Max Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8.5, color: '#94a3b8', fontFamily: MONO_FONT }}>
          <span>0.00 Low</span>
          <span>1.00 High</span>
        </div>
      </aside>
    </div>
  );
}
