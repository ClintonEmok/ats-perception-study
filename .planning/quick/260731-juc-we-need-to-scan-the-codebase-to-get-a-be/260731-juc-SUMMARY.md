---
id: 260731-juc
status: complete
mode: quick
completed: 2026-07-31
---

# Quick Task 260731-juc: Timestamp-safe adaptive 3D active events Summary

Preserved epoch-second event timestamps through standalone and dashboard-demo conversion, aligned brushed event groups by source slice, and made opt-in active points follow the shared adaptive scene runtime.

## Completed Tasks

### 1. Preserve and align event data

- Added `timestampEpochSec` to `MockCrimeEvent`.
- Preserved `CrimeRecord.timestamp` in real and dashboard conversion paths.
- Added deterministic mock timestamps, source-slice event grouping, brushed-domain filtering, and source-ID alignment helpers.
- Rebuilt dashboard `cubeSliceEvents` in final visible cube order so brushing cannot shift groups.

Commit: `795580d`

### 2. Render adaptive active events and reconcile allocation

- Routed each raw event through the shared runtime `resolveEpochY` with a finite-timestamp compatibility fallback.
- Kept standalone `Active events` behavior and added an explicit dashboard opt-in control, defaulting to hidden.
- Rebuilt brushed `cubeVolumeProfile` through `buildDurationVolumeProfile` with the active warp map/domain and matching volume settings.
- Kept trajectory rendering on the existing STKDE snapshot midpoint path.
- Added focused tests for adaptive event Y mapping, domain filtering, source-slice brushing alignment, timestamp preservation, dashboard wiring, and allocation parity.

Commits: `47028dc`, `6d5d723`

## Key Files

### Created

- `src/app/stkde-3d/lib/event-data.ts`
- `src/app/stkde-3d/lib/event-data.test.ts`
- `src/app/stkde-3d/lib/raw-events.ts`
- `src/app/stkde-3d/lib/raw-events.test.ts`
- `src/components/dashboard-demo/Demo3dSpatialView.events.test.ts`

### Modified

- `src/app/stkde-3d/lib/types.ts`
- `src/app/stkde-3d/lib/mock-data.ts`
- `src/app/stkde-3d/components/Stkde3DScene.tsx`
- `src/app/stkde-3d/lib/volume-encoding.test.ts`
- `src/components/dashboard-demo/Demo3dSpatialView.tsx`

## Verification

- Targeted Vitest suite: **35 passed, 0 failed**.
- `pnpm typecheck`: **passed**.
- Targeted ESLint: **0 errors, 1 pre-existing warning** in `src/app/stkde-3d/components/SliceScrubber.tsx` (`no-unused-vars`).
- `pnpm build`: **passed**; `/stkde-3d` and `/dashboard-demo` compiled.
- Browser smoke: standalone `/stkde-3d` loaded with the `Active events` toggle and toggled successfully; `/dashboard-demo` loaded, switched to its 3D empty state, and remained error-free. The dashboard active-event control requires generated slices before it is rendered.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added placeholder timestamps during mock event construction**

- **Found during:** Task 1 typecheck.
- **Issue:** Making `timestampEpochSec` required exposed intermediate mock event literals without the new field.
- **Fix:** Added a finite placeholder before the deterministic in-slice timestamp pass.
- **Files modified:** `src/app/stkde-3d/lib/mock-data.ts`
- **Commit:** `795580d`

The plan referenced `src/components/dashboard-demo/page.shell.test.tsx`, but that path does not exist in this repository; the equivalent existing route test at `src/app/dashboard-demo/page.shell.test.tsx` was run instead.

## Decisions Made

- Event groups are keyed by dashboard `sourceSliceId` and projected into final cube order before rendering.
- Active events remain opt-in in both routes; dashboard visibility is an explicit local control and defaults to hidden.
- Brushed volume allocation uses the same active adaptive profile helper as full scope rather than raw duration percentages.

## Next Phase Readiness

No implementation blockers. The dashboard browser smoke starts in its existing empty 3D state until generated slices are applied; this is expected route behavior, not an active-event rendering failure.
