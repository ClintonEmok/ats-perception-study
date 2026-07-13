"use client";

/**
 * Phase 80 — Floating task card.
 *
 * A non-blocking 360px floating overlay anchored to the top-left of the
 * evaluation workspace (just below the header). Shows the current task
 * prompt during the `tasks-a` and `tasks-b` steps. Renders the four
 * tasks for the active condition in the fixed within-condition order
 * `T4 -> T1 -> T2 -> T3` (per `STUDY_TASK_ORDER`).
 *
 * Progression gating (per the plan):
 *   1. Researcher types the participant's answer and clicks
 *      "Record answer" — this calls `startTask` if not already running.
 *   2. The 1-5 confidence slider is revealed. Researcher drags it to
 *      the participant's reported confidence and clicks "Record confidence".
 *   3. `completeTask` is called on the evaluation store with the
 *      answer, accuracy (0/1), confidence, and completion time.
 *   4. When ALL four tasks in the current condition are complete, the
 *      "Advance to questionnaire" CTA is enabled. This calls
 *      `advanceStep` to move to the matching questionnaire.
 *
 * The card never references `Uniform` or `Adaptive` in any participant-
 * facing copy. The condition itself is derived from the evaluation
 * store and used only for trial-write metadata.
 */

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, ListChecks, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  selectActiveBlock,
  selectActiveCondition,
  useEvaluationStudyStore,
  type TaskProgress,
} from "@/store/useEvaluationStudyStore";
import {
  STUDY_TASKS,
  STUDY_TASK_ORDER,
  type StudyTaskId,
} from "@/lib/study/protocol";

const CONTAINER_WIDTH_PX = 360;
const NARROW_WIDTH_PX = 320;

interface TaskCardProps {
  /** When true, hides the action footer (used while transitioning to questionnaire). */
  readOnly?: boolean;
}

