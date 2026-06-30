import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  recordAbResponse: vi.fn().mockResolvedValue(undefined),
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
    recordAbResponse: vi.fn().mockResolvedValue(undefined),
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

  it("transitions through instructions straight to trial (no practice phase in v5)", () => {
    const s = useExperimentStore.getState();
    s.acceptConsent();
    s.beginInstructions();
    expect(useExperimentStore.getState().phase).toBe("instructions");
    s.completeInstructions();
    expect(useExperimentStore.getState().instructionsSeen).toBe(true);
    expect(useExperimentStore.getState().phase).toBe("trial");
  });

  it("starts a session with the v5 slug", async () => {
    const writes = makeWrites();
    await useExperimentStore.getState().startSession(0, writes);
    const s = useExperimentStore.getState();
    expect(s.sessionId).toBeTruthy();
    expect(writes.startSession).toHaveBeenCalled();
  });

  it("starts on the ats-perception-v5 experiment by default with 12 windows", () => {
    expect(useExperimentStore.getState().experimentSlug).toBe(ATS_PERCEPTION_SLUG);
    const config = getExperiment(ATS_PERCEPTION_SLUG);
    expect(config).not.toBeNull();
    expect(config?.windows).toHaveLength(12);
    expect(config?.totalTrials).toBe(12);
  });

  it("recordAbResponse appends to abResponses and calls the writes stub with the right shape", async () => {
    const writes = makeWrites();
    await useExperimentStore.getState().startSession(0, writes);
    useExperimentStore.getState().acceptConsent();
    useExperimentStore.getState().beginInstructions();
    useExperimentStore.getState().completeInstructions();

    await useExperimentStore.getState().recordAbResponse({
      windowKey: "1,1",
      taskType: "peak",
      choice: "A",
      rationale: "ATS felt clearer",
      responseTimeMs: 1234,
      confidence: 4,
    });

    const state = useExperimentStore.getState();
    expect(state.abResponses).toHaveLength(1);
    expect(state.abResponses[0]?.windowKey).toBe("1,1");
    expect(state.abResponses[0]?.taskType).toBe("peak");
    expect(state.abResponses[0]?.choice).toBe("A");
    expect(state.phase).toBe("trial");
    expect(state.trialCursor).toBe(0);
    expect(writes.recordAbResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        windowKey: "1,1",
        taskType: "peak",
        choice: "A",
        responseTimeMs: 1234,
        confidence: 4,
      }),
    );
  });

  it("does NOT auto-advance after recordAbResponse", async () => {
    const writes = makeWrites();
    await useExperimentStore.getState().startSession(0, writes);
    useExperimentStore.getState().acceptConsent();
    useExperimentStore.getState().beginInstructions();
    useExperimentStore.getState().completeInstructions();

    await useExperimentStore.getState().recordAbResponse({
      windowKey: "1,1",
      taskType: "peak",
      choice: "A",
      rationale: "",
      responseTimeMs: 800,
      confidence: 3,
    });
    expect(useExperimentStore.getState().trialCursor).toBe(0);
  });

  it("advanceTrial rolls into questionnaire after the 12th trial", () => {
    const config = getExperiment(ATS_PERCEPTION_SLUG)!;
    useExperimentStore.setState({ phase: "trial", trialCursor: config.windows.length - 1 });
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
    expect(useExperimentStore.getState().abResponses).toEqual([]);
    expect(useExperimentStore.getState().questionnaire).toEqual({ preference: null, freeText: "" });
    expect(useExperimentStore.getState().convexWrites).toBe(writes);
  });
});
