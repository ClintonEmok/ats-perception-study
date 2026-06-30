# Pitfalls Research — ATS Perception Study (v4.0)

**Domain:** Web-based within-subjects perception experiment on brownfield Next.js 16 application
**Researched:** 2026-06-30
**Confidence:** HIGH
**Context:** Adding a controlled ATS vs Uniform timeline perception study (24 trials, 3 task types, SVG stimuli, Convex backend) to an existing 21-route Next.js prototype with DuckDB, Three.js, and MapLibre. The study runs on a dedicated `ats-study` branch with Convex-only backend and deploys to Vercel for remote participants.

---

## Critical Pitfalls

### Pitfall 1: Browser Navigation Corrupts Participant State

**What goes wrong:**
A participant presses the browser back button during a trial, refreshes the page, or switches tabs. When they return, the experiment either restarts from the beginning (losing all prior trial data), shows a broken state (half-rendered stimulus with no response UI), or — worst case — silently continues collecting RT data while the participant is in another tab, producing spurious 30-second reaction times that poison the dataset.

**Why it happens:**
- Next.js App Router uses client-side navigation by default — `popstate` events fire on browser back/forward but the experiment state machine (typically a React state machine or Zustand store) lives in-memory and is lost on hard navigation
- `requestAnimationFrame` stops firing in background tabs (browser throttling of hidden documents per the Page Visibility API), but `performance.now()` continues to advance — if the experiment timer uses wall-clock time rather than visibility-gated time, RT measurements become invalid
- The History API (`pushState`/`replaceState`) is designed for SPAs to synthesize history entries, but most experiment implementations don't intercept `popstate` or `beforeunload`
- Browser tab throttling: `setTimeout`/`setInterval` are throttled to ≤1Hz in background tabs after 30 seconds; RAF stops entirely per MDN spec

