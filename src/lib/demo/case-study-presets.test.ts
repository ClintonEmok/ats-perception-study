import { describe, expect, it } from 'vitest';
import {
  CASE_STUDY_PRESETS,
  CASE_STUDY_SLICE_COUNT,
  buildCaseStudySliceRanges,
  caseStudyToNormalizedRange,
  toUtcEpoch,
} from './case-study-presets';

describe('case-study presets', () => {
  it('keeps the four canonical IDs, labels, limits, and adaptive screenshot mode', () => {
    expect(CASE_STUDY_PRESETS.map((preset) => preset.id)).toEqual([
      'full',
      'fourth-of-july',
      'fourth-of-july-hourly',
      'spring-break',
      'spring-break-hourly',
      'new-years',
      'new-years-hourly',
    ]);
    expect(CASE_STUDY_PRESETS.every((preset) => preset.screenshotMode === 'adaptive')).toBe(true);
    expect(CASE_STUDY_PRESETS.map((preset) => preset.limit)).toEqual([1200, 5000, 5000, 5000, 5000, 5000, 5000]);
    expect(CASE_STUDY_PRESETS.map((preset) => preset.rangeLabel)).toEqual([
      '2001–2025 · sampled overview',
      'Jun 30–Jul 7, 2024',
      'Jun 30–Jul 7, 2024 · hourly',
      'Mar 25–Apr 1, 2024',
      'Mar 25–Apr 1, 2024 · hourly',
      'Dec 28, 2023–Jan 4, 2024',
      'Dec 28, 2023–Jan 4, 2024 · hourly',
    ]);
    expect(CASE_STUDY_PRESETS.filter((preset) => preset.partitionMode === 'granular').every((preset) => preset.granularity === 'hourly')).toBe(true);
  });

  it('converts the known UTC boundaries without local timezone drift', () => {
    expect(toUtcEpoch('2024-06-30')).toBe(1719705600);
    expect(toUtcEpoch('2024-07-07', true)).toBe(1720396799);
    expect(toUtcEpoch('2023-12-28')).toBe(1703721600);
    expect(toUtcEpoch('2024-01-04', true)).toBe(1704412799);
  });

  it('converts a preset to normalized dashboard time', () => {
    const preset = CASE_STUDY_PRESETS.find((entry) => entry.id === 'fourth-of-july')!;
    expect(caseStudyToNormalizedRange(preset, preset.startEpoch, preset.endEpoch)).toEqual([0, 100]);
    expect(caseStudyToNormalizedRange(preset, null, preset.endEpoch)).toBeNull();
  });

  it('builds ten chronological contiguous ranges with exact coverage', () => {
    const preset = CASE_STUDY_PRESETS.find((entry) => entry.id === 'spring-break')!;
    const ranges = buildCaseStudySliceRanges(preset);

    expect(ranges).toHaveLength(CASE_STUDY_SLICE_COUNT);
    expect(ranges[0]?.startEpoch).toBe(preset.startEpoch);
    expect(ranges.at(-1)?.endEpoch).toBe(preset.endEpoch);
    expect(ranges.every((range) => range.endEpoch > range.startEpoch)).toBe(true);
    expect(ranges.slice(1).every((range, index) => range.startEpoch === ranges[index]?.endEpoch)).toBe(true);
    expect(buildCaseStudySliceRanges(preset)).toEqual(ranges);
  });

  it('returns no ranges for invalid or non-positive counts', () => {
    const preset = CASE_STUDY_PRESETS[0]!;
    expect(buildCaseStudySliceRanges(preset, 0)).toEqual([]);
    expect(buildCaseStudySliceRanges(preset, -2)).toEqual([]);
    expect(buildCaseStudySliceRanges(preset, Number.NaN)).toEqual([]);
  });
});
