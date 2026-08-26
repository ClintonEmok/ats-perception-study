import React from 'react';
import { interpolate, Img, staticFile } from 'remotion';
import { getStkdeIntensityColor, getStkdePaletteGradient } from '../../src/app/stkde-3d/lib/palette';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  colorForCrime,
  INSPECTION_INCIDENTS,
  STC_TEMPORAL_SLICES,
  STKDE_CELL_SIZE,
  STKDE_FIELD_CELLS,
  THEME,
} from './data';
import { buildAdaptiveDayLayout, CUBE_CELLS, WEEK_START } from '../real/data';

export interface ScreenPoint2D {
  x: number;
  y: number;
}

interface SpaceTimeCubeCanvasProps {
  mapRevealProgress: number; // 0 -> 1: flat map fades/slides in
  clusterHaloProgress: number; // 0 -> 1: spatial clusters highlighted
  collapseRevealProgress: number; // 0 -> 1: collapsed temporal cues shown
  tiltProgress: number; // 0 (flat 2D MapLibre) -> 1 (2.5D oblique STC perspective)
  unfoldProgress: number; // 0 (flat on base) -> 1 (vertical DBTA separation)
}

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
  [[-5, -48], [-5, 48]], // Halsted St
  [[6, -45], [6, 45]], // State St / Michigan Ave
  // East-West Arterials (North Ave, Chicago Ave, Madison, Roosevelt, 31st, 55th, 79th)
  [[-48, -25], [16, -25]], // North Ave
  [[-48, -12], [20, -12]], // Chicago Ave
  [[-48, 0], [22, 0]], // Madison St (Zero Baseline)
  [[-48, 12], [24, 12]], // Roosevelt Rd
  [[-48, 24], [26, 24]], // 31st / Pershing
  [[-48, 36], [30, 36]], // 55th / Garfield
];

