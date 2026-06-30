"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useExperimentStore,
  getCurrentPracticeSpec,
} from "@/store/useExperimentStore";
import { TrialRunner } from "@/components/study/TrialRunner";
import { PracticeFeedback } from "@/components/study/PracticeFeedback";
import { TASK_LABELS } from "@/lib/ats-study/protocol";
import { getVariantByDatasetId } from "@/lib/ats-study/datasets";
import { pickCorrectAnswer } from "@/lib/ats-study/correctAnswers";
import { requireExperiment } from "@/lib/ats-study/experiments";

export interface PracticeScreenProps {
  onFinish: () => void;
}

export function PracticeScreen({ onFinish }: PracticeScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      experimentSlug: state.experimentSlug,
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

  const config = requireExperiment(view.experimentSlug);
  const practice = config.practiceTrials[view.practiceCursor] ?? null;
  const totalPractice = config.practiceTrials.length;

  useEffect(() => {
    setFeedback(null);
  }, [view.practiceCursor]);

  if (!practice) return null;
  const datasetId = `${practice.baseDatasetId}--${practice.condition}`;
  const variant = getVariantByDatasetId(datasetId);
  const correct = pickCorrectAnswer({ variant, taskType: practice.taskType });

  if (feedback) {
    return (
      <section
        className="flex flex-col gap-4"
        data-phase="practice"
        data-testid="practice-screen"
        data-experiment-slug={view.experimentSlug}
      >
        <h2 className="text-lg font-semibold">
          Practice trial {view.practiceCursor + 1} of {totalPractice}
        </h2>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {TASK_LABELS[practice.taskType]} ({practice.condition})
        </p>
        <PracticeFeedback
          correct={feedback.correct}
          chosen={feedback.chosen}
          correctAnswer={feedback.correctAnswer}
          onContinue={() => {
            setFeedback(null);
            const wasLast = view.practiceCursor + 1 >= totalPractice;
            view.advancePractice();
            if (wasLast) onFinish();
          }}
        />
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-4"
      data-phase="practice"
      data-testid="practice-screen"
      data-experiment-slug={view.experimentSlug}
    >
      <h2 className="text-lg font-semibold">
        Practice trial {view.practiceCursor + 1} of {totalPractice}
      </h2>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {TASK_LABELS[practice.taskType]} ({practice.condition})
      </p>
      <TrialRunner
        variant={variant}
        taskType={practice.taskType}
        correctAnswer={correct}
        onResponse={({ chosen }) => {
          const ok = chosen === correct;
          view.recordPracticeResponse({ chosen, correct, responseTimeMs: 0, confidence: 3 });
          setFeedback({ correct: ok, chosen, correctAnswer: correct });
        }}
        onOnset={({ datasetId: onsetDatasetId }) => view.recordPracticeOnset(onsetDatasetId)}
      />
    </section>
  );
}
