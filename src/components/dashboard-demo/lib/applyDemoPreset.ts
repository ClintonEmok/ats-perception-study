/**
 * Helper for applying a `DemoPreset` to the dashboard-demo store surface.
 *
 * The `DemoPresetSelect` dropdown used to only write the coordination store's
 * `brushRange` + `timeScaleMode`. That left the filter store, the demo time
 * store, and the map / 3D views out of sync. This helper centralises the
 * "preset is a time-window shortcut" contract:
 *
 *   1. Update `useDashboardDemoFilterStore.setTimeRange(...)` with the
 *      epoch-second range (canonical unit for the demo filter store).
 *   2. Update `useDashboardDemoCoordinationStore.setBrushRange(...)` with the
 *      normalized 0-100 range.
 *   3. Update `useDashboardDemoTimeStore.setRange(...)` with the normalized
 *      0-100 range — matches the production contract used by
 *      `applyRangeToStoresContract` in `DemoDualTimeline.tsx`, where
 *      `setTimeRange` (filter) gets epoch seconds and `setRange` (time) gets
 *      the normalized range. `currentTime` is clamped to the new range and
 *      only re-written when the clamped value actually differs.
 *   4. Update `useDashboardDemoCoordinationStore.setTimeScaleMode(preset.mode)`.
 *   5. Preserve an explicit `0` warp factor; entering adaptive mode does not
 *      silently override the user's no-warp setting.
 *
 * The helper is a pure function — no React, no zustand. The caller wires the
 * action bag to the demo store setters. This makes the sync contract
 * testable in isolation and matches the action-bag style already used by
 * `applyRangeToStoresContract` and `applyBrushSelectionToRange`.
 */
import { presetToNormalizedRange, type DemoPreset } from '@/lib/demo/preset-windows';
import { clamp } from '@/lib/math';

export type DemoWarpScaleMode = 'linear' | 'adaptive';

export interface ApplyDemoPresetActions {
  /** `useDashboardDemoFilterStore.setTimeRange` — epoch seconds, or null to clear. */
  setFilterTimeRange: (range: [number, number] | null) => void;
  /** `useDashboardDemoCoordinationStore.setBrushRange` — normalized 0-100, or null. */
  setBrushRange: (range: [number, number] | null) => void;
  /** `useDashboardDemoTimeStore.setRange` — normalized 0-100. */
  setDemoTimeRange: (range: [number, number]) => void;
  /** `useDashboardDemoTimeStore.setTime` — clamped to the current demo time range. */
  setDemoTime: (time: number) => void;
  /** `useDashboardDemoCoordinationStore.setTimeScaleMode`. */
  setTimeScaleMode: (mode: DemoWarpScaleMode) => void;
  /** `useDashboardDemoTimeStore.setTimeScaleMode`. */
  setDemoTimeScaleMode: (mode: DemoWarpScaleMode) => void;
}

export interface ApplyDemoPresetParams {
  /** The preset being applied. */
  preset: DemoPreset;
  /** Min data timestamp (epoch seconds) from `useTimelineDataStore`. May be null while data is loading. */
  minTimestampSec: number | null;
  /** Max data timestamp (epoch seconds) from `useTimelineDataStore`. May be null while data is loading. */
  maxTimestampSec: number | null;
  /** The current `currentTime` from `useDashboardDemoTimeStore`. The helper only re-writes it when the clamped value differs. */
  currentTime: number;
  /** The demo store setters the helper should call. */
  actions: ApplyDemoPresetActions;
}

export type ApplyDemoPresetResult =
  | { ok: true }
  /** Helper could not compute a normalized range from the data bounds or ISO dates — caller should surface the error. */
  | { ok: false; reason: 'no-data-bounds' | 'unparseable-dates' };

/**
 * Apply a `DemoPreset` to the dashboard-demo stores. Pure function.
 *
 * Returns `{ ok: true }` on success (including the reset preset path) and
 * `{ ok: false, reason }` when the helper could not compute a valid range
 * from the data bounds or ISO date strings — the caller should surface the
 * error via a toast and not call any of the action setters.
 */
export const applyDemoPreset = ({
  preset,
  minTimestampSec,
  maxTimestampSec,
  currentTime,
  actions,
}: ApplyDemoPresetParams): ApplyDemoPresetResult => {
  if (preset.timeRange === null) {
    // Reset preset — clear filter + brush, restore full-range linear mode.
    // Time store's `timeRange` resets to [0, 100] (its canonical normalized
    // full-range value) and `currentTime` is clamped into that range.
    actions.setFilterTimeRange(null);
    actions.setBrushRange(null);
    actions.setDemoTimeRange([0, 100]);
    const clampedCurrent = clamp(currentTime, 0, 100);
    if (clampedCurrent !== currentTime) {
      actions.setDemoTime(clampedCurrent);
    }
    actions.setTimeScaleMode('linear');
    actions.setDemoTimeScaleMode('linear');
    return { ok: true };
  }

  // Non-reset preset — compute both epoch-second and normalized ranges.
  const [startIso, endIso] = preset.timeRange;
  const startEpoch = Date.parse(startIso) / 1000;
  const endEpoch = Date.parse(endIso) / 1000;
  if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch)) {
    return { ok: false, reason: 'unparseable-dates' };
  }

  const normalizedRange = presetToNormalizedRange(preset, minTimestampSec, maxTimestampSec);
  if (normalizedRange === null) {
    return { ok: false, reason: 'no-data-bounds' };
  }

  // Filter store — epoch seconds (canonical unit per the store's docstring).
  actions.setFilterTimeRange([startEpoch, endEpoch]);
  // Coordination store and demo time store — normalized 0-100. The
  // `applyRangeToStoresContract` in `DemoDualTimeline.tsx` writes the same
  // normalized range to both, so the contract here mirrors production.
  actions.setBrushRange(normalizedRange);
  actions.setDemoTimeRange(normalizedRange);

  const clampedCurrent = clamp(currentTime, normalizedRange[0], normalizedRange[1]);
  if (clampedCurrent !== currentTime) {
    actions.setDemoTime(clampedCurrent);
  }

  actions.setTimeScaleMode(preset.mode);
  actions.setDemoTimeScaleMode(preset.mode);

  return { ok: true };
};
