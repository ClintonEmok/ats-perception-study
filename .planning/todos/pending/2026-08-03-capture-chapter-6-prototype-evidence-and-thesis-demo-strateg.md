---
created: 2026-08-03T10:59:21.551Z
title: Capture Chapter 6 prototype evidence and thesis demo strategy
area: docs
severity: major
files:
  - LaTeX_tuemscthesis2021/chapters/06_visual_design_and_interaction/6.2_prototype_in_practice.tex
  - LaTeX_tuemscthesis2021/chapters/06_visual_design_and_interaction/6.3_requirement_confirmation.tex
  - LaTeX_tuemscthesis2021/chapters/06_visual_design_and_interaction/6.4_tradeoffs.tex
  - LaTeX_tuemscthesis2021/chapters/07_evaluation/7.3_results.tex
  - src/workers/adaptiveTime.worker.ts
  - src/components/viz/DataPoints.tsx
  - src/components/timeline/DualTimeline.tsx
  - src/app/stkde-3d/page.tsx
---

## Problem

Chapter 6 (Verification) has 5 PLACEHOLDER figures that must be filled before thesis submission. Chapter 7 (Evaluation) has 3 PLACEHOLDER tables. The thesis explicitly states: "The workspace does not contain the prototype artifacts needed to confirm that the implementation realizes these properties" (6.5). Without these artifacts, the thesis cannot claim design verification.

Additionally, the demo strategy needs to be grounded in what the thesis actually argues — density-only allocation with M=5, not burstiness-based allocation.

## Solution

### Phase 1: Chapter 6 Prototype Evidence (blocking)

Capture 5 artifacts from the working prototype:

1. **Interface Overview** (6.2, lines 28-39): Full workspace screenshot showing timeline, map, cube, controls. Label all five regions.

2. **Verification Setup** (6.2, lines 41-54): Document exact parameters — dataset window, bin count T, multiplier M=5, density-only mode, selected interval, cube scope.

3. **Single-Interval Walkthrough** (6.2, lines 71-100): 3 screenshots from same state:
   - Overview: full timeline with selected interval
   - Spatial inspection: map showing geographic distribution
   - Cube inspection: stacked density surfaces

4. **Comparison Walkthrough** (6.2, lines 108-115): 2 intervals compared — show persistence, intensification, or spatial shift.

5. **Implementation Trace**: Show code uses Ch5 density-only rule — `burstInfluence=0` in `adaptiveTime.worker.ts:68-70`.

### Phase 2: Demo Strategy (non-blocking)

The "money shot" for the thesis defense:

1. **Linear→Adaptive transition**: Show cube with `warpFactor=0` then `warpFactor=1`. Dense years expand, sparse compress. This proves R1 (visibility of dense intervals).

2. **Context preservation argument**: Contrast "zoom to July 1-7" (loses year context) vs "adaptive time on full year" (burst expanded, baseline compressed, both visible). This is the core R5a contribution.

3. **Cube IS STKDE slices**: Each horizontal surface is a spatial density surface. Temporal allocation gives more vertical space → more slices visible in dense periods → finer spatial evolution inspection.

### Key Constraints from Thesis

- Ch6.4: "The allocation signal is density only" — cannot claim burstiness-based allocation
- Ch8.1: "RQ2 and RQ3 therefore remain unanswered empirically" — no empirical superiority claims
- Ch5.5: One surface per bin with fixed T — adaptive time changes POSITION not COUNT
- The contribution is a "design result with a defined empirical next step, not a claim of universal improvement"

## Acceptance Criteria

- [ ] 5 Chapter 6 PLACEHOLDER figures replaced with actual prototype screenshots
- [ ] Verification setup parameters documented and consistent across all walkthrough figures
- [ ] Implementation trace shows burstInfluence=0 (density-only)
- [ ] Demo strategy documented (linear→adaptive transition, context preservation)
- [ ] Thesis defense demo plan written
