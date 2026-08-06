---
id: 20260803-adaptive-temporal-allocation
status: complete
mode: quick
completed: 2026-08-03
---

# Adaptive Temporal Allocation Summary

Implemented dashboard-demo authored temporal allocation using the existing density signal and shared comparable-warp allocator.

## Changes

- Converted normalized slice ranges and point positions into the requested epoch domain before allocation.
- Added finite interval density averaging with neutral fallback for missing or degenerate density maps.
- Preserved bounded per-slice `warpWeight` hints through the shared 0.25–4 clamp.
- Added a test-visible allocation result helper for cumulative boundaries and minimum-width assertions.
- Synchronized timeline and 3D authored-map inputs around the same density map, full domain, slices, and sample-count policy.
- Moved authored-source activation into the always-mounted timeline so it remains reachable outside the Slices tab.
- Added the bounded per-slice warp-weight input to the slice details dialog.
- Preserved source slice ranges and geometry; overlapping source intervals use cumulative display allocation and a monotonic sampled map.

## Verification

- Focused Vitest suite: 23 passed, 0 failed.
- Typecheck: passed.
- Targeted ESLint: passed with no issues.
- `git diff --check`: passed.
- Production build: passed.

No application or planning commit was created.
