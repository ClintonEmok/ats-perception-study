import type { PatternKind, TaskType } from "./protocol";

export interface PeakScoreInput {
  chosen: "A" | "B" | "C";
  correct: "A" | "B" | "C";
}

export interface ComparisonScoreInput {
  chosen: "first" | "second";
  correct: "first" | "second";
}

export interface PatternScoreInput {
  chosen: PatternKind;
  correct: PatternKind;
}

export function scorePeak({ chosen, correct }: PeakScoreInput): boolean {
  return chosen === correct;
}

export function scoreComparison({ chosen, correct }: ComparisonScoreInput): boolean {
  return chosen === correct;
}

export function scorePattern({ chosen, correct }: PatternScoreInput): boolean {
  return chosen === correct;
}

export function scoreTrial(
  task: TaskType,
  payload: { chosen: string; correct: string },
): boolean {
  switch (task) {
    case "peak":
      return scorePeak({ chosen: payload.chosen as PeakScoreInput["chosen"], correct: payload.correct as PeakScoreInput["correct"] });
    case "comparison":
      return scoreComparison({ chosen: payload.chosen as ComparisonScoreInput["chosen"], correct: payload.correct as ComparisonScoreInput["correct"] });
    case "pattern":
      return scorePattern({ chosen: payload.chosen as PatternScoreInput["chosen"], correct: payload.correct as PatternScoreInput["correct"] });
    default:
      return false;
  }
}
