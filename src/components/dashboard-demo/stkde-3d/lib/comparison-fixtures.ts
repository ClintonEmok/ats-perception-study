import type { Stkde3DSceneSlice } from '../components/Stkde3DSceneProvider';

const FIXTURE_START_EPOCH = 1_700_000_000;
const FIXTURE_SLICE_DURATION = 900;
const FIXTURE_GAP = 100;
const VALID_FIXTURE_COUNTS = new Set([0, 1, 2, 10]);

/**
 * Build deterministic rendered-slice metadata for preset validation tests.
 * Production data supplies these values from the actual generated surfaces.
 */
export function buildComparisonSliceFixture(count: 0 | 1 | 2 | 10): Stkde3DSceneSlice[] {
  if (!VALID_FIXTURE_COUNTS.has(count)) {
    throw new Error('Comparison fixtures support only 0, 1, 2, or 10 slices');
  }

  return Array.from({ length: count }, (_, index) => {
    const startEpoch = FIXTURE_START_EPOCH + index * (FIXTURE_SLICE_DURATION + FIXTURE_GAP);
    return {
      index,
      label: `Slice ${index + 1}`,
      startEpoch,
      endEpoch: startEpoch + FIXTURE_SLICE_DURATION,
      burstScore: Number((0.1 + index / 20).toFixed(3)),
      crimeCount: 100 + index,
      sourceSliceId: `fixture-slice-${index}`,
      sourceSliceIndex: index,
    };
  });
}
