"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useExperimentStore } from "@/store/useExperimentStore";
import { TrialRunner } from "@/components/study/TrialRunner";
import { PracticeFeedback } from "@/components/study/PracticeFeedback";
import { buildPracticeTrials, TASK_LABELS } from "@/lib/ats-study/protocol";
import { getVariantByDatasetId } from "@/lib/ats-study/datasets";
import { pickCorrectAnswer } from "@/lib/ats-study/correctAnswers";

const PRACTICE_TRIALS = buildPracticeTrials();
const PRACTICE_DATASET_IDS = [
  "uniform-uniform--uniform",
  "single-burst-single-burst--ats",
];

function pickPracticeVariant(taskIndex: number) {
  const id = PRACTICE_DATASET_IDS[taskIndex] ?? PRACTICE_DATASET_IDS[0]!;
  return getVariantByDatasetId(id) ?? null;
}

export interface PracticeScreenProps {
  onFinish: () => void;
}

export function PracticeScreen({ onFinish }: PracticeScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      practiceCursor: state.practiceCursor,
      recordPracticeOnset: state.recordPracticeOnset,
      recordPracticeResponse: state.recordPracticeResponse,
      advancePractice: state.advancePractice,
    })),
  );

  const [feedback, setFeedback] = useState<{
    correct: boolean;
    chosen: string;
    correctAnswer: string;
  } | null>(null);

  const trial = PRACTICE_TRIALS[view.practiceCursor];
  const variant = trial ? pickPracticeVariant(view.practiceCursor) : null;

  useEffect(() => {
    setFeedback(null);
  }, [view.practiceCursor]);

  if (!trial || !variant) return null;
  const correct = pickCorrectAnswer({ variant, taskType: trial.taskType });

  if (feedback) {
    return (
      <section className="flex flex-col gap-4" data-phase="practice" data-testid="practice-screen">
        <h2 className="text-lg font-semibold">
          Practice trial {view.practiceCursor + 1} of {PRACTICE_TRIALS.length}
        </h2>
        <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[trial.taskType]}</p>
        <PracticeFeedback
          correct={feedback.correct}
          chosen={feedback.chosen}
          correctAnswer={feedback.correctAnswer}
          onContinue={() => {
            setFeedback(null);
            const wasLast = view.practiceCursor + 1 >= PRACTICE_TRIALS.length;
            view.advancePractice();
            if (wasLast) onFinish();
          }}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4" data-phase="practice" data-testid="practice-screen">
      <h2 className="text-lg font-semibold">
        Practice trial {view.practiceCursor + 1} of {PRACTICE_TRIALS.length}
      </h2>
      <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[trial.taskType]}</p>
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
    </section>
  );
}
