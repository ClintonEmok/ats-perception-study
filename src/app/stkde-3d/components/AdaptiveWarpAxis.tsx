'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { ADAPTIVE_BIN_COUNT } from '@/lib/adaptive-utils';
import { AXIS_HEIGHT, START_Y } from '../lib/timeline-axis';
import { useStkde3DSceneRuntime } from './Stkde3DSceneProvider';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

const AXIS_WIDTH = 100;
const AXIS_DEPTH = 1.8;
const AXIS_BOTTOM_Y = START_Y;
const AXIS_Z = -50.6;
const AXIS_LABEL_OFFSET_X = AXIS_WIDTH / 2 + 8;
const LINEAR_COLOR = new THREE.Color('#4f7fa8');
const MIN_BIN_HEIGHT = AXIS_HEIGHT / ADAPTIVE_BIN_COUNT / 3;
const AXIS_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const COLOR_STOPS: Array<{ stop: number; color: [number, number, number] }> = [
  { stop: 0, color: [30, 58, 95] },
  { stop: 0.5, color: [14, 165, 233] },
  { stop: 0.8, color: [245, 158, 11] },
  { stop: 1, color: [239, 68, 68] },
];

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const formatAxisLabel = (epochSec: number): string => AXIS_LABEL_FORMATTER.format(new Date(epochSec * 1000));

const interpolateColor = (t: number): THREE.Color => {
  const normalized = clamp01(t);
  let left = COLOR_STOPS[0]!;
  let right = COLOR_STOPS[COLOR_STOPS.length - 1]!;

  for (let i = 0; i < COLOR_STOPS.length - 1; i += 1) {
    const current = COLOR_STOPS[i]!;
    const next = COLOR_STOPS[i + 1]!;
    if (normalized >= current.stop && normalized <= next.stop) {
      left = current;
      right = next;
      break;
    }
  }

  const span = Math.max(1e-6, right.stop - left.stop);
  const localT = (normalized - left.stop) / span;
  const r = left.color[0] + (right.color[0] - left.color[0]) * localT;
  const g = left.color[1] + (right.color[1] - left.color[1]) * localT;
  const b = left.color[2] + (right.color[2] - left.color[2]) * localT;
  return new THREE.Color(r / 255, g / 255, b / 255);
};

export function AdaptiveWarpAxis() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const {
    densityMap,
    displayDomain,
    timeScaleMode,
    warpBlend,
    warpMap,
    resolveEpochY,
  } = useStkde3DSceneRuntime();
  const labelTicks = useMemo(() => {
    const span = Math.max(1, displayDomain[1] - displayDomain[0]);
    const positions = [0, 0.25, 0.5, 0.75, 1];

    return positions.map((fraction) => {
      const epochSec = displayDomain[0] + span * fraction;
      const y = resolveEpochY(epochSec);

      return {
        epochSec,
        y,
        label: formatAxisLabel(epochSec),
      };
    });
  }, [displayDomain, resolveEpochY]);
  const bins = useMemo(() => {
    const domain: [number, number] = displayDomain;
    const domainSpan = Math.max(1e-9, domain[1] - domain[0]);
    const adaptiveEnabled = timeScaleMode === 'adaptive' && warpBlend > 0 && warpMap && warpMap.length > 1;
    const equalHeight = AXIS_HEIGHT / ADAPTIVE_BIN_COUNT;

    return Array.from({ length: ADAPTIVE_BIN_COUNT }).reduce<Array<{ centerY: number; height: number; color: THREE.Color }>>(
      (acc, _, index) => {
        const boundaryStart = domain[0] + (index / ADAPTIVE_BIN_COUNT) * domainSpan;
        const boundaryEnd = domain[0] + ((index + 1) / ADAPTIVE_BIN_COUNT) * domainSpan;
        const densityIndex = densityMap
          ? Math.min(densityMap.length - 1, Math.floor((index / Math.max(1, ADAPTIVE_BIN_COUNT - 1)) * densityMap.length))
          : -1;
        const densityValue = densityIndex >= 0 ? densityMap?.[densityIndex] ?? 0 : 0;

        const displayedStart = adaptiveEnabled
          ? resolveEpochY(boundaryStart)
          : AXIS_BOTTOM_Y + ((boundaryStart - domain[0]) / domainSpan) * AXIS_HEIGHT;
        const displayedEnd = adaptiveEnabled
          ? resolveEpochY(boundaryEnd)
          : AXIS_BOTTOM_Y + ((boundaryEnd - domain[0]) / domainSpan) * AXIS_HEIGHT;

        const binHeight = adaptiveEnabled
          ? Math.max(MIN_BIN_HEIGHT, displayedEnd - displayedStart)
          : equalHeight;
        const previousTop = acc.length === 0
          ? AXIS_BOTTOM_Y
          : acc[acc.length - 1]!.centerY + acc[acc.length - 1]!.height / 2;

        acc.push({
          centerY: previousTop + binHeight / 2,
          height: binHeight,
          color: adaptiveEnabled ? interpolateColor(densityValue) : LINEAR_COLOR,
        });

        return acc;
      },
      [],
    );
  }, [densityMap, displayDomain, resolveEpochY, timeScaleMode, warpBlend, warpMap]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.count = bins.length;
    mesh.raycast = () => null;

    bins.forEach((bin, index) => {
      tempObject.position.set(0, bin.centerY, AXIS_Z);
      tempObject.scale.set(AXIS_WIDTH, bin.height, AXIS_DEPTH);
      tempObject.updateMatrix();

      mesh.setMatrixAt(index, tempObject.matrix);
      tempColor.copy(bin.color);
      mesh.setColorAt(index, tempColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
  }, [bins]);

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, ADAPTIVE_BIN_COUNT]}
        renderOrder={-10}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          transparent
          opacity={warpBlend > 0 ? 0.15 : 0.08}
          vertexColors
          depthWrite={false}
        />
      </instancedMesh>

      {labelTicks.map((tick, index) => (
        <group key={`${tick.epochSec}-${index}`}>
          <mesh position={[AXIS_LABEL_OFFSET_X - 3.2, tick.y, AXIS_Z + 0.05]}>
            <boxGeometry args={[2.4, 0.18, 0.45]} />
            <meshBasicMaterial color="#93c5fd" transparent opacity={0.5} depthWrite={false} />
          </mesh>
          <Html position={[AXIS_LABEL_OFFSET_X, tick.y, AXIS_Z]} center className="pointer-events-none select-none">
            <div className="rounded-md border border-sky-300/15 bg-slate-950/88 px-2 py-0.5 text-[9px] font-medium tracking-[0.08em] text-slate-100 shadow-[0_10px_25px_-14px_rgba(15,23,42,0.95)] backdrop-blur-sm">
              {tick.label}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}
