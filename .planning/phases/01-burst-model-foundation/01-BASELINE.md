# Phase 1 Baseline: Burst Model Foundation

**Status:** Complete, verified against the implementation baseline

The shared burst model and deterministic builder exist in `src/lib/stkde/burst-volume.ts`, are exported from `src/lib/stkde/index.ts`, and are consumed by `src/hooks/useBurstVolumeModel.ts`.

Verification:

- `src/lib/stkde/burst-volume.test.ts` passes.
- `src/hooks/useBurstVolumeModel.test.ts` passes.
- The model includes burst timing, duration, event count, adaptive height, samples, centroid path, and spatial footprint.