export function EvaluationTaskCard({ readOnly = false }: TaskCardProps) {
  const currentStep = useEvaluationStudyStore((state) => state.currentStep);
  const activeBlock = useEvaluationStudyStore(selectActiveBlock);
  const activeCondition = useEvaluationStudyStore(selectActiveCondition);
  const taskProgress = useEvaluationStudyStore((state) => state.taskProgress);
  const advanceStep = useEvaluationStudyStore((state) => state.advanceStep);
  const startTask = useEvaluationStudyStore((state) => state.startTask);
  const completeTask = useEvaluationStudyStore((state) => state.completeTask);
  const submitStudyIntent = useEvaluationStudyStore((state) => state.submitStudyIntent);
  const sessionId = useEvaluationStudyStore((state) => state.sessionId);
  const participantId = useEvaluationStudyStore((state) => state.participantId);

  const [draftAnswer, setDraftAnswer] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(3);
  const [accuracy, setAccuracy] = useState<0 | 1>(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState<string>("");
  const [prevResetKey, setPrevResetKey] = useState<string>(resetKey);

  // Reset local state when the active task changes. The "store
  // information from previous renders" pattern avoids the cascading
  // setState-in-effect lint and keeps the inputs deterministic.
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setDraftAnswer("");
    setConfidence(3);
    setAccuracy(0);
    setStartedAt(null);
  }

  // Determine the current task to display.
  const block = activeBlock;
  const isTaskStep = currentStep === "tasks-a" || currentStep === "tasks-b";
  const blockProgress = block && taskProgress[block] ? taskProgress[block] : null;

  const currentTaskId = useMemo<StudyTaskId | null>(() => {
    if (!isTaskStep || !blockProgress) return null;
    for (const taskId of STUDY_TASK_ORDER) {
      const progress = blockProgress[taskId];
      if (!progress) continue;
      if (progress.state !== "completed") return taskId;
    }
    return null;
  }, [blockProgress, isTaskStep]);

  // Derive a stable key from (block, currentTaskId) so the draft form
  // resets when the participant moves to the next task.
  const nextResetKey = `${activeBlock ?? "none"}|${currentTaskId ?? "none"}`;
  if (nextResetKey !== resetKey && currentTaskId) {
    setResetKey(nextResetKey);
  }

  const allComplete = useMemo(() => {
    if (!isTaskStep || !blockProgress) return false;
    return STUDY_TASK_ORDER.every((taskId) => {
      const progress = blockProgress[taskId];
      return progress?.state === "completed";
    });
  }, [blockProgress, isTaskStep]);

  if (!isTaskStep || !block || !currentTaskId) return null;

  const task = STUDY_TASKS[currentTaskId];
  const progress: TaskProgress | undefined = blockProgress?.[currentTaskId];
  const trialOrder = STUDY_TASK_ORDER.indexOf(currentTaskId) + 1;
  const taskPositionLabel = `Task ${trialOrder} of ${STUDY_TASK_ORDER.length}`;
  const showAnswerStage = progress?.state === "not-started" || progress?.state === "in-progress";
  const showConfidenceStage =
    progress?.state === "in-progress" && typeof draftAnswer === "string" && draftAnswer.trim().length > 0 && startedAt !== null;

  const handleRecordAnswer = () => {
    if (!block) return;
    if (draftAnswer.trim().length === 0) return;
    const now = Date.now();
    if (progress?.state === "not-started" || !progress?.startedAt) {
      startTask(block, currentTaskId);
      setStartedAt(now);
    } else if (!startedAt) {
      setStartedAt(progress.startedAt ?? now);
    }
  };

  const handleRecordConfidence = async () => {
    if (!block) return;
    const now = Date.now();
    const startTime = startedAt ?? progress?.startedAt ?? now;
    const completionTimeMs = Math.max(0, now - startTime);
    completeTask({
      block,
      taskId: currentTaskId,
      answerText: draftAnswer.trim(),
      accuracy,
      confidence,
      completionTimeMs,
    });
    if (sessionId && participantId && activeCondition) {
      // Mirror to the acknowledged DuckDB write path so the trial
      // shows up in the descriptive analysis even if the researcher
      // closes the tab.
      const intentId = `trial-${sessionId}-${block}-${currentTaskId}`;
      const trialOrderValue = STUDY_TASK_ORDER.indexOf(currentTaskId) + 1;
      const blockOrderValue = block === "A" ? 1 : 2;
      void submitStudyIntent(intentId, {
        kind: "trial-complete",
        sessionId,
        participantId,
        block,
        condition: activeCondition,
        blockOrder: blockOrderValue,
        trialOrder: trialOrderValue,
        taskId: currentTaskId,
        answerText: draftAnswer.trim(),
        accuracy,
        completionTimeMs,
        confidence,
        warpFactor: 0,
        startedAt: startTime,
        completedAt: now,
      });
    }
  };

  const handleAdvanceToQuestionnaire = () => {
    if (!allComplete) return;
    advanceStep();
  };

  return (
    <div
      className="pointer-events-none absolute left-6 top-6 z-30"
      style={{ width: `min(${CONTAINER_WIDTH_PX}px, calc(100vw - 48px))` }}
      data-testid="evaluation-task-card"
    >
      <div
        className={cn(
          "pointer-events-auto rounded-lg border border-border bg-card/95 text-card-foreground shadow-2xl backdrop-blur",
          "max-w-[calc(100vw-48px)]",
        )}
        style={{ maxWidth: NARROW_WIDTH_PX }}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ListChecks className="size-3.5 text-violet-300" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current task
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-muted-foreground">
            {taskPositionLabel}
          </span>
        </header>

        <div className="space-y-3 px-4 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">{task.shortLabel}</h3>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {task.id}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">{task.prompt}</p>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.18em] text-muted-foreground">Time range</span>
              <span className="font-mono text-foreground">{task.timeRange}</span>
            </div>
            {task.comparisonRange ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="uppercase tracking-[0.18em] text-muted-foreground">Compare against</span>
                <span className="font-mono text-foreground">{task.comparisonRange}</span>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="eval-task-answer"
              className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Participant answer
            </label>
            <textarea
              id="eval-task-answer"
              value={draftAnswer}
              onChange={(event) => setDraftAnswer(event.target.value)}
              placeholder="Type the participant's answer verbatim"
              disabled={readOnly || progress?.state === "completed"}
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 px-2 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Accuracy
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAccuracy(0)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                    accuracy === 0
                      ? "border-violet-500/70 bg-violet-500/15 text-violet-100"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/80",
                  )}
                  disabled={readOnly || progress?.state === "completed"}
                >
                  0 — Off
                </button>
                <button
                  type="button"
                  onClick={() => setAccuracy(1)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                    accuracy === 1
                      ? "border-violet-500/70 bg-violet-500/15 text-violet-100"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/80",
                  )}
                  disabled={readOnly || progress?.state === "completed"}
                >
                  1 — On
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 px-2 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Confidence
              </span>
              <div className="flex items-center gap-2">
                <Slider
                  value={[confidence]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    if (typeof next === "number" && next >= 1 && next <= 5) {
                      setConfidence(next);
                    }
                  }}
                  disabled={readOnly || !showConfidenceStage}
                  aria-label="Participant confidence 1-5"
                />
                <span className="font-mono text-sm font-semibold text-foreground">
                  {confidence}
                </span>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleRecordAnswer}
            disabled={readOnly || draftAnswer.trim().length === 0}
            className="h-8 px-3 text-[12px] font-semibold"
          >
            <Play className="size-3" />
            Record answer
          </Button>
          {showAnswerStage && !showConfidenceStage ? (
            <span className="text-[11px] text-muted-foreground">Type an answer to continue.</span>
          ) : null}
          {showConfidenceStage ? (
            <Button
              type="button"
              onClick={() => {
                void handleRecordConfidence();
              }}
              className="h-8 px-3 text-[12px] font-semibold"
            >
              <Pause className="size-3" />
              Record confidence
            </Button>
          ) : null}
          {progress?.state === "completed" ? (
            allComplete ? (
              <Button
                type="button"
                onClick={handleAdvanceToQuestionnaire}
                className="h-8 px-3 text-[12px] font-semibold"
              >
                <ChevronRight className="size-3" />
                Advance to questionnaire
              </Button>
            ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <CheckCircle2 className="size-3 text-violet-300" />
                {currentTaskId} recorded
              </span>
            )
          ) : null}
        </footer>
      </div>
    </div>
  );
}
