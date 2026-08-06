# Implemented Baseline

**Captured:** 2026-08-01
**Purpose:** Establish the intended implementation baseline for future planning.

This file records what is already implemented and verified. Future phases must extend this baseline rather than treating the current repository as an empty prototype or removing completed intended work.

## Current Product Surface

### Standalone STKDE-3D

`/stkde-3d` currently provides:

- Real crime-data loading through `/api/crimes/range` with mock fallback.
- Full-range sampled overview plus Fourth of July, Spring Break, and New Year's case-study presets.
- Cursor pagination for case-study windows so records beyond the first 5,000-row page are loaded.
- Ten rendered temporal surfaces derived from the current dataset.
- Adaptive temporal placement driven by event timestamps, centered smoothing, normalized density, and the configured allocation multiplier.
- Stack view and focused single-slice view.
- Active-event rendering with timestamp-preserving adaptive Y placement.
- Toggleable hotspot trajectories with adaptive and fixed matching modes.
- Burst-volume rendering and slice inspection support.
- Active and non-active slice opacity controls.
- KDE tuning and grid-field/legacy heatmap renderer controls.
- A map texture beneath the 3D scene, adaptive warp axis, slab thickness, and temporal surface styling.

### Dashboard Demo

`/dashboard-demo` currently provides:

- Shared map, timeline, and 3D coordination state.
- Demo preset application across filter range, brush range, normalized time range, current time, scale mode, and warp factor.
- Adaptive, density, and contextual signal-source selection with baseline loading and fallback behavior.
- Burst-volume derivation from dashboard selection and STKDE results.
- Hotspot evolution, trajectory matching, active-event overlays, map POIs, and demo controls.
- Existing 2D comparison-stage infrastructure. This is distinct from the new `/stkde-3d` A/B comparison contract in Phase 5.

## Verified Analytical Foundations

- `src/lib/stkde/burst-volume.ts` defines the burst-volume model and deterministic builder.
- `src/hooks/useBurstVolumeModel.ts` derives the model from dashboard state.
- `src/app/stkde-3d/components/BurstVolumeRenderer.tsx` renders burst samples, boundaries, and centroid evolution cues.
- `src/lib/signal-sources/` contains burstiness, density, contextual, baseline loading, and winsorization contracts.
- `src/lib/hotspot-evolution.ts` and the related STKDE helpers provide hotspot correspondence and behavior data.
- `src/lib/adaptive-warp-utils.ts` and the standalone adaptive-time helper provide shared temporal placement behavior.

## Verification Snapshot

### Passing targeted checks

- Burst-volume model and hook tests: 5/5.
- STKDE-3D page and event-data tests: 5/5.
- Signal-source and store suites: 103/103.
- Dashboard preset helper tests: 12/12.
- Hotspot, KDE-hotspot, and burst-evolution tests: 16/16.
- Evolution-flow utility tests: 2/2.
- TypeScript typecheck: passed.
- ESLint: 0 errors, 97 existing warnings.
- Production build: passed; `/stkde-3d`, `/dashboard-demo`, APIs, and static routes compiled successfully.

### Full-suite baseline

The full suite currently reports 637/641 passing with four failures in stale source-contract assertions:

- `src/components/viz/CubeVisualization.stkde.test.ts`
- `src/components/viz/cube-store-overrides.phase1.test.ts`
- `src/components/viz/evolution-flow.phase4.test.tsx`
- `src/app/demo/non-uniform-time-slicing/showcase.test.tsx`

These failures assert older source strings or removed component contracts. They are not failures in the verified STKDE-3D, burst-volume, signal-source, store, preset, or hotspot behavior. They should be handled as a separate test-maintenance task, not used as a reason to roll back the intended implementation baseline.

## Planning Reconciliation

- Historical implementation phases 79-87 are preserved under `.planning/archive/legacy-phases/`.
- The prior visual assessment is preserved under `.planning/archive/reviews/`.
- Completed v3.1 and v3.2 planning artifacts remain under `.planning/milestones/`.
- The active roadmap now contains Phase 4: STKDE-3D A/B Comparison.
- Phase 4's specification is `.planning/phases/04-stkde-3d-a-b-comparison-mode/04-SPEC.md`.
- Direct comparison is no longer listed as deferred in `REQUIREMENTS.md` or `STATE.md`.

### Planning health

- `gsd-health --repair` found no errors and added the missing `workflow.ai_integration_phase` config key.
- Historical 79-87 phase artifacts, the visual assessment, legacy root planning files, and the new spec were moved into canonical archive/phase locations without deleting their contents.
- The remaining degraded-health warnings are historical Phase 76-78 directories inside the completed v3.2 archive and four stale external Codex worktrees. The missing-path worktree metadata was pruned; the existing external worktrees were not force-removed.

## New Planning Base

Future work should assume the following are intentional and available:

1. The standalone STKDE-3D route is the current analytical surface for 2.5D cube work.
2. Adaptive temporal placement, volume encoding, event timestamps, trajectories, burst volumes, and signal-source choices are existing foundations.
3. The next net-new capability is the Phase 4 A/B comparison contract, not another foundational rewrite.
4. Any visual or architectural gap should be recorded as a targeted follow-up against this baseline.
