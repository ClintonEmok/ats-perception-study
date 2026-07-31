import { describe, expect, it } from 'vitest';
import { generateStkde3dMockData, generateStkde3dRealData } from './mock-data';
import {
  alignMockCrimeEventsToSlices,
  buildMockCrimeEventsBySourceSliceId,
  filterMockCrimeEventsByDomain,
  toMockCrimeEvent,
} from './event-data';
import type { CrimeRecord } from '@/types/crime';

const buildCrimeRecord = (timestamp: number, index: number): CrimeRecord => ({
  id: `crime-${index}`,
  timestamp,
  lat: 41.88,
  lon: -87.63,
  x: index,
  z: -index,
  type: 'THEFT',
  district: '1',
  year: 2024,
  iucr: '0820',
});

describe('STKDE 3D event data', () => {
  it('preserves CrimeRecord timestamps as epoch seconds in real conversion', () => {
    const record = buildCrimeRecord(1_700_000_123, 0);

    expect(toMockCrimeEvent(record)).toMatchObject({
      x: 0,
      type: 'THEFT',
      timestampEpochSec: 1_700_000_123,
    });
    expect(Math.abs(toMockCrimeEvent(record).z)).toBe(0);

    const records = Array.from({ length: 10 }, (_, index) => buildCrimeRecord(1_700_000_000 + index, index));
    const converted = generateStkde3dRealData(records).sliceEvents.flat();
    expect(converted.map((event) => event.timestampEpochSec)).toEqual(records.map((item) => item.timestamp));
  });

  it('gives generated mock events deterministic in-slice epoch timestamps', () => {
    const first = generateStkde3dMockData();
    const second = generateStkde3dMockData();

    expect(first.sliceEvents.map((events) => events.map((event) => event.timestampEpochSec)))
      .toEqual(second.sliceEvents.map((events) => events.map((event) => event.timestampEpochSec)));
    first.sliceEvents.forEach((events, index) => {
      const slice = first.slices[index]!;
      expect(events.every((event) => event.timestampEpochSec >= slice.startEpoch && event.timestampEpochSec < slice.endEpoch)).toBe(true);
    });
  });

  it('aligns brushed event groups by source slice ID instead of reindexed position', () => {
    const slices = [
      { sourceSliceId: 'slice-a' },
      { sourceSliceId: 'slice-b' },
      { sourceSliceId: 'slice-c' },
    ];
    const events = [
      [{ x: 1, z: 1, type: 'A', timestampEpochSec: 10 }],
      [{ x: 2, z: 2, type: 'B', timestampEpochSec: 20 }],
      [{ x: 3, z: 3, type: 'C', timestampEpochSec: 30 }],
    ];
    const groups = buildMockCrimeEventsBySourceSliceId(slices, events);
    const brushedSlices = [slices[1]!, slices[2]!].map((slice, index) => ({ ...slice, index }));

    expect(alignMockCrimeEventsToSlices(brushedSlices, groups).map((group) => group[0]?.type))
      .toEqual(['B', 'C']);
  });

  it('filters dashboard event groups to the active cube time domain', () => {
    const events = [
      { x: 0, z: 0, type: 'before', timestampEpochSec: 9 },
      { x: 1, z: 1, type: 'start', timestampEpochSec: 10 },
      { x: 2, z: 2, type: 'inside', timestampEpochSec: 15 },
      { x: 3, z: 3, type: 'end', timestampEpochSec: 20 },
      { x: 4, z: 4, type: 'after', timestampEpochSec: 21 },
    ];

    expect(filterMockCrimeEventsByDomain(events, [10, 20]).map((event) => event.type))
      .toEqual(['start', 'inside', 'end']);
  });
});
