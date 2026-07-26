export const ADAPTIVE_BIN_COUNT = 1024;
export const ADAPTIVE_KERNEL_WIDTH = 3; // Smoothing kernel width in bins
// Density-based temporal scaling: the active code path (adaptive-warp-utils.ts)
// uses pure density. This constant controls the density/burstiness blend in
// adaptiveTime.worker.ts, which is used by useAdaptiveStore for ablation studies.
// Set to 0 for pure density (matches thesis), 1 for pure burstiness.
export const ADAPTIVE_BURST_INFLUENCE = 0;
