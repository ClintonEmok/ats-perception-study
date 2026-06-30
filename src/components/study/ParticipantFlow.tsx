"use client";

import { useEffect, useMemo, useState } from "react";
import { useExperimentStore } from "@/store/useExperimentStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { TrialRunner } from "./TrialRunner";
import { PracticeFeedback } from "./PracticeFeedback";
import { buildExperimentalTrialOrder, buildPracticeTrials, TASK_LABELS, type TaskType } from "@/lib/ats-study/protocol";
import { getVariantByDatasetId } from "@/lib/ats-study/datasets";
import type { ConvexWrites } from "@/store/useExperimentStore";

const EXPERIMENTAL_ORDER = buildExperimentalTrialOrder();
const PRACTICE_TRIALS = buildPracticeTrials();

const PRACTICE_DATASET_IDS = [
  "uniform-uniform--uniform",
  "single-burst-single-burst--ats",
];

const TASK_CORRECT_ANSWERS: Record<TaskType, string[]> = useMemoFallback();

function useMemoFallback(): Record<TaskType, string[]> {
  return {
    peak: ["A", "B", "C"],
    comparison: ["first", "second"],
    pattern: ["uniform", "single-burst", "multi-burst", "gradual-change"],
  };
}

function pickPracticeVariant(taskIndex: number) {
  const id = PRACTICE_DATASET_IDS[taskIndex] ?? PRACTICE_DATASET_IDS[0]!;
  return getVariantByDatasetId(id) ?? null;
}

function pickExperimentalVariant(trialIndex: number) {
  const spec = EXPERIMENTAL_ORDER[trialIndex];
  if (!spec) return null;
  // Round-robin across base datasets so each trial index maps to a stimulus.
  const baseId = ["uniform-uniform", "single-burst-single-burst", "multi-burst-multi-burst-1", "multi-burst-multi-burst-2", "gradual-change-gradual-change", "single-burst-heavy-single-burst-heavy"][
    trialIndex % 6
  ]!;
  const condition = useExperimentStore.getState().blockACondition === "ats" && trialIndex < 12 ? "uniform" : "ats";
  return getVariantByDatasetId(`${baseId}--${condition}`);
}

export interface ParticipantFlowProps {
  convexWrites: ConvexWrites;
  participantIndex: number;
}

export function ParticipantFlow({ convexWrites, participantIndex }: ParticipantFlowProps) {
  const store = useExperimentStore();
  const [feedback, setFeedback] = useState<{ correct: boolean; chosen: string; correctAnswer: string } | null>(null);
  useNavigationGuard({ active: store.phase !== "debrief" && store.phase !== "consent" });

  useEffect(() => {
    if (store.sessionId === null) {
      void store.startSession(participantIndex, convexWrites);
    } else {
      store.setConvexWrites(convexWrites);
    }
  }, [store, participantIndex, convexWrites]);

  const phaseView = renderPhase({ store, feedback, setFeedback });

  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">{phaseView}</main>;
}

