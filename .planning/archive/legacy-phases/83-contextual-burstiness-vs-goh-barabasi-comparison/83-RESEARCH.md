# Phase 83: Contextual Burstiness vs Goh-Barabasi Comparison — Research

**Researched:** 2026-06-27
**Domain:** Analytical Python (DuckDB ↔ pandas ↔ matplotlib), statistical comparison of burstiness metrics
**Confidence:** HIGH (formulations verified, prior baseline numbers known, stack patterns verified via Context7)

## Objective

Produce a thesis-grade analytical comparison showing that a **contextual (deviation-from-baseline) burstiness metric** carries more signal than the **Goh-Barabasi inter-event-time burstiness measure** on the 8.5M-record Chicago crime dataset (`data/sources/Crimes_-_2001_to_Present_20260114.csv`, 8,476,870 rows, 22 columns including `Date`, `Primary Type`, `District`, `Latitude`, `Longitude`). Deliver a single reproducible Python run that re-derives both metrics from the same DuckDB source, produces three thesis-ready figures, and writes a written decision-gate (go / not yet / no) with explicit thresholds for whether to wire the contextual metric into the dashboard-demo prototype (deferred to Phase 84, gated on CBP-05).

## Context (locked decisions from CONTEXT.md)

These are the constraints the planner MUST treat as fixed — no exploration of alternatives:

| Topic | Locked decision | Source |
|---|---|---|
| Baseline grid (primary) | `hour (0-23) × dayOfWeek (0-6)` → 168 cells | CONTEXT.md L29, L45 |
| Baseline grid (stretch) | `hour × dayOfWeek × month` → 2,016 cells | CONTEXT.md L45 |
| Expected rate | `expected[h, dow] = mean crime count for that cell` across dataset | CONTEXT.md L30 |
| Sigma profile | `sigma[h, dow] = std of the same cell` | CONTEXT.md L31 |
| Per-bin z-score | `z = (observed − expected · binDuration) / (sigma · sqrt(binDuration))` | CONTEXT.md L32 |
| Output indexing | z-score per `(window start, window end)`, indexed by hour-of-day and day-of-week | CONTEXT.md L33 |
| Goh-Barabasi formula | `B = (σ_τ − μ_τ) / (σ_τ + μ_τ)` on IEI τ within each window | CONTEXT.md L36, `src/lib/burst-detection.ts:53-59` |
| Window set | 1h, 6h, 1d, 1w on both metrics for fair comparison | CONTEXT.md L19, L37 |
| Comparison stats | CV (coefficient of variation) and (max − min) range across window sweep | CONTEXT.md L41 |
| Decision gate (CBP-05) | contextual CV at 1d ≥ 2× Goh-Barabasi CV **and** contextual range at 1d ≥ 3× Goh-Barabasi range → "go"; else "not yet" | CONTEXT.md L42, L91 |
| Out of scope | TypeScript wiring, prototype UI changes — deferred to Phase 84 | CONTEXT.md L12-15 |
| Single-run command | `python run.py` (or `make reproduce`) reads from DuckDB, computes both metrics, writes all artifacts, prints verdict | CONTEXT.md L57 |
| Stack | Python 3.11+, DuckDB (via `duckdb` package — same DB as Next.js), pandas, numpy, matplotlib, scipy. No new deps | CONTEXT.md L60-61 |
| Output dir | `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/output/` | CONTEXT.md L47 |

**Locked data path:** `DUCKDB_PATH` env var if set, else default `data/cache/crime.duckdb` (`src/lib/db.ts:15, 88-94`). The default file already exists at 1.1 GB and was materialised with `crimes_sorted` and `crime_dataset_meta` tables by the Next.js pipeline. However: the analysis should treat the DuckDB file as a derived cache — fall back to the source CSV path `data/sources/Crimes_-_2001_to_Present_20260114.csv` (or the smaller `data/source.csv`/`data/crime.parquet`) if the DuckDB file is absent or stale, mirroring `src/lib/db.ts:54-62` fingerprint logic.

## Metric Formulations

### Metric A — Contextual burstiness (z-score)

Let `(h, d)` index a cell where `h ∈ {0..23}` is hour-of-day and `d ∈ {0..6}` is day-of-week (0 = Sunday, matching `src/lib/stats/aggregation.ts:72-79`). The baseline grid has `C = 168` cells.

**Baseline (computed once on the full dataset):**

```
n_c        = number of distinct calendar weeks that hit cell c     (h, d)
mu_c       = mean event count per week for cell c
sigma_c    = population standard deviation of weekly event count for cell c
```

Both `mu_c` and `sigma_c` are stored in a 24 × 7 numpy array.

**Per-window z-score:**

For a window `W = [t_start, t_end)` of duration `Δt` seconds, with `obs` observed events:

```
expected_W = sum over active cells of mu_c  · (Δt_cell / (7 * 24 * 3600))
sigma_W    = sqrt(sum over active cells of sigma_c² · (Δt_cell / (7 * 24 * 3600)))
z_W        = (obs - expected_W) / sigma_W       (approx; see "Per-bin" form below)
```

For a window that aligns exactly with a *single* `(h, d)` cell of duration `binDuration` hours (the natural case for the heatmap figure), CONTEXT.md specifies the **per-bin** form:

```
z = (observed - expected[h, d] · binDuration) / (sigma[h, d] · sqrt(binDuration))
```

This normalises the count to a per-hour rate and the standard deviation to a per-hour rate, giving a dimensionless z-score. For the per-bin heatmap output, each cell `(h, d)` is a single value (the mean / representative z-score across all `(h, d)`-aligned windows), so the `binDuration` factor is uniform and the z-scores are directly comparable across cells.