export const SpaceTimeCubeCanvas: React.FC<SpaceTimeCubeCanvasProps> = ({
  mapRevealProgress,
  clusterHaloProgress,
  collapseRevealProgress,
  tiltProgress,
  unfoldProgress,
}) => {
  const CUBE_HEIGHT = 100;
  const CUBE_RADIUS = 50;

  // Camera parameters matching real dashboard 3D STKDE Cube
  // In 2D: top-down overhead perspective (pitch = 85.5°, yaw = 0°)
  // In 3D: authentic oblique perspective (pitch = 26°, yaw = -26°)
  const yaw = interpolate(tiltProgress, [0, 1], [0, -26]);
  const pitch = interpolate(tiltProgress, [0, 1], [85.5, 26]);
  const centerX = interpolate(tiltProgress, [0, 1], [960, 880]);
  const centerY = interpolate(tiltProgress, [0, 1], [390, 410]);
  const scale = interpolate(tiltProgress, [0, 1], [4.6, 3.9]);
  const cameraDist = 580;

  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;

  const project3D = (x: number, z: number, timeY = 0): ScreenPoint2D => {
    const cX = x;
    const cY = z;
    const cZ = (timeY * unfoldProgress) - 50;

    const x1 = cX * Math.cos(yawRad) - cY * Math.sin(yawRad);
    const y1 = cX * Math.sin(yawRad) + cY * Math.cos(yawRad);
    const z1 = cZ;

    const x2 = x1;
    const y2 = y1 * Math.cos(pitchRad) - z1 * Math.sin(pitchRad);
    const z2 = y1 * Math.sin(pitchRad) + z1 * Math.cos(pitchRad);

    const factor = cameraDist / (cameraDist + y2);
    const screenX = centerX + x2 * scale * factor;
    const screenY = centerY - z2 * scale * factor;

    return { x: screenX, y: screenY };
  };

  const polygonPointsStr = (points: ScreenPoint2D[]) =>
    points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const cornersAt = (timeY: number, size = CUBE_RADIUS): ScreenPoint2D[] => [
    project3D(-size, -size, timeY),
    project3D(size, -size, timeY),
    project3D(size, size, timeY),
    project3D(-size, size, timeY),
  ];

  const baseCorners = cornersAt(0);
  const topCorners = cornersAt(CUBE_HEIGHT);

  const dayLayout = buildAdaptiveDayLayout(unfoldProgress, 1.0);
  const selectedDay = 3; // Thursday July 31 focus

  const mapUiOpacity = interpolate(tiltProgress, [0, 0.35], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        opacity: mapRevealProgress,
        transform: `scale(${0.96 + 0.04 * mapRevealProgress})`,
        transformOrigin: '50% 50%',
      }}
    >
      {/* ==================================================== */}
      {/* 1. 2D MAPLIBRE UI CONTROLS OVERLAY (Fades on tilt)   */}
      {/* ==================================================== */}
      {mapUiOpacity > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: 450,
            top: 140,
            width: 1020,
            height: 480,
            pointerEvents: 'none',
            zIndex: 30,
            opacity: mapUiOpacity,
          }}
        >
          {/* MapLibre Engine Badge */}
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              borderRadius: 6,
              padding: '3px 8px',
              fontFamily: MONO_FONT,
              fontSize: 9,
              fontWeight: 800,
              color: THEME.navy,
              letterSpacing: 0.8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                backgroundColor: '#2563eb',
              }}
            />
            MAPLIBRE GL · 2D GEOGRAPHIC MAP
          </div>

          {/* MapLibre Zoom Controls */}
          <div
            style={{
              position: 'absolute',
              right: 14,
              top: 14,
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#475569',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              +
            </div>
            <div
              style={{
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#475569',
              }}
            >
              −
            </div>
          </div>

          {/* Scale Bar */}
          <div
            style={{
              position: 'absolute',
              left: 16,
              bottom: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div
              style={{
                width: 70,
                height: 3,
                borderLeft: '1.5px solid #0f172a',
                borderRight: '1.5px solid #0f172a',
                borderBottom: '1.5px solid #0f172a',
              }}
            />
            <span
              style={{
                fontFamily: MONO_FONT,
                fontSize: 8,
                fontWeight: 750,
                color: '#475569',
              }}
            >
              5 km
            </span>
          </div>

          {/* Category Legend */}
          <div
            style={{
              position: 'absolute',
              right: 14,
              bottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              borderRadius: 6,
              padding: '4px 10px',
            }}
          >
            {[
              ['THEFT', colorForCrime('THEFT')],
              ['BATTERY', colorForCrime('BATTERY')],
              ['ASSAULT', colorForCrime('ASSAULT')],
              ['DAMAGE', colorForCrime('CRIMINAL DAMAGE')],
              ['BURGLARY', colorForCrime('BURGLARY')],
            ].map(([label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: color }} />
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 750,
                    fontFamily: MONO_FONT,
                    color: '#334155',
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. REAL DASHBOARD 3D STKDE CUBE SVG ENGINE           */}
      {/* ==================================================== */}
      <svg
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
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
        {/* A. BEVELED BASE PEDESTAL BLOCK (MAP_PLANE_Y = -38 in 3D)     */}
        {/* ============================================================ */}
        {tiltProgress > 0.1 && (
          <g opacity={interpolate(tiltProgress, [0.1, 0.6], [0, 0.9])}>
            {/* Front Bevel Edge */}
            {(() => {
              const p1 = project3D(-50, 50, -3);
              const p2 = project3D(50, 50, -3);
              const p3 = project3D(50, 50, 0);
              const p4 = project3D(-50, 50, 0);
              return (
                <polygon
                  points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                  fill="url(#pedestal-side-front)"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
              );
            })()}

            {/* Left Bevel Edge */}
            {(() => {
              const p1 = project3D(-50, -50, -3);
              const p2 = project3D(-50, 50, -3);
              const p3 = project3D(-50, 50, 0);
              const p4 = project3D(-50, -50, 0);
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
        )}

        {/* ============================================================ */}
        {/* B. GROUND MAPLIBRE BASEMAP PLANE (Y = 0)                     */}
        {/* ============================================================ */}
        <polygon
          points={polygonPointsStr(baseCorners)}
          fill="#f8f7f4"
          stroke="#b8a99a"
          strokeWidth={1.5}
        />

        {/* Lake Michigan Water Body on East Edge */}
        {(() => {
          const w1 = project3D(18, -50, 0);
          const w2 = project3D(50, -50, 0);
          const w3 = project3D(50, 50, 0);
          const w4 = project3D(34, 50, 0);
          const w5 = project3D(28, 25, 0);
          const w6 = project3D(22, 5, 0);
          const w7 = project3D(16, -30, 0);
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
            const pts = street.map(([sx, sz]) => project3D(sx, sz, 0));
            const pathStr = pts
              .map((p, pIdx) => `${pIdx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(' ');
            return (
              <path
                key={`street-${sIdx}`}
                d={pathStr}
                strokeDasharray={sIdx === 0 ? undefined : '3 2'}
              />
            );
          })}
        </g>

        {/* Ground 10x10 Coordinate Grid Lines */}
        {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((coord) => {
          const a = project3D(-50, coord, 0);
          const b = project3D(50, coord, 0);
          const c = project3D(coord, -50, 0);
          const d = project3D(coord, 50, 0);
          return (
            <g key={`ground-grid-${coord}`} opacity="0.35">
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#b8a99a"
                strokeWidth="0.6"
                strokeDasharray="2 2"
              />
              <line
                x1={c.x}
                y1={c.y}
                x2={d.x}
                y2={d.y}
                stroke="#b8a99a"
                strokeWidth="0.6"
                strokeDasharray="2 2"
              />
            </g>
          );
        })}

        {/* ============================================================ */}
        {/* C. SPATIAL CLUSTERS & COLLAPSE CUES (In 2D mode)             */}
        {/* ============================================================ */}
        {clusterHaloProgress > 0 && tiltProgress < 0.6 && (
          <g opacity={clusterHaloProgress * (1 - tiltProgress * 1.5)}>
            {/* The Loop / Downtown Cluster Halo */}
            {(() => {
              const center = project3D(15, 8, 0);
              return (
                <g>
                  <ellipse
                    cx={center.x}
                    cy={center.y}
                    rx={38}
                    ry={22}
                    fill="rgba(200, 16, 46, 0.12)"
                    stroke={THEME.tueRed}
                    strokeWidth={1.4}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={center.x + 44}
                    y={center.y - 8}
                    fill={THEME.tueRed}
                    fontSize={9}
                    fontWeight={850}
                    fontFamily={MONO_FONT}
                    letterSpacing={0.6}
                  >
                    DOWNTOWN HOTSPOT
                  </text>
                </g>
              );
            })()}

            {/* West Side (Austin) Cluster Halo */}
            {(() => {
              const center = project3D(-18, 10, 0);
              return (
                <g>
                  <ellipse
                    cx={center.x}
                    cy={center.y}
                    rx={30}
                    ry={18}
                    fill="rgba(37, 99, 235, 0.1)"
                    stroke={THEME.blue}
                    strokeWidth={1.4}
                    strokeDasharray="4 3"
                  />
                </g>
              );
            })()}
          </g>
        )}

        {collapseRevealProgress > 0 && tiltProgress < 0.5 && (
          <g opacity={collapseRevealProgress * (1 - tiltProgress * 2.0)}>
            {/* Collapse Limitation Banner */}
            {(() => {
              const loopPt = project3D(15, 8, 0);
              return (
                <g transform={`translate(${loopPt.x + 60}, ${loopPt.y + 5})`}>
                  <rect
                    x={0}
                    y={0}
                    width={225}
                    height={38}
                    rx={6}
                    fill="#ffffff"
                    stroke="#cbd5e1"
                    strokeWidth={1.2}
                    filter="drop-shadow(0 4px 12px rgba(0,0,0,0.08))"
                  />
                  <text
                    x={12}
                    y={15}
                    fill={THEME.tueRed}
                    fontSize={9}
                    fontWeight={850}
                    fontFamily={MONO_FONT}
                    letterSpacing={0.6}
                  >
                    TEMPORAL STRUCTURE COLLAPSED
                  </text>
                  <text
                    x={12}
                    y={28}
                    fill={THEME.textSecondary}
                    fontSize={8}
                    fontWeight={600}
                  >
                    Shows where, but order & bursts are obscured
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* ============================================================ */}
        {/* D. REAR WALL BACKDROP & SLICE BOUNDARIES (Z = -50)           */}
        {/* ============================================================ */}
        {tiltProgress > 0.15 && (
          <g opacity={interpolate(tiltProgress, [0.15, 0.7], [0, 0.85])}>
            {/* Rear Wall Plane Quad */}
            {(() => {
              const r1 = project3D(-50, -50, 0);
              const r2 = project3D(50, -50, 0);
              const r3 = project3D(50, -50, CUBE_HEIGHT);
              const r4 = project3D(-50, -50, CUBE_HEIGHT);
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

            {/* Horizontal Slice Reference Lines on Rear Wall */}
            {dayLayout.map((day, dayIdx) => {
              const timeVal = day.center * CUBE_HEIGHT;
              const b1 = project3D(-50, -50, timeVal);
              const b2 = project3D(50, -50, timeVal);
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
        )}

        {/* ============================================================ */}
        {/* E. ADAPTIVE WARP AXIS COLUMN (Z = -50, X = -54)              */}
        {/* ============================================================ */}
        {tiltProgress > 0.2 && (
          <g opacity={interpolate(tiltProgress, [0.2, 0.7], [0, 1])}>
            {/* Main Axis Spine Line */}
            {(() => {
              const origin = project3D(-54, -50, 0);
              const peak = project3D(-54, -50, CUBE_HEIGHT);
              return (
                <g>
                  <line
                    x1={origin.x}
                    y1={origin.y}
                    x2={peak.x}
                    y2={peak.y}
                    stroke="#2563eb"
                    strokeWidth="2.5"
                  />
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

            {/* Instanced Vertical Day Bins on Axis */}
            {dayLayout.map((day, dayIdx) => {
              const timeA = day.start * CUBE_HEIGHT;
              const timeB = day.end * CUBE_HEIGHT;
              const isSelected = dayIdx === selectedDay;

              const p1 = project3D(-54, -50, timeA);
              const p2 = project3D(-51, -50, timeA);
              const p3 = project3D(-51, -50, timeB);
              const p4 = project3D(-54, -50, timeB);

              const binColor =
                unfoldProgress > 0.1
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

            {/* Floating Day Labels on Axis */}
            {['Mon 28', 'Tue 29', 'Wed 30', 'Thu 31', 'Fri 01', 'Sat 02', 'Sun 03'].map(
              (dayName, index) => {
                const timeVal = dayLayout[index].center * CUBE_HEIGHT;
                const pt = project3D(-54, -50, timeVal);
                const isSel = index === selectedDay;

                return (
                  <g key={`axis-day-label-${dayName}`}>
                    <line
                      x1={pt.x - 8}
                      y1={pt.y}
                      x2={pt.x}
                      y2={pt.y}
                      stroke={isSel ? '#2563eb' : '#94a3b8'}
                      strokeWidth="1.5"
                    />
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
              }
            )}
          </g>
        )}

        {/* ============================================================ */}
        {/* F. GLASS BOUNDING PILLARS & CORNER POSTS                     */}
        {/* ============================================================ */}
        {tiltProgress > 0.15 && (
          <g opacity={interpolate(tiltProgress, [0.15, 0.8], [0, 0.75])}>
            {baseCorners.map((point, index) => (
              <line
                key={`pillar-${index}`}
                x1={point.x}
                y1={point.y}
                x2={topCorners[index].x}
                y2={topCorners[index].y}
                stroke="#94a3b8"
                strokeWidth="1.2"
                opacity="0.45"
              />
            ))}
            <polygon
              points={polygonPointsStr(topCorners)}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.4"
            />
          </g>
        )}

        {/* ============================================================ */}
        {/* G. STKDE DENSITY SLICES (Continuous Gaussian Heatmaps)       */}
        {/* ============================================================ */}
        {unfoldProgress > 0.05 && (
          <g>
            {Array.from({ length: 7 }, (_, day) => {
              const dayInfo = dayLayout[day];
              const sliceTime = dayInfo.center * CUBE_HEIGHT;
              const points = cornersAt(sliceTime);
              const isSelected = day === selectedDay;

              const sliceOpacity = isSelected ? 0.98 : 0.65;

              return (
                <g
                  key={`slice-day-${day}`}
                  opacity={interpolate(unfoldProgress, [0.05, 0.6], [0, sliceOpacity])}
                >
                  {/* Slice Mesh Plane */}
                  <polygon
                    points={polygonPointsStr(points)}
                    fill={isSelected ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255, 255, 255, 0.75)'}
                    stroke={isSelected ? '#2563eb' : '#b8a99a'}
                    strokeWidth={isSelected ? 1.8 : 0.8}
                  />

                  {/* Slice Grid Lines */}
                  {[-30, -10, 10, 30].map((gridLine) => {
                    const g1 = project3D(-50, gridLine, sliceTime);
                    const g2 = project3D(50, gridLine, sliceTime);
                    const g3 = project3D(gridLine, -50, sliceTime);
                    const g4 = project3D(gridLine, 50, sliceTime);
                    return (
                      <g key={`slice-grid-${day}-${gridLine}`} opacity="0.18">
                        <line
                          x1={g1.x}
                          y1={g1.y}
                          x2={g2.x}
                          y2={g2.y}
                          stroke="#b8a99a"
                          strokeWidth="0.5"
                        />
                        <line
                          x1={g3.x}
                          y1={g3.y}
                          x2={g4.x}
                          y2={g4.y}
                          stroke="#b8a99a"
                          strokeWidth="0.5"
                        />
                      </g>
                    );
                  })}

                  {/* Continuous STKDE Gaussian Plumes */}
                  {CUBE_CELLS.filter(
                    (cell) =>
                      Math.min(6, Math.max(0, Math.floor((cell.time - WEEK_START) / 86400))) === day
                  ).map((cell, index) => {
                    const pt = project3D(cell.x, cell.z, sliceTime);
                    const intensity = Math.min(1, cell.count / 7);
                    const gradient =
                      intensity > 0.66
                        ? 'url(#stkde-gaussian-high)'
                        : intensity > 0.32
                        ? 'url(#stkde-gaussian-mid)'
                        : 'url(#stkde-gaussian-low)';
                    const radius = 12 + Math.sqrt(cell.count) * 6.5;

                    return (
                      <circle
                        key={`stkde-gaussian-${day}-${index}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={radius}
                        fill={gradient}
                        opacity={0.88}
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>
        )}

        {/* ============================================================ */}
        {/* H. ACTIVE THURSDAY DURATION SLAB ENCLOSURE & 3D STALKS       */}
        {/* ============================================================ */}
        {unfoldProgress > 0.15 && (
          <g opacity={interpolate(unfoldProgress, [0.15, 0.7], [0, 0.9])}>
            {/* Duration Slab Volume */}
            {(() => {
              const thuStart = dayLayout[selectedDay].start * CUBE_HEIGHT;
              const thuEnd = dayLayout[selectedDay].end * CUBE_HEIGHT;

              const botCorners = cornersAt(thuStart);
              const topSlabCorners = cornersAt(thuEnd);

              return (
                <g>
                  <polygon
                    points={polygonPointsStr(botCorners)}
                    fill="rgba(37, 99, 235, 0.04)"
                    stroke="#2563eb"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <polygon
                    points={polygonPointsStr(topSlabCorners)}
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
                      x2={topSlabCorners[idx].x}
                      y2={topSlabCorners[idx].y}
                      stroke="#2563eb"
                      strokeWidth="1.4"
                      opacity="0.75"
                    />
                  ))}

                  {/* Slab Resize Handle Spheres */}
                  {(() => {
                    const topH = project3D(50, 0, thuEnd);
                    const botH = project3D(50, 0, thuStart);
                    return (
                      <g>
                        <circle
                          cx={topH.x}
                          cy={topH.y}
                          r="4"
                          fill="#b45309"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                        />
                        <circle
                          cx={botH.x}
                          cy={botH.y}
                          r="4"
                          fill="#b45309"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                        />
                      </g>
                    );
                  })()}
                </g>
              );
            })()}

            {/* 3D Spatiotemporal Incident Stalks Rising from Map Plane */}
            {CUBE_CELLS.filter(
              (cell) =>
                Math.min(6, Math.max(0, Math.floor((cell.time - WEEK_START) / 86400))) ===
                  selectedDay && cell.count >= 3
            ).map((cell, index) => {
              const thuSliceTime = dayLayout[selectedDay].center * CUBE_HEIGHT;
              const pt = project3D(cell.x, cell.z, thuSliceTime);
              const groundPt = project3D(cell.x, cell.z, 0);
              const color = colorForCrime(cell.dominantType);

              return (
                <g key={`stalk-${cell.x}-${cell.z}-${index}`}>
                  <line
                    x1={pt.x}
                    y1={groundPt.y}
                    x2={pt.x}
                    y2={pt.y}
                    stroke={color}
                    strokeWidth="2.0"
                    strokeDasharray="3 2"
                    opacity="0.65"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="3.8"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* ============================================================ */}
      {/* 3. FLOATING STKDE INTENSITY LEGEND PILL                      */}
      {/* ============================================================ */}
      {unfoldProgress > 0.3 && (
        <aside
          style={{
            position: 'absolute',
            right: 48,
            top: 20,
            width: 200,
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            padding: '10px 14px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            opacity: interpolate(unfoldProgress, [0.3, 0.7], [0, 1]),
            fontFamily: MONO_FONT,
            pointerEvents: 'none',
            zIndex: 30,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: THEME.navy,
              fontSize: 9,
              fontWeight: 850,
              letterSpacing: 1.5,
            }}
          >
            <span>STKDE INTENSITY</span>
            <span
              style={{
                fontSize: 7.5,
                color: '#b45309',
                backgroundColor: 'rgba(245, 158, 11, 0.14)',
                padding: '1px 4px',
                borderRadius: 2,
              }}
            >
              HOTSPOT
            </span>
          </div>

          <div
            style={{
              height: 8,
              borderRadius: 99,
              marginTop: 6,
              background: getStkdePaletteGradient('field'),
              border: '1px solid rgba(0, 0, 0, 0.1)',
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 4,
              color: THEME.textMuted,
              fontSize: 8,
            }}
          >
            <span>0.00 Low</span>
            <span>1.00 High</span>
          </div>
        </aside>
      )}
    </div>
  );
};
