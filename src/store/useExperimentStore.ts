"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { requireExperiment, type ExperimentConfig, type ABWindowSpec, ATS_PERCEPTION_SLUG } from "@/lib/ats-study/experiments";
import {
  buildParticipantTrialItems,
  selectParticipantWindows,
  type StudyTrialItem,
} from "@/lib/ats-study/assignment";
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

export interface QuestionnaireAnswers {
  freeText: string;
}

export interface ConvexWrites {
  startSession: (args: {
    sessionId: string;
    participantName: string | null;
    startedAt: number;
    conditionOrder: ReadonlyArray<"uniform" | "ats">;
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
    freeText: string;
    participantName: string | null;
    submittedAt: number;
  }) => Promise<unknown>;
}

export interface ExperimentState {
  hasHydrated: boolean;
  fallbackDownloadQueued: boolean;
  fallbackDownloadReason: string | null;
  questionNumber: number;
  sessionId: string | null;
  convexSessionId: string | null;
  participantIndex: number;
  participantName: string;
  experimentSlug: string;
  phase: ProtocolPhase;
  trialCursor: number;
  trialWindows: ABWindowSpec[];
  trialItems: StudyTrialItem[];
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
  clearFallbackDownload: () => void;
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
  hasHydrated: false,
  fallbackDownloadQueued: false,
  fallbackDownloadReason: null,
  questionNumber: 1,
  sessionId: null,
  convexSessionId: null,
  participantIndex: 0,
  participantName: "",
  experimentSlug: ATS_PERCEPTION_SLUG,
  phase: "consent",
  trialCursor: 0,
  trialWindows: [],
  trialItems: [],
  abResponses: [],
   questionnaire: { freeText: "" },
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

const CONVEX_WRITE_ATTEMPTS = 3;
const CONVEX_WRITE_RETRY_DELAY_MS = 250;

function getConditionOrder(participantIndex: number): ReadonlyArray<"uniform" | "ats"> {
  return participantIndex % 2 === 0 ? ["uniform", "ats"] : ["ats", "uniform"];
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryConvexWrite<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= CONVEX_WRITE_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[study-store] ${label} attempt ${attempt} failed`, error);
      if (attempt < CONVEX_WRITE_ATTEMPTS) {
        await sleep(CONVEX_WRITE_RETRY_DELAY_MS * attempt);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? `${label} failed`));
}

export const useExperimentStore = create<ExperimentStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setConvexWrites: (writes) => set({ convexWrites: writes }),
      clearFallbackDownload: () => set({ fallbackDownloadQueued: false, fallbackDownloadReason: null }),
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
        const conditionOrder = getConditionOrder(participantIndex);
        set({
          sessionId,
          participantIndex,
          convexSessionId: null,
          convexWrites: writes,
          questionNumber: 1,
          trialCursor: 0,
          trialWindows: selectParticipantWindows(participantIndex, getActiveExperiment(get()).windows),
          trialItems: buildParticipantTrialItems(participantIndex, getActiveExperiment(get()).windows),
          abResponses: [],
          questionnaire: { freeText: "" },
          startedAt,
          finishedAt: null,
        });
        try {
          await retryConvexWrite("startSession", () =>
            writes.startSession({
              sessionId,
              participantName: name.length > 0 ? name : null,
              startedAt,
              conditionOrder,
            }),
          );
        } catch (err) {
          console.warn("startSession convex write failed", err);
          set({ fallbackDownloadQueued: true, fallbackDownloadReason: "startSession" });
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
            await retryConvexWrite("recordAbResponse", () =>
              state.convexWrites!.recordAbResponse({
                sessionId: state.sessionId!,
                windowKey,
                taskType,
                choice,
                rationale,
                responseTimeMs,
                confidence,
                recordedAt,
              }),
            );
          } catch (err) {
            console.warn("recordAbResponse convex write failed", err);
            set({ fallbackDownloadQueued: true, fallbackDownloadReason: "recordAbResponse" });
          }
        }
      },
      advanceTrial: () => {
        const state = get();
        const next = state.trialCursor + 1;
        if (next >= state.trialItems.length) {
          set({ trialCursor: 0, phase: "questionnaire" });
        } else {
          set({ trialCursor: next, questionNumber: state.questionNumber + 1 });
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
          await retryConvexWrite("submitQuestionnaire", () =>
            state.convexWrites!.submitQuestionnaire({
              sessionId: state.sessionId!,
              freeText: state.questionnaire.freeText,
              participantName: name.length > 0 ? name : null,
              submittedAt: Date.now(),
            }),
          );
        } catch (err) {
          console.warn("submitQuestionnaire convex write failed", err);
          set({ fallbackDownloadQueued: true, fallbackDownloadReason: "submitQuestionnaire" });
        }
        set({ phase: "debrief" });
      },
      finishSession: async () => {
        const state = get();
        if (state.convexWrites && state.sessionId) {
          try {
            await retryConvexWrite("completeSession", () =>
              state.convexWrites!.completeSession({
                sessionId: state.sessionId!,
                finishedAt: Date.now(),
              }),
            );
          } catch (err) {
            console.warn("completeSession convex write failed", err);
            set({ fallbackDownloadQueued: true, fallbackDownloadReason: "completeSession" });
          }
        }
        set({ finishedAt: Date.now() });
      },
      reset: () => set({ ...initialState, hasHydrated: true, convexWrites: get().convexWrites }),
    }),
    {
      name: "ats-study-session-v5",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          console.log("[study-store] using noop storage on server");
          return noopStorage;
        }

        console.log("[study-store] using sessionStorage", {
          keys: Object.keys(window.sessionStorage),
        });

        return {
          get length() {
            return window.sessionStorage.length;
          },
          clear: () => {
            console.log("[study-store] sessionStorage.clear()");
            window.sessionStorage.clear();
          },
          getItem: (key: string) => {
            const value = window.sessionStorage.getItem(key);
            console.log("[study-store] sessionStorage.getItem", {
              key,
              hit: value !== null,
              length: value?.length ?? 0,
            });
            return value;
          },
          key: (index: number) => window.sessionStorage.key(index),
          removeItem: (key: string) => {
            console.log("[study-store] sessionStorage.removeItem", { key });
            window.sessionStorage.removeItem(key);
          },
          setItem: (key: string, value: string) => {
            console.log("[study-store] sessionStorage.setItem", {
              key,
              length: value.length,
            });
            window.sessionStorage.setItem(key, value);
          },
        } satisfies Storage;
      }),
      onRehydrateStorage: () => (state, error) => {
        console.log("[study-store] rehydrate start", {
          error: error ? String(error) : null,
          persistedSessionId: state?.sessionId ?? null,
          persistedPhase: state?.phase ?? null,
          persistedHasHydrated: state?.hasHydrated ?? null,
        });
        if (error) {
          console.warn("rehydrate study store failed", error);
          return;
        }
        if (state) {
          useExperimentStore.setState({ hasHydrated: true });
          console.log("[study-store] rehydrate complete", {
            sessionId: state.sessionId,
            phase: state.phase,
            consentAccepted: state.consentAccepted,
            instructionsSeen: state.instructionsSeen,
            trialWindows: state.trialWindows.length,
            trialCursor: state.trialCursor,
          });
        }
      },
      partialize: (state) => ({
        sessionId: state.sessionId,
        convexSessionId: state.convexSessionId,
        participantIndex: state.participantIndex,
        participantName: state.participantName,
        experimentSlug: state.experimentSlug,
        phase: state.phase,
        fallbackDownloadQueued: state.fallbackDownloadQueued,
        fallbackDownloadReason: state.fallbackDownloadReason,
        questionNumber: state.questionNumber,
        trialCursor: state.trialCursor,
        trialWindows: state.trialWindows,
        trialItems: state.trialItems,
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