**Per-window dynamic form (used in the time-series figure):**

For a window that spans **multiple** cells, the linearised form is:

```
mu_rate[h, d]   = mu_c / (7 × 24 × 3600)        per-second rate
sigma_rate[h, d]= sigma_c / (7 × 24 × 3600)     per-second rate

expected_W = sum over (h, d) in W of mu_rate[h, d] · Δt_cell
sigma_W²   = sum over (h, d) in W of sigma_rate[h, d]² · Δt_cell   (assumes independence)
z_W        = (obs - expected_W) / sqrt(sigma_W²)
```

Use the linearised form whenever the window doesn't align with the cell grid (the 1h, 6h, 1d, 1w sweep). For 1d windows, this is the form that makes the comparison fair against Goh-Barabasi (which is also window-relative, not cell-relative).

**Edge cases:**

| Case | Handling |
|---|---|
| Empty window (obs = 0) | Set z = (0 − expected) / sigma. This is a *negative* z-score — a "calmer than expected" reading. Keep it; do not NaN. |
| Sigma = 0 cell (e.g., uniform weekly cell) | Replace with `epsilon = 1e-9` to avoid divide-by-zero. Document the substitution in DECISION-GATE.md. Count these cells and report the count. |
| Sigma extremely small (σ/μ < 0.01) | Mark as low-variance; the z-score is real but the cell is degenerate. Report the count. |
| Window crossing a calendar boundary (e.g., 1d window starting at 23:30) | Sum over both `(h, d)` cells with `Δt_cell` proportional to overlap seconds. |
| Window extending past dataset end (first/last partial windows) | Drop the partial window; report `n_dropped_partial`. |

### Metric B — Goh-Barabasi burstiness (B)

For a window containing N events with timestamps `t_1 ≤ t_2 ≤ … ≤ t_N`:

```
τ_i   = t_{i+1} − t_i    (inter-event intervals, i = 1..N-1)
μ_τ   = mean(τ_i)
σ_τ   = population std(τ_i)
B     = (σ_τ − μ_τ) / (σ_τ + μ_τ)        when σ_τ + μ_τ > 0
```

This is a **direct port** of `src/lib/burst-detection.ts:53-59` to Python:

```python
# Mirrors src/lib/burst-detection.ts:53-59
def goh_barabasi_b(inter_event_gaps: np.ndarray) -> float | None:
    if inter_event_gaps.size < 2:
        return None
    mean = inter_event_gaps.mean()
    if mean <= 0:
        return None
    variance = ((inter_event_gaps - mean) ** 2).mean()
    std = math.sqrt(variance)
    denom = std + mean
    if denom == 0:
        return None
    return float((std - mean) / denom)
```

The function returns `None` (not `NaN`) for degenerate windows so the caller can drop them from the comparison and report the drop count.

**Edge cases:**

| Case | Handling |
|---|---|
| N < 2 events in window | Return `None`; window is excluded from B. Note this. |
| N = 1 event | Return `None`; one event gives 0 gaps. |
| All gaps equal (σ_τ = 0) | Return `−1` (B = (0 − μ)/(0 + μ) = −1). This is the "perfectly regular" limit. |
| Regular (μ_τ ≫ σ_τ) | B → −1 |
| Burst-heavy (σ_τ ≫ μ_τ) | B → +1 |
| Random Poisson (μ_τ ≈ σ_τ) | B → 0 |

**Baseline reference B:** also compute B on the full-dataset IEI (one number) and surface it in DECISION-GATE.md as a sanity check. Expected: ≈ 0.30 at the 1h scale per `docs/FUTURE-WORK-ADAPTIVE-TIME.md:288`.

## Baseline Grid Choice

### Primary: hour × dayOfWeek (168 cells)

**Per-cell sample size.** With 8.5M events over ~25 years × 7 days × 24 hours = 4,200 `(h, d)`-cell-weeks, the average cell has 8.5M / 168 = **~50,500 events** total. The cell with lowest activity (e.g., 4 AM Tuesday in winter) will still have ~5,000–10,000 events, giving σ estimates with relative error ≈ 1/√n ≈ 1–4%. σ estimation is therefore very stable.

**Coverage of burst signatures.** Hour-of-day captures diurnal patterns (crime peaks 6 PM – 2 AM); day-of-week captures weekly patterns (Friday/Saturday spikes). These are the two strongest expected patterns in Chicago crime data and account for the bulk of "expected vs anomalous" variance. The decision to start at 168 cells is well-justified for a first comparison and matches the locked decision in CONTEXT.md.

**Comparison with `src/lib/stats/aggregation.ts:58-94`.** The existing TS aggregators build **marginals** (`aggregateByHour`, `aggregateByDayOfWeek`, `aggregateByMonth`) — separate 24- and 7-cell arrays — but the prototype has no current code that does the **joint** `hour × dayOfWeek` count. The Python implementation will compute the joint grid directly via DuckDB `GROUP BY EXTRACT(HOUR ...), EXTRACT(DOW ...)`.

### Stretch: hour × dayOfWeek × month (2,016 cells)

**Per-cell sample size.** 2,016 cells over 25 years × 12 months = 600 cell-years. Average cell ≈ 4,200 events; lowest-activity cells may drop to 100–500 events. σ relative error rises to 5–10% for the sparsest cells. **Use this only if the 168-cell version does not hit the CBP-05 decision gate** — the contextual CV at 1d needs to be ≥ 2× Goh-Barabasi CV, and a finer baseline absorbs more expected variance, potentially *reducing* the z-score dynamic range. The stretch grid is therefore a high-risk / high-reward fallback, not a primary path.

