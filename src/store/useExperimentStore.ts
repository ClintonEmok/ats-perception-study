"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { requireExperiment, type ExperimentConfig, type ABWindowSpec, ATS_PERCEPTION_SLUG } from "@/lib/ats-study/experiments";
import { selectParticipantWindows } from "@/lib/ats-study/assignment";
import type { ProtocolPhase, TaskType } from "@/lib/ats-study/protocol";

export type AbChoice = "A" | "B";

export interface AbResponse {
  windowKey: string;
  taskType: TaskType;
  choice: AbChoice;
  rationale: string;
  responseTimeMs: number;
  confidence: number;
  recordedAt: number;
}

export type PreferenceValue =
  | "uniform"
  | "ats"
  | "no-preference"
  | "Strongly uniform"
  | "Uniform"
  | "Neutral"
  | "ATS"
  | "Strongly ATS"
  | null;

export interface QuestionnaireAnswers {
  preference: PreferenceValue;
  freeText: string;
}

export interface ConvexWrites {
  startSession: (args: {
    sessionId: string;
    participantName: string | null;
    startedAt: number;
  }) => Promise<unknown>;
  completeSession: (args: { sessionId: string; finishedAt: number }) => Promise<unknown>;
  recordAbResponse: (args: {
    sessionId: string;
    windowKey: string;
    taskType: TaskType;
    choice: AbChoice;
    rationale: string;
    responseTimeMs: number;
    confidence: number;
    recordedAt: number;
  }) => Promise<unknown>;
  submitQuestionnaire: (args: {
    sessionId: string;
    preference: QuestionnaireAnswers["preference"];
    freeText: string;
    participantName: string | null;
    submittedAt: number;
  }) => Promise<unknown>;
}

