import { describe, expect, test } from 'vitest';
import {
  COMPARISON_PRESETS,
  ComparisonPresetResolutionError,
  resolveComparisonPreset,
} from './comparison-presets';
import { buildComparisonSliceFixture } from './comparison-fixtures';

describe('comparison preset catalog', () => {
  test('ships exactly the two concrete exact-index built-ins', () => {
    expect(COMPARISON_PRESETS.map((preset) => preset.id)).toEqual([
      'full-slice-02-vs-08',
      'fourth-of-july-slice-03-vs-09',
    ]);
    expect(COMPARISON_PRESETS.map((preset) => preset.datasetPresetId)).toEqual([
      'full',
      'fourth-of-july',
    ]);
    expect(COMPARISON_PRESETS.map((preset) => [preset.intervalA.sliceIndex, preset.intervalB.sliceIndex])).toEqual([
      [1, 7],
      [2, 8],
    ]);
    expect(COMPARISON_PRESETS.map((preset) => [preset.intervalA.label, preset.intervalB.label])).toEqual([
      ['Slice 2', 'Slice 8'],
      ['Slice 3', 'Slice 9'],
    ]);
    expect(new Set(COMPARISON_PRESETS.map((preset) => preset.label)).size).toBe(2);
    for (const preset of COMPARISON_PRESETS) {
      expect(preset.intervalA).not.toHaveProperty('startEpoch');
      expect(preset.intervalB).not.toHaveProperty('endEpoch');
      expect(preset.parameters.kde.gridSize).toBe(48);
      expect(preset.parameters.adaptiveTime).toBe(true);
      expect(preset.parameters.renderer).toBe('field');
      expect(preset.camera).toBe('front-oblique');
    }
  });

  test('supports deterministic zero, one, two, and ten-slice fixtures', () => {
    expect(buildComparisonSliceFixture(0)).toHaveLength(0);
    expect(buildComparisonSliceFixture(1)).toHaveLength(1);
    expect(buildComparisonSliceFixture(2)).toHaveLength(2);
    expect(buildComparisonSliceFixture(10)).toHaveLength(10);
  });

  test('resolves actual fixture epochs and source identities for every built-in', () => {
    const fixture = buildComparisonSliceFixture(10);
    const full = resolveComparisonPreset(COMPARISON_PRESETS[0]!, 'full', fixture);
    const fourth = resolveComparisonPreset(COMPARISON_PRESETS[1]!, 'fourth-of-july', fixture);

    expect([full.selectionA.startEpoch, full.selectionA.endEpoch]).toEqual([
      fixture[1]!.startEpoch,
      fixture[1]!.endEpoch,
    ]);
    expect([full.selectionB.startEpoch, full.selectionB.endEpoch]).toEqual([
      fixture[7]!.startEpoch,
      fixture[7]!.endEpoch,
    ]);
    expect(full.selectionA.sourceSliceId).toBe(fixture[1]!.sourceSliceId);
    expect(full.selectionB.sourceSliceId).toBe(fixture[7]!.sourceSliceId);
    expect(fourth.preset.view).toBe('difference');
    expect(fourth.preset.layer).toBe('heatmap-with-trajectories');
    expect(fourth.preset.intervalA.startEpoch).toBe(fixture[2]!.startEpoch);
    expect(fourth.preset.intervalB.endEpoch).toBe(fixture[8]!.endEpoch);

    const changedFixture = buildComparisonSliceFixture(10);
    changedFixture[1]!.startEpoch += 123;
    changedFixture[1]!.endEpoch += 123;
    const changed = resolveComparisonPreset(COMPARISON_PRESETS[0]!, 'full', changedFixture);
    expect(changed.selectionA.startEpoch).toBe(changedFixture[1]!.startEpoch);
    expect(changed.selectionA.startEpoch).not.toBe(full.selectionA.startEpoch);
  });

  test('rejects dataset, index, label, duplicate, and source identity mismatches', () => {
    const fixture = buildComparisonSliceFixture(10);
    const preset = COMPARISON_PRESETS[0]!;

    expect(() => resolveComparisonPreset(preset, 'fourth-of-july', fixture)).toThrow(ComparisonPresetResolutionError);
    expect(() => resolveComparisonPreset(preset, 'full', buildComparisonSliceFixture(2))).toThrow(/index/);
    expect(() => resolveComparisonPreset({
      ...preset,
      intervalA: { ...preset.intervalA, label: 'Wrong label' },
    }, 'full', fixture)).toThrow(/rendered A interval/);
    expect(() => resolveComparisonPreset({
      ...preset,
      intervalB: { ...preset.intervalB, sliceIndex: 1 },
    }, 'full', fixture)).toThrow(/distinct/);
    expect(() => resolveComparisonPreset(preset, 'full', fixture.map((slice, index) => (
      index === 1 ? { ...slice, sourceSliceId: undefined } : slice
    )))).toThrow(/source identity/);
    expect(() => resolveComparisonPreset(preset, 'full', fixture.map((slice, index) => (
      index === 7 ? { ...slice, sourceSliceIndex: 1 } : slice
    )))).toThrow(/source identity/);
  });
});
