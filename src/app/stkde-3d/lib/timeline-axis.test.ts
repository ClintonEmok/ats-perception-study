/* @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  AXIS_HEIGHT,
  START_Y,
  resolveEpochFromWarpedY,
  resolveTemporalSlabBounds,
  resolveWarpedEpochY,
} from './timeline-axis';
import { createStkde3DSceneRuntime } from '../components/Stkde3DSceneProvider';

describe('timeline-axis vertical mapping', () => {
  it('anchors linear epochs to the full axis height', () => {
    const settings = {
      timeScaleMode: 'linear' as const,
      warpBlend: 0,
      warpMap: null,
      warpDomain: [100, 200] as [number, number],
    };

    expect(resolveWarpedEpochY(100, START_Y, settings)).toBeCloseTo(START_Y, 6);
    expect(resolveWarpedEpochY(200, START_Y, settings)).toBeCloseTo(START_Y + AXIS_HEIGHT, 6);
    expect(resolveEpochFromWarpedY(START_Y, START_Y, settings)).toBeCloseTo(100, 6);
    expect(resolveEpochFromWarpedY(START_Y + AXIS_HEIGHT, START_Y, settings)).toBeCloseTo(200, 6);
  });

  it('round-trips warped epochs through the axis mapping', () => {
    const settings = {
      timeScaleMode: 'adaptive' as const,
      warpBlend: 1,
      warpMap: Float32Array.from([100, 125, 180, 200]),
      warpDomain: [100, 200] as [number, number],
    };

    const midY = resolveWarpedEpochY(150, START_Y, settings);
    expect(midY).toBeGreaterThan(START_Y);
    expect(midY).toBeLessThan(START_Y + AXIS_HEIGHT);
    expect(resolveEpochFromWarpedY(midY, START_Y, settings)).toBeCloseTo(150, 0);
  });

  it('uses an explicit display domain instead of an implicit viewport domain', () => {
    const settings = {
      timeScaleMode: 'linear' as const,
      warpBlend: 0,
      warpMap: null,
      displayDomain: [1_700_000_000, 1_700_086_400] as [number, number],
      warpDomain: [0, 1] as [number, number],
    };

    expect(resolveWarpedEpochY(1_700_000_000, START_Y, settings)).toBeCloseTo(START_Y, 6);
    expect(resolveWarpedEpochY(1_700_086_400, START_Y, settings)).toBeCloseTo(START_Y + AXIS_HEIGHT, 6);
  });

  it('shares adaptive slice and epoch resolvers and keeps inverse mapping aligned', () => {
    const runtime = createStkde3DSceneRuntime({
      displayDomain: [100, 200],
      warpDomain: [100, 200],
      timeScaleMode: 'adaptive',
      warpBlend: 1,
      warpMap: Float32Array.from([100, 110, 190, 200]),
    });
    const slice = {
      index: 1,
      label: 'midpoint',
      startEpoch: 150,
      endEpoch: 160,
      burstScore: 0,
      crimeCount: 0,
    };

    expect(runtime.resolveSliceY(slice)).toBeCloseTo(runtime.resolveEpochY(slice.startEpoch), 6);
    expect(runtime.yToEpoch(runtime.resolveSliceY(slice))).toBeCloseTo(slice.startEpoch, 0);
  });

  it('uses warped endpoint epochs for adjacent temporal slab bounds', () => {
    const runtime = createStkde3DSceneRuntime({
      displayDomain: [100, 300],
      warpDomain: [100, 300],
      timeScaleMode: 'adaptive',
      warpBlend: 1,
      warpMap: Float32Array.from([100, 120, 260, 300]),
    });
    const first = resolveTemporalSlabBounds(100, 180, runtime.resolveEpochY);
    const second = resolveTemporalSlabBounds(180, 300, runtime.resolveEpochY);

    expect(first.endY).toBeCloseTo(second.startY, 6);
    expect(first.centerY - first.height / 2).toBeCloseTo(first.minY, 6);
    expect(second.centerY + second.height / 2).toBeCloseTo(second.maxY, 6);
    expect(first.height).toBeGreaterThan(0);
    expect(second.height).toBeGreaterThan(0);
  });

  it('inverts within the visible display domain when the warp domain is wider', () => {
    const runtime = createStkde3DSceneRuntime({
      displayDomain: [125, 175],
      warpDomain: [100, 200],
      timeScaleMode: 'adaptive',
      warpBlend: 1,
      warpMap: Float32Array.from([100, 110, 190, 200]),
    });

    const epoch = 150;
    expect(runtime.yToEpoch(runtime.resolveEpochY(epoch))).toBeCloseTo(epoch, 0);
  });
});
