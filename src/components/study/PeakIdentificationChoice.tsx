"use client";

import { PEAK_CHOICES, TASK_LABELS } from "@/lib/ats-study/protocol";

export interface PeakIdentificationChoiceProps {
  onChoose: (choice: "A" | "B" | "C") => void;
  disabled?: boolean;
}

export function PeakIdentificationChoice({ onChoose, disabled }: PeakIdentificationChoiceProps) {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-label={`${TASK_LABELS.peak} choices`}
      data-testid="peak-identification-choice"
    >
      <legend className="text-sm font-medium">Which period has the highest activity?</legend>
      <div className="flex flex-wrap gap-2">
        {PEAK_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(choice)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            data-choice={choice}
          >
            Period {choice}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
