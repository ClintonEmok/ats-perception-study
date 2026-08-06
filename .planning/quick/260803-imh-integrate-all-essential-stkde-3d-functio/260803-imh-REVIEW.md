---
phase: 260803-imh-integrate-all-essential-stkde-3d-functio
reviewed: 2026-08-03T13:39:24Z
depth: deep
files_reviewed: 21
files_reviewed_list:
  - src/app/dashboard-demo/page.shell.test.tsx
  - src/components/dashboard-demo/ComparisonKdeHeatmap.tsx
  - src/components/dashboard-demo/DashboardDemo3dProvider.tsx
  - src/components/dashboard-demo/DashboardDemoRailTabs.tsx
  - src/components/dashboard-demo/Demo3dSpatialView.events.test.ts
  - src/components/dashboard-demo/Demo3dSpatialView.tsx
  - src/components/dashboard-demo/DemoComparePanel.tsx
  - src/components/dashboard-demo/DemoCompareStage.tsx
  - src/components/dashboard-demo/DemoInspectPanel.tsx
  - src/components/dashboard-demo/DemoMapVisualization.tsx
  - src/components/dashboard-demo/StkdeAnalysisPanel.tsx
  - src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.test.ts
  - src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.ts
  - src/components/dashboard-demo/lib/useDemoCompareData.test.ts
  - src/components/dashboard-demo/lib/useDemoCompareData.ts
  - src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts
  - src/components/dashboard-demo/lib/useDemoStkde.ts
  - src/lib/hotspot-evolution.test.ts
  - src/lib/hotspot-evolution.ts
  - src/store/useDashboardDemoCoordinationStore.test.ts
  - src/store/useDashboardDemoCoordinationStore.ts
findings:
  critical: 6
  warning: 3
  info: 0
  total: 9
status: issues_found
---

# Phase 260803-imh: Code Review Report

**Reviewed:** 2026-08-03T13:39:24Z  
**Depth:** deep  
**Files Reviewed:** 21  
**Status:** issues_found

## Summary

The focused tests and TypeScript check pass, but the integration still has correctness gaps at the shared-state boundaries. Full-viewport STKDE responses do not contain per-slice surfaces while Compare and Inspect continue to treat them as available, comparison selections can render stale out-of-scope surfaces, and the inspector uses a different slice ordering contract than the provider and cube. There are also provenance, evaluation-lock, lifecycle, accessibility, and coverage gaps.

## Critical Issues

### CR-01: Full-viewport responses leave slice UI enabled with empty or fabricated values

**Severity:** BLOCKER

**File:** `src/components/dashboard-demo/lib/useDemoStkde.ts:218-222`; `src/components/dashboard-demo/Demo3dSpatialView.tsx:409-412,667-672`; `src/components/dashboard-demo/lib/useDemoCompareData.ts:83-99`

**Issue:** Selecting `full-viewport` deliberately omits `filters.slices`, so the API response has a valid top-level surface but an empty `sliceResults` map. The 3D projection therefore produces an empty surface for every slice and reports “No STKDE cells,” while the Compare model still lists every visible slice and converts missing server event counts to `0`. Users can select and compare slices that were not returned, seeing zero-event/no-data surfaces instead of an explicit unavailable state.

**Fix:** Define the scope contract explicitly: either keep per-slice descriptors/results when Inspect/Compare must remain usable, or disable/gate slice-dependent Inspect and Compare controls in full-viewport mode. Never add a missing result to `comparableSlices` with a zero count; expose an unavailable result state and test the full-viewport transition.

### CR-02: Brushing can render stale comparison surfaces outside the current scope

**Severity:** BLOCKER

**File:** `src/components/dashboard-demo/lib/useDemoCompareData.ts:114-131`; `src/components/dashboard-demo/DemoCompareStage.tsx:29-45`

**Issue:** When a brush removes a selected slice, `leftSlice`/`rightSlice` become `null` because the IDs are no longer in `comparableSlices`, but `leftKde`/`rightKde` still resolve the old IDs directly from the response. The stage renders those cells anyway, with a generic “Left KDE”/“Right KDE” label, so the viewport can display an A/B surface that the current picker and scope no longer select.

**Fix:** Reconcile comparison IDs when scope or response eligibility changes, or at minimum derive each cell list only when its corresponding `leftSlice`/`rightSlice` is valid. Add a regression test that selects two slices, brushes one out, and asserts that its surface disappears and its slot is cleared/unavailable.

### CR-03: Inspect, provider, and cube use different tie-breaking for slice order

**Severity:** BLOCKER

**File:** `src/components/dashboard-demo/DemoInspectPanel.tsx:499-517`; canonical order in `src/components/dashboard-demo/DashboardDemo3dProvider.tsx:26-43` and `src/components/dashboard-demo/Demo3dSpatialView.tsx:227-239`

**Issue:** The provider and 3D scene order slices by `start`, then `end`, then source ID. The Inspect panel sorts only by `start`. Two visible ranges with the same start and different end times (or IDs) can therefore have different indexes. Since playback and the scrubber share `activeSliceIndex`, the panel can display slice A while the cube and active source ID point to slice B.

