import { describe, expect, it } from 'vitest';
import { createStkde3DSceneRuntime } from '../components/Stkde3DSceneProvider';
import { buildRawEventPositions, resolveRawEventY } from './raw-events';

describe('raw event scene placement', () => {
  it('maps each timestamp through the shared non-linear runtime resolver', () => {
    const runtime = createStkde3DSceneRuntime({
      displayDomain: [100, 200],
      warpDomain: [100, 200],
      timeScaleMode: 'adaptive',
      warpBlend: 1,
      warpMap: Float32Array.from([100, 110, 190, 200]),
    });
    const events = [
      { x: 1, z: 2, type: 'A', timestampEpochSec: 110 },
      { x: 3, z: 4, type: 'B', timestampEpochSec: 190 },
    ];

    const positions = buildRawEventPositions(events, runtime.resolveEpochY, -10);

    expect(positions[1]).toBeCloseTo(runtime.resolveEpochY(110) + 0.15, 5);
    expect(positions[4]).toBeCloseTo(runtime.resolveEpochY(190) + 0.15, 5);
    expect(positions[1]).not.toBeCloseTo(positions[4], 3);
  });

  it('uses the compatibility fallback only for an invalid event timestamp', () => {
    const event = { x: 0, z: 0, type: 'legacy', timestampEpochSec: Number.NaN };
    expect(resolveRawEventY(event, (epoch) => epoch * 2, 7)).toBeCloseTo(7.15, 6);
  });
});
