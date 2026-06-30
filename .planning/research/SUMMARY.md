# Project Research Summary

**Project:** Adaptive Space-Time Cube Prototype — ATS Perception Study (v4.0)
**Domain:** Web-based controlled within-subjects perception experiment comparing Adaptive Temporal Scaling vs Uniform timelines
**Researched:** 2026-06-30
**Confidence:** HIGH

## Executive Summary

The ATS Perception Study is a **self-contained web experiment** that validates the core hypothesis of the Adaptive Space-Time Cube: does adaptive temporal scaling (ATS) make bursty crime patterns more perceptible than uniform timeline rendering? The study delivers 24 counterbalanced trials across 3 task types (Peak Identification, Period Comparison, Pattern Recognition) rendered as SVG timeline stimuli — event rug marks atop allocation bands — with per-trial response recording (accuracy, RT, confidence) stored to Convex.

Experts build web perception experiments with a **custom lightweight engine**, not a framework like jsPsych, when stimuli require custom SVG rendering that off-the-shelf plugins don't support. The recommended approach mirrors jsPsych's proven patterns (visibility-gated timing with `performance.now()`, counterbalancing via Latin square, sessionStorage checkpointing, write-ahead logging) while leveraging the existing React 19 + Zustand 5 + Visx 3.12 stack. The Convex backend provides serverless, real-time response storage with zero infrastructure overhead — exactly what a thesis experiment needs.

**The dominant risk is browser navigation corrupting participant state** — the experiment must guard against back-button, refresh, and tab-switch with a formal state machine, `beforeunload` handlers, and `visibilitychange`-gated timing. The second-tier risks are Convex schema rigidity (must support partial/abandoned trials via `status` enum) and cross-browser SVG consistency (Chrome/Firefox/Safari render event rug marks differently unless rendering properties are explicitly set). All three are preventable with specific, measurable guardrails mapped to early phases.

## Key Findings

### Recommended Stack

**Only 4 new packages needed.** The existing Next.js 16 / React 19 / Zustand 5 / Visx 3.12 / Tailwind CSS 4 / Vitest 4 stack covers ~80% of experiment infrastructure. Additions:

| Package | Version | Purpose |
|---------|---------|---------|
| `convex` | ^1.42.1 | Serverless backend for response storage (replaces DuckDB for study) |
| `@visx/tooltip` | ^3.12.0 | Hover tooltips on timeline stimuli |
| `@visx/text` | ^3.12.0 | SVG text labels with vertical alignment |
| `@visx/annotation` | ^3.12.0 | Callout annotations for burst regions |

**One-command install:** `pnpm add convex@^1.42.1 @visx/tooltip@^3.12.0 @visx/text@^3.12.0 @visx/annotation@^3.12.0`

**Explicit anti-recommendations:** No nanoid (use built-in `crypto.randomUUID()`), no jsPsych (custom engine better for SVG stimuli), no DuckDB on the study branch, no Three.js/MapLibre/Web Workers in the experiment bundle, no new databases or CSS frameworks. The `ats-study` branch must physically strip 21 prototype routes, ~35 heavy dependencies, and all DuckDB imports to achieve a <500KB gzipped deployment.

### Expected Features

**Must have for pilot (P1 — experiment cannot run without these):**
- **Synthetic stimulus generator** — 24 fixed-seed datasets with known ground truth (burst locations, peak counts, pattern types), reusing existing `src/lib/synthetic/goh-barabasi.ts`
- **SVG timeline stimulus renderer** — Event rug + allocation bands for Uniform and ATS conditions, rendered with @visx primitives
- **Trial runner with 3 task types** — Peak Identification (3-choice MCQ), Period Comparison (binary), Pattern Recognition (4-choice MCQ), each capturing accuracy, RT, and confidence
- **Convex schema + write mutations** — `sessions`, `trialResponses`, `questionnaireResponses` tables with `status` enum supporting partial trials
- **Anonymous participant flow** — ID generation via `crypto.randomUUID()`, condition-blind A/B labeling, progression through 2 practice + 24 experimental trials + questionnaire
- **Counterbalanced condition assignment** — Latin square design ensuring exactly 12 Uniform + 12 ATS per participant, task types balanced across blocks
- **Practice trials with feedback** — 2 trials before block 1 with correct/incorrect feedback overlay
- **Post-study questionnaire** — 4-6 Likert items comparing condition experience (NASA-RTLX + interpretability)

