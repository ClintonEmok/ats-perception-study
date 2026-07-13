import { beforeEach, describe, expect, test } from 'vitest';
import { STKDE_PARAM_LIMITS, useStkdeStore } from './useStkdeStore';

beforeEach(() => {
  useStkdeStore.setState({
    scopeMode: 'applied-slices',
    params: {
      spatialBandwidthMeters: 750,
      temporalBandwidthHours: 24,
      gridCellMeters: 500,
      topK: 12,
      minSupport: 5,
      timeWindowHours: 24,
    },
    runStatus: 'idle',
    staleReason: null,
    isStale: false,
    errorMessage: null,
    response: null,
    lastRunAt: null,
    runMeta: null,
    selectedHotspotId: null,
    hoveredHotspotId: null,
    spatialFilter: null,
    temporalFilter: null,
  });
});

describe('useStkdeStore', () => {
  test('exposes Phase 65 defaults for scope and params', () => {
    const state = useStkdeStore.getState();
    expect(state.scopeMode).toBe('applied-slices');
    expect(state.params).toEqual({
      spatialBandwidthMeters: 750,
      temporalBandwidthHours: 24,
      gridCellMeters: 500,
      topK: 12,
      minSupport: 5,
      timeWindowHours: 24,
    });
    expect(state.runStatus).toBe('idle');
    expect(state.isStale).toBe(false);
  });

  test('tracks run lifecycle transitions through success and cancellation', () => {
    const store = useStkdeStore.getState();

    store.startRun();
    expect(useStkdeStore.getState().runStatus).toBe('running');

    store.finishRunSuccess({
      meta: {
        eventCount: 10,
        computeMs: 20,
        truncated: false,
        requestedComputeMode: 'sampled',
        effectiveComputeMode: 'sampled',
        fallbackApplied: null,
        clampsApplied: [],
      },
      heatmap: {
        cells: [],
        maxIntensity: 0,
      },
      hotspots: [],
      contracts: {
        scoreVersion: 'stkde-v1',
      },
      sliceResults: {},
    });

    expect(useStkdeStore.getState().runStatus).toBe('success');
    expect(useStkdeStore.getState().runMeta?.requestedComputeMode).toBe('sampled');

    store.finishRunCancelled();
    expect(useStkdeStore.getState().runStatus).toBe('cancelled');
  });

  test('supports stale-state transition after prior successful run', () => {
    const store = useStkdeStore.getState();

    store.finishRunSuccess({
      meta: {
        eventCount: 20,
        computeMs: 31,
        truncated: false,
        requestedComputeMode: 'sampled',
        effectiveComputeMode: 'sampled',
        fallbackApplied: null,
        clampsApplied: [],
      },
      heatmap: {
        cells: [],
        maxIntensity: 0,
      },
      hotspots: [],
      contracts: {
        scoreVersion: 'stkde-v1',
      },
      sliceResults: {},
    });

    store.markStale('applied-slices-updated');

    expect(useStkdeStore.getState().runStatus).toBe('success');
    expect(useStkdeStore.getState().isStale).toBe(true);
    expect(useStkdeStore.getState().staleReason).toBe('applied-slices-updated');
    expect(useStkdeStore.getState().response).not.toBeNull();
  });

  test('clamps params to supported bounds and ignores invalid numeric input', () => {
    const store = useStkdeStore.getState();

    store.setParams({
      spatialBandwidthMeters: -100,
      temporalBandwidthHours: 999,
      gridCellMeters: Number.NaN,
      topK: 0,
      minSupport: -5,
      timeWindowHours: 0,
    });

    const params = useStkdeStore.getState().params;
    expect(params.spatialBandwidthMeters).toBe(STKDE_PARAM_LIMITS.spatialBandwidthMeters.min);
    expect(params.temporalBandwidthHours).toBe(STKDE_PARAM_LIMITS.temporalBandwidthHours.max);
    expect(params.gridCellMeters).toBe(500);
    expect(params.topK).toBe(STKDE_PARAM_LIMITS.topK.min);
    expect(params.minSupport).toBe(STKDE_PARAM_LIMITS.minSupport.min);
    expect(params.timeWindowHours).toBe(STKDE_PARAM_LIMITS.timeWindowHours.min);
  });

  test('floors non-integer numeric params after clamping', () => {
    const store = useStkdeStore.getState();

    store.setParams({
      spatialBandwidthMeters: 305.9,
      temporalBandwidthHours: 12.7,
    });

    const params = useStkdeStore.getState().params;
    expect(params.spatialBandwidthMeters).toBe(305);
    expect(params.temporalBandwidthHours).toBe(12);
  });
});