export interface ExperimentState {
  sessionId: string | null;
  participantIndex: number;
  participantName: string;
  experimentSlug: string;
  phase: ProtocolPhase;
  trialCursor: number;
  trialWindows: ABWindowSpec[];
  abResponses: AbResponse[];
  questionnaire: QuestionnaireAnswers;
  convexWrites: ConvexWrites | null;
  consentAccepted: boolean;
  instructionsSeen: boolean;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface ExperimentActions {
  setConvexWrites: (writes: ConvexWrites) => void;
  setParticipantName: (name: string) => void;
  acceptConsent: () => void;
  beginInstructions: () => void;
  completeInstructions: () => void;
  startSession: (participantIndex: number, writes: ConvexWrites) => Promise<void>;
  startTrials: () => void;
  recordAbResponse: (args: {
    windowKey: string;
    taskType: TaskType;
    choice: AbChoice;
    rationale: string;
    responseTimeMs: number;
    confidence: number;
  }) => Promise<void>;
  advanceTrial: () => void;
  finishTrials: () => void;
  setQuestionnaireAnswer: <K extends keyof QuestionnaireAnswers>(key: K, value: QuestionnaireAnswers[K]) => void;
  submitQuestionnaire: () => Promise<void>;
  finishSession: () => Promise<void>;
  reset: () => void;
}

export type ExperimentStore = ExperimentState & ExperimentActions;

const initialState: ExperimentState = {
  sessionId: null,
  participantIndex: 0,
  participantName: "",
  experimentSlug: ATS_PERCEPTION_SLUG,
  phase: "consent",
  trialCursor: 0,
  trialWindows: [],
  abResponses: [],
  questionnaire: { preference: null, freeText: "" },
  convexWrites: null,
  consentAccepted: false,
  instructionsSeen: false,
  startedAt: null,
  finishedAt: null,
};

export function getActiveExperiment(state: { experimentSlug: string }): ExperimentConfig {
  return requireExperiment(state.experimentSlug);
}

export function getWindowAt(state: { trialWindows: ABWindowSpec[]; trialCursor: number }): ABWindowSpec | null {
  return state.trialWindows[state.trialCursor] ?? null;
}

export const useExperimentStore = create<ExperimentStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setConvexWrites: (writes) => set({ convexWrites: writes }),
      setParticipantName: (name) => set({ participantName: name }),
      acceptConsent: () => set({ consentAccepted: true, phase: "instructions" }),
      beginInstructions: () => set({ phase: "instructions" }),
      completeInstructions: () => set({ instructionsSeen: true, phase: "practice", trialCursor: 0 }),
      startSession: async (participantIndex, writes) => {
        const sessionId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const startedAt = Date.now();
        const name = get().participantName.trim();
        set({
          sessionId,
          participantIndex,
          convexWrites: writes,
          trialCursor: 0,
          trialWindows: selectParticipantWindows(participantIndex, getActiveExperiment(get()).windows),
          abResponses: [],
          questionnaire: { preference: null, freeText: "" },
          startedAt,
          finishedAt: null,
        });
        try {
          await writes.startSession({
            sessionId,
            participantName: name.length > 0 ? name : null,
            startedAt,
          });
        } catch (err) {
          console.warn("startSession convex write failed", err);
        }
      },
      startTrials: () => set({ phase: "trial", trialCursor: 0 }),
      recordAbResponse: async ({ windowKey, taskType, choice, rationale, responseTimeMs, confidence }) => {
        const state = get();
        const recordedAt = Date.now();
        const response: AbResponse = {
          windowKey,
          taskType,
          choice,
          rationale,
          responseTimeMs,
          confidence,
          recordedAt,
        };
        set({ abResponses: [...state.abResponses, response] });
        if (state.convexWrites && state.sessionId) {
          try {
            await state.convexWrites.recordAbResponse({
              sessionId: state.sessionId,
              windowKey,
              taskType,
              choice,
              rationale,
              responseTimeMs,
              confidence,
              recordedAt,
            });
          } catch (err) {
            console.warn("recordAbResponse convex write failed", err);
          }
        }
      },
      advanceTrial: () => {
        const state = get();
        const next = state.trialCursor + 1;
        if (next >= state.trialWindows.length) {
          set({ trialCursor: 0, phase: "questionnaire" });
        } else {
          set({ trialCursor: next });
        }
      },
      finishTrials: () => set({ phase: "questionnaire" }),
      setQuestionnaireAnswer: (key, value) =>
        set({ questionnaire: { ...get().questionnaire, [key]: value } }),
      submitQuestionnaire: async () => {
        const state = get();
        if (!state.convexWrites || !state.sessionId) {
          set({ phase: "debrief" });
          return;
        }
        const name = state.participantName.trim();
        try {
          await state.convexWrites.submitQuestionnaire({
            sessionId: state.sessionId,
            preference: state.questionnaire.preference,
            freeText: state.questionnaire.freeText,
            participantName: name.length > 0 ? name : null,
            submittedAt: Date.now(),
          });
        } catch (err) {
          console.warn("submitQuestionnaire convex write failed", err);
        }
        set({ phase: "debrief" });
      },
      finishSession: async () => {
        const state = get();
        if (state.convexWrites && state.sessionId) {
          try {
            await state.convexWrites.completeSession({
              sessionId: state.sessionId,
              finishedAt: Date.now(),
            });
          } catch (err) {
            console.warn("completeSession convex write failed", err);
          }
        }
        set({ finishedAt: Date.now() });
      },
      reset: () => set({ ...initialState, convexWrites: get().convexWrites }),
    }),
    {
      name: "ats-study-session-v5",
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.sessionStorage)),
      partialize: (state) => ({
        sessionId: state.sessionId,
        participantIndex: state.participantIndex,
        participantName: state.participantName,
        experimentSlug: state.experimentSlug,
        phase: state.phase,
        trialCursor: state.trialCursor,
        trialWindows: state.trialWindows,
        abResponses: state.abResponses,
        questionnaire: state.questionnaire,
        consentAccepted: state.consentAccepted,
        instructionsSeen: state.instructionsSeen,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt,
      }),
    },
  ),
);

const noopStorage: Storage = {
  length: 0,
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};
