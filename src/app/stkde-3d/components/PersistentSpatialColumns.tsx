'use client';

import { useMemo } from 'react';
import type { KdeCell } from '@/lib/kde/types';
import { getStkdeIntensityColor } from '../lib/palette';
import {
  buildPersistentSpatialColumns,
  mapPersistentSpatialSegmentToY,
  type PersistentSpatialSlice,
} from '../lib/spatial-columns';
import { useStkde3DSceneRuntime } from './Stkde3DSceneProvider';

interface PersistentSpatialColumnsProps {
  slices: readonly PersistentSpatialSlice[];
  sliceKdes: readonly (readonly KdeCell[] | undefined)[];
  kdeGridSize?: number;
  intensityCutoff?: number;
  minSlices?: number;
}

const DISABLED_RAYCAST = () => null;

export function PersistentSpatialColumns({
  slices,
  sliceKdes,
  kdeGridSize = 32,
  intensityCutoff,
  minSlices = 2,
}: PersistentSpatialColumnsProps) {
  const { resolveEpochY } = useStkde3DSceneRuntime();
  const columns = useMemo(
    () => buildPersistentSpatialColumns(slices, sliceKdes, minSlices, intensityCutoff),
    [intensityCutoff, minSlices, sliceKdes, slices],
  );
  const mappedSegments = useMemo(
    () => columns.flatMap((column) => column.segments.flatMap((segment) => {
      const y = mapPersistentSpatialSegmentToY(segment, resolveEpochY);
      return y ? [{ column, segment, y }] : [];
    })),
    [columns, resolveEpochY],
  );

  if (mappedSegments.length === 0) return null;

  const safeGridSize = Number.isFinite(kdeGridSize) ? Math.max(4, Math.round(kdeGridSize)) : 4;
  const footprint = Math.max(0.8, (100 / safeGridSize) * 0.76);

  return (
    <group>
      {mappedSegments.map(({ column, segment, y }) => (
        <mesh
          key={`${column.x}:${column.z}:${segment.sliceIndex}:${segment.startEpoch}`}
          position={[column.x, y.centerY, column.z]}
          raycast={DISABLED_RAYCAST}
        >
          <boxGeometry args={[footprint, y.height, footprint]} />
          <meshStandardMaterial
            color={getStkdeIntensityColor(segment.normalizedIntensity, 1)}
            transparent
            opacity={0.3 + segment.normalizedIntensity * 0.46}
            roughness={0.84}
            metalness={0.04}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
