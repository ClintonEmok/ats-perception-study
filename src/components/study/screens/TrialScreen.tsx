"use client";

import { useShallow } from "zustand/react/shallow";
import { useExperimentStore } from "@/store/useExperimentStore";
import { taskForWindow } from "@/lib/ats-study/assignment";
import { ABComparisonScreen } from "@/components/study/ABComparisonScreen";

export interface TrialScreenProps {
  onFinish: () => void;
}

export function TrialScreen({ onFinish }: TrialScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      trialCursor: state.trialCursor,
      participantIndex: state.participantIndex,
      trialWindows: state.trialWindows,
      trialItems: state.trialItems,
      questionNumber: state.questionNumber,
      advanceTrial: state.advanceTrial,
      experimentSlug: state.experimentSlug,
    })),
  );

  const item = view.trialItems[view.trialCursor] ?? null;
  const spec = view.trialWindows[view.trialCursor] ?? null;
  if (!spec) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Preparing trial…
      </div>
    );
  }
  const isLast = view.trialCursor + 1 >= view.trialItems.length;

  if (!item) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Preparing trial…
      </div>
    );
  }

  return (
    <section
      className="flex flex-col gap-4"
      data-phase="trial"
      data-testid="trial-screen"
      data-experiment-slug={view.experimentSlug}
    >
      <ABComparisonScreen
        windowKey={spec.windowKey}
        windowDays={spec.windowDays}
        windowIndex={spec.windowIndex}
        questionNumber={view.questionNumber}
        totalQuestions={view.trialItems.length}
        taskType={taskForWindow(view.participantIndex, view.trialCursor)}
        isLast={isLast}
        showEventRug
        showHoverTooltips={false}
        onAdvance={() => {
          const nextIndex = view.trialCursor + 1;
          view.advanceTrial();
          if (nextIndex >= view.trialItems.length) onFinish();
        }}
      />
    </section>
  );
}
