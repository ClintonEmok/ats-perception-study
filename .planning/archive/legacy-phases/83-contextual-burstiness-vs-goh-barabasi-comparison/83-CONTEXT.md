# Phase 83: Contextual Burstiness vs Goh-Barabasi Comparison — Context

**Gathered:** 2026-06-27
**Status:** Ready for planning
**Source:** Direct conversation (analytical Python work, not a code feature)

<domain>
## Phase Boundary

Produce a thesis-grade analytical comparison showing that a **contextual (deviation-from-baseline) burstiness metric** carries more signal than the **Goh-Barabasi inter-event-time burstiness measure** on the 8.5M-record crime dataset, with reproducible Python notebooks, comparison figures, and a decision gate for whether the new metric is worth wiring into the dashboard-demo prototype.

**Out of scope (this phase):**
- Wiring the new metric into the Next.js/TypeScript prototype (deferred to Phase 84, gated on the CBP-05 decision gate).
- Any UI changes.
- Any TypeScript code modifications.

**In scope (this phase):**
- Python analysis reading from the local DuckDB at the path specified by `DUCKDB_PATH` (or default).
- Both metrics computed over the same time windows (1h, 6h, 1d, 1w) on the same dataset.
- Reproducible single-run script/notebook.
- Thesis-ready figures (heatmap, time series, contrast table).
- Written decision-gate document with go/no-go threshold for prototype integration.
</domain>

<decisions>
## Implementation Decisions

### Metric A — Contextual Burstiness (z-score deviation from baseline)
- **Baseline grid:** hour (0–23) × dayOfWeek (0–6) → 168 cells.
- **Expected rate:** `expected[hour, dow] = mean crime count for that cell` across the dataset.
- **Sigma profile:** `sigma[hour, dow]` = standard deviation of the same cell.
- **Per-bin score:** `z = (observed - expected * binDuration) / (sigma * sqrt(binDuration))`.
- **Output:** z-score per (window start, window end) tuple, indexed by hour-of-day and day-of-week.

### Metric B — Goh-Barabasi burstiness (baseline reference)
- **Formula:** `B = (σ_τ − μ_τ) / (σ_τ + μ_τ)` on inter-event times τ within each window.
- **Windowing:** same window set (1h, 6h, 1d, 1w) for fair comparison.
- **Implementation:** can re-derive or port `src/lib/burst-detection.ts:53-59` logic to Python; record the source file for traceability.

### Metric C — Density (rate reference)
- **Formula:** `density = n_events / window_seconds` (events per second averaged over the window).
- **Windowing:** same window set (1h, 6h, 1d, 1w) for fair comparison.
- **Interpretation:** raw activity level — measures *how many* events occurred, not *how clustered* they are. Bursty windows have higher density. This is the simplest possible "burst" signal: just the count.
- **Edge cases:** density is always ≥ 0. Empty windows have density = 0 (kept in the series). No degenerate cases.

### Metric D — Coefficient of variation of inter-event times (CV)
- **Formula:** `CV = σ_τ / μ_τ` on inter-event times τ within each window.
- **Windowing:** same window set (1h, 6h, 1d, 1w) for fair comparison.
- **Interpretation:** the unbounded cousin of Goh-Barabasi B. Same numerator, different denominator (μ alone instead of σ + μ). CV ≥ 0 always; CV = 0 means perfectly regular gaps (σ = 0). For Poisson-process gaps, CV ≈ 1.
- **Edge cases:** returns `None` (dropped from series) when n_events < 2 (no gaps) or μ_τ ≤ 0 (zero-length gaps).
- **Why include it:** Goh-Barabasi's boundedness (B ∈ [-1, 1]) is sometimes claimed to be a feature. CV gives us the *unbounded* version of the same shape signal, so we can see whether the boundedness is the source of the 0.30 → 0.01 collapse or whether it's a property of the gap distribution itself.

### Comparison metric
- **Per-window dynamic range** = coefficient of variation (CV) and (max − min) over the window sweep.
- **Acceptance threshold (decision gate):** contextual metric CV ≥ 2× max(Goh-Barabasi, density, CV) CV at the 1d window, and contextual metric range ≥ 3× max(Goh-Barabasi, density, CV) range at 1d. If met → "go" for prototype integration. If not met → "not yet", revisit baseline dimensions or fall back to BFT-04..BFT-06 from Phase 84. The "max" comparator is intentional: contextual should beat *every* reference, not just the average.

