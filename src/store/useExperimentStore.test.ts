import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildExperimentalTrialOrder, EXPERIMENTAL_TRIAL_COUNT } from "@/lib/ats-study/protocol";
import { ATS_PERCEPTION_SLUG, getExperiment } from "@/lib/ats-study/experiments";
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

const makeWritesWithNameCheck = (): ConvexWrites & {
  startSessionMock: ReturnType<typeof vi.fn>;
  submitQuestionnaireMock: ReturnType<typeof vi.fn>;
} => {
  const startSessionMock = vi.fn().mockResolvedValue(undefined);
  const submitQuestionnaireMock = vi.fn().mockResolvedValue(undefined);
  return {
    startSession: startSessionMock,
    completeSession: vi.fn().mockResolvedValue(undefined),
    startTrial: vi.fn().mockResolvedValue(undefined),
    completeTrial: vi.fn().mockResolvedValue(undefined),
    submitQuestionnaire: submitQuestionnaireMock,
    startSessionMock,
    submitQuestionnaireMock,
  };
};

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

  it("acceptConsent advances phase to 'instructions' so the user doesn't fall through to debrief", () => {
    const s = useExperimentStore.getState();
    expect(s.phase).toBe("consent");
    expect(s.consentAccepted).toBe(false);
    s.acceptConsent();
    const after = useExperimentStore.getState();
    expect(after.consentAccepted).toBe(true);
    expect(after.phase).toBe("instructions");
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
    expect(writes.startSession).toHaveBeenCalled();
  });

  it("starts on the ats-perception-v4 experiment by default", () => {
    expect(useExperimentStore.getState().experimentSlug).toBe(ATS_PERCEPTION_SLUG);
    const config = getExperiment(ATS_PERCEPTION_SLUG);
    expect(config).not.toBeNull();
  });

  it("advances through practice trials and into the trial phase", () => {
    const s = useExperimentStore.getState();
    s.acceptConsent();
    s.beginInstructions();
    s.completeInstructions();
    const config = getExperiment(ATS_PERCEPTION_SLUG)!;
    for (let i = 0; i < config.practiceTrials.length; i++) {
      s.recordPracticeOnset(`practice-${i}`);
      s.recordPracticeResponse({ chosen: "A", correct: "A", responseTimeMs: 500, confidence: 3 });
      s.advancePractice();
    }
    expect(useExperimentStore.getState().phase).toBe("trial");
  });

  it("captures onset and response as separate events per trial", async () => {
    const config = getExperiment(ATS_PERCEPTION_SLUG)!;
    await useExperimentStore.getState().startSession(0, makeWrites());
    useExperimentStore.getState().acceptConsent();
    useExperimentStore.getState().beginInstructions();
    useExperimentStore.getState().completeInstructions();
    for (let i = 0; i < config.practiceTrials.length; i++) {
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

  it("moves to questionnaire after all trials complete", async () => {
    const config = getExperiment(ATS_PERCEPTION_SLUG)!;
    await useExperimentStore.getState().startSession(0, makeWrites());
    useExperimentStore.getState().acceptConsent();
    useExperimentStore.getState().beginInstructions();
    useExperimentStore.getState().completeInstructions();
    for (let i = 0; i < config.practiceTrials.length; i++) {
      useExperimentStore.getState().recordPracticeOnset(`practice-${i}`);
      useExperimentStore.getState().recordPracticeResponse({ chosen: "A", correct: "A", responseTimeMs: 400, confidence: 3 });
      useExperimentStore.getState().advancePractice();
    }
    useExperimentStore.getState().finishTrials();
    expect(useExperimentStore.getState().phase).toBe("questionnaire");
  });

  it("advanceTrial rolls into questionnaire after the last trial", () => {
    const config = getExperiment(ATS_PERCEPTION_SLUG)!;
    useExperimentStore.setState({ phase: "trial", trialCursor: config.experimentalTrials.length - 1 });
    useExperimentStore.getState().advanceTrial();
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

  it("passes the participant name to startSession and submitQuestionnaire", async () => {
    const writes = makeWritesWithNameCheck();
    useExperimentStore.getState().setParticipantName("Alex");
    await useExperimentStore.getState().startSession(0, writes);
    expect(writes.startSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ participantName: "Alex" }),
    );
    useExperimentStore.getState().setQuestionnaireAnswer("preference", "ats");
    useExperimentStore.getState().setQuestionnaireAnswer("freeText", "ATS feels calmer.");
    await useExperimentStore.getState().submitQuestionnaire();
    expect(writes.submitQuestionnaireMock).toHaveBeenCalledWith(
      expect.objectContaining({ participantName: "Alex" }),
    );
  });

  it("sends null participant name when none is provided", async () => {
    const writes = makeWritesWithNameCheck();
    await useExperimentStore.getState().startSession(0, writes);
    expect(writes.startSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ participantName: null }),
    );
  });

  it("reset() clears session state but keeps convexWrites for a new run", async () => {
    const writes = makeWrites();
    await useExperimentStore.getState().startSession(0, writes);
    useExperimentStore.getState().acceptConsent();
    useExperimentStore.getState().setParticipantName("Alex");
    expect(useExperimentStore.getState().sessionId).toBeTruthy();
    expect(useExperimentStore.getState().participantName).toBe("Alex");
    expect(useExperimentStore.getState().consentAccepted).toBe(true);
    useExperimentStore.getState().reset();
    expect(useExperimentStore.getState().sessionId).toBeNull();
    expect(useExperimentStore.getState().participantName).toBe("");
    expect(useExperimentStore.getState().consentAccepted).toBe(false);
    expect(useExperimentStore.getState().phase).toBe("consent");
    expect(useExperimentStore.getState().responses).toEqual([]);
    expect(useExperimentStore.getState().questionnaire).toEqual({ preference: null, freeText: "" });
    expect(useExperimentStore.getState().convexWrites).toBe(writes);
  });
});
