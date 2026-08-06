"""Apply the locked decision gate to the comparison table.

Verdict logic (per 83-CONTEXT.md + 83-RESEARCH.md L461-463):

  PRIMARY CV test (median, robust to outliers):
    contextual_std_1d >= 2.0 * median(B_cv_1d, density_cv_1d, CV_cv_1d)

  PRIMARY range test (max, since range is the property the
  visualization depends on and we want to dominate on it):
    contextual_range_1d >= 3.0 * max(B_range_1d, density_range_1d, CV_range_1d)

  SECONDARY absolute floor (mitigates near-zero denominator):
    contextual_std_1d >= 0.10

Verdict:
  GO        : both primary tests AND secondary pass
  NOT_YET   : exactly one of (cv primary, range primary) passes
              AND secondary passes
  NO        : secondary fails, OR both primary tests fail

The CV column in the comparison table is std/mean (the conventional
coefficient of variation). For the contextual z-score, mean(z) = 0 by
construction, so CV is undefined; we use std(z) directly as the
"relative variation" measure. This is the only apples-to-apples
comparison because the references' CVs are dimensionless and z's
std is also dimensionless.

Threshold rationale (thesis defense):

  - Median (not max) is used for the CV test because the panel is
    small (n=3) and one reference (density) has CV inflated by
    division by a near-zero mean. Median is the standard robust
    estimator in this setting (breakdown point 50% vs 0% for mean;
    see Huber 1981, Rousseeuw & Leroy 1987).
  - Max is used for the range test because range is the property
    the warp visualization actually depends on, and we want
    contextual to dominate every alternative on that property.
  - The 0.10 absolute floor ensures the contextual std is large
    enough to be substantively meaningful, not just non-zero.
"""

from __future__ import annotations

import argparse
import statistics
import sys
from pathlib import Path

import numpy as np
import pandas as pd


# ── Locked thresholds (per 83-CONTEXT.md) ─────────────────────────

PRIMARY_CV_RATIO = 2.0  # contextual CV must be >= 2x median reference CV
PRIMARY_RANGE_RATIO = 3.0  # contextual range must be >= 3x max reference range
SECONDARY_ABSOLUTE_FLOOR = 0.10  # contextual CV must be >= 0.10

# References used in the gate (B, density, CV — the contextual metric
# itself is excluded). The CV column is std/mean for the references and
# std directly for the contextual row (since its mean is zero).
REFERENCE_METRICS: tuple[str, ...] = ("B", "density", "CV")
CONTEXTUAL_METRIC: str = "contextual"

# Window size the gate is applied at. The 1d window is the canonical
# comparison point per 83-CONTEXT.md.
GATE_WINDOW_LABEL: str = "1d"


def _row_for_metric_and_window(
    table: pd.DataFrame, metric: str, window_label: str
) -> pd.Series:
    matches = table[
        (table["metric"] == metric) & (table["window_label"] == window_label)
    ]
    if matches.empty:
        raise ValueError(
            f"comparison table missing ({metric}, {window_label}); "
            f"got metrics={table['metric'].unique().tolist()}"
        )
    return matches.iloc[0]


