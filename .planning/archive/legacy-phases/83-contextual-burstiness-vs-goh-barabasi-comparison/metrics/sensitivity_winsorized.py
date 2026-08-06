"""Phase 84 pre-flight sensitivity check.

Re-runs the contextual z computation with the per-cell mu and sigma
winsorized at the 5/95 percentiles (the 168-cell shortcut per
84-RESEARCH.md Q3 #3 — the full 1,305-week per-cell distribution is not
stored in the baseline). Verifies that the winsorized z's CV (== std,
since mean(z) = 0 by construction) at 1d is within 30% of the
standard z's CV at 1d.

Decision rule (per 84-CONTEXT.md L34 and 84-03 PLAN Task 1):

  - Standard z CV at 1d  = std(z) at 1d windows
  - Winsorized z CV at 1d = std(z_w) at 1d windows
  - ratio = cv_winsorized / cv_standard
  - PASS  if 0.70 <= ratio <= 1.30 (within 30% of standard)
  - FAIL  if ratio < 0.50 (>50% drop, falls back to standard z)

Exits non-zero on FAIL. Writes the verdict + key numbers to
`output/winsorized_sensitivity.md` (always — the verdict line is the
audit trail regardless of pass/fail).

Data sources (avoiding the DuckDB lock held by the Next.js dev server):

  - Standard z: `output/contextual_metric.parquet` (Phase 83 Plan 05
    output; 1,061,646 rows; 36,537 at 1d window)
  - Per-cell baseline: `output/baseline_168.csv` (Phase 83 Plan 02
    output; 168 rows with mean_per_sec, sigma_per_sec)
  - 1d window start/end epochs: derived from the parquet's
    `window_start` / `window_end` columns (same as the Phase 83
    pipeline's)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Allow running from the phase root OR from the metrics/ subdir.
_PHASE_ROOT = Path(__file__).resolve().parent.parent
if str(_PHASE_ROOT) not in sys.path:
    sys.path.insert(0, str(_PHASE_ROOT))
if str(_PHASE_ROOT / "metrics") not in sys.path:
    sys.path.insert(0, str(_PHASE_ROOT / "metrics"))

from metrics.contextual import (  # noqa: E402
    EPSILON,
    SECONDS_PER_HOUR,
    SECONDS_PER_DAY,
)

DEFAULT_OUTPUT_DIR = Path("output")
DEFAULT_BASELINE_CSV = Path("output/baseline_168.csv")
DEFAULT_CONTEXTUAL_PARQUET = Path("output/contextual_metric.parquet")

# Sensitivity thresholds per 84-CONTEXT.md L34
RATIO_LOWER = 0.70   # ratio must be >= 0.70 (within 30% of standard)
RATIO_UPPER = 1.30   # ratio must be <= 1.30 (within 30% of standard)
RATIO_FLOOR = 0.50   # below this is a hard FAIL (>50% drop → fall back)

# Winsorization percentile (per 84-CONTEXT.md §2)
WINSOR_LOWER_PCT = 5.0
WINSOR_UPPER_PCT = 95.0

# Canonical 1d window step (matches Phase 83: step = window_sec // 4 = 21600s)
WINDOW_SEC_1D = 86_400
STEP_SEC_1D = 21_600


# ── Winsorization (cross-language anchor: numpy.percentile 'linear'
#    matches d3-array.quantile R-7 for N >= 5) ──────────────────────


def winsorize_array(
    values: np.ndarray,
    lower_pct: float,
    upper_pct: float,
) -> np.ndarray:
    """Clip `values` to [lower_pct, upper_pct] percentiles.

    Uses `numpy.percentile(method='linear')` which is mathematically
    equivalent to `d3.quantile` (R-7 / type-7 linear interpolation)
    for N >= 5. This is the cross-language parity anchor for the TS
    `winsorize` helper in `src/lib/signal-sources/winsorize.ts`.
    """
    lo = float(np.percentile(values, lower_pct, method="linear"))
    hi = float(np.percentile(values, upper_pct, method="linear"))
    return np.clip(values, lo, hi)


# ── Winsorized baseline (168-cell shortcut) ────────────────────────


def compute_baseline_winsorized_from_csv(
    baseline_csv: Path,
) -> pd.DataFrame:
    """Read the 168-cell baseline CSV and add 5/95-winsorized
    `mu_w` / `sig_w` columns.

    Per 84-RESEARCH.md Q3 #3, the 1,305-week per-cell distribution is
    not stored, so this is the shippable shortcut. The full 1,305-week
    path is documented as deferred in the thesis note Section 5.
    """
    baseline = pd.read_csv(baseline_csv)
    expected_cols = {"hour", "dow", "count", "mean_per_sec", "sigma_per_sec"}
    missing = expected_cols - set(baseline.columns)
    if missing:
        raise ValueError(
            f"baseline CSV missing columns: {sorted(missing)}; "
            f"got {list(baseline.columns)}"
        )
    baseline = baseline.copy()
    baseline["mu_w"] = winsorize_array(
        baseline["mean_per_sec"].to_numpy(dtype=np.float64),
        WINSOR_LOWER_PCT,
        WINSOR_UPPER_PCT,
    )
    baseline["sig_w"] = winsorize_array(
        baseline["sigma_per_sec"].to_numpy(dtype=np.float64),
        WINSOR_LOWER_PCT,
        WINSOR_UPPER_PCT,
    )
    return baseline


# ── Winsorized z (recompute from windows + winsorized baseline) ─────


def _build_lookup_winsorized(
    baseline_w: pd.DataFrame,
) -> tuple[np.ndarray, np.ndarray]:
    """Return (mu_w_168, sig_w_168) arrays indexed by hour*7 + dow."""
    mu_w_168 = np.zeros(24 * 7, dtype=np.float64)
    sig_w_168 = np.zeros(24 * 7, dtype=np.float64)
    for _, row in baseline_w.iterrows():
        idx = int(row["hour"]) * 7 + int(row["dow"])
        mu_w_168[idx] = float(row["mu_w"])
        sig_w_168[idx] = float(row["sig_w"])
    return mu_w_168, sig_w_168


def recompute_z_winsorized_for_windows(
    window_starts: np.ndarray,
    n_events_per_window: np.ndarray,
    baseline_w: pd.DataFrame,
) -> np.ndarray:
    """Recompute z values for the given window start times using the
    winsorized per-cell mu/sig.

    This matches the Phase 83 `compute_contextual_z_series` formula
    (L172-181 of `metrics/contextual.py`) but substitutes the
    winsorized mu for the raw per-cell mean. Returns a 1D float64
    array of z values, one per window.
    """
    mu_w_168, _sig_w_168 = _build_lookup_winsorized(baseline_w)

    h0 = ((window_starts // SECONDS_PER_HOUR) % 24).astype(np.int64)
    d0 = ((window_starts // SECONDS_PER_DAY + 4) % 7).astype(np.int64)
    n_cells_in_window = WINDOW_SEC_1D // SECONDS_PER_HOUR  # 24 for 1d

    mu_per_window = np.zeros(len(window_starts), dtype=np.float64)
    for offset in range(n_cells_in_window):
        h = (h0 + offset) % 24
        d = (d0 + (h0 + offset) // 24) % 7
        cell_idx = h * 7 + d
        mu_per_window += mu_w_168[cell_idx] * SECONDS_PER_HOUR

    mu_safe = np.maximum(mu_per_window, EPSILON)
    z_arr = (n_events_per_window.astype(np.float64) - mu_per_window) / np.sqrt(mu_safe)
    return z_arr


# ── Verdict computation ────────────────────────────────────────────


def evaluate_sensitivity(
    z_standard: np.ndarray,
    z_winsorized: np.ndarray,
) -> dict:
    """Compute the CV (== std for zero-centered z) ratio + verdict."""
    cv_standard = float(np.std(z_standard, ddof=0))
    cv_winsorized = float(np.std(z_winsorized, ddof=0))
    ratio = cv_winsorized / max(cv_standard, 1e-9)

    # Per 84-CONTEXT.md L34 + 84-03 PLAN Task 1: PASS if winsorized CV
    # is within 30% of standard z CV (i.e. ratio in [0.70, 1.30]).
    passed = RATIO_LOWER <= ratio <= RATIO_UPPER
    # Hard floor: ratio < 0.50 (>50% drop) is a structural collapse,
    # falls back to standard z per the 84-03 PLAN's decision rule.
    hard_fail = ratio < RATIO_FLOOR

    verdict = "PASS" if passed and not hard_fail else "FAIL"
    return {
        "cv_standard": cv_standard,
        "cv_winsorized": cv_winsorized,
        "ratio": ratio,
        "passed": passed,
        "hard_fail": hard_fail,
        "verdict": verdict,
        "n_standard": int(z_standard.size),
        "n_winsorized": int(z_winsorized.size),
    }


# ── Output writer (output/winsorized_sensitivity.md) ───────────────


def render_sensitivity_md(
    result: dict,
    n_events: int,
    output_path: Path,
) -> None:
    verdict = result["verdict"]
    next_step = (
        "Ship winsorized z in the TypeScript contextual mapper. "
        "The contextualWarpWeight function in `src/lib/signal-sources/contextual.ts` "
        "should use the winsorized 168-cell baseline (computed via "
        "`computeWinsorizedBaseline`) for the per-cell mu/sig lookup."
        if verdict == "PASS"
        else (
            "Fall back to standard z (non-winsorized) in the production "
            "TypeScript contextual mapper. Document the sensitivity in "
            "`docs/CONTEXTUAL_BURSTINESS_VS_GOH_BARABASI_THESIS_NOTE.md` Section 5. "
            "The `winsorize.ts` helper is still shipped (useful utility) but "
            "the production formula uses raw mu/sig."
        )
    )
    content = f"""# Winsorized z Sensitivity Check

