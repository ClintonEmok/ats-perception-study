import { describe, expect, test } from 'vitest';
import {
  buildBurstDraftBinsFromWindows,
  buildNonUniformDraftBinsFromSelection,
  buildDemoBurstWindowsFromSelection,
  recommendGranularityForSelection,
  partitionSelectionByGranularity,
} from './demo-burst-generation';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

describe('buildBurstDraftBinsFromWindows', () => {
  test('treats millisecond selections and second-based burst windows as the same range', () => {
    const result = buildBurstDraftBinsFromWindows(
      [
        {
          id: 'burst-1',
          start: 100,
          end: 160,
          peak: 0.92,
          count: 4,
          duration: 60,
          burstClass: 'isolated-spike',
          burstScore: 0.84,
        },
      ],
      {
        crimeTypes: [],
        neighbourhood: null,
        timeWindow: {
          start: 90_000,
          end: 180_000,
        },
        granularity: 'daily',
      }
    );

    expect(result.warning).toBeNull();
    expect(result.eventCount).toBe(4);
    expect(result.bins).toHaveLength(1);
    expect(result.bins[0]?.startTime).toBe(100_000);
    expect(result.bins[0]?.endTime).toBe(160_000);
    expect(result.bins[0]?.burstScore).toBe(0.84);
  });
});

describe('buildDemoBurstWindowsFromSelection', () => {
  test('derives burst windows from the selected subrange only', () => {
    const windows = buildDemoBurstWindowsFromSelection({
      densityMap: new Float32Array([0.12, 0.25, 0.92, 0.95, 0.18, 0.81]),
      burstThreshold: 0.85,
      mapDomain: [0, 50],
      selectionRange: [20, 40],
    });

    expect(windows).toHaveLength(1);
    expect(windows[0]?.start).toBe(20);
    expect(windows[0]?.end).toBe(40);
    expect(windows[0]?.peak).toBeCloseTo(0.95);
  });

  test('ignores stronger peaks outside the selected range', () => {
    const windows = buildDemoBurstWindowsFromSelection({
      densityMap: new Float32Array([0.08, 0.91, 0.94, 0.11, 0.99]),
      burstThreshold: 0.9,
      mapDomain: [0, 50],
      selectionRange: [0, 30],
    });

    expect(windows).toHaveLength(1);
    expect(windows[0]?.start).toBeCloseTo(12.5);
    expect(windows[0]?.end).toBe(30);
    expect(windows[0]?.peak).toBeCloseTo(0.94);
  });
});

describe('partitionSelectionByGranularity', () => {
  test('partitions an hourly selection into contiguous hourly bins', () => {
    const bins = partitionSelectionByGranularity([5_000, 5_000 + (2 * HOUR_MS) + 15 * 60 * 1000], 'hourly');

    expect(bins).toEqual([
      { startTime: 5_000, endTime: 5_000 + HOUR_MS },
      { startTime: 5_000 + HOUR_MS, endTime: 5_000 + (2 * HOUR_MS) },
      { startTime: 5_000 + (2 * HOUR_MS), endTime: 5_000 + (2 * HOUR_MS) + 15 * 60 * 1000 },
    ]);
  });

  test('partitions a daily selection into contiguous daily bins', () => {
    const bins = partitionSelectionByGranularity([12_000, 12_000 + DAY_MS + 3 * HOUR_MS], 'daily');

    expect(bins).toEqual([
      { startTime: 12_000, endTime: 12_000 + DAY_MS },
      { startTime: 12_000 + DAY_MS, endTime: 12_000 + DAY_MS + 3 * HOUR_MS },
    ]);
  });

  test('partitions a weekly selection into contiguous weekly bins', () => {
    const bins = partitionSelectionByGranularity([5_000, 5_000 + (2 * WEEK_MS) + 4 * HOUR_MS], 'weekly');

    expect(bins).toEqual([
      { startTime: 5_000, endTime: 5_000 + WEEK_MS },
      { startTime: 5_000 + WEEK_MS, endTime: 5_000 + (2 * WEEK_MS) },
      { startTime: 5_000 + (2 * WEEK_MS), endTime: 5_000 + (2 * WEEK_MS) + 4 * HOUR_MS },
    ]);
  });

  test('partitions a monthly selection into calendar-month bins', () => {
    const start = new Date('2025-01-15T09:30:00').getTime();
    const end = new Date('2025-04-10T12:00:00').getTime();

    const bins = partitionSelectionByGranularity([start, end], 'monthly');

    expect(bins).toEqual([
      { startTime: start, endTime: new Date('2025-02-01T00:00:00').getTime() },
      { startTime: new Date('2025-02-01T00:00:00').getTime(), endTime: new Date('2025-03-01T00:00:00').getTime() },
      { startTime: new Date('2025-03-01T00:00:00').getTime(), endTime: new Date('2025-04-01T00:00:00').getTime() },
      { startTime: new Date('2025-04-01T00:00:00').getTime(), endTime: end },
    ]);
  });

  test('partitions a quarterly selection into calendar-quarter bins', () => {
    const start = new Date('2025-01-15T09:30:00').getTime();
    const end = new Date('2025-11-10T12:00:00').getTime();

    const bins = partitionSelectionByGranularity([start, end], 'quarterly');

    expect(bins).toEqual([
      { startTime: start, endTime: new Date('2025-04-01T00:00:00').getTime() },
      { startTime: new Date('2025-04-01T00:00:00').getTime(), endTime: new Date('2025-07-01T00:00:00').getTime() },
      { startTime: new Date('2025-07-01T00:00:00').getTime(), endTime: new Date('2025-10-01T00:00:00').getTime() },
      { startTime: new Date('2025-10-01T00:00:00').getTime(), endTime: end },
    ]);
  });
});

