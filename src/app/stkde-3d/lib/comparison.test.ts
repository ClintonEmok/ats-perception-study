import { describe, expect, test } from 'vitest';
import {
  createInitialComparisonState,
  exitComparison,
  getComparisonMessage,
  invalidateComparison,
  resetComparison,
  selectComparisonSlice,
  setComparisonMode,
  type ComparisonSelectionInput,
} from './comparison';

const selection = (index: number, sourceSliceId: string | null = `slice-${index}`): ComparisonSelectionInput => ({
  index,
  sourceSliceId,
  startEpoch: 1_000 + index * 100,
  endEpoch: 1_099 + index * 100,
  label: `Interval ${index + 1}`,
  eventCount: index + 10,
});

describe('temporary STKDE comparison state', () => {
  test('starts in A selection with no references and linked cameras', () => {
    const state = createInitialComparisonState();

    expect(state).toMatchObject({
      mode: 'selecting',
      activeSlot: 'A',
      a: null,
      b: null,
      linkedCameras: true,
      status: 'selecting-a',
    });
    expect(getComparisonMessage(state)).toBe('Select interval A');
  });

  test('assigns A and automatically advances to B', () => {
    const state = selectComparisonSlice(createInitialComparisonState(), selection(2));

    expect(state.mode).toBe('selecting');
    expect(state.activeSlot).toBe('B');
    expect(state.a).toMatchObject({
      index: 2,
      sourceSliceId: 'slice-2',
      sourceSliceIndex: 2,
      startEpoch: 1_200,
      endEpoch: 1_299,
      label: 'Interval 3',
      eventCount: 12,
    });
    expect(state.b).toBeNull();
    expect(getComparisonMessage(state)).toBe('Select interval B');
  });

  test('rejects duplicate IDs and duplicate source indexes without clearing A', () => {
    const withA = selectComparisonSlice(createInitialComparisonState(), selection(2, 'stable-id'));
    const duplicateId = selectComparisonSlice(withA, selection(8, 'stable-id'));
    const duplicateIndex = selectComparisonSlice(withA, { ...selection(2, null), sourceSliceIndex: 2 });

    expect(duplicateId).toEqual({ ...withA, status: 'duplicate-b' });
    expect(duplicateIndex).toEqual({ ...withA, status: 'duplicate-b' });
    expect(duplicateId.a).toEqual(withA.a);
    expect(duplicateId.b).toBeNull();
  });

  test('locks a completed pair until Reset comparison', () => {
    const withA = selectComparisonSlice(createInitialComparisonState(), selection(1));
    const completed = selectComparisonSlice(withA, selection(7));
    const ignored = selectComparisonSlice(completed, selection(4));

    expect(completed).toMatchObject({ mode: 'absolute', activeSlot: 'B', status: 'ready' });
    expect(completed.b).toMatchObject({ index: 7, sourceSliceIndex: 7 });
    expect(ignored).toBe(completed);
  });

  test('supports reset, invalidation, exit, and explicit difference mode', () => {
    const completed = selectComparisonSlice(
      selectComparisonSlice(createInitialComparisonState(), selection(0)),
      selection(9),
    );
    const difference = setComparisonMode(completed, 'difference');
    const reset = resetComparison();
    const invalidated = invalidateComparison();

    expect(difference).toMatchObject({ mode: 'difference', a: completed.a, b: completed.b, status: 'difference' });
    expect(reset).toMatchObject({ mode: 'selecting', activeSlot: 'A', a: null, b: null, status: 'reset' });
    expect(invalidated).toMatchObject({ mode: 'selecting', activeSlot: 'A', a: null, b: null, status: 'invalidated' });
    expect(exitComparison()).toBeNull();
    expect(getComparisonMessage(reset)).toBe('Comparison reset. Select interval A.');
  });

  test('preserves source identity and interval metadata when IDs are absent', () => {
    const state = selectComparisonSlice(createInitialComparisonState(), {
      ...selection(3, null),
      sourceSliceIndex: 11,
    });

    expect(state.a).toMatchObject({
      index: 3,
      sourceSliceId: null,
      sourceSliceIndex: 11,
      startEpoch: 1_300,
      endEpoch: 1_399,
    });
  });
});
