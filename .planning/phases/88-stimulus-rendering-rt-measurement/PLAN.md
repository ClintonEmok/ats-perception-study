---
phase: 88
plan: 1
wave: 1
files_modified:
  - src/lib/ats-study/geometry.ts
  - src/lib/ats-study/stimulus.ts
  - src/components/study/TimelineStimulus.tsx
  - src/lib/ats-study/timing.ts
  - src/hooks/useStimulusTiming.ts
  - src/lib/ats-study/geometry.test.ts
  - src/lib/ats-study/timing.test.ts
  - src/lib/ats-study/stimulus.test.ts
must_haves:
  truths:
    - SVG stimulus renders event rug marks over allocation bands for any dataset.
    - Same dataset renders correctly in both Uniform and ATS variants from Phase 87 data.
    - Trial onset is captured with performance.now() and response timing is monotonic.
    - Stimulus onset and response are emitted as separate events.
    - Geometry helpers are unit-testable and produce stable coordinates.
  artifacts:
    - src/components/study/TimelineStimulus.tsx
    - src/lib/ats-study/geometry.ts
    - src/lib/ats-study/stimulus.ts
    - src/lib/ats-study/timing.ts
    - src/hooks/useStimulusTiming.ts
  key_links:
    - TimelineStimulus.tsx -> src/lib/ats-study/geometry.ts (event rug + bands)
    - TimelineStimulus.tsx -> src/lib/ats-study/atsMapping.ts (interval widths)
    - timing.ts -> performance.now() (RT source)
---

<objective>
Render the ATS Perception Study stimulus as a pure-SVG component and capture per-trial timing with `performance.now()` so each trial produces separate onset and response events.

Locked decisions from Phase 87 / research:
- Stimulus = event rug (mark per event) + allocation bands (rectangles for the current condition).
- Geometry helpers live in `src/lib/ats-study/geometry.ts` so they can be unit-tested without React.
- `useStimulusTiming` returns monotonic timestamps, suppresses writes when the tab is hidden, and exposes `markOnset()` / `markResponse()`.
- Use Visx scales (`@visx/scale`) where helpful; otherwise raw SVG to keep bundle small.
</objective>

<execution_context>
- React 19 + Next.js 16 client component for `TimelineStimulus`.
- `performance.now()` is the only RT source; `Date.now()` is forbidden in the timing helpers.
- Page Visibility API gates the timing accumulator so backgrounded tabs do not inflate RT.
- Pure-function geometry tests in vitest (no jsdom) keep them fast.
</execution_context>

<context>
Phase 88 — Stimulus Rendering & RT Measurement.
Maps to requirements: DATA-02, EXPMT-01, EXPMT-05.
Builds on Phase 87 (datasets, ATS mapping).
</context>

<tasks>
1. `src/lib/ats-study/geometry.ts` — pure functions `mapTimeToX(t, domain, width)`, `eventRugPoints(events, domain, width, height)`, `bandsFromIntervals(intervals, height)`.
2. `src/lib/ats-study/stimulus.ts` — `buildStimulusLayout(variant, opts)` returning the layout consumed by the component.
3. `src/lib/ats-study/timing.ts` — `createTimingSource()` returning `{ now, markOnset, markResponse, getResponseTimeMs, isHidden, onVisibilityChange }`.
4. `src/hooks/useStimulusTiming.ts` — React hook wrapping the timing source.
5. `src/components/study/TimelineStimulus.tsx` — 'use client' SVG component rendering event rug + allocation bands.
6. Three vitest suites: `geometry.test.ts`, `timing.test.ts`, `stimulus.test.ts`.
7. Run `pnpm test src/lib/ats-study src/components/study` and fix any breakage.
</tasks>

<verification>
- All Phase 88 tests pass.
- `buildStimulusLayout` produces identical coordinates for identical inputs.
- Timing source uses `performance.now()`, pauses while hidden, and emits both onset and response.
- TimelineStimulus renders rug + bands with no console warnings.
</verification>

<success_criteria>
- Phase 88 roadmap success criteria satisfied:
  - Event rug + allocation bands renderable as SVG.
  - Same dataset renders in both Uniform and ATS forms.
  - Trial onset uses `performance.now()`.
  - Onset/response are emitted as separate events.
  - Stimulus layout is deterministic and unit-tested.
</success_criteria>

<output>
- Updated `.planning/STATE.md` and `.planning/ROADMAP.md`.
- One atomic commit covering Phase 88.
</output>
