"use client";

export interface TimedSingleScreenProps {
  windowKey: string;
  shownCondition: "uniform" | "ats";
  questionNumber: number;
  totalQuestions: number;
  onAdvance: () => void;
  isLast: boolean;
}

export function TimedSingleScreen({ windowKey, questionNumber, totalQuestions }: TimedSingleScreenProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Timed question</p>
      <h2 className="text-base font-semibold text-slate-900">Comparison-only study in use</h2>
      <p>
        Timed question support is disabled. Question {questionNumber} / {totalQuestions}. Window {windowKey}.
      </p>
    </section>
  );
}
