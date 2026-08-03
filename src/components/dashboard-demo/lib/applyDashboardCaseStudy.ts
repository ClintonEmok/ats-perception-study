import {
  buildCaseStudySliceRanges,
  caseStudyToNormalizedRange,
  CASE_STUDY_SLICE_COUNT,
  type CaseStudyPreset,
} from '@/lib/demo/case-study-presets';
import type { TimeBin } from '@/lib/binning/types';

export interface ApplyDashboardCaseStudyActions {
  setFilterTimeRange: (range: [number, number]) => void;
  setCoordinationTimeRange: (startEpoch: number, endEpoch: number) => void;
  setBrushRange: (range: [number, number]) => void;
  setDemoTimeRange: (range: [number, number]) => void;
  setDemoTime: (time: number) => void;
  setCoordinationTimeScaleMode: (mode: CaseStudyPreset['screenshotMode']) => void;
  setDemoTimeScaleMode: (mode: CaseStudyPreset['screenshotMode']) => void;
  setStkdeScopeMode: (mode: 'applied-slices') => void;
  clearPendingGeneratedBins: () => void;
  replaceSlicesFromBins: (bins: TimeBin[], domain: [number, number]) => void;
  setActiveSliceIndex: (index: number) => void;
  clearComparisonSlices: () => void;
  setScreenshotReadyState: () => void;
}

export interface ApplyDashboardCaseStudyParams {
  preset: CaseStudyPreset;
  minTimestampSec: number | null;
  maxTimestampSec: number | null;
  currentTime: number;
  actions: ApplyDashboardCaseStudyActions;
}

export type ApplyDashboardCaseStudyResult =
  | {
      ok: true;
      epochRange: [number, number];
      normalizedRange: [number, number];
      bins: TimeBin[];
    }
  | { ok: false; reason: 'no-data-bounds' | 'invalid-preset' };

function buildCaseStudyBins(preset: CaseStudyPreset): TimeBin[] {
  return buildCaseStudySliceRanges(preset, CASE_STUDY_SLICE_COUNT).map((range, index) => ({
    id: `case-study-${preset.id}-${index + 1}`,
    startTime: range.startEpoch * 1000,
    endTime: range.endEpoch * 1000,
    count: 0,
    crimeTypes: ['all-crime-types'],
    districts: [],
    avgTimestamp: ((range.startEpoch + range.endEpoch) / 2) * 1000,
    isModified: false,
  }));
}

export function applyDashboardCaseStudy({
  preset,
  minTimestampSec,
  maxTimestampSec,
  currentTime,
  actions,
}: ApplyDashboardCaseStudyParams): ApplyDashboardCaseStudyResult {
  const epochRange: [number, number] = [preset.startEpoch, preset.endEpoch];
  if (
    !Number.isFinite(epochRange[0])
    || !Number.isFinite(epochRange[1])
    || epochRange[1] <= epochRange[0]
  ) {
    return { ok: false, reason: 'invalid-preset' };
  }

  const normalizedRange = caseStudyToNormalizedRange(preset, minTimestampSec, maxTimestampSec);
  const bins = buildCaseStudyBins(preset);
  if (!normalizedRange) return { ok: false, reason: 'no-data-bounds' };
  if (bins.length !== CASE_STUDY_SLICE_COUNT) return { ok: false, reason: 'invalid-preset' };

  actions.setFilterTimeRange(epochRange);
  actions.setCoordinationTimeRange(epochRange[0], epochRange[1]);
  actions.setBrushRange(normalizedRange);
  actions.setDemoTimeRange(normalizedRange);

  const clampedCurrentTime = Math.max(normalizedRange[0], Math.min(normalizedRange[1], currentTime));
  if (clampedCurrentTime !== currentTime) actions.setDemoTime(clampedCurrentTime);

  actions.setCoordinationTimeScaleMode(preset.screenshotMode);
  actions.setDemoTimeScaleMode(preset.screenshotMode);
  actions.setStkdeScopeMode('applied-slices');
  actions.clearPendingGeneratedBins();
  actions.replaceSlicesFromBins(bins, [epochRange[0] * 1000, epochRange[1] * 1000]);
  actions.setActiveSliceIndex(0);
  actions.clearComparisonSlices();
  actions.setScreenshotReadyState();

  return { ok: true, epochRange, normalizedRange, bins };
}

export { buildCaseStudyBins };
