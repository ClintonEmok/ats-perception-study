export type CaseStudyPresetId = 'full' | 'fourth-of-july' | 'spring-break' | 'new-years';
export type CaseStudyScreenshotMode = 'adaptive';

export interface CaseStudyPreset {
  id: CaseStudyPresetId;
  label: string;
  rangeLabel: string;
  startEpoch: number;
  endEpoch: number;
  limit: number;
  screenshotMode: CaseStudyScreenshotMode;
}

export interface CaseStudySliceRange {
  startEpoch: number;
  endEpoch: number;
}

export const CASE_STUDY_SLICE_COUNT = 10;

export const toUtcEpoch = (date: string, endOfDay = false): number => Math.floor(
  Date.parse(`${date}T${endOfDay ? '23:59:59' : '00:00:00'}Z`) / 1000,
);

export const CASE_STUDY_PRESETS: readonly CaseStudyPreset[] = [
  {
    id: 'full',
    label: 'Full data range',
    rangeLabel: '2001–2025 · sampled overview',
    startEpoch: 978307200,
    endEpoch: 1767225599,
    limit: 1200,
    screenshotMode: 'adaptive',
  },
  {
    id: 'fourth-of-july',
    label: 'Fourth of July',
    rangeLabel: 'Jun 30–Jul 7, 2024',
    startEpoch: toUtcEpoch('2024-06-30'),
    endEpoch: toUtcEpoch('2024-07-07', true),
    limit: 5000,
    screenshotMode: 'adaptive',
  },
  {
    id: 'spring-break',
    label: 'Spring Break',
    rangeLabel: 'Mar 25–Apr 1, 2024',
    startEpoch: toUtcEpoch('2024-03-25'),
    endEpoch: toUtcEpoch('2024-04-01', true),
    limit: 5000,
    screenshotMode: 'adaptive',
  },
  {
    id: 'new-years',
    label: "New Year's",
    rangeLabel: 'Dec 28, 2023–Jan 4, 2024',
    startEpoch: toUtcEpoch('2023-12-28'),
    endEpoch: toUtcEpoch('2024-01-04', true),
    limit: 5000,
    screenshotMode: 'adaptive',
  },
] as const;

export const CASE_STUDY_PRESETS_BY_ID: Readonly<Record<CaseStudyPresetId, CaseStudyPreset>> =
  Object.fromEntries(CASE_STUDY_PRESETS.map((preset) => [preset.id, preset])) as Record<CaseStudyPresetId, CaseStudyPreset>;

export function getCaseStudyPreset(id: string): CaseStudyPreset | undefined {
  return CASE_STUDY_PRESETS.find((preset) => preset.id === id);
}

/** Convert a case-study's epoch range into the dashboard's normalized 0–100 space. */
export function caseStudyToNormalizedRange(
  preset: CaseStudyPreset,
  domainStartEpoch: number | null,
  domainEndEpoch: number | null,
): [number, number] | null {
  if (
    domainStartEpoch === null
    || domainEndEpoch === null
    || !Number.isFinite(domainStartEpoch)
    || !Number.isFinite(domainEndEpoch)
    || domainEndEpoch <= domainStartEpoch
    || !Number.isFinite(preset.startEpoch)
    || !Number.isFinite(preset.endEpoch)
    || preset.endEpoch <= preset.startEpoch
  ) {
    return null;
  }

  const span = domainEndEpoch - domainStartEpoch;
  const normalize = (epoch: number) => Math.min(100, Math.max(0, ((epoch - domainStartEpoch) / span) * 100));
  return [normalize(preset.startEpoch), normalize(preset.endEpoch)];
}

export const caseStudyPresetToNormalizedRange = caseStudyToNormalizedRange;

/**
 * Build stable, contiguous epoch ranges for applied dashboard slices. The
 * first and last boundaries always remain the preset's authoritative bounds.
 */
export function buildCaseStudySliceRanges(
  preset: CaseStudyPreset,
  count = CASE_STUDY_SLICE_COUNT,
): CaseStudySliceRange[] {
  if (
    !Number.isFinite(count)
    || count <= 0
    || !Number.isFinite(preset.startEpoch)
    || !Number.isFinite(preset.endEpoch)
    || preset.endEpoch <= preset.startEpoch
  ) {
    return [];
  }

  const sliceCount = Math.floor(count);
  if (sliceCount <= 0) return [];

  const span = preset.endEpoch - preset.startEpoch;
  return Array.from({ length: sliceCount }, (_, index) => ({
    startEpoch: index === 0
      ? preset.startEpoch
      : Math.floor(preset.startEpoch + (span * index) / sliceCount),
    endEpoch: index === sliceCount - 1
      ? preset.endEpoch
      : Math.floor(preset.startEpoch + (span * (index + 1)) / sliceCount),
  }));
}
