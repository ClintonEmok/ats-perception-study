import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  buildAdaptiveHourLayout,
  colorForType,
  CUBE_CELLS,
  SELECTED_START,
  WEEK_START,
} from '../real/data';

type ScreenPoint = { x: number; y: number; depth: number };

const project3D = (
  x: number,
  y: number,
  timeZ: number,
  yawDeg: number,
  pitchDeg: number,
  centerX = 500,
  centerY = 315,
  scale = 3.6,
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
  centerX = 500,
  centerY = 315,
  scale = 3.6
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

export function ShowcaseCube({
  selectionProgress,
  warpProgress,
  multiplier,
  cameraProgress = 0,
  buildProgress = 1,
}: {
  selectionProgress: number;
  warpProgress: number;
  multiplier: number;
  cameraProgress?: number;
  buildProgress?: number;
}) {
  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);

  // Dynamic Camera Movement (Apple orbital rotation & elevation sweep)
  const yaw = interpolate(cameraProgress, [0, 0.25, 0.5, 0.75, 1], [-38, -28, -20, -28, -24], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pitch = interpolate(cameraProgress, [0, 0.25, 0.5, 0.75, 1], [34, 28, 22, 28, 25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const domainProgress = interpolate(selectionProgress, [0.35, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contextOpacity =
    interpolate(selectionProgress, [0.12, 0.8], [0.68, 0.08], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    (1 - domainProgress);

  const selectedOpacity = interpolate(selectionProgress, [0.2, 0.75], [0.55, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cubeHeight = 100;
  const base = cornersAt(0, yaw, pitch);
  const top = cornersAt(cubeHeight, yaw, pitch);

  const adaptiveHourPosition = (hour: number) => {
    const index = Math.max(0, Math.min(23, Math.floor(hour)));
    return hourLayout[index].start + (hour - index) * hourLayout[index].width;
  };

  const detailDomainTime = (localTime: number) =>
    interpolate(domainProgress, [0, 1], [(selectedDay + localTime) / 7, localTime]) * cubeHeight;

  // Progressive build-up of temporal layers (0 to 7)
  const visibleLayersCount = interpolate(buildProgress, [0.15, 0.85], [1, 7], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#ffffff',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 1000 610" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="kde-low-showcase">
            <stop offset="0" stopColor="#38bdf8" stopOpacity="0.75" />
            <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="kde-mid-showcase">
            <stop offset="0" stopColor="#f59e0b" stopOpacity="0.82" />
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="kde-high-showcase">
            <stop offset="0" stopColor="#C8102E" stopOpacity="0.9" />
            <stop offset="1" stopColor="#C8102E" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="map-plane-showcase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="1" stopColor="#f1f5f9" stopOpacity="0.98" />
          </linearGradient>
        </defs>

        {/* 1. Base Geographic Map Plane */}
        <polygon points={polygon(base)} fill="url(#map-plane-showcase)" stroke="#94a3b8" strokeWidth="1.6" />

        {/* Lake Michigan Shoreline on Base Plane */}
        {[0, 1, 2, 3].map((idx) => {
          const p1 = project3D(42, -48 + idx * 28, 0, yaw, pitch);
          const p2 = project3D(52, -36 + idx * 28, 0, yaw, pitch);
          return (
            <path
              key={`lake-edge-${idx}`}
              d={`M${p1.x} ${p1.y} Q${p1.x + 25} ${p1.y - 12}, ${p2.x} ${p2.y}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.4"
              opacity="0.5"
            />
          );
        })}

        {/* Coordinate Grid on Base Plane */}
        {[-0.5, 0, 0.5].map((factor) => {
          const a = project3D(-50, factor * 50, 0, yaw, pitch);
          const b = project3D(50, factor * 50, 0, yaw, pitch);
          const c = project3D(factor * 50, -50, 0, yaw, pitch);
          const d = project3D(factor * 50, 50, 0, yaw, pitch);
          return (
            <g key={`grid-${factor}`} opacity="0.45">
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#94a3b8" strokeWidth="0.9" strokeDasharray="3 3" />
              <line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#94a3b8" strokeWidth="0.9" strokeDasharray="3 3" />
            </g>
          );
        })}

        {/* 2. Glass Cube Bounding Pillars */}
        {base.map((point, index) => (
          <line
            key={`pillar-${index}`}
            x1={point.x}
            y1={point.y}
            x2={top[index].x}
            y2={top[index].y}
            stroke="#94a3b8"
            strokeWidth="1.2"
            opacity="0.5"
          />
        ))}

        {/* Top Cube Frame */}
        <polygon points={polygon(top)} fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />

        {/* 3. Weekly Temporal Slices (Rising Up in 3D Space) */}
        {Array.from({ length: 7 }, (_, day) => {
          if (day >= visibleLayersCount) return null;
          const layerRise = interpolate(visibleLayersCount, [day, day + 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const normalizedTime = (((day + 0.5) / 7) * cubeHeight) * layerRise;
          const points = cornersAt(normalizedTime, yaw, pitch);
          const selected = day === selectedDay;
          if (selected) return null;

          return (
            <g key={`week-day-${day}`} opacity={contextOpacity * layerRise}>
              <polygon
                points={polygon(points)}
                fill="rgba(15, 23, 42, 0.02)"
                stroke="#cbd5e1"
                strokeWidth="0.85"
              />
              {dayCells[day].map((cell, index) => {
                const pt = project3D(cell.x, cell.z, normalizedTime, yaw, pitch);
                const intensity = Math.min(1, cell.count / 7);
                const gradient =
                  intensity > 0.66
                    ? 'url(#kde-high-showcase)'
                    : intensity > 0.32
                    ? 'url(#kde-mid-showcase)'
                    : 'url(#kde-low-showcase)';
                const radius = 6.5 + Math.sqrt(cell.count) * 4;
                return (
                  <circle
                    key={`cell-${day}-${index}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={radius}
                    fill={gradient}
                    opacity="0.6"
                  />
                );
              })}
            </g>
          );
        })}

        {/* 4. Active Selected Slab (Thursday 31 July) with 3D Adaptive Z-Axis Stretching */}
        <g opacity={selectedOpacity}>
          {/* Glass Enclosure Slabs */}
          <polygon
            points={polygon(cornersAt(detailDomainTime(0), yaw, pitch))}
            fill="rgba(37, 99, 235, 0.06)"
            stroke="#2563eb"
            strokeWidth="2.2"
          />
          <polygon
            points={polygon(cornersAt(detailDomainTime(1), yaw, pitch))}
            fill="rgba(37, 99, 235, 0.06)"
            stroke="#2563eb"
            strokeWidth="2.2"
          />
          {cornersAt(detailDomainTime(0), yaw, pitch).map((point, index) => {
            const end = cornersAt(detailDomainTime(1), yaw, pitch)[index];
            return (
              <line
                key={`slab-wall-${index}`}
                x1={point.x}
                y1={point.y}
                x2={end.x}
                y2={end.y}
                stroke="#2563eb"
                strokeWidth="1.8"
                opacity="0.8"
              />
            );
          })}

          {/* Temporal Hourly Slices & 3D Incident Point Extrusions */}
          {selectedTimeLayers.map((time, layerIndex) => {
            const hour = (time - SELECTED_START) / 3600;
            const normalizedTime = detailDomainTime(adaptiveHourPosition(hour));
            const cells = dayCells[selectedDay].filter((c) => c.time === time);
            const sliceCorners = cornersAt(normalizedTime, yaw, pitch);

            return (
              <g key={`time-layer-${time}`}>
                {/* Horizontal Slice Plane */}
                <polygon
                  points={polygon(sliceCorners)}
                  fill={layerIndex % 2 === 0 ? 'rgba(37, 99, 235, 0.04)' : 'rgba(200, 16, 46, 0.03)'}
                  stroke="rgba(37, 99, 235, 0.4)"
                  strokeWidth="0.8"
                />

                {/* STKDE Density Heatmap Circles */}
                {cells.map((cell, index) => {
                  const pt = project3D(cell.x, cell.z, normalizedTime, yaw, pitch);
                  const intensity = Math.min(1, cell.count / 7);
                  const gradient =
                    intensity > 0.66
                      ? 'url(#kde-high-showcase)'
                      : intensity > 0.32
                      ? 'url(#kde-mid-showcase)'
                      : 'url(#kde-low-showcase)';
                  const radius = 7 + Math.sqrt(cell.count) * 4.2;
                  return (
                    <circle
                      key={`active-cell-${cell.x}-${cell.z}-${index}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={radius}
                      fill={gradient}
                      opacity="0.85"
                    />
                  );
                })}

                {/* 3D Incident Columns (Extrusions) */}
                {selectionProgress > 0.45
                  ? cells
                      .filter((c) => c.count >= 3)
                      .map((cell, index) => {
                        const pt = project3D(cell.x, cell.z, normalizedTime, yaw, pitch);
                        const colHeight = 10 + cell.count * 2.4;
                        return (
                          <g key={`col-${cell.x}-${cell.z}-${index}`}>
                            <line
                              x1={pt.x}
                              y1={pt.y}
                              x2={pt.x}
                              y2={pt.y - colHeight}
                              stroke={colorForType(cell.dominantType)}
                              strokeWidth="3"
                              strokeLinecap="round"
                              opacity="0.8"
                            />
                            <circle
                              cx={pt.x}
                              cy={pt.y - colHeight}
                              r="4.2"
                              fill={colorForType(cell.dominantType)}
                              stroke="#ffffff"
                              strokeWidth="1.4"
                              style={{
                                filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.25))',
                              }}
                            />
                          </g>
                        );
                      })
                  : null}
              </g>
            );
          })}
        </g>

        {/* 5. Left Vertical Coordinate Time Axis (Z) */}
        {(() => {
          const axisOrigin = project3D(-65, -55, 0, yaw, pitch);
          const axisPeak = project3D(-65, -55, cubeHeight, yaw, pitch);
          return (
            <g>
              <line
                x1={axisOrigin.x}
                y1={axisOrigin.y}
                x2={axisPeak.x}
                y2={axisPeak.y}
                stroke="#2563eb"
                strokeWidth="2.2"
              />
              <circle cx={axisPeak.x} cy={axisPeak.y} r="3.5" fill="#2563eb" />
              <text
                x={axisPeak.x - 38}
                y={axisPeak.y - 10}
                fill="#2563eb"
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
          {['MON 28', 'TUE 29', 'WED 30', 'THU 31', 'FRI 01', 'SAT 02', 'SUN 03'].map((day, index) => {
            const timeVal = ((index + 0.5) / 7) * cubeHeight;
            const pt = project3D(-65, -55, timeVal, yaw, pitch);
            const isSel = index === selectedDay;
            return (
              <g key={`axis-day-${day}`}>
                <line x1={pt.x - 6} y1={pt.y} x2={pt.x + 6} y2={pt.y} stroke={isSel ? '#2563eb' : '#94a3b8'} strokeWidth="1.5" />
                <text
                  x={pt.x - 12}
                  y={pt.y + 4}
                  textAnchor="end"
                  fill={isSel ? '#2563eb' : '#64748b'}
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
            const pt = project3D(-65, -55, timeVal, yaw, pitch);
            return (
              <g key={`axis-hour-${hour}`}>
                <line x1={pt.x - 6} y1={pt.y} x2={pt.x + 6} y2={pt.y} stroke="#2563eb" strokeWidth="1.8" />
                <text
                  x={pt.x - 12}
                  y={pt.y + 4}
                  textAnchor="end"
                  fill="#2563eb"
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
      </svg>

      {/* Top Left Badge */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 18,
          border: '1px solid rgba(15, 23, 42, 0.12)',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ color: '#64748b', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
          3D Perspective Space
        </div>
        <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 800, marginTop: 2 }}>
          Adaptive Space-Time Cube
        </div>
      </div>

      {/* Domain Badge (Top Right) */}
      <div
        style={{
          position: 'absolute',
          right: 18,
          top: 18,
          border: '1px solid rgba(37, 99, 235, 0.25)',
          background: 'rgba(37, 99, 235, 0.06)',
          color: '#2563eb',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 10,
          fontFamily: MONO_FONT,
          fontWeight: 750,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        {domainProgress < 0.5 ? 'Weekly Domain · 28 Jul – 4 Aug' : 'Adaptive Z-Axis · 31 Jul (Expanded 2.5×)'}
      </div>

      {/* Intensity Legend (Bottom Right) */}
      <div
        style={{
          position: 'absolute',
          right: 18,
          bottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          border: '1px solid rgba(15, 23, 42, 0.12)',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '6px 12px',
          fontSize: 9,
          fontFamily: MONO_FONT,
          fontWeight: 700,
          color: '#475569',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        <span>Low</span>
        <i
          style={{
            width: 84,
            height: 7,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #38bdf8, #f59e0b, #C8102E)',
          }}
        />
        <span>High Density</span>
      </div>
    </div>
  );
}
