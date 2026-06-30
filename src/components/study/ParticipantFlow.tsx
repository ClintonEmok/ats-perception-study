"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useExperimentStore, type ConvexWrites } from "@/store/useExperimentStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { TrialRunner } from "./TrialRunner";
import { PracticeFeedback } from "./PracticeFeedback";
import { DebriefPanel, PostStudyQuestionnaire, downloadSessionResponses } from "./PostStudyQuestionnaire";
import { buildExperimentalTrialOrder, buildPracticeTrials, TASK_LABELS } from "@/lib/ats-study/protocol";
import { getVariantByDatasetId } from "@/lib/ats-study/datasets";
import { conditionForTrialInBlock, type Condition } from "@/lib/ats-study/assignment";
import { pickCorrectAnswer } from "@/lib/ats-study/correctAnswers";

const EXPERIMENTAL_ORDER = buildExperimentalTrialOrder();
const PRACTICE_TRIALS = buildPracticeTrials();

const PRACTICE_DATASET_IDS = [
  "uniform-uniform--uniform",
  "single-burst-single-burst--ats",
];

const BASE_DATASETS = [
  "uniform-uniform",
  "single-burst-single-burst",
  "multi-burst-multi-burst-1",
  "multi-burst-multi-burst-2",
  "gradual-change-gradual-change",
  "single-burst-heavy-single-burst-heavy",
];

function pickPracticeVariant(taskIndex: number) {
  const id = PRACTICE_DATASET_IDS[taskIndex] ?? PRACTICE_DATASET_IDS[0]!;
  return getVariantByDatasetId(id) ?? null;
}

function pickExperimentalVariant(absoluteTrialIndex: number, condition: Condition) {
  const baseId = BASE_DATASETS[absoluteTrialIndex % BASE_DATASETS.length]!;
  return getVariantByDatasetId(`${baseId}--${condition}`);
}

export interface ParticipantFlowProps {
  convexWrites: ConvexWrites;
  participantIndex: number;
}

export function ParticipantFlow({ convexWrites, participantIndex }: ParticipantFlowProps) {
  const phase = useExperimentStore((state) => state.phase);
  const sessionId = useExperimentStore((state) => state.sessionId);
  const startSession = useExperimentStore((state) => state.startSession);
  const setConvexWrites = useExperimentStore((state) => state.setConvexWrites);

  const [feedback, setFeedback] = useState<{ correct: boolean; chosen: string; correctAnswer: string } | null>(null);

  // Hold the latest writes in a ref so identity churn from the parent (a
  // module-scope constant today, real Convex hooks tomorrow) doesn't restart
  // the startSession effect on every render. Updated in a layout effect so
  // the ref always reflects the latest prop before the startSession effect
  // runs after a render.
  const writesRef = useRef(convexWrites);
  useLayoutEffect(() => {
    writesRef.current = convexWrites;
  }, [convexWrites]);

  useEffect(() => {
    if (sessionId === null) {
      void startSession(participantIndex, writesRef.current);
      return;
    }
    setConvexWrites(writesRef.current);
  }, [sessionId, participantIndex, startSession, setConvexWrites]);

  useNavigationGuard({ active: phase !== "debrief" && phase !== "consent" });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <PhaseView feedback={feedback} setFeedback={setFeedback} />
    </main>
  );
}

interface PhaseViewProps {
  feedback: { correct: boolean; chosen: string; correctAnswer: string } | null;
  setFeedback: (value: { correct: boolean; chosen: string; correctAnswer: string } | null) => void;
}

