# Phase 81: Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries, and replacing CSV-heavy overview scans with pre-aggregated or columnar reads - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 81-Reduce dashboard memory pressure by separating overview/detail loading, shrinking hot-path queries, and replacing CSV-heavy overview scans with pre-aggregated or columnar reads
**Areas discussed:** Overview payload, Detail load trigger, Range query policy, Storage strategy

---

## Overview payload

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-binned counts | Canonical overview payload optimized for startup and direct rendering. | ✓ |
| Sampled timestamps | Return sampled timestamps and let the client re-bin them. | |
| Both | Carry both shapes in parallel. | |
| You decide | Let the agent choose. | |

**User's choice:** `You decide`, then locked to `Pre-binned counts`
**Notes:** Overview should be filter-aware, sourced from a DuckDB aggregated table, and use a fixed medium default resolution.

---

## Detail load trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Brush or zoom intent | First full detail load happens only after explicit narrowing interaction. | ✓ |
| Tab/view entry | Load detail as soon as a detail-oriented view opens. | |
| Explicit button | Require a direct user action to fetch detail. | |
| Hybrid trigger | Combine multiple triggers. | |

**User's choice:** `Brush or zoom intent`
**Notes:** Before detail loads, detail-heavy surfaces should show a summary-backed preview. The first detail fetch should target a narrowed working window, retained with a replaceable window cache.

---

## Range query policy

| Option | Description | Selected |
|--------|-------------|----------|
| Tight default | Use a narrower default detail window around the user's focus. | ✓ |
| Adaptive window | Scale the window automatically with zoom or brushed duration. | |
| Keep 30 days | Preserve the current broad default. | |

**User's choice:** `Tight default`
**Notes:** The user emphasized that detail needs full precision, especially for slices. That ruled out sampled overflow and led to progressive paging, removal of exact hot-path counts, prompting users to narrow overly broad queries, and prioritizing the visible slice first when paging.

---

## Storage strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Persisted DuckDB tables | Use DuckDB-managed persisted structures as the canonical analytical source. | ✓ |
| Parquet files | Query Parquet directly as the primary analytical source. | |
| Hybrid tables plus Parquet | Use a mixed persisted strategy. | |
| Keep CSV source | Continue serving hot paths from CSV-driven queries. | |

**User's choice:** `Persisted DuckDB tables`
**Notes:** The user chose one-time build with reuse, a materialized aggregate table for overview bins, a precomputed metadata table for `/api/crime/meta`, and one-time CSV ingest into DuckDB tables for hot paths.

---

## the agent's Discretion

- Overview shape was initially delegated with `You decide`; it was locked to pre-binned counts.

## Deferred Ideas

- Parquet-backed or hybrid columnar migration remains a future optimization path but is not required to satisfy Phase 81.
