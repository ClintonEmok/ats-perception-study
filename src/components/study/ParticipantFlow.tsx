"use client";

import { useEffect, useRef, useState } from "react";
import { useExperimentStore, type ConvexWrites } from "@/store/useExperimentStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { TrialRunner } from "./TrialRunner";
import { PracticeFeedback } from "./PracticeFeedback";
import { buildExperimentalTrialOrder, buildPracticeTrials, TASK_LABELS, type TaskType } from "@/lib/ats-study/protocol";
import { getVariantByDatasetId } from "@/lib/ats-study/datasets";

const EXPERIMENTAL_ORDER = buildExperimentalTrialOrder();
const PRACTICE_TRIALS = buildPracticeTrials();

const PRACTICE_DATASET_IDS = [
  "uniform-uniform--uniform",
  "single-burst-single-burst--ats",
];

const TASK_CORRECT_ANSWERS: Record<TaskType, string[]> = {
  peak: ["A", "B", "C"],
  comparison: ["first", "second"],
  pattern: ["uniform", "single-burst", "multi-burst", "gradual-change"],
};

function pickPracticeVariant(taskIndex: number) {
  const id = PRACTICE_DATASET_IDS[taskIndex] ?? PRACTICE_DATASET_IDS[0]!;
  return getVariantByDatasetId(id) ?? null;
}

function pickExperimentalVariant(trialIndex: number, blockACondition: "uniform" | "ats" | null) {
  const spec = EXPERIMENTAL_ORDER[trialIndex];
  if (!spec) return null;
  const baseId = [
    "uniform-uniform",
    "single-burst-single-burst",
    "multi-burst-multi-burst-1",
    "multi-burst-multi-burst-2",
    "gradual-change-gradual-change",
    "single-burst-heavy-single-burst-heavy",
  ][trialIndex % 6]!;
  const condition = blockACondition === "ats" && trialIndex < 12 ? "uniform" : "ats";
  return getVariantByDatasetId(`${baseId}--${condition}`);
}

export interface ParticipantFlowProps {
  convexWrites: ConvexWrites;
  participantIndex: number;
}

interface PhaseViewProps {
  feedback: { correct: boolean; chosen: string; correctAnswer: string } | null;
  setFeedback: (value: { correct: boolean; chosen: string; correctAnswer: string } | null) => void;
}

export function ParticipantFlow({ convexWrites, participantIndex }: ParticipantFlowProps) {
  const phase = useExperimentStore((state) => state.phase);
  const sessionId = useExperimentStore((state) => state.sessionId);
  const blockACondition = useExperimentStore((state) => state.blockACondition);
  const startSession = useExperimentStore((state) => state.startSession);
  const setConvexWrites = useExperimentStore((state) => state.setConvexWrites);

  const [feedback, setFeedback] = useState<{ correct: boolean; chosen: string; correctAnswer: string } | null>(null);

  // Keep the latest writes in a ref so identity churn from the parent (a
  // module-scope constant today, real Convex hooks tomorrow) doesn't restart
  // the startSession effect on every render.
  const writesRef = useRef(convexWrites);
  writesRef.current = convexWrites;

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
      <PhaseView feedback={feedback} setFeedback={setFeedback} blockACondition={blockACondition} />
    </main>
  );
}

