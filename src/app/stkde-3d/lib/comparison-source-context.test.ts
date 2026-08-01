import { describe, expect, test } from 'vitest';
import { resolveComparisonSourceContext } from './comparison-source-context';

const slices = [
  { index: 0, sourceSliceId: 'source-0', sourceSliceIndex: 0 },
  { index: 1, sourceSliceId: 'source-1', sourceSliceIndex: 1 },
  { index: 2, sourceSliceId: 'source-2', sourceSliceIndex: 2 },
];

describe('comparison source context', () => {
  test('resolves source groups while preserving the complete trajectory context', () => {
    const context = resolveComparisonSourceContext({
      selection: {
        index: 1,
        sourceSliceId: 'source-1',
        sourceSliceIndex: 1,
        startEpoch: 100,
        endEpoch: 200,
      },
      slices,
      sliceEvents: [['event-0'], ['event-1'], ['event-2']],
      sliceKdes: [['kde-0'], ['kde-1'], ['kde-2']],
      sliceResults: ['result-0', 'result-1', 'result-2'],
    });

    expect(context.sourceSliceIndex).toBe(1);
    expect(context.sourceSliceId).toBe('source-1');
    expect(context.selectedSlice).toEqual(slices[1]);
    expect(context.selectedEvents).toEqual(['event-1']);
    expect(context.selectedKde).toEqual(['kde-1']);
    expect(context.trajectorySlices).toBe(slices);
    expect(context.trajectoryResults).toEqual(['result-0', 'result-1', 'result-2']);
  });

  test('uses original source index when a focused local index is zero', () => {
    const focusedSlice = { index: 0, sourceSliceId: 'source-3', sourceSliceIndex: 3 };
    const context = resolveComparisonSourceContext({
      selection: {
        index: 0,
        sourceSliceId: 'source-3',
        sourceSliceIndex: 3,
        startEpoch: 300,
        endEpoch: 400,
      },
      slices: [focusedSlice],
      sliceEvents: [[], [], [], ['event-3']],
      sliceKdes: [[], [], [], ['kde-3']],
    });

    expect(context.sourceSliceIndex).toBe(3);
    expect(context.selectedSlice).toEqual(focusedSlice);
    expect(context.selectedEvents).toEqual(['event-3']);
    expect(context.selectedKde).toEqual(['kde-3']);
  });

  test('falls back deterministically to source index when the ID is missing', () => {
    const context = resolveComparisonSourceContext({
      selection: {
        index: 2,
        sourceSliceId: null,
        sourceSliceIndex: 2,
        startEpoch: 500,
        endEpoch: 600,
      },
      slices,
      sliceEvents: [[], [], ['event-2']],
      sliceKdes: [[], [], ['kde-2']],
    });

    expect(context.sourceSliceId).toBe('source-2');
    expect(context.selectedSlice).toEqual(slices[2]);
    expect(context.selectedEvents).toEqual(['event-2']);
    expect(context.selectedKde).toEqual(['kde-2']);
  });

  test('returns empty selected context without dropping full source arrays', () => {
    const context = resolveComparisonSourceContext({ selection: null, slices, sliceResults: ['result'] });

    expect(context.selectedSlice).toBeNull();
    expect(context.selectedEvents).toBeNull();
    expect(context.trajectorySlices).toBe(slices);
    expect(context.trajectoryResults).toEqual(['result']);
  });
});
