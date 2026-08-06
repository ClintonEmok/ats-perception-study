---
status: resolved
trigger: "Investigate why the timeline warp factor is not affecting the timeline in this Next.js prototype. Work read-only for now: do not edit files. Use scientific debugging: identify the relevant state, store, hooks, and timeline rendering code; determine where the warp factor is computed and where it should influence the timeline; reproduce the likely no-op path; and return a concise root-cause report with exact file paths, key functions, and the minimal code change you recommend. Also mention any tests or verification commands that should be run after fixing. Workspace: /Users/clintonemok/Archive/University/Graduation/Project"
created: 2026-06-19T22:15:17Z
updated: 2026-08-04T01:05:00Z
---

## Current Focus

hypothesis: The overview timeline is intentionally the linear ground truth; the prior fix incorrectly made its rendering adaptive.
test: Revert only the overview-scale change and its regression test, preserving all unrelated worktree changes.
expecting: `overviewScale` returns to linear behavior while detail adaptive scaling remains unchanged.
next_action: no further action; do not commit

## Symptoms

expected: Adjusting the timeline warp factor should visibly affect the timeline layout or scaling.
actual: The timeline warp factor does not affect the timeline.
errors: none reported
reproduction: Open the prototype timeline/dashboard, change the warp factor control, observe no timeline change.
started: unknown

## Eliminated

## Evidence

- timestamp: 2026-08-04T00:15:00Z
  finding: New report says the failure is broader than detail view: the dashboard-demo timeline does not work in Adaptive mode in general.
  implication: Reopen the previously resolved session and verify the shared DemoDualTimeline mode/overview/brush path rather than treating the one-slice detail explanation as sufficient.

- timestamp: 2026-08-04T00:25:00Z
  finding: `useScaleTransforms` creates `overviewInteractionScale` and `overviewScale` as an unconditional linear copy; only `detailScale` calls `applyAdaptiveWarping`.
  detail: `DualTimelineSurface` uses `overviewScale` for overview bars, density strip, ticks, and strip selection, while `useBrushZoomSync` intentionally uses `overviewInteractionScale` for raw-domain brush inversion.
  implication: Adaptive mode can affect detail points/bins but cannot affect the overview rendering path. The brush's linear interaction scale is not itself the rendering bug.

- timestamp: 2026-08-04T00:30:00Z
  finding: Applied the minimal source fix: `overviewScale` now uses the same `applyAdaptiveWarping` transform as `detailScale`; `overviewInteractionScale` remains linear for brush/zoom domain conversion.
  files: `src/components/timeline/hooks/useScaleTransforms.ts`, `src/components/timeline/hooks/useScaleTransforms.test.ts`
  implication: Adaptive rendering is now shared by overview and detail without changing selection semantics.

- timestamp: 2026-08-04T00:35:00Z
  finding: First focused run exposed one regression assertion tolerance issue, corrected to account for the existing Float32/interpolation precision. The dashboard shell suite also has an unrelated pre-existing failure at `page.shell.test.tsx:266`: `DemoSlicePanel` no longer contains the expected `setTimeScaleMode|setWarpFactor|resetWarp` source contract.
  implication: Re-run only scale/brush tests for this fix; preserve the unrelated shell failure and report it separately.

- timestamp: 2026-08-04T00:45:00Z
  finding: Focused scale and brush Vitest passed (11 tests); `pnpm exec tsc --noEmit` passed; targeted ESLint passed.
  implication: The overview transform fix is type-safe, lint-clean, and preserves brush/zoom regression coverage.

- timestamp: 2026-08-04T00:50:00Z
  finding: `pnpm build` passed successfully, including production compilation, TypeScript, static generation, and route optimization.
  implication: The fix is verified at the production build boundary.

- timestamp: 2026-08-04T01:00:00Z
  finding: Reporter clarified that the overview timeline must remain the linear ground truth and should not be adaptively warped.
  implication: Revert the previous overview-scale change; the earlier fix addressed the wrong contract.

- timestamp: 2026-08-04T01:05:00Z
  finding: Reverted only the two prior source/test changes; focused scale and brush Vitest passed (11 tests), and the source diff is clean for both files.
  implication: The overview is linear again and unrelated worktree changes were preserved.

- timestamp: 2026-08-04T00:00:00Z
  finding: The dashboard timeline consumed warpFactor through useScaleTransforms, but DemoDualTimeline automatically switched to slice-authored maps whenever any visible warp-enabled slice existed.
  detail: buildDemoSliceAuthoredWarpAllocation creates one partition for a single visible slice; that partition receives the entire domain width, so its sampled warp map is identity. The factor could change while the rendered detail scale remained visually linear.
  commits: Recent timeline history includes ee93b531 (overview intentionally kept linear) and current uncommitted dashboard-demo warp-map work; standalone stkde-3d was not changed.

- timestamp: 2026-08-04T00:00:00Z
  finding: The smallest dashboard-scoped correction is to use slice-authored allocation only when at least two visible warp-enabled slices provide partitions; with one slice, retain the density warp map.
  verification: Focused Vitest passed (26 tests), TypeScript noEmit passed, and ESLint passed for DemoDualTimeline.

- timestamp: 2026-08-04T00:00:00Z
  finding: The initial fix exposed two additional dashboard contract breaks: DemoSlicePanel re-forced adaptive mode whenever a slice existed, and GlobalWarpControls stored a 0-3 factor behind a percentage label while the demo time store retained an independent scale mode.
  fix_detail: Dashboard controls now use an explicit 0-100% to 0-5x mapping, preserve 0% as no warp, synchronize coordination and demo-time scale modes, and use the same factor-to-blend conversion in the dashboard timeline and 3D runtime. Authored allocation is composed with the global blend without overriding the selected mode.
  scope: Dashboard demo only; standalone /stkde-3d was not changed.

## Resolution

root_cause: The previous change violated the dashboard contract by adaptively warping the overview timeline, which is the linear ground truth.
fix: Revert the overview-scale adaptive transform and its regression test; retain the existing detail-only adaptive scale behavior.
verification: Revert verified with focused scale/brush Vitest (11 tests passed). No commit created.
files_changed: [src/components/timeline/hooks/useScaleTransforms.ts, src/components/timeline/hooks/useScaleTransforms.test.ts, .planning/debug/timeline-warp-factor-noop.md]
