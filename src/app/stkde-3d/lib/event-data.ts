import type { CrimeRecord } from '@/types/crime';
import type { MockCrimeEvent } from './types';

type CrimeRecordEventFields = Pick<CrimeRecord, 'x' | 'z' | 'type' | 'timestamp'>;

export function toMockCrimeEvent(record: CrimeRecordEventFields): MockCrimeEvent {
  return {
    x: record.x,
    z: record.z,
    type: record.type,
    timestampEpochSec: record.timestamp,
  };
}

export function toMockCrimeEvents(records: readonly CrimeRecordEventFields[]): MockCrimeEvent[] {
  return records.map(toMockCrimeEvent);
}

export function filterMockCrimeEventsByDomain(
  events: readonly MockCrimeEvent[],
  domain: readonly [number, number],
): MockCrimeEvent[] {
  const [start, end] = domain;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }

  return events.filter((event) => (
    Number.isFinite(event.timestampEpochSec)
    && event.timestampEpochSec >= start
    && event.timestampEpochSec <= end
  ));
}

export function buildMockCrimeEventsBySourceSliceId(
  slices: readonly { sourceSliceId: string }[],
  eventsByPosition: readonly (readonly MockCrimeEvent[])[],
): Record<string, MockCrimeEvent[]> {
  return Object.fromEntries(
    slices.map((slice, index) => [slice.sourceSliceId, [...(eventsByPosition[index] ?? [])]]),
  );
}

export function alignMockCrimeEventsToSlices(
  slices: readonly { index: number; sourceSliceId?: string }[],
  eventsBySourceSliceId: Readonly<Record<string, readonly MockCrimeEvent[]>> = {},
  positionalEvents: readonly (readonly MockCrimeEvent[])[] = [],
): MockCrimeEvent[][] {
  return slices.map((slice, renderIndex) => {
    const sourceEvents = slice.sourceSliceId
      ? eventsBySourceSliceId[slice.sourceSliceId]
      : undefined;
    const events = sourceEvents ?? positionalEvents[slice.index] ?? positionalEvents[renderIndex] ?? [];
    return [...events];
  });
}
