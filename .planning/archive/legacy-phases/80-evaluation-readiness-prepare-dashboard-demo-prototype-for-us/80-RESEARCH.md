# Phase 80: Evaluation Readiness — Research

**Researched:** 2026-06-19
**Domain:** Evaluation-session architecture for the `dashboard-demo` prototype
**Confidence:** HIGH

## Summary

Phase 80 is not a visualization feature phase; it is a controlled-experiment shell phase. The codebase already has the core pieces needed to host the study — `DashboardDemoShell`, adaptive condition state in `useDashboardDemoCoordinationStore`, a basic `useStudyStore`, a batching logger, and an onboarding tour — but they are not structured for a researcher-run within-subjects study. The current study stack is minimal, schema-less, and dashboard-only.

The standard approach for this codebase is: keep `DashboardDemoShell` intact as the rendering surface, add a dedicated `/evaluation` route that overlays evaluation chrome on top of it, manage the study as a single Zustand-bound flow store with slices, and replace free-form JSONL logging with flat DuckDB-backed fact tables plus explicit API contracts. Do not introduce a second frontend architecture, a separate app shell, or a new data store.

The biggest planning constraint is layout/state isolation. `DashboardDemoShell` hardcodes `h-screen` and its own internal header, while several demo stores persist across sessions (`useStudyStore`, `useSliceDomainStore`, map layer state, presets). Planning must explicitly include reset/lockdown work so participant sessions start from a known state and do not inherit prior demo edits.

**Primary recommendation:** Build `/evaluation` as an overlay frame around `DashboardDemoShell`, backed by one evaluation-specific Zustand store and flat DuckDB study tables (`sessions`, `trials`, `questionnaire_responses`, `condition_events`) written through a Node runtime route.

## Current Code Map + Gaps

| Area | Current code | What exists now | Phase 80 gap |
|---|---|---|---|
| Dedicated evaluation route | `src/app/dashboard-demo/page.tsx` | Demo route just returns `<DashboardDemoShell />` | No `/evaluation` route, no evaluation header, no stepper, no route-local study shell |
| Demo workspace host | `src/components/dashboard-demo/DashboardDemoShell.tsx` | Stable full-screen shell with map/3D toggle, internal header, rail tabs, timeline | No safe evaluation wrapper, no participant lock mode, internal `Generate` header conflicts with evaluation chrome |
| Condition state | `src/store/useDashboardDemoCoordinationStore.ts` | `timeScaleMode`, `warpFactor`, `setTimeScaleMode`, `setWarpFactor`, `resetWarp`, `resetAnalysis` | No condition sequencing, no counterbalanced block orchestration, no event logging hooks |
| Study session UI | `src/components/study/StudyControls.tsx` | Floating open/close panel with start/end session | Wrong route, wrong UX, no phase flow, no questionnaires, no training control |
| Study session state | `src/store/useStudyStore.ts` | Persisted `sessionId`, `participantId`, `startTime` only | No step flow, task tracking, block order, answers, confidence, questionnaires, save status |
| Logging client | `src/lib/logger.ts` | Buffered event queue + `sendBeacon`/`fetch` flush | Untyped payloads, no retry/requeue, no save acknowledgements, no structured study schema |
| Logging API | `src/app/api/study/log/route.ts` | Appends arbitrary event batches to `logs/study-sessions.jsonl` | No DuckDB writes, no validation, no tables, no flat analytics-ready schema |
| Training | `src/components/onboarding/OnboardingTour.tsx` | Driver.js tour auto-runs on `/dashboard*`, localStorage gate `hasSeenTour` | Wrong route targeting, wrong steps, auto-run behavior unsuitable for researcher-controlled training |
| Evaluation protocol docs | `80-CONTEXT.md`, `80-UI-SPEC.md`, `EVALUATION_PROTOCOL.md`, `EVALUATION_FORMS.md` | Locked decisions and UI contract exist | Source mismatch on questionnaire counts; `chapters/07_evaluation/` is missing from repo |

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| Next.js App Router | 16.1.6 | Dedicated `/evaluation` route and study API routes | Already the app shell; official file-system routing and Node route handlers fit Phase 80 cleanly |
| Zustand | 5.0.10 | Evaluation session/flow/task/questionnaire state | Already the project state pattern; official slices + persist middleware cover this use case |
| DuckDB | 1.4.4 | Local structured storage for study facts | Matches the offline analytics model and thesis analysis workflow |
| driver.js | 1.4.0 | Researcher-triggered training tour | Already installed and already used for onboarding |

