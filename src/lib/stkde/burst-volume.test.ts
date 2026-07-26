import { describe, expect, test } from 'vitest';
import { buildBurstVolumeModel, buildNeutralBurstVolumeModel } from './burst-volume';
import type { StkdeSurfaceResponse } from './contracts';

const surfaceResponse = (
  hotspots: StkdeSurfaceResponse['hotspots'],
): StkdeSurfaceResponse => ({
  meta: {
    eventCount: hotspots.reduce((sum, hotspot) => sum + hotspot.supportCount, 0),
    computeMs: 12,
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

describe('buildBurstVolumeModel', () => {
  test('returns a stable neutral model when burst or STKDE inputs are missing', () => {
    expect(buildBurstVolumeModel({ burstWindow: null, sliceResults: null })).toEqual(buildNeutralBurstVolumeModel());
    expect(buildBurstVolumeModel({ burstWindow: null, sliceResults: {} })).toEqual(buildNeutralBurstVolumeModel());
    expect(buildBurstVolumeModel({
      burstWindow: {
        id: 'burst-1',
        startEpochSec: 100,
        endEpochSec: 200,
      },
      sliceResults: {},
    })).toEqual(buildNeutralBurstVolumeModel());
  });

  test('derives a deterministic burst volume from unsorted slices and hotspots', () => {
    const model = buildBurstVolumeModel({
      burstWindow: {
        id: 'burst-9',
        startEpochSec: 1_700_000_000,
        peakEpochSec: 1_700_000_090,
        endEpochSec: 1_700_000_180,
        count: 48,
        burstScore: 0.72,
        burstClass: 'prolonged-peak',
        label: 'Peak burst',
      },
      sliceResults: {
        'slice-z': surfaceResponse([
          {
            id: 'z-strong',
            centroidLng: -87.61,
            centroidLat: 41.89,
            intensityScore: 0.84,
            supportCount: 18,
            peakStartEpochSec: 1_700_000_120,
            peakEndEpochSec: 1_700_000_150,
            radiusMeters: 260,
          },
        ]),
        'slice-a': surfaceResponse([
          {
            id: 'a-strong',
            centroidLng: -87.63,
            centroidLat: 41.88,
            intensityScore: 0.91,
            supportCount: 24,
            peakStartEpochSec: 1_700_000_020,
            peakEndEpochSec: 1_700_000_050,
            radiusMeters: 180,
          },
          {
            id: 'a-secondary',
            centroidLng: -87.635,
            centroidLat: 41.882,
            intensityScore: 0.6,
            supportCount: 8,
            peakStartEpochSec: 1_700_000_030,
            peakEndEpochSec: 1_700_000_060,
            radiusMeters: 140,
          },
        ]),
      },
    });

    expect(model.id).toBe('burst-9');
    expect(model.label).toBe('Peak burst');
    expect(model.startEpochSec).toBe(1_700_000_000);
    expect(model.peakEpochSec).toBe(1_700_000_090);
    expect(model.endEpochSec).toBe(1_700_000_180);
    expect(model.durationSec).toBe(180);
    expect(model.eventCount).toBe(48);
    expect(model.samples).toHaveLength(5);
    expect(model.samples[0]?.sliceId).toBe('slice-a');
    expect(model.samples[4]?.sliceId).toBe('slice-z');
    expect(model.samples.map((sample) => sample.timeEpochSec)).toEqual([
      1_700_000_000,
      1_700_000_045,
      1_700_000_090,
      1_700_000_135,
      1_700_000_180,
    ]);
    expect(model.samples[0]?.sampleId).toBe('burst-9-sample-1');
    expect(model.samples[0]?.projectedX).toBeTypeOf('number');
    expect(model.samples[0]?.projectedZ).toBeTypeOf('number');
    expect(model.centroidPath[0]?.projectedX).toBe(model.samples[0]?.projectedX);
    expect(model.centroidPath.map((sample) => sample.sampleId)).toEqual(model.samples.map((sample) => sample.sampleId));
    expect(model.spatialFootprint.supportCount).toBeGreaterThan(0);
    expect(model.spatialFootprint.maxSpreadMeters).toBe(260);
    expect(model.adaptiveHeight).toBeGreaterThan(0);
  });

  test('is deterministic for the same input object', () => {
    const input = {
      burstWindow: {
        id: 'burst-2',
        startEpochSec: 10,
        peakEpochSec: 12,
        endEpochSec: 18,
        count: 12,
        burstScore: 0.2,
        burstClass: 'neutral',
      },
      sliceResults: {
        'slice-b': surfaceResponse([
          {
            id: 'b-hotspot',
            centroidLng: -87.62,
            centroidLat: 41.885,
            intensityScore: 0.4,
            supportCount: 6,
            peakStartEpochSec: 10,
            peakEndEpochSec: 12,
            radiusMeters: 90,
          },
        ]),
        'slice-a': surfaceResponse([
          {
            id: 'a-hotspot',
            centroidLng: -87.63,
            centroidLat: 41.88,
            intensityScore: 0.5,
            supportCount: 8,
            peakStartEpochSec: 10,
            peakEndEpochSec: 12,
            radiusMeters: 110,
          },
        ]),
      },
    } as const;

    expect(buildBurstVolumeModel(input)).toEqual(buildBurstVolumeModel(input));
  });
});
