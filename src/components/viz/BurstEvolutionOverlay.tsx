import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { TimeSlice } from '@/store/useSliceStore';
import {
  buildBurstEvolutionModel,
  type BurstEvolutionConnectorSegment,
  type BurstEvolutionModel,
  type BurstEvolutionSliceInput,
  type BurstEvolutionWindowInput,
} from '@/lib/stkde/burst-evolution';

const BURST_COLORS: Record<NonNullable<BurstEvolutionSliceInput['burstClass']>, string> = {
  'prolonged-peak': '#22d3ee',
  'isolated-spike': '#d8b4fe',
  valley: '#6ee7b7',
  neutral: '#fbbf24',
};

function resolveBurstColor(burstClass: BurstEvolutionSliceInput['burstClass'] | BurstEvolutionWindowInput['burstClass'] | undefined) {
  return burstClass ? BURST_COLORS[burstClass] : '#94a3b8';
}

function resolveSliceCenter(slice: TimeSlice) {
  if (slice.type === 'range' && slice.range) {
    return (Math.min(slice.range[0], slice.range[1]) + Math.max(slice.range[0], slice.range[1])) / 2;
  }

  return slice.time;
}

function resolveSlicePosition(slice: TimeSlice, timeToY: (time: number) => number) {
  return timeToY(resolveSliceCenter(slice));
}

function buildLinePoints(fromY: number, toY: number): Float32Array {
  return new Float32Array([0, fromY, 0, 0, toY, 0]);
}

function SegmentLine({ segment, fromY, toY }: { segment: BurstEvolutionConnectorSegment; fromY: number; toY: number }) {
  const color = resolveBurstColor(segment.burstClass);

  return (
    <line key={segment.id}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buildLinePoints(fromY, toY), 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.72} linewidth={1} />
    </line>
  );
}

function BurstNode({ y, score, burstClass }: { y: number; score: number; burstClass: BurstEvolutionSliceInput['burstClass'] }) {
  const color = resolveBurstColor(burstClass);
  const radius = Math.max(0.55, 0.55 + score * 0.55);

  return (
    <mesh position={[0, y, 0]}>
      <sphereGeometry args={[radius, 14, 14]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function BurstEvolutionOverlay({
  slices,
  burstWindows,
  timeToY,
}: {
  slices: TimeSlice[];
  burstWindows: BurstEvolutionWindowInput[];
  timeToY: (time: number) => number;
}) {
  const visibleSlices = slices.filter((slice) => slice.isVisible);
  const model: BurstEvolutionModel = buildBurstEvolutionModel({
    slices: visibleSlices.map((slice) => ({
      id: slice.id,
      name: slice.name,
      type: slice.type,
      time: slice.time,
      range: slice.range,
      isVisible: slice.isVisible,
      isBurst: slice.isBurst,
      burstScore: slice.burstScore,
      burstClass: slice.burstClass,
    })),
    burstWindows,
  });

  if (model.isNeutral || model.connectorSegments.length === 0) {
    return null;
  }

  const sliceById = new Map(visibleSlices.map((slice) => [slice.id, slice]));

  return (
    <group>
      <group position={[48, 0, 48]}>
        <Html center className="pointer-events-none select-none">
          <div className="rounded-full border border-border bg-background/85 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-foreground shadow-sm backdrop-blur">
            Burst lifecycle · {model.strongestScore.toFixed(0)}
          </div>
        </Html>
      </group>

      {model.connectorSegments.map((segment) => {
        const fromSlice = sliceById.get(segment.fromId);
        const toSlice = sliceById.get(segment.toId);
        if (!fromSlice || !toSlice) {
          return null;
        }

        const fromY = resolveSlicePosition(fromSlice, timeToY);
        const toY = resolveSlicePosition(toSlice, timeToY);

        return (
          <group key={segment.id}>
            <SegmentLine segment={segment} fromY={fromY} toY={toY} />
            <BurstNode y={fromY} score={Math.max(0.2, Math.min(1, segment.score / Math.max(model.strongestScore, 1)))} burstClass={segment.burstClass} />
            <BurstNode y={toY} score={Math.max(0.2, Math.min(1, segment.score / Math.max(model.strongestScore, 1)))} burstClass={segment.burstClass} />
          </group>
        );
      })}
    </group>
  );
}
