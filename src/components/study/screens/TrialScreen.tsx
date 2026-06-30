"use client";

import { useShallow } from "zustand/react/shallow";
import {
  useExperimentStore,
  getCurrentCondition,
} from "@/store/useExperimentStore";
import { TrialRunner } from "@/components/study/TrialRunner";
import { TASK_LABELS } from "@/lib/ats-study/protocol";
import { getVariantByDatasetId } from "@/lib/ats-study/datasets";
import { pickCorrectAnswer } from "@/lib/ats-study/correctAnswers";
import { requireExperiment } from "@/lib/ats-study/experiments";

export interface TrialScreenProps {
  onFinish: () => void;
}

export function TrialScreen({ onFinish }: TrialScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      experimentSlug: state.experimentSlug,
      trialCursor: state.trialCursor,
      participantIndex: state.participantIndex,
      recordTrialOnset: state.recordTrialOnset,
      recordTrialResponse: state.recordTrialResponse,
      advanceTrial: state.advanceTrial,
    })),
  );

  const config = requireExperiment(view.experimentSlug);
  const spec = config.experimentalTrials[view.trialCursor] ?? null;
  if (!spec) return null;
  const condition = getCurrentCondition({
    participantIndex: view.participantIndex,
    trialCursor: view.trialCursor,
  });
  const datasetId = `${spec.baseDatasetId}--${condition}`;
  const variant = getVariantByDatasetId(datasetId);
  const correct = pickCorrectAnswer({ variant, taskType: spec.taskType });

  return (
    <section
      className="flex flex-col gap-4"
      data-phase="trial"
      data-testid="trial-screen"
      data-experiment-slug={view.experimentSlug}
      data-condition={condition}
    >
      <h2 className="text-lg font-semibold">
        {config.title} — trial {view.trialCursor + 1} of {config.experimentalTrials.length} ({condition})
      </h2>
      <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[spec.taskType]}</p>
      <TrialRunner
        variant={variant}
        taskType={spec.taskType}
        correctAnswer={correct}
        onResponse={({ chosen, correct: c, responseTimeMs, confidence }) => {
          const wasLast = view.trialCursor + 1 >= config.experimentalTrials.length;
          void view.recordTrialResponse({
            trialIndex: view.trialCursor,
            chosen,
            correct: c,
            responseTimeMs,
            confidence,
          });
          view.advanceTrial();
          if (wasLast) onFinish();
        }}
        onOnset={({ datasetId: onsetDatasetId }) =>
          view.recordTrialOnset(view.trialCursor, onsetDatasetId)
        }
      />
    </section>
  );
}
