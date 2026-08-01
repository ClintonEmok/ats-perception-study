# Phase 4: STKDE-3D A/B Comparison - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-01
**Phase:** 4-STKDE-3D A/B Comparison
**Areas discussed:** selection lifecycle, reproducible presets, camera relinking, difference encoding, pending todo scope

---

## Selection lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Reset then reselect | Lock A/B once complete and provide an explicit reset action. | ✓ |
| Click to replace | Clicking a new surface replaces the currently active slot. | |
| A/B slot buttons | Explicitly activate A or B before selecting a surface. | |

**User's choice:** Reset then reselect.
**Notes:** Completed comparisons remain stable until the user explicitly resets them.

---

## Reproducible presets

| Option | Description | Selected |
|--------|-------------|----------|
| Exact A/B pairs | Each preset ships with concrete A and B rendered-slice ranges ready to compare. | ✓ |
| Date windows only | Presets load case-study windows and leave A/B selection to the user. | |
| Generic demo pairs | Use reusable baseline-versus-peak pairs independent of named case studies. | |

**User's choice:** Exact A/B pairs.
**Notes:** Presets must resolve explicit, distinct rendered surfaces and preserve their metadata.

---

## Camera relinking

| Option | Description | Selected |
|--------|-------------|----------|
| Snap B to A | Treat A as the reference and immediately align B to A's current pose. | ✓ |
| Snap A to B | Treat B as the reference and immediately align A to B's current pose. | |
| Preserve both | Keep current poses and synchronize only future movement. | |

**User's choice:** Snap B to A.
**Notes:** Linking remains enabled by default; re-linking makes B match A before future synchronized movement.

---

## Difference encoding

| Option | Description | Selected |
|--------|-------------|----------|
| Existing KDE palette | Reuse the current sequential absolute heatmap colors. | |
| Red-neutral-blue | Use red for positive A-B, neutral at zero, and blue for negative A-B. | ✓ |
| Cool-warm diverging | Use a teal-to-cream-to-orange signed palette. | |

**User's choice:** Red-neutral-blue after clarification.
**Notes:** The existing KDE palette remains for absolute views. Difference mode needs a directional diverging scale centered at zero.

---

## Pending todo scope

| Option | Description | Selected |
|--------|-------------|----------|
| Defer both | Keep burst-threshold calibration and dashboard adaptive-time showcasing outside Phase 4. | ✓ |
| Fold showcase todo | Add dashboard adaptive-time showcasing to this phase. | |
| Fold threshold todo | Add data-driven burst cutoff work to this phase. | |
| Fold both todos | Expand Phase 4 to cover both unrelated concerns. | |

**User's choice:** Defer both.
**Notes:** Neither todo changes the standalone `/stkde-3d` A/B comparison contract.

---

## the agent's Discretion

- Exact component/module split.
- Camera pose representation and synchronization mechanism.
- Concrete color values and legend treatment within the selected red-neutral-blue semantic mapping.
- Initial concrete A/B slice indices for built-in presets, provided they are explicit and reproducible.

## Deferred Ideas

- Data-driven burst threshold calibration — separate burst-generation task.
- Dashboard-demo adaptive-time showcasing — separate dashboard UI task.
