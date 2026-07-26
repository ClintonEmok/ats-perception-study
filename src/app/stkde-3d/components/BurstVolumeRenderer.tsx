'use client';

import { Html, Line } from '@react-three/drei';
import type { BurstVolumeModel, BurstVolumeSample } from '@/lib/stkde';

const CONTOUR_COLORS = ['#22d3ee', '#38bdf8', '#818cf8', '#c084fc', '#f0abfc'];

interface BurstVolumeRendererProps {
  model: BurstVolumeModel;
  resolveEpochY: (epochSec: number) => number;
  active?: boolean;
}

function footprintRadius(sample: BurstVolumeSample): number {
  // The map projection and the cube use the same scene coordinate space. Keep
  // the footprint as a shallow 2.5D contour, rather than turning it into terrain.
  return Math.max(1.8, sample.spreadMeters / 30);
}

function boundaryPoints(model: BurstVolumeModel, y: number): Array<[number, number, number]> {
  const center = model.samples[0];
  if (!center) return [];
  const radius = Math.max(2.5, model.spatialFootprint.maxSpreadMeters / 30);
  const points: Array<[number, number, number]> = [];
  for (let index = 0; index <= 32; index += 1) {
    const angle = (index / 32) * Math.PI * 2;
    points.push([center.projectedX + Math.cos(angle) * radius, y, center.projectedZ + Math.sin(angle) * radius]);
  }
  return points;
}

function sampleY(model: BurstVolumeModel, sample: BurstVolumeSample, resolveEpochY: (epochSec: number) => number): number {
  const startY = resolveEpochY(model.startEpochSec);
  const endY = resolveEpochY(model.endEpochSec);
  const ratio = model.durationSec > 0 ? (sample.timeEpochSec - model.startEpochSec) / model.durationSec : 0;
  return startY + (endY - startY) * Math.min(1, Math.max(0, ratio));
}

export function BurstVolumeRenderer({ model, resolveEpochY, active = true }: BurstVolumeRendererProps) {
  if (model.isNeutral || model.samples.length === 0) return null;

  const opacity = active ? 0.78 : 0.28;
  const path = model.samples.map((sample) => [
    sample.projectedX,
    sampleY(model, sample, resolveEpochY) + 0.55,
    sample.projectedZ,
  ] as [number, number, number]);
  const startY = resolveEpochY(model.startEpochSec);
  const endY = resolveEpochY(model.endEpochSec);

  return (
    <group name="burst-volume-renderer" renderOrder={300}>
      <Line points={boundaryPoints(model, startY)} color="#f8fafc" lineWidth={active ? 2.4 : 1.2} transparent opacity={opacity} depthWrite={false} />
      <Line points={boundaryPoints(model, endY)} color="#f8fafc" lineWidth={active ? 2.4 : 1.2} transparent opacity={opacity} depthWrite={false} />
      {model.samples.map((sample, index) => {
        const y = sampleY(model, sample, resolveEpochY);
        const radius = footprintRadius(sample);
        const color = CONTOUR_COLORS[index % CONTOUR_COLORS.length] ?? CONTOUR_COLORS[0];
        return (
          <group key={sample.sampleId} position={[sample.projectedX, y, sample.projectedZ]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[radius, 32]} />
              <meshBasicMaterial color={color} transparent opacity={opacity * 0.16} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
              <ringGeometry args={[radius * 0.72, radius, 32]} />
              <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
      {path.length > 1 ? <Line points={path} color="#fef08a" lineWidth={active ? 3 : 1.5} transparent opacity={active ? 0.98 : 0.35} depthWrite={false} /> : null}
      {path.map((point, index) => (
        <mesh key={`${model.id}-centroid-${index}`} position={point}>
          <sphereGeometry args={[active ? 0.7 : 0.42, 12, 12]} />
          <meshBasicMaterial color="#fef08a" transparent opacity={active ? 0.96 : 0.4} depthWrite={false} />
        </mesh>
      ))}
      {active ? (
        <Html position={[path[0]![0], startY + 2, path[0]![2]]} center distanceFactor={85} style={{ pointerEvents: 'none' }}>
          <div className="rounded border border-cyan-300/60 bg-slate-950/90 px-2 py-1 text-[10px] font-medium tracking-wide text-cyan-100 shadow-lg">
            {model.label}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
