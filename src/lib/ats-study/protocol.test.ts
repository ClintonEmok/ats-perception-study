import { describe, expect, it } from "vitest";
import {
  buildExperimentalTrialOrder,
  buildPracticeTrials,
  EXPERIMENTAL_TRIAL_COUNT,
  FIXATION_MS,
  PRACTICE_TRIAL_COUNT,
  PROTOCOL_PHASES,
  TRIALS_PER_TASK,
} from "./protocol";

describe("protocol constants", () => {
  it("matches the locked 26-trial totals", () => {
    expect(PRACTICE_TRIAL_COUNT).toBe(2);
    expect(EXPERIMENTAL_TRIAL_COUNT).toBe(24);
    expect(TRIALS_PER_TASK).toBe(8);
    expect(FIXATION_MS).toBe(500);
  });

  it("exposes 6 ordered phases", () => {
    expect(PROTOCOL_PHASES).toEqual([
      "consent",
      "instructions",
      "practice",
      "trial",
      "questionnaire",
      "debrief",
    ]);
  });
});

describe("buildExperimentalTrialOrder", () => {
  it("returns 24 trials with 8 per task", () => {
    const order = buildExperimentalTrialOrder();
    expect(order).toHaveLength(24);
    const byTask = order.reduce<Record<string, number>>((acc, t) => {
      acc[t.taskType] = (acc[t.taskType] ?? 0) + 1;
      return acc;
    }, {});
    expect(byTask).toEqual({ peak: 8, comparison: 8, pattern: 8 });
  });

  it("marks all entries as non-practice", () => {
    expect(buildExperimentalTrialOrder().every((t) => !t.isPractice)).toBe(true);
  });
});

describe("buildPracticeTrials", () => {
  it("returns 2 practice trials with unique negative ids", () => {
    const practice = buildPracticeTrials();
    expect(practice).toHaveLength(2);
    expect(practice.every((t) => t.isPractice)).toBe(true);
    const ids = new Set(practice.map((p) => p.trialIndex));
    expect(ids.size).toBe(2);
  });
});
