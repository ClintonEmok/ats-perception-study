import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildExperimentalTrialOrder, PRACTICE_TRIAL_COUNT, EXPERIMENTAL_TRIAL_COUNT } from "@/lib/ats-study/protocol";
import type { ConvexWrites } from "@/store/useExperimentStore";

vi.mock("zustand/middleware", async (orig) => {
  const actual = await orig<typeof import("zustand/middleware")>();
  return {
    ...actual,
    persist: (initializer: unknown) => (set: unknown, get: unknown, api: unknown) =>
      (initializer as (s: unknown, g: unknown, a: unknown) => unknown)(set, get, api),
  };
});

import { useExperimentStore } from "./useExperimentStore";

const makeWrites = (): ConvexWrites => ({
  startSession: vi.fn().mockResolvedValue(undefined),
  completeSession: vi.fn().mockResolvedValue(undefined),
  startTrial: vi.fn().mockResolvedValue(undefined),
  completeTrial: vi.fn().mockResolvedValue(undefined),
  submitQuestionnaire: vi.fn().mockResolvedValue(undefined),
});

const reset = () => useExperimentStore.getState().reset();

describe("useExperimentStore", () => {
  beforeEach(() => {
    reset();
  });
  afterEach(() => {
    reset();
  });

  it("starts in consent and accepts consent", () => {
    const s = useExperimentStore.getState();
    expect(s.phase).toBe("consent");
    s.acceptConsent();
    expect(useExperimentStore.getState().consentAccepted).toBe(true);
  });

  it("transitions through instructions to practice", () => {
    const s = useExperimentStore.getState();
    s.acceptConsent();
    s.beginInstructions();
    expect(useExperimentStore.getState().phase).toBe("instructions");
    s.completeInstructions();
    expect(useExperimentStore.getState().phase).toBe("practice");
  });

  it("starts a session with the counterbalanced condition order", async () => {
    const writes = makeWrites();
    await useExperimentStore.getState().startSession(0, writes);
    const s = useExperimentStore.getState();
    expect(s.sessionId).toBeTruthy();
    expect(s.blockACondition).toBeOneOf(["uniform", "ats"]);
    expect(s.blockBCondition).toBeOneOf(["uniform", "ats"]);
    expect(writes.startSession).toHaveBeenCalled();
  });

  it("advances through the two practice trials and then into block-a", () => {
    const s = useExperimentStore.getState();
    s.acceptConsent();
    s.beginInstructions();
    s.completeInstructions();
    for (let i = 0; i < PRACTICE_TRIAL_COUNT; i++) {
      s.recordPracticeOnset(`practice-${i}`);
      s.recordPracticeResponse({ chosen: "A", correct: "A", responseTimeMs: 500, confidence: 3 });
      s.advancePractice();
    }
    expect(useExperimentStore.getState().phase).toBe("block-a");
  });

  it("captures onset and response as separate events per trial", async () => {
    await useExperimentStore.getState().startSession(0, makeWrites());
    useExperimentStore.getState().acceptConsent();
    useExperimentStore.getState().beginInstructions();
    useExperimentStore.getState().completeInstructions();
    for (let i = 0; i < PRACTICE_TRIAL_COUNT; i++) {
      useExperimentStore.getState().recordPracticeOnset(`practice-${i}`);
      useExperimentStore.getState().recordPracticeResponse({
        chosen: "A",
        correct: "A",
        responseTimeMs: 600,
        confidence: 4,
      });
      useExperimentStore.getState().advancePractice();
    }
    const order = buildExperimentalTrialOrder();
    const writes = useExperimentStore.getState().convexWrites!;
    await useExperimentStore.getState().recordTrialResponse({
      trialIndex: 0,
      chosen: "A",
      correct: "A",
      responseTimeMs: 700,
      confidence: 5,
    });
    expect(writes.completeTrial).toHaveBeenCalled();
    expect(order).toHaveLength(EXPERIMENTAL_TRIAL_COUNT);
  });

  it("moves to questionnaire after block-b completes", async () => {
    await useExperimentStore.getState().startSession(0, makeWrites());
    useExperimentStore.getState().acceptConsent();
    useExperimentStore.getState().beginInstructions();
    useExperimentStore.getState().completeInstructions();
    for (let i = 0; i < PRACTICE_TRIAL_COUNT; i++) {
      useExperimentStore.getState().recordPracticeOnset(`practice-${i}`);
      useExperimentStore.getState().recordPracticeResponse({ chosen: "A", correct: "A", responseTimeMs: 400, confidence: 3 });
      useExperimentStore.getState().advancePractice();
    }
    useExperimentStore.getState().finishBlocks();
    expect(useExperimentStore.getState().phase).toBe("questionnaire");
  });

  it("submits the questionnaire and transitions to debrief", async () => {
    const writes = makeWrites();
    await useExperimentStore.getState().startSession(0, writes);
    useExperimentStore.getState().setQuestionnaireAnswer("preference", "ats");
    useExperimentStore.getState().setQuestionnaireAnswer("freeText", "ATS feels calmer.");
    await useExperimentStore.getState().submitQuestionnaire();
    expect(writes.submitQuestionnaire).toHaveBeenCalled();
    expect(useExperimentStore.getState().phase).toBe("debrief");
  });
});
