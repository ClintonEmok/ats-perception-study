# Phase 84 — Context

**Phase:** 84 — Burstiness Signal Contract + Density Fallback + Contextual z
**Milestone:** v3.4 Burstiness-First Adaptive Timeline
**Status:** Ready for research

## Goal (from ROADMAP §84)

Introduce a shared, parameterized burstiness-vs-density-vs-contextual signal contract on the dashboard-demo adaptive timeline. Burstiness is the default driver. Density is preserved as an explicit fallback. Contextual z (Phase 83's metric, ported to TypeScript) is added as a third signal source for comparison. Switching between sources at runtime does not change the public timeline API.

## Locked decisions

### 1. Contract sources: `{burstiness, density, contextual}`

Three options in the `AdaptiveSignalSource` union:

- **burstiness** (default) — current behavior. Uses Goh-Barabasi B (temporal), spatial burstiness, or combined (per existing `BurstMetric` type union at `src/lib/burst-detection.ts:6`). The `warpWeight` for burst slices stays at 1.25; neutral partitions at 1.0. **This is the default after Phase 84 — same behavior as pre-Phase-84.**
- **density** (fallback) — explicit comparison mode. `warpWeight` is computed from observed/expected count ratio per cell. Reuses the 168-cell baseline built for contextual (Plan 84-02).
- **contextual** (new, comparison mode) — winsorized Pearson residual against the 168-cell baseline. Port of `metrics/contextual.py` to TypeScript (Plan 84-03). Range of `warpWeight` is 0.2x to 3.0x (clamp + linear remap of z).

Decision: **keep burstiness as the default** so existing UAT results, slice lock state, and user muscle memory are preserved. Adding contextual as a third option (not replacement) is the safer, more thesis-defensible move.

### 2. Contextual implementation: winsorized Pearson residual (5/95)

`z = (O − mu_w) / sigma_w` where `mu_w` and `sigma_w` are the winsorized mean and std (5th/95th percentile clip) of the cell's historical per-week rate distribution.

Why winsorized, not standard Pearson:
- Crime datasets have outlier days (NYE, July 4, COVID dip, sporting events) that inflate `sigma` and deflate everyone's z-score.
- Standard Pearson is the right statistic for counts but is not robust to outliers in the baseline estimation.
- Winsorization at 5/95 keeps the Poisson-variance scaling (z is still dimensionless) while being robust to regime shifts.
- The user confirmed this is the production choice for the contextual metric (dismissed "future-work" framing; the metric should ship robust by default).

**Pre-flight sensitivity check:** a 5-minute Python script (`metrics/sensitivity_winsorized.py`) re-runs the Phase 83 comparison with winsorized z added as a 5th metric. If winsorized z's CV at 1d is within 30% of standard z's CV, ship winsorized z as-is. If the ratio collapses (>50% drop), revert to standard z and document the sensitivity in the thesis note. Either way, this check is the audit trail.

### 3. Baseline source: pre-built JSON in `/public/baselines/baseline_168.json`

The Python pipeline already produces `baselines/baseline_168.parquet` (8.2 KB, sha256:793ccaa9c229c3a6, 8,476,869 events, 1,305 weeks — see commit dd8be2a). A small script exports the parquet to JSON once, committed to the repo. The TS port reads it via `fetch('/baselines/baseline_168.json')` on first signal switch and caches in memory.

**Rationale:** The 168-cell baseline changes only when the dataset changes (rare; the current dataset is from `data/sources/Crimes_-_2001_to_Present_20260114.csv`). Building it lazily on every page load is wasteful; building it from DuckDB on the client adds startup latency. A pre-built JSON in `/public` is fast, deterministic, and version-controlled.

Fallback path: if the static file is missing, `src/app/api/adaptive/contextual-baseline/route.ts` builds it from DuckDB server-side and returns the same JSON. Server caches the result in memory.

### 4. UI toggle: 3-way `<Select>` in dashboard-demo timeline

A `<Select>` (Radix UI, already in stack) with three options: Burstiness (default), Density, Contextual. Lives in the existing timeline controls surface. Selection persists in `useAdaptiveStore.activeSignalSource` and is restored on page load (localStorage).

**Research task:** the exact component file and location of the existing controls needs to be confirmed by the researcher (likely `src/app/dashboard-demo/components/TimelineControls.tsx` or similar — the researcher will scan and pick the right spot).

### 5. BFT-04..BFT-12 coverage

Most BFT-* requirements are already satisfied by existing code (verified via Phase 79-80 work). The new work in this phase is:

| BFT | Description | Plan |
|-----|-------------|------|
| BFT-01 | Parameterized signal contract | 84-01 |
| BFT-02 | Burstiness default + density fallback | 84-02 |
| BFT-02 (cont) | Contextual z as 3rd option | 84-03 |
| BFT-03 | Preserve density implementation | 84-02 |
| BFT-10 | UI toggle for signal source | 84-03 |

Already satisfied (no new work):
- BFT-04 (histogram-based detail) — `DualTimeline` is histogram in both modes
- BFT-05 (bin spacing/aggregation) — current warpWeight already encodes this
- BFT-06 (stable overview) — overview timeline is separate from detail
- BFT-07/08 (burst onset cues) — `burstClass` taxonomy ('prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral') already wired through `bin.burstClass` to slice display
- BFT-09 (synchronized views) — `useCoordinationStore` already handles map/cube/timeline sync
- BFT-11 (density fallback works) — Plan 84-02's parity test enforces this
- BFT-12 (compatible workflow) — guard test in Plan 84-01 enforces no public API drift

The 3-plan structure (84-01, 84-02, 84-03) covers the new work. ROADMAP will be refreshed to match.

### 6. Public API preservation (BFT-12)

Switching `activeSignalSource` between `{burstiness, density, contextual}`:
- Does NOT mutate `TimeSlice[]` (slices are mode-agnostic)
- Does NOT change `TimeSlice` field shape
- Does NOT change `useAdaptiveStore` public surface (only adds one new field)
- DOES change the runtime computation of `warpWeight` for newly added slices (existing slices keep their `warpWeight` until modified)

Guard test in Plan 84-01: assert `Object.keys(useAdaptiveStore.getState())` is identical before and after a hypothetical source switch (excluding the new `activeSignalSource` field).

## Out of scope (locked)

- **Wiring contextual into the cube / map views.** Phase 84 is timeline-only. The 3D cube and 2D map read `TimeSlice.warpWeight`, which is set by the timeline path; they don't need changes.
- **Replacing the Goh-Barabasi B default.** Burstiness stays the default. Contextual is added as a comparison option, not a replacement. Per the user's earlier framing ("B as prototype default: correct, no change needed").
- **Persisting the new `activeSignalSource` across the prototype UI surfaces beyond the timeline.** Only the timeline `<Select>` reads/writes the source. The map and cube are read-only consumers of `warpWeight`.
- **TypeScript port of the full Python decision gate pipeline.** Only the contextual metric code is ported. The decision gate (verdict GO/NO_GO) is a Phase 83 artifact, already shipped as `docs/CONTEXTUAL_BURSTINESS_VS_GOH_BARABASI_THESIS_NOTE.md`.
- **Real-time baseline updates.** The baseline is built once and committed to `/public`. Re-baselining when the dataset changes is a separate concern (deferred to a future phase).

## Success criteria (ROADMAP §84 — refreshed)

1. `AdaptiveSignalSource` type union with three members (`burstiness | density | contextual`); runtime-switchable via `useAdaptiveStore.activeSignalSource`.
2. Burstiness is the default and produces the same `warpWeight` values as pre-Phase-84 (parity test passes).
3. Density is a supported mode and computes `warpWeight` from the 168-cell baseline (no behavior change to existing density-derived path).
4. Contextual z is ported to TypeScript as winsorized Pearson residual; sensitivity check confirms CV within 30% of standard z at 1d.
5. UI toggle (3-way `<Select>`) lives in the dashboard-demo timeline; default = burstiness; selection persists in localStorage.
6. Public timeline API is preserved: switching source does not mutate `TimeSlice[]` or `TimeSlice` shape.
7. Winsorized z values from TS match Python within 1e-6 on known input vectors.

## Dependencies

- **Phase 83 (CBP-05 verdict GO):** satisfied (committed c0a06b4, DECISION-GATE.md verdict: GO).
- **Static baseline file:** `baselines/baseline_168.parquet` from Phase 83 (8.2 KB, committed dd8be2a). The script to convert parquet → JSON is part of Plan 84-03 Task 1.
- **DuckDB query path:** `data/cache/crime.duckdb` (DUCKDB_PATH env var) for the fallback API route.
- **Existing `useAdaptiveStore.ts` contract test:** `src/store/useAdaptiveStore.contract.test.ts` — guard test pattern reused in Plan 84-01.

## Decisions to be researched (NOT locked yet)

The research phase will investigate and recommend on:

1. **Where to put the UI `<Select>`** — exact component file, prop interface, accessibility wiring (Radix `<Select>` already in stack, but the placement in the timeline is non-trivial).
2. **Density signal mapper formula** — `warpWeight = 1 + clamp(O/E − 1, 0, 2) * 0.5` is the proposal. Researcher should validate against existing `addSliceFromBin` density path and confirm the warpWeight range matches (1.0-2.0).
3. **Winsorization TS implementation** — percentile computation in TS: hand-rolled sort+interp (matches Python `numpy.percentile` with linear interp), or pull in a tiny library. Researcher recommends.
4. **Static baseline file size + fetch cost** — JSON vs. msgpack vs. binary. JSON is verbose but human-readable; 168 floats × 2 ≈ 5 KB. Researcher confirms JSON is fine.
5. **Server-side cache strategy** for the fallback API route — in-memory Map keyed by `DUCKDB_PATH` + file mtime. Researcher confirms this is the right pattern.
6. **Test infrastructure for slice parity** — how to write a contract test that asserts "burstiness mode produces same warpWeight as pre-Phase-84" without a full prototype mount. Likely snapshot of the pre-Phase-84 `useAdaptiveStore` getter output.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Winsorized z signal collapses (sensitivity check fails) | Plan 84-03 falls back to standard z with documented sensitivity. Decision documented in thesis note Section 5. |
| UI toggle breaks existing dashboard-demo layout | Plan 84-03 Task 5 wraps the new `<Select>` in a feature-flag `useFeatureFlagStore` so it can be hidden if layout breaks. |
| Public API drift breaks downstream consumers | Plan 84-01 includes a contract test that fails the build if any unexpected field is added to the public surface. |
| Winsorization percentile differs subtly between Python (`numpy.percentile` linear) and TS (hand-rolled) | Plan 84-03 includes a known-vector test where both implementations must match within 1e-6. |
| Static baseline gets stale when dataset updates | `/api/adaptive/contextual-baseline` route is the fallback; logs a warning when the static file is older than the DuckDB mtime. |

## Open questions for the researcher

1. Should the `<Select>` placement be in `TimelineControls.tsx` (single source switcher) or a per-bin popover (per-bin source choice)? Defaulting to global switcher per BFT-10 wording.
2. Are there existing tests for `addSliceFromBin` / `replaceSlicesFromBins` that we can use as snapshots for the burstiness-mode parity test?
3. Is there a single source of truth for the timeline's mode (linear/adaptive) that the new signal source should be subordinated to? Likely `useDashboardDemoTimeslicingModeStore.timeslicingMode` — researcher confirms.
4. Does the existing burst detection path in `src/lib/burst-detection.ts` already expose a `BurstMetric` ('temporal' | 'spatial' | 'combined') that maps cleanly onto our new `burstiness` source? Researcher confirms the mapping and identifies any gap.
