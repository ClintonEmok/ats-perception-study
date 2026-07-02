"use client";

import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useExperimentStore } from "@/store/useExperimentStore";
import { requireExperiment } from "@/lib/ats-study/experiments";
import { selectPracticeWindows, taskForWindow } from "@/lib/ats-study/assignment";
import { ABComparisonScreen } from "@/components/study/ABComparisonScreen";

export interface PracticeScreenProps {
  onFinish: () => void;
}

export function PracticeScreen({ onFinish }: PracticeScreenProps) {
  const [practiceCursor, setPracticeCursor] = useState(0);
  const view = useExperimentStore(
    useShallow((state) => ({
      experimentSlug: state.experimentSlug,
      participantIndex: state.participantIndex,
      trialWindows: state.trialWindows,
      startTrials: state.startTrials,
    })),
  );
  const config = requireExperiment(view.experimentSlug);
  const practiceWindows = useMemo(() => selectPracticeWindows(config.windows), [config.windows]);
  const spec = practiceWindows[practiceCursor] ?? null;
  const taskType = taskForWindow(view.participantIndex, practiceCursor);

  if (!spec) return null;

  return (
    <section className="flex flex-col gap-5" data-testid="practice-screen">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Practice example</h1>
        <p className="text-sm text-slate-700">
          This example is not scored. Use it to learn the evaluation flow before the real questions begin.
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">What the evaluation measures</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Choose the option that best answers the question you are shown.</li>
            <li>Use confidence to indicate how certain you feel after each answer.</li>
            <li>The scored questions will remove the shared event rug and hover details to keep the comparison clean.</li>
            <li>You can explain your overall impressions later in the final questionnaire.</li>
          </ul>
        </div>
      </div>

      <ABComparisonScreen
        windowKey={spec.windowKey}
        windowDays={spec.windowDays}
        windowIndex={spec.windowIndex}
        questionNumber={practiceCursor + 1}
        totalQuestions={practiceWindows.length}
        taskType={taskType}
        isLast={practiceCursor + 1 >= practiceWindows.length}
        showEventRug
        showHoverTooltips
        recordResponse={false}
        onAdvance={() => {
          if (practiceCursor + 1 < practiceWindows.length) {
            setPracticeCursor((current) => current + 1);
            return;
          }
          view.startTrials();
          onFinish();
        }}
      />
    </section>
  );
}