**Fix:** Centralize one canonical source-slice ordering helper and use it for the provider, scene, inspector, and comparison model (`startEpoch`, `endEpoch`, `sourceSliceId`). Add a duplicate-start/different-end test covering playback and scrub selection.

### CR-04: Adaptive hotspot matching uses requested, not effective, server cell width

**Severity:** BLOCKER

**File:** `src/components/dashboard-demo/Demo3dSpatialView.tsx:635-641`; `src/lib/hotspot-evolution.ts:102-111`

**Issue:** The new physical-width option is populated with `stkdeParams.gridCellMeters`, which is only the requested width. The STKDE grid can be coarsened when the grid exceeds the server cell limit, making the actual cell width `requestedWidth * coarsenFactor`. Adaptive matching then uses a tolerance that is too small and can incorrectly break trajectories for precisely the sparse/coarsened responses this path is meant to support.

**Fix:** Return effective grid width/coarsening metadata in the server response and pass that value to `cellWidthMeters`; otherwise keep adaptive matching disabled/fixed whenever the response was coarsened. Test a coarsened response and verify the tolerance uses the effective physical width.

### CR-05: Configured mock data can be presented as live analysis

**Severity:** BLOCKER

**File:** `src/components/dashboard-demo/lib/useDemoStkde.ts:108-112`; consumed by `src/components/dashboard-demo/StkdeAnalysisPanel.tsx:115-117`

**Issue:** `useDemoStkde` is a client module, but it infers the source from `process.env.USE_MOCK_DATA`. The server-side data layer reads that non-public variable, while `next.config.ts` does not expose it to the browser. If the server is configured with `USE_MOCK_DATA=true` without also setting the public mirror, `resolveSourceLabel` returns `live`; the mock query path does not necessarily set `fallbackApplied`, so the panel has no other signal and can label mock surfaces as live.

**Fix:** Have the server include an explicit source label/metadata field in the STKDE response (derived from the same server-side configuration), or use a deliberately synchronized public flag with the same accepted values. Do not infer analytical provenance from a private environment variable in a client bundle.

### CR-06: STKDE setup controls bypass the evaluation lock

**Severity:** BLOCKER

**File:** `src/components/dashboard-demo/StkdeAnalysisPanel.tsx:24-35,49-90`; lock presentation in `src/components/dashboard-demo/DashboardDemoRailTabs.tsx:141-149`

**Issue:** The rail detects `/evaluation` and displays “Setup locked during evaluation,” but `StkdeAnalysisPanel` does not read `useIsEvaluationLocked`. Its Retry button, scope buttons, and all six server-tuning sliders remain interactive, allowing participants to change the analysis request and visualization during a locked evaluation.

**Fix:** Consume `useIsEvaluationLocked` in the panel and disable every setup mutation while locked, including retry and scope/tuning controls. Add `aria-disabled`/tab handling consistently with Detect and Slices, and test the locked route behavior.

## Warnings

### WR-01: Active-events status remains stuck after the 3D owner unmounts

**Severity:** WARNING

**File:** `src/components/dashboard-demo/Demo3dSpatialView.tsx:252-296`; displayed by `src/components/dashboard-demo/DemoInspectPanel.tsx:688-697`

**Issue:** The active-events effect aborts its request on cleanup but never resets the shared `crimeFetchStatus`. Switching from 3D to Map/Compare while the request is pending can leave the always-mounted Inspect panel showing “events loading” even though its request owner no longer exists.

**Fix:** Reset the active-events status/error in the cleanup path only when the cleanup still owns the active request, or move the opt-in event lifecycle into the always-mounted provider and expose its status alongside the request owner.

### WR-02: Compare slot selects have no programmatic labels

**Severity:** WARNING

**File:** `src/components/dashboard-demo/DemoComparePanel.tsx:183-198`

**Issue:** “Left slot” and “Right slot” are plain `<span>` elements preceding unlabeled `<select>` controls. Visual proximity does not provide an accessible name to screen readers, so keyboard and assistive-technology users cannot reliably identify which slot they are changing.

**Fix:** Use `<label htmlFor="...">` with unique IDs or add equivalent `aria-label`/`aria-labelledby` attributes to both selects.

### WR-03: Critical cross-view behavior is covered only by source-string/pure tests

**Severity:** WARNING

**File:** `src/components/dashboard-demo/Demo3dSpatialView.events.test.ts:6-18`; `src/components/dashboard-demo/lib/useDemoCompareData.test.ts:38-57`; `src/components/dashboard-demo/lib/useDemoStkde.phase2.test.ts:191-248`

**Issue:** The new tests verify adapter/model values and regexes over source text, but do not mount the provider or stage. There is no behavioral coverage for provider-owned playback and tie ordering, full-viewport missing slice results, stale comparison IDs after brushing, active-event cleanup on viewport unmount, source-label provenance, evaluation-lock disabling, or accessible slot names. These are the exact cross-module regressions the implementation changes introduce.

**Fix:** Add focused React/store integration tests with fake timers and mocked responses for those transitions, plus an accessibility assertion for the two slot controls. Retain source-contract tests as supplementary checks rather than the only coverage for rendered behavior.

---

_Reviewed: 2026-08-03T13:39:24Z_  
_Reviewer: the agent (gsd-code-reviewer)  
_Depth: deep_
