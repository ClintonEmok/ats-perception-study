"use client";

import { PATTERN_CHOICES, TASK_LABELS } from "@/lib/ats-study/protocol";

export interface PatternRecognitionChoiceProps {
  onChoose: (choice: (typeof PATTERN_CHOICES)[number]) => void;
  disabled?: boolean;
}

const LABELS: Record<(typeof PATTERN_CHOICES)[number], string> = {
  "uniform": "Steady activity",
  "single-burst": "One burst",
  "multi-burst": "Multiple bursts",
  "gradual-change": "Gradual change",
  "single-burst-heavy": "One heavy burst",
};

export function PatternRecognitionChoice({ onChoose, disabled }: PatternRecognitionChoiceProps) {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-label={`${TASK_LABELS.pattern} choices`}
      data-testid="pattern-recognition-choice"
    >
      <legend className="text-sm font-medium">Which best describes the pattern?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {PATTERN_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(choice)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            data-choice={choice}
          >
            {LABELS[choice]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