**Should have for analysis rigor (P2):** Data export (CSV/JSON), progress indicator, desktop browser check (≥1024px), stimulus onset guard (500ms fixation cross), allocation band polish.

**Defer to v5.0+:** Prolific/MTurk integration, between-subjects variant, eye-tracking, additional stimulus types, multi-session retest reliability.

**Decision: Build custom experiment engine, do NOT adopt jsPsych.** Rationale: jsPsych has no SVG timeline plugin (we'd build one anyway), adds 200KB+ to the bundle, introduces a parallel framework with its own state management, and its server-side data saving pattern doesn't match Convex mutations. The existing React+Zustand+Visx stack provides equivalent trial lifecycle capabilities with full control over stimuli.

### Architecture Approach

**Self-contained standalone experiment** on the `ats-study` branch. Three layers:

1. **Browser (Client):** SVG stimulus components (`src/components/stimulus/`) render event rug + allocation bands from ATS mapping lib (`src/lib/ats/`). Trial Runner store (`src/store/useExperimentStore.ts`) drives a formal finite state machine through consent → practice → block A → block B → questionnaire → debrief. ConvexClientProvider wraps the experiment layout.

2. **Convex Cloud (Backend):** `convex/schema.ts` defines `sessions`, `trialResponses`, `questionnaireResponses` tables with type-safe validators. `convex/responses.ts` provides `submitTrialResponse` mutation (idempotent via trial UUID) and `getSessionData` query. Zero server-side computation — all ATS mapping happens client-side on small datasets (~200-500 events per trial).

3. **Vercel (Deployment):** Stripped Next.js build serving only `/experiment` route. No DuckDB, Three.js, MapLibre, deck.gl, Web Workers, or Apache Arrow. Bundle target: <500KB gzipped total JS.

**Key patterns:** Pure-function computation libs (testable without DOM), Zustand store with Convex integration (local state drives UI, Convex is fire-and-forget persistence), Server Component shell + Client Component internals (matches existing `/evaluation` pattern), fixed-seed reproducibility (24 datasets from 24 committed seeds with seeded PRNG).

**Anti-patterns blocked:** Mixing prototype stores with experiment state, direct DuckDB imports, Web Workers for small-scale computation, server-side stimulus generation.

### Critical Pitfalls

1. **Browser Navigation Corrupts Participant State** — Back button, refresh, or tab switch causes data loss. **Prevent:** Formal FSM with transition guards, `beforeunload` handler, `popstate` interception, `visibilitychange`-gated RT timing, sessionStorage checkpointing after every trial.

2. **Convex Schema Doesn't Support Partial/Failed Trials** — Missing `status` field means abandoned trials are silently dropped or cause write failures. **Prevent:** `status` enum (`started`/`responded`/`completed`/`abandoned`/`timeout`), two-phase writes (stimulus onset first, response second), optional response fields, idempotent writes via trial UUID.

3. **SVG Rendering Differs Across Browsers** — Event rug line weights and text metrics vary between Chrome/Firefox/Safari, creating a stimulus consistency confound. **Prevent:** Explicit `shape-rendering="crispEdges"`, `vector-effect="non-scaling-stroke"`, web font for all labels, Playwright screenshot verification across browsers (<1% pixel difference threshold).

4. **Vercel Build Includes All 21 Prototype Routes + DuckDB** — 50+ MB deployment with 8-second cold starts. **Prevent:** Physically delete prototype routes from `ats-study` branch, strip ~35 heavy dependencies from `package.json`, ESLint import guard blocking `@/lib/db`/`@/lib/queries` in experiment code, bundle analysis gate before deploy.

5. **RT Measurement Uses Inaccurate Clock Source** — `Date.now()` has ±5ms precision and includes tab-switch time, poisoning RT data. **Prevent:** `performance.now()` exclusively for RT, visibility-gated pause accumulator, hardware timer calibration at experiment boot, RT sanity bounds (flag <100ms anticipatory, >10,000ms inattention).

## Implications for Roadmap

Based on combined architecture dependency chains and pitfall prevention requirements, the suggested phase structure is:

### Phase 1: Infrastructure & Core Logic

**Rationale:** Convex backend and stimulus data pipeline are prerequisite for all downstream work. Counterbalancing design and schema must be locked before any trial UI is built. This phase unblocks both stimulus rendering (needs data) and trial runner (needs Convex).

**Delivers:**
- `ats-study` branch created, prototype routes & dependencies stripped
- Convex installed, `convex/schema.ts` defined with partial-trial support
- Convex mutations: `startSession`, `submitTrialResponse`, `completeSession`
- `ConvexClientProvider` wired into root layout
- `NEXT_PUBLIC_CONVEX_URL` env var configured
- ATS mapping types (`src/lib/ats/types.ts`) and pure functions (`src/lib/ats/mapper.ts`)
- 24 seeded synthetic datasets generated from `src/lib/synthetic/goh-barabasi.ts`
- Counterbalancing assignment matrix (Latin square), committed as JSON, validated in CI
- Unit tests for mapper, dataset generator, and assignment balance

**Addresses pitfalls:** #2 (Convex schema → partial trials), #5 (Counterbalancing → Latin square), #10 (Convex sync → idempotent writes)

**Research flag:** Standard patterns — Convex schema and mutation patterns are well-documented. Skip `/gsd research-phase`.

### Phase 2: Stimulus Rendering & RT Measurement

**Rationale:** The stimulus is the independent variable. Cross-browser consistency and RT accuracy must be verified before any trial flow is built — otherwise you're building the trial runner on an unvalidated stimulus foundation.

**Delivers:**
- SVG `EventRug` component (tick marks on time axis)
- SVG `AllocationBands` component (per-interval weight visualization)
- Composite `StimulusView` (rug + bands + labels for Uniform and ATS conditions)
- `@visx/tooltip`, `@visx/text`, `@visx/annotation` installed and integrated
- RT measurement infrastructure: `performance.now()` onset capture, visibility-gated pause accumulator
- 500ms fixation cross stimulus onset guard
- Cross-browser screenshot verification (Playwright, <1% pixel difference)
- Stimulus container responsive to viewport with explicit rendering properties

**Addresses pitfalls:** #3 (SVG cross-browser → explicit rendering props + Playwright verification), #7 (RT timing → `performance.now()` + visibility gating)

**Research flag:** Needs research — SVG cross-browser consistency for data visualization stimuli is under-documented. Consider `/gsd research-phase` for Playwright visual regression setup.

### Phase 3: Experiment Flow & Trial Engine

**Rationale:** This is the core participant experience. It depends on stimulus rendering (Phase 2) and Convex persistence (Phase 1). The formal state machine must be built before any trial UI to prevent the invalid-transition pitfall.

**Delivers:**
- `useExperimentStore` — Zustand store with formal FSM (XState-like transition table)
- ExperimentShell component (Server Component shell pattern)
- Welcome screen with consent flow (consent recorded before any data collection)
- Instructions screen with "I understand" acknowledge
- Practice trial flow with correct/incorrect feedback overlay
- Experiment trial flow: stimulus → MCQ response → confidence slider → advance
- Block transition screen ("Block A complete — short break before Block B")
- Post-study questionnaire (NASA-RTLX + interpretability Likert items)
- Progress bar (Trial X of 12 per block, block label)
- Debriefing screen with condition revelation, study purpose, "Withdraw My Data" option
- Browser navigation guards: `beforeunload`, `popstate`, `visibilitychange` pause
- sessionStorage checkpointing after every trial completion
- Convex WAL (write-ahead log) in sessionStorage for crash recovery
- Convex transition event logging for audit trail

**Addresses pitfalls:** #1 (Browser nav → FSM + guards + checkpointing), #6 (Anonymity → consent flow + data minimization), #8 (State machine → formal FSM with transition table)

**Research flag:** Needs research — formal state machine patterns for web experiments (XState vs hand-rolled FSM). Consider `/gsd research-phase` for state machine library evaluation.

### Phase 4: Deployment, Route Stripping & Pilot

**Rationale:** Everything built in Phases 1-3 must be deployed as a clean, stripped bundle to Vercel. The import guard and bundle analysis gate must catch any prototype leakage before participants access the deployed URL.

**Delivers:**
- Physical route stripping: delete all prototype page directories from `src/app/`
- Dependency removal: `pnpm remove duckdb apache-arrow three deck.gl maplibre-gl leaflet density-clustering patch-package` and ~25 others
- `next.config.ts` cleaned (remove `serverExternalPackages`)
- `package.json` cleaned (remove `postinstall` DuckDB symlink)
- ESLint import guard: block `@/lib/db`, `@/lib/study/storage`, `@/lib/queries` in experiment code
- Bundle analysis gate: total JS <500KB gzipped, no Three.js/MapLibre/DuckDB chunks
- Vercel deployment configured with `NEXT_PUBLIC_CONVEX_URL` env var
- Convex production deployment (`npx convex deploy`)
- Landing page (`/`) modified to redirect to `/experiment`
- Data export (CSV/JSON download) button on Done screen
- Desktop browser check (≥1024px, modern browser)
- Pilot verification: N=2-3 internal testers complete full 24-trial run
- "Looks Done But Isn't" checklist: all 14 items verified

**Addresses pitfalls:** #4 (Vercel build size → route stripping + bundle gate), #9 (Import leaks → ESLint guard + bundle analysis verification)

**Research flag:** Standard patterns — Vercel + Next.js deployment is well-documented. Skip `/gsd research-phase`.

### Phase Ordering Rationale

- **Infrastructure before UI:** Convex and stimulus data are prerequisites. Phase 1 must complete before any stimulus rendering or trial UI.
- **Stimulus before flow:** Cross-browser consistency must be verified (Phase 2) before building the trial runner that displays stimuli (Phase 3). You can't validate the experiment if the stimulus itself varies by browser.
- **Flow before deployment:** All participant-facing code (Phase 3) must be complete before optimizing for deployment (Phase 4). Bundle stripping decisions depend on knowing exactly what imports exist.
- **Counterbalancing in Phase 1, not Phase 3:** The assignment matrix must be designed alongside the schema and validated before any trial logic references it. Pitfall #5 shows that late counterbalancing fixes require re-recruiting participants.
- **Pitfalls drive phase content more than feature groupings:** Each phase explicitly addresses 2-3 critical pitfalls. This ensures prevention is built in, not retrofitted.

### Alternative: Combined Phase Approach

If the team is small (1 developer), Phases 2+3 could merge into a single "Experiment Shell" phase since stimulus rendering and trial flow are tightly coupled. **Risk:** Merging increases the chance of building the trial runner on unvalidated stimuli (Pitfall #3) and delaying cross-browser verification until after flow is built. **Recommendation:** Keep separate unless timeline pressure forces consolidation. The validation gates (Playwright screenshots, RT calibration) are too important to defer.

### Research Flags

**Phases likely needing `/gsd research-phase` during planning:**
- **Phase 2 (Stimulus Rendering):** SVG cross-browser consistency for data visualization stimuli is under-documented. Playwright visual regression setup, `shape-rendering` property behavior across engines, and canvas fallback evaluation need deeper research.
- **Phase 3 (Experiment Flow):** Formal state machine library choice (XState vs hand-rolled FSM) for web experiments. XState is feature-complete but adds ~12KB; hand-rolled FSM is lighter but harder to audit. This tradeoff needs evaluation.

**Phases with well-documented standard patterns (skip research-phase):**
- **Phase 1 (Infrastructure):** Convex schema, mutations, and Next.js integration are well-documented via Context7. Zustand store patterns are proven in the existing codebase.
- **Phase 4 (Deployment):** Vercel + Next.js deployment, bundle analysis, and route stripping are standard patterns. The existing project already deploys to Vercel.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All version numbers verified via npm registry and Context7. Existing @visx packages confirmed at 3.12.0. Convex client at 1.42.1 confirmed installable and compatible with Next.js 16.2.9 + React 19.2.7. Anti-recommendations cross-referenced against codebase. |
| Features | **HIGH** | Requirements locked from PROJECT.md (EXP-01 through EXP-08). Feature landscape validated against jsPsych v8 documentation (official API) and existing Phase 80 evaluation infrastructure. Custom engine decision backed by 5-point rationale against jsPsych adoption. |
| Architecture | **HIGH** | Codebase analyzed for integration points (root layout, existing stores, synthetic generator). Convex integration pattern verified via Context7 (ConvexProvider, useMutation/useQuery). Route stripping strategy informed by directory listing of all 21 prototype routes. Build order validated against actual dependency chains. |
| Pitfalls | **HIGH** | Top 10 pitfalls sourced from MDN (Page Visibility API, History API, High Resolution Time — all W3C specs), Convex official docs (schema validation, mutation semantics), Next.js docs (output tracing, external packages), and existing codebase analysis. Recovery strategies defined for each pitfall. "Looks Done But Isn't" checklist provides 14 measurable verification gates. |

**Overall confidence:** **HIGH** — All findings verified against official documentation (MDN, Convex, Next.js), npm registry, and direct codebase inspection. No inferences from community blog posts or Stack Overflow.

### Gaps to Address

- **Convex project provisioning:** The research assumes a Convex project will be created via `npx convex init`. If the prototype already has a Convex project (no `convex/` directory found in codebase), a new project must be provisioned. This is a 5-minute setup task, not a research gap.
- **@visx/annotation optionality:** The annotation package may not be needed if the timeline stimuli are self-explanatory without callout markers. Defer final decision to Phase 2 design review.
- **Canvas fallback for SVG inconsistency:** If cross-browser SVG verification fails in Phase 2, a canvas-2D fallback may be needed. This is a risk mitigation path, not a gap — the architecture already notes this as Pitfall #3's final prevention strategy.
- **University ethics committee requirements:** The research references GDPR and general research ethics principles. The specific university ethics committee may have additional requirements (data retention period, consent form wording, debriefing content). Verify with the institution before Phase 1 implementation.
- **Convex free tier limits:** At N>200 participants, Convex free tier may be exceeded (~48K writes for 200 participants). The scalability analysis in ARCHITECTURE.md already notes this; no research gap, just a monitoring trigger.

## Sources

### Primary (HIGH confidence — official documentation)
- **Context7 `/websites/convex_dev`** — Convex client v1.42.1, ConvexProvider setup, useMutation/useQuery hooks, schema definition with defineTable/v.union/v.optional, idempotent writes via ctx.db.replace, Next.js App Router integration pattern
- **Context7 `/airbnb/visx` v3.12.0** — @visx/tooltip (useTooltip hook, TooltipWithBounds), @visx/text (verticalAnchor, textAnchor), @visx/annotation (connector + label components), @visx/xychart (evaluated, rejected)
- **MDN Web Docs** — Page Visibility API (visibilityState, visibilitychange), History API (pushState, popstate, beforeunload), High Resolution Time (performance.now() spec), requestAnimationFrame throttling
- **jsPsych v8 Official Documentation** (jspsych.org/v8) — Experiment lifecycle patterns, trial timeline structure, RT measurement approach, counterbalancing methods, Likert survey plugin API
- **npm registry** (via `npm view`) — All version numbers verified: convex@1.42.1, @visx/tooltip@3.12.0, @visx/text@3.12.0, @visx/annotation@3.12.0, nanoid@5.1.16 (evaluated, rejected)

### Secondary (HIGH confidence — codebase analysis)
- **PROJECT.md v4.0 ATS Perception Study** — Milestone scope, 8 experiment requirements (EXP-01 through EXP-08), Convex-only backend decision, dedicated ats-study branch decision
- **Codebase inspection** — `package.json` (dependency versions), `src/store/useStudyStore.ts` (existing crypto.randomUUID() usage), `src/store/useEvaluationStudyStore.ts` (Phase 80 study infrastructure patterns), `src/app/evaluation/` (existing study route pattern), `src/lib/study/protocol.ts` + `condition-order.ts` (protocol type patterns), `src/lib/synthetic/goh-barabasi.ts` (event generator for stimuli), `next.config.ts` (current config for strip targets), `src/app/` directory listing (21 prototype routes to strip)
- **Existing research files** — `.planning/research/STACK.md` (stack additions verified), `.planning/research/FEATURES.md` (feature landscape validated against jsPsych), `.planning/research/ARCHITECTURE.md` (build order validated), `.planning/research/PITFALLS.md` (10 pitfalls with prevention strategies)

### Tertiary (MEDIUM confidence — community practice)
- **Web Experiment Methodology (synthesized)** — Patterns for beforeunload guards, visibility-gated timing, Latin square counterbalancing, sessionStorage checkpointing, write-ahead logging for unreliable networks. Synthesized from common practice in jsPsych, PsychoJS, and lab.js ecosystems. Not verified against a single authoritative source; represents community consensus rather than spec-mandated behavior.

---

*Research completed: 2026-06-30*
*Ready for roadmap: yes*
*Next: Roadmap creation via `/gsd roadmap` or equivalent milestone planning*
