"use client";

import { useEffect, useRef, useState } from "react";
import { Timeline } from "./Timeline";
import { useStimulusTiming } from "@/hooks/useStimulusTiming";
import { PeakIdentificationChoice } from "./PeakIdentificationChoice";
import { PeriodComparisonChoice } from "./PeriodComparisonChoice";
import { PatternRecognitionChoice } from "./PatternRecognitionChoice";
import { FIXATION_MS, type TaskType } from "@/lib/ats-study/protocol";
import { CONFIDENCE_ANCHORS } from "@/lib/ats-study/questionnaire";
import type { RenderedVariant } from "@/lib/ats-study/datasets";

export interface TrialRunnerProps {
  variant: RenderedVariant;
  taskType: TaskType;
  correctAnswer: string;
  showFixation?: boolean;
  onResponse: (args: { chosen: string; correct: string; responseTimeMs: number; confidence: number }) => void;
  onOnset?: (args: { datasetId: string; onsetAt: number }) => void;
}

export function TrialRunner({ variant, taskType, correctAnswer, showFixation = true, onResponse, onOnset }: TrialRunnerProps) {
  const timing = useStimulusTiming();
  const [phase, setPhase] = useState<"fixation" | "stimulus" | "responded">(showFixation ? "fixation" : "stimulus");
  const [confidence, setConfidence] = useState<number>(3);
  const onsetFiredRef = useRef(false);
  const respondedRef = useRef(false);

  useEffect(() => {
    if (!showFixation) return undefined;
    const t = window.setTimeout(() => setPhase("stimulus"), FIXATION_MS);
    return () => window.clearTimeout(t);
  }, [showFixation]);

  useEffect(() => {
    if (phase !== "stimulus" || onsetFiredRef.current) return;
    const onsetAt = timing.source.markOnset();
    onsetFiredRef.current = true;
    onOnset?.({ datasetId: variant.datasetId, onsetAt });
  }, [phase, timing.source, onOnset, variant.datasetId]);

  const choose = (chosen: string) => {
    if (respondedRef.current || phase !== "stimulus") return;
    const responseAt = timing.source.markResponse();
    const responseTimeMs = timing.source.getResponseTimeMs() ?? Math.max(0, responseAt - (timing.onsetAt ?? responseAt));
    respondedRef.current = true;
    setPhase("responded");
    onResponse({ chosen, correct: correctAnswer, responseTimeMs, confidence });
  };

  return (
    <div className="flex flex-col gap-4" data-testid="trial-runner" data-task={taskType} data-condition={variant.condition}>
      {phase === "fixation" && (
        <div
          className="flex h-32 items-center justify-center text-2xl font-semibold text-slate-700"
          data-testid="fixation-cross"
        >
          +
        </div>
      )}
      {phase !== "fixation" && (
        <div className="flex w-full flex-col gap-4">
          <Timeline variant={variant} />
          {taskType === "peak" && <PeakIdentificationChoice onChoose={choose} disabled={phase === "responded"} />}
          {taskType === "comparison" && <PeriodComparisonChoice onChoose={choose} disabled={phase === "responded"} />}
          {taskType === "pattern" && <PatternRecognitionChoice onChoose={choose} disabled={phase === "responded"} />}
          <div className="flex items-center gap-3 text-sm text-slate-700" data-testid="confidence-scale">
            <span>Confidence:</span>
            {CONFIDENCE_ANCHORS.map((anchor, index) => {
              const value = index + 1;
              return (
                <button
                  key={anchor}
                  type="button"
                  onClick={() => setConfidence(value)}
                  aria-pressed={confidence === value}
                  aria-label={anchor}
                  title={anchor}
                  data-anchor={anchor}
                  className={`h-9 rounded-md border px-3 text-xs font-semibold ${
                    confidence === value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {anchor}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
