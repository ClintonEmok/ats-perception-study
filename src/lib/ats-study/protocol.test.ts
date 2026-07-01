import { describe, expect, it } from "vitest";
import {
  EXPERIMENTAL_TRIAL_COUNT,
  FIXATION_MS,
  PROTOCOL_PHASES,
  TRIALS_PER_TASK,
  WINDOW_COUNT,
} from "./protocol";

describe("protocol constants", () => {
  it("matches the 40-window pool and 12-trial totals", () => {
    expect(EXPERIMENTAL_TRIAL_COUNT).toBe(12);
    expect(WINDOW_COUNT).toBe(40);
    expect(TRIALS_PER_TASK).toBe(4);
    expect(FIXATION_MS).toBe(500);
  });

  it("exposes 6 ordered phases (with a practice step in v5)", () => {
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