### Dimension excluded: crime type

Adding `× Primary Type` (≈ 30 distinct types) would push to ~5,000 cells. This is over-fragmented for a baseline intended to capture *expected* patterns. Crime type is more naturally a *filter* than a baseline dimension. Decision: **exclude crime type from the baseline** in both 168-cell and 2,016-cell variants. (Can be revisited in a later phase if contextual CV is too *high* — meaning the baseline is not absorbing enough expected variance.)

### Recommendation

**Start at 168 cells** (the locked primary). If the 1d contextual CV is in the band 0.5–2× of the 1d Goh-Barabasi CV (the "not yet" zone), run the 2,016-cell stretch as Plan 5 fallback. Document the cell-vs-CV sensitivity in DECISION-GATE.md.

## Window Sweep

### Locked window set

`{1h, 6h, 1d, 1w}` — 3600 s, 21600 s, 86400 s, 604800 s. Matches the existing `scripts/burstiness_sweep.py:204-210` window labels and `docs/FUTURE-WORK-ADAPTIVE-TIME.md:286-294` reference table.

### Step size

| Window | Recommended step | Rationale |
|---|---|---|
| 1h | 15 min (900 s) | Standard practice for hourly burst detection; 4× oversample for smoothing. |
| 6h | 30 min (1800 s) | 12× oversample. |
| 1d | 1 h (3600 s) | 24× oversample. |
| 1w | 6 h (21600 s) | 28× oversample. |

These match the `step = window / 4` default in `scripts/burstiness_sweep.py:250-251` for 1h and 6h, with finer sampling for 1d and 1w to keep the per-window sample large. **Alternatively**, use the `step = window / 4` default for all four — it produces 4 windows per step, which is sufficient for stable CV/range statistics and keeps the analysis simpler. The phase-level decision should default to `step = window / 4` unless the planner wants finer sub-daily sampling for the time-series figure.

### Overlap

Use **overlapping sliding windows** (step ≪ window). Non-overlapping windows would under-sample the dataset by a factor of `window / step` and would produce too few windows at 1w to compute a stable CV (only ~25 years × 52 weeks/year ÷ 1 = 1,300 windows). The existing sweep code at `scripts/burstiness_sweep.py:120-127` already uses overlapping sliding windows; the new code should follow the same pattern.

### Boundary handling

- **First partial window** at the start of the dataset (the timestamp of the first event is not exactly the dataset min time): drop and report `n_dropped_partial_start`.
- **Last partial window** at the end of the dataset: same treatment. (If the dataset ends mid-window, that window would have artificially low counts.)
- **The decision-gate threshold applies to the 1d window** specifically, but CV and range are computed for **all four** window sizes. The CV across overlapping windows is not independent — windows share most of their data. This is fine for *relative* comparison (the same shared-data bias applies to both metrics), but the planner should note that absolute CV values are conservative.

### File/CSV path

The raw CSV is 1.0 GB and takes 30-60 s to scan with `read_csv_auto`. **The recommended pattern is to read the DuckDB `crimes_sorted` table directly** (sorted on `Date`, which gives a zone-map skip for date-range filters) per the `ensureSortedCrimesTable()` pattern in `src/lib/db.ts:198-241`. The query should project to the minimum columns needed: `EXTRACT(EPOCH FROM "Date") as ts, EXTRACT(HOUR FROM "Date") as hour, EXTRACT(DOW FROM "Date") as dow, EXTRACT(MONTH FROM "Date") as month, "Primary Type" as type`.

For the per-window **B** computation, the script needs the **timestamps** of events in each window. The most efficient way is to compute B **in DuckDB** for each window using `LIST_SORT` and the B formula in SQL, or to pull a single sorted `np.ndarray` of epoch seconds and compute B in pandas/numpy. Given 8.5M rows and ~10k-1M windows, **pull the sorted timestamp array once** (≈ 70 MB as int64) and compute B in numpy — this is ~10× faster than per-window SQL.

## Comparison Statistics

### Per-window value → per-metric distribution

For each `(metric, window_size)` combination, the script produces a 1D array of per-window values (z for contextual, B for Goh-Barabasi). Drop windows with `None` (B) or sentinel values (z with sigma=0 fallback). Compute:

```
CV   = std(values) / |mean(values)|              (population std, mirroring scripts/burstiness_sweep.py:183)
range = max(values) - min(values)
```

Both numbers are reported for all `(metric, window_size)` cells.

### Required summary table (CBP-04)

The required contrast table at `output/comparison_table.csv` should match the shape of the existing reference at `docs/FUTURE-WORK-ADAPTIVE-TIME.md:286-294`:

| metric | 1h | 6h | 1d | 1w |
|---|---:|---:|---:|---:|
| CV (contextual) | ? | ? | ? | ? |
| CV (Goh-Barabasi) | ? | ? | ? | ? |
| range (contextual) | ? | ? | ? | ? |
| range (Goh-Barabasi) | ? | ? | ? | ? |
| contextual/gb CV ratio | ? | ? | ? | ? |
| contextual/gb range ratio | ? | ? | ? | ? |
| n_valid_windows | ? | ? | ? | ? |
| n_dropped_degenerate | ? | ? | ? | ? |

This is the "raw" comparison. A second derived view highlights the **1d** row (the decision-gate target).

### Decision-gate computation

