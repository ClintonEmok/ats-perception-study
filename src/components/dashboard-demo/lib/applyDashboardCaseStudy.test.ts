import { describe, expect, it, vi } from 'vitest';
import {
  buildCaseStudySliceRanges,
  CASE_STUDY_PRESETS,
  CASE_STUDY_SLICE_COUNT,
} from '@/lib/demo/case-study-presets';
import { applyDashboardCaseStudy, type ApplyDashboardCaseStudyActions } from './applyDashboardCaseStudy';

const buildActions = (): ApplyDashboardCaseStudyActions => ({
  setFilterTimeRange: vi.fn(),
  setCoordinationTimeRange: vi.fn(),
  setBrushRange: vi.fn(),
  setDemoTimeRange: vi.fn(),
  setDemoTime: vi.fn(),
  setCoordinationTimeScaleMode: vi.fn(),
  setDemoTimeScaleMode: vi.fn(),
  setStkdeScopeMode: vi.fn(),
  clearPendingGeneratedBins: vi.fn(),
  replaceSlicesFromBins: vi.fn(),
  setActiveSliceIndex: vi.fn(),
  clearComparisonSlices: vi.fn(),
  setScreenshotReadyState: vi.fn(),
});

describe('applyDashboardCaseStudy', () => {
  it('synchronizes every dashboard time surface and replaces with ten epoch-ms bins', () => {
    const actions = buildActions();
    const preset = CASE_STUDY_PRESETS.find((entry) => entry.id === 'fourth-of-july')!;
    const result = applyDashboardCaseStudy({
      preset,
      minTimestampSec: 1_700_000_000,
      maxTimestampSec: 1_730_000_000,
      currentTime: 0,
      eventTimestamps: [
        preset.startEpoch * 1000 + 1_000,
        preset.startEpoch * 1000 + 2_000,
        preset.endEpoch * 1000 - 2_000,
      ],
      eventTypes: ['THEFT', 'THEFT', 'BATTERY'],
      actions,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.normalizedRange).toEqual([
      ((preset.startEpoch - 1_700_000_000) / 30_000_000) * 100,
      ((preset.endEpoch - 1_700_000_000) / 30_000_000) * 100,
    ]);
    expect(actions.setFilterTimeRange).toHaveBeenCalledWith([preset.startEpoch, preset.endEpoch]);
    expect(actions.setCoordinationTimeRange).toHaveBeenCalledWith(preset.startEpoch, preset.endEpoch);
    expect(actions.setBrushRange).toHaveBeenCalledWith(result.normalizedRange);
    expect(actions.setDemoTimeRange).toHaveBeenCalledWith(result.normalizedRange);
    expect(actions.setDemoTime).toHaveBeenCalledWith(result.normalizedRange[0]);
    expect(actions.setCoordinationTimeScaleMode).toHaveBeenCalledWith('adaptive');
    expect(actions.setDemoTimeScaleMode).toHaveBeenCalledWith('adaptive');
    expect(actions.setStkdeScopeMode).toHaveBeenCalledWith('applied-slices');
    expect(actions.clearPendingGeneratedBins).toHaveBeenCalledTimes(1);
    expect(actions.replaceSlicesFromBins).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'case-study-fourth-of-july-1',
          startTime: preset.startEpoch * 1000,
        }),
      ]),
      [preset.startEpoch * 1000, preset.endEpoch * 1000],
    );
    expect(result.bins).toHaveLength(CASE_STUDY_SLICE_COUNT);
    expect(result.bins.map(({ startTime, endTime }) => ({ startTime, endTime }))).toEqual(
      buildCaseStudySliceRanges(preset).map((range) => ({
        startTime: range.startEpoch * 1000,
        endTime: range.endEpoch * 1000,
      })),
    );
    expect(result.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
    expect(result.bins.every((bin) => typeof bin.burstinessCoefficient === 'number')).toBe(true);
    expect(result.bins.every((bin) => typeof bin.burstScore === 'number')).toBe(true);
    expect(result.bins.every((bin) => typeof bin.warpWeight === 'number')).toBe(true);
    expect(actions.setActiveSliceIndex).toHaveBeenCalledWith(0);
    expect(actions.clearComparisonSlices).toHaveBeenCalledTimes(1);
    expect(actions.setScreenshotReadyState).toHaveBeenCalledTimes(1);
  });

  it('keeps an in-range current time and still applies the full case-study contract', () => {
    const actions = buildActions();
    const preset = CASE_STUDY_PRESETS[0]!;

    const result = applyDashboardCaseStudy({
      preset,
      minTimestampSec: preset.startEpoch,
      maxTimestampSec: preset.endEpoch,
      currentTime: 50,
      actions,
    });

    expect(result.ok).toBe(true);
    expect(actions.setDemoTime).not.toHaveBeenCalled();
  });

  it('does not write any store when timeline bounds are unavailable', () => {
    const actions = buildActions();
    const result = applyDashboardCaseStudy({
      preset: CASE_STUDY_PRESETS[0]!,
      minTimestampSec: null,
      maxTimestampSec: 1_700_000_000,
      currentTime: 50,
      actions,
    });

    expect(result).toEqual({ ok: false, reason: 'no-data-bounds' });
    Object.values(actions).forEach((action) => expect(action).not.toHaveBeenCalled());
  });
});
