"use client";

import { TASK_LABELS } from "@/lib/ats-study/protocol";

export interface PeriodComparisonChoiceProps {
  onChoose: (choice: "first" | "second") => void;
  disabled?: boolean;
  firstLabel?: string;
  secondLabel?: string;
}

export function PeriodComparisonChoice({ onChoose, disabled, firstLabel = "First period", secondLabel = "Second period" }: PeriodComparisonChoiceProps) {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-label={`${TASK_LABELS.comparison} choices`}
      data-testid="period-comparison-choice"
    >
      <legend className="text-sm font-medium">Which period has more events?</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoose("first")}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          data-choice="first"
        >
          {firstLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoose("second")}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          data-choice="second"
        >
          {secondLabel}
        </button>
      </div>
    </fieldset>
  );
}
