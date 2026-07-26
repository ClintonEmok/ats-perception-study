# Phase 87 — Context

**Phase:** 87 — Burst Volume Foundation
**Milestone:** v1.0 Burst Volume Analytical Model
**Status:** Ready for planning

## Goal (from ROADMAP Phase 1)

Derive a shared `BurstVolumeModel` from the existing burst windows, STKDE output, and adaptive warp state. Phase 1 must make each burst a single analytical object with start, peak, end, duration, event count, and adaptive height, plus multiple internal temporal samples carrying centroid and spread data.

## Locked decisions

- The timeline stays the control layer. Phase 1 does not change how the adaptive timeline allocates time or how slice creation is triggered.
- The burst-volume model is derived, not source-of-truth. It should be computed from the existing coordination/STKDE inputs so later rendering and inspection can consume one shared artifact.
- Existing burst/STKDE analysis should be reused. The repo already has `buildHotspotEvolution` in `src/lib/hotspot-evolution.ts` and `buildBurstEvolutionModel` in `src/lib/stkde/burst-evolution.ts`; Phase 1 should follow the same pure-model style.
- Cluster correspondence and behavior metrics are out of Phase 1 scope. Those are reserved for Phase 3.

## Current code map

| Path | Role |
|------|------|
| `src/components/viz/TimeSlices.tsx` | Current orchestration point for slices, STKDE overlays, and cluster analysis. This phase should not add burst-volume rendering here. |
| `src/components/viz/MainScene.tsx` | Composes the 3D scene and receives the current slice-related state. Future phases will consume the burst-volume model here. |
| `src/lib/stkde/contracts.ts` | `StkdeResponse` / `StkdeSurfaceResponse` contracts, including `sliceResults` and hotspot fields needed for burst sampling. |
| `src/lib/hotspot-evolution.ts` | Existing pure model for tracking hotspot motion across slices; the implementation style is a good template. |
| `src/lib/stkde/burst-evolution.ts` | Existing burst evolution model with slice nodes and connector segments; another template for a pure derived model. |
| `src/store/useDashboardDemoCoordinationStore.ts` | Owns `selectedBurstWindows` and `stkdeResponse`, which are the likely live inputs for the burst-volume builder. |
| `src/components/viz/BurstEvolutionOverlay.tsx` | Existing consumer of burst evolution model output; later phases can mirror this pattern for burst volumes. |

## Phase 1 success criteria

1. Each burst can be represented as one `BurstVolumeModel` with start, peak, end, duration, event count, and adaptive height.
2. Each burst model carries multiple temporal samples with centroid and spread evolution derived from existing burst windows and STKDE data.
3. The model can be computed from current app state without changing the timeline control layer or cube rendering.

## Scope fence

In scope:
- Model types for burst volumes and samples
- A pure builder that derives the model from burst windows and STKDE slice data
- A memoized live accessor or hook for the derived model
- Tests that lock the model contract and derived sample behavior

Out of scope:
- Burst-volume rendering in the cube
- Cluster correspondence across samples
- Burst-behavior metrics beyond basic model fields
- Any map/timeline redesign
