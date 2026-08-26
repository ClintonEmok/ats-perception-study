import React from 'react';
import { interpolate } from 'remotion';
import { ChevronUp } from 'lucide-react';
import { getStkdeIntensityColor, getStkdePaletteGradient } from '../../src/app/stkde-3d/lib/palette';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { buildAdaptiveHourLayout, CUBE_CELLS, SELECTED_START, WEEK_START } from '../real/data';
import { DASHBOARD_COLORS } from './palette';

type ScreenPoint = { x: number; y: number; depth: number };

const DAY_NAMES = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 31', 'Fri 01', 'Sat 02', 'Sun 03'];
const SELECTED_DAY = 3;
const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

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
  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);
  const dayCells = Array.from({ length: 7 }, (_, day) => CUBE_CELLS.filter((cell) => (
    Math.min(6, Math.max(0, Math.floor((cell.time - WEEK_START) / 86400))) === day
  )));
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
  const evolutionSlice = Math.min(6, Math.max(0, Math.floor(sliceEvolutionProgress)));
  const selectedOpacity = interpolate(selectionProgress, [0.2, 0.75], [0.6, 1], clamp);
  const contextOpacity = interpolate(selectionProgress, [0.15, 0.8], [0.72, 0.18], clamp);

  const adaptiveHourPosition = (hour: number): number => {
    const index = Math.max(0, Math.min(23, Math.floor(hour)));
    return hourLayout[index].start + (hour - index) * hourLayout[index].width;
  };

  const selectedLayers = Array.from(new Set(dayCells[SELECTED_DAY].map((cell) => cell.time))).sort((a, b) => a - b);

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
          if (day >= visibleLayers || (day === SELECTED_DAY && !isScanning)) return null;
          const layerRise = interpolate(visibleLayers, [day, day + 1], [0, 1], clamp);
          const time = ((day + 0.5) / 7) * 100 * layerRise;
          const corners = cornersAt(time, yaw, pitch, centerX, centerY, scale);
          const activeScan = isScanning && day === scanDay;
          const activeEvolution = isEvolving && day === evolutionSlice;
          const isActive = activeScan || activeEvolution;
          const opacity = isScanning ? (activeScan ? 1 : 0.12) : (activeEvolution ? 1 : contextOpacity) * layerRise;
          return (
            <g key={day} opacity={opacity}>
              <polygon points={polygon(corners)} fill="rgba(244, 241, 235, 0.34)" stroke={isActive ? DASHBOARD_COLORS.sceneActive : '#d6d3d1'} strokeWidth={isActive ? 2.2 : 0.9} />
              {dayCells[day].map((cell, index) => {
                const point = project3D(cell.x, cell.z, time, yaw, pitch, centerX, centerY, scale);
                const intensity = Math.min(1, cell.count / 7);
                const radius = (7 + Math.sqrt(cell.count) * 5) * (isActive ? 1.2 : 1);
                 return (
                   <g key={`${day}-${index}`}>
                     <circle cx={point.x} cy={point.y} r={radius * 1.35} fill={getStkdeIntensityColor(intensity, 0.18)} />
                     <circle cx={point.x} cy={point.y} r={radius} fill={getStkdeIntensityColor(intensity, 0.82)} />
                     {isActive ? <circle cx={point.x} cy={point.y} r={radius + 3} fill="none" stroke={DASHBOARD_COLORS.sceneActive} strokeWidth="1.5" opacity="0.9" /> : null}
                   </g>
                 );
              })}
            </g>
          );
        })}

        {!isScanning ? (
          <g opacity={selectedOpacity}>
            {selectedLayers.map((time) => {
              const hour = (time - SELECTED_START) / 3600;
              const displayTime = adaptiveHourPosition(hour) * 100;
               const corners = cornersAt(displayTime, yaw, pitch, centerX, centerY, scale);
               const cells = dayCells[SELECTED_DAY].filter((cell) => cell.time === time);
               const selectedEvolution = isEvolving && evolutionSlice === SELECTED_DAY;
               return (
                 <g key={time}>
                   <polygon points={polygon(corners)} fill="rgba(244, 241, 235, 0.2)" stroke={selectedEvolution ? DASHBOARD_COLORS.sceneActive : '#b8a99a'} strokeWidth={selectedEvolution ? 2.2 : 0.8} />
                  {cells.map((cell, index) => {
                    const point = project3D(cell.x, cell.z, displayTime, yaw, pitch, centerX, centerY, scale);
                    const intensity = Math.min(1, cell.count / 7);
                     const radius = (8 + Math.sqrt(cell.count) * 5.2) * (selectedEvolution ? 1.2 : 1);
                    return (
                       <g key={`${cell.x}-${cell.z}-${index}`}>
                         <circle cx={point.x} cy={point.y} r={radius * 1.4} fill={getStkdeIntensityColor(intensity, 0.2)} />
                         <circle cx={point.x} cy={point.y} r={radius} fill={getStkdeIntensityColor(intensity, 0.88)} />
                         {selectedEvolution ? <circle cx={point.x} cy={point.y} r={radius + 3} fill="none" stroke={DASHBOARD_COLORS.sceneActive} strokeWidth="1.5" opacity="0.9" /> : null}
                       </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        ) : null}

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

      <aside style={{ position: 'absolute', right: 20, bottom: 20, minWidth: 200, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 10, background: 'rgba(255, 255, 255, 0.92)', padding: '9px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: DASHBOARD_COLORS.foreground, fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: 750, letterSpacing: 1.4 }}><span>STKDE INTENSITY</span><ChevronUp size={12} /></div>
        <div style={{ height: 8, marginTop: 6, borderRadius: 99, background: getStkdePaletteGradient('field'), border: `1px solid ${DASHBOARD_COLORS.border}` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 8 }}><span>0.00 Low</span><span>1.00 High</span></div>
      </aside>
    </div>
  );
}