### Supporting
| Library | Version | Purpose | When to Use |
|---|---|---|---|
| shadcn/ui + Radix | existing | Header, stepper chips, dialogs, sliders, switch, scroll area | All evaluation-specific chrome and in-app forms |
| Sonner | 2.0.7 | Save/error feedback | Non-blocking researcher feedback for failed writes/retries |
| `src/lib/db.ts` | current | Shared DuckDB bootstrap | Reuse for study table creation and inserts rather than opening a second DB path |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| Route-local evaluation overlay around `DashboardDemoShell` | Fork `DashboardDemoShell` into a second page shell | Faster to hack, but high regression/drift risk against locked D-01 |
| Existing Zustand stack | React context/reducer or xstate | Adds a second state pattern to the repo with no strong payoff |
| Flat DuckDB tables | NDJSON files only | Easier initially, but poor for paired SQL summaries and violates D-15/D-16 intent |

**Installation:**
```bash
# No new packages required for the recommended baseline.
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── app/
│   ├── evaluation/
│   │   └── page.tsx                 # Dedicated route entry
│   └── api/study/
│       ├── session/route.ts         # start/end session writes
│       ├── trial/route.ts           # task/confidence writes
│       ├── questionnaire/route.ts   # NASA/Likert writes
│       └── event/route.ts           # condition toggle / warp changes
├── components/
│   ├── evaluation/
│   │   ├── EvaluationShell.tsx      # overlays header + task/forms on demo shell
│   │   ├── EvaluationHeader.tsx     # participant/session/stepper/researcher zone
│   │   ├── EvaluationTaskCard.tsx   # floating task card + confidence capture
│   │   ├── EvaluationQuestionnaire.tsx
│   │   └── EvaluationTrainingGate.tsx
│   └── study/
│       └── ...                      # keep current generic study utilities only if still shared
├── lib/
│   └── study/
│       ├── schema.ts                # payload validators/types
│       ├── storage.ts               # DuckDB DDL + insert helpers
│       ├── condition-order.ts       # A→B / B→A assignment helpers
│       └── scoring.ts               # trial normalization, timestamps, accuracy helpers
└── store/
    └── useEvaluationStudyStore.ts   # bound Zustand store with slices
```

### Pattern 1: Route-local overlay frame, not a shell fork
**What:** Render `DashboardDemoShell` as the study workspace and place evaluation-only UI in a top-level overlay frame.

**When to use:** Always for `/evaluation`; do not modify `/dashboard-demo` behavior.

**Why this pattern fits:** `DashboardDemoShell` already owns viewport composition and demo store wiring. Phase 80 needs orchestration and restrictions, not a second visualization shell.

**Code example:**
```tsx
// Source: Next.js App Router pages, /vercel/next.js/v16.1.6
import { DashboardDemoShell } from '@/components/dashboard-demo/DashboardDemoShell';
import { EvaluationShell } from '@/components/evaluation/EvaluationShell';

export default function Page() {
  return (
    <EvaluationShell>
      <DashboardDemoShell />
    </EvaluationShell>
  );
}
```

**Codebase-specific guidance:**
- Make `EvaluationShell` full-screen and absolute/fixed.
- Overlay the evaluation header on the same top band that `DashboardDemoShell` already uses instead of stacking a second vertical header above a `h-screen` child.
- Use route-local masking/lockdown layers for researcher/participant affordances rather than forking the demo shell.

### Pattern 2: One bound evaluation store with slices
**What:** Keep all session flow in one Zustand store, split by concern: `sessionSlice`, `phaseFlowSlice`, `taskSlice`, `questionnaireSlice`, `trainingSlice`, `saveStatusSlice`.

**When to use:** For all evaluation-only state that coordinates multiple surfaces.

**Why this pattern fits:** The repo already uses Zustand and slice composition. Planner should not scatter study flow across multiple ad hoc stores.

**Code example:**
```ts
// Source: Zustand slices pattern + persist docs, /pmndrs/zustand/v5.0.12
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useEvaluationStudyStore = create<EvaluationStudyState>()(
  persist(
    (...a) => ({
      ...createSessionSlice(...a),
      ...createPhaseFlowSlice(...a),
      ...createTaskSlice(...a),
      ...createQuestionnaireSlice(...a),
      ...createTrainingSlice(...a),
      ...createSaveStatusSlice(...a),
    }),
    {
      name: 'evaluation-study-v1',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        participantId: state.participantId,
        currentStep: state.currentStep,
      }),
    },
  ),
);
```

