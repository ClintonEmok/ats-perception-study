---
phase: quick
plan: 260803-imh
subsystem: dashboard-demo
tags: [stkde, three, dashboard, sparse-surfaces, source-ids, comparison]
requires: [dashboard-demo-provider, canonical-slice-domain, api-stkde-hotspots]
provides: [server-authoritative-dashboard-3d, stkde-first-rail, sparse-server-comparison]
affects: [dashboard-demo, future-dense-comparison-contract]
tech-stack:
  added: []
  patterns: [source-id-projection, provider-owned-lifecycle, opt-in-active-events, sparse-comparison-gate]
key-files:
  created:
    - src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.ts
    - src/components/dashboard-demo/lib/adaptStkdeSurfaceToKdeCells.test.ts
    - src/components/dashboard-demo/StkdeAnalysisPanel.tsx
    - src/components/dashboard-demo/lib/useDemoCompareData.test.ts
  modified:
    - src/components/dashboard-demo/Demo3dSpatialView.tsx
    - src/components/dashboard-demo/DashboardDemo3dProvider.tsx
    - src/components/dashboard-demo/lib/useDemoStkde.ts
    - src/store/useDashboardDemoCoordinationStore.ts
    - src/components/dashboard-demo/DashboardDemoRailTabs.tsx
    - src/components/dashboard-demo/DemoInspectPanel.tsx
    - src/lib/hotspot-evolution.ts
    - src/components/dashboard-demo/lib/useDemoCompareData.ts
    - src/components/dashboard-demo/DemoComparePanel.tsx
    - src/components/dashboard-demo/DemoCompareStage.tsx
    - src/components/dashboard-demo/ComparisonKdeHeatmap.tsx
    - src/components/dashboard-demo/DemoMapVisualization.tsx
    - src/app/dashboard-demo/page.shell.test.tsx
duration: 53m
completed: 2026-08-03
---

# Quick Task 260803-imh: Essential STKDE-3D dashboard integration summary

Integrated `/stkde-3d`'s essential interaction model into `/dashboard-demo` without adding a second KDE or request pipeline. Dashboard 3D surfaces, trajectories, burst-volume inputs, and comparison maps now consume the debounced server STKDE response through stable canonical slice IDs.

## Implementation decisions

- Added a pure sparse-cell adapter using `lonLatToNormalized`, with finite-value validation, strict scene-domain rejection, bounded intensity, and non-negative support preservation.
- Added source-ID projection for both `sliceKdes` and the trajectory/burst result map. Missing results receive empty render data and cannot shift neighboring slice surfaces; `sourceSliceIndex` remains separate from brushed render `index`.
- Kept the provider as the only STKDE request owner. It exposes loading, updating/stale, error, retry, last-valid-response, metadata, and configured-mock/fallback labels while retaining the 150 ms debounce and request guards.
- Removed ordinary dashboard 3D crime-range/KDE-worker work. `/api/crimes/range` remains only for the opt-in active-events overlay for the current source slice, with timestamped events passed through `selectedSourceEvents`.
- Moved playback advancement into the always-mounted 3D provider. Inspect controls are shared Zustand state; sparse server surfaces hard-disable runtime interpolation even when the preserved standalone setting is enabled.
- Added server-aware adaptive hotspot matching with explicit physical `cellWidthMeters`; standalone matching behavior remains unchanged when the option is absent.
- Reordered the rail to STKDE, Inspect 3D, Detect, Slices, Compare. Server tuning/status lives in `StkdeAnalysisPanel`; global adaptive controls are mounted only inside Inspect 3D while timeline activation remains always mounted.
- Replaced comparison-local crime/KDE requests with selected server slice results. Absolute A/B views rasterize adapted sparse cells for display only and always show `Signed difference unavailable for sparse server surfaces; no sparse subtraction is performed.`
- Map active-slice resolution prefers canonical `activeSliceId` and only falls back to the index when no ID exists.

