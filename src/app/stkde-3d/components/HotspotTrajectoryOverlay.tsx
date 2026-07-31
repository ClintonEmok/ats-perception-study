'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import { lonLatToNormalized } from '@/lib/coordinate-normalization';
import { buildHotspotEvolution, type HotspotMatchingOptions } from '@/lib/hotspot-evolution';
import type { EvolvingSlice } from '../lib/types';
import { createCameraFocusTarget, useStkde3DSceneRuntime } from './Stkde3DSceneProvider';

interface HotspotTrajectoryOverlayProps {
  slices: Array<EvolvingSlice & { sourceSliceId?: string }>;
  sliceResults?: Record<string, StkdeSurfaceResponse> | null;
  viewMode?: 'stack' | 'focus';
  resolveEpochY: (epochSec: number) => number;
  matchingOptions?: HotspotMatchingOptions;
}

const TRACK_COLORS = ['#67e8f9', '#60a5fa', '#a78bfa', '#34d399', '#f472b6'];

export function HotspotTrajectoryOverlay({
  slices,
  sliceResults,
  viewMode,
  resolveEpochY,
  matchingOptions,
}: HotspotTrajectoryOverlayProps) {
  const { onClusterHover, onClusterSelect, cameraFocus } = useStkde3DSceneRuntime();
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
    return buildHotspotEvolution(sliceResults, matchingOptions).tracks
      .filter((track) => track.snapshots.length >= 2);
  }, [matchingOptions, sliceResults, viewMode]);

  if (tracks.length === 0) return null;

  return (
    <group renderOrder={200} name="hotspot-trajectory-overlay">
      {tracks.map((track, trackIndex) => {
        const color = TRACK_COLORS[trackIndex % TRACK_COLORS.length] ?? TRACK_COLORS[0];
        const renderedPoints = track.snapshots
          .map((snapshot, snapshotIndex) => {
            const slice = sliceById.get(snapshot.sliceId);
            if (!slice) return null;

            const { x, z } = lonLatToNormalized(snapshot.centroidLng, snapshot.centroidLat);
            const midpointEpoch = (snapshot.peakStartEpochSec + snapshot.peakEndEpochSec) / 2;
            const y = resolveEpochY(midpointEpoch) + 0.38;
            return { snapshot, snapshotIndex, point: [x, y, z] as [number, number, number] };
          })
          .filter((point): point is { snapshot: typeof track.snapshots[number]; snapshotIndex: number; point: [number, number, number] } => point !== null);
        const points = renderedPoints.map(({ point }) => point);

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
              <mesh
                key={`${track.id}-${pointIndex}`}
                position={point}
                renderOrder={210 + pointIndex}
                onPointerEnter={(event) => {
                  event.stopPropagation();
                  const rendered = renderedPoints[pointIndex];
                  if (!rendered) return;
                  onClusterHover({
                    hotspotId: rendered.snapshot.hotspotId,
                    trackId: track.id,
                    snapshotIndex: rendered.snapshotIndex ?? pointIndex,
                    sourceSliceId: rendered.snapshot.sliceId,
                    startEpoch: rendered.snapshot.peakStartEpochSec,
                    endEpoch: rendered.snapshot.peakEndEpochSec,
                    centroidLat: rendered.snapshot.centroidLat,
                    centroidLng: rendered.snapshot.centroidLng,
                     radiusMeters: rendered.snapshot.radiusMeters > 0 ? rendered.snapshot.radiusMeters : null,
                    focusPoint: point,
                  });
                }}
                onPointerLeave={(event) => {
                  event.stopPropagation();
                  onClusterHover(null);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  const rendered = renderedPoints[pointIndex];
                  if (!rendered) return;
                  const payload = {
                    hotspotId: rendered.snapshot.hotspotId,
                    trackId: track.id,
                    snapshotIndex: rendered.snapshotIndex ?? pointIndex,
                    sourceSliceId: rendered.snapshot.sliceId,
                    startEpoch: rendered.snapshot.peakStartEpochSec,
                    endEpoch: rendered.snapshot.peakEndEpochSec,
                    centroidLat: rendered.snapshot.centroidLat,
                    centroidLng: rendered.snapshot.centroidLng,
                     radiusMeters: rendered.snapshot.radiusMeters > 0 ? rendered.snapshot.radiusMeters : null,
                    focusPoint: point,
                  };
                  onClusterSelect(payload);
                  cameraFocus(createCameraFocusTarget(point));
                }}
                onPointerMissed={() => onClusterHover(null)}
              >
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
