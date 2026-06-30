export type TaskType = "peak" | "comparison" | "pattern";

export type Condition = "uniform" | "ats";

export type PatternKind = "uniform" | "single-burst" | "multi-burst" | "gradual-change" | "single-burst-heavy";

export interface TrialSpec {
  trialIndex: number;
  taskType: TaskType;
  isPractice: boolean;
}

export interface TrialOrderEntry extends TrialSpec {
  datasetId: string;
  pattern: PatternKind;
}

export const PROTOCOL_VERSION = "v4.0.0";
export const FIXATION_MS = 500;
export const MIN_RESPONSE_MS = 200;
export const PRACTICE_TRIAL_COUNT = 2;
export const EXPERIMENTAL_TRIAL_COUNT = 24;
export const TRIALS_PER_TASK = 8;
export const UNIFORM_TRIAL_COUNT = 12;
export const ATS_TRIAL_COUNT = 12;

export const TASK_LABELS: Record<TaskType, string> = {
  peak: "Peak identification",
  comparison: "Period comparison",
  pattern: "Pattern recognition",
};

export const PEAK_CHOICES: ReadonlyArray<"A" | "B" | "C"> = ["A", "B", "C"];
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
  "block-a",
  "block-b",
  "questionnaire",
  "debrief",
] as const;

export type ProtocolPhase = (typeof PROTOCOL_PHASES)[number];

export function buildExperimentalTrialOrder(): TrialSpec[] {
  const order: TrialSpec[] = [];
  let idx = 0;
  for (const task of ["peak", "comparison", "pattern"] as TaskType[]) {
    for (let i = 0; i < TRIALS_PER_TASK; i++) {
      order.push({ trialIndex: idx++, taskType: task, isPractice: false });
    }
  }
  return order;
}

export function buildPracticeTrials(): TrialSpec[] {
  return [
    { trialIndex: -1, taskType: "peak", isPractice: true },
    { trialIndex: -2, taskType: "pattern", isPractice: true },
  ];
}