```
ratio_cv_1d   = CV_contextual[1d] / CV_goh_barabasi[1d]
ratio_range_1d = range_contextual[1d] / range_goh_barabasi[1d]

if ratio_cv_1d >= 2.0 and ratio_range_1d >= 3.0:
    verdict = "go"        # wire contextual metric into prototype in Phase 84
elif ratio_cv_1d >= 1.5 or ratio_range_1d >= 2.0:
    verdict = "not yet — extend baseline dimensions or revisit"
else:
    verdict = "no — fall back to BFT-04..BFT-06 from Phase 84"
```

The thresholds 2× and 3× are conservative. A 2× CV advantage at the 1d scale means the contextual metric's per-window relative variation is double Goh-Barabasi's. A 3× range advantage means its max-to-min swing is triple. Together they guard against: (a) the contextual metric being so noisy that its CV advantage is meaningless, and (b) the contextual metric being so tightly bounded (low range) that it can't actually drive a warp.

### Edge cases for the comparison stats

- **CV of Goh-Barabasi is near zero** (the documented `0.01` at 1d per `docs/FUTURE-WORK-ADAPTIVE-TIME.md:288`). The ratio `contextual / goh_barabasi` will be very large (technically infinite if exactly 0). **Cap the displayed ratio at 99** and report the actual CV in a footnote. The decision gate should check absolute value, not just ratio, in this case.
- **Range of Goh-Barabasi is exactly zero** (all windows give the same B). Same treatment.
- **Negative CVs** are not possible (CV uses |mean|).
- **All-same contextual z-scores** (e.g., a degenerate baseline that gives z ≈ 0 for every window). Report CV = 0 → "no" verdict.

## Python Stack

### DuckDB Python — verified patterns

From Context7 query of `/duckdb/duckdb-python`:

```python
import duckdb

# Read-only connection to the existing DuckDB cache (mirrors src/lib/db.ts:148-189)
with duckdb.connect("data/cache/crime.duckdb", read_only=True) as con:
    # Direct SQL against the materialised crimes_sorted table
    result = con.execute("""
        SELECT
            EXTRACT(EPOCH FROM "Date") AS ts,
            EXTRACT(HOUR FROM "Date")  AS hour,
            EXTRACT(DOW  FROM "Date")  AS dow,
            EXTRACT(MONTH FROM "Date") AS month
        FROM crimes_sorted
        WHERE "Date" IS NOT NULL
          AND "Latitude" IS NOT NULL
          AND "Longitude" IS NOT NULL
    """).fetch_arrow_table()
```

For writing parquet:

```python
import duckdb
df = ...  # pandas DataFrame
duckdb.from_df(df).to_parquet("output/contextual_metric.parquet")
# Or via SQL:
# con.sql("COPY (SELECT * FROM df) TO 'output/contextual_metric.parquet' (FORMAT parquet)")
```

Reference: Context7 snippet `to_parquet()` from `tests/fast/api/test_to_parquet.py`.

**Read-only connection is mandatory** so the analysis script doesn't race with the Next.js dev server's writes. The pattern `duckdb.connect(path, read_only=True)` with `with` block is the verified best practice.

### pandas / numpy — verified patterns

For the per-cell mean/std baseline with explicit column names (Context7 `/pandas-dev/pandas` named aggregation pattern):

```python
import pandas as pd
import numpy as np

# Group by (hour, dow) and aggregate across the full date range
baseline = (
    events.groupby(["hour", "dow"])
    .agg(
        mu=("ts", "count"),                        # placeholder; use weekly-bucketed count
        sigma=("ts", "std"),
        n=("ts", "size"),
    )
)
```

The proper baseline is **weekly bucket means**, not per-event means. A 24×7 cell's `mu_c` is the mean weekly count for that cell, so the groupby is `events.groupby(["week_index", "hour", "dow"]).size().reset_index(name="count")` followed by `.groupby(["hour", "dow"])["count"].agg(["mean", "std"])`. This is the same pattern used in `scripts/compare_density_burstiness_weights.py:128-155` (build_hourly_series) and `scripts/burstiness_sweep.py`.

**Per-window B computation in numpy** (vectorised, ~10× faster than Python loop):

```python
# Given sorted timestamps and a window [start, end)
def windows_b(timestamps: np.ndarray, start: int, end: int, win: int, step: int) -> np.ndarray:
    out = []
    for ws in range(start, end - win + 1, step):
        # bisect for fast slicing
        lo = np.searchsorted(timestamps, ws, side="left")
        hi = np.searchsorted(timestamps, ws + win, side="left")
        if hi - lo < 2:
            continue
        gaps = np.diff(timestamps[lo:hi])
        mu = gaps.mean()
        if mu <= 0:
            continue
        sigma = gaps.std()  # population std by default in numpy
        if sigma + mu == 0:
            continue
        out.append((sigma - mu) / (sigma + mu))
    return np.asarray(out, dtype=float)
```

### matplotlib — verified patterns

For thesis-grade figures, mirror the styling of `scripts/chapter3_visualizations.py:30-84`:

