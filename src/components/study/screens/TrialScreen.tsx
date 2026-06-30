"use client";

import { useShallow } from "zustand/react/shallow";
import { useExperimentStore } from "@/store/useExperimentStore";
import { requireExperiment } from "@/lib/ats-study/experiments";
import { taskForWindow } from "@/lib/ats-study/assignment";
import { ABComparisonScreen } from "@/components/study/ABComparisonScreen";

export interface TrialScreenProps {
  onFinish: () => void;
}

export function TrialScreen({ onFinish }: TrialScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      experimentSlug: state.experimentSlug,
      trialCursor: state.trialCursor,
      participantIndex: state.participantIndex,
      advanceTrial: state.advanceTrial,
    })),
  );

  const config = requireExperiment(view.experimentSlug);
  const spec = config.windows[view.trialCursor] ?? null;
  if (!spec) return null;
  const taskType = taskForWindow(view.participantIndex, view.trialCursor);
  const isLast = view.trialCursor + 1 >= config.windows.length;

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
        onAdvance={() => {
          const nextIndex = view.trialCursor + 1;
          view.advanceTrial();
          if (nextIndex >= config.windows.length) onFinish();
        }}
      />
    </section>
  );
}
