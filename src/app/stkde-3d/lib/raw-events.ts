import type { MockCrimeEvent } from './types';

export const RAW_EVENT_Y_OFFSET = 0.15;

export function resolveRawEventY(
  event: MockCrimeEvent,
  resolveEpochY: (epochSec: number) => number,
  fallbackSliceY: number,
): number {
  // The fallback keeps old serialized scene data renderable while every current
  // conversion path supplies timestampEpochSec in epoch seconds.
  const eventY = Number.isFinite(event.timestampEpochSec)
    ? resolveEpochY(event.timestampEpochSec)
    : fallbackSliceY;
  return eventY + RAW_EVENT_Y_OFFSET;
}

export function buildRawEventPositions(
  events: readonly MockCrimeEvent[],
  resolveEpochY: (epochSec: number) => number,
  fallbackSliceY: number,
): Float32Array {
  const flattened = new Float32Array(events.length * 3);

  events.forEach((event, index) => {
    const cursor = index * 3;
    flattened[cursor] = event.x;
    flattened[cursor + 1] = resolveRawEventY(event, resolveEpochY, fallbackSliceY);
    flattened[cursor + 2] = event.z;
  });

  return flattened;
}

export function resolveSourceEvents<TEvent>(
  sourceSliceIndex: number | undefined,
  selectedEvents: readonly TEvent[] | null | undefined,
  sliceEvents: readonly (readonly TEvent[])[],
  renderedSliceIndex: number,
): readonly TEvent[] {
  if (selectedEvents) return selectedEvents;

  if (typeof sourceSliceIndex === 'number' && sliceEvents[sourceSliceIndex]) {
    return sliceEvents[sourceSliceIndex]!;
  }

  return sliceEvents[renderedSliceIndex] ?? [];
}
