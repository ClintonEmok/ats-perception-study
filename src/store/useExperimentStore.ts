"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildExperimentalTrialOrder, buildPracticeTrials, type ProtocolPhase, type TaskType } from "@/lib/ats-study/protocol";
import {
  assignConditionOrder,
  conditionForTrial,
  type ConditionOrder,
} from "@/lib/ats-study/assignment";
import { scoreTrial } from "@/lib/ats-study/scoring";
import type { Condition } from "@/lib/ats-study/protocol";

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
  startSession: (args: { sessionId: string; participantName: string | null; conditionOrder: ConditionOrder; startedAt: number }) => Promise<unknown>;
  completeSession: (args: { sessionId: string; finishedAt: number }) => Promise<unknown>;
  startTrial: (args: { sessionId: string; trialIndex: number; taskType: TaskType; condition: Condition; datasetId: string; isPractice: boolean; onsetAt: number }) => Promise<unknown>;
  completeTrial: (args: { sessionId: string; trialIndex: number; correct: boolean; chosen: string; responseTimeMs: number; confidence: number; recordedAt: number }) => Promise<unknown>;
  submitQuestionnaire: (args: { sessionId: string; preference: QuestionnaireAnswers["preference"]; freeText: string; participantName: string | null; submittedAt: number }) => Promise<unknown>;
}

export interface ExperimentState {
  sessionId: string | null;
  participantIndex: number;
  participantName: string;
  phase: ProtocolPhase;
  blockACondition: Condition | null;
  blockBCondition: Condition | null;
  currentTrialIndex: number;
  currentDatasetId: string | null;
  currentOnsetAt: number | null;
  practiceCursor: number;
  blockCursor: number;
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
  startBlock: (block: "a" | "b") => void;
  recordTrialOnset: (trialIndex: number, datasetId: string) => void;
  recordTrialResponse: (args: { trialIndex: number; chosen: string; correct: string; responseTimeMs: number; confidence: number }) => Promise<void>;
  advanceTrial: () => void;
  finishBlocks: () => void;
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
  phase: "consent",
  blockACondition: null,
  blockBCondition: null,
  currentTrialIndex: 0,
  currentDatasetId: null,
  currentOnsetAt: null,
  practiceCursor: 0,
  blockCursor: 0,
  responses: [],
  questionnaire: { preference: null, freeText: "" },
  convexWrites: null,
  consentAccepted: false,
  instructionsSeen: false,
  startedAt: null,
  finishedAt: null,
};

const practiceTrials = buildPracticeTrials();
const experimentalOrder = buildExperimentalTrialOrder();

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
          blockACondition: order[0] ?? null,
          blockBCondition: order[1] ?? null,
          currentTrialIndex: 0,
          practiceCursor: 0,
          blockCursor: 0,
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
        const trial = practiceTrials[state.practiceCursor];
        if (!trial) return;
        const condition = state.practiceCursor % 2 === 0 ? "uniform" : "ats";
        const response: TrialResponse = {
          trialIndex: trial.trialIndex,
          taskType: trial.taskType,
          condition,
          datasetId: state.currentDatasetId ?? `${trial.taskType}-practice`,
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
        const next = state.practiceCursor + 1;
        if (next >= practiceTrials.length) {
          set({ practiceCursor: 0, blockCursor: 0, phase: "block-a" });
        } else {
          set({ practiceCursor: next });
        }
      },
      startBlock: (block) => set({ phase: block === "a" ? "block-a" : "block-b", blockCursor: 0 }),
      recordTrialOnset: (trialIndex, datasetId) => {
        const state = get();
        const halfLength = experimentalOrder.length / 2;
        const absoluteIndex = state.phase === "block-b" ? halfLength + trialIndex : trialIndex;
        set({
          currentTrialIndex: absoluteIndex,
          currentDatasetId: datasetId,
          currentOnsetAt: performance.now(),
        });
      },
      recordTrialResponse: async ({ trialIndex, chosen, correct, responseTimeMs, confidence }) => {
        const state = get();
        const halfLength = experimentalOrder.length / 2;
        const absoluteIndex =
          state.phase === "block-a" ? trialIndex : halfLength + trialIndex;
        const spec = experimentalOrder[absoluteIndex];
        if (!spec) return;
        const condition = conditionForTrial(state.participantIndex, absoluteIndex);
        const isCorrect = scoreTrial(spec.taskType, { chosen, correct });
        const recordedAt = Date.now();
        const response: TrialResponse = {
          trialIndex: absoluteIndex,
          taskType: spec.taskType,
          condition,
          datasetId: state.currentDatasetId ?? `trial-${absoluteIndex}`,
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
              trialIndex: absoluteIndex,
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
        const next = state.blockCursor + 1;
        const halfLength = experimentalOrder.length / 2;
        if (state.phase === "block-a" && next >= halfLength) {
          set({ blockCursor: 0, phase: "block-b" });
        } else if (state.phase === "block-b" && next >= halfLength) {
          set({ blockCursor: 0, phase: "questionnaire" });
        } else {
          set({ blockCursor: next });
        }
      },
      finishBlocks: () => set({ phase: "questionnaire" }),
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
        phase: state.phase,
        blockACondition: state.blockACondition,
        blockBCondition: state.blockBCondition,
        currentTrialIndex: state.currentTrialIndex,
        currentDatasetId: state.currentDatasetId,
        currentOnsetAt: state.currentOnsetAt,
        practiceCursor: state.practiceCursor,
        blockCursor: state.blockCursor,
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
