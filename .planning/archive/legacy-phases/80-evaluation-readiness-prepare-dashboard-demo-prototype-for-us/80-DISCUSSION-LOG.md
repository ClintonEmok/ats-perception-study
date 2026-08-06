# Phase 80: Evaluation Readiness — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 80-evaluation-readiness
**Areas discussed:** Evaluation page strategy, Condition visibility, In-app forms, Task cards + phase flow, Session data

---

## Evaluation Page Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated `/evaluation` route | New page wrapping DashboardDemoShell, no changes to demo | ✓ |
| Overlay mode on `/dashboard-demo` | Query param toggles evaluation chrome on existing shell | |
| Your call | Defer to agent | |

**User's choice:** Your call → resolved to dedicated `/evaluation` route for clean separation and zero regression risk to the demo.

| Option | Description | Selected |
|--------|-------------|----------|
| Integrate into evaluation header | Persistent header bar with session state, phase, timer | ✓ |
| Keep floating button, add header | Two separate surfaces | |

**User's choice:** Integrate into evaluation header.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, hide non-essential tabs | Only Overview, Detect, Slices (read-only), Inspect | |
| No, keep everything accessible | All tabs, participants discover features | |
| Keep tabs but disable editing | All visible, but editing is disabled | ✓ |

**User's choice:** Keep tabs but disable editing.

---

## Condition Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Prominent header badge + subtle color | Large badge + background tint | |
| Header badge only, no color shift | Clean badge, no distraction | ✓ |

**User's choice:** "you decide, the whole point is derivability not just showing the answer" → researcher-facing subtle badge only. Participant derives mode from visualization behavior, not a label.

| Option | Description | Selected |
|--------|-------------|----------|
| Researcher-only toggle | Hidden from participant entirely | |
| Toggle visible but unlabeled | Participant sees control but isn't told what it does | ✓ |

**User's choice:** Toggle visible but unlabeled. Participant can discover and interact organically.

| Option | Description | Selected |
|--------|-------------|----------|
| Animate the transition | Slices glide between uniform and adaptive spacing | |
| Instant switch | Snap to new positions | ✓ |

**User's choice:** Instant switch. Participants compare end-states, not transitions.

---

## In-App Forms

| Option | Description | Selected |
|--------|-------------|----------|
| In-app forms | React components for NASA-RTLX + Likert | |
| Paper forms only | EVALUATION_FORMS.md as printed sheets | |
| Hybrid: in-app forms, paper backup | Both | ✓ |

**User's choice:** Hybrid — in-app forms with paper backup.

| Option | Description | Selected |
|--------|-------------|----------|
| After each condition block (per protocol) | Forms appear twice (post-A, post-B) | ✓ |
| Only at end of session | Single form covering both conditions | |

**User's choice:** After each condition block, per EVALUATION_PROTOCOL.md Phase 4.

| Option | Description | Selected |
|--------|-------------|----------|
| Append to existing study log JSONL | Reuse current logger | |
| Separate forms export endpoint | New API route | |
| "the existing study session can be completely rebuilt" | Open to full redesign | ✓ |

**User's choice:** Full redesign of study logging system is acceptable.

---

## Task Cards + Phase Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Floating task card + confidence prompt | Corner overlay + in-app 1-5 slider | ✓ |
| Side panel task list | Collapsible panel with all tasks | |

**User's choice:** "YOU DECIDE" → resolved to floating task card for minimal screen footprint.

**User's choice (thesis reference):** Tasks reduced from 8 to 4 per thesis: T1 (Peak Activity), T2 (Burst Detection), T3 (Compare Periods), T4 (Most Active Region).

| Option | Description | Selected |
|--------|-------------|----------|
| Researcher-controlled phase stepper | Buttons to advance through 7 phases | ✓ |
| Auto-timed phases | Preset timers per phase | |

**User's choice:** Researcher-controlled phase stepper — flexibility trumps automation for n=5 study.

| Option | Description | Selected |
|--------|-------------|----------|
| Update OnboardingTour for eval context | driver.js step-by-step training | ✓ |
| Researcher-led training script | Verbal walkthrough with printed script | |

**User's choice:** "you decide" → resolved to updated OnboardingTour for consistency across participants.

---

## Session Data

| Option | Description | Selected |
|--------|-------------|----------|
| Condition changes + warp adjustments | Targeted behavioral logging | ✓ |
| Full interaction trace | All camera, selection, brush events | |
| Task-level only | Just outcomes, no behavioral trace | |

**User's choice:** "you deciDE" → resolved to condition + warp logging for RQ-relevant analysis without noise.

| Option | Description | Selected |
|--------|-------------|----------|
| Per-session JSON download | One file per participant, manual management | |
| Append to cumulative JSONL | All sessions in one file | |
| "we could save it to the database" | DuckDB storage | ✓ |

**User's choice:** DuckDB-backed storage for queryable thesis analysis.

| Option | Description | Selected |
|--------|-------------|----------|
| Flat trials table | Single table per trial, 40 rows total | ✓ |
| Normalized schema | Separate tables for sessions, trials, forms, events | |

**User's choice:** Flat trials table — practical for 5 participants.

---

## the agent's Discretion

- `/evaluation` route over overlay mode (cleaner separation, no regression risk)
- Floating task card over side panel (minimal screen footprint)
- Updated OnboardingTour over researcher-led training (consistency across sessions)
- Condition + warp logging over full interaction trace (enough for RQ analysis without noise)
- Researcher-facing badge, participant-derives-condition design
