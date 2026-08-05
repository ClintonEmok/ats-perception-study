import { describe, expect, it } from 'vitest';
import { computeStkdeFromCrimes } from './compute';

describe('slice-aware STKDE contract', () => {
  it('returns keyed slice results while preserving aggregate output', () => {
    const request = {
      computeMode: 'sampled',
      callerIntent: 'stkde',
      domain: {
        startEpochSec: 1_700_000_000,
        endEpochSec: 1_700_086_400,
      },
      filters: {
        bbox: [-87.7, 41.8, -87.6, 41.95],
        slices: [
          {
            id: 'slice-a',
            startEpochSec: 1_700_000_000,
            endEpochSec: 1_700_030_000,
          },
          {
            id: 'slice-b',
            startEpochSec: 1_700_030_000,
            endEpochSec: 1_700_086_400,
          },
        ],
      },
      params: {
        spatialBandwidthMeters: 750,
        temporalBandwidthHours: 24,
        gridCellMeters: 500,
        topK: 12,
        minSupport: 1,
        timeWindowHours: 24,
      },
      limits: {
        maxEvents: 100,
        maxGridCells: 400,
      },
    } as any;

    const crimes = [
      {
        timestamp: 1_700_010_000,
        type: 'THEFT',
        lat: 41.88,
        lon: -87.63,
        x: 0,
        z: 0,
        district: '1',
        year: 2023,
        iucr: '0820',
      },
      {
        timestamp: 1_700_050_000,
        type: 'BATTERY',
        lat: 41.89,
        lon: -87.62,
        x: 0,
        z: 0,
        district: '1',
        year: 2023,
        iucr: '0460',
      },
    ] as any;

    const { response } = computeStkdeFromCrimes(request, crimes);

    expect(response.meta.eventCount).toBe(2);
    expect(response.meta.requestedComputeMode).toBe('sampled');
    expect(response.sliceResults).toBeDefined();
    expect(Object.keys(response.sliceResults)).toEqual(['slice-a', 'slice-b']);
    expect(response.sliceResults['slice-a'].meta.eventCount).toBe(1);
    expect(response.sliceResults['slice-b'].meta.eventCount).toBe(1);
    expect(response.heatmap.cells.length).toBeGreaterThan(0);
    expect(response.hotspots.length).toBeGreaterThan(0);
  });

  it('uses per-slice fetched crimes so a slice is not diluted by the domain cap', () => {
    const request = {
      computeMode: 'sampled',
      callerIntent: 'stkde',
      domain: {
        startEpochSec: 1_700_000_000,
        endEpochSec: 1_700_086_400,
      },
      filters: {
        bbox: [-87.7, 41.8, -87.6, 41.95],
        slices: [
          {
            id: 'slice-a',
            startEpochSec: 1_700_000_000,
            endEpochSec: 1_700_030_000,
          },
          {
            id: 'slice-b',
            startEpochSec: 1_700_030_000,
            endEpochSec: 1_700_086_400,
          },
        ],
      },
      params: {
        spatialBandwidthMeters: 750,
        temporalBandwidthHours: 24,
        gridCellMeters: 500,
        topK: 12,
        minSupport: 1,
        timeWindowHours: 24,
      },
      limits: {
        maxEvents: 100,
        maxGridCells: 400,
      },
    } as any;

    const crime = (timestamp: number) => ({
      timestamp,
      type: 'THEFT',
      lat: 41.88,
      lon: -87.63,
      x: 0,
      z: 0,
      district: '1',
      year: 2023,
      iucr: '0820',
    });

    // Domain set contains only slice-b crimes; per-slice fetch supplies slice-a
    // crimes independently. slice-a must still surface its own events.
    const domainCrimes = [crime(1_700_050_000), crime(1_700_060_000)];
    const perSliceCrimes = new Map([
      ['slice-a', [crime(1_700_010_000)]],
      ['slice-b', []],
    ]);

    const { response } = computeStkdeFromCrimes(request, domainCrimes, undefined, perSliceCrimes);

    expect(response.sliceResults['slice-a'].meta.eventCount).toBe(1);
    expect(response.sliceResults['slice-b'].meta.eventCount).toBe(0);
  });
});
