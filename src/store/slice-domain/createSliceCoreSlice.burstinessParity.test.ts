/**
 * Burstiness parity + density/contextual stub tests (Phase 84, Plan 84-01).
 *
 * These tests enforce the BFT-12 invariant and the burstiness-mode parity
 * guarantee: when `useAdaptiveStore.activeSignalSource === 'burstiness'`,
 * the pre-Phase-84 hardcoded `warpWeight` values (`1.0` for non-burst,
 * `bin.warpWeight ?? 1.25` for burst taxonomy, with `isNeutralPartition`
 * → `1.0` fallback) must be reproduced exactly. The density and contextual
 * sources return `1.0` when no baseline is loaded (stub behavior; their
 * real implementations land in 84-02 and 84-03 respectively).
 *
 * The pre-Phase-84 fixture pattern is mirrored from
 * `src/store/useDashboardDemoTimeslicingModeStore.test.ts:306-373`.
 */

import { beforeEach, describe, expect, test } from 'vitest';

import type { TimeBin } from '@/lib/binning/types';
import { useAdaptiveStore } from '../useAdaptiveStore';
import { useSliceDomainStore } from '../useSliceDomainStore';

const buildBurstTaxonomyBin = (overrides: Partial<TimeBin> = {}): TimeBin => ({
  id: overrides.id ?? 'b1',
  startTime: overrides.startTime ?? 0,
  endTime: overrides.endTime ?? 40,
  count: overrides.count ?? 12,
  crimeTypes: overrides.crimeTypes ?? ['THEFT'],
  avgTimestamp: overrides.avgTimestamp ?? 20,
  burstClass: overrides.burstClass ?? 'isolated-spike',
  burstRuleVersion: overrides.burstRuleVersion ?? 'v1',
  burstScore: overrides.burstScore ?? 0.82,
  burstinessCoefficient: overrides.burstinessCoefficient ?? 0.64,
  burstinessFormula: overrides.burstinessFormula ?? 'B = (σ - μ) / (σ + μ)',
  burstinessCalculation: overrides.burstinessCalculation ?? 'demo calculation',
  burstConfidence: overrides.burstConfidence ?? 0.91,
  burstProvenance: overrides.burstProvenance ?? 'demo',
  tieBreakReason: overrides.tieBreakReason ?? 'highest score',
  thresholdSource: overrides.thresholdSource ?? 'demo-threshold',
  neighborhoodSummary: overrides.neighborhoodSummary ?? 'north district',
  // Caller can override warpWeight / isNeutralPartition selectively.
  ...overrides,
});

const buildNonBurstBin = (overrides: Partial<TimeBin> = {}): TimeBin => ({
  id: overrides.id ?? 'b2',
  startTime: overrides.startTime ?? 40,
  endTime: overrides.endTime ?? 100,
  count: overrides.count ?? 18,
  crimeTypes: overrides.crimeTypes ?? ['BATTERY'],
  avgTimestamp: overrides.avgTimestamp ?? 70,
  ...overrides,
});

beforeEach(() => {
  useAdaptiveStore.setState({ activeSignalSource: 'burstiness' });
  useSliceDomainStore.getState().clearSlices();
});

