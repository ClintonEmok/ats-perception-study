"use client";

export interface PracticeFeedbackProps {
  correct: boolean;
  chosen: string;
  correctAnswer: string;
  onContinue: () => void;
}

export function PracticeFeedback({ correct, chosen, correctAnswer, onContinue }: PracticeFeedbackProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4"
      role="status"
      data-testid="practice-feedback"
    >
      <p className={`text-sm font-semibold ${correct ? "text-emerald-700" : "text-rose-700"}`}>
        {correct ? "Correct" : "Not quite"} — the answer was {correctAnswer}.
      </p>
      <p className="text-xs text-slate-600">You chose {chosen}.</p>
      <button
        type="button"
        onClick={onContinue}
        className="self-start rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-900 hover:bg-slate-50"
      >
        Continue
      </button>
    </div>
  );
}
