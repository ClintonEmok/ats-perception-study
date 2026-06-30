# Architecture: ATS Perception Study Integration

**Domain:** Controlled within-subjects web experiment (24 trials, 3 task types, counterbalanced Uniform vs ATS conditions) embedded in a Next.js 16 App Router brownfield prototype.

**Researched:** 2026-06-30
**Confidence:** HIGH (codebase analyzed, Convex docs verified via Context7, existing patterns inspected)

---

## Recommended Architecture

### Overall Picture

The ATS Perception Study is a **self-contained standalone web experiment** that runs as a dedicated `/experiment` route inside the existing Next.js 16 App Router project. It lives on the `ats-study` branch where all prototype routes, DuckDB dependencies, Web Workers, and visualization libraries are stripped away — leaving a lean experiment-only deployment surface.

The architecture has three layers:

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER (CLIENT)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ /experiment  │  │ SVG Stimulus │  │ Trial Runner       │  │
│  │ page.tsx     │  │ Components   │  │ (Zustand store)    │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘  │
│         │                 │                     │             │
│  ┌──────┴─────────────────┴─────────────────────┴──────────┐  │
│  │            ATS Mapping Lib (src/lib/ats/)                │  │
│  │  - Compute per-interval allocation weights from          │  │
│  │    burstiness-derived event distribution                 │  │
│  │  - Pure functions, no side effects, testable             │  │
│  └──────────────────────────┬──────────────────────────────┘  │
│                             │                                  │
│  ┌──────────────────────────┴──────────────────────────────┐  │
│  │         ConvexClientProvider (React context)             │  │
│  │  - ConvexReactClient initialized once at layout level    │  │
│  │  - useMutation / useQuery hooks for response storage     │  │
│  └──────────────────────────┬──────────────────────────────┘  │
└─────────────────────────────┼─────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────┼─────────────────────────────────┐
│                   CONVEX CLOUD (BACKEND)                      │
│  ┌──────────────────────────┴──────────────────────────────┐  │
│  │  convex/schema.ts  │  convex/responses.ts               │  │
│  │  - responses table  │  - submitResponse mutation        │  │
│  │  - sessions table   │  - getResponses query             │  │
│  │  - participants tbl │  - startSession mutation          │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

The study uses **no DuckDB, no Three.js, no MapLibre, no deck.gl, no Web Workers, no Apache Arrow**. The only backend is Convex (for response storage). All stimulus computation happens client-side in pure TypeScript.

---

## Component Boundaries

| Component | Responsibility | Communicates With | Location |
|-----------|---------------|-------------------|----------|
| `/experiment` route | Shell page that composes the experiment flow | Zustand store, stimulus components, Convex hooks | `src/app/experiment/page.tsx` |
| ConvexClientProvider | Initializes ConvexReactClient, wraps app with ConvexProvider | Next.js layout | `src/providers/ConvexClientProvider.tsx` (NEW) |
| SVG Stimulus Components | Render event rug + allocation bands for Uniform and ATS conditions | ATS mapping lib, trial runner store | `src/components/stimulus/` (NEW) |
| Trial Runner Store | Manages experiment state machine (flows, trials, responses, session) | Convex hooks, ATS mapping lib | `src/store/useExperimentStore.ts` (NEW) |
| ATS Mapping Lib | Computes per-interval allocation weights from event distribution | Synthetic event generator, stimulus components | `src/lib/ats/` (NEW) |
| Convex Schema | Defines database tables and validators | Convex mutations/queries | `convex/schema.ts` (NEW) |
| Convex Mutations | Server-side write operations for response storage | Convex database | `convex/responses.ts` (NEW) |
| Layout (root) | Wraps children with ConvexProvider + ThemeProvider | All pages | `src/app/layout.tsx` (MODIFIED) |
| Landing page | Redirects to /experiment; strips prototype demo links | Browser | `src/app/page.tsx` (MODIFIED) |

---

## Integration Points

### 1. Root Layout — ConvexProvider Injection

**What changes:** The existing root layout at `src/app/layout.tsx` must wrap children in `ConvexClientProvider` alongside the existing `ThemeProvider`. The `QueryProvider` (TanStack) can be conditionally kept or removed — Convex provides its own data-fetching via `useQuery`/`useMutation`, making TanStack Query unnecessary for the experiment route. **Recommendation: Keep QueryProvider** but it becomes inert since no `useCrimeData` hooks will exist on the stripped branch.

