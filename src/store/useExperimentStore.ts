"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { requireExperiment, type ExperimentConfig, type ExperimentPracticeSpec, type ExperimentTrialSpec } from "@/lib/ats-study/experiments";
import {
  assignConditionOrder,
  conditionForTrial,
  type ConditionOrder,
} from "@/lib/ats-study/assignment";
import { scoreTrial } from "@/lib/ats-study/scoring";
import type { Condition, ProtocolPhase, TaskType } from "@/lib/ats-study/protocol";
import { ATS_PERCEPTION_SLUG } from "@/lib/ats-study/experiments";

export interface TrialResponse {
  trialIndex: number;
  taskType: TaskType;
  condition: Condition;
  datasetId: string;
  chosen: string;
  correct: string;
  responseTimeMs: number;
  confidence: number;
  isPractice: boolean;
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
    conditionOrder: ConditionOrder;
    startedAt: number;
  }) => Promise<unknown>;
  completeSession: (args: { sessionId: string; finishedAt: number }) => Promise<unknown>;
  startTrial: (args: {
    sessionId: string;
    experimentSlug: string;
    trialIndex: number;
    taskType: TaskType;
    condition: Condition;
    datasetId: string;
    isPractice: boolean;
    onsetAt: number;
  }) => Promise<unknown>;
  completeTrial: (args: {
    sessionId: string;
    trialIndex: number;
    correct: boolean;
    chosen: string;
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
  currentTrialIndex: number;
  currentDatasetId: string | null;
  currentOnsetAt: number | null;
  practiceCursor: number;
  trialCursor: number;
  responses: TrialResponse[];
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
  startPractice: () => void;
  recordPracticeOnset: (datasetId: string) => void;
  recordPracticeResponse: (args: { chosen: string; correct: string; responseTimeMs: number; confidence: number }) => void;
  advancePractice: () => void;
  startTrials: () => void;
  recordTrialOnset: (trialIndex: number, datasetId: string) => void;
  recordTrialResponse: (args: { trialIndex: number; chosen: string; correct: string; responseTimeMs: number; confidence: number }) => Promise<void>;
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
  currentTrialIndex: 0,
  currentDatasetId: null,
  currentOnsetAt: null,
  practiceCursor: 0,
  trialCursor: 0,
  responses: [],
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

export function getCurrentPracticeSpec(state: { experimentSlug: string; practiceCursor: number }): ExperimentPracticeSpec | null {
  const config = getActiveExperiment(state);
  return config.practiceTrials[state.practiceCursor] ?? null;
}

export function getCurrentTrialSpec(state: { experimentSlug: string; trialCursor: number }): ExperimentTrialSpec | null {
  const config = getActiveExperiment(state);
  return config.experimentalTrials[state.trialCursor] ?? null;
}

export function getCurrentCondition(state: { participantIndex: number; trialCursor: number }): Condition {
  return conditionForTrial(state.participantIndex, state.trialCursor);
}

export const useExperimentStore = create<ExperimentStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setConvexWrites: (writes) => set({ convexWrites: writes }),
      setParticipantName: (name) => set({ participantName: name }),
      acceptConsent: () => set({ consentAccepted: true, phase: "instructions" }),
      beginInstructions: () => set({ phase: "instructions" }),
      completeInstructions: () => set({ phase: "practice" }),
      startSession: async (participantIndex, writes) => {
        const sessionId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const order = assignConditionOrder(participantIndex);
        const startedAt = Date.now();
        const name = get().participantName.trim();
        set({
          sessionId,
          participantIndex,
          convexWrites: writes,
          currentTrialIndex: 0,
          practiceCursor: 0,
          trialCursor: 0,
          responses: [],
          questionnaire: { preference: null, freeText: "" },
          startedAt,
          finishedAt: null,
        });
        try {
          await writes.startSession({
            sessionId,
            participantName: name.length > 0 ? name : null,
            conditionOrder: order,
            startedAt,
          });
        } catch (err) {
          console.warn("startSession convex write failed", err);
        }
      },
      startPractice: () => set({ phase: "practice" }),
      recordPracticeOnset: (datasetId) =>
        set({ currentDatasetId: datasetId, currentOnsetAt: performance.now() }),
      recordPracticeResponse: ({ chosen, correct, responseTimeMs, confidence }) => {
        const state = get();
        const practice = getCurrentPracticeSpec(state);
        if (!practice) return;
        const response: TrialResponse = {
          trialIndex: state.practiceCursor,
          taskType: practice.taskType,
          condition: practice.condition,
          datasetId: state.currentDatasetId ?? `${practice.baseDatasetId}--${practice.condition}`,
          chosen,
          correct,
          responseTimeMs,
          confidence,
          isPractice: true,
          recordedAt: Date.now(),
        };
        set({
          responses: [...state.responses, response],
          currentOnsetAt: null,
        });
      },
      advancePractice: () => {
        const state = get();
        const config = getActiveExperiment(state);
        const next = state.practiceCursor + 1;
        if (next >= config.practiceTrials.length) {
          set({ practiceCursor: 0, trialCursor: 0, phase: "trial" });
        } else {
          set({ practiceCursor: next });
        }
      },
      startTrials: () => set({ phase: "trial", trialCursor: 0 }),
      recordTrialOnset: (trialIndex, datasetId) =>
        set({ currentTrialIndex: trialIndex, currentDatasetId: datasetId, currentOnsetAt: performance.now() }),
      recordTrialResponse: async ({ trialIndex, chosen, correct, responseTimeMs, confidence }) => {
        const state = get();
        const config = getActiveExperiment(state);
        const spec = config.experimentalTrials[trialIndex];
        if (!spec) return;
        const condition = conditionForTrial(state.participantIndex, trialIndex);
        const isCorrect = scoreTrial(spec.taskType, { chosen, correct });
        const recordedAt = Date.now();
        const datasetId = state.currentDatasetId ?? `${spec.baseDatasetId}--${condition}`;
        const response: TrialResponse = {
          trialIndex,
          taskType: spec.taskType,
          condition,
          datasetId,
          chosen,
          correct,
          responseTimeMs,
          confidence,
          isPractice: false,
          recordedAt,
        };
        set({ responses: [...state.responses, response], currentOnsetAt: null });
        if (state.convexWrites && state.sessionId) {
          try {
            await state.convexWrites.completeTrial({
              sessionId: state.sessionId,
              trialIndex,
              correct: isCorrect,
              chosen,
              responseTimeMs,
              confidence,
              recordedAt,
            });
          } catch (err) {
            console.warn("completeTrial convex write failed", err);
          }
        }
      },
      advanceTrial: () => {
        const state = get();
        const config = getActiveExperiment(state);
        const next = state.trialCursor + 1;
        if (next >= config.experimentalTrials.length) {
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
      name: "ats-study-session",
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : window.sessionStorage)),
      partialize: (state) => ({
        sessionId: state.sessionId,
        participantIndex: state.participantIndex,
        participantName: state.participantName,
        experimentSlug: state.experimentSlug,
        phase: state.phase,
        currentTrialIndex: state.currentTrialIndex,
        currentDatasetId: state.currentDatasetId,
        currentOnsetAt: state.currentOnsetAt,
        practiceCursor: state.practiceCursor,
        trialCursor: state.trialCursor,
        responses: state.responses,
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
