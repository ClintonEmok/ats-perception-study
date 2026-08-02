import { describe, expect, test } from 'vitest';
import {
  activateComparisonSlot,
  enterComparison,
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
  test('enters with no active slot and asks the analyst to choose A or B', () => {
    const state = enterComparison();

    expect(state).toMatchObject({
      mode: 'selecting',
      activeSlot: null,
      a: null,
      b: null,
      linkedCameras: true,
      status: 'awaiting-slot',
    });
    expect(getComparisonMessage(state)).toBe('Choose comparison slot A or B');
  });

  test('activates A, assigns the exact payload, and advances to empty B', () => {
    const state = selectComparisonSlice(activateComparisonSlot(enterComparison(), 'A'), selection(2));

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

  test('supports B-first selection and then activates the other empty slot', () => {
    const state = selectComparisonSlice(activateComparisonSlot(enterComparison(), 'B'), selection(7));

    expect(state).toMatchObject({ mode: 'selecting', activeSlot: 'A', status: 'selecting-a' });
    expect(state.a).toBeNull();
    expect(state.b).toMatchObject({ index: 7, sourceSliceId: 'slice-7', sourceSliceIndex: 7 });
  });

  test('replaces only an occupied active slot while the pair is partial', () => {
    const withA = selectComparisonSlice(activateComparisonSlot(enterComparison(), 'A'), selection(1));
    const replaced = selectComparisonSlice(activateComparisonSlot(withA, 'A'), selection(4));

    expect(replaced.activeSlot).toBe('B');
    expect(replaced.a).toMatchObject({ index: 4, sourceSliceId: 'slice-4' });
    expect(replaced.b).toBeNull();
    expect(withA.a).toMatchObject({ index: 1, sourceSliceId: 'slice-1' });
  });

  test('rejects duplicate IDs or source indexes without mutating either reference', () => {
    const withA = selectComparisonSlice(activateComparisonSlot(enterComparison(), 'A'), selection(2, 'stable-id'));
    const duplicateId = selectComparisonSlice(withA, selection(8, 'stable-id'));
    const duplicateIndex = selectComparisonSlice(withA, { ...selection(2, null), sourceSliceIndex: 2 });

    expect(duplicateId).toEqual({ ...withA, status: 'duplicate-b' });
    expect(duplicateIndex).toEqual({ ...withA, status: 'duplicate-b' });
    expect(duplicateId.a).toEqual(withA.a);
    expect(duplicateId.b).toBeNull();
  });

  test('locks a completed pair with no active slot until reset', () => {
    const withA = selectComparisonSlice(activateComparisonSlot(enterComparison(), 'A'), selection(1));
    const completed = selectComparisonSlice(withA, selection(7));
    const ignored = selectComparisonSlice(completed, selection(4));

    expect(completed).toMatchObject({ mode: 'absolute', activeSlot: null, status: 'ready' });
    expect(completed.b).toMatchObject({ index: 7, sourceSliceIndex: 7 });
    expect(ignored).toBe(completed);
    expect(setComparisonMode(completed, 'difference')).toMatchObject({
      mode: 'difference',
      activeSlot: null,
      status: 'difference',
    });
  });

  test('supports reset, invalidation, exit, and preset-ready compatibility', () => {
    const completed = selectComparisonSlice(
      selectComparisonSlice(activateComparisonSlot(enterComparison(), 'A'), selection(0)),
      selection(9),
    );
    const presetReady = { ...completed, activeSlot: null as const };
    const reset = resetComparison();
    const invalidated = invalidateComparison();

    expect(presetReady).toMatchObject({ mode: 'absolute', activeSlot: null, a: completed.a, b: completed.b });
    expect(reset).toMatchObject({ mode: 'selecting', activeSlot: 'A', a: null, b: null, status: 'reset' });
    expect(invalidated).toMatchObject({ mode: 'selecting', activeSlot: 'A', a: null, b: null, status: 'invalidated' });
    expect(exitComparison()).toBeNull();
    expect(getComparisonMessage(reset)).toBe('Comparison reset. Select interval A.');
    expect(getComparisonMessage(invalidated)).toBe('The dataset changed. Select new A and B intervals.');
  });

  test('preserves source identity and interval metadata when IDs are absent', () => {
    const state = selectComparisonSlice(
      activateComparisonSlot(enterComparison(), 'A'),
      {
        ...selection(3, null),
        sourceSliceIndex: 11,
      },
    );

    expect(state.a).toMatchObject({
      index: 3,
      sourceSliceId: null,
      sourceSliceIndex: 11,
      startEpoch: 1_300,
      endEpoch: 1_399,
    });
  });
});
