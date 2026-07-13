"use client";

/**
 * Phase 80 — Evaluation shell.
 *
 * The top-level client component for the `/evaluation` route. Renders:
 *
 *   - `EvaluationHeader` — the researcher-controlled header band
 *     described in `EvaluationHeader.tsx`.
 *   - `DashboardDemoShell` — the existing demo workspace, imported
 *     unchanged. The shell owns the inner layout (map, cube, timeline,
 *     right rail) so the evaluation overlays never have to re-implement
 *     them.
 *   - Step-aware overlays:
 *     - `EvaluationTrainingGate` for the `training` step
 *     - `EvaluationTaskCard` for the `tasks-a` / `tasks-b` steps
 *     - `EvaluationQuestionnaire` for `questionnaire-a` / `questionnaire-b`
 *     - `InterviewPrompt` for the `interview` step
 *     - `DoneScreen` for the `done` step
 *
 * The shell also handles the participant-mode disabled affordances
 * (D-03). Slice editing, STKDE param controls, warp source switching,
 * generation actions, and any draft-application actions are all
 * rendered with 40% opacity, non-focusable, and disabled while the
 * participant is taking the study. The helper strip is rendered at the
 * top of the right rail tabs in `DashboardDemoRailTabs` via a CSS
 * variable (`--evaluation-locked`) that this component sets.
 *
 * The shell does NOT mount the `OnboardingTour` directly — that lives
 * in the root layout. The shell only dispatches the
 * `gsd:start-evaluation-training-tour` window event when the researcher
 * clicks the training tour button.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, PartyPopper, RotateCcw, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardDemoShell } from "@/components/dashboard-demo/DashboardDemoShell";
import { EvaluationHeader } from "@/components/evaluation/EvaluationHeader";
import { EvaluationTrainingGate } from "@/components/evaluation/EvaluationTrainingGate";
import { EvaluationTaskCard } from "@/components/evaluation/EvaluationTaskCard";
import { EvaluationQuestionnaire } from "@/components/evaluation/EvaluationQuestionnaire";
import { useEvaluationStudyStore } from "@/store/useEvaluationStudyStore";
import { useDashboardDemoCoordinationStore } from "@/store/useDashboardDemoCoordinationStore";

const EVAL_LOCK_STYLE_VAR = "--evaluation-locked";
const TRAINING_TOUR_EVENT = "gsd:start-evaluation-training-tour";

/**
 * Set the `--evaluation-locked` CSS custom property on the route root
 * so the existing `DashboardDemoRailTabs` can render its helper strip
 * in the right rail. Setting via CSS variable keeps the demo shell
 * untouched.
 */
function useEvaluationLockStyle() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue(EVAL_LOCK_STYLE_VAR);
    root.style.setProperty(EVAL_LOCK_STYLE_VAR, "1");
    return () => {
      root.style.setProperty(EVAL_LOCK_STYLE_VAR, previous);
    };
  }, []);
}

/**
 * Ensure a study session exists on entry to `/evaluation`. If the
 * participant closes the tab and returns later, the persisted slice
 * re-hydrates the session; otherwise the welcome step provides the
 * start controls in the header.
 */
function useEnsureSessionBootstrap() {
  const hasActiveSession = useEvaluationStudyStore((state) => state.sessionId.length > 0);
  useEffect(() => {
    if (hasActiveSession) return;
    // No-op: the header renders the welcome controls. This hook exists
    // so the shell can place side-effects (e.g. telemetry) when a
    // visitor lands on /evaluation for the first time.
  }, [hasActiveSession]);
}

