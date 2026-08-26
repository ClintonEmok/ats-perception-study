import React from 'react';
import { interpolate } from 'remotion';
import { ChevronUp } from 'lucide-react';
import { getStkdeIntensityColor, getStkdePaletteGradient } from '../../src/app/stkde-3d/lib/palette';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { CUBE_CELLS, WEEK_START } from '../real/data';
import { DASHBOARD_COLORS } from './palette';

type ScreenPoint = { x: number; y: number; depth: number };
type FieldCell = { x: number; z: number; intensity: number };

const DAY_NAMES = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 31', 'Fri 01', 'Sat 02', 'Sun 03'];
const SELECTED_DAY = 3;
const FIELD_GRID_SIZE = 18;
const FIELD_CELL_SIZE = 100 / FIELD_GRID_SIZE;
const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const DAY_FIELDS: FieldCell[][] = Array.from({ length: 7 }, (_, day) => {
  const rawCounts = new Map<string, number>();

  CUBE_CELLS.forEach((cell) => {
    const cellDay = Math.min(6, Math.max(0, Math.floor((cell.time - WEEK_START) / 86400)));
    if (cellDay !== day) return;

    const xIndex = Math.min(FIELD_GRID_SIZE - 1, Math.max(0, Math.floor(((cell.x + 50) / 100) * FIELD_GRID_SIZE)));
    const zIndex = Math.min(FIELD_GRID_SIZE - 1, Math.max(0, Math.floor(((cell.z + 50) / 100) * FIELD_GRID_SIZE)));
    const key = `${xIndex}:${zIndex}`;
    rawCounts.set(key, (rawCounts.get(key) ?? 0) + cell.count);
  });

  const smoothed = Array.from({ length: FIELD_GRID_SIZE * FIELD_GRID_SIZE }, (_, index) => {
    const xIndex = index % FIELD_GRID_SIZE;
    const zIndex = Math.floor(index / FIELD_GRID_SIZE);
    let weightedCount = 0;
    let totalWeight = 0;

    for (let neighborX = -1; neighborX <= 1; neighborX += 1) {
      for (let neighborZ = -1; neighborZ <= 1; neighborZ += 1) {
        const sampleX = xIndex + neighborX;
        const sampleZ = zIndex + neighborZ;
        if (sampleX < 0 || sampleX >= FIELD_GRID_SIZE || sampleZ < 0 || sampleZ >= FIELD_GRID_SIZE) continue;
        const distance = Math.abs(neighborX) + Math.abs(neighborZ);
        const weight = distance === 0 ? 1 : distance === 1 ? 0.55 : 0.25;
        weightedCount += (rawCounts.get(`${sampleX}:${sampleZ}`) ?? 0) * weight;
        totalWeight += weight;
      }
    }

    return { xIndex, zIndex, value: totalWeight > 0 ? weightedCount / totalWeight : 0 };
  });

  const maximum = Math.max(...smoothed.map((cell) => cell.value), 1);
  return smoothed
    .filter((cell) => cell.value > maximum * 0.035)
    .map((cell) => ({
      x: (cell.xIndex + 0.5) * FIELD_CELL_SIZE - 50,
      z: (cell.zIndex + 0.5) * FIELD_CELL_SIZE - 50,
      intensity: Math.min(1, cell.value / maximum),
    }));
});

const project3D = (
  x: number,
  z: number,
  time: number,
  yawDegrees: number,
  pitchDegrees: number,
  centerX = 800,
  centerY = 355,
  scale = 4.2,
  cameraDistance = 580,
): ScreenPoint => {
  const yaw = (yawDegrees * Math.PI) / 180;
  const pitch = (pitchDegrees * Math.PI) / 180;
  const centeredTime = time - 50;
  const rotatedX = x * Math.cos(yaw) - z * Math.sin(yaw);
  const rotatedZ = x * Math.sin(yaw) + z * Math.cos(yaw);
  const pitchedDepth = rotatedZ * Math.cos(pitch) - centeredTime * Math.sin(pitch);
  const pitchedTime = rotatedZ * Math.sin(pitch) + centeredTime * Math.cos(pitch);
  const perspective = cameraDistance / (cameraDistance + pitchedDepth);
  return {
    x: centerX + rotatedX * scale * perspective,
    y: centerY - pitchedTime * scale * perspective,
    depth: pitchedDepth,
  };
};

const cornersAt = (
  time: number,
  yaw: number,
  pitch: number,
  centerX: number,
  centerY: number,
  scale: number,
): ScreenPoint[] => [
  project3D(-55, -55, time, yaw, pitch, centerX, centerY, scale),
  project3D(55, -55, time, yaw, pitch, centerX, centerY, scale),
  project3D(55, 55, time, yaw, pitch, centerX, centerY, scale),
  project3D(-55, 55, time, yaw, pitch, centerX, centerY, scale),
];

