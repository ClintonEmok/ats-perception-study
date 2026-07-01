export type TaskType = "peak" | "comparison" | "pattern";

export type Condition = "uniform" | "ats";

export type PatternKind = "uniform" | "single-burst" | "multi-burst" | "gradual-change" | "single-burst-heavy";

export type WindowKey = string;

export interface TrialSpec {
  trialIndex: number;
  taskType: TaskType;
  isPractice: boolean;
}

export interface TrialOrderEntry extends TrialSpec {
  datasetId: string;
  pattern: PatternKind;
}

export const PROTOCOL_VERSION = "v5.0.0";
export const FIXATION_MS = 500;
export const MIN_RESPONSE_MS = 200;
export const EXPERIMENTAL_TRIAL_COUNT = 12;
export const TRIALS_PER_TASK = 4;
export const TASKS_PER_WINDOW = 3;
export const PARTICIPANT_TASK_COUNT = 4;
export const WINDOW_COUNT = 40;

export const TASK_LABELS: Record<TaskType, string> = {
  peak: "Peak task",
  comparison: "Visualization comparison",
  pattern: "Pattern task",
};

export const PEAK_CHOICES: ReadonlyArray<"A" | "B" | "C"> = ["A", "B", "C"];
export type PeakChoice = (typeof PEAK_CHOICES)[number];
export const PATTERN_CHOICES: ReadonlyArray<PatternKind> = [
  "uniform",
  "single-burst",
  "multi-burst",
  "gradual-change",
];

export const PROTOCOL_PHASES = [
  "consent",
  "instructions",
  "practice",
  "trial",
  "questionnaire",
  "debrief",
] as const;

export type ProtocolPhase = (typeof PROTOCOL_PHASES)[number];