def evaluate_gate(table: pd.DataFrame) -> dict:
    """Return a dict with all gate inputs, intermediates, and verdict.

    Returns
    -------
    dict with keys:
        contextual_std, contextual_range
        b_cv, density_cv, cv_metric_cv
        reference_cv_median, reference_range_max
        cv_ratio, range_ratio
        cv_pass, range_pass, secondary_pass
        verdict  : "go" | "not_yet" | "no"
        rationale: short human-readable summary
    """
    ctx = _row_for_metric_and_window(table, CONTEXTUAL_METRIC, GATE_WINDOW_LABEL)
    b = _row_for_metric_and_window(table, "B", GATE_WINDOW_LABEL)
    den = _row_for_metric_and_window(table, "density", GATE_WINDOW_LABEL)
    cv_row = _row_for_metric_and_window(table, "CV", GATE_WINDOW_LABEL)

    # For the contextual z-score, mean ≈ 0 by construction (the
    # baseline is a conditional rate, so the expected value of z under
    # the null is zero), so the ``cv`` column (= std/|mean|) is
    # meaningless. We use std directly as the relative-variation
    # measure. This keeps the comparison dimensionless across all
    # four metrics: std(z) and CV(B), CV(density), CV(CV) are all
    # scale-free.
    contextual_std = float(ctx["std"])
    contextual_range = float(ctx["range"])

    b_cv = float(b["cv"])
    density_cv = float(den["cv"])
    cv_metric_cv = float(cv_row["cv"])

    reference_cv_median = statistics.median([b_cv, density_cv, cv_metric_cv])
    reference_range_max = max(
        float(b["range"]), float(den["range"]), float(cv_row["range"])
    )

    cv_ratio = (
        contextual_std / reference_cv_median if reference_cv_median > 0 else float("inf")
    )
    range_ratio = (
        contextual_range / reference_range_max if reference_range_max > 0 else float("inf")
    )

    cv_pass = bool(cv_ratio >= PRIMARY_CV_RATIO)
    range_pass = bool(range_ratio >= PRIMARY_RANGE_RATIO)
    secondary_pass = bool(contextual_std >= SECONDARY_ABSOLUTE_FLOOR)

    # Verdict:
    #   GO     : cv_pass AND range_pass AND secondary_pass
    #   NOT_YET: secondary_pass AND exactly one of (cv, range) passes
    #   NO     : secondary fails, or both cv and range fail
    if not secondary_pass:
        verdict = "no"
    elif cv_pass and range_pass:
        verdict = "go"
    elif cv_pass or range_pass:
        verdict = "not_yet"
    else:
        verdict = "no"

    rationale = (
        f"contextual std={contextual_std:.4f} vs median reference CV="
        f"{reference_cv_median:.4f}  → ratio {cv_ratio:.2f}x "
        f"({'PASS' if cv_pass else 'FAIL'} need {PRIMARY_CV_RATIO}x). "
        f"contextual range={contextual_range:.4f} vs max reference range="
        f"{reference_range_max:.4f}  → ratio {range_ratio:.2f}x "
        f"({'PASS' if range_pass else 'FAIL'} need {PRIMARY_RANGE_RATIO}x). "
        f"absolute floor {contextual_std:.4f} "
        f"({'PASS' if secondary_pass else 'FAIL'} need "
        f">= {SECONDARY_ABSOLUTE_FLOOR})."
    )

    return {
        "contextual_std": contextual_std,
        "contextual_range": contextual_range,
        "b_cv": b_cv,
        "density_cv": density_cv,
        "cv_metric_cv": cv_metric_cv,
        "reference_cv_median": reference_cv_median,
        "reference_range_max": reference_range_max,
        "cv_ratio": cv_ratio,
        "range_ratio": range_ratio,
        "cv_pass": cv_pass,
        "range_pass": range_pass,
        "secondary_pass": secondary_pass,
        "verdict": verdict,
        "rationale": rationale,
    }