describe('createSliceCoreSlice burstiness parity', () => {
  test('addSliceFromBin: burst taxonomy bin uses bin.warpWeight ?? 1.25', () => {
    const bin = buildBurstTaxonomyBin({ warpWeight: 1.8 });

    const sliceId = useSliceDomainStore.getState().addSliceFromBin(bin, [0, 100]);
    const slice = useSliceDomainStore
      .getState()
      .slices.find((s) => s.id === sliceId);

    expect(sliceId).not.toBeNull();
    expect(slice?.warpWeight).toBe(1.8);
    expect(slice?.isBurst).toBe(true);
  });

  test('addSliceFromBin: non-burst bin uses warpWeight 1.0', () => {
    const bin = buildNonBurstBin();

    const sliceId = useSliceDomainStore.getState().addSliceFromBin(bin, [0, 100]);
    const slice = useSliceDomainStore
      .getState()
      .slices.find((s) => s.id === sliceId);

    expect(sliceId).not.toBeNull();
    expect(slice?.warpWeight).toBe(1.0);
    expect(slice?.isBurst).toBeFalsy();
  });

  test('addSliceFromBin: burst taxonomy with isNeutralPartition uses 1.0', () => {
    const bin = buildBurstTaxonomyBin({ isNeutralPartition: true });
    // No warpWeight set; the literal `bin.warpWeight ?? (bin.isNeutralPartition ? 1 : 1.25)`
    // should evaluate to `1` because isNeutralPartition is true.
    delete (bin as { warpWeight?: number }).warpWeight;

    const sliceId = useSliceDomainStore.getState().addSliceFromBin(bin, [0, 100]);
    const slice = useSliceDomainStore
      .getState()
      .slices.find((s) => s.id === sliceId);

    expect(sliceId).not.toBeNull();
    expect(slice?.warpWeight).toBe(1.0);
  });

  test('replaceSlicesFromBins: 2 bins produce 1.8 and 1.0 in burstiness mode', () => {
    const burstBin = buildBurstTaxonomyBin({ warpWeight: 1.8 });
    const nonBurstBin = buildNonBurstBin();

    useSliceDomainStore.getState().replaceSlicesFromBins([burstBin, nonBurstBin], [0, 100]);

    const slices = useSliceDomainStore.getState().slices;
    expect(slices).toHaveLength(2);
    expect(slices[0]?.warpWeight).toBe(1.8);
    expect(slices[1]?.warpWeight).toBe(1.0);
  });

  test('density source with no baseline returns 1.0 (stub)', () => {
    useAdaptiveStore.setState({ activeSignalSource: 'density' });
    const bin = buildBurstTaxonomyBin({ warpWeight: 1.8 });

    const sliceId = useSliceDomainStore.getState().addSliceFromBin(bin, [0, 100]);
    const slice = useSliceDomainStore
      .getState()
      .slices.find((s) => s.id === sliceId);

    expect(sliceId).not.toBeNull();
    expect(slice?.warpWeight).toBe(1.0);
  });

  test('preserves an explicit generated weight when requested by a case study', () => {
    useAdaptiveStore.setState({ activeSignalSource: 'density' });
    const bin = buildBurstTaxonomyBin({ warpWeight: 1.8 });

    useSliceDomainStore.getState().replaceSlicesFromBins([bin], [0, 100], { preserveWarpWeight: true });

    expect(useSliceDomainStore.getState().slices[0]?.warpWeight).toBe(1.8);
  });

  test('contextual source with no baseline returns 1.0 (stub)', () => {
    useAdaptiveStore.setState({ activeSignalSource: 'contextual' });
    const bin = buildBurstTaxonomyBin({ warpWeight: 1.8 });

    const sliceId = useSliceDomainStore.getState().addSliceFromBin(bin, [0, 100]);
    const slice = useSliceDomainStore
      .getState()
      .slices.find((s) => s.id === sliceId);

    expect(sliceId).not.toBeNull();
    expect(slice?.warpWeight).toBe(1.0);
  });

  test('switching source after slice creation does not mutate existing slices\' warpWeight', () => {
    const burstBin = buildBurstTaxonomyBin({ warpWeight: 1.8 });
    const sliceId = useSliceDomainStore.getState().addSliceFromBin(burstBin, [0, 100]);

    const before = useSliceDomainStore.getState().slices.find((s) => s.id === sliceId);
    expect(before?.warpWeight).toBe(1.8);

    // Switch source AFTER slice was created.
    useAdaptiveStore.setState({ activeSignalSource: 'density' });
    const after = useSliceDomainStore.getState().slices.find((s) => s.id === sliceId);
    expect(after?.warpWeight).toBe(1.8);

    // Switch to contextual too — existing slice should still be 1.8.
    useAdaptiveStore.setState({ activeSignalSource: 'contextual' });
    const finalState = useSliceDomainStore.getState().slices.find((s) => s.id === sliceId);
    expect(finalState?.warpWeight).toBe(1.8);
  });
});
