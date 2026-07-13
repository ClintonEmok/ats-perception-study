import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { TimeSlice } from '@/store/useSliceStore';
import { buildEvolutionFlowModel } from '@/lib/evolution/evolution-flow';

function resolveCenter(slice: TimeSlice) {
  if (slice.type === 'range' && slice.range) {
    return (Math.min(slice.range[0], slice.range[1]) + Math.max(slice.range[0], slice.range[1])) / 2;
  }

  return slice.time;
}

function createPoints(fromY: number, toY: number) {
  return new Float32Array([0, fromY, 0, 0, toY, 0]);
}

export function EvolutionFlowOverlay({
  slices,
  activeSliceId,
  timeToY,
}: {
  slices: TimeSlice[];
  activeSliceId: string | null;
  timeToY: (time: number) => number;
}) {
  const model = buildEvolutionFlowModel({
    slices: slices.map((slice) => ({
      id: slice.id,
      label: slice.name,
      type: slice.type,
      time: slice.time,
      range: slice.range,
      isVisible: slice.isVisible,
    })),
    activeSliceId,
  });

  if (model.isNeutral || model.flowSegments.length === 0) {
    return null;
  }

  const sliceMap = new Map(slices.filter((slice) => slice.isVisible).map((slice) => [slice.id, slice]));

  return (
    <group>
      <group position={[48, 0, 48]}>
        <Html center className="pointer-events-none select-none">
          <div className="rounded-full border border-border bg-background/85 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-foreground shadow-sm backdrop-blur">
            Pattern flow
          </div>
        </Html>
      </group>

      {model.flowSegments.map((segment) => {
        const fromSlice = sliceMap.get(segment.fromId);
        const toSlice = sliceMap.get(segment.toId);
        if (!fromSlice || !toSlice) {
          return null;
        }

        const fromY = timeToY(resolveCenter(fromSlice));
        const toY = timeToY(resolveCenter(toSlice));
        const points = createPoints(fromY, toY);

        return (
          <group key={segment.id}>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[points, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color={segment.isActive ? '#67e8f9' : '#94a3b8'} transparent opacity={segment.isActive ? 0.95 : 0.55} linewidth={1} />
            </line>
            <mesh position={[0, toY, 0]}>
              <coneGeometry args={[0.8, 2.2, 4]} />
              <meshBasicMaterial color={segment.isActive ? '#67e8f9' : '#94a3b8'} transparent opacity={0.85} side={THREE.DoubleSide} />
            </mesh>
            <Html center position={[50, (fromY + toY) / 2, 50]} className="pointer-events-none select-none">
              <div className="rounded-full border border-border bg-background/85 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-foreground shadow-sm backdrop-blur">
                {segment.label}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
