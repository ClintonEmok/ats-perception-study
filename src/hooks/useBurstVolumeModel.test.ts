import { describe, expect, test } from 'vitest';
import { buildBurstVolumeModelFromDashboardState } from './useBurstVolumeModel';
import type { DemoBurstWindowSelection } from '@/store/useDashboardDemoCoordinationStore';
import type { StkdeSurfaceResponse } from '@/lib/stkde';

const buildSurface = (
  hotspots: StkdeSurfaceResponse['hotspots'],
): StkdeSurfaceResponse => ({
  meta: {
    eventCount: hotspots.reduce((sum, hotspot) => sum + hotspot.supportCount, 0),
    computeMs: 8,
    truncated: false,
    requestedComputeMode: 'sampled',
    effectiveComputeMode: 'sampled',
    fallbackApplied: null,
  },
  heatmap: {
    cells: [],
    maxIntensity: 1,
  },
  hotspots,
  contracts: {
    scoreVersion: 'stkde-v1',
  },
});

const selection: DemoBurstWindowSelection = {
  id: 'burst-42',
  start: 100,
  end: 220,
  metric: 'burstiness',
  peak: 160,
  count: 30,
  duration: 120,
  burstClass: 'isolated-spike',
  burstConfidence: 0.81,
  burstScore: 0.63,
  burstRationale: 'High-density spike with tight spatial support',
  burstRuleVersion: 'rule-v1',
  burstProvenance: 'demo',
  tieBreakReason: 'selected by score',
  thresholdSource: 'adaptive-threshold',
  neighborhoodSummary: 'clustered near one corridor',
};

describe('buildBurstVolumeModelFromDashboardState', () => {
  test('derives a consistent model from dashboard selection state', () => {
    const sliceResults = {
      'slice-z': buildSurface([
        {
          id: 'z-hotspot',
          centroidLng: -87.7,
          centroidLat: 41.84,
          intensityScore: 0.4,
          supportCount: 4,
          peakStartEpochSec: 100,
          peakEndEpochSec: 120,
          radiusMeters: 150,
        },
      ]),
      'slice-a': buildSurface([
        {
          id: 'a-hotspot',
          centroidLng: -87.61,
          centroidLat: 41.9,
          intensityScore: 0.92,
          supportCount: 15,
          peakStartEpochSec: 140,
          peakEndEpochSec: 170,
          radiusMeters: 95,
        },
      ]),
    };

    const model = buildBurstVolumeModelFromDashboardState(selection, sliceResults);

    expect(model.id).toBe('burst-42');
    expect(model.label).toBe(selection.burstRationale);
    expect(model.samples).toHaveLength(5);
    expect(model.samples[0]?.sliceId).toBe('slice-z');
    expect(model.samples[4]?.sliceId).toBe('slice-a');
    expect(model.eventCount).toBe(selection.count);
    expect(model.isNeutral).toBe(false);
    expect(model.spatialFootprint.supportCount).toBeGreaterThan(0);
  });

  test('falls back to the neutral model when no burst is selected', () => {
    const model = buildBurstVolumeModelFromDashboardState(null, {});

    expect(model.isNeutral).toBe(true);
    expect(model.samples).toHaveLength(0);
    expect(model.eventCount).toBe(0);
  });
});