**Verdict: {verdict}**

Date: 2026-06-27
Dataset: {n_events:,} Chicago crime events
Window: 1d (24h)
Step: {STEP_SEC_1D}s ({STEP_SEC_1D // 3600}h, i.e. window_sec // 4)

## Inputs

| Metric | n_windows | std (= CV, mean(z) = 0) |
|---|---|---|
| Standard z | {result['n_standard']:,} | {result['cv_standard']:.4f} |
| Winsorized z | {result['n_winsorized']:,} | {result['cv_winsorized']:.4f} |

## Sensitivity

| Test | Value | Threshold | Result |
|---|---|---|---|
| CV ratio (winsorized / standard) | {result['ratio']:.4f}x | >= {RATIO_LOWER:.2f}x (within 30%) | {"PASS" if result['passed'] else "FAIL"} |
| Hard floor (ratio < 0.50 = >50% drop) | {result['ratio']:.4f}x | >= {RATIO_FLOOR:.2f}x | {"FAIL" if result['hard_fail'] else "PASS"} |

## Verdict

**{verdict}** — winsorized z CV is {"within 30% of" if result['passed'] else "NOT within 30% of"} standard z CV at 1d.

## Next steps

{next_step}

## Notes

- The 1,305-week per-cell distribution is not stored in `baseline_168.parquet`.
  Winsorization is applied to the 168 per-cell means and sigmas (the shippable
  shortcut per 84-RESEARCH.md Q3 #3). The 1,305-week path is documented as
  deferred in thesis note Section 5.
- The winsorization percentile uses `numpy.percentile(method='linear')` which is
  mathematically equivalent to `d3.quantile` (R-7 / type-7 linear interpolation)
  for N >= 5. The cross-language parity test in
  `src/lib/signal-sources/winsorize.test.ts` confirms this within 1e-6.
- Sensitivity threshold: ratio must be >= 0.70 (within 30% of standard z) for
  the winsorized form to ship as the production choice. Below 0.50 (>50% drop)
  is a hard FAIL and the standard z is used.
- Standard z values are read from `output/contextual_metric.parquet` (the Phase
  83 Plan 05 output). Winsorized z values are recomputed in-process using the
  same window start times and n_events.
"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content)
    print(f"Wrote sensitivity report to {output_path}")


# ── Main entry point ───────────────────────────────────────────────


def main() -> int:
    print("=== Winsorized z Sensitivity Check (1d) ===")

    baseline_csv = DEFAULT_BASELINE_CSV
    contextual_parquet = DEFAULT_CONTEXTUAL_PARQUET

    if not baseline_csv.exists():
        print(f"ERROR: {baseline_csv} not found.")
        print("Run `python run.py` first to generate the baseline + metric parquets.")
        return 1
    if not contextual_parquet.exists():
        print(f"ERROR: {contextual_parquet} not found.")
        print("Run `python run.py` first to generate the metric parquets.")
        return 1

    print(f"Reading baseline from {baseline_csv} ...")
    baseline_w = compute_baseline_winsorized_from_csv(baseline_csv)
    n_clipped_mu = int((baseline_w["mu_w"] != baseline_w["mean_per_sec"]).sum())
    n_clipped_sig = int((baseline_w["sig_w"] != baseline_w["sigma_per_sec"]).sum())
    print(f"  168-cell baseline loaded; cells with mu clipped: "
          f"{n_clipped_mu}/168, cells with sig clipped: {n_clipped_sig}/168")
    if n_clipped_mu == 0 and n_clipped_sig == 0:
        print("  (no clipping at 5/95 — baseline is naturally well-distributed)")

    print(f"Reading standard z values from {contextual_parquet} ...")
    full_df = pd.read_parquet(contextual_parquet)
    z_1d_df = full_df[full_df["window_sec"] == WINDOW_SEC_1D].copy()
    z_1d_df = z_1d_df.sort_values("window_start").reset_index(drop=True)
    z_standard = z_1d_df["z"].to_numpy(dtype=np.float64)
    window_starts = z_1d_df["window_start"].to_numpy(dtype=np.int64)
    n_events_per_window = z_1d_df["n_events"].to_numpy(dtype=np.int32)
    # Use the baseline's per-cell counts to compute total dataset size —
    # the parquet's `n_events` is per-window so summing over overlapping
    # windows double-counts events.
    n_events = int(baseline_w["count"].sum())
    print(f"  standard z: {z_standard.size:,} 1d windows")

    print("Computing winsorized z values for the same 1d windows ...")
    z_winsorized = recompute_z_winsorized_for_windows(
        window_starts, n_events_per_window, baseline_w
    )
    print(f"  winsorized z: {z_winsorized.size:,} 1d windows")

    print("Evaluating sensitivity ...")
    result = evaluate_sensitivity(z_standard, z_winsorized)

    print()
    print(f"Standard z CV:    {result['cv_standard']:.4f}")
    print(f"Winsorized z CV:  {result['cv_winsorized']:.4f}")
    print(f"CV ratio:         {result['ratio']:.4f}x")
    print(f"Verdict:          {result['verdict']} (within 30% of standard z)")

    output_path = DEFAULT_OUTPUT_DIR / "winsorized_sensitivity.md"
    render_sensitivity_md(result, n_events, output_path)

    if result["verdict"] == "FAIL":
        print(
            "WARNING: Winsorized z CV collapsed; fall back to standard z "
            "and document in thesis note Section 5."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
