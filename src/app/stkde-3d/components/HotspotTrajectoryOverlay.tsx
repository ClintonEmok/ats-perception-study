'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import { buildHotspotEvolution } from '@/lib/hotspot-evolution';
import { project } from '@/lib/projection';
import type { EvolvingSlice } from '../lib/types';

interface HotspotTrajectoryOverlayProps {
  slices: Array<EvolvingSlice & { sourceSliceId?: string }>;
  sliceResults?: Record<string, StkdeSurfaceResponse> | null;
  viewMode?: 'stack' | 'focus';
  resolveSliceY: (slice: EvolvingSlice & { sourceSliceId?: string }) => number;
}

const TRACK_COLORS = ['#67e8f9', '#60a5fa', '#a78bfa', '#34d399', '#f472b6'];

export function HotspotTrajectoryOverlay({ slices, sliceResults, viewMode, resolveSliceY }: HotspotTrajectoryOverlayProps) {
  const sliceById = useMemo(() => {
    const map = new Map<string, EvolvingSlice & { sourceSliceId?: string }>();
    for (const slice of slices) {
      const key = slice.sourceSliceId ?? String(slice.index);
      map.set(key, slice);
    }
    return map;
  }, [slices]);

  const tracks = useMemo(() => {
    if (viewMode === 'focus') return [];
    return buildHotspotEvolution(sliceResults).tracks.slice(0, 5);
  }, [sliceResults, viewMode]);

  if (tracks.length === 0) return null;

  return (
    <group renderOrder={200} name="hotspot-trajectory-overlay">
      {tracks.map((track, trackIndex) => {
        const color = TRACK_COLORS[trackIndex % TRACK_COLORS.length] ?? TRACK_COLORS[0];
        const points = track.snapshots
          .map((snapshot) => {
            const slice = sliceById.get(snapshot.sliceId);
            if (!slice) return null;

            const [x, z] = project(snapshot.centroidLat, snapshot.centroidLng);
            const y = resolveSliceY(slice) + 0.38;
            return [x, y, z] as [number, number, number];
          })
          .filter((point): point is [number, number, number] => point !== null);

        if (points.length === 0) return null;

        return (
          <group key={track.id}>
            {points.length > 1 ? (
              <Line
                points={points}
                color={color}
                lineWidth={2.25}
                transparent
                opacity={0.78}
                depthWrite={false}
              />
            ) : null}

            {points.map((point, pointIndex) => (
              <mesh key={`${track.id}-${pointIndex}`} position={point} renderOrder={210 + pointIndex}>
                <sphereGeometry args={[pointIndex === 0 || pointIndex === points.length - 1 ? 0.95 : 0.62, 14, 14]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={pointIndex === 0 || pointIndex === points.length - 1 ? 0.95 : 0.7}
                  depthWrite={false}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