```python
import matplotlib.pyplot as plt
import numpy as np

# Constants (mirror chapter3 style)
BG = "#ffffff"
INK = "#18202a"
SUBTLE = "#687482"
GRID = "#d8e0e8"
BLUE = "#3b6ea8"
ACCENT = "#d9a441"
RED = "#d46c68"
DPI = 320

plt.rcParams.update({
    "figure.facecolor": BG,
    "axes.facecolor": BG,
    "savefig.facecolor": BG,
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.04,
    "font.family": "serif",
    "font.serif": ["DejaVu Serif", "Times New Roman", "Times"],
    "mathtext.fontset": "stix",
    "axes.edgecolor": GRID,
    "axes.labelcolor": INK,
    "xtick.color": SUBTLE,
    "ytick.color": SUBTLE,
    "text.color": INK,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "grid.color": GRID,
    "grid.linewidth": 0.8,
    "grid.alpha": 0.8,
})

# Heatmap: 24 rows (hours) x 7 cols (days)
fig, ax = plt.subplots(figsize=(8.5, 6.4), dpi=DPI)
im = ax.imshow(z_grid, aspect="auto", cmap="RdBu_r", vmin=-3, vmax=3,
               origin="upper", interpolation="nearest")
ax.set_yticks(range(24)); ax.set_yticklabels(range(24))
ax.set_xticks(range(7));   ax.set_xticklabels(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
ax.set_xlabel("Day of week")
ax.set_ylabel("Hour of day (0–23)")
fig.colorbar(im, ax=ax, label="z-score (deviation from baseline)")
fig.savefig("output/figures/z_heatmap.png", dpi=DPI)
plt.close(fig)
```

For the **time-series figure** with contextual z and Goh-Barabasi B on twin axes:

```python
fig, ax_top = plt.subplots(figsize=(11.5, 5.4), dpi=DPI)
ax_bot = ax_top.twinx()
ax_top.plot(times, z_series, color=BLUE, lw=0.8, label="Contextual z")
ax_bot.plot(times, b_series, color=ACCENT, lw=0.8, alpha=0.7, label="Goh-Barabasi B")
ax_top.set_ylabel("Contextual z-score", color=BLUE)
ax_bot.set_ylabel("Goh-Barabasi B", color=ACCENT)
ax_top.set_xlabel("Date")
ax_top.grid(True, color=GRID, lw=0.6)
fig.legend(loc="upper right", frameon=False)
fig.savefig("output/figures/per_window_timeseries.png", dpi=DPI)
plt.close(fig)
```

For the **contrast table** (visual table, not a CSV), use `ax.table` or a manual `ax.imshow` with cell annotations — mirror the existing `weight_sweep_summary.png` style from `scripts/output/density_burstiness_weight_sweep/`.

### scipy

`scipy.stats.zscore` is available but is *not* needed — the per-cell z-score formula is direct and the baseline is already a z-score. `scipy.stats.norm.ppf` may be useful for converting z to a percentile interpretation in the DECISION-GATE.md document, but is optional.

## Reproducibility

### Single-command entry point

Create `run.py` at the phase directory root: `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/run.py`. It should:

1. Parse CLI args (defaults match the locked decisions): `--db-path`, `--output-dir`, `--windows`, `--step-policy`, `--include-stretch-baseline` (boolean).
2. Open DuckDB read-only at `DUCKDB_PATH` env or default.
3. Pull `(ts, hour, dow, month)` to a single pandas DataFrame (or numpy structured array).
4. Compute the 168-cell baseline (mean, std per (hour, dow)).
5. For each window size, compute the contextual z-series and the Goh-Barabasi B-series in vectorised numpy.
6. Write outputs (see "Output artifacts" below).
7. Print the decision-gate verdict and per-metric CV/range summary to stdout.

**Optional `Makefile`** at the phase directory for `make reproduce`:

```makefile
reproduce:
    python run.py --output-dir output
```

The CONTEXT.md specifies `python run.py` OR `make reproduce` — providing both is friendly.

### Determinism

- All inputs come from the same source DuckDB → deterministic.
- DuckDB `ORDER BY` and `LIMIT` use the sorted table → deterministic.
- No use of `np.random` in the metric pipeline → deterministic.
- Matplotlib does not use random colours or jitter in the required figures.
- **However**, the upstream DuckDB file may have a `.wal` file open by the Next.js dev server (`data/cache/crime.duckdb.wal`). Open the Python script in **read-only mode** to avoid `Could not set lock on file` errors. Document this in the script docstring.
- **Floating-point reproducibility across runs**: by default, IEEE-754 is deterministic; no special seeding needed.

### Output artifacts (locked, CONTEXT.md L47-54)

| File | Type | Content | Verification |
|---|---|---|---|
| `output/contextual_metric.parquet` | Parquet | `(window_start, window_end, hour, dow, z)` | Schema: 5 cols, int64 start/end, int8 hour/dow, float64 z |
| `output/goh_barabasi_metric.parquet` | Parquet | `(window_start, window_end, n_events, B)` | Schema: 4 cols |
| `output/comparison_table.csv` | CSV | Long-form CV/range table | Headers: `metric, window_size, n_windows, mean, std, min, max, cv, range` |
| `output/figures/z_heatmap.png` | PNG | 24×7 z-score heatmap | dpi ≥ 300, axis labels in serif font |
| `output/figures/per_window_timeseries.png` | PNG | Twin-axis time series | One panel per window size OR faceted by window size |
| `output/figures/contrast_table.png` | PNG | Visual contrast table (mirrors CSV) | Same colour scheme as heatmap; metrics in rows, window sizes in cols |
| `output/DECISION-GATE.md` | Markdown | Verdict + threshold justification | Must include: per-metric CV/range at 1d, ratio at 1d, and the go/not-yet/no call with reasoning |

### Test discipline (test-driven but lightweight)

This is **analytical Python**, not a TS feature. The plans should not use Vitest. Instead, the verification loop is:

1. **Sanity check 1** — Goh-Barabasi B on the full dataset IEI should be ≈ 0.30 at the 1h scale (matches `docs/FUTURE-WORK-ADAPTIVE-TIME.md:288`). If it diverges, the port is wrong.
2. **Sanity check 2** — Contextual z-score on a synthetic uniform-rate subset should be ≈ 0 across all windows. (Skip in production run; use a quick standalone test or a `--smoke` flag.)
3. **Sanity check 3** — Number of valid 1h windows over 25 years × 365 days × 24 hours ≈ 219,000; CV should be defined for that many points.
4. **Determinism** — running `run.py` twice produces byte-identical `comparison_table.csv`.

