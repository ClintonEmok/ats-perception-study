import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  buildAdaptiveHourLayout,
  colorForType,
  CUBE_CELLS,
  DAILY_COUNTS,
  SELECTED_START,
  WEEK_START,
} from '../real/data';

type ScreenPoint = { x: number; y: number; depth: number };

const DAY_NAMES = ['MON 28', 'TUE 29', 'WED 30', 'THU 31', 'FRI 01', 'SAT 02', 'SUN 03'];

const project3D = (
  x: number,
  y: number,
  timeZ: number,
  yawDeg: number,
  pitchDeg: number,
  centerX = 800,
  centerY = 355,
  scale = 4.2,
  cameraDist = 550
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

const selectedDay = Math.floor((SELECTED_START - WEEK_START) / 86400); // Thursday = 3
const dayCells = Array.from({ length: 7 }, (_, day) =>
  CUBE_CELLS.filter((cell) => Math.floor((cell.time - WEEK_START) / 86400) === day)
);
const selectedTimeLayers = Array.from(new Set(dayCells[selectedDay].map((cell) => cell.time))).sort(
  (a, b) => a - b
);

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

  const baseYaw = interpolate(cameraProgress, [0, 0.25, 0.5, 0.75, 1], [-36, -26, -20, -28, -24], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const basePitch = interpolate(cameraProgress, [0, 0.25, 0.5, 0.75, 1], [32, 26, 22, 28, 25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
          <radialGradient id="dark-stkde-low">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dark-stkde-mid">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dark-stkde-high">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#dc2626" stopOpacity="0.75" />
            <stop offset="85%" stopColor="#f97316" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dark-cube-base" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(30, 41, 59, 0.75)" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.9)" />
          </linearGradient>
        </defs>

        {/* 1. Base Geographic Map Plane */}
        <polygon points={polygon(base)} fill="url(#dark-cube-base)" stroke="#334155" strokeWidth="1.6" />

        {/* Base Grid Lines */}
        {[-0.5, 0, 0.5].map((factor) => {
          const a = project3D(-50, factor * 50, 0, yaw, pitch, centerX, centerY, scale);
          const b = project3D(50, factor * 50, 0, yaw, pitch, centerX, centerY, scale);
          const c = project3D(factor * 50, -50, 0, yaw, pitch, centerX, centerY, scale);
          const d = project3D(factor * 50, 50, 0, yaw, pitch, centerX, centerY, scale);
          return (
            <g key={`dark-grid-${factor}`} opacity="0.35">
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#475569" strokeWidth="0.9" strokeDasharray="3 3" />
              <line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#475569" strokeWidth="0.9" strokeDasharray="3 3" />
            </g>
          );
        })}

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

        {/* 3. Weekly Context STKDE Slices */}
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
                    ? 'url(#dark-stkde-high)'
                    : intensity > 0.32
                    ? 'url(#dark-stkde-mid)'
                    : 'url(#dark-stkde-low)';
                const radius = (8 + Math.sqrt(cell.count) * 5.2) * (isCurrentScan ? 1.25 : 1);

                return (
                  <g key={`dark-stkde-cell-${day}-${index}`}>
                    <circle cx={pt.x} cy={pt.y} r={radius} fill={gradient} opacity={isCurrentScan ? 0.95 : 0.65} />
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

        {/* 4. Active Selected STKDE Slab (Thursday 31 July) */}
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
                        ? 'url(#dark-stkde-high)'
                        : intensity > 0.32
                        ? 'url(#dark-stkde-mid)'
                        : 'url(#dark-stkde-low)';
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
                          strokeWidth="0.8"
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

        {/* 5. Left Vertical Coordinate Time Axis (Z) */}
        <g opacity={1 - topDownProgress}>
          {(() => {
            const axisOrigin = project3D(-65, -55, 0, yaw, pitch, centerX, centerY, scale);
            const axisPeak = project3D(-65, -55, cubeHeight, yaw, pitch, centerX, centerY, scale);
            return (
              <g>
                <line x1={axisOrigin.x} y1={axisOrigin.y} x2={axisPeak.x} y2={axisPeak.y} stroke="#38bdf8" strokeWidth="2.2" />
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
                    fontWeight="800"
                    fontFamily={MONO_FONT}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Top Left Title Tag */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '7px 12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, fontFamily: MONO_FONT }}>
          {isScanning ? 'TOP-DOWN TEMPORAL SCAN' : '3D SPATIOTEMPORAL CUBE'}
        </div>
        <div style={{ color: '#f8fafc', fontSize: 12.5, fontWeight: 800, marginTop: 1 }}>
          {isScanning ? `STKDE Slice: ${DAY_NAMES[currentScanDay]}` : 'Stacked STKDE Density Slices'}
        </div>
      </div>

      {/* Top-Down Scan Tracker Bar (Bottom Center during scanning) */}
      {isScanning ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 16,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 8,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            padding: '6px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {DAY_NAMES.map((name, idx) => {
            const active = idx === currentScanDay;
            return (
              <div
                key={name}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 9.5,
                  fontWeight: 800,
                  fontFamily: MONO_FONT,
                  background: active ? '#2563eb' : 'transparent',
                  color: active ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
              >
                {name}
              </div>
            );
          })}
        </div>
      ) : (
        /* STKDE Density Legend */
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 8,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            padding: '6px 12px',
            fontSize: 9,
            fontFamily: MONO_FONT,
            fontWeight: 700,
            color: '#cbd5e1',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span>Low STKDE</span>
          <i
            style={{
              width: 84,
              height: 7,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #38bdf8, #f59e0b, #ef4444)',
            }}
          />
          <span>High STKDE</span>
        </div>
      )}
    </div>
  );
}
