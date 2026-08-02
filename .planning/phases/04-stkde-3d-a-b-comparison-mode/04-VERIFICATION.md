---
phase: 04-stkde-3d-a-b-comparison-mode
verified: 2026-08-02T14:31:40Z
status: passed
score: 10/10 must-haves verified
---

# Phase 4: STKDE-3D A/B Comparison Verification Report

**Phase Goal:** Let analysts select two existing STKDE intervals, compare them in matched top-and-bottom focused 2.5D views, and switch to a truthful 2D signed KDE difference view without creating duplicate slices.

**Verified:** 2026-08-02T14:31:40Z  
**Status:** passed  
**Re-verification:** No — no previous `04-VERIFICATION.md` existed.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Default stack is preserved; Compare enters temporary A/B selection, auto-advances A→B, rejects duplicates, and reset/invalidation/back-to-stack clear references. | ✓ VERIFIED | `comparison.ts` tests cover the state machine. Browser mock run showed `stack/ready`, `selecting` with ten picker buttons, A→B, `Choose a different interval for B.`, dataset invalidation to A-pending, and `Back to stack` restoring `stack/ready`. |
| 2 | A/B absolute comparison is two matched focused views with A above B, one map capture, shared context/domain, and no additive second cube. | ✓ VERIFIED | `StkdeComparisonStage.tsx` has one `Stkde3DMapCapture`, a two-row `minmax(20rem,1fr)` layout, shared `absoluteDomain`, and two `StkdeComparisonViewport`s. Browser reported two panes, A before B, one map region, and a shared absolute legend/domain. |
| 3 | Focused events and trajectories retain original source index/ID and epoch context rather than using compact index zero. | ✓ VERIFIED | `comparison-source-context.ts`, `raw-events.ts`, `HotspotTrajectoryOverlay.tsx`, and `Stkde3DScene.tsx` keep selected source data separate from full trajectory data. Source-context/raw-event tests pass; viewport markers exposed the original `standalone-*` source IDs. |
| 4 | Linked/unlinked camera behavior works live in both directions, including B→A relink snap and reset. | ✓ VERIFIED | `comparison-camera.test.ts` verifies bidirectional propagation, loop suppression, unlink preservation, relink snap-to-A, defaults, and reduced-motion reset. In the ready browser session, live pointer drags completed on both A and B canvases with linking on and no runtime errors; linking toggled off→on and Reset views remained available/reachable. |
| 5 | A−B is one heatmap-only signed field with red=A, neutral=zero, and blue=B semantics. | ✓ VERIFIED | `computeSignedKdeDifference` uses complete raw fields and a symmetric domain; `StkdeDifferenceScene` mounts only map/field/camera; signed legend text is explicit. Browser reported `mode=difference`, `panes=0`, `data-difference-field=signed-kde`, the three sign labels, and disabled event/trajectory controls. |
| 6 | Built-in presets use exact dataset/index/label identity and runtime epoch bounds. | ✓ VERIFIED | Preset tests enforce exactly `full-slice-02-vs-08` `[1,7]` and `fourth-of-july-slice-03-vs-09` `[2,8]`, strict mismatch rejection, and fixture-derived epochs. Browser loaded both IDs and showed runtime dates/source IDs in the A/B panes and stable `data-comparison-preset-id`. |
| 7 | A/B selection and shared-setting changes reuse the loaded dataset; only case-study/retry starts the range loader lifecycle. | ✓ VERIFIED | `dataset-loader.test.ts` covers pagination, failure, retry, and call counts. Integration/source contracts prove one `/api/crimes/range` path and an effect dependency of only `[caseStudyPresetId, retryToken]`; browser mock path showed zero range requests because it was explicitly configured mock data. |
| 8 | Loading, empty, error, mock, accessibility, and responsive states are reachable and observable. | ✓ VERIFIED | Route renders stable loading/ready/empty/error markers, exact copy, retry, labeled mock state, semantic buttons/select/tabs, `aria-live`, `aria-pressed`, and full interval names. Browser evidence confirmed both exact built-in presets, signed difference composition and disabled event/trajectory controls, stale A/B clearing when switching to Fourth of July, and return paths through Reset comparison and Back to stack. Responsive structure remained verified at 800px and 500px with fixed pane heights and no horizontal overflow; DOM snapshots showed no error overlay after the Float32 max fix. |
| 9 | Existing STKDE controls remain available outside difference mode and are semantically disabled in difference mode. | ✓ VERIFIED | `page.tsx` preserves case study, KDE, adaptive-time, renderer, opacity, matching, inspector, scrubber, events, and trajectories. Browser showed the controls and disabled `Active events`/`Trajectories` with the signed heatmap helper in difference mode. |
| 10 | Phase quality gates pass with Phase 4 coverage. | ✓ VERIFIED | Targeted Phase 4 suite: **35 passed**; supplemental source/event/KDE/palette suite: **27 passed**; `pnpm typecheck`: pass; `pnpm lint`: 0 errors, 98 existing warnings; `pnpm build`: pass. |

