import { describe, expect, test, vi } from 'vitest';
import { applyRangeToStoresContract } from '@/components/timeline/DemoDualTimeline';
import type { Stkde3DClusterInteractionPayload, Stkde3DBurstInteractionPayload } from '@/app/stkde-3d/components/Stkde3DSceneProvider';
import { deriveDemo3dInteractionCommand } from './syncDemo3dInteraction';

const burstPayload: Stkde3DBurstInteractionPayload = {
  burstId: 'burst-1',
  sampleId: 'burst-1-sample-1',
  sampleIndex: 0,
  sourceSliceId: 'slice-b',
  startEpoch: 300,
  endEpoch: 100,
  sampleEpoch: 200,
  supportCount: 12,
  intensityScore: 0.8,
  spreadMeters: 450,
  adaptiveHeight: 4,
  durationSeconds: 200,
  focusPoint: [4, 0, 8],
};

const trajectoryPayload: Stkde3DClusterInteractionPayload = {
  hotspotId: 'slice-only-hotspot',
  trackId: 'track-1',
  snapshotIndex: 1,
  sourceSliceId: 'slice-a',
  startEpoch: 900,
  endEpoch: 700,
  centroidLat: 41.88,
  centroidLng: -87.63,
  radiusMeters: 300,
  focusPoint: [5, 0, 7],
};

describe('deriveDemo3dInteractionCommand', () => {
  test('orders burst ranges and carries the selected slice and burst window', () => {
    const existingBurstWindow = { id: 'burst-1' } as unknown as Parameters<typeof deriveDemo3dInteractionCommand>[0]['existingBurstWindow'];
    const command = deriveDemo3dInteractionCommand({
      kind: 'burst',
      payload: burstPayload,
      existingBurstWindow,
      resolveEpochY: (epoch) => epoch / 10,
    });

    expect(command.epochRange).toEqual([100, 300]);
    expect(command.sourceSliceId).toBe('slice-b');
    expect(command.activeSliceTarget).toEqual({ sourceSliceId: 'slice-b', index: null });
    expect(command.selectedBurstWindow).toBe(existingBurstWindow);
    expect(command.cameraTarget).toEqual([4, 20, 8]);
  });

  test('exactly matches top-level trajectory IDs and leaves spatial fallback empty', () => {
    const command = deriveDemo3dInteractionCommand({
      kind: 'trajectory',
      payload: trajectoryPayload,
      topLevelHotspotIds: ['slice-only-hotspot'],
      resolveEpochY: (epoch) => epoch / 10,
    });

    expect(command.selectedHotspotId).toBe('slice-only-hotspot');
    expect(command.hotspotResolution).toBe('exact');
    expect(command.mapFocus).toBeNull();
  });

  test('uses centroid and range fallback without forwarding an unknown trajectory ID', () => {
    const command = deriveDemo3dInteractionCommand({
      kind: 'trajectory',
      payload: trajectoryPayload,
      topLevelHotspotIds: ['top-level-hotspot'],
      resolveEpochY: (epoch) => epoch / 10,
    });

    expect(command.selectedHotspotId).toBeNull();
    expect(command.trajectoryHotspotId).toBe('slice-only-hotspot');
    expect(command.hotspotResolution).toBe('spatial-fallback');
    expect(command.mapFocus).toEqual({
      centroidLat: 41.88,
      centroidLng: -87.63,
      radiusMeters: 300,
      epochRange: [700, 900],
    });
  });

  test('synchronizes the epoch filter and normalized stores against the full domain', () => {
    const fullTimeDomain: [number, number] = [0, 1_000];
    const cubeTimeDomain: [number, number] = [200, 800];
    const setTimeRange = vi.fn();
    const setRange = vi.fn();
    const setBrushRange = vi.fn();
    const setTime = vi.fn();

    applyRangeToStoresContract({
      interactive: true,
      startSec: 100,
      endSec: 900,
      domainStart: fullTimeDomain[0],
      domainEnd: fullTimeDomain[1],
      currentTime: 95,
      setTimeRange,
      setRange,
      setBrushRange,
      setTime,
    });

    const expectedRange: [number, number] = [10, 90];
    expect(setTimeRange).toHaveBeenCalledWith([100, 900]);
    expect(cubeTimeDomain).not.toEqual(fullTimeDomain);
    expect(setRange).toHaveBeenCalledWith(expectedRange);
    expect(setBrushRange).toHaveBeenCalledWith(expectedRange);
    expect(setTime).toHaveBeenCalledWith(90);
  });
});