**Codebase-specific guidance:**
- Persist only crash-recovery essentials; do **not** persist full task answers/questionnaire drafts unless there is an explicit recovery design.
- Prefer `sessionStorage`, not `localStorage`, for the evaluation store to avoid cross-participant leakage.
- Keep demo visualization state in existing stores; keep study orchestration in the new evaluation store.

### Pattern 3: Flat fact tables, not nested event blobs
**What:** Write each analytic unit as a row in DuckDB.

**When to use:** All task outcomes, questionnaire answers, condition toggles, warp adjustments, and session lifecycle events.

**Recommended tables:**
- `study_sessions`
- `study_trials`
- `study_questionnaire_responses`
- `study_condition_events`

**Why this pattern fits:** D-15 requires SQL-friendly descriptive analysis. Flat rows are much easier to query than NDJSON payloads.

**Example DDL direction:**
```sql
-- Source: codebase recommendation derived from current DuckDB usage in src/lib/db.ts
CREATE TABLE IF NOT EXISTS study_trials (
  session_id TEXT,
  participant_id TEXT,
  condition TEXT,
  block_order INTEGER,
  trial_order INTEGER,
  task_id TEXT,
  answer_text TEXT,
  accuracy INTEGER,
  completion_time_ms BIGINT,
  confidence INTEGER,
  warp_factor DOUBLE,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Anti-Patterns to Avoid
- **Forking `DashboardDemoShell`:** creates long-term drift and violates D-01.
- **Using the existing JSONL logger as-is:** no schema, no acknowledgement, no SQL-ready analysis.
- **Persisting participant flow in `localStorage` by default:** leaks prior participant state into later sessions.
- **Encoding questionnaires as one nested JSON column:** harder to validate, harder to summarize, and unnecessary in DuckDB.
- **Letting participants access current demo editing controls:** violates D-03 and threatens task comparability.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Route setup | Custom client-side router gate | Next.js `app/evaluation/page.tsx` | App Router already provides the dedicated route model |
| Study state | Bespoke event bus | Zustand bound store with slices | Matches repo patterns and keeps selectors/actions testable |
| Training walkthrough | Custom tooltip/tour engine | Existing `driver.js` integration | Already installed; supports step config, callbacks, and custom popover classes |
| Local study storage | New SQLite/JSON file subsystem | Existing DuckDB bootstrap in `src/lib/db.ts` | Keeps analytics in the same local DB model |
| Form controls | Hand-built sliders/switches/dialogs | Existing shadcn/Radix `Slider`, `Switch`, `Dialog`, `ScrollArea` | Accessibility and keyboard behavior already solved |

**Key insight:** Phase 80 is mostly orchestration. Reuse the existing demo shell, existing Zustand pattern, existing DuckDB bootstrap, and existing tour library; only add the study-specific layer around them.

## Common Pitfalls

### Pitfall 1: Layout collision with `DashboardDemoShell`
**What goes wrong:** `/evaluation` adds a new header above a child that already uses `h-screen` and its own header, causing overflow, clipped workspace, or double chrome.
**Why it happens:** `DashboardDemoShell.tsx` hardcodes `main` as `h-screen w-screen` and renders its own top header with `Generate`.
**How to avoid:** Treat evaluation chrome as an overlay replacement for the shell header band, not a second stacked page header.
**Warning signs:** Double top bars, vertical scrollbars, or the timeline pushed off-screen.

### Pitfall 2: Participant state leakage between sessions
**What goes wrong:** New participants inherit slices, map layer toggles, presets, or prior session IDs.
**Why it happens:** `useStudyStore` and `useSliceDomainStore` persist, and map-layer/preset stores also write to browser storage.
**How to avoid:** Add an explicit evaluation bootstrap/reset pass before `Start session` that clears or normalizes all participant-visible demo stores.
**Warning signs:** Session starts with preexisting applied slices, adaptive mode already enabled, or non-default layer visibility.

### Pitfall 3: Inner labeled condition controls leak the manipulation
**What goes wrong:** Participants see `Linear`, `Adaptive`, or `Warp factor` text in the demo rail/overview panels.
**Why it happens:** Existing demo controls are designed for exploration, not blinded evaluation.
**How to avoid:** Lock or mask those controls on `/evaluation` and expose only the unlabeled header toggle plus researcher-only badge.
**Warning signs:** Participants can read condition names from the Overview/Configure/Slices panels.

### Pitfall 4: Logging silently drops data
**What goes wrong:** Buffered events vanish on route change or failed write.
**Why it happens:** Current `LoggerService` clears its buffer before confirming persistence and does not requeue failures.
**How to avoid:** Use acknowledged writes for critical study records and keep an explicit UI save state (`idle/saving/saved/error`).
**Warning signs:** `Could not save...` toasts, empty DB rows, or mismatched task counts after a pilot run.

### Pitfall 5: Questionnaire schema drift
**What goes wrong:** UI captures a different number of items than the analysis expects.
**Why it happens:** `80-CONTEXT.md`/`80-UI-SPEC.md` say NASA-RTLX 6 items + Likert 6 items, but `EVALUATION_PROTOCOL.md` currently lists 5 NASA dimensions and 5 interpretability statements.
**How to avoid:** Treat the locked context/UI spec as implementation truth for planning, and schedule a doc-alignment task early.
**Warning signs:** Inconsistent completion validation, missing columns, or unclear scoring sheets.

### Pitfall 6: Over-coupling to unfinished Phase 79 polish
**What goes wrong:** Planning waits for every Adaptive 3D interaction detail before starting evaluation readiness.
**Why it happens:** Roadmap says Phase 80 depends on 79, but context explicitly narrows the true dependency to condition state + warp toggle behavior.
**How to avoid:** Gate only on the adaptive/uniform state behaving consistently; do not block Phase 80 on unrelated 3D editing polish.
**Warning signs:** Tasks about 3D slice authoring or warp-axis rendering appear inside Phase 80 plans.

## Integration Points and Sequencing

### Required integration points
- `src/app/evaluation/page.tsx` → new route entry
- `src/components/dashboard-demo/DashboardDemoShell.tsx` → imported unchanged as rendering surface
- `src/store/useDashboardDemoCoordinationStore.ts` → source of truth for condition badge, toggle state, warp factor, and reset helpers
- `src/store/useSliceDomainStore.ts` / map-layer stores → must be reset or normalized at session start
- `src/components/onboarding/OnboardingTour.tsx` or a route-specific evaluation tour component → training flow
- `src/lib/db.ts` → DuckDB connection/bootstrap
- `src/app/api/study/*` → structured writes

### Recommended sequencing constraints
1. **Define data model first** (`session`, `trial`, `questionnaire`, `condition_event` payloads and DuckDB DDL).
2. **Build evaluation store second** so UI and API can share one event vocabulary.
3. **Add `/evaluation` frame third** and verify shell overlay/locking before task/questionnaire UI.
4. **Add training/task/questionnaire surfaces fourth** against the store contract.
5. **Add logging acknowledgements and researcher save/error feedback fifth**.
6. **Finish with reset/lockdown/pilot verification** across full A→B and B→A sessions.

### Migration risks
- Existing `StudyControls` and `useStudyStore` are too small; likely easier to supersede than incrementally extend.
- Existing `/api/study/log` endpoint writes to JSONL; planner should assume replacement, not adaptation.
- Existing onboarding tour auto-runs on `/dashboard*`; Phase 80 needs researcher-controlled replay on `/evaluation` only.
- Existing demo controls expose labels and editing behaviors that violate study blinding/locking decisions.

## Code Examples

Verified patterns from official sources:

### Dedicated App Router page wrapping a client workspace
```tsx
// Source: /vercel/next.js/v16.1.6 (layouts-and-pages / app-router migration docs)
import { DashboardDemoShell } from '@/components/dashboard-demo/DashboardDemoShell';
import { EvaluationShell } from '@/components/evaluation/EvaluationShell';

export default function Page() {
  return (
    <EvaluationShell>
      <DashboardDemoShell />
    </EvaluationShell>
  );
}
```

### Node runtime route handler for local DuckDB writes
```ts
// Source: /vercel/next.js/v16.1.6 route-handler runtime config docs
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const payload = await request.json();
  // validate -> write via src/lib/db.ts helpers -> return acknowledgement
  return NextResponse.json({ ok: true });
}
```

### Persist only crash-recovery essentials
```ts
// Source: /pmndrs/zustand/v5.0.12 persist docs
persist(
  (set, get) => ({ /* state + actions */ }),
  {
    name: 'evaluation-study-v1',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({
      sessionId: state.sessionId,
      participantId: state.participantId,
      currentStep: state.currentStep,
    }),
  },
)
```

### Researcher-controlled themed training tour
```ts
// Source: /nilbuild/driver.js
driver({
  popoverClass: 'evaluation-tour-popover',
  onDestroyed: () => {
    // mark training complete in evaluation store
  },
  steps: [
    { element: '#tour-cube-panel', popover: { title: 'Rotate the cube', description: '...' } },
    { element: '#tour-timeline-panel', popover: { title: 'Brush the timeline', description: '...' } },
  ],
}).drive();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Floating `StudyControls` on `/dashboard` | Dedicated `/evaluation` route header with integrated session controls | Locked in `80-CONTEXT.md` (2026-06-16) | Cleaner separation and lower regression risk |
| JSONL event dumping via `/api/study/log` | Structured DuckDB fact tables with explicit APIs | Phase 80 recommendation | Enables SQL summaries for thesis analysis |
| Auto-run generic onboarding based on `hasSeenTour` | Researcher-triggered route-specific training tour | Phase 80 recommendation | Consistent participant training and replay support |
| Free exploration UI with editable controls | Participant-locked evaluation chrome + researcher utilities | Locked in D-03 to D-06 | Better condition control and study validity |

