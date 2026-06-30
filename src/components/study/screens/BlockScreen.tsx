"use client";

import { useShallow } from "zustand/react/shallow";
import { useExperimentStore } from "@/store/useExperimentStore";
import { TrialRunner } from "@/components/study/TrialRunner";
import { buildExperimentalTrialOrder, TASK_LABELS } from "@/lib/ats-study/protocol";
import { getVariantByDatasetId } from "@/lib/ats-study/datasets";
import { conditionForTrialInBlock, type Condition } from "@/lib/ats-study/assignment";
import { pickCorrectAnswer } from "@/lib/ats-study/correctAnswers";

const EXPERIMENTAL_ORDER = buildExperimentalTrialOrder();
const BASE_DATASETS = [
  "uniform-uniform",
  "single-burst-single-burst",
  "multi-burst-multi-burst-1",
  "multi-burst-multi-burst-2",
  "gradual-change-gradual-change",
  "single-burst-heavy-single-burst-heavy",
];

function pickExperimentalVariant(absoluteTrialIndex: number, condition: Condition) {
  const baseId = BASE_DATASETS[absoluteTrialIndex % BASE_DATASETS.length]!;
  return getVariantByDatasetId(`${baseId}--${condition}`);
}

export interface BlockScreenProps {
  block: "a" | "b";
  onFinish: () => void;
}

export function BlockScreen({ block, onFinish }: BlockScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      blockCursor: state.blockCursor,
      blockACondition: state.blockACondition,
      participantIndex: state.participantIndex,
      recordTrialOnset: state.recordTrialOnset,
      recordTrialResponse: state.recordTrialResponse,
      advanceTrial: state.advanceTrial,
    })),
  );

  const halfLength = EXPERIMENTAL_ORDER.length / 2;
  const absoluteIndex = block === "a" ? view.blockCursor : halfLength + view.blockCursor;
  const trial = EXPERIMENTAL_ORDER[absoluteIndex];
  if (!trial) return null;
  const condition = conditionForTrialInBlock(view.participantIndex, block, view.blockCursor);
  const variant = pickExperimentalVariant(absoluteIndex, condition);
  if (!variant) return null;
  const correct = pickCorrectAnswer({ variant, taskType: trial.taskType });

  return (
    <section className="flex flex-col gap-4" data-phase={`block-${block}`} data-testid={`block-${block}-screen`}>
      <h2 className="text-lg font-semibold">
        Block {block.toUpperCase()} — trial {view.blockCursor + 1} of {halfLength} ({condition})
      </h2>
      <p className="text-xs uppercase tracking-wide text-slate-500">{TASK_LABELS[trial.taskType]}</p>
      <TrialRunner
        variant={variant}
        taskType={trial.taskType}
        correctAnswer={correct}
        onResponse={({ chosen, correct, responseTimeMs, confidence }) => {
          const wasLast = view.blockCursor + 1 >= halfLength;
          void view.recordTrialResponse({
            trialIndex: view.blockCursor,
            chosen,
            correct,
            responseTimeMs,
            confidence,
          });
          view.advanceTrial();
          if (wasLast) onFinish();
        }}
        onOnset={({ datasetId }) => view.recordTrialOnset(view.blockCursor, datasetId)}
      />
    </section>
  );
}