function PhaseView({ feedback, setFeedback, blockACondition }: PhaseViewProps & { blockACondition: "uniform" | "ats" | null }) {
  const phase = useExperimentStore((state) => state.phase);
  const consentAccepted = useExperimentStore((state) => state.consentAccepted);
  const practiceCursor = useExperimentStore((state) => state.practiceCursor);
  const blockCursor = useExperimentStore((state) => state.blockCursor);
  const questionnaire = useExperimentStore((state) => state.questionnaire);
  const acceptConsent = useExperimentStore((state) => state.acceptConsent);
  const completeInstructions = useExperimentStore((state) => state.completeInstructions);
  const recordPracticeOnset = useExperimentStore((state) => state.recordPracticeOnset);
  const recordPracticeResponse = useExperimentStore((state) => state.recordPracticeResponse);
  const advancePractice = useExperimentStore((state) => state.advancePractice);
  const recordTrialOnset = useExperimentStore((state) => state.recordTrialOnset);
  const recordTrialResponse = useExperimentStore((state) => state.recordTrialResponse);
  const advanceTrial = useExperimentStore((state) => state.advanceTrial);
  const setQuestionnaireAnswer = useExperimentStore((state) => state.setQuestionnaireAnswer);
  const submitQuestionnaire = useExperimentStore((state) => state.submitQuestionnaire);
  const finishSession = useExperimentStore((state) => state.finishSession);

  if (!consentAccepted) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Informed consent</h1>
        <p className="text-sm text-slate-700">
          You will see 26 short timeline stimuli and answer questions about them. No personally identifying
          information is collected; your anonymous participant ID is generated locally in this browser.
        </p>
        <button
          type="button"
          onClick={acceptConsent}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          I consent and want to start
        </button>
      </section>
    );
  }

  if (phase === "instructions") {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Instructions</h1>
        <p className="text-sm text-slate-700">
          You will complete 2 short practice trials, then 24 experimental trials. Each trial shows a single timeline and a short question. Press a button to respond as quickly and accurately as you can.
        </p>
        <button
          type="button"
          onClick={completeInstructions}
          className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Begin practice
        </button>
      </section>
    );
  }

  if (phase === "practice") {
    const trial = PRACTICE_TRIALS[practiceCursor];
    if (!trial) return null;
    const variant = pickPracticeVariant(practiceCursor);
    if (!variant) return null;
    const correct = TASK_CORRECT_ANSWERS[trial.taskType][practiceCursor % 2] ?? "A";
    return (
      <section className="flex flex-col gap-4" data-phase="practice">
        <h2 className="text-lg font-semibold">Practice trial {practiceCursor + 1} of {PRACTICE_TRIALS.length}</h2>
        <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[trial.taskType]}</p>
        {!feedback && (
          <TrialRunner
            variant={variant}
            taskType={trial.taskType}
            correctAnswer={correct}
            onResponse={({ chosen }) => {
              const ok = chosen === correct;
              recordPracticeResponse({ chosen, correct, responseTimeMs: 0, confidence: 3 });
              setFeedback({ correct: ok, chosen, correctAnswer: correct });
            }}
            onOnset={({ datasetId }) => recordPracticeOnset(datasetId)}
          />
        )}
        {feedback && (
          <PracticeFeedback
            correct={feedback.correct}
            chosen={feedback.chosen}
            correctAnswer={feedback.correctAnswer}
            onContinue={() => {
              setFeedback(null);
              advancePractice();
            }}
          />
        )}
      </section>
    );
  }

  if (phase === "block-a" || phase === "block-b") {
    const trial = EXPERIMENTAL_ORDER[blockCursor];
    if (!trial) return null;
    const variant = pickExperimentalVariant(blockCursor, blockACondition);
    if (!variant) return null;
    const correct = TASK_CORRECT_ANSWERS[trial.taskType][0] ?? "A";
    return (
      <section className="flex flex-col gap-4" data-phase={phase}>
        <h2 className="text-lg font-semibold">
          {phase === "block-a" ? "Block A" : "Block B"} — trial {blockCursor + 1} of {EXPERIMENTAL_ORDER.length / 2}
        </h2>
        <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[trial.taskType]}</p>
        <TrialRunner
          variant={variant}
          taskType={trial.taskType}
          correctAnswer={correct}
          onResponse={({ chosen, correct, responseTimeMs, confidence }) => {
            void recordTrialResponse({
              trialIndex: blockCursor,
              chosen,
              correct,
              responseTimeMs,
              confidence,
            });
            advanceTrial();
          }}
          onOnset={({ datasetId }) => recordTrialOnset(blockCursor, datasetId)}
        />
      </section>
    );
  }

  if (phase === "questionnaire") {
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
                checked={questionnaire.preference === option}
                onChange={() => setQuestionnaireAnswer("preference", option)}
              />
              {option === "no-preference" ? "No preference" : option === "uniform" ? "Uniform" : "ATS"}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Free-text feedback
          <textarea
            value={questionnaire.freeText}
            onChange={(event) => setQuestionnaireAnswer("freeText", event.target.value)}
            rows={4}
            className="rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900"
          />
        </label>
        <button
          type="button"
          onClick={() => void submitQuestionnaire()}
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
        onClick={() => void finishSession()}
        className="self-start rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
      >
        Finish and lock responses
      </button>
    </section>
  );
}