**Deprecated/outdated:**
- `src/app/api/study/log/route.ts` NDJSON file append approach: outdated for Phase 80 because it is not analytics-ready and has weak delivery guarantees.
- `src/components/study/StudyControls.tsx` floating control pattern: outdated for Phase 80 because the researcher workflow must live in the evaluation header.

## Open Questions

1. **Questionnaire source of truth is inconsistent**
   - What we know: `80-CONTEXT.md` and `80-UI-SPEC.md` lock NASA-RTLX as 6 items and Likert as 6 items.
   - What's unclear: `EVALUATION_PROTOCOL.md` currently lists 5 NASA items and 5 interpretability statements.
   - Recommendation: Plan against the locked context/UI spec, and add an early documentation-alignment task.

2. **`chapters/07_evaluation/` is referenced but missing**
   - What we know: `80-CONTEXT.md` treats it as a canonical reference for refined 4-task definitions.
   - What's unclear: Exact wording/scoring for the four thesis tasks is not present in the repo snapshot.
   - Recommendation: Planner should include a task to codify the final task text/scoring sheet from the thesis materials before implementation is considered complete.

3. **Condition order assignment needs an operational source of truth**
   - What we know: `EVALUATION_PROTOCOL.md` defines an A→B / B→A pattern by participant.
   - What's unclear: Whether participant IDs will be manually mapped by the researcher or auto-derived in the app.
   - Recommendation: Prefer explicit researcher selection/confirmation in session setup to avoid accidental wrong order assignment.