A small `tests/test_baseline.py` (pytest) with the sanity checks above is optional but encouraged — it can live in the phase directory.

## Decision-Gate Threshold Rationale

The 2× CV / 3× range thresholds at 1d need to be defended in `DECISION-GATE.md`. Reference points:

1. **Prior baseline** (`docs/FUTURE-WORK-ADAPTIVE-TIME.md:288`): Goh-Barabasi B (IEI) CV at 1d = 0.01 on the **smaller 100k sample**. With 8.5M records, this will be smaller still (more events → tighter distribution per window) — possibly 0.005 or lower. The 2× threshold is therefore *very* easy to clear: the contextual CV doesn't have to be high, it just has to be non-zero. **This is a known weakness of the 2× threshold** — a contextual CV of 0.02 vs Goh-Barabasi CV of 0.01 is technically a 2× ratio but is still essentially "no signal."

2. **Mitigation**: pair the 2× CV rule with a **minimum absolute CV floor** of 0.10 for the contextual metric. If contextual CV at 1d is < 0.10, the verdict should be "not yet" regardless of the ratio. This is a planner-level decision but should be in the DECISION-GATE.md as a secondary criterion.

3. **The 3× range rule is more robust** because it doesn't depend on the denominator being near zero. The 1d window in the prior baseline has B ∈ [−0.1, 0.1] roughly (range ≈ 0.2), so a contextual range ≥ 0.6 is the threshold. With 8.5M records and a 24-cell daily cycle, the contextual range should comfortably exceed this if the baseline absorbs hour-of-day variation correctly.

4. **Connection to the thesis narrative**: the decision gate exists to answer "is this metric worth shipping?" A 2× CV + 3× range advantage is the minimum to claim the new metric *materially* improves on the old — anything less is "nice to have" rather than "thesis-grade."

If the gate fails, the DECISION-GATE.md should propose one of:
- Stretch baseline (hour × dayOfWeek × month) — Plan 5 stretch.
- Different window set (e.g., 12h, 3d) — not locked, but easy to extend.
- Different baseline dimension (e.g., hour × dayOfWeek × isWeekend) — also easy.
- Accept that the metric is not a thesis-grade improvement and fall back to the BFT-04..BFT-06 path in Phase 84 (density-based, not contextual).

## Risks and Unknowns

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Sigma estimation in sparse cells** is unstable. If the 168-cell baseline has any cell with σ = 0 (no variance), z becomes ±∞. | Replace σ = 0 with `ε = 1e-9`; count the replaced cells and report. If > 5% of cells are degenerate, switch to the 2016-cell stretch baseline. |
| 2 | **Boundary effects**: the first and last weeks of the dataset have partial coverage. The 1w window sweep produces only ~1,300 windows, of which the first and last are partial. | Drop partial windows at both ends; report `n_dropped`. |
| 3 | **Goh-Barabasi B in dense windows** is bounded in [−1, 1], so the *range* is at most 2. The contextual z is unbounded, so the range comparison favours z structurally. | This is a feature, not a bug — note it in DECISION-GATE.md. The ratio is therefore a *lower bound* on the contextual advantage. |
| 4 | **8.5M-row CSV scan** is slow (~30-60 s). The DuckDB read is faster (~5-10 s) but still serial. The per-window B computation in numpy is the dominant cost (~2-5 min for the full sweep). | Read timestamps into a single sorted int64 numpy array once; compute all B values in one pass with `np.searchsorted`. Multi-threading via DuckDB `SET threads=N` is already set up. |
| 5 | **DuckDB file lock** with the Next.js dev server. Opening in read-only mode avoids the lock issue but may still see stale data if the dev server is mid-write. | Document the `read_only=True` connection in the script. Add a `try: ... except duckdb.IOException: ...` fallback to CSV. |
| 6 | **Date parsing of the 1.0 GB CSV** in `mm/dd/yyyy hh:mm:ss am/pm` format is the slow path. The DuckDB `crimes_sorted` table has already done this. | Use the DuckDB path as the primary; the CSV fallback should print a warning that the analysis will take 2-3× longer. |
| 7 | **Inter-event-time B is undefined for N < 2 windows**. The 1h window with no events at 4 AM in the 8.5M dataset is essentially impossible (every hour has > 100 events), but the 1h window for the smallest grid cell at the dataset edges might have only 5-20 events → σ/μ estimation noise. | Set a minimum-events floor: drop windows with `n_events < 5` from both metrics (for fairness). |
| 8 | **The contextual z-score is not a "burstiness" measure in the Goh-Barabasi sense** — it measures deviation from a learned baseline, not inter-event time variance. Calling it "burstiness" requires care in the thesis writeup. | DECISION-GATE.md should explicitly contrast the two definitions and explain why the thesis calls the z-score a *burstiness signal* (it flags anomalous concentration) rather than the B-defined burstiness (it flags inter-event time variance). |
| 9 | **The decision gate is an arbitrary ratio (2× / 3×)**. The thesis defense may ask "why not 1.5×?" | Pre-empt in DECISION-GATE.md by citing the prior baseline (`docs/FUTURE-WORK-ADAPTIVE-TIME.md:288`) and explaining that 2× is the minimum to claim a "material" improvement. |
| 10 | **Matplotlib font rendering** on the user's machine may not have "DejaVu Serif" installed. | Fall back to `font.serif: ["Times New Roman", "Times", "serif"]`; document the chain. |
| 11 | **The 2,016-cell stretch baseline may make the CV *worse*** (over-fitting). | Run it as Plan 5 only if the 168-cell version fails the gate. Report the 168-cell and 2,016-cell CV side-by-side in DECISION-GATE.md so the user can see whether the stretch helps or hurts. |

