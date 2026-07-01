"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useExperimentStore } from "@/store/useExperimentStore";
import { DebriefPanel, downloadSessionResponses } from "@/components/study/PostStudyQuestionnaire";

export interface DebriefScreenProps {
  onNewRun: () => void;
  onFinish: () => void;
}

export function DebriefScreen({ onNewRun, onFinish }: DebriefScreenProps) {
  const view = useExperimentStore(
    useShallow((state) => ({
      participantName: state.participantName,
      finishSession: state.finishSession,
      reset: state.reset,
      fallbackDownloadQueued: state.fallbackDownloadQueued,
      clearFallbackDownload: state.clearFallbackDownload,
    })),
  );

  useEffect(() => {
    if (!view.fallbackDownloadQueued) return;
    downloadSessionResponses();
    view.clearFallbackDownload();
  }, [view]);

  const finishAndClose = async () => {
    await view.finishSession();
    if (useExperimentStore.getState().fallbackDownloadQueued) {
      downloadSessionResponses();
      view.clearFallbackDownload();
    }
    onFinish();
  };

  return (
    <div className="flex flex-col gap-3" data-phase="debrief" data-testid="debrief-screen">
      <DebriefPanel
        onStartNewRun={() => {
          view.reset();
          onNewRun();
        }}
        participantName={view.participantName}
      />
      <button
        type="button"
        onClick={() => void finishAndClose()}
        className="self-start rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        data-testid="finish-session"
      >
        Finish and lock responses
      </button>
    </div>
  );
}