export function EvaluationShell() {
  useEvaluationLockStyle();
  useEnsureSessionBootstrap();

  const router = useRouter();
  const currentStep = useEvaluationStudyStore((state) => state.currentStep);
  const participantId = useEvaluationStudyStore((state) => state.participantId);
  const blockOrder = useEvaluationStudyStore((state) => state.blockOrder);
  const endSession = useEvaluationStudyStore((state) => state.endSession);
  const resetForNewSession = useEvaluationStudyStore((state) => state.resetForNewSession);

  // Force a fresh coordination store state on mount so the demo shell
  // opens on the scan rail with linear time-scale and warp factor 0.
  useEffect(() => {
    const coordination = useDashboardDemoCoordinationStore.getState();
    coordination.resetWarp();
    coordination.resetAnalysis();
    coordination.setActiveRailTab("scan");
    coordination.setActiveSliceIndex(0);
  }, []);

  const handleRerunTraining = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(TRAINING_TOUR_EVENT));
  };

  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <EvaluationHeader />

      <div className="relative min-h-0 flex-1">
        <DashboardDemoShell />

        {/* Step-aware overlays — pointer-events-none on the wrapper, the
            overlay content re-enables pointer events as needed. */}
        <EvaluationTrainingGate />
        <EvaluationTaskCard />
        <EvaluationQuestionnaire />
        {currentStep === "interview" ? <InterviewPrompt /> : null}
        {currentStep === "done" ? (
          <DoneScreen
            participantId={participantId}
            blockOrder={blockOrder}
            onRestart={resetForNewSession}
            onEndSession={endSession}
            onReturnHome={() => {
              router.push("/");
            }}
          />
        ) : null}
        {currentStep === "welcome" ? <WelcomeScreen onRerunTraining={handleRerunTraining} /> : null}
      </div>
    </div>
  );
}

function WelcomeScreen({ onRerunTraining }: { onRerunTraining: () => void }) {
  return (
      <div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm"
        aria-label="welcome overlay"
      >
        <Card className="pointer-events-auto w-full max-w-[520px] border-border bg-card text-card-foreground shadow-2xl">
        <CardHeader>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
            Step 1 of 8
          </span>
          <CardTitle className="text-base font-semibold text-foreground">
            No session in progress
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter a participant ID, then select <strong>Start session</strong> in the
            header to unlock training, tasks, and questionnaires for this participant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Use the header&apos;s <strong>Start session</strong> button to begin. The
            session id, block order, and elapsed timer will appear in the header
            chrome. Training must be completed before the task steps become
            accessible.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRerunTraining}
              className="h-8 px-3 text-[12px] font-semibold"
            >
              <RotateCcw className="size-3" />
              Preview training tour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InterviewPrompt() {
  return (
      <div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm"
        aria-label="interview overlay"
      >
        <Card className="pointer-events-auto w-full max-w-[520px] border-border bg-card text-card-foreground shadow-2xl">
        <CardHeader>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
            Step 7 of 8
          </span>
          <CardTitle className="text-base font-semibold text-foreground">
            Post-session interview
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Conduct the open-ended interview. Use the paper backup form for
            note-taking; advance when finished.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="ml-4 list-disc space-y-1 text-[12px] text-muted-foreground">
            <li>What stood out about each condition?</li>
            <li>Which interactions felt natural? Which felt forced?</li>
            <li>Did you notice the unlabeled toggle? When did you try it?</li>
            <li>How confident were you in the per-condition questionnaires?</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

interface DoneScreenProps {
  participantId: string | null;
  blockOrder: 'A->B' | 'B->A' | null;
  onRestart: () => void;
  onEndSession: () => void;
  onReturnHome: () => void;
}

function DoneScreen({ participantId, blockOrder, onRestart, onEndSession, onReturnHome }: DoneScreenProps) {
  return (
      <div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        aria-label="session complete overlay"
      >
        <Card className="pointer-events-auto w-full max-w-[520px] border-border bg-card text-card-foreground shadow-2xl">
        <CardHeader>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
            Step 8 of 8
          </span>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <PartyPopper className="size-4 text-violet-300" />
            Session complete
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Thank the participant and release them. All task and questionnaire
            writes have been mirrored to the local study database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-2 text-[12px]">
            <dt className="font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Participant
            </dt>
            <dd className="font-mono text-foreground">{participantId ?? "—"}</dd>
            <dt className="font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Block order
            </dt>
            <dd className="font-mono text-foreground">{blockOrder ?? "—"}</dd>
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onRestart}
              className="h-9 px-3 text-[12px] font-semibold"
            >
              <RotateCcw className="size-3" />
              Reset for next participant
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onEndSession}
              className="h-9 px-3 text-[12px] font-semibold"
            >
              <Square className="size-3" />
              End session
            </Button>
            <Button
              type="button"
              onClick={onReturnHome}
              className="h-9 px-3 text-[12px] font-semibold"
            >
              <ClipboardList className="size-3" />
              Return home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