## Recommended Plan Outline

Five plans, each 30-60 min, following the same wave pattern as the existing `scripts/` directory (e.g., `scripts/burstiness_sweep.py` is one self-contained script per concept). All plans create files under `.planning/phases/83-contextual-burstiness-vs-goh-barabasi-comparison/`.

### Plan 83-01: Build contextual baseline (168 cells) and per-bin z-score

**Deliverable:** `scripts/cb_baseline.py` (or `run.py` module section). Computes the 168-cell `mu_c` and `sigma_c` once on the full dataset, writes them to `output/baseline_168.csv` (24 rows × 4 cols: `hour, dow, mu, sigma`), and a unit test or smoke check confirming the data shape.

**Acceptance:** baseline file exists; 168 cells × 4 columns; `mu_c` ranges from ~50 (4 AM Tuesday winter) to ~300 (10 PM Saturday summer) — sanity check against `scripts/chapter3_visualizations.py:128-150` synthetic example.

**Requirements:** CBP-01 (contextual metric definition).

### Plan 83-02: Implement Goh-Barabasi B port and run the full 1h/6h/1d/1w sweep

**Deliverable:** `scripts/cb_goh_barabasi.py` (or `run.py` module section). Direct port of `src/lib/burst-detection.ts:53-59` plus a vectorised window sweep using `np.searchsorted`. Writes `output/goh_barabasi_metric.parquet` and the per-metric CV/range rows of `output/comparison_table.csv`.

**Acceptance:** B on the full dataset IEI matches ≈ 0.30 at the 1h scale (CONTEXT.md reference); `comparison_table.csv` has 4 rows for the Goh-Barabasi metric, one per window size.

**Requirements:** CBP-02 (Goh-Barabasi port), CBP-03 partial (window sweep structure).

### Plan 83-03: Compute contextual z-series and populate comparison table

**Deliverable:** `scripts/cb_contextual.py` (or `run.py` module section). For each window, compute `z_W` using the linearised per-second form. Writes `output/contextual_metric.parquet` and the per-metric CV/range rows of `output/comparison_table.csv`.

**Acceptance:** z on a synthetic uniform-rate subset is ≈ 0; per-window dynamic range is materially higher than Goh-Barabasi at the 1d scale (the actual comparison).

**Requirements:** CBP-03 (comparison), CBP-04 partial (CSV table).

### Plan 83-04: Generate the three thesis-ready figures

**Deliverable:** `scripts/cb_figures.py` (or `run.py` module section). Three PNGs at `output/figures/`:
- `z_heatmap.png` — 24×7 heatmap of the *mean* per-cell z-score across all windows landing in that (h, d) cell. Diverging colormap, vmin/vmax = ±3, colorbar with units.
- `per_window_timeseries.png` — twin-axis line plot at the 1d window size; x-axis = date, y-left = z (contextual), y-right = B (Goh-Barabasi). Light alpha on B for legibility.
- `contrast_table.png` — visual table (rows = metrics, cols = window sizes), with cell values written in the same units as the CSV. Mirrors `scripts/output/density_burstiness_weight_sweep/weight_sweep_summary.png` style.

**Acceptance:** All three PNGs exist; DPI ≥ 300; serif font; no decorative chrome; axis labels are present and unambiguous.

**Requirements:** CBP-04 (figures).

### Plan 83-05: Decision gate, single-run entry point, DECISION-GATE.md

**Deliverable:**
- `run.py` — single-command entry point that calls the modules from Plans 01-04 in order, prints the verdict to stdout, and writes `output/DECISION-GATE.md`.
- `Makefile` — `make reproduce` → `python run.py` (optional but encouraged).
- `output/DECISION-GATE.md` — go / not-yet / no verdict with CV/range numbers, ratio at 1d, and threshold justification. Should pre-empt the "why 2×?" question.

**Acceptance:** `python run.py` reproduces all artifacts in <10 minutes; the printed verdict matches the `DECISION-GATE.md` verdict; running twice produces byte-identical CSV output.

**Requirements:** CBP-05 (decision gate), CBP-06 (handoff to Phase 84).

### Optional Plan 83-06 (stretch): 2,016-cell baseline fallback

Only execute if Plan 83-05 yields a "not yet" verdict. Re-run Plans 01-05 with `baseline = hour × dayOfWeek × month` (2,016 cells). Update `output/comparison_table.csv` to add a 2,016-cell row block and update DECISION-GATE.md with the new verdict.

## Open Questions

The planner should consider asking the user:

1. **Window step size** — should the script use `step = window / 4` (matches existing `scripts/burstiness_sweep.py`) or finer sub-hourly sampling (more windows, slower run, smoother time-series figure)? Default to `window / 4` unless the user wants finer.

2. **Minimum-events floor for B** — drop windows with `n_events < 5` from *both* metrics to keep the comparison fair. Is 5 the right floor? Existing sweep uses 10. Recommend 5 for the 8.5M dataset (events per 1h window average ~100, so floor at 5 is permissive).

3. **Time-series figure: which window size?** — the per-window time series is most readable at 1d (one point per day over 25 years = 9,131 points, fits in a line plot). At 1h it would be ~219k points and require downsampling. Default to 1d for the main figure, with optional small-multiples at the other three sizes.