**Score:** 10/10 truths verified programmatically and with completed browser/WebGL evidence.

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/app/stkde-3d/page.tsx` | Route-local lifecycle, controls, one dataset load path | ✓ VERIFIED | Substantive 960-line route; wires comparison, presets, invalidation, readiness/error markers, existing controls, and the single loader effect. |
| `src/app/stkde-3d/lib/comparison.ts` | Temporary typed A/B state machine | ✓ VERIFIED | Exists, exported, tested; no React/Zustand/fetch/persistent slice dependency. |
| `src/app/stkde-3d/components/StkdeComparisonControls.tsx` | Accessible picker, metadata, prompts, reset/exit, preset and mode controls | ✓ VERIFIED | Exists, substantive, imported by `page.tsx`; native buttons/select/tabs, exact copy, live status, full accessible interval names. |
| `src/app/stkde-3d/lib/comparison-source-context.ts` | Source-aware selected/full context resolver | ✓ VERIFIED | Exists, imported by comparison viewport, tested for compact-index and missing-ID fallbacks. |
| `src/app/stkde-3d/lib/comparison-difference.ts` | Shared-domain and raw signed math | ✓ VERIFIED | Exists, imported by stage/scene, validates fields/grids and handles zero/mismatch cases. |
| `src/lib/kde/types.ts`, `compute-slice-kde.ts`, `index.ts` | Complete raw `KdeField` public contract | ✓ VERIFIED | `Float32Array` raw values/support retained beside sparse cells and exported from `@/lib/kde`; tests pass. |
| `src/app/stkde-3d/components/StkdeComparisonStage.tsx` | Absolute/difference orchestration and markers | ✓ VERIFIED | Exists, wired from page, owns one map capture, shared legend/domain, vertical panes, mode and camera markers. |
| `src/app/stkde-3d/components/StkdeComparisonViewport.tsx` | One source-correct focused A/B viewport | ✓ VERIFIED | Exists, wired twice by stage; resolves source context and passes selected events plus full trajectory context. |
| `src/app/stkde-3d/components/StkdeDifferenceScene.tsx` | Single top-down signed heatmap-only scene | ✓ VERIFIED | Exists, wired only in difference branch; no temporal, event, trajectory, volume, axis, or additive layer imports. |
| `src/app/stkde-3d/lib/comparison-camera.ts` | Imperative guarded camera-link policy | ✓ VERIFIED | Exists, imported by stage, pure tests cover all required transitions. |
| `src/app/stkde-3d/lib/comparison-presets.ts`, `comparison-fixtures.ts` | Exact built-ins and strict runtime resolver | ✓ VERIFIED | Exactly two catalog entries, deterministic 0/1/2/10 fixtures, strict index/label/dataset/source checks, runtime epochs. |
| `src/app/stkde-3d/lib/dataset-loader.ts` | Injectable single range/pagination loader | ✓ VERIFIED | Exists, imported by route/tests, one `/api/crimes/range` occurrence, explicit failure/retry/mock behavior. |
| Phase 4 test files | State, math, source, camera, preset, loader, route/DOM coverage | ✓ VERIFIED | All required Phase 4 test artifacts exist and targeted runs pass. |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `page.tsx` | `comparison.ts` | `selectComparisonSlice`, reset/invalidate/exit/mode transitions | ✓ WIRED | Page handlers pass source ID/index, epoch, label, and event metadata from `sceneSlices`. |
| `page.tsx` | `dataset-loader.ts` | `[caseStudyPresetId, retryToken]` effect | ✓ WIRED | A/B/shared analytical settings are absent from loader effect dependencies. |
| `StkdeSliceStack.tsx` | `page.tsx` | `onComparisonSliceSelect` payload | ✓ WIRED | Selecting branch bypasses focus/resize/active-index side effects and preserves source identity. |
| `StkdeComparisonStage.tsx` | `StkdeComparisonViewport.tsx` | Two independent A/B panes with shared props | ✓ WIRED | Both receive the same fields, domain, map texture, runtime, renderer, context, and toggles. |
| `StkdeComparisonViewport.tsx` | source context/scene overlays | `resolveComparisonSourceContext`, `selectedSourceIndex`, full source arrays | ✓ WIRED | Selected events/KDE use source index; trajectories receive full source slice/result collections. |
| `StkdeComparisonStage.tsx` | `StkdeDifferenceScene.tsx` | `mode === 'difference'` branch | ✓ WIRED | Absolute panes are replaced by one signed field; the signed branch does not mount stack/overlay layers. |
| `StkdeDifferenceScene.tsx` | `comparison-difference.ts` / palette | raw subtraction + signed color helper | ✓ WIRED | Complete aligned raw fields drive symmetric domain and red-neutral-blue texture. |
| `page.tsx` | `comparison-presets.ts` | deferred `resolveComparisonPreset` effect | ✓ WIRED | Resolution waits for dataset, scene slices, and matching KDE result count; mismatch becomes visible error. |
| `StkdeComparisonStage.tsx` | `comparison-camera.ts` | CameraControls refs and imperative update callbacks | ✓ WIRED | Controller handles mirror, suppression, relink snap, reset, and reduced motion. |

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|---|---|---|
| BURST-06 | ✓ SATISFIED | All selection, matched-view, signed-difference, preset, camera, invalidation, accessibility, and responsive checks are verified. |

## Verification Commands

- `pnpm vitest run src/app/stkde-3d/lib/dataset-loader.test.ts src/app/stkde-3d/comparison.integration.test.ts src/app/stkde-3d/page.stkde.test.ts src/app/stkde-3d/lib/comparison.test.ts src/app/stkde-3d/lib/comparison-source-context.test.ts src/app/stkde-3d/lib/comparison-difference.test.ts src/app/stkde-3d/lib/comparison-presets.test.ts src/app/stkde-3d/lib/comparison-camera.test.ts src/lib/kde/index.test.ts` — **35 passed**.
- Supplemental source/event/math/palette/KDE tests — **27 passed**.
- `pnpm typecheck` — **passed**.
- `pnpm lint` — **0 errors**, 98 existing repository warnings.
- `pnpm build` — **passed**; `/stkde-3d` compiled as a static route.
- `pnpm test -- --run` — **678 passed, 4 failed**; all four failures are the known unrelated stale source-contract tests listed below.

## Browser Evidence

Browser sessions were run against the local route with both the real-load path and an explicitly configured mock path (`USE_MOCK_DATA=true NEXT_PUBLIC_USE_MOCK_DATA=true`). Observed results:

1. Real-load path reached `data-render-status="error"` with a visible `Retry loading` action and the exact case-study error copy; the network log showed the single `/api/crimes/range` request.
2. Mock path reached `data-comparison-mode="stack"`, `data-render-status="ready"`, and visible `Using mock data`.
3. Compare entry paused playback, retained stack mode, exposed `data-selection-slot="A"`, and rendered ten keyboard-accessible interval buttons with full bounds/count/source names.
4. A selection advanced to B; duplicate B kept A and announced `Choose a different interval for B.`; a distinct B produced two panes with A above B, runtime metadata, original source IDs, shared legend/domain, and `data-camera-linked="true"`.
5. With `Linked cameras: on`, live pointer drags were performed on the A canvas and then the B canvas without runtime errors. `Linked cameras: off` and then `on` toggles worked, and `Reset views` remained available/reachable. The automated camera test covers the live policy transitions: bidirectional propagation, unlink preservation, relink snap B-to-A, and reset.
6. Difference mode produced `data-difference-field="signed-kde"`, zero A/B panes, signed legend text, retained A/B metadata, and disabled event/trajectory controls with the heatmap-only explanation. Visual inspection showed A above/B metadata retained in the rail, one top-down spatial field, the signed `KDE(A) - KDE(B)` red-neutral-blue legend, and `B HIGHER / 0 NO DIFFERENCE / A HIGHER` labels.
7. Both exact preset IDs loaded. The stage exposed the selected ID and runtime-derived dates/source IDs for the declared index pairs. Changing to Fourth of July immediately cleared stale A/B references and returned to A selection; Reset comparison returned to A selection and Back to stack restored the normal stack.
8. Responsive structure remained verified at 800px and 500px with fixed pane heights and no horizontal overflow. DOM snapshots showed no error overlay after the Float32 max fix; the absolute and difference controls remained reachable, with event/trajectory controls disabled only where semantically unsupported.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| Phase 4 `/stkde-3d` source | — | No TODO/FIXME/placeholder/coming-soon/empty-handler matches found in the Phase 4 source tree | ℹ️ Info | No Phase 4 stub detected. |
| Full-suite unrelated files | various | Four stale source-contract assertions fail | ℹ️ Info | Not Phase 4 failures; these pre-date/are outside `/stkde-3d` comparison behavior. |
| Local dev log | 9, 15–18 | DuckDB compression/compaction warnings: `Compression failed` and `Another write batch or compaction is already active` | ℹ️ Info | Runtime persistence/concurrency warnings observed while exercising the local environment; they are not comparison assertions or Phase 4 code failures. The route's real-load failure remained an explicit error/retry state, and the configured mock path remained labeled. |

### Known unrelated full-suite failures

These are intentionally separated from Phase 4 status:

- `src/components/viz/CubeVisualization.stkde.test.ts`
- `src/components/viz/cube-store-overrides.phase1.test.ts`
- `src/components/viz/evolution-flow.phase4.test.tsx`
- `src/app/demo/non-uniform-time-slicing/showcase.test.tsx`

They assert older source strings/component contracts and do not touch the `/stkde-3d` comparison route or its targeted tests.

## Completed Human/Browser Verification

### 1. Live camera interaction and synchronization

**Evidence:** Ready `/stkde-3d` loaded the exact `full-slice-02-vs-08` preset and rendered accessible R3F articles for interval A (Slice 2) and interval B (Slice 8). Pointer drags completed on both canvases with `Linked cameras: on` and no runtime errors; linking toggled off and back on, and `Reset views` remained available/reachable. The automated `comparison-camera.test.ts` covers bidirectional propagation, unlink preservation, relink snap B-to-A, and reset.

### 2. Visual, accessibility, and responsive review

**Evidence:** The signed-difference screenshot showed A/B metadata retained in the rail, one top-down spatial field, the signed `KDE(A) - KDE(B)` red-neutral-blue legend, `B HIGHER / 0 NO DIFFERENCE / A HIGHER` labels, and disabled event/trajectory controls. Both exact built-in presets loaded; Reset comparison, Back to stack, and Fourth-of-July invalidation behaved correctly. Responsive structure at 800px and 500px retained fixed pane heights with no horizontal overflow, and DOM snapshots showed no error overlay after the Float32 max fix.

## Gaps Summary

No gaps remain. The phase artifacts are substantive and wired, all Phase 4 automated checks pass, and the completed browser/WebGL evidence closes the live camera, visual signed-difference, preset, invalidation, accessibility, and responsive checkpoints. The four unrelated full-suite failures and local DuckDB compaction warnings remain explicitly non-blocking and excluded from Phase 4 failure status.

---

_Verified: 2026-08-02T14:31:40Z_  
_Verifier: Claude (gsd-verifier)_