## Sources

### Primary (HIGH confidence)
- `/vercel/next.js/v16.1.6` — App Router page structure and route-handler runtime options
- `/pmndrs/zustand/v5.0.12` — slices pattern and persist `partialize` guidance
- `/nilbuild/driver.js` — step config, `popoverClass`, `onDestroyed`, and manual `drive()` usage
- `src/components/dashboard-demo/DashboardDemoShell.tsx` — current shell layout and integration constraints
- `src/store/useDashboardDemoCoordinationStore.ts` — condition and reset state
- `src/store/useStudyStore.ts` — current persisted session state
- `src/lib/logger.ts` — current batching semantics and failure behavior
- `src/app/api/study/log/route.ts` — current JSONL logging implementation
- `src/components/onboarding/OnboardingTour.tsx` — current dashboard-only training flow
- `src/lib/db.ts` — DuckDB initialization and shared DB path
- `.planning/phases/80-evaluation-readiness-prepare-dashboard-demo-prototype-for-us/80-CONTEXT.md` — locked decisions and phase boundary
- `.planning/phases/80-evaluation-readiness-prepare-dashboard-demo-prototype-for-us/80-UI-SPEC.md` — approved UI contract

### Secondary (MEDIUM confidence)
- `EVALUATION_PROTOCOL.md` — useful procedure/counterbalancing source, but internally inconsistent with locked questionnaire counts
- `EVALUATION_FORMS.md` — useful item wording and paper backup structure

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on current repo stack plus Context7-verified Next.js/Zustand/driver.js docs
- Architecture: HIGH - Driven by direct inspection of current shell/store/layout constraints
- Pitfalls: HIGH - Derived from current persisted stores, current logger failure mode, and explicit context/UI constraints

**Research date:** 2026-06-19
**Valid until:** 2026-07-19