function renderPhase({
  store,
  feedback,
  setFeedback,
}: {
  store: ReturnType<typeof useExperimentStore.getState>;
  feedback: { correct: boolean; chosen: string; correctAnswer: string } | null;
  setFeedback: (value: { correct: boolean; chosen: string; correctAnswer: string } | null) => void;
}) {
  if (!store.consentAccepted) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Informed consent</h1>
        <p className="text-sm text-slate-700">
          You will see 26 short timeline stimuli and answer questions about them. No personally identifying
          information is collected; your anonymous participant ID is generated locally in this browser.
        </p>
        <button
          type="button"
          onClick={store.acceptConsent}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          I consent and want to start
        </button>
      </section>
    );
  }

  if (store.phase === "instructions") {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Instructions</h1>
        <p className="text-sm text-slate-700">
          You will complete 2 short practice trials, then 24 experimental trials. Each trial shows a single timeline and a short question. Press a button to respond as quickly and accurately as you can.
        </p>
        <button
          type="button"
          onClick={store.completeInstructions}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Begin practice
        </button>
      </section>
    );
  }

  if (store.phase === "practice") {
    const trial = PRACTICE_TRIALS[store.practiceCursor];
    if (!trial) return null;
    const variant = pickPracticeVariant(store.practiceCursor);
    if (!variant) return null;
    const correct = TASK_CORRECT_ANSWERS[trial.taskType][store.practiceCursor % 2] ?? "A";
    return (
      <section className="flex flex-col gap-4" data-phase="practice">
        <h2 className="text-lg font-semibold">Practice trial {store.practiceCursor + 1} of {PRACTICE_TRIALS.length}</h2>
        <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[trial.taskType]}</p>
        {!feedback && (
          <TrialRunner
            variant={variant}
            taskType={trial.taskType}
            correctAnswer={correct}
            onResponse={({ chosen }) => {
              const ok = chosen === correct;
              store.recordPracticeResponse({ chosen, correct, responseTimeMs: 0, confidence: 3 });
              setFeedback({ correct: ok, chosen, correctAnswer: correct });
            }}
            onOnset={({ datasetId }) => store.recordPracticeOnset(datasetId)}
          />
        )}
        {feedback && (
          <PracticeFeedback
            correct={feedback.correct}
            chosen={feedback.chosen}
            correctAnswer={feedback.correctAnswer}
            onContinue={() => {
              setFeedback(null);
              store.advancePractice();
            }}
          />
        )}
      </section>
    );
  }

  if (store.phase === "block-a" || store.phase === "block-b") {
    const trial = EXPERIMENTAL_ORDER[store.blockCursor];
    if (!trial) return null;
    const variant = pickExperimentalVariant(store.blockCursor);
    if (!variant) return null;
    const correct = TASK_CORRECT_ANSWERS[trial.taskType][0] ?? "A";
    return (
      <section className="flex flex-col gap-4" data-phase={store.phase}>
        <h2 className="text-lg font-semibold">
          {store.phase === "block-a" ? "Block A" : "Block B"} — trial {store.blockCursor + 1} of {EXPERIMENTAL_ORDER.length / 2}
        </h2>
        <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[trial.taskType]}</p>
        <TrialRunner
          variant={variant}
          taskType={trial.taskType}
          correctAnswer={correct}
          onResponse={({ chosen, correct, responseTimeMs, confidence }) => {
            void store.recordTrialResponse({
              trialIndex: store.blockCursor,
              chosen,
              correct,
              responseTimeMs,
              confidence,
            });
            store.advanceTrial();
          }}
          onOnset={({ datasetId }) => store.recordTrialOnset(store.blockCursor, datasetId)}
        />
      </section>
    );
  }

  if (store.phase === "questionnaire") {
    return (
      <section className="flex flex-col gap-4" data-phase="questionnaire">
        <h2 className="text-lg font-semibold">Final questionnaire</h2>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Which visualization did you prefer?</legend>
          {(["uniform", "ats", "no-preference"] as const).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="preference"
                value={option}
                checked={store.questionnaire.preference === option}
                onChange={() => store.setQuestionnaireAnswer("preference", option)}
              />
              {option === "no-preference" ? "No preference" : option === "uniform" ? "Uniform" : "ATS"}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Free-text feedback
          <textarea
            value={store.questionnaire.freeText}
            onChange={(event) => store.setQuestionnaireAnswer("freeText", event.target.value)}
            rows={4}
            className="rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900"
          />
        </label>
        <button
          type="button"
          onClick={() => void store.submitQuestionnaire()}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Submit
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3" data-phase="debrief">
      <h2 className="text-lg font-semibold">Thank you</h2>
      <p className="text-sm text-slate-700">Your responses were recorded anonymously. You can close this tab.</p>
      <button
        type="button"
        onClick={() => void store.finishSession()}
        className="self-start rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
      >
        Finish and lock responses
      </button>
    </section>
  );
}