**How it integrates:**

```typescript
// src/app/layout.tsx (MODIFIED — adds ConvexClientProvider)
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`...`}>
        <ThemeProvider>
          <ConvexClientProvider>
            {children}
            <Toaster />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

The new file `src/providers/ConvexClientProvider.tsx`:

```typescript
// src/providers/ConvexClientProvider.tsx (NEW)
'use client';

import { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error('Missing NEXT_PUBLIC_CONVEX_URL');

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

**Dependency:** `NEXT_PUBLIC_CONVEX_URL` env var must be set in `.env.local` (obtained from `npx convex dev`).

### 2. Convex Directory Structure

**New top-level directory:** `convex/` at the project root (sibling to `src/`, `package.json`).

```
convex/
├── schema.ts          # Table definitions with validators
├── responses.ts       # Mutations (submitTrialResponse, startSession, etc.)
├── _generated/        # Auto-generated by npx convex dev (gitignored)
│   ├── api.d.ts
│   ├── dataModel.d.ts
│   └── server.js
└── tsconfig.json      # Convex-specific TypeScript config
```

**Schema design (`convex/schema.ts`):**

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // One row per participant session
  sessions: defineTable({
    participantId: v.string(),
    blockOrder: v.union(v.literal("A->B"), v.literal("B->A")),
    startedAt: v.number(),       // epoch ms
    completedAt: v.optional(v.number()),
    conditionOrder: v.string(),  // JSON string: {blockA: "uniform"|"adaptive", blockB: "uniform"|"adaptive"}
  }).index("by_participant", ["participantId"]),

  // One row per trial response
  trialResponses: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.string(),
    trialIndex: v.number(),      // 0-23 (24 experimental trials)
    block: v.union(v.literal("A"), v.literal("B")),
    condition: v.union(v.literal("uniform"), v.literal("adaptive")),
    taskType: v.union(
      v.literal("peak-identification"),
      v.literal("period-comparison"),
      v.literal("pattern-recognition")
    ),
    datasetId: v.string(),       // synthetic dataset identifier
    selectedAnswer: v.union(v.string(), v.number()),  // MCQ choice or binary
    isCorrect: v.boolean(),
    responseTimeMs: v.number(),
    confidence: v.number(),      // 1-5 scale
    completedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // Post-study questionnaire
  questionnaireResponses: defineTable({
    sessionId: v.id("sessions"),
    participantId: v.string(),
    items: v.string(),           // JSON: [{itemId, scale, value}, ...]
    completedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
```

### 3. Next.js Configuration

**`next.config.ts` (MODIFIED — for ats-study branch):**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // REMOVED: serverExternalPackages: ['duckdb'] — DuckDB is stripped
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
```

**`package.json` (MODIFIED — for ats-study branch):**
- **ADD:** `"convex": "^1.x"` dependency
- **REMOVE:** `duckdb`, `apache-arrow`, `@loaders.gl/*`, `three`, `@react-three/*`, `deck.gl`, `@deck.gl/*`, `maplibre-gl`, `react-map-gl`, `leaflet`, `react-leaflet`, `leaflet-draw`, `leaflet.markercluster`, `density-clustering`, `@math.gl/web-mercator`
- **REMOVE:** `"postinstall": "patch-package && ..."` (DuckDB symlink no longer needed)
- **REMOVE:** `patch-package`, `patches/`

### 4. Environment Variables

**`.env.local` (ats-study branch):**

```dotenv
# Convex deployment URL (from npx convex dev)
NEXT_PUBLIC_CONVEX_URL=https://example-project-123.convex.cloud

# REMOVED: USE_MOCK_DATA, DISABLE_DUCKDB, DUCKDB_PATH, DUCKDB_THREADS, STKDE_QA_FULL_POP_ENABLED
```

### 5. Synthetic Event Data Reuse

**What stays:** The existing `src/lib/synthetic/goh-barabasi.ts` generator is the source of truth for producing bursty crime event sequences. For the experiment, we generate **24 fixed-seed datasets** at build time (or at experiment load time) that serve as the stimulus material. Each dataset is an array of `{ timestamp: number, type: string }` events.

**What changes for the experiment:**
- The existing generator produces full `CrimeRecord[]` with lat/lon/coordinate data.
- The study only needs `{ timestamp: number }[]` — a subset of the output.
- **Recommendation:** Create a thin wrapper `src/lib/ats/generate-datasets.ts` that:
  1. Calls `generateBurstySequence()` with 24 fixed seeds
  2. Extracts only timestamp arrays
  3. Caches results for reuse across trials

This reuses the validated Goh-Barabási implementation without modification.

---

## Data Flow

### Trial Lifecycle (happy path)

```
1. Participant lands on /experiment
   → useExperimentStore initializes (fresh session)
   → ConvexClientProvider is already active from layout

2. Participant clicks "Start Study"
   → useExperimentStore.startSession() → convex mutation → sessions.insert()

3. Block A begins (e.g., Uniform condition, 12 trials)
   → Trial 1 loads:
     a. Synthetic dataset for trial index loaded from cached generator output
     b. ATS mapping lib computes per-interval weights (for both conditions)
     c. SVG stimulus renders for active condition (Uniform or ATS)
     d. Trial runner tracks: question text, MCQ options, timer

4. Participant selects answer + confidence slider
   → useExperimentStore.submitResponse() fires:
     a. Convex mutation trialResponses.insert() → persisted
     b. Store advances trialIndex
     c. Next trial stimulus renders

5. After all 24 trials + practice:
   → Questionnaire component renders
   → Participant completes NASA-RTLX + interpretability items
   → convex mutation questionnaireResponses.insert()
   → Session marked complete

6. Done screen with download/export option
```

### ATS Mapping Data Flow

The ATS mapping is the core differentiator. For each synthetic dataset, we need two renderings:

**Uniform condition:** Equal-width time bins. Each bin gets equal vertical allocation. Events are plotted at their exact position.

**ATS (Adaptive Temporal Scaling) condition:** Bins are stretched/compressed based on event density. High-density intervals get more vertical space (wider bands); sparse intervals get compressed bands. Events are plotted at their warped positions.

```
Synthetic Event Array (timestamps)
  │
  ▼
ATS Mapping Lib (src/lib/ats/mapper.ts)
  ├── computeDensity(timestamps, numBins): number[]
  ├── computeBurstiness(density): number[]        ← Goh-Barabási B(t)
  ├── computeAllocationWeights(burstiness): number[] ← normalized weights
  ├── computeWarpedPositions(timestamps, weights): number[]
  └── output: AtsMapping { bins, weights, warpedPositions }
  │
  ▼
SVG Stimulus Component
  ├── EventRug: plots events as tick marks along timeline
  ├── AllocationBands: renders vertical allocation stripes
  └── ConditionLabel: "Uniform" or "Adaptive" indicator
```

The ATS mapping is computed **client-side, synchronously** for each trial (trials use small datasets of ~200-500 events, not the full 8.5M crime records). No Web Workers needed.

---

## Route Stripping Strategy

The `ats-study` branch removes all prototype infrastructure to create a clean, deployable experiment surface.

### Routes to KEEP

| Route | Purpose | Status |
|-------|---------|--------|
| `/` (landing page) | Study landing page (redirects to /experiment or shows consent) | MODIFIED — strip demo links, add study info |
| `/experiment` | Main experiment page with trial runner, stimulus, questionnaire | NEW |
| `/api/study/log` | Acknowledged study event ingestion (already exists) | KEEP (optional fallback; Convex is primary) |

### Routes to STRIP (remove directories)

All prototype routes are removed from the `ats-study` branch:

```
src/app/stats/              # Statistics dashboard
src/app/stkde/              # STKDE 2D view
src/app/stkde-3d/           # STKDE 3D view
src/app/timeline-test/      # Timeline testing
src/app/timeline-test-3d/   # 3D timeline testing
src/app/timeslicing/        # Time slicing controls
src/app/timeslicing-algos/  # Algorithm views
src/app/dashboard-demo/     # Main dashboard shell
src/app/hotspot-evolution/  # Hotspot analysis
src/app/cube-sandbox/       # 3D cube sandbox
src/app/evaluation/         # Phase 80 evaluation
src/app/figures/*           # Publication figures
src/app/demo/*              # Demo pages
src/app/docs/               # Documentation
src/app/algorithms/         # Algorithm explanations
```

### API Routes to STRIP (remove directories)

```
src/app/api/crime/*         # Crime data queries (DuckDB)
src/app/api/crimes/*        # Crime range queries (DuckDB)
src/app/api/stkde/*         # STKDE computation (DuckDB)
src/app/api/adaptive/*      # Adaptive scaling (DuckDB)
src/app/api/synthetic/*     # Synthetic generator API (DuckDB)
src/app/api/neighbourhood/* # POI queries (DuckDB)
```

### Packages to REMOVE from dependencies

```bash
pnpm remove duckdb apache-arrow @loaders.gl/core @loaders.gl/arrow \
  three @react-three/fiber @react-three/drei \
  deck.gl @deck.gl/aggregation-layers @deck.gl/mapbox \
  maplibre-gl react-map-gl leaflet react-leaflet \
  leaflet-draw leaflet.markercluster @math.gl/web-mercator \
  density-clustering patch-package
```

### Packages to ADD

```bash
pnpm add convex
```

---

## New vs Modified Components

### NEW Files

| File | Purpose | Dependencies |
|------|---------|-------------|
| `src/app/experiment/page.tsx` | Experiment route shell | Zustand store, stimulus components, Convex hooks |
| `src/app/experiment/layout.tsx` | Experiment-specific layout (if needed) | None |
| `src/providers/ConvexClientProvider.tsx` | Convex React client initialization | `convex/react` |
| `src/components/stimulus/EventRug.tsx` | SVG event tick marks | ATS mapping lib |
| `src/components/stimulus/AllocationBands.tsx` | SVG allocation stripes | ATS mapping lib |
| `src/components/stimulus/StimulusView.tsx` | Combined stimulus (rug + bands) | EventRug, AllocationBands |
| `src/components/stimulus/MCQPanel.tsx` | Multiple-choice response interface | shadcn/ui (RadioGroup, Slider) |
| `src/components/experiment/InstructionsScreen.tsx` | Pre-trial instructions | Store |
| `src/components/experiment/PracticeTrial.tsx` | Practice trial flow | StimulusView, MCQPanel, Store |
| `src/components/experiment/ExperimentTrial.tsx` | Main trial flow | StimulusView, MCQPanel, Store |
| `src/components/experiment/QuestionnaireScreen.tsx` | Post-study questionnaire | shadcn/ui (Slider, RadioGroup) |
| `src/components/experiment/DoneScreen.tsx` | Completion/export screen | Store, Convex query |
| `src/components/experiment/ProgressBar.tsx` | Trial progress indicator | Store |
| `src/store/useExperimentStore.ts` | Trial runner state machine | Zustand, Convex hooks |
| `src/lib/ats/mapper.ts` | ATS weight computation | Synthetic generator output |
| `src/lib/ats/generate-datasets.ts` | Fixed-seed dataset generation | `src/lib/synthetic/goh-barabasi.ts` |
| `src/lib/ats/types.ts` | ATS mapping type definitions | None |
| `convex/schema.ts` | Convex database schema | `convex/server`, `convex/values` |
| `convex/responses.ts` | Convex mutations (submit/query) | Schema |
| `convex/tsconfig.json` | Convex TypeScript config | None |

### MODIFIED Files

| File | Change | Reason |
|------|--------|--------|
| `src/app/layout.tsx` | Add ConvexClientProvider wrapper | Convex hooks need provider context |
| `src/app/page.tsx` | Strip demo links; add study landing | Route stripping + study focus |
| `next.config.ts` | Remove serverExternalPackages | DuckDB stripped |
| `package.json` | Remove prototype deps; add convex | Clean deployment surface |
| `.env.local` | Add NEXT_PUBLIC_CONVEX_URL; remove DuckDB vars | Convex backend connection |
| `pnpm-lock.yaml` | Regenerated after dep changes | pnpm consistency |

### UNCHANGED (shared infrastructure)

| File | Why Kept |
|------|----------|
| `src/lib/synthetic/goh-barabasi.ts` | Generates bursty event sequences for stimuli |
| `src/lib/synthetic/prng.ts` | Seeded random for reproducible datasets |
| `src/lib/synthetic/types.ts` | Type definitions for generator |
| `src/lib/coordinate-normalization.ts` | Optional: if spatial variants needed later |
| `src/components/layout/ThemeProvider.tsx` | Dark/light theme for study UI |
| `src/components/ui/*` (shadcn) | UI primitives (buttons, sliders, radio groups) |
| `src/lib/study/protocol.ts` | Reference for experiment constants (may be repurposed) |
| `src/lib/study/condition-order.ts` | Counterbalancing logic (reused for trial ordering) |
| `src/lib/logger.ts` | Optional fallback logging to `/api/study/log` |
| `src/store/useStudyStore.ts` | Optional: legacy study store (can be kept or stripped) |
| `tailwind.config.ts`, `globals.css` | Styling infrastructure |

---

## Build Order (Dependency Chain)

Phase ordering considers what must exist before downstream code can be built or tested:

```
Wave 1: Infrastructure Foundation
├── 1a. Create ats-study branch, strip prototype routes & deps
│      (git rm prototype routes; pnpm remove heavy deps)
├── 1b. Install Convex: pnpm add convex
├── 1c. npx convex dev → creates convex/ project, generates _generated/
├── 1d. Define convex/schema.ts (tables for sessions, trialResponses, questionnaireResponses)
├── 1e. Create convex/responses.ts (submitTrialResponse mutation, startSession, etc.)
└── 1f. Create ConvexClientProvider, wire into layout.tsx

Wave 2: Core Logic
├── 2a. Define ATS mapping types (src/lib/ats/types.ts)
├── 2b. Build ATS mapper (src/lib/ats/mapper.ts) — pure functions
├── 2c. Build dataset generator (src/lib/ats/generate-datasets.ts) — wraps goh-barabasi.ts
├── 2d. Write unit tests for mapper and dataset generator
└── 2e. Define experiment trial protocol (24 trial definitions, task types)

Wave 3: Stimulus Rendering
├── 3a. Build EventRug SVG component
├── 3b. Build AllocationBands SVG component
├── 3c. Build composite StimulusView (rug + bands + labels)
└── 3d. Validate stimulus appearance against design spec

Wave 4: Trial Runner
├── 4a. Build useExperimentStore (Zustand state machine)
├── 4b. Build InstructionsScreen, PracticeTrial components
├── 4c. Build MCQPanel (response capture UI)
├── 4d. Build ExperimentTrial (full trial flow)
├── 4e. Wire Convex mutations into store (trial response persistence)
└── 4f. End-to-end trial integration test

Wave 5: Participant Flow
├── 5a. Build ProgressBar component
├── 5b. Build QuestionnaireScreen
├── 5c. Build DoneScreen
├── 5d. Wire full participant flow (consent → practice → block A → block B → questionnaire → done)
└── 5e. Wire session lifecycle (startSession, completeSession)

Wave 6: Deployment Polish
├── 6a. Modify landing page (/) with study info
├── 6b. Configure Vercel deployment for ats-study branch
├── 6c. Set up Convex production deployment
├── 6d. Final integration test (24-trial run-through)
└── 6e. Pilot verification (N=2-3 internal testers)
```

---

## Patterns to Follow

### Pattern 1: Pure-Function Lib for Computation

**What:** All ATS mapping math lives in `src/lib/ats/mapper.ts` as pure functions. No DOM, no state, no side effects.

**Why:** Same pattern as existing `src/lib/adaptive/` and `src/lib/synthetic/`. Enables unit testing without mocking, reuse across stimulus components, and future extraction.

**Example:**
```typescript
// src/lib/ats/mapper.ts
export function computeDensity(timestamps: number[], numBins: number): number[] {
  // Count events per bin
}

export function computeBurstiness(density: number[]): number[] {
  // B(t) = (σ_τ - μ_τ) / (σ_τ + μ_τ) per sliding window (Goh-Barabási 2008)
}

export function computeAllocationWeights(burstiness: number[], baseWeight: number = 1): number[] {
  // Normalize burstiness to allocation weights (sum = numBins)
}

export function computeWarpedPositions(timestamps: number[], weights: number[], domain: [number, number]): number[] {
  // Map timestamps to warped positions based on cumulative weight distribution
}

export interface AtsMapping {
  bins: { start: number; end: number; weight: number }[];
  warpedPositions: number[];
  condition: 'uniform' | 'adaptive';
}
```

### Pattern 2: Zustand Store with Convex Integration

**What:** `useExperimentStore` manages trial state machine and delegates persistence to Convex mutations.

**Why:** Matches existing `useEvaluationStudyStore` pattern. Zustand provides reactive UI updates; Convex provides serverless persistence. No TanStack Query needed — Convex's `useMutation` handles the data layer.

**Example:**
```typescript
// src/store/useExperimentStore.ts
import { create } from 'zustand';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface ExperimentState {
  // Session
  sessionId: string | null;
  participantId: string | null;
  blockOrder: 'A->B' | 'B->A';
  currentPhase: 'consent' | 'practice' | 'block-a' | 'block-b' | 'questionnaire' | 'done';

  // Trial
  trialIndex: number;        // 0-23
  currentBlock: 'A' | 'B';
  currentCondition: 'uniform' | 'adaptive';
  trialState: 'stimulus' | 'responding' | 'feedback' | 'transition';

  // Actions
  startSession: (blockOrder: 'A->B' | 'B->A') => Promise<void>;
  submitTrialResponse: (answer: string | number, confidence: number) => Promise<void>;
  advanceTrial: () => void;
}
```

### Pattern 3: Server Component Shell + Client Component Internals

**What:** `src/app/experiment/page.tsx` is a Server Component. All interactivity lives in client components.

**Why:** Matches existing pattern from `evaluation/page.tsx` (line 18-20). Preserves Next.js metadata conventions.

```typescript
// src/app/experiment/page.tsx
import { ExperimentShell } from '@/components/experiment/ExperimentShell';

export default function ExperimentPage() {
  return <ExperimentShell />;
}
```

### Pattern 4: Fixed-Seed Reproducibility

**What:** All 24 synthetic datasets use fixed seeds so every participant sees the same stimulus material.

**Why:** Critical for controlled experiment validity. Matches existing `createSeededRandom(seed)` from `src/lib/synthetic/prng.ts`.

```typescript
// src/lib/ats/generate-datasets.ts
const DATASET_SEEDS = [
  42, 137, 256, 389, 514, 671, 803, 947,
  1023, 1158, 1297, 1412, 1589, 1723, 1845, 1967,
  2034, 2189, 2345, 2501, 2678, 2812, 3947, 4200,
];

export function generateTrialDatasets(): Dataset[] {
  return DATASET_SEEDS.map((seed, index) => {
    const config = getTrialConfig(index); // varies alpha, delta, count per trial
    const sequence = generateBurstySequence({ ...config, seed });
    return {
      id: `dataset-${index + 1}`,
      timestamps: sequence.events.map(e => e.timestampSec),
      config,
    };
  });
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mixing Prototype Stores with Experiment Store

**What:** Letting `useDashboardDemoCoordinationStore` or `useSliceDomainStore` remain importable in experiment code.

**Why bad:** These stores depend on DuckDB data, Three.js state, and map coordinates — pulling in the entire prototype dependency graph. They also persist to localStorage, risking state leakage between experiment sessions.

**Instead:** The `ats-study` branch strips these store files entirely. If any shared utility is needed, extract it into `src/lib/` as a pure function with no store dependencies.

### Anti-Pattern 2: Direct DuckDB Import in Experiment Code

**What:** Accidentally importing anything that transitively depends on `src/lib/db.ts`.

**Why bad:** DuckDB's native binding requires `serverExternalPackages` in `next.config.ts` and the `patch-package` postinstall hook. On the stripped branch, DuckDB is removed from dependencies — any import will cause a build failure.

**Prevention:** After stripping routes, run `pnpm typecheck` and `pnpm build` to catch residual imports.

### Anti-Pattern 3: Web Workers for Small-Scale Computation

**What:** Using `adaptiveTime.worker.ts` for computing ATS weights on 200-500 event datasets.

**Why bad:** Worker instantiation overhead exceeds computation time for datasets this small. The worker pattern was designed for the full 8.5M record dataset.

**Instead:** Synchronous pure functions in `src/lib/ats/mapper.ts`. For 500 events computing density, burstiness, and warped positions, the computation takes < 5ms — well within frame budget.

### Anti-Pattern 4: Server-Side Stimulus Generation

**What:** Generating SVG stimuli on the server (API route) and streaming them to the client.

**Why bad:** Adds network latency to every trial advance. Breaks the "no DuckDB on ats-study" constraint since the synthetic generator API route depends on DuckDB.

**Instead:** Generate synthetic data at experiment boot time (or build time) on the client. Cache the 24 datasets in a `Map<string, number[]>`. Same approach as the existing synthetic generator's client-side `generateBurstySequence()`.

---

## Isolation Checklist

### What the `ats-study` branch REMOVES

- [ ] 21 prototype route directories from `src/app/`
- [ ] 16 API route directories from `src/app/api/` (keep only `/api/study/log/` if needed)
- [ ] DuckDB dependency (`duckdb`, `apache-arrow`, `@loaders.gl/*`)
- [ ] 3D rendering deps (`three`, `@react-three/fiber`, `@react-three/drei`, `deck.gl`, `@deck.gl/*`)
- [ ] Mapping deps (`maplibre-gl`, `react-map-gl`, `leaflet`, `react-leaflet`, `leaflet-*`, `@math.gl/web-mercator`)
- [ ] Clustering deps (`density-clustering`)
- [ ] `serverExternalPackages: ['duckdb']` from `next.config.ts`
- [ ] `patch-package` and `postinstall` DuckDB symlink from `package.json`
- [ ] `patches/duckdb+1.4.4.patch`
- [ ] Web Worker files (`src/workers/`)
- [ ] Prototype Zustand stores (~40 stores; keep only experiment+study stores)
- [ ] Prototype components (dashboard/, map/, timeline/, viz/, stkde/, binning/, onboarding/)
- [ ] Prototype hooks (`useCrimeData`, `useAdaptiveScale`, `useStkde`, etc.)
- [ ] `src/lib/db.ts` (DuckDB singleton)
- [ ] `src/lib/queries/` (SQL builders — all depend on DuckDB)
- [ ] `src/lib/stkde/` (hotspot pipeline)
- [ ] `src/lib/binning/` (time bin engine — replaced by ATS mapper)
- [ ] `src/lib/adaptive/` (route-based binning — replaced by ATS mapper)
- [ ] Python scripts (`scripts/`, `datapreprocessing/`)
- [ ] Environment vars: `USE_MOCK_DATA`, `DISABLE_DUCKDB`, `DUCKDB_PATH`, `DUCKDB_THREADS`, `STKDE_QA_FULL_POP_ENABLED`

### What the `ats-study` branch KEEPS

- [ ] `src/lib/synthetic/` (event generator — core stimulus source)
- [ ] `src/lib/study/` (protocol, condition-order, storage — reference patterns)
- [ ] `src/lib/logger.ts` (optional fallback logging)
- [ ] `src/components/ui/` (shadcn primitives — buttons, sliders, etc.)
- [ ] `src/components/layout/ThemeProvider.tsx` (theme)
- [ ] `src/providers/` (modified: keep QueryProvider, add ConvexClientProvider)
- [ ] `src/types/crime.ts` (CrimeRecord type — used by synthetic generator)
- [ ] `src/lib/coordinate-normalization.ts` (used by synthetic generator)
- [ ] `src/lib/category-maps.ts` (used by synthetic generator)
- [ ] Tailwind CSS, shadcn/ui config (`components.json`, `tailwind.config.ts`, `globals.css`)
- [ ] Next.js, React, TypeScript, Zustand core
- [ ] date-fns, sonner, next-themes, clsx, tailwind-merge
- [ ] Vitest, ESLint, TypeScript config

---

## Scalability Considerations

| Concern | At N=10 participants | At N=200 participants | At N=1000 participants |
|---------|---------------------|----------------------|------------------------|
| Convex reads/writes | Negligible (~240 writes per participant) | 48K writes — well within free tier | 240K writes — may need paid tier |
| Client computation | 24 datasets × 500 events = trivial | Same per-participant load | Same per-participant load |
| Bundle size | ~50KB (SVG + Zustand) | Same | Same |
| Storage | ~5KB per participant | ~1MB total | ~5MB total |
| Cold starts | N/A (pure client + Convex cloud) | N/A | N/A |

**Key insight:** The experiment scales horizontally by design. Each participant's browser does its own computation. Convex handles the backend. No server-side bottlenecks exist.

---

## Sources

| Source | Confidence | Notes |
|--------|-----------|-------|
| Codebase analysis (`src/lib/study/*`, `src/store/*`, `src/app/*`) | HIGH | Direct inspection of existing architecture |
| Context7 Convex docs (`/llmstxt/convex_dev_llms_txt`) | HIGH | Current as of 2026-06-30 — ConvexProvider, schema, mutations |
| Next.js 16.2.9 docs (llms.txt index) | HIGH | App Router conventions, layout patterns |
| Existing Phase 80 evaluation architecture | HIGH | Reference pattern: zustand + client-side + study API |
| PROJECT.md v4.0 requirements (EXP-01 through EXP-08) | HIGH | Locked requirements from milestone specification |
| STACK.md (codebase analysis 2026-06-27) | HIGH | Verified dependency list and configurations |