const polygon = (points: ScreenPoint[]): string => points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

export function DashboardDemoCube({
  selectionProgress,
  warpProgress,
  multiplier,
  cameraProgress,
  buildProgress,
  topDownProgress,
  scanDayProgress,
  sliceEvolutionProgress = -1,
}: {
  selectionProgress: number;
  warpProgress: number;
  multiplier: number;
  cameraProgress: number;
  buildProgress: number;
  topDownProgress: number;
  scanDayProgress: number;
  sliceEvolutionProgress?: number;
}) {
  void warpProgress;
  void multiplier;
  const baseYaw = interpolate(cameraProgress, [0, 0.5, 1], [-36, -20, -26], clamp);
  const basePitch = interpolate(cameraProgress, [0, 0.5, 1], [32, 22, 27], clamp);
  const yaw = interpolate(topDownProgress, [0, 1], [baseYaw, 0], clamp);
  const pitch = interpolate(topDownProgress, [0, 1], [basePitch, 85.5], clamp);
  const centerX = 800;
  const centerY = interpolate(topDownProgress, [0, 1], [355, 338], clamp);
  const scale = interpolate(topDownProgress, [0, 1], [4.2, 5], clamp);
  const base = cornersAt(0, yaw, pitch, centerX, centerY, scale);
  const top = cornersAt(100, yaw, pitch, centerX, centerY, scale);
  const visibleLayers = interpolate(buildProgress, [0.15, 0.85], [1, 7], clamp);
  const isScanning = scanDayProgress >= 0;
  const scanDay = Math.min(6, Math.max(0, Math.floor(scanDayProgress)));
  const isEvolving = sliceEvolutionProgress >= 0 && !isScanning;
  const evolutionPosition = Math.min(6, Math.max(0, sliceEvolutionProgress));
  const evolutionSlice = Math.round(evolutionPosition);
  const evolutionWeight = (day: number): number => Math.max(0, 1 - Math.abs(day - evolutionPosition));
  const contextOpacity = interpolate(selectionProgress, [0.15, 0.8], [0.72, 0.18], clamp);

  const fieldCellPolygon = (cell: FieldCell, time: number): string => polygon([
    project3D(cell.x - FIELD_CELL_SIZE / 2, cell.z - FIELD_CELL_SIZE / 2, time, yaw, pitch, centerX, centerY, scale),
    project3D(cell.x + FIELD_CELL_SIZE / 2, cell.z - FIELD_CELL_SIZE / 2, time, yaw, pitch, centerX, centerY, scale),
    project3D(cell.x + FIELD_CELL_SIZE / 2, cell.z + FIELD_CELL_SIZE / 2, time, yaw, pitch, centerX, centerY, scale),
    project3D(cell.x - FIELD_CELL_SIZE / 2, cell.z + FIELD_CELL_SIZE / 2, time, yaw, pitch, centerX, centerY, scale),
  ]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: DASHBOARD_COLORS.scene, fontFamily: FONT_FAMILY }}>
      <svg width="100%" height="100%" viewBox="0 0 1600 710" preserveAspectRatio="xMidYMid meet">
        <polygon points={polygon(base)} fill={DASHBOARD_COLORS.sceneGrid} stroke={DASHBOARD_COLORS.sceneLine} strokeWidth="1.2" opacity="0.72" />
        {[-0.6, -0.3, 0, 0.3, 0.6].map((factor) => {
          const horizontalStart = project3D(-50, factor * 50, 0, yaw, pitch, centerX, centerY, scale);
          const horizontalEnd = project3D(50, factor * 50, 0, yaw, pitch, centerX, centerY, scale);
          const verticalStart = project3D(factor * 50, -50, 0, yaw, pitch, centerX, centerY, scale);
          const verticalEnd = project3D(factor * 50, 50, 0, yaw, pitch, centerX, centerY, scale);
          return (
            <g key={factor} opacity="0.48">
              <line x1={horizontalStart.x} y1={horizontalStart.y} x2={horizontalEnd.x} y2={horizontalEnd.y} stroke="#b8a99a" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1={verticalStart.x} y1={verticalStart.y} x2={verticalEnd.x} y2={verticalEnd.y} stroke="#b8a99a" strokeWidth="0.8" strokeDasharray="3 3" />
            </g>
          );
        })}
        <g opacity={1 - topDownProgress * 0.82}>
          {base.map((point, index) => <line key={index} x1={point.x} y1={point.y} x2={top[index].x} y2={top[index].y} stroke={DASHBOARD_COLORS.sceneLine} strokeWidth="1.1" opacity="0.58" />)}
          <polygon points={polygon(top)} fill="none" stroke={DASHBOARD_COLORS.sceneLine} strokeWidth="1" strokeDasharray="4 4" opacity="0.58" />
        </g>

        {Array.from({ length: 7 }, (_, day) => {
          if (day >= visibleLayers) return null;
          const layerRise = interpolate(visibleLayers, [day, day + 1], [0, 1], clamp);
          const time = ((day + 0.5) / 7) * 100 * layerRise;
          const corners = cornersAt(time, yaw, pitch, centerX, centerY, scale);
          const activeScan = isScanning && day === scanDay;
          const activeEvolutionWeight = isEvolving ? evolutionWeight(day) : 0;
          const activeEvolution = activeEvolutionWeight > 0.01;
          const isActive = activeScan || activeEvolution;
          const activeWeight = activeScan ? 1 : activeEvolutionWeight;
          const opacity = isScanning
            ? (activeScan ? 1 : 0.12)
            : (isEvolving ? 0.035 + activeEvolutionWeight * 0.965 : contextOpacity) * layerRise;
          return (
            <g key={day} opacity={opacity}>
              <polygon points={polygon(corners)} fill="rgba(244, 241, 235, 0.34)" stroke={isActive ? DASHBOARD_COLORS.sceneActive : '#d6d3d1'} strokeWidth={isActive ? 0.9 + activeWeight * 1.3 : 0.9} />
              {DAY_FIELDS[day]?.map((cell, index) => {
                return (
                  <polygon
                    key={`${day}-${index}`}
                    points={fieldCellPolygon(cell, time)}
                    fill={getStkdeIntensityColor(cell.intensity, 0.14 + cell.intensity * 0.72)}
                  />
                );
              })}
            </g>
          );
        })}

        <g opacity={1 - topDownProgress}>
          {(() => {
            const start = project3D(-65, -55, 0, yaw, pitch, centerX, centerY, scale);
            const end = project3D(-65, -55, 100, yaw, pitch, centerX, centerY, scale);
            return <><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={DASHBOARD_COLORS.sceneLine} strokeWidth="2.2" /><text x={end.x - 34} y={end.y - 10} fill={DASHBOARD_COLORS.sceneLine} fontSize="11" fontWeight="800">TIME</text></>;
          })()}
          {DAY_NAMES.map((label, index) => {
            const point = project3D(-65, -55, ((index + 0.5) / 7) * 100, yaw, pitch, centerX, centerY, scale);
            return <text key={label} x={point.x - 10} y={point.y + 3} textAnchor="end" fill={index === SELECTED_DAY ? DASHBOARD_COLORS.sceneActive : DASHBOARD_COLORS.sceneLine} fontSize="8.5" fontWeight={index === SELECTED_DAY ? 800 : 550}>{label}</text>;
          })}
        </g>
      </svg>

      {isEvolving ? (
        <div style={{ position: 'absolute', left: 520, top: 635, display: 'flex', alignItems: 'center', gap: 20, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 999, background: 'rgba(255, 255, 255, 0.97)', padding: '13px 22px', color: DASHBOARD_COLORS.foreground, boxShadow: '0 10px 24px rgba(0,0,0,0.1)' }}>
          <span style={{ fontFamily: MONO_FONT, fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>EVOLUTION</span>
          <span style={{ width: 1, height: 22, background: DASHBOARD_COLORS.border }} />
          <span style={{ minWidth: 70, fontFamily: MONO_FONT, fontSize: 12, fontWeight: 800, color: DASHBOARD_COLORS.sceneActive }}>{DAY_NAMES[evolutionSlice]}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {DAY_NAMES.map((day, index) => {
              const distance = Math.abs(index - evolutionPosition);
              const markerOpacity = Math.max(0.28, 1 - distance * 0.72);
              return <span key={day} style={{ width: 28, height: 6, borderRadius: 99, background: index === evolutionSlice ? DASHBOARD_COLORS.sceneActive : DASHBOARD_COLORS.border, opacity: markerOpacity }} />;
            })}
          </div>
        </div>
      ) : null}

      <aside style={{ position: 'absolute', right: 20, bottom: 20, minWidth: 200, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 10, background: 'rgba(255, 255, 255, 0.92)', padding: '9px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: DASHBOARD_COLORS.foreground, fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: 750, letterSpacing: 1.4 }}><span>STKDE INTENSITY</span><ChevronUp size={12} /></div>
        <div style={{ height: 8, marginTop: 6, borderRadius: 99, background: getStkdePaletteGradient('field'), border: `1px solid ${DASHBOARD_COLORS.border}` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 8 }}><span>0.00 Low</span><span>1.00 High</span></div>
      </aside>
    </div>
  );
}
