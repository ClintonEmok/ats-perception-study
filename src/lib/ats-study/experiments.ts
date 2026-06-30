import type { Condition, TaskType } from "./protocol";

export interface ExperimentTrialSpec {
  trialIndex: number;
  taskType: TaskType;
  baseDatasetId: string;
  pattern: "uniform" | "single-burst" | "multi-burst" | "gradual-change" | "single-burst-heavy";
}

export interface ExperimentPracticeSpec {
  taskType: TaskType;
  baseDatasetId: string;
  condition: Condition;
}

export interface ExperimentConfig {
  slug: string;
  title: string;
  description: string;
  practiceTrials: readonly ExperimentPracticeSpec[];
  experimentalTrials: readonly ExperimentTrialSpec[];
  counterbalance: "latin-square-2";
}

export const ATS_PERCEPTION_SLUG = "ats-perception-v4";

const ATS_PERCEPTION_TRIALS: readonly ExperimentTrialSpec[] = [
  { trialIndex: 0, taskType: "peak", baseDatasetId: "ds-01-uniform-200", pattern: "uniform" },
  { trialIndex: 1, taskType: "comparison", baseDatasetId: "ds-02-single-burst-220", pattern: "single-burst" },
  { trialIndex: 2, taskType: "pattern", baseDatasetId: "ds-03-multi-burst-260", pattern: "multi-burst" },
  { trialIndex: 3, taskType: "peak", baseDatasetId: "ds-04-gradual-180", pattern: "gradual-change" },
  { trialIndex: 4, taskType: "comparison", baseDatasetId: "ds-05-single-burst-300", pattern: "single-burst-heavy" },
  { trialIndex: 5, taskType: "pattern", baseDatasetId: "ds-06-multi-burst-240", pattern: "multi-burst" },
  { trialIndex: 6, taskType: "peak", baseDatasetId: "ds-01-uniform-200", pattern: "uniform" },
  { trialIndex: 7, taskType: "comparison", baseDatasetId: "ds-02-single-burst-220", pattern: "single-burst" },
  { trialIndex: 8, taskType: "pattern", baseDatasetId: "ds-03-multi-burst-260", pattern: "multi-burst" },
  { trialIndex: 9, taskType: "peak", baseDatasetId: "ds-04-gradual-180", pattern: "gradual-change" },
  { trialIndex: 10, taskType: "comparison", baseDatasetId: "ds-05-single-burst-300", pattern: "single-burst-heavy" },
  { trialIndex: 11, taskType: "pattern", baseDatasetId: "ds-06-multi-burst-240", pattern: "multi-burst" },
  { trialIndex: 12, taskType: "peak", baseDatasetId: "ds-01-uniform-200", pattern: "uniform" },
  { trialIndex: 13, taskType: "comparison", baseDatasetId: "ds-02-single-burst-220", pattern: "single-burst" },
  { trialIndex: 14, taskType: "pattern", baseDatasetId: "ds-03-multi-burst-260", pattern: "multi-burst" },
  { trialIndex: 15, taskType: "peak", baseDatasetId: "ds-04-gradual-180", pattern: "gradual-change" },
  { trialIndex: 16, taskType: "comparison", baseDatasetId: "ds-05-single-burst-300", pattern: "single-burst-heavy" },
  { trialIndex: 17, taskType: "pattern", baseDatasetId: "ds-06-multi-burst-240", pattern: "multi-burst" },
  { trialIndex: 18, taskType: "peak", baseDatasetId: "ds-01-uniform-200", pattern: "uniform" },
  { trialIndex: 19, taskType: "comparison", baseDatasetId: "ds-02-single-burst-220", pattern: "single-burst" },
  { trialIndex: 20, taskType: "pattern", baseDatasetId: "ds-03-multi-burst-260", pattern: "multi-burst" },
  { trialIndex: 21, taskType: "peak", baseDatasetId: "ds-04-gradual-180", pattern: "gradual-change" },
  { trialIndex: 22, taskType: "comparison", baseDatasetId: "ds-05-single-burst-300", pattern: "single-burst-heavy" },
  { trialIndex: 23, taskType: "pattern", baseDatasetId: "ds-06-multi-burst-240", pattern: "multi-burst" },
];

const ATS_PERCEPTION_PRACTICE: readonly ExperimentPracticeSpec[] = [
  { taskType: "peak", baseDatasetId: "ds-01-uniform-200", condition: "uniform" },
  { taskType: "pattern", baseDatasetId: "ds-02-single-burst-220", condition: "ats" },
];

const EXPERIMENTS: readonly ExperimentConfig[] = [
  {
    slug: ATS_PERCEPTION_SLUG,
    title: "ATS Perception Study v4",
    description:
      "Compare Adaptive Temporal Scaling (ATS) and Uniform timelines on 24 experimental trials across three task types.",
    practiceTrials: ATS_PERCEPTION_PRACTICE,
    experimentalTrials: ATS_PERCEPTION_TRIALS,
    counterbalance: "latin-square-2",
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
