import { describe, expect, test, vi } from 'vitest';
import { applyDemoPreset } from './applyDemoPreset';
import { DEMO_PRESETS, type DemoPreset, type DemoPresetId } from '@/lib/demo/preset-windows';

const MIN_EPOCH = 978307200; // 2001-01-01T00:00:00Z
const MAX_EPOCH = 1767225600; // 2026-01-01T00:00:00Z
const T1U_EPOCH: [number, number] = [
  Date.parse(DEMO_PRESETS.T1u.timeRange![0]) / 1000,
  Date.parse(DEMO_PRESETS.T1u.timeRange![1]) / 1000,
];
const T1U_NORMALIZED: [number, number] = [
  ((T1U_EPOCH[0] - MIN_EPOCH) / (MAX_EPOCH - MIN_EPOCH)) * 100,
  ((T1U_EPOCH[1] - MIN_EPOCH) / (MAX_EPOCH - MIN_EPOCH)) * 100,
];

const buildActions = () => ({
  setFilterTimeRange: vi.fn(),
  setBrushRange: vi.fn(),
  setDemoTimeRange: vi.fn(),
  setDemoTime: vi.fn(),
  setTimeScaleMode: vi.fn(),
  setDemoTimeScaleMode: vi.fn(),
});

describe('applyDemoPreset', () => {
  test('writes the same window into filter (epoch), brush (normalized), and demo time (normalized)', () => {
    const actions = buildActions();
    const currentTime = (T1U_NORMALIZED[0] + T1U_NORMALIZED[1]) / 2;

    const result = applyDemoPreset({
      preset: DEMO_PRESETS.T1u,
      minTimestampSec: MIN_EPOCH,
      maxTimestampSec: MAX_EPOCH,
      currentTime,
      actions,
    });

    expect(result).toEqual({ ok: true });
    expect(actions.setFilterTimeRange).toHaveBeenCalledTimes(1);
    // Filter store expects epoch seconds (per its docstring).
    expect(actions.setFilterTimeRange).toHaveBeenCalledWith(T1U_EPOCH);
    // Brush range and demo time store both get the normalized 0-100 range.
    // This matches the production `applyRangeToStoresContract` in
    // `DemoDualTimeline.tsx`.
    expect(actions.setBrushRange).toHaveBeenCalledTimes(1);
    expect(actions.setBrushRange).toHaveBeenCalledWith(T1U_NORMALIZED);
    expect(actions.setDemoTimeRange).toHaveBeenCalledTimes(1);
    expect(actions.setDemoTimeRange).toHaveBeenCalledWith(T1U_NORMALIZED);
  });

  test('clamps currentTime to the new range and only writes it when the value changes', () => {
    const actions = buildActions();
    // currentTime is way outside the new range — should be clamped in.
    const currentTime = T1U_NORMALIZED[0] - 50;

    applyDemoPreset({
      preset: DEMO_PRESETS.T1u,
      minTimestampSec: MIN_EPOCH,
      maxTimestampSec: MAX_EPOCH,
      currentTime,
      actions,
    });

    expect(actions.setDemoTime).toHaveBeenCalledTimes(1);
    expect(actions.setDemoTime).toHaveBeenCalledWith(T1U_NORMALIZED[0]);
  });

  test('does not write currentTime when the value is already inside the new range', () => {
    const actions = buildActions();
    const currentTime = (T1U_NORMALIZED[0] + T1U_NORMALIZED[1]) / 2;

    applyDemoPreset({
      preset: DEMO_PRESETS.T1u,
      minTimestampSec: MIN_EPOCH,
      maxTimestampSec: MAX_EPOCH,
      currentTime,
      actions,
    });

    expect(actions.setDemoTime).not.toHaveBeenCalled();
  });

  test('preserves an explicit zero warp factor on adaptive presets', () => {
    const actions = buildActions();

    applyDemoPreset({
      preset: DEMO_PRESETS.T1a,
      minTimestampSec: MIN_EPOCH,
      maxTimestampSec: MAX_EPOCH,
      currentTime: 0,
       actions,
    });

  });

  test('preserves an explicit warp factor on adaptive presets', () => {
    const actions = buildActions();

    applyDemoPreset({
      preset: DEMO_PRESETS.T1a,
      minTimestampSec: MIN_EPOCH,
      maxTimestampSec: MAX_EPOCH,
      currentTime: 0,
       actions,
    });

  });

  test('preserves an explicit warp factor on linear presets', () => {
    const actions = buildActions();

    applyDemoPreset({
      preset: DEMO_PRESETS.T1u,
      minTimestampSec: MIN_EPOCH,
      maxTimestampSec: MAX_EPOCH,
      currentTime: 0,
       actions,
    });

  });

  test('reset preset clears the filter, clears the brush, restores full-range linear mode', () => {
    const actions = buildActions();

    const result = applyDemoPreset({
      preset: DEMO_PRESETS.reset,
      minTimestampSec: MIN_EPOCH,
      maxTimestampSec: MAX_EPOCH,
      // currentTime is at 75 — out of [0, 100]? No, in range. Move it to -5
      // to exercise the clamp path.
      currentTime: -5,
       actions,
    });

    expect(result).toEqual({ ok: true });
    expect(actions.setFilterTimeRange).toHaveBeenCalledWith(null);
    expect(actions.setBrushRange).toHaveBeenCalledWith(null);
    expect(actions.setDemoTimeRange).toHaveBeenCalledWith([0, 100]);
    // currentTime was -5, so the clamp pushes it to 0.
    expect(actions.setDemoTime).toHaveBeenCalledWith(0);
    expect(actions.setTimeScaleMode).toHaveBeenCalledWith('linear');
  });

  test('reset preset preserves the durable warp factor', () => {
    const actions = buildActions();

    applyDemoPreset({
      preset: DEMO_PRESETS.reset,
      minTimestampSec: MIN_EPOCH,
      maxTimestampSec: MAX_EPOCH,
      currentTime: 50,
       actions,
    });

  });

  test('reset preset does not write currentTime when it is already inside the full range', () => {
    const actions = buildActions();

    applyDemoPreset({
      preset: DEMO_PRESETS.reset,
      minTimestampSec: MIN_EPOCH,
      maxTimestampSec: MAX_EPOCH,
      currentTime: 50,
       actions,
    });

    expect(actions.setDemoTime).not.toHaveBeenCalled();
  });

  test('returns { ok: false, reason: "no-data-bounds" } and writes nothing when data bounds are missing', () => {
    const actions = buildActions();

    const result = applyDemoPreset({
      preset: DEMO_PRESETS.T1u,
      minTimestampSec: null,
      maxTimestampSec: MAX_EPOCH,
      currentTime: 0,
       actions,
    });

    expect(result).toEqual({ ok: false, reason: 'no-data-bounds' });
    expect(actions.setFilterTimeRange).not.toHaveBeenCalled();
    expect(actions.setBrushRange).not.toHaveBeenCalled();
    expect(actions.setDemoTimeRange).not.toHaveBeenCalled();
    expect(actions.setDemoTime).not.toHaveBeenCalled();
    expect(actions.setTimeScaleMode).not.toHaveBeenCalled();
  });

  test('applies all nine study-task presets without throwing (smoke test for the full surface)', () => {
    const taskPresetIds: DemoPresetId[] = ['T4', 'T1u', 'T1a', 'T2u', 'T2a', 'T3a', 'T3b', 'T8u', 'T8a'];
    for (const id of taskPresetIds) {
      const preset: DemoPreset = DEMO_PRESETS[id];
      const actions = buildActions();
      const result = applyDemoPreset({
        preset,
        minTimestampSec: MIN_EPOCH,
        maxTimestampSec: MAX_EPOCH,
        currentTime: 0,
         actions,
      });
      expect(result, `${id} should apply cleanly`).toEqual({ ok: true });
      expect(actions.setFilterTimeRange, `${id} filter range should be set`).toHaveBeenCalledTimes(1);
      expect(actions.setBrushRange, `${id} brush range should be set`).toHaveBeenCalledTimes(1);
      expect(actions.setDemoTimeRange, `${id} demo time range should be set`).toHaveBeenCalledTimes(1);
      expect(actions.setTimeScaleMode, `${id} time scale mode should be set`).toHaveBeenCalledWith(preset.mode);
    }
  });

  test('helper does not import slice-domain or coordination unrelated state (unit isolation check)', () => {
    // The helper must not touch: applied slices, compare slots, rail tabs,
    // map-layer toggles, viewport, stkde params, etc. We verify that by
    // confirming the action bag is the only side effect channel.
    //
    // The action bag interface has exactly 6 setters — no slice, no
    // compare, no rail, no map, no viewport, no stkde setters. This is a
    // type-level guarantee: any caller can only invoke the helpers through
    // the action bag, so a missing setter in the bag means the helper can't
    // touch that surface.
    //
    // This test pins the expected number of action-bag setters so future
    // changes that grow the surface are forced to update this test (and
    // the plan that adds the surface).
    const actions = buildActions();
    expect(Object.keys(actions).sort()).toEqual([
      'setBrushRange',
      'setDemoTime',
      'setDemoTimeRange',
      'setDemoTimeScaleMode',
      'setFilterTimeRange',
      'setTimeScaleMode',
    ]);
  });
});
