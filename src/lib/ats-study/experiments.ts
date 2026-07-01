export interface ABWindowSpec {
  windowIndex: number;
  windowKey: string;
  windowDays: number;
  rank: number;
}

export interface ExperimentConfig {
  slug: string;
  title: string;
  description: string;
  windows: readonly ABWindowSpec[];
  totalTrials: 12;
}

export const ATS_PERCEPTION_SLUG = "ats-perception-v5";
export const ATS_PERCEPTION_V4_SLUG = "ats-perception-v4";

const ATS_PERCEPTION_V5_WINDOW_DAYS = [1, 14, 30, 90] as const;
const ATS_PERCEPTION_V5_WINDOW_KEYS: ReadonlyArray<readonly [number, number]> = ATS_PERCEPTION_V5_WINDOW_DAYS.flatMap(
  (windowDays) => Array.from({ length: 10 }, (_, index) => [windowDays, index + 1] as const),
);

const ATS_PERCEPTION_V5_WINDOWS: readonly ABWindowSpec[] = ATS_PERCEPTION_V5_WINDOW_KEYS.map(
  ([windowDays, rank], windowIndex) => ({
    windowIndex,
    windowKey: `${windowDays},${rank}`,
    windowDays,
    rank,
  }),
);

const EXPERIMENTS: readonly ExperimentConfig[] = [
  {
    slug: ATS_PERCEPTION_SLUG,
    title: "ATS Perception Study v5",
    description:
      "Compare 40 candidate windows of crime data via side-by-side A/B comparison of two time allocations. Each participant sees a balanced 12-window subset under 3 task types (peak, comparison, pattern).",
    windows: ATS_PERCEPTION_V5_WINDOWS,
    totalTrials: 12,
  },
];

const EXPERIMENTS_BY_SLUG: ReadonlyMap<string, ExperimentConfig> = new Map(
  EXPERIMENTS.map((config) => [config.slug, config]),
);

export function listExperiments(): readonly ExperimentConfig[] {
  return EXPERIMENTS;
}

export function isValidExperimentSlug(slug: string): boolean {
  return EXPERIMENTS_BY_SLUG.has(slug);
}

export function getExperiment(slug: string): ExperimentConfig | null {
  return EXPERIMENTS_BY_SLUG.get(slug) ?? null;
}

export function requireExperiment(slug: string): ExperimentConfig {
  const found = EXPERIMENTS_BY_SLUG.get(slug);
  if (!found) {
    throw new Error(`Unknown experiment slug: ${slug}`);
  }
  return found;
}