def render_decision_gate_md(
    table: pd.DataFrame,
    gate: dict,
    n_events: int,
    output_path: Path,
) -> None:
    """Write the DECISION-GATE.md artifact with verdict and rationale."""
    verdict = gate["verdict"].upper()
    verdict_label = {
        "GO": "GO",
        "NOT_YET": "NOT YET",
        "NO": "NO",
    }.get(gate["verdict"], gate["verdict"])

    # Next-step mapping per CONTEXT.md / CBP-06
    next_step = {
        "go": (
            "Phase 84 (Burstiness Signal Contract + Density Fallback) is "
            "unblocked. Replace Goh-Barabasi B as the default burstiness "
            "driver in `src/lib/burst-detection.ts` with the contextual "
            "z-score; the 168-cell baseline becomes a module-level "
            "dependency. Run Phase 84 to integrate."
        ),
        "not_yet": (
            "Phase 84 is deferred. Keep Goh-Barabasi B as the default "
            "burstiness driver. The contextual z finding is documented "
            "in this decision gate as future work; revisit once the "
            "primary CV ratio can be made to clear 2x without the "
            "absolute-floor fallback (e.g., by adding more reference "
            "metrics whose CVs are not inflated by tiny means)."
        ),
        "no": (
            "Phase 84 is closed. The contextual z-score does not "
            "outperform the reference metrics enough to displace "
            "Goh-Barabasi as the burstiness driver. The 4-way "
            "comparison should be published as-is in the thesis "
            "(Chapter on burstiness metrics) as evidence that the "
            "existing approach is reasonable."
        ),
    }[gate["verdict"]]

    # Per-metric 1d summary table
    oned = table[table["window_label"] == "1d"].copy()
    oned_rows = []
    for _, row in oned.iterrows():
        oned_rows.append(
            f"| {row['metric']} | {int(row['n_windows']):,} | "
            f"{float(row['mean']):+.4f} | {float(row['std']):.4f} | "
            f"{float(row['cv']):.4f} | {float(row['range']):.4f} |"
        )
    oned_table = "\n".join(oned_rows)

    content = f"""# Decision Gate — Contextual Burstiness vs Reference Metrics

**Verdict: {verdict_label}**

Date: 2026-06-27
Dataset: {n_events:,} Chicago crime events (2001-2026)
Window: {GATE_WINDOW_LABEL} (24 h)

## Gate inputs (1d windows)

| metric | n_windows | mean | std | cv | range |
|---|---|---|---|---|---|
{oned_table}

## Gate evaluation

| Test | Value | Threshold | Result |
|---|---|---|---|
| CV ratio (contextual / median reference) | {gate['cv_ratio']:.2f}x | >= {PRIMARY_CV_RATIO}x | {"PASS" if gate['cv_pass'] else "FAIL"} |
| Range ratio (contextual / max reference) | {gate['range_ratio']:.2f}x | >= {PRIMARY_RANGE_RATIO}x | {"PASS" if gate['range_pass'] else "FAIL"} |
| Absolute floor (contextual std) | {gate['contextual_std']:.4f} | >= {SECONDARY_ABSOLUTE_FLOOR} | {"PASS" if gate['secondary_pass'] else "FAIL"} |

## Rationale

{gate['rationale']}

## Threshold justification

- **Median (not max) for the CV test** because the reference panel is
  small (n=3) and one reference (density) has CV inflated by division
  by a near-zero mean. Median is the standard robust estimator for
  small panels (breakdown point 50%; mean has 0%). Sources: Huber
  (1981) "Robust Statistics"; Rousseeuw & Leroy (1987) "Robust
  Regression and Outlier Detection"; Maronna et al. (2019) "Robust
  Statistics: Theory and Methods".
- **Max (not median) for the range test** because range is the
  property the warp visualization actually depends on, and we want
  contextual to dominate every alternative on that property.
- **Absolute floor 0.10** mitigates the near-zero-denominator false
  positive: a CV of 0.001 is technically "above zero" but not
  substantively meaningful. The floor ensures the contextual signal
  is large enough to matter.
- **For the contextual z-score, std is used directly as the relative
  variation measure** because mean(z) = 0 by construction (the
  baseline is a conditional rate, so the expected value of z under
  the null is zero). The CV column in the comparison table is
  std/mean, which is undefined for z; substituting std keeps the
  comparison dimensionless across all four metrics.

## Next steps (CBP-06)

{next_step}
"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content)
    print(f"Wrote decision gate to {output_path}")


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument(
        "--comparison-csv",
        type=Path,
        default=Path("output/comparison_table.csv"),
        help="Path to the 16-row comparison CSV produced by compare.py.",
    )
    ap.add_argument(
        "--output",
        type=Path,
        default=Path("output/DECISION-GATE.md"),
        help="Where to write the DECISION-GATE.md artifact.",
    )
    ap.add_argument(
        "--n-events",
        type=int,
        default=8_382_486,
        help="Number of events in the dataset (for the report header).",
    )
    return ap.parse_args()


def main() -> int:
    args = parse_args()
    table = pd.read_csv(args.comparison_csv)
    gate = evaluate_gate(table)
    render_decision_gate_md(table, gate, args.n_events, args.output)
    print()
    print(f"VERDICT: {gate['verdict'].upper()}")
    print(gate["rationale"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
