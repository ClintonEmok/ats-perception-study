---
status: resolved
trigger: "Selecting B in /stkde-3d comparison mode crashes with KDE comparison field A has an inconsistent raw maximum."
created: 2026-08-02T00:00:00Z
updated: 2026-08-02T11:56:22.801Z
---

## Current Focus

hypothesis: confirmed — the raw KDE field metadata tracked the pre-storage JavaScript maximum while `KdeField.values` exposed Float32-rounded values.
test: trace KdeField construction, field maximum calculation, and getSharedAbsoluteDomain inputs for the first selected A/B pair; add a focused regression test for the browser reproduction.
expecting: identify whether the producer reports a normalized/sparse maximum while the comparison consumer expects the complete raw field maximum.
next_action: resolved; retain the regression and verify the full STKDE route build.

## Symptoms

expected: selecting two distinct rendered slices should show the absolute A/B comparison panes.
actual: selecting A succeeds; selecting B causes the Next.js error overlay and the page becomes unusable.
errors: `KdeComparisonError: KDE comparison field A has an inconsistent raw maximum` at `src/app/stkde-3d/lib/comparison-difference.ts:72`.
reproduction: open `http://localhost:3000/stkde-3d`, click `Compare intervals`, select Slice 2 for A, then select Slice 8 for B.
started: 2026-08-02

## Evidence

- timestamp: 2026-08-02T00:00:00Z
  checked: `/tmp/stkde-phase4.log` after browser reproduction
  found: `assertValidKdeField` rejects field A from `getSharedAbsoluteDomain`, called by `StkdeComparisonStage` after B selection.

- timestamp: 2026-08-02T11:56:22.801Z
  checked: `computeSliceKde` producer and `getSharedAbsoluteDomain` consumer with a deterministic two-point field using the route's 48-grid, 150m smoothing, and four-cell radius settings
  found: the producer assigned the raw maximum before Float32 storage; Float32 rounding could make `max(values)` exceed `field.maxIntensity` by one ULP, so the consumer's strict metadata validation rejected a valid field.

## Eliminated

- hypothesis: the display threshold or sparse `cells` projection removed or normalized the analytical maximum.
  reason: comparison validation reads `field.values` directly, and the mismatch occurs before display-cell conversion.

- hypothesis: A/B fields have incompatible grid dimensions or cell sizes.
  reason: both fields are produced with the same route parameters; the thrown error is the raw-maximum validation branch, not `grid-mismatch`.

## Resolution

root_cause: `computeSliceKde` recorded `KdeField.maxIntensity` from the higher-precision intermediate KDE sum, while `KdeField.values` stores Float32 values that can round upward; `assertValidKdeField` correctly detected the metadata/value contract violation.
fix: derive the stored raw maximum from each value after Float32 assignment, and use that same maximum for display normalization and returned metadata.
verification: `vitest src/app/stkde-3d src/lib/kde` passed (69 tests); targeted KDE/comparison tests passed (10 tests); `pnpm typecheck` passed; `pnpm build` completed successfully with `/stkde-3d` generated.
files_changed:
- `src/lib/kde/compute-slice-kde.ts`
- `src/app/stkde-3d/lib/comparison-difference.test.ts`
- `.planning/debug/stkde-comparison-raw-maximum.md`

## Blameless Postmortem

why_not_caught: no regression covered the producer's Float32 storage boundary against the comparison consumer's strict raw-field metadata validation.
guard: focused comparison regression test constructs the route KDE fields and asserts the stored maximum is accepted by `computeSharedAbsoluteDomain`.