function PhaseView({ feedback, setFeedback }: PhaseViewProps) {
  // Single shallow subscription: re-renders only when one of the picked
  // fields changes by reference. Zustand action references are stable, so
  // picking them is free.
  const view = useExperimentStore(
    useShallow((state) => ({
      phase: state.phase,
      consentAccepted: state.consentAccepted,
      practiceCursor: state.practiceCursor,
      blockCursor: state.blockCursor,
      blockACondition: state.blockACondition,
      participantIndex: state.participantIndex,
      questionnaire: state.questionnaire,
      acceptConsent: state.acceptConsent,
      completeInstructions: state.completeInstructions,
      recordPracticeOnset: state.recordPracticeOnset,
      recordPracticeResponse: state.recordPracticeResponse,
      advancePractice: state.advancePractice,
      recordTrialOnset: state.recordTrialOnset,
      recordTrialResponse: state.recordTrialResponse,
      advanceTrial: state.advanceTrial,
      setQuestionnaireAnswer: state.setQuestionnaireAnswer,
      submitQuestionnaire: state.submitQuestionnaire,
      finishSession: state.finishSession,
    })),
  );

  if (!view.consentAccepted) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Informed consent</h1>
        <p className="text-sm text-slate-700">
          You will see 26 short timeline stimuli and answer questions about them. No personally identifying
          information is collected; your anonymous participant ID is generated locally in this browser.
        </p>
        <button
          type="button"
          onClick={view.acceptConsent}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          I consent and want to start
        </button>
      </section>
    );
  }

  if (view.phase === "instructions") {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Instructions</h1>
        <p className="text-sm text-slate-700">
          You will complete 2 short practice trials, then 24 experimental trials. Each trial shows a single timeline and a short question. Press a button to respond as quickly and accurately as you can.
        </p>
        <button
          type="button"
          onClick={view.completeInstructions}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Begin practice
        </button>
      </section>
    );
  }

  if (view.phase === "practice") {
    const trial = PRACTICE_TRIALS[view.practiceCursor];
    if (!trial) return null;
    const variant = pickPracticeVariant(view.practiceCursor);
    if (!variant) return null;
    const correct = pickCorrectAnswer({ variant, taskType: trial.taskType });
    return (
      <section className="flex flex-col gap-4" data-phase="practice">
        <h2 className="text-lg font-semibold">Practice trial {view.practiceCursor + 1} of {PRACTICE_TRIALS.length}</h2>
        <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[trial.taskType]}</p>
        {!feedback && (
          <TrialRunner
            variant={variant}
            taskType={trial.taskType}
            correctAnswer={correct}
            onResponse={({ chosen }) => {
              const ok = chosen === correct;
              view.recordPracticeResponse({ chosen, correct, responseTimeMs: 0, confidence: 3 });
              setFeedback({ correct: ok, chosen, correctAnswer: correct });
            }}
            onOnset={({ datasetId }) => view.recordPracticeOnset(datasetId)}
          />
        )}
        {feedback && (
          <PracticeFeedback
            correct={feedback.correct}
            chosen={feedback.chosen}
            correctAnswer={feedback.correctAnswer}
            onContinue={() => {
              setFeedback(null);
              view.advancePractice();
            }}
          />
        )}
      </section>
    );
  }

  if (view.phase === "block-a" || view.phase === "block-b") {
    const block: "a" | "b" = view.phase === "block-a" ? "a" : "b";
    const absoluteIndex = view.phase === "block-a" ? view.blockCursor : EXPERIMENTAL_ORDER.length / 2 + view.blockCursor;
    const trial = EXPERIMENTAL_ORDER[absoluteIndex];
    if (!trial) return null;
    const condition = conditionForTrialInBlock(view.participantIndex, block, view.blockCursor);
    const variant = pickExperimentalVariant(absoluteIndex, condition);
    if (!variant) return null;
    const correct = pickCorrectAnswer({ variant, taskType: trial.taskType });
    return (
      <section className="flex flex-col gap-4" data-phase={view.phase}>
        <h2 className="text-lg font-semibold">
          {view.phase === "block-a" ? "Block A" : "Block B"} — trial {view.blockCursor + 1} of {EXPERIMENTAL_ORDER.length / 2} ({condition})
        </h2>
        <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[trial.taskType]}</p>
        <TrialRunner
          variant={variant}
          taskType={trial.taskType}
          correctAnswer={correct}
          onResponse={({ chosen, correct, responseTimeMs, confidence }) => {
            void view.recordTrialResponse({
              trialIndex: view.blockCursor,
              chosen,
              correct,
              responseTimeMs,
              confidence,
            });
            view.advanceTrial();
          }}
          onOnset={({ datasetId }) => view.recordTrialOnset(view.blockCursor, datasetId)}
        />
      </section>
    );
  }

  if (view.phase === "questionnaire") {
    return (
      <PostStudyQuestionnaire
        onSubmit={() => void view.submitQuestionnaire()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DebriefPanel onDownload={downloadSessionResponses} />
      <button
        type="button"
        onClick={() => void view.finishSession()}
        className="self-start rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        data-testid="finish-session"
      >
        Finish and lock responses
      </button>
    </div>
  );
}
