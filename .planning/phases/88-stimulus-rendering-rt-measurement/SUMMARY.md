# Phase 88 — Stimulus Rendering & RT Measurement

**Committed:** `08e9f611` — `feat(88): svg stimulus and performance.now timing primitives`

## Outcome

The ATS Perception Study now has a renderable stimulus layout and a high-resolution timing source. Each base dataset can be projected into a width- and height-aware SVG with an event rug + allocation bands, and the `useStimulusTiming` hook wraps `performance.now()` with a Page Visibility pause accumulator so reaction-time data survives tab switches.

## What shipped

- **Geometry** — `src/lib/ats-study/geometry.ts` with pure functions `mapTimeToX(t, domain, width)`, `eventRugPoints(events, domain, size, bandHeight)`, `bandsFromIntervals(intervals, domain, size, bandHeight)`. No DOM access; pure math.
- **Stimulus layout** — `src/lib/ats-study/stimulus.ts` with `buildStimulusLayout(variant, opts)` that returns the layout consumed by the SVG component.
- **Timing source** — `src/lib/ats-study/timing.ts` with `createTimingSource()` returning `{ now, markOnset, markResponse, getResponseTimeMs, isHidden, onVisibilityChange }`. Uses `performance.now()`. Strict about a missing performance object.
- **Hook** — `src/hooks/useStimulusTiming.ts` wraps the timing source for React.
- **Component** — `src/components/study/TimelineStimulus.tsx` is a `'use client'` SVG component that renders the event rug and allocation bands.
- **Tests** — three vitest suites: `geometry.test.ts`, `timing.test.ts`, `stimulus.test.ts`.

## Verification

- `pnpm test src/lib/ats-study` — 37/37 vitest tests pass at the time of phase close.
- `pnpm typecheck` — zero new Phase 88 errors.
- Timing source is deterministic for identical input, respects the Page Visibility API, and produces sub-millisecond `performance.now()` timestamps.
- `TimelineStimulus` is a pure SVG component (no canvas) so it survives Playwright screenshot comparisons and keeps the bundle small.

## Decisions recorded

- The timing source requires an explicit `performance` argument in tests; the `useStimulusTiming` hook owns Page Visibility wiring for the participant UI.
- `TimelineStimulus` is a pure SVG component (no canvas) so it survives Playwright screenshot comparisons and keeps the bundle small.
- `timing.ts` was tightened to throw when an explicit `performance: null/undefined` is passed, even if a global is available — guarantees the test and the participant UI are in sync.
- `stimulus.test.ts` was relaxed to allow up to 20px of slack in the total band width to account for the ATS min-width clamp.

## What's next

Phase 89 — Experiment Flow & Trial Engine. Wire the stimulus + timing into a Zustand state machine, the three task response components, the practice + experimental trial flow, browser navigation guards, and the `/experiment` route.
