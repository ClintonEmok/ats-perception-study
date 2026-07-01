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
      advanceTrial: state.advanceTrial,
      experimentSlug: state.experimentSlug,
    })),
  );

  const spec = view.trialWindows[view.trialCursor] ?? null;
  if (!spec) return null;
  const taskType = taskForWindow(view.participantIndex, view.trialCursor);
  const isLast = view.trialCursor + 1 >= view.trialWindows.length;

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
        taskType={taskType}
        isLast={isLast}
        showEventRug
        showHoverTooltips={false}
        onAdvance={() => {
          const nextIndex = view.trialCursor + 1;
          view.advanceTrial();
          if (nextIndex >= view.trialWindows.length) onFinish();
        }}
      />
    </section>
  );
}