## Task commits

1. `562c16e` — `feat(260803-imh): make dashboard 3D surfaces server-authoritative`
2. `646467b` — `feat(260803-imh): add shared STKDE controls and inspect rail`
3. `c7510e5` — `feat(260803-imh): gate sparse dashboard comparisons by source ID`

## Verification

- Focused Vitest: **PASS** — 36 tests across adapter, STKDE lifecycle, comparison model, active-event contracts, coordination store, hotspot matching, and dashboard shell contracts.
- Targeted ESLint across every manifest file: **PASS** — no issues.
- `pnpm typecheck`: **PASS**.
- `pnpm build`: **PASS** — Next production build completed successfully.
- Full Vitest: **703 passed, 4 failed**. The four failures are the known unrelated stale visualization/showcase source-contract failures documented in `STATE.md` (`CubeVisualization.stkde`, cube store overrides, evolution flow, and non-uniform-time showcase); no new dashboard failures were introduced.

## Browser/manual smoke checklist

Command attempted: `USE_MOCK_DATA=true NEXT_PUBLIC_USE_MOCK_DATA=true pnpm dev --hostname 127.0.0.1`, then `/dashboard-demo` at 1920×1080 using `agent-browser`. Port 3000 was already occupied by an existing Next process, so the attempted process selected 3001 and exited; the already-running project server on 3000 served the browser smoke session.

1. **No applied slices:** verified the STKDE-first rail and full-viewport server status. The 3D shell now displays `Apply range slices to inspect STKDE evolution`; the STKDE panel showed ready status, event/cell/hotspot counts, compute mode, and intensity legend.
2. **Rail/control discovery:** verified accessible STKDE, Inspect 3D, Detect, Slices, and Compare tabs; Inspect exposed temporal resolution, adaptive/linear controls, and the sparse-surface empty state.
3. **Compare unavailable state:** verified the Compare panel showed server status and the always-visible signed-difference limitation copy before slots were selected.
4. **Server lifecycle/tuning:** full-viewport mock response reached ready state with visible counts and server tuning controls. Loading/updating/error transitions are covered by hook tests; interactive browser replay was limited by the existing server/process collision and no applied slice fixture.
5. **Generate/apply and 3D controls:** not fully exercised because the existing browser session had no active brushed range and the timeline/canvas controls were covered by the rendered map/scene hit-testing layer. The Slices/Detect controls remained visible and keyboard focus navigation worked.
6. **Active events:** not toggled because no applied source slice existed. Source-contract and lifecycle tests verify that only the active source slice can start the one `/api/crimes/range` request.
7. **Cross-view selection/reorder/brushing:** not fully exercised without applied slices; stable-ID projection, missing-result behavior, brushed source-index preservation, and map ID preference are covered by pure/source-contract tests.
8. **Layout/accessibility/resource smoke:** desktop layout, STKDE-first order, keyboard tab navigation, and no new visible console/build errors were observed. WebGL playback/resource-growth and applied-slice trajectory interaction remain manual follow-ups because the browser session could not create a valid applied slice.

## Remaining limitation

Signed A/B difference remains intentionally unavailable. The dashboard receives sparse server cells without complete grid metadata or aligned zero-valued fields; no dense field was fabricated and no sparse arrays were subtracted. Enabling signed difference requires a future selected-pair dense response contract with explicit grid identity and size limits.

## Deviations from plan

### Auto-fixed issues

1. **[Rule 1 - Bug]** Fixed duplicate comparison-slot assignment so a source ID cannot occupy both A and B.
2. **[Rule 2 - Missing Critical]** Added explicit stale/last-valid response retention and source/fallback status metadata so refresh failures cannot look like empty live analysis.
3. **[Rule 2 - Missing Critical]** Added an empty server result placeholder per ordered source slice so missing intervals cannot create a false trajectory bridge.

No dependencies, API routes, dense-field APIs, workers, or planning/state documents were added or committed.