**How to avoid:**
1. **Visibility-gated timing**: Use `document.addEventListener('visibilitychange', ...)` to pause the trial timer when `document.visibilityState === 'hidden'`. Record `visibilityHiddenDuration` per trial as a data quality flag. Never use `Date.now()` for RT — use `performance.now()` only during `visibilityState === 'visible'` periods.
2. **beforeunload guard**: Add a `beforeunload` event listener that warns participants they'll lose progress. Set `event.returnValue = 'Your progress will be lost.'` (browsers show a generic dialog; the custom message is ignored by modern browsers, but the dialog itself prevents accidental navigation).
3. **popstate interception**: Use `history.pushState(null, '', window.location.href)` on experiment entry, then listen for `popstate` to show a confirmation dialog rather than allowing back-navigation to leave the experiment silently.
4. **SessionStorage checkpointing**: Persist the experiment state machine position (current trial index, condition assignment, completed trial IDs, accumulated RT data) to `sessionStorage` after every trial completion. On page load, check for a resumed session and restore state. `sessionStorage` survives refreshes but is scoped to the tab (doesn't leak between browser sessions).
5. **Trial timeout + abandonment logging**: Set a maximum trial duration (e.g., 30 seconds for a perception task). If exceeded, mark the trial as `abandoned` in Convex with `completion_status: 'timeout'` and advance to the next trial. Never silently discard timeout trials — they are themselves data about task difficulty.
6. **Immutable trial IDs**: Each trial gets a UUID at generation time. On Convex write, use the trial UUID as an idempotency key — if the same trial UUID is written twice (e.g., due to retry after refresh), the second write is a no-op or update, not a duplicate row.

**Warning signs:**
- RT distributions show a bimodal pattern with a spike at >10 seconds (tab-switch artifacts)
- Convex logs show duplicate trial writes for the same trial index
- Participants report "the experiment restarted when I switched tabs"
- Network waterfall shows Convex writes arriving out of order (indicates state machine drift)

**Phase to address:**
Phase 1 (Experiment Shell & Participant Flow) — the state machine and browser guard infrastructure must be in place before any trial logic is built.

---

### Pitfall 2: Convex Schema Doesn't Accommodate Partial or Failed Trials

**What goes wrong:**
The schema assumes every trial completes successfully (all fields `NOT NULL`, no status column). When a participant abandons mid-trial, refreshes, or hits a network error, the Convex mutation either fails entirely (losing ALL data from that trial, including stimulus onset timestamp), or succeeds with `null` values that break downstream SQL analysis (e.g., `AVG(rt_ms)` returns `NaN` or silently excludes partial trials, biasing results toward easier trials where participants didn't quit).

**Why it happens:**
- Convex validators encourage strict field requirements — `v.number()` is the default, `v.optional(v.number())` must be explicit
- Schema design typically starts from "what does a complete trial look like?" rather than "what failure modes exist?"
- The existing Phase 80 study storage (`src/lib/study/storage.ts`) uses DuckDB tables with `accuracy INTEGER` and `completion_time_ms BIGINT` that are always written — no concept of a "partial write" or "abandoned trial" in the schema
- Convex's optimism means writes usually succeed, but network partitions between participant browser and Convex backend still happen

**How to avoid:**
1. **Trial status enum**: Every trial row has a `status` field: `v.union(v.literal('started'), v.literal('responded'), v.literal('completed'), v.literal('abandoned'), v.literal('timeout'))`. The trial is created as `started` at stimulus onset, updated to `responded` when the participant clicks, and finalized as `completed` after confidence rating. If the participant navigates away, the trial remains `started` or `responded` — analysis can exclude these or analyze them separately.
2. **Two-phase writes**: Phase 1 writes `{ trialId, participantId, status: 'started', stimulus_onset_ms, condition, taskType, datasetId }` immediately when the stimulus renders. Phase 2 updates `{ status, response, accuracy, rt_ms, confidence }` after the participant responds. This means even abandoned trials leave a record of what stimulus was shown and when.
3. **Null-safe analysis views**: Define Convex queries that filter by `status === 'completed'` for primary RT/accuracy analysis, but also expose queries that count `status === 'abandoned'` per condition for dropout-rate analysis (a secondary dependent variable that can itself show condition effects).
4. **Optional response fields**: Make `response`, `accuracy`, `rt_ms`, and `confidence` optional (`v.optional(...)`) in the validator. The presence of `stimulus_onset_ms` and `status` is the minimum viable trial record.
5. **Idempotency via trial UUID**: Use the trial UUID (generated client-side at trial start) as the document ID or a unique index. Convex mutations use `.replace()` semantics when writing by ID — this prevents duplicate trials if the client retries.

**Warning signs:**
- Convex function logs show validation errors for "missing required field: accuracy"
- Analysis script throws "Cannot read property of null" on RT values
- Dropout rate is 0% in data but participants reported quitting early (means abandoned trials are silently dropped)
- Trial count per participant doesn't equal 24 (some trials failed silently)

**Phase to address:**
Phase 2 (Convex Schema & Data Pipeline) — schema must be designed for failure modes before any trial data is collected.

---

### Pitfall 3: SVG Rendering Differs Across Browsers, Breaking Stimulus Consistency

**What goes wrong:**
The ATS vs Uniform stimulus is an SVG timeline (event rug marks + allocation bands) rendered client-side. In Chrome, the band heights are rendered with `stroke-alignment: inner` by default; in Firefox, the same SVG property is interpreted as `center`; in Safari, sub-pixel anti-aliasing makes thin event rug lines (1px stroke-width) appear at different opacities. The result: participants on different browsers see measurably different stimuli — the ATS condition's expanded burst intervals look 2-3px wider in Chrome than Firefox, creating a confound where browser choice affects accuracy, not the timeline condition.

**Why it happens:**
- SVG 1.1 and SVG 2 have subtle rendering differences across browser engines (Blink vs Gecko vs WebKit)
- CSS properties like `stroke-width`, `shape-rendering`, and `text-rendering` have browser-specific defaults
- Sub-pixel positioning: Chrome snaps to pixel boundaries for crisp lines; Firefox uses anti-aliased sub-pixel rendering for smoother appearance — this changes perceived line weight
- Font rendering: if any text labels use system fonts, `font-family: sans-serif` resolves to different fonts on different OSes (Arial on Windows, Helvetica on macOS, Roboto on ChromeOS), changing text width and potentially clipping labels
- SVG `viewBox` scaling: if the SVG uses a fixed `viewBox` with `preserveAspectRatio`, different container sizes produce different effective resolutions

**How to avoid:**
1. **Explicit rendering properties**: Set `shape-rendering="crispEdges"` on all event rug marks to force pixel-snapped rendering across browsers. Set `text-rendering="optimizeLegibility"` on labels. Set `vector-effect="non-scaling-stroke"` on lines so stroke width stays consistent regardless of SVG scale.
2. **Web font for labels**: Use a single web font (e.g., the existing Geist font already loaded in the app) for all SVG text elements instead of system fonts. This ensures identical text metrics across OSes.
3. **Browser-normalized viewport**: Render the SVG into a fixed-aspect-ratio container (e.g., 800×200 logical pixels) and use CSS `width: 100%` with `max-width` to scale. The `viewBox` establishes a resolution-independent coordinate space — but the container size must be identical across viewports to produce identical rasterization.
4. **Screenshot verification**: During Phase 3 (Stimulus Rendering), take reference screenshots of each stimulus in Chrome, Firefox, and Safari via Playwright or manual comparison. Measure pixel differences between browsers. Any difference >1% of pixels between browsers for the same stimulus is a confound that must be fixed.
5. **No CSS animations on stimuli**: Don't animate stimulus elements with CSS transitions or `requestAnimationFrame`. The stimulus must be a static render for the duration of the trial. Any motion introduces a timing confound.
6. **Pre-render to canvas if SVG is insufficient**: If cross-browser SVG consistency cannot be achieved, render the stimulus to an offscreen `<canvas>` using identical drawing commands. Canvas 2D rendering is more consistent across browsers than SVG.

**Warning signs:**
- Screenshots of the same stimulus at the same viewport size look different in Chrome vs Firefox side-by-side
- Event rug marks appear "thicker" in one browser
- Text labels overflow or clip in Safari but not Chrome
- Per-browser accuracy analysis shows a significant browser × condition interaction

**Phase to address:**
Phase 3 (Stimulus Rendering Engine) — must include cross-browser verification before any participant data is collected.

---

### Pitfall 4: Vercel Build Includes All 21 Prototype Routes + DuckDB WASM → Slow Cold Starts

**What goes wrong:**
The `ats-study` branch deploys to Vercel. Even though only the experiment route (`/experiment`) is needed, Next.js's build process includes ALL pages under `src/app/` — all 21 routes. This means the build output includes:
- Three.js (~600 KB gzipped)
- MapLibre GL (~230 KB gzipped)
- DuckDB WASM binary (~20 MB)
- All dashboard-demo components, stores, shaders, and workers
- All STKDE, figure, and evaluation route code

The deployment artifact is 50+ MB instead of ~2 MB. Vercel cold starts take 4-8 seconds instead of <1 second. The first participant to load the experiment waits 8 seconds on a white screen — they assume the page is broken and leave. Additionally, the large bundle uses Vercel's bandwidth quota and may trigger function execution timeouts for API routes that reference DuckDB which isn't available on the stripped branch.

**Why it happens:**
- Next.js builds all pages in `src/app/` by default — there's no built-in "build only these routes" configuration
- `outputFileTracingExcludes` (in `next.config.ts`) can exclude files from the deployment package, but Next.js still compiles and code-splits ALL page entry points
- The existing `next.config.ts` has `serverExternalPackages: ['duckdb']` which tells Next.js to NOT bundle DuckDB, but the import statement in `src/lib/db.ts` still gets traced and included in server bundles for API routes
- Branch-based file deletion (removing prototype routes from `ats-study` branch) needs to be done explicitly — Next.js won't skip them just because they're unused
- The Convex client import pattern means Convex's bundle (~150 KB) is fine, but the prototype's visualization dependencies are still tree-shaken into shared chunks if any component is imported anywhere in the tree

**How to avoid:**
1. **Dedicated layout for experiment route**: Create `src/app/experiment/layout.tsx` that does NOT import the root layout's providers (ThemeProvider from the prototype, QueryProvider, OnboardingTour). The experiment route should be fully self-contained with its own minimal layout — no `@/components/viz/*`, `@/store/*`, or `@/lib/db.ts` imports.
2. **Delete prototype routes from branch**: On the `ats-study` branch, physically remove all prototype page directories:
   ```
   rm -rf src/app/dashboard-demo src/app/stkde src/app/stkde-3d src/app/timeline-test \
          src/app/timeline-test-3d src/app/timeslicing src/app/timeslicing-algos \
          src/app/evaluation src/app/stats src/app/hotspot-evolution src/app/figures \
          src/app/cube-sandbox src/app/demo src/app/docs src/app/algorithms
   ```
   Keep only `src/app/experiment/`, `src/app/page.tsx` (redirect to experiment), `src/app/layout.tsx` (minimal), and `src/app/api/` (if needed).
3. **Remove DuckDB dependency from branch**: Delete or stub `src/lib/db.ts` on the `ats-study` branch. The experiment uses Convex exclusively — DuckDB's `serverExternalPackages` entry in `next.config.ts` can be removed on this branch. Verify no experiment code imports from `@/lib/db` or `@/lib/queries/`.
4. **Vercel project config**: Set the build command on Vercel to `pnpm build` (standard). Add `DUCKDB_PATH` and `DISABLE_DUCKDB` env vars on Vercel to prevent DuckDB initialization attempts. Set `NEXT_PUBLIC_CONVEX_URL` to the Convex deployment URL.
5. **Bundle analysis gate**: Before deploying, run `pnpm build && npx next-bundle-analyzer` (or `ANALYZE=true pnpm build`) and verify: no Three.js chunk, no MapLibre chunk, no DuckDB WASM, total JS <500 KB gzipped. If any visualization library appears in the bundle, trace the import and remove it.

**Warning signs:**
- `pnpm build` on ats-study branch takes >2 minutes (indicates full prototype build)
- `.next/standalone/` directory is >20 MB
- Vercel deployment log shows "Compiled /dashboard-demo" or "Compiled /stkde" pages
- First participant reports "the page took forever to load"
- Vercel function logs show "Cannot find module 'duckdb'" errors (indicates DuckDB import was traced but not available)

**Phase to address:**
Phase 4 (Deployment & Route Stripping) — must be done before any participants access the deployed URL. The branch is the right isolation mechanism; this phase executes the physical stripping.

---

### Pitfall 5: Counterbalancing Logic Produces Uneven Condition Distribution

**What goes wrong:**
The experiment design calls for 24 trials: 12 Uniform, 12 ATS, counterbalanced across participants so half see Uniform first (block A) and half see ATS first (block B). The counterbalancing logic accidentally produces an uneven distribution: 70% of participants get Uniform-first, 30% get ATS-first. This is discovered after 40 participants have completed the study. The data is still usable but statistical power for the order × condition interaction is reduced, and the thesis committee questions the randomization method.

**Why it happens:**
- The existing Phase 80 code (`src/lib/study/condition-order.ts`) hard-codes `'A->B' = { blockA: 'uniform', blockB: 'adaptive' }` and `'B->A' = { blockA: 'adaptive', blockB: 'uniform' }` — this maps block labels to conditions deterministically. But it doesn't specify HOW the block order is assigned to participants.
- Common naive implementations: alternating assignment (A-B-A-B...) is predictable; `Math.random() > 0.5` can produce streaks (e.g., 7 A's in a row in a small sample); `participantId % 2` biases if participant IDs have parity patterns.
- Within-block trial order: if trials 1-12 are all Uniform and 13-24 are all ATS, fatigue effects confound the condition comparison. True counterbalancing requires interleaving or Latin square design across stimulus sets.
- The 3 task types (Peak Identification, Period Comparison, Pattern Recognition) add another counterbalancing dimension: if all Peak tasks happen in the first block for most participants, task type is confounded with block order.

**How to avoid:**
1. **Latin square for condition × task × dataset assignment**: A 2 (condition) × 3 (task type) × 8 (datasets) design requires a balanced assignment matrix. Use a pre-computed Latin square where each participant sees each task type 8 times (4 Uniform, 4 ATS) and each dataset appears exactly once per condition across all participants. Generate this matrix once, commit it as a JSON file (`src/experiment/design/assignment-matrix.json`), and iterate through participants sequentially.
2. **Sequential participant counter**: Instead of random assignment, use a sequential counter. Participant 1 gets assignment row 1, participant 2 gets row 2, etc. The matrix guarantees balance. Store the next participant index in Convex (atomic increment) to prevent race conditions in concurrent participant starts.
3. **Seed-based reproducibility**: Use a seeded PRNG (e.g., `seedrandom` library or a simple mulberry32 implementation) with a fixed seed committed to the repo. Generate the assignment matrix from the seed. This means the assignment is deterministic, reproducible, and auditable — the thesis can state "assignments were generated from seed 0xDEADBEEF using a 32-bit LCG."
4. **Within-block interleaving**: Don't group all Uniform trials together and all ATS trials together. Interleave using a balanced sequence: e.g., U-A-A-U-A-U-U-A... where no condition appears more than 2 times consecutively. This controls for fatigue and practice effects within block.
5. **Task type counterbalancing**: Ensure each task type appears equally often in the first half vs second half of the experiment. A participant's first 12 trials and last 12 trials should each contain 4 Peak, 4 Period, 4 Pattern tasks.
6. **Balance check function**: Write a pure function `validateAssignmentMatrix(matrix)` that asserts: (a) each participant has exactly 12 Uniform + 12 ATS, (b) each task type appears 4× per condition per participant, (c) overall, Uniform-first and ATS-first participant counts differ by ≤1. Run this in CI.

**Warning signs:**
- After 10 participants: condition-first distribution is 8/2 instead of ~5/5
- A specific dataset ID appears 3× in Uniform but 0× in ATS across participants
- Participant debriefing reveals "all the hard tasks were in the second half"
- Analysis reveals a significant order effect (block A > block B) that's larger than the condition effect (ATS vs Uniform) — indicates counterbalancing failure

**Phase to address:**
Phase 2 (Convex Schema & Data Pipeline) — the assignment matrix must be designed alongside the schema, and the balance validation must run before any participant is recruited.

---

### Pitfall 6: Anonymous Participant Data Is Stored With Identifiable Metadata

**What goes wrong:**
The study is designed to be anonymous — participants are identified only by a UUID. However, Convex automatically logs request metadata including IP addresses, user agents, and timestamps in its execution log. If the Convex dashboard is accessible to anyone on the team, participant IP addresses can be mapped to approximate locations. Additionally, the Vercel deployment logs request IPs and user agents. If a participant's browser sends a `Referer` header (e.g., they clicked a link from their university email), their identity can be inferred. This violates the anonymity guarantee in the consent form and may breach the university's ethics committee requirements.

**Why it happens:**
- Convex stores request metadata automatically — it's part of the platform's observability, not an explicit developer decision
- Vercel's default logging includes client IP addresses in access logs (available in the Vercel dashboard for 24 hours)
- Browser fingerprints (screen resolution, timezone, language, installed fonts, WebGL renderer string) are sent automatically with every request — even without cookies, participants can be re-identified across sessions
- The consent form says "anonymous" but the technical implementation defaults to identifying
- Ethics forms (participant information sheet, consent form) are often written before the technical implementation is designed — the two drift apart

**How to avoid:**
1. **Minimal data collection principle**: The Convex schema should store ONLY: `participantUUID`, `trialId`, `condition`, `taskType`, `datasetId`, `stimulus_onset_ms`, `response`, `accuracy`, `rt_ms`, `confidence`, `status`, `completed_at`. No IP, no user agent, no screen resolution, no browser fingerprint. Document this in the ethics application as "data minimization."
2. **Convex environment isolation**: Use a separate Convex project (not the prototype's Convex deployment) for the perception study. The study Convex project has a single purpose: store de-identified trial data. Access is limited to the researcher.
3. **Disable Vercel access logging**: In Vercel project settings, disable "Access Logs" or set retention to 0. Alternatively, use Vercel's "Audience" analytics only for aggregate page view counts, not individual request logs.
4. **No third-party analytics on experiment page**: Remove any analytics scripts (Google Analytics, Vercel Analytics, Sentry, LogRocket) from the experiment route. The `<head>` of the experiment page must contain zero external script tags that phone home with participant data.
5. **Data export and deletion**: Build a Convex action that exports all trial data for a given `participantUUID` as a JSON file AND a mutation that deletes all data for that UUID. This supports the ethics requirement of "right to withdraw your data." Include a "Withdraw My Data" link on the post-study debriefing page.
6. **Ethics-first consent flow**: The first screen the participant sees is the consent form (plain HTML, no tracking). They must explicitly click "I consent" before ANY data is sent to Convex. The consent acceptance is the only record stored before the participant UUID is generated. Store consent as a separate Convex document with only `participantUUID` and `consented_at` — no PII.
7. **IP-blind Convex**: Convex does not expose client IP to mutation handlers by default — only to the execution log in the dashboard. Restrict dashboard access to the researcher only. Document in the ethics application that "server logs are accessible only to the principal investigator and are not analyzed."

**Warning signs:**
- Convex dashboard log shows `remoteAddress: 192.168.x.x` or actual client IPs
- The experiment page loads Google Fonts (phones home to Google) or any CDN resource that logs requests
- Browser DevTools Network tab shows requests to `vitals.vercel-insights.com` or `www.google-analytics.com` on the experiment page
- Ethics committee feedback: "How is anonymity technically enforced?" — need to answer with specific technical measures, not general statements

**Phase to address:**
Phase 1 (Experiment Shell & Participant Flow) — the consent flow, privacy architecture, and data minimization must be designed before any participant-facing code is written. Ethics approval should reference the technical architecture.

---

### Pitfall 7: Response Time Measurement Uses Inaccurate Clock Source

**What goes wrong:**
Reaction time (RT) is the primary dependent variable. The experiment measures RT from stimulus onset to participant click using `Date.now()` or a `setInterval`-based timer. `Date.now()` has ~1-5ms granularity and is subject to system clock adjustments (NTP sync, daylight savings). More critically, if the participant switches tabs and the timer uses wall-clock time, a 30-second tab switch is recorded as a 30-second RT. The resulting RT distribution has a long tail of spurious values that cannot be distinguished from genuine slow responses without visibility data.

**Why it happens:**
- `Date.now()` is the most familiar time API — developers reach for it by default
- `performance.now()` returns a `DOMHighResTimeStamp` with sub-millisecond precision (typically 5μs resolution) and is monotonically increasing (not affected by system clock adjustments). It is the correct API for RT measurement per the W3C High Resolution Time specification.
- Most tutorial code uses `Date.now()` for simplicity; few web experiment tutorials mention `performance.now()`
- The existing Phase 80 protocol (`src/lib/study/storage.ts`) uses `startedAt: number` and `completedAt: number` as epoch timestamps — no distinction between wall-clock and high-resolution time
- `requestAnimationFrame` stops in background tabs — any timer driven by RAF will freeze. But `performance.now()` continues to advance — the timer must be explicitly paused on visibility loss.

**How to avoid:**
1. **Use `performance.now()` exclusively for RT**: Capture `const onset = performance.now()` at stimulus render. Capture `const offset = performance.now()` at participant click. RT = `offset - onset`. Store RT as a float in milliseconds (e.g., `1234.567`). Also store the wall-clock times (`Date.now()`) as secondary fields for debugging but NOT for primary analysis.
2. **Visibility-gated timing accumulator**: Maintain a `pausedDuration` accumulator. On `visibilitychange` to `hidden`, record `pauseStart = performance.now()`. On `visibilitychange` to `visible`, add `performance.now() - pauseStart` to `pausedDuration`. The effective RT is `(offset - onset) - pausedDuration`. Store both raw RT and effective RT in the trial record.
3. **Hardware timer validation**: On experiment load, run a calibration: record 1000 `performance.now()` samples in a tight loop. Verify the minimum delta is <1ms (sub-millisecond precision available). If the minimum delta is >5ms, the browser is throttling the timer — flag this in the data as a `timer_precision: 'low'` quality flag.
4. **No `setTimeout`/`setInterval` for timing**: These are throttled to ≤1Hz in background tabs. Use them only for trial timeout enforcement (e.g., "show feedback after 2 seconds"), never for RT measurement.
5. **RT sanity bounds**: Reject (flag, don't delete) RTs <100ms (anticipatory response — participant clicked before processing stimulus) and RTs >10,000ms (likely inattention). These are valuable data quality indicators even if excluded from primary analysis.

**Warning signs:**
- RT histogram shows spikes at exactly 1000ms intervals (indicates `setInterval`-based timing)
- RT values change by exactly 3600 seconds (daylight savings time shift — indicates `Date.now()` usage)
- All RTs are integers (indicates `Date.now()` — `performance.now()` returns fractional milliseconds)
- 5% of trials have RT exactly 0 (indicates uninitialized timer variable)

**Phase to address:**
Phase 3 (Stimulus Rendering Engine) — the timing infrastructure must be built into the trial component that renders stimuli. The stimulus component is the natural owner of RT measurement.

---

### Pitfall 8: Experiment State Machine Allows Invalid State Transitions

**What goes wrong:**
The experiment progresses through states: Welcome → Instructions → Practice → Block-A → Block-B → Questionnaire → Debrief. The state machine is implemented as a React `useState` with a string literal (`const [step, setStep] = useState('welcome')`). A race condition in a Convex mutation callback triggers `setStep('block-b')` before Block-A's final trial response is acknowledged by Convex. The participant sees Block-B's first stimulus while Block-A's last trial is still in-flight. The trial data arrives at Convex out of order: Block-B trial 1 is written before Block-A trial 12. The analysis script joins on `trial_order` and silently pairs Block-B's RT with Block-A's stimulus, producing garbage data.

**Why it happens:**
- React state updates are asynchronous and batched — `setStep` calls from different event handlers can interleave unpredictably
- Convex mutations are optimistic (the UI updates immediately, the server confirms later) — the state machine advances based on optimistic success, but a network failure could mean the trial was never written
- React state machines are inherently fragile: no transition guards, no state history, no validation that the previous step actually completed
- The existing study protocol (`src/lib/study/protocol.ts`) defines `StudyStepId` as a linear sequence but doesn't implement transition validation

**How to avoid:**
1. **Formal state machine (XState or explicit FSM)**: Define the experiment as a finite state machine with explicit transitions:
   ```typescript
   type ExperimentState = 'welcome' | 'consent' | 'instructions' | 'practice' | 'block-a' | 'block-b' | 'questionnaire' | 'debrief' | 'done';
   type ExperimentEvent = 'CONSENT_GIVEN' | 'INSTRUCTIONS_READ' | 'PRACTICE_COMPLETE' | 'TRIAL_COMPLETE' | 'BLOCK_COMPLETE' | 'QUESTIONNAIRE_COMPLETE' | 'DEBRIEF_READ';
   
   const transitions: Record<ExperimentState, Partial<Record<ExperimentEvent, ExperimentState>>> = {
     welcome: { CONSENT_GIVEN: 'consent' },
     consent: { CONSENT_GIVEN: 'instructions' }, // re-entry guard
     instructions: { INSTRUCTIONS_READ: 'practice' },
     practice: { PRACTICE_COMPLETE: 'block-a' },
     'block-a': { TRIAL_COMPLETE: 'block-a', BLOCK_COMPLETE: 'block-b' },
     'block-b': { TRIAL_COMPLETE: 'block-b', BLOCK_COMPLETE: 'questionnaire' },
     questionnaire: { QUESTIONNAIRE_COMPLETE: 'debrief' },
     debrief: { DEBRIEF_READ: 'done' },
     done: {},
   };
   ```
   This makes invalid transitions impossible by construction. The `TRIAL_COMPLETE` event doesn't advance the block — only `BLOCK_COMPLETE` does (fired after the Nth trial's Convex write is confirmed).
2. **Convex-confirmed state transitions**: Don't advance the block until ALL trials in the block have been confirmed written to Convex. Maintain a `pendingTrialWrites: Set<string>` set — when a trial write is acknowledged, remove it from the set. Only fire `BLOCK_COMPLETE` when the set is empty.
3. **State serialization**: Persist the current state machine position to `sessionStorage` after every transition. On page load, hydrate from `sessionStorage`. This survives refreshes and provides a recovery path for crashed tabs.
4. **Transition logging**: Log every state transition to Convex as an `experiment_event` table row: `{ participantId, fromState, toState, event, timestamp }`. This provides an audit trail for debugging state machine bugs and can be analyzed to detect unexpected transition patterns (e.g., a participant jumping from block-a directly to debrief).

**Warning signs:**
- Convex data shows trials with `trial_order` out of sequence (e.g., order 13 written before order 12)
- Two trials have the same `trial_order` value for the same participant
- A participant's state log shows `block-a → debrief` (skipped block-b and questionnaire)
- The browser console shows React warnings about "Cannot update during an existing state transition"

**Phase to address:**
Phase 1 (Experiment Shell & Participant Flow) — the state machine is the backbone of the experiment. It must be implemented before any trial UI.

---

### Pitfall 9: Brownfield Imports Leak Into Experiment Bundle Despite Route Isolation

**What goes wrong:**
The experiment route is designed to be self-contained: `src/app/experiment/page.tsx` imports only experiment components. But a utility function in `src/lib/study/` imports from `@/lib/db` (DuckDB), which in turn imports `duckdb` WASM. Next.js's tree-shaking can't eliminate the DuckDB import because it's a side-effectful module (registering WASM, opening database connections). The experiment deployment still includes DuckDB WASM in the server bundle. On Vercel, the serverless function tries to initialize DuckDB on cold start, fails because the WASM file isn't available at the expected path, and throws — taking down the experiment API route.

**Why it happens:**
- Next.js tree-shaking is conservative with modules that have side effects (`duckdb` initializes WASM at import time)
- Import chains are hard to audit manually: `experiment/page.tsx` → `@/lib/study/protocol.ts` → (doesn't import db directly, but `@/lib/study/storage.ts` does) → `@/lib/db` → `duckdb`
- The `serverExternalPackages: ['duckdb']` config tells Next.js to keep DuckDB as an external dependency at runtime — but on Vercel's serverless environment, the DuckDB native module isn't available
- Even if the experiment code doesn't call `insertStudy()`, the import of `@/lib/study/storage.ts` (for type definitions, maybe) pulls in the entire module including its dependencies
- `tsconfig.json` path aliases (`@/*` → `src/*`) make it easy to accidentally import from the prototype's lib directory

**How to avoid:**
1. **No imports from `@/lib/study/` in experiment code**: Create a parallel experiment library at `src/experiment/lib/` that duplicates ONLY the types and pure functions needed (e.g., the `StudyStepId` type without the DuckDB-backed storage). The experiment code NEVER imports from `src/lib/study/` or `src/lib/db` or `src/lib/queries/`.
2. **Bundle import guard**: Add an ESLint rule on the `ats-study` branch that forbids imports from `@/lib/db`, `@/lib/study/storage`, `@/lib/queries/` in any file under `src/experiment/` or `src/app/experiment/`:
   ```json
   {
     "rules": {
       "no-restricted-imports": ["error", {
         "patterns": ["@/lib/db*", "@/lib/study/storage*", "@/lib/queries*"]
       }]
     }
   }
   ```
3. **Dead-code elimination verification**: After build, run `npx next-bundle-analyzer` and grep for `duckdb` in the output. If `duckdb` appears in any chunk, trace the import and eliminate it. Add this check to a pre-deploy CI step.
4. **Experiment-only tsconfig**: Consider a separate `tsconfig.experiment.json` that excludes prototype paths from compilation. The experiment code shouldn't reference types that pull in visualization dependencies.
5. **Keep experiment types self-contained**: The experiment needs its own lightweight types, not the full Phase 80 protocol types that reference DuckDB tables. Define `ExperimentTrial`, `ExperimentParticipant`, etc. in `src/experiment/types.ts` with only Convex-compatible validators.

**Warning signs:**
- `pnpm build` on ats-study branch shows `duckdb` in the output (grep for it)
- Vercel function logs show "Error: Cannot find module 'duckdb'" or WASM loading errors
- The experiment page's JavaScript bundle includes references to `@/lib/db` or `@/lib/study/storage`
- Import autocomplete in the IDE suggests `@/lib/study/` paths from experiment files

**Phase to address:**
Phase 4 (Deployment & Route Stripping) — the import audit must happen when the experiment is isolated for deployment. Phase 1-3 code should already follow the import guard rule.

---

### Pitfall 10: Convex Real-Time Sync Overwrites Participant Responses During Network Flakiness

**What goes wrong:**
Convex's real-time reactivity means that when a participant's trial data is written via a mutation, any subscribed queries automatically re-fetch. The experiment UI subscribes to a `getParticipantProgress` query to show "Trial 8 of 24". During a network hiccup, the mutation succeeds on the server but the client times out waiting for acknowledgment. The client retries the mutation (deterministic trial UUID makes this safe — see Pitfall 2), but in the meantime, the UI re-renders with stale query data showing "Trial 7 of 24". The participant, confused by the UI regression, clicks the submit button again, triggering a THIRD mutation for the same trial. Convex's optimistic updates and automatic retry make this particularly tricky — the platform's reliability features become foot-guns when state machine transitions depend on write acknowledgment.

**Why it happens:**
- Convex mutations are automatically retried on network failure — but the retry happens after a delay, during which the client's local state may have advanced
- Convex queries re-subscribe when the underlying data changes — a mutation that writes trial 8 triggers a re-fetch of `getParticipantProgress` which may briefly show stale data before the new data arrives
- The participant sees the UI "flicker" (advance, regress, advance again) and loses trust in the system
- In a perception experiment where timing matters, a mutation retry that takes 3 seconds means the participant has moved on to the next trial while the previous trial's data is still unsettled

**How to avoid:**
1. **Optimistic UI with local state**: Don't derive UI state (current trial, progress bar) from Convex queries. Maintain a local Zustand store or React state that advances optimistically when the participant clicks. Use Convex mutations as fire-and-forget writes (with retry) — the UI doesn't wait for confirmation to display the next trial. The Convex query for progress is only used for recovery (page refresh), not for driving the live UI.
2. **Idempotent writes**: Every mutation uses the trial UUID as the document ID. `ctx.db.replace(trialId, { ... })` ensures that retries don't create duplicate records. This is Convex's recommended pattern for at-least-once delivery semantics.
3. **Debounce progress queries**: If you must use a Convex query for progress display, subscribe with a `{ cacheTTL: 5000 }` option (or use TanStack Query with `staleTime: 5000`) so the UI doesn't flicker on every write.
4. **Write-ahead log in sessionStorage**: Before firing a Convex mutation, write the trial data to `sessionStorage` as a write-ahead log entry. If the page crashes or the network fails, the recovery logic replays unacknowledged WAL entries on next load. This ensures no trial data is lost even if Convex is unreachable.
5. **Mutation timeout + fallback**: Set a 5-second timeout on mutation acknowledgment. If the mutation hasn't been acknowledged after 5 seconds, show a subtle "Saving..." indicator but DO NOT block the participant from proceeding to the next trial. Queue the unacknowledged write and retry it in the background. The participant should never wait for network I/O.

**Warning signs:**
- Progress counter briefly shows "Trial 7" after the participant just completed trial 8 (flicker)
- Convex dashboard shows duplicate trial writes for the same trial UUID (retry without idempotency)
- Network throttle (DevTools "Slow 3G") causes the experiment to freeze between trials
- Participants report "the page was laggy" or "it showed the wrong trial number"

**Phase to address:**
Phase 2 (Convex Schema & Data Pipeline) — the write pattern (optimistic UI, idempotent writes, WAL backup) must be designed with the schema.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `Date.now()` instead of `performance.now()` for RT | Familiar API, works in all environments | RT precision drops to ~5ms; system clock adjustments corrupt data; tab-switch time included. Invalidates RT as a dependent variable. | **Never** — `performance.now()` is supported in all browsers since 2012. No excuse. |
| String-literal state machine (`useState('welcome')`) | Zero dependencies, quick to implement | Invalid transitions are impossible to prevent; state history lost; concurrent updates create race conditions. | Only for a static single-page form with <3 states. Not for a 26-trial experiment. |
| Importing `@/lib/study/protocol.ts` for type definitions in experiment code | Reuse existing types, less code to write | Pulls in DuckDB imports via transitive dependencies; unnecessarily couples experiment to prototype. | Never — define experiment-specific types. The cost of type duplication is negligible compared to bundle bloat from unwanted imports. |
| Deriving UI state from live Convex queries | "Reactive UI" sounds appealing | Network latency causes progress flicker; query re-subscription races with mutation acknowledgment; participant sees stale state. | Only for the researcher dashboard (post-experiment), never for the participant-facing trial UI. |
| Alternating assignment (`participantId % 2`) for counterbalancing | One line of code | Predictable, potentially biased by ID parity patterns, uneven distribution in small samples | Never for a thesis experiment. Use a pre-computed Latin square. |
| Not implementing `beforeunload` guard | Cleaner code, no "unsaved changes" dialog | One accidental refresh by a participant loses all their data; they won't redo the experiment. | Never — a web experiment MUST guard against accidental navigation. |
| CSS `opacity` for stimulus hiding (instead of removing from DOM) | Simpler animation code | Hidden elements remain in the accessibility tree; screen readers announce invisible stimuli; `opacity: 0` still occupies layout space and can affect sibling element positioning. | Only during development. Production experiment stimuli must use `visibility: hidden` + `aria-hidden="true"` or conditional rendering. |
| Storing all trial data in a single Convex document (array of trials) | Fewer documents, simpler queries | Convex documents have a 1MB size limit. 24 trials × ~500 bytes each = 12KB — fine. But if you add stimulus metadata (full SVG markup, allocation weights), a single document hits the limit. Also: concurrent updates to the same document risk OCC conflicts. | Acceptable if trials are small (<100 bytes each) and written sequentially. For this experiment with stimulus metadata, one document per trial is safer. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Convex + Next.js App Router | Using Convex client directly in React Server Components (RSC). Convex is a client-side library — mutations and queries don't work in RSC. | Wrap Convex usage in `'use client'` components. Use the Convex provider at the experiment layout level (not root layout, which would leak it to prototype routes). |
| Vercel + Convex environment | Hardcoding Convex URL in source code instead of using `NEXT_PUBLIC_CONVEX_URL`. Different branches need different Convex deployments (dev vs prod). | Set `NEXT_PUBLIC_CONVEX_URL` as a Vercel environment variable per-branch. Use Vercel's "Preview Deployments" feature to automatically deploy `ats-study` branch with its own env vars. |
| SVG rendering in React | Inlining SVG as JSX (React components) instead of raw SVG markup. React's reconciliation can re-render SVG mid-trial if parent state changes, causing visual flicker. | Render stimulus SVG as a static string (`dangerouslySetInnerHTML`) inside a `useMemo` with no dependencies (or only `datasetId` + `condition`). The SVG DOM should never re-render during a trial. |
| Zustand + Convex | Storing Convex query results in Zustand, creating a second source of truth. Zustand and Convex's reactive cache diverge, causing stale UI. | Zustand for local experiment state (current trial, condition, participant UUID); Convex for persistent data (trial records). Never store Convex query results in Zustand — use TanStack Query for caching if needed, but ideally read from Convex directly via hooks. |
| `next/font` + experiment page | Using `next/font` with Google Fonts — the font loader makes a request to Google's servers during page load. This leaks participant IP to Google and violates the anonymity requirement. | Use self-hosted fonts (the existing Geist font in the project is already self-hosted via `next/font/google` with `subsets` — verify it doesn't phone home). For monospace/stimulus fonts, use a local font file or `font-family: monospace`. |
| Vercel Serverless Functions + DuckDB WASM | Assuming `serverExternalPackages: ['duckdb']` prevents DuckDB from being included in the deployment. It prevents BUNDLING but Next.js's output file tracing still includes the DuckDB WASM file if `src/lib/db.ts` is imported anywhere. | Remove ALL imports of `@/lib/db` and `@/lib/queries/*` from the `ats-study` branch. Delete `src/lib/db.ts` on the branch if necessary. Use `outputFileTracingExcludes` in `next.config.ts` to explicitly exclude `node_modules/duckdb/**`. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Large SVG DOM for 24 stimuli pre-rendered on page | Initial page load >3 seconds; 24 × 200 DOM nodes = 4,800 SVG nodes in memory | Render only the CURRENT trial's stimulus. Dispose previous stimulus DOM on trial advance. Use `<g display="none">` for pre-warming if needed. | Breaks at ~15 trials with complex band allocation SVGs (>500 nodes each) |
| Convex query subscription for every trial renders | 24 concurrent subscriptions per participant; 100 participants = 2,400 active subscriptions on Convex backend | Use a SINGLE query that returns all trials for the participant, with incremental updates via a mutation that appends. Or use TanStack Query with `refetchInterval: false` (manual invalidation). | Breaks at ~50 concurrent participants with real-time subscriptions |
| `useEffect` with empty deps for stimulus render timing | Stimulus onset timestamp is captured in `useEffect`, but React 19's Strict Mode double-mounts effects in development, causing double onset captures | Use a ref flag (`const hasCaptured = useRef(false)`) to guard onset capture. Or use `useLayoutEffect` for synchronous capture before paint. | Breaks in React 19 Strict Mode (dev only — but pollutes dev data) |
| `sessionStorage.setItem` on every frame during trial | 60 writes/second to sessionStorage during a trial; synchronous I/O blocks the main thread | Write to sessionStorage only at trial BOUNDARIES (stimulus onset, response, trial advance). Use an in-memory buffer for frame-level data (if collecting mouse trajectory data, batch writes every 500ms). | Breaks at 60fps with large state objects (>10KB per write) |
| Convex mutation per individual questionnaire item | 12 NASA-RTLX items + 6 interpretability items = 18 mutations fired simultaneously; OCC conflicts if mutations touch the same document | Batch all questionnaire responses into a SINGLE mutation that writes one document with an array of responses. Convex mutations are atomic — batch writes that must be consistent. | Breaks when 18 concurrent mutations compete for the same participant document |
| Absolute-positioned stimulus overlay over full viewport | Stimulus renders at 1920×1080 on a 13" laptop with browser zoom ≠ 100%, clipping the edges | Use relative positioning within a container. Check `window.devicePixelRatio` and scale SVG `viewBox` accordingly. Test at 90%, 100%, 110%, 125% browser zoom. | Breaks at browser zoom ≠ 100% — stimulus elements are clipped or misaligned |

## Security & Ethics Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Collecting IP addresses via Convex or Vercel logs | Participant re-identification; ethics violation; GDPR breach if EU participants | Use separate Convex project with dashboard access restricted to PI. Disable Vercel access logging. Document in ethics application. |
| Using `NEXT_PUBLIC_` env vars for Convex deployment URL | Convex URL is exposed in client-side JavaScript bundle — expected and fine for Convex. But accidentally prefixing a secret (e.g., `CONVEX_DEPLOY_KEY`) with `NEXT_PUBLIC_` exposes it to the browser. | Audit all `NEXT_PUBLIC_*` env vars on the `ats-study` branch. Only the Convex URL should be public. Use `.env.local` (gitignored) for secrets. |
| No data retention policy | Data stored indefinitely; if a participant requests deletion years later, no process exists | Define data retention: "Data retained until thesis defense (December 2026), then anonymized dataset published; raw data deleted." Build a Convex scheduled job that flags data for deletion, with manual confirmation required. |
| Consent form not matching technical reality | Consent says "anonymous" but browser fingerprinting via CDN fonts, analytics scripts, or Vercel logs re-identifies participants | Audit the consent form against the technical architecture. If any re-identification vector exists, either eliminate it or update the consent form to "pseudonymous" and explain the limits. |
| No withdrawal mechanism | Participant completes study, regrets participation, but has no way to delete their data — they email the researcher who may not respond promptly | Include a "Withdraw My Data" link on the debriefing page. Implementation: enter participant UUID → Convex mutation deletes all associated documents → confirmation shown. Test this flow before recruiting. |
| Experiment URL shared publicly | Someone finds the URL and completes the study non-seriously (random clicking), producing junk data that can't be distinguished from genuine responses | Add a simple CAPTCHA or access code on the welcome screen. Not a full authentication system — just a shared passphrase that participants receive in their recruitment email. Track `access_code_used` as a metadata field. |
| Cross-site request forgery (CSRF) on Convex mutations | A malicious site could trigger Convex mutations on behalf of a participant who has the experiment open in another tab. Since Convex uses token-based auth (not cookies), this is mitigated but not impossible if the token leaks. | Convex's authentication model is token-based (the token is stored in `localStorage`, not cookies), which inherently prevents CSRF. Don't add cookie-based auth that would reintroduce the CSRF vector. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indicator during trials | Participant doesn't know how many trials remain; feels the experiment is endless; increases dropout rate | Show a progress bar: "Trial 8 of 24" with a visual bar. Update optimistically (don't wait for Convex confirmation). Include block transitions: "Block A complete — short break before Block B." |
| Full-screen lock-in without escape | Participant's browser is hijacked; they can't access other tabs without the experiment detecting it and flagging their data; feels coerced | Request fullscreen politely: "For best results, please stay on this tab." Detect tab switches and log them but don't punish the participant. Never use `document.exitFullscreen()` as a penalty. |
| Stimulus disappears before participant can respond | Auto-advancing trials with a short timeout (e.g., 3 seconds). Participants feel rushed; RT data is censored at 3 seconds (right-censored data requires special statistical handling). | Use a generous timeout (30 seconds for perception tasks). Log both RT and whether the trial timed out. Right-censored RT data is analyzable with survival analysis (Cox regression) — the thesis can handle it, but it's better to avoid it. |
| No practice feedback | Participant doesn't know if they're doing the task correctly; they develop incorrect response strategies that persist through all 24 trials | After each of the 2 practice trials, show feedback: "Correct! The peak was at January 15." or "The peak was at March 3 — you selected February 20. In the real trials, you won't see feedback." |
| Confidence scale is confusing | 1-5 Likert scale with unlabeled anchors: participant doesn't know if 1 or 5 means "very confident" | Use labeled radio buttons: "1 - Not at all confident", "2 - Slightly confident", "3 - Moderately confident", "4 - Very confident", "5 - Extremely confident". Include a brief description of what "confidence" means in this context. |
| Post-study debriefing is an afterthought | Participant finishes 24 trials, sees "Thank you!" and a close button. Doesn't learn the study's purpose, feels used as a data source. | Full debriefing screen explains: the two conditions (ATS vs Uniform), the research hypothesis, expected findings, and contact information. Include the "Withdraw My Data" option. This is both ethical and required by most ethics boards. |

## "Looks Done But Isn't" Checklist

- [ ] **Browser navigation guard:** `beforeunload` handler fires on refresh/close; `popstate` handler intercepts back button; visibility change pauses trial timer. Verified by manually pressing Back, Refresh, and switching tabs during a trial.
- [ ] **Convex schema supports partial trials:** `status` field with `started`/`responded`/`completed`/`abandoned`/`timeout` values. Optional response fields. Idempotent writes by trial UUID. Verified by killing the browser during a trial and checking Convex dashboard for partial records.
- [ ] **Cross-browser SVG consistency:** Stimulus screenshots in Chrome, Firefox, Safari are pixel-identical for the same stimulus at the same viewport size. Verified with Playwright screenshot comparison (pixel difference < 1%).
- [ ] **Vercel deployment is stripped:** `pnpm build` on `ats-study` branch produces <2 MB total bundle. No Three.js, MapLibre, or DuckDB in bundle analyzer output. Only `/experiment` page renders; all other routes return 404. Verified by deploying to Vercel preview and checking Network tab.
- [ ] **Counterbalancing verified:** Assignment matrix passes balance checks: exactly 12 Uniform + 12 ATS per participant; task types balanced across blocks; overall Uniform-first vs ATS-first count differs by ≤1. Verified by running validation function in CI.
- [ ] **No PII in Convex data:** Convex dashboard shows only `participantUUID`, trial data, and questionnaire responses. No IP addresses, user agents, or screen dimensions in any table. Verified by auditing Convex schema and functions.
- [ ] **Timing uses `performance.now()`:** All RT calculations use `performance.now()` with visibility-gated pause accumulator. Wall-clock `Date.now()` is stored for debugging only, not primary analysis. Verified by code audit: grep for `Date.now()` in experiment code — should appear only in debug fields.
- [ ] **State machine has transition guards:** Invalid state transitions throw errors (not silently corrupt state). State machine is serialized to `sessionStorage`. Verified by attempting to call `transition('BLOCK_COMPLETE')` twice — second call should be a no-op.
- [ ] **Import guard in place:** ESLint rule blocks imports from `@/lib/db`, `@/lib/study/storage`, `@/lib/queries` in experiment code. Build fails if violated. Verified by adding a violating import and running `pnpm lint`.
- [ ] **Consent flow works end-to-end:** Participant sees consent form → clicks "I Consent" → consent record written to Convex → participant UUID generated → experiment begins. Participant who doesn't consent sees "Thank you for your interest" and no data is sent. Verified by testing both paths.
- [ ] **Withdrawal mechanism works:** "Withdraw My Data" on debriefing page accepts participant UUID → Convex mutation deletes all associated documents → confirmation shown. Verified by completing a test session, withdrawing data, and confirming Convex dashboard shows 0 records for that UUID.
- [ ] **Convex write-ahead log (WAL) in sessionStorage:** Every trial write is first saved to `sessionStorage` WAL. If page crashes, recovery replays WAL entries. Verified by killing the browser process mid-experiment and reloading — data from completed trials should be present.
- [ ] **Stimulus container works at all browser zoom levels:** Tested at 90%, 100%, 110%, 125% browser zoom. No clipping, no misalignment, no text overflow. Verified with Playwright at multiple viewport sizes.
- [ ] **No external CDN requests on experiment page:** Network tab shows requests only to self (Next.js) and Convex backend. No Google Fonts, no analytics, no CDN libraries. Verified by loading experiment page with Network tab open and filtering by third-party requests.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Counterbalancing bug discovered after N participants | HIGH — N participants' data may need exclusion from primary analysis | 1. Run balance check on collected data. 2. If imbalance is severe (>60/40 split), exclude data from participants after the imbalance was detected. 3. Fix the assignment logic. 4. Recruit N replacement participants. 5. Run sensitivity analysis: "Results are robust to excluding the first N participants where counterbalancing was imperfect." |
| Convex schema missing `status` field after 20 participants tested | MEDIUM — data is still usable but partial trials are lost | 1. Add `status` field with default `'completed'` for existing rows (they were all completed). 2. New participants get full status tracking. 3. Note in thesis: "Partial trial tracking was implemented after participant 20." |
| DuckDB WASM found in Vercel deployment after first participant | LOW — fix is quick, but first participant's experience was degraded | 1. Remove DuckDB import from branch. 2. Redeploy. 3. Note the cold-start time for participant 1 may be an outlier — exclude their RT data from analysis if cold start affected trial timing. |
| Browser back button not guarded; 3 participants lost data | MEDIUM — data is lost, participants must be re-recruited | 1. Implement `beforeunload` + `popstate` guards. 2. Contact affected participants (if possible) to redo the study. 3. Report dropout rate in thesis: "3 participants were excluded due to technical issues with browser navigation." |
| `Date.now()` used instead of `performance.now()` in production | HIGH — ALL RT data is degraded | 1. Fix the code. 2. If the study is ongoing, restart data collection. 3. If all data is collected, analyze RT data with a note: "RT measurements have ±5ms precision due to Date.now() usage. Effect sizes >10ms are still detectable." 4. This is nearly a showstopper — prevention is critical. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 — Browser Navigation Corrupts State | Phase 1 (Experiment Shell & Participant Flow) | `beforeunload` dialog fires; `visibilitychange` pauses timer; `popstate` shows confirmation; sessionStorage checkpoint survives refresh |
| 2 — Convex Schema Doesn't Support Partial Trials | Phase 2 (Convex Schema & Data Pipeline) | Convex functions accept optional fields; `status` enum present; idempotent writes by trial UUID; partial trial visible in dashboard after browser kill |
| 3 — SVG Rendering Differs Across Browsers | Phase 3 (Stimulus Rendering Engine) | Playwright screenshots across Chrome/Firefox/Safari show <1% pixel difference; explicit `shape-rendering`/`vector-effect` set on all SVG elements |
| 4 — Vercel Build Includes Prototype Routes | Phase 4 (Deployment & Route Stripping) | Bundle analyzer shows no Three.js/MapLibre/DuckDB; total JS <500KB gzipped; all non-experiment routes return 404 |
| 5 — Counterbalancing Produces Uneven Distribution | Phase 2 (Convex Schema & Data Pipeline) | Balance check function passes in CI; assignment matrix committed to repo; after 10 participants, condition-first split is 5/5 or 6/4 |
| 6 — Anonymous Data Stored With Identifiable Metadata | Phase 1 (Experiment Shell & Participant Flow) | Convex dashboard shows no IP/user agent fields; no third-party CDN requests on experiment page; consent flow verified end-to-end |
| 7 — RT Measurement Uses Inaccurate Clock Source | Phase 3 (Stimulus Rendering Engine) | Code audit: zero `Date.now()` in RT calculation; `performance.now()` with visibility-gated accumulator; calibration test confirms sub-ms precision |
| 8 — State Machine Allows Invalid Transitions | Phase 1 (Experiment Shell & Participant Flow) | FSM transition table enforced; invalid transition throws; state log in Convex shows valid sequence for all participants |
| 9 — Brownfield Imports Leak Into Experiment Bundle | Phase 4 (Deployment & Route Stripping) | ESLint import guard passes; bundle analyzer shows zero prototype imports; `outputFileTracingExcludes` verified |
| 10 — Convex Real-Time Sync Overwrites Responses | Phase 2 (Convex Schema & Data Pipeline) | Optimistic UI updates without Convex query dependency; idempotent writes prevent duplicates; WAL in sessionStorage survives crash |

---

## Sources

- **MDN Page Visibility API** (HIGH): `document.visibilityState`, `visibilitychange` event, background tab throttling of `requestAnimationFrame` and timers — [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- **MDN History API** (HIGH): `pushState`/`replaceState` for SPA history management, `popstate` event for back/forward detection — [MDN History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API)
- **W3C High Resolution Time** (HIGH): `performance.now()` specification — sub-millisecond precision, monotonically increasing, not subject to system clock skew. [MDN Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- **Convex Documentation** (HIGH — Context7 verified): Schema definition with `defineTable`, `v.union`, `v.optional`, `v.literal`; idempotent writes via `ctx.db.replace`; mutation retry semantics; partial rollback pattern with `ctx.runMutation` — [Convex Docs](https://docs.convex.dev/llms-full.txt)
- **Next.js 16 Documentation** (HIGH — Context7 verified): `outputFileTracingExcludes`, `output: 'standalone'`, middleware `matcher` configuration, `serverExternalPackages`, proxy/middleware conditional routing — [Next.js Docs](https://nextjs.org/docs)
- **Existing Codebase Analysis** (HIGH): Phase 80 study protocol (`src/lib/study/protocol.ts`), condition order (`src/lib/study/condition-order.ts`), DuckDB-backed storage (`src/lib/study/storage.ts`), root layout (`src/app/layout.tsx`), next.config.ts — all reviewed for v4.0 relevance
- **Project Context** (HIGH): PROJECT.md defines v4.0 ATS Perception Study milestone with 8 experiment requirements (EXP-01 through EXP-08), dedicated `ats-study` branch decision, Convex-only backend constraint
- **Existing Research** (HIGH): The v3.x pitfalls research (`PITFALLS.md`) documents 12 visualization pitfalls including GPU memory, shader compilation, and cross-store sync — these are the prototype's existing issues that the experiment must avoid inheriting
- **Web Experiment Methodology** (MEDIUM — unverified community practice): Patterns for beforeunload guards, visibility-gated timing, Latin square counterbalancing, sessionStorage checkpointing, WAL patterns for unreliable networks — synthesized from common practice in jsPsych, PsychoJS, and lab.js frameworks
- **GDPR & Research Ethics** (MEDIUM): Data minimization principle (Art. 5(1)(c) GDPR), right to erasure (Art. 17 GDPR), informed consent requirements for anonymous data collection. University ethics committee requirements vary — verify with your institution's specific guidelines.

---

*Pitfalls research for: ATS Perception Study (v4.0) — Web-based within-subjects perception experiment on brownfield Next.js 16 application*
*Researched: 2026-06-30*
*Sources: MDN (HIGH), Convex (HIGH), Next.js (HIGH), Codebase Analysis (HIGH), Web Experiment Community Practice (MEDIUM)*
*Ready for: Phase 1 (Experiment Shell & Participant Flow) planning*