4. **Stretch baseline trigger threshold** — if 168-cell verdict is "not yet," what is the absolute CV cutoff for switching to 2,016-cell? Recommend: switch if contextual CV at 1d is in [0.5×, 2×] of Goh-Barabasi CV (the "borderline" zone).

5. **Plot styling** — should the figures use the existing `chapter3_visualizations.py` palette (BLUE/ACCENT/RED/TEAL) or a contrasting palette to distinguish from the Chapter 3 figures? Recommend: use the same palette (consistency across thesis figures) but add a per-figure source caption noting the analysis.

6. **DECISION-GATE.md format** — should it be a free-form markdown narrative, a structured table-with-justification, or both? Recommend: both — a short table of numbers (CV, range, ratios) followed by a 2-3 paragraph justification.

7. **CSV vs Parquet for output tables** — CONTEXT.md specifies `.parquet` for per-window values and `.csv` for the comparison table. Both formats are preserved.

8. **Should the script be idempotent across DuckDB updates?** — Yes. The fingerprint pattern from `src/lib/db.ts:54-62` should be mirrored: if the DuckDB file is stale or missing, the script should refuse to run (or fall back to CSV with a warning).

## Sources

### Primary (HIGH confidence)
- `/duckdb/duckdb-python` (Context7) — `duckdb.connect(path, read_only=True)` with `with` block, `duckdb.from_df(df).to_parquet(path)`, `read_csv` patterns
- `/pandas-dev/pandas` (Context7) — named aggregation with `pd.NamedAgg` or `("col", "agg")` tuples; `groupby` + `agg` pipeline
- `/matplotlib/matplotlib` (Context7) — `fig.savefig(path, dpi=N)`, `fig.set_size_inches`, `ScalarMappable` for colorbar
- `src/lib/burst-detection.ts:53-59` — Goh-Barabasi B formula, exact TypeScript port target
- `src/lib/burst-detection.ts:6-21` — type unions for runtime-selectable metrics (pattern for Phase 84 wiring)
- `src/lib/stats/aggregation.ts:58-94` — `aggregateByHour`, `aggregateByDayOfWeek`, `aggregateByMonth` (baseline-building patterns)
- `src/lib/db.ts:15, 88-94` — `DUCKDB_PATH` env, default path resolution
- `src/lib/db.ts:198-241` — `ensureSortedCrimesTable` materialisation pattern
- `docs/FUTURE-WORK-ADAPTIVE-TIME.md:57-83` — original "Contextual Burst Baseline" problem statement
- `docs/FUTURE-WORK-ADAPTIVE-TIME.md:227` — per-window CV collapse problem (the "why" for this phase)
- `docs/FUTURE-WORK-ADAPTIVE-TIME.md:286-294` — baseline table for Goh-Barabasi CV at 1h/6h/1d/1w
- `.planning/ROADMAP.md:146-168` — Phase 83 success criteria (CBP-01..CBP-06)
- `.planning/REQUIREMENTS.md:30-60` — CBP-01..CBP-06 traceability table
- `.planning/STATE.md` — current state, in-progress decisions

### Secondary (MEDIUM confidence)
- `scripts/burstiness_sweep.py:101-115, 120-150` — existing Goh-Barabasi sweep implementation, `step = window / 4` default
- `scripts/burstiness_sweep.py:204-210` — window labels `{3600: '1h', 21600: '6h', 86400: '1d', 604800: '1w'}`
- `scripts/compare_density_burstiness_weights.py:121-155` — `build_hourly_series` chunked CSV read pattern
- `scripts/chapter3_visualizations.py:30-84, 91-92` — matplotlib thesis styling (palette, fonts, DPI 320)
- `data/sources/Crimes_-_2001_to_Present_20260114.csv` header — column names: `Date`, `Primary Type`, `District`, `Latitude`, `Longitude`, `Year`, etc. (22 columns)
- `data/cache/crime.duckdb` — 1.1 GB materialised DuckDB cache with `crimes_sorted`, `crime_dataset_meta`, `crime_overview_bins_medium` tables

### Tertiary (LOW confidence / flagged for validation)
- The exact ratio thresholds (2× CV, 3× range) in the decision gate are user-specified in CONTEXT.md and accepted as given, but the thesis-defense justification for these specific numbers is open. See Open Question #9.
- The "minimum absolute CV floor of 0.10" mitigation in Risks row #11 is a planner-recommended fallback; the user has not explicitly endorsed it.

## Metadata

**Confidence breakdown:**
- Metric formulations: HIGH — direct ports of verified TS code, standard z-score formula
- Baseline grid choice: HIGH — locked by CONTEXT.md, justified by per-cell sample-size analysis
- Window sweep: HIGH — locked by CONTEXT.md, matches existing `scripts/burstiness_sweep.py` patterns
- Comparison statistics: HIGH — CV and range are standard, well-defined statistics
- Python stack: HIGH — DuckDB/pandas/matplotlib patterns verified via Context7
- Reproducibility: HIGH — DuckDB read-only + numpy + matplotlib deterministic pipeline
- Decision-gate thresholds: MEDIUM — user-specified ratios are accepted, but absolute CV floor mitigation is recommended and not user-confirmed
- Risks: HIGH — sigma estimation, boundary effects, DuckDB file lock all identified with mitigations
- Plan outline: HIGH — five plans follow the established `scripts/` directory pattern

**Research date:** 2026-06-27
**Valid until:** 2026-07-27 (30 days; stable analytical methodology, no library version churn expected)