describe('recommendGranularityForSelection', () => {
  test('suggests hourly for short windows', () => {
    expect(recommendGranularityForSelection({ start: 0, end: 3 * DAY_MS })).toBe('hourly');
  });

  test('suggests daily for medium windows', () => {
    expect(recommendGranularityForSelection({ start: 0, end: 30 * DAY_MS })).toBe('daily');
  });

  test('suggests monthly for long windows', () => {
    expect(recommendGranularityForSelection({ start: 0, end: 180 * DAY_MS })).toBe('monthly');
  });

  test('suggests quarterly for very long windows', () => {
    expect(recommendGranularityForSelection({ start: 0, end: 2 * 365 * DAY_MS })).toBe('quarterly');
  });
});

describe('buildNonUniformDraftBinsFromSelection', () => {
  test('preserves exact coverage for the brushed selection', () => {
    const result = buildNonUniformDraftBinsFromSelection({
      crimeTypes: ['all-crime-types'],
      neighbourhood: null,
      timeWindow: {
        start: 2_500,
        end: 2_500 + DAY_MS + 30 * 60 * 1000,
      },
      granularity: 'daily',
      eventTimestamps: [10_000, DAY_MS + 15 * 60 * 1000],
    });

    expect(result.warning).toBeNull();
    expect(result.bins).toHaveLength(2);
    expect(result.bins[0]?.startTime).toBe(2_500);
    expect(result.bins[1]?.endTime).toBe(2_500 + DAY_MS + 30 * 60 * 1000);
    expect(result.bins.reduce((sum, bin) => sum + (bin.endTime - bin.startTime), 0)).toBe(DAY_MS + 30 * 60 * 1000);
  });

  test('filters burstiness calculations to the selected crime type', () => {
    const result = buildNonUniformDraftBinsFromSelection({
      crimeTypes: ['THEFT'],
      neighbourhood: null,
      timeWindow: {
        start: 0,
        end: 2 * HOUR_MS,
      },
      granularity: 'daily',
      eventTimestamps: [
        5 * 60 * 1000,
        25 * 60 * 1000,
        45 * 60 * 1000,
        65 * 60 * 1000,
      ],
      eventTypes: ['THEFT', 'ASSAULT', 'THEFT', 'ASSAULT'],
    });

    expect(result.warning).toBeNull();
    expect(result.eventCount).toBe(2);
    expect(result.bins).toHaveLength(1);
    expect(result.bins[0]?.crimeTypes).toEqual(['THEFT']);
    expect(result.bins[0]?.burstinessByType?.map((item) => item.type)).toEqual(['THEFT']);
  });

  test('returns a neutral partition when no bin stands out', () => {
    const result = buildNonUniformDraftBinsFromSelection({
      crimeTypes: [],
      neighbourhood: 'Central',
      timeWindow: {
        start: 0,
        end: 3 * HOUR_MS,
      },
      granularity: 'hourly',
      eventTimestamps: [15 * 60 * 1000, HOUR_MS + 15 * 60 * 1000, (2 * HOUR_MS) + 15 * 60 * 1000],
    });

    expect(result.bins).toHaveLength(3);
    expect(result.warning).toBeNull();
    expect(result.bins.every((bin) => bin.isNeutralPartition)).toBe(true);
    expect(result.bins.every((bin) => typeof bin.burstScore === 'number')).toBe(true);
    expect(result.bins.every((bin) => typeof bin.burstinessFormula === 'string')).toBe(true);
    expect(result.bins.every((bin) => typeof bin.burstinessCalculation === 'string')).toBe(true);
    expect(result.bins.every((bin) => (bin.warpWeight ?? 1) === 1)).toBe(true);
    expect(result.bins.every((bin) => bin.burstClass === 'neutral')).toBe(true);
  });

  test('expands the burstiest bin through warp metadata', () => {
    const result = buildNonUniformDraftBinsFromSelection({
      crimeTypes: ['burglary'],
      neighbourhood: null,
      timeWindow: {
        start: 0,
        end: 3 * HOUR_MS,
      },
      granularity: 'hourly',
      eventTimestamps: [
        1 * 60 * 1000,
        2 * 60 * 1000,
        3 * 60 * 1000,
        4 * 60 * 1000,
        5 * 60 * 1000,
        59 * 60 * 1000,
        70 * 60 * 1000,
        150 * 60 * 1000,
      ],
      eventTypes: ['BURGLARY', 'BURGLARY', 'BURGLARY', 'BURGLARY', 'BURGLARY', 'BURGLARY', 'BURGLARY', 'BURGLARY'],
    });

    expect(result.bins).toHaveLength(3);
    expect(result.bins.every((bin) => typeof bin.burstScore === 'number')).toBe(true);
    expect(result.bins.every((bin) => typeof bin.burstinessFormula === 'string')).toBe(true);
    expect(result.bins.every((bin) => typeof bin.burstinessCalculation === 'string')).toBe(true);
    const burstiestBin = result.bins.reduce((best, bin) => ((bin.warpWeight ?? 1) > (best.warpWeight ?? 1) ? bin : best), result.bins[0]!);
    expect(burstiestBin.burstClass).not.toBe('neutral');
    expect(burstiestBin.burstScore ?? 0).toBeGreaterThan(0);
    expect(burstiestBin.warpWeight ?? 1).toBeGreaterThan(result.bins[1]?.warpWeight ?? 1);
    expect(burstiestBin.warpWeight ?? 1).toBeGreaterThan(result.bins[2]?.warpWeight ?? 1);
  });

  test('uses explicit contiguous partitions instead of granularity partitions', () => {
    const partitions = [
      { startTime: 1_000, endTime: 2_000 },
      { startTime: 2_000, endTime: 5_000 },
      { startTime: 5_000, endTime: 10_000 },
    ];

    const result = buildNonUniformDraftBinsFromSelection({
      crimeTypes: ['all-crime-types'],
      neighbourhood: null,
      timeWindow: { start: 1_000, end: 10_000 },
      granularity: 'hourly',
      partitions,
      eventTimestamps: [1_250, 1_750, 2_500, 4_500, 6_000],
      eventTypes: ['THEFT', 'THEFT', 'BATTERY', 'BATTERY', 'ASSAULT'],
    });

    expect(result.warning).toBeNull();
    expect(result.eventCount).toBe(5);
    expect(result.bins.map(({ startTime, endTime }) => ({ startTime, endTime }))).toEqual(partitions);
    expect(result.bins.map((bin) => bin.count)).toEqual([2, 2, 1]);
    expect(result.bins.every((bin) => typeof bin.burstinessCoefficient === 'number')).toBe(true);
    expect(result.bins.every((bin) => typeof bin.burstScore === 'number')).toBe(true);
    expect(result.bins.every((bin) => typeof bin.warpWeight === 'number')).toBe(true);
  });
});
