"use client";

import { useId, useState } from "react";
import {
  CONFIDENCE_ANCHORS,
  MIN_FREE_TEXT_CHARS,
  PREFERENCE_LABELS_5PT,
  PREFERENCE_LABELS_3WAY,
  isPreference,
  validateFreeText,
} from "@/lib/ats-study/questionnaire";
import { exportSessionData, type ExportableQuestionnaire } from "@/lib/ats-study/export";
import { useExperimentStore } from "@/store/useExperimentStore";

export interface PostStudyQuestionnaireProps {
  onSubmit: () => void;
}

export function PostStudyQuestionnaire({ onSubmit }: PostStudyQuestionnaireProps) {
  const preference = useExperimentStore((state) => state.questionnaire.preference);
  const freeText = useExperimentStore((state) => state.questionnaire.freeText);
  const setQuestionnaireAnswer = useExperimentStore((state) => state.setQuestionnaireAnswer);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const preferenceGroupId = useId();

  const validation = validateFreeText(freeText);

  const onChangePreference = (value: string) => {
    if (isPreference(value)) {
      setQuestionnaireAnswer("preference", value);
    }
  };

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
          Please take a moment to share your impressions. Your answers are anonymous and stored alongside
          your trial responses.
        </p>
      </header>

      <fieldset className="flex flex-col gap-3" data-testid="preference-5pt">
        <legend className="text-sm font-medium">Which visualization did you prefer overall?</legend>
        <div className="grid gap-2 sm:grid-cols-5" role="radiogroup" aria-labelledby={preferenceGroupId}>
          {PREFERENCE_LABELS_5PT.map((label) => {
            const inputId = `${preferenceGroupId}-${label}`;
            const isSelected = preference === label;
            return (
              <label
                key={label}
                htmlFor={inputId}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                }`}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="preference-5pt"
                  value={label}
                  checked={isSelected}
                  onChange={() => onChangePreference(label)}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">Or pick from a simpler choice</summary>
          <div className="mt-2 flex flex-col gap-1">
            {PREFERENCE_LABELS_3WAY.map((option) => {
              const isSelected = preference === option;
              return (
                <label key={option} className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="preference-3way"
                    value={option}
                    checked={isSelected}
                    onChange={() => onChangePreference(option)}
                  />
                  {option === "no-preference" ? "No preference" : option === "uniform" ? "Uniform" : "ATS"}
                </label>
              );
            })}
          </div>
        </details>
      </fieldset>

      <fieldset className="flex flex-col gap-2" data-testid="free-text-fieldset">
        <legend className="text-sm font-medium">Free-text feedback</legend>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          What helped or got in the way of your decision? (minimum {MIN_FREE_TEXT_CHARS} characters)
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
  onDownload: () => void;
}

export function DebriefPanel({ onDownload }: DebriefPanelProps) {
  return (
    <section className="flex flex-col gap-3" data-phase="debrief">
      <h2 className="text-lg font-semibold">Thank you</h2>
      <p className="text-sm text-slate-700">
        Your responses were recorded anonymously. You can download a copy of your data before you close
        this tab.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          data-testid="download-responses"
        >
          Download my responses
        </button>
        <span className="text-xs text-slate-500">JSON file with all your trial-level data.</span>
      </div>
    </section>
  );
}

export function buildDownloadFileName(sessionId: string | null): string {
  const safe = (sessionId ?? "anonymous").replace(/[^a-zA-Z0-9-_]/g, "_");
  return `ats-study-${safe}.json`;
}

export function downloadSessionResponses(): void {
  const state = useExperimentStore.getState();
  const sessionId = state.sessionId ?? "anonymous";
  const submittedAt = Date.now();
  const sessions: Array<{
    sessionId: string;
    participantIndex: number;
    conditionOrder: ReadonlyArray<"uniform" | "ats">;
    startedAt: number;
    finishedAt: number | null;
  }> = [
    {
      sessionId,
      participantIndex: state.participantIndex,
      conditionOrder: [state.blockACondition, state.blockBCondition].filter(
        (c): c is "uniform" | "ats" => c !== null,
      ),
      startedAt: state.startedAt ?? submittedAt,
      finishedAt: state.finishedAt ?? submittedAt,
    },
  ];
  const trials = state.responses.map((r) => ({
    sessionId,
    trialIndex: r.trialIndex,
    taskType: r.taskType,
    condition: r.condition,
    datasetId: r.datasetId,
    isPractice: r.isPractice,
    chosen: r.chosen,
    correct: r.correct,
    isCorrect: r.chosen === r.correct,
    responseTimeMs: r.responseTimeMs,
    confidence: r.confidence,
    recordedAt: r.recordedAt,
  }));
  const questionnaires: Array<{
    sessionId: string;
    preference: ExportableQuestionnaire["preference"];
    freeText: string;
    submittedAt: number;
  }> = [
    {
      sessionId,
      preference: state.questionnaire.preference,
      freeText: state.questionnaire.freeText,
      submittedAt,
    },
  ];
  const result = exportSessionData({ sessions, trials, questionnaires });
  const blob = new Blob([result.combinedJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildDownloadFileName(state.sessionId);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
