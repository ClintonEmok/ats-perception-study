"use client";

import { useState } from "react";
import {
  CONFIDENCE_ANCHORS,
  MIN_FREE_TEXT_CHARS,
  validateFreeText,
} from "@/lib/ats-study/questionnaire";
import { exportSessionData } from "@/lib/ats-study/export";
import { useExperimentStore } from "@/store/useExperimentStore";

export interface PostStudyQuestionnaireProps {
  onSubmit: () => void;
}

export function PostStudyQuestionnaire({ onSubmit }: PostStudyQuestionnaireProps) {
  const freeText = useExperimentStore((state) => state.questionnaire.freeText);
  const setQuestionnaireAnswer = useExperimentStore((state) => state.setQuestionnaireAnswer);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);

  const validation = validateFreeText(freeText);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validation.ok && !warningAcknowledged) {
      setWarningAcknowledged(true);
      return;
    }
    onSubmit();
  };

  return (
    <form
      className="flex flex-col gap-6"
      data-phase="questionnaire"
      data-testid="post-study-questionnaire"
      onSubmit={handleSubmit}
    >
      <header>
        <h2 className="text-lg font-semibold">Final questionnaire</h2>
        <p className="text-sm text-slate-600">
          Please take a moment to share your overall impressions. Your answers are anonymous and stored alongside
          your trial responses.
        </p>
      </header>

      <fieldset className="flex flex-col gap-2" data-testid="free-text-fieldset">
        <legend className="text-sm font-medium">Free-text feedback</legend>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          What helped or got in the way of your overall impression? (minimum {MIN_FREE_TEXT_CHARS} characters)
          <textarea
            value={freeText}
            onChange={(event) => {
              setQuestionnaireAnswer("freeText", event.target.value);
              if (warningAcknowledged) setWarningAcknowledged(false);
            }}
            rows={5}
            aria-invalid={!validation.ok}
            aria-describedby="free-text-help"
            className="rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900"
          />
        </label>
        <p id="free-text-help" className="text-xs text-slate-500" data-testid="free-text-help">
          {validation.ok
            ? `Looks good. ${freeText.length} characters.`
            : validation.reason === "empty"
              ? `Please share at least ${MIN_FREE_TEXT_CHARS} characters so the researcher has something to read.`
              : `Please add ${validation.remaining} more character${validation.remaining === 1 ? "" : "s"}.`}
        </p>
        {!validation.ok && warningAcknowledged && (
          <p className="text-xs text-amber-600" role="status" data-testid="free-text-warning">
            You can submit anyway, but the researcher would appreciate more detail.
          </p>
        )}
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Submit
        </button>
        <span className="text-xs text-slate-500" data-testid="confidence-anchor-legend">
          Per-trial confidence anchors: {CONFIDENCE_ANCHORS.join(" · ")}
        </span>
      </div>
    </form>
  );
}

export interface DebriefPanelProps {
  onStartNewRun: () => void;
  participantName: string;
}

export function DebriefPanel({ onStartNewRun, participantName }: DebriefPanelProps) {
  const displayName = participantName.trim();
  return (
    <section className="flex flex-col gap-3" data-phase="debrief">
      <h2 className="text-lg font-semibold">Thank you{displayName ? `, ${displayName}` : ""}</h2>
      <p className="text-sm text-slate-700">
        Your responses were recorded{displayName ? ` under the name "${displayName}"` : " anonymously"}. If online
        syncing failed, a backup file will download automatically.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onStartNewRun}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          data-testid="start-new-run"
        >
          Start a new run
        </button>
      </div>
    </section>
  );
}

export function buildDownloadFileName(sessionId: string | null, participantName?: string): string {
  const name = (participantName ?? "").trim();
  const idPart = (sessionId ?? "anonymous").replace(/[^a-zA-Z0-9-_]/g, "_");
  const namePart = name.length > 0 ? `${name.replace(/[^a-zA-Z0-9-_]/g, "_")}-` : "";
  return `ats-study-${namePart}${idPart}.json`;
}

export function downloadSessionResponses(): void {
  const state = useExperimentStore.getState();
  const sessionId = state.sessionId ?? "anonymous";
  const submittedAt = Date.now();
  const participantName = state.participantName.trim();
  const conditionOrder: ReadonlyArray<"uniform" | "ats"> =
    state.participantIndex % 2 === 0 ? ["uniform", "ats"] : ["ats", "uniform"];
  const sessions: Array<{
    sessionId: string;
    experimentSlug: string;
    participantIndex: number;
    participantName: string | null;
    conditionOrder: ReadonlyArray<"uniform" | "ats">;
    startedAt: number;
    finishedAt: number | null;
  }> = [
    {
      sessionId,
      experimentSlug: state.experimentSlug,
      participantIndex: state.participantIndex,
      participantName: participantName.length > 0 ? participantName : null,
      conditionOrder,
      startedAt: state.startedAt ?? submittedAt,
      finishedAt: state.finishedAt ?? submittedAt,
    },
  ];
  const trials = state.abResponses.map((r, idx) => ({
    sessionId,
    experimentSlug: state.experimentSlug,
    trialIndex: idx,
    taskType: r.taskType,
    condition: "uniform" as const,
    datasetId: r.windowKey,
    isPractice: false,
    chosen: r.choice,
    correct: r.choice,
    isCorrect: true,
    responseTimeMs: r.responseTimeMs,
    confidence: r.confidence,
    rationale: r.rationale,
    recordedAt: r.recordedAt,
  }));
  const questionnaires: Array<{
    sessionId: string;
    freeText: string;
    participantName: string | null;
    submittedAt: number;
  }> = [
    {
      sessionId,
      freeText: state.questionnaire.freeText,
      participantName: participantName.length > 0 ? participantName : null,
      submittedAt,
    },
  ];
  const result = exportSessionData({ sessions, trials, questionnaires });
  const blob = new Blob([result.combinedJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildDownloadFileName(state.sessionId, participantName);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
