import {
  buildCaseStudySliceRanges,
  caseStudyToNormalizedRange,
  CASE_STUDY_SLICE_COUNT,
  type CaseStudyPreset,
} from '@/lib/demo/case-study-presets';
import {
  buildNonUniformDraftBinsFromSelection,
  partitionSelectionByGranularity,
} from './demo-burst-generation';
import type { TimeBin } from '@/lib/binning/types';
import type { GenerationInputs, GenerationResultMetadata } from '@/store/useDashboardDemoTimeslicingModeStore';

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
  setPendingGeneratedBins: (
    bins: TimeBin[],
    metadata: Omit<GenerationResultMetadata, 'generatedAt'>,
  ) => void;
  applyGeneratedBins: (domain: [number, number], options?: { preserveWarpWeight?: boolean }) => boolean;
  setActiveSliceIndex: (index: number) => void;
  clearComparisonSlices: () => void;
  setScreenshotReadyState: () => void;
}

export interface ApplyDashboardCaseStudyParams {
  preset: CaseStudyPreset;
  minTimestampSec: number | null;
  maxTimestampSec: number | null;
  currentTime: number;
  eventTimestamps?: number[];
  eventTypes?: string[];
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

function buildCaseStudyBins(
  preset: CaseStudyPreset,
  eventTimestamps: number[] = [],
  eventTypes: string[] = [],
): TimeBin[] {
  const epochRange: [number, number] = [preset.startEpoch * 1000, preset.endEpoch * 1000];
  const partitions = preset.partitionMode === 'fixed'
    ? buildCaseStudySliceRanges(preset, CASE_STUDY_SLICE_COUNT).map((range) => ({
      startTime: range.startEpoch * 1000,
      endTime: range.endEpoch * 1000,
    }))
    : partitionSelectionByGranularity(epochRange, preset.granularity);
  const generated = buildNonUniformDraftBinsFromSelection({
    crimeTypes: ['all-crime-types'],
    neighbourhood: null,
    timeWindow: {
      start: epochRange[0],
      end: epochRange[1],
    },
    granularity: preset.granularity,
    partitions,
    eventTimestamps,
    eventTypes,
  });

  return generated.bins.map((bin, index) => ({
    ...bin,
    id: `case-study-${preset.id}-${index + 1}`,
    districts: bin.districts ?? [],
    isModified: false,
  }));
}

const buildCaseStudyGenerationInputsForPreset = (preset: CaseStudyPreset): GenerationInputs => ({
  crimeTypes: ['all-crime-types'],
  neighbourhood: null,
  timeWindow: {
    start: null,
    end: null,
  },
  granularity: preset.granularity,
});

export function applyDashboardCaseStudy({
  preset,
  minTimestampSec,
  maxTimestampSec,
  currentTime,
  eventTimestamps,
  eventTypes,
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
  const bins = buildCaseStudyBins(preset, eventTimestamps, eventTypes);
  if (!normalizedRange) return { ok: false, reason: 'no-data-bounds' };
  if (bins.length === 0) return { ok: false, reason: 'invalid-preset' };

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
  actions.setPendingGeneratedBins(
    bins,
    {
      binCount: bins.length,
      eventCount: bins.reduce((sum, bin) => sum + bin.count, 0),
      warning: null,
      inputs: buildCaseStudyGenerationInputsForPreset(preset),
    },
  );
  actions.applyGeneratedBins([epochRange[0] * 1000, epochRange[1] * 1000], { preserveWarpWeight: true });
  actions.setActiveSliceIndex(0);
  actions.clearComparisonSlices();
  actions.setScreenshotReadyState();

  return { ok: true, epochRange, normalizedRange, bins };
}

export { buildCaseStudyBins };