### Baseline dimensions
- Start with **hour × dayOfWeek** (168 cells) as the primary baseline. Optionally extend to **hour × dayOfWeek × month** (2016 cells) in a stretch goal if time permits.

### Output artifacts (all under `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/output/`)
1. `contextual_metric.parquet` — per-window z-scores
2. `goh_barabasi_metric.parquet` — per-window B values
3. `density_metric.parquet` — per-window density (events/sec)
4. `cv_metric.parquet` — per-window CV (σ_τ / μ_τ)
5. `comparison_table.csv` — CV, range, mean, std for all 4 metrics at each window size (16 rows = 4 metrics × 4 window sizes)
6. `figures/z_heatmap.png` — hour×dayOfWeek z-score heatmap
7. `figures/per_window_timeseries.png` — 4-line time series at 1d: z (left axis), B / density / CV (right axis, normalized)
8. `figures/contrast_table.png` — visual contrast table mirroring the 16-row CSV
9. `DECISION-GATE.md` — 4-way go/no-go call with threshold justification

### Reproducibility
- One command: `python run.py` (or `make reproduce`) reads from DuckDB, computes both metrics, writes all artifacts, and prints the decision-gate verdict.

### Stack
- Python 3.11+, DuckDB (via `duckdb` Python package — same as Next.js), pandas, numpy, matplotlib, scipy.
- No new dependencies beyond what is already in the project.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing burstiness code (to port and compare against)
- `src/lib/burst-detection.ts:53-59` — Goh-Barabasi `B = (σ-μ)/(σ+μ)` implementation
- `src/lib/burst-detection.ts:6-21` — `BurstMetric` and `SpatialFormula` type unions (pattern for runtime-selectable metrics)
- `docs/FUTURE-WORK-ADAPTIVE-TIME.md:57-83` — original "Contextual Burst Baseline" sketch
- `docs/FUTURE-WORK-ADAPTIVE-TIME.md:227` — documents the per-window CV collapse problem
- `docs/FUTURE-WORK-ADAPTIVE-TIME.md:286-294` — baseline table showing B (IEI) at 1h/6h/1d/1w = 0.30/0.06/0.01/0.00
- `src/lib/stats/aggregation.ts:58-94` — `aggregateByHour`, `aggregateByDayOfWeek`, `aggregateByMonth` (building blocks for the contextual baseline)

### Data layer
- `.env` → `DUCKDB_PATH` (or default path used by `src/lib/db/duckdb.ts`)
- `src/app/api/crime/stream/route.ts` — example of how the project queries DuckDB
- `src/lib/queries/builders.ts` — fluent query builder pattern (sanitization in `src/lib/queries/sanitization.ts`)

### Project conventions
- `AGENTS.md` — project guidelines, GSD workflow
- `docs/FUTURE-WORK-ADAPTIVE-TIME.md` — problem statement and existing context
</canonical_refs>

<specifics>
## Specific Ideas

- The 8.5M records sit in DuckDB. The Python script should query directly with `duckdb.read_sql("SELECT …")` rather than exporting CSVs.
- **Decision gate thresholds (CBP-05):** if contextual CV at 1d ≥ 2× Goh-Barabasi CV, and contextual range at 1d ≥ 3× Goh-Barabasi range, then "go". Otherwise "not yet — extend baseline dimensions or revisit".
- **Where the metric would be wired (CBP-06, deferred to Phase 84):** `src/lib/burst-detection.ts` runtime-selectable union, `src/store/slice-domain/` adaptive warp, dashboard-demo timeline density strip.
- The contrast figure should be the kind of figure that goes in a thesis chapter — clean axis labels, legend, source caption, no decorative noise.
</specifics>

<deferred>
## Deferred Ideas

- **Phase 84 (Burstiness Signal Contract + Density Fallback)** — wires contextual burstiness into the prototype. **Conditional on CBP-05 "go"** — do not start until this phase's decision gate passes.
- Adding more baseline dimensions (hour × dayOfWeek × month × type) — stretch goal only after the primary comparison ships.
- TypeScript port of the contextual metric — only after Phase 84 CBP-05 gate passes.
- Prototype UI changes to show the contrast — separate phase, gated on Phase 84.
</deferred>

---

*Phase: 83-contextual-burstiness-vs-goh-barabasi-comparison*
*Context gathered: 2026-06-27 via direct conversation*
