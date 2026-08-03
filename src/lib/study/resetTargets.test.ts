// @vitest-environment node
import { beforeEach, describe, expect, test, vi, afterEach } from 'vitest';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import {
  RESET_TARGETS,
  executeResetChecklist,
  isResetSuccessful,
  summarizeResetOutcomes,
  type ResetOutcome,
} from './resetTargets';

const createMemoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(key) ? map.get(key) ?? null : null),
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, String(value));
    },
  };
};

const LOCAL_STORAGE_KEYS_TO_SEED = [
  'study-storage',
  'slice-domain-v1',
  'dashboard-demo-map-layer-store-v1',
  'dashboard-demo-filter-presets',
  'hasSeenTour',
];

const SESSION_STORAGE_KEYS_TO_SEED = [
  'evaluation-study-v1',
];

describe('resetTargets: checklist shape', () => {
  test('covers every named participant-visible persisted target', () => {
    const ids = RESET_TARGETS.map((target) => target.id);
    // Locked by Phase 80 context: every target must be enumerated.
    expect(ids).toEqual(
      expect.arrayContaining([
        'evaluation-study-v1',
        'study-storage',
        'slice-domain-v1',
        'dashboard-demo-map-layer-store-v1',
        'dashboard-demo-filter-presets',
        'hasSeenTour',
        'coordination-store-reset-warp',
        'coordination-store-reset-analysis',
        'coordination-store-reset-temporal',
        'coordination-store-reset-volume',
        'coordination-store-set-rail-tab',
        'coordination-store-set-active-slice',
      ]),
    );
    // No duplicates.
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('storage-backed targets declare the right kind and key', () => {
    for (const target of RESET_TARGETS) {
      if (target.id === 'evaluation-study-v1') {
        expect(target.kind).toBe('session-storage');
        expect(target.storageKey).toBe('evaluation-study-v1');
      }
      if (
        target.id === 'study-storage' ||
        target.id === 'slice-domain-v1' ||
        target.id === 'dashboard-demo-map-layer-store-v1' ||
        target.id === 'dashboard-demo-filter-presets' ||
        target.id === 'hasSeenTour'
      ) {
        expect(target.kind).toBe('local-storage');
        expect(target.storageKey).toBe(target.id);
      }
    }
  });
});

describe('resetTargets: executeResetChecklist', () => {
  beforeEach(() => {
    // Reset Zustand stores to known defaults so the test is independent
    // of any prior state.
    useDashboardDemoCoordinationStore.setState({
      activeRailTab: 'overview',
      activeSliceIndex: 0,
      timeScaleMode: 'linear',
      warpFactor: 0,
      warpSource: 'density',
      isComputing: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('removes every storage key and resets coordination-store actions', () => {
    const sessionStorage = createMemoryStorage();
    const localStorage = createMemoryStorage();
    for (const key of LOCAL_STORAGE_KEYS_TO_SEED) {
      localStorage.setItem(key, `seed-${key}`);
    }
    for (const key of SESSION_STORAGE_KEYS_TO_SEED) {
      sessionStorage.setItem(key, `seed-${key}`);
    }

    // Mutate the coordination store so we can prove the reset ran.
    useDashboardDemoCoordinationStore.setState({
      activeRailTab: 'inspect',
      activeSliceIndex: 7,
      timeScaleMode: 'adaptive',
      warpFactor: 2.4,
      warpSource: 'slice-authored',
      isComputing: true,
    });

    const outcomes: ResetOutcome[] = executeResetChecklist(
      {
        coordination: useDashboardDemoCoordinationStore.getState(),
        sliceDomain: useSliceDomainStore.getState(),
      },
      { storage: { sessionStorage, localStorage } },
    );

    // All storage keys were cleared.
    for (const key of LOCAL_STORAGE_KEYS_TO_SEED) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    for (const key of SESSION_STORAGE_KEYS_TO_SEED) {
      expect(sessionStorage.getItem(key)).toBeNull();
    }

    // Coordination store was reset to the canonical defaults.
    const state = useDashboardDemoCoordinationStore.getState();
    expect(state.activeRailTab).toBe('scan');
    expect(state.activeSliceIndex).toBe(0);
    expect(state.timeScaleMode).toBe('linear');
    expect(state.warpFactor).toBe(0);
    expect(state.warpSource).toBe('density');
    expect(state.isComputing).toBe(false);

    // Outcomes match the per-target expectations.
    const byId = new Map(outcomes.map((o) => [o.id, o]));
    for (const id of byId.keys()) {
      expect(['reset', 'missing', 'skipped', 'failed']).toContain(byId.get(id)?.status);
    }
    // The seeded keys must be reported as `reset` (we set them above).
    for (const id of [
      'study-storage',
      'slice-domain-v1',
      'dashboard-demo-map-layer-store-v1',
      'dashboard-demo-filter-presets',
      'hasSeenTour',
      'evaluation-study-v1',
    ]) {
      expect(byId.get(id)?.status).toBe('reset');
    }
    for (const id of [
      'coordination-store-reset-warp',
      'coordination-store-reset-analysis',
      'coordination-store-reset-temporal',
      'coordination-store-reset-volume',
      'coordination-store-set-rail-tab',
      'coordination-store-set-active-slice',
    ]) {
      expect(byId.get(id)?.status).toBe('reset');
    }
  });

  test('reports `missing` when the storage key was not previously set', () => {
    const sessionStorage = createMemoryStorage();
    const localStorage = createMemoryStorage();

    const outcomes: ResetOutcome[] = executeResetChecklist(
      {
        coordination: useDashboardDemoCoordinationStore.getState(),
        sliceDomain: useSliceDomainStore.getState(),
      },
      { storage: { sessionStorage, localStorage } },
    );

    for (const target of RESET_TARGETS) {
      if (target.kind === 'session-storage' || target.kind === 'local-storage') {
        const outcome = outcomes.find((o) => o.id === target.id);
        expect(outcome?.status).toBe('missing');
      }
    }
  });

  test('does not throw and reports `skipped` when storage is unavailable', () => {
    const outcomes: ResetOutcome[] = executeResetChecklist(
      {
        coordination: useDashboardDemoCoordinationStore.getState(),
        sliceDomain: useSliceDomainStore.getState(),
      },
      { storage: { sessionStorage: null, localStorage: null } },
    );

    for (const target of RESET_TARGETS) {
      if (target.kind === 'session-storage' || target.kind === 'local-storage') {
        const outcome = outcomes.find((o) => o.id === target.id);
        expect(outcome?.status).toBe('skipped');
      }
    }
  });
});

describe('resetTargets: outcome helpers', () => {
  test('isResetSuccessful returns true when no target failed', () => {
    expect(
      isResetSuccessful([
        { id: 'a', label: 'A', status: 'reset', at: '' },
        { id: 'b', label: 'B', status: 'missing', at: '' },
        { id: 'c', label: 'C', status: 'skipped', at: '' },
      ]),
    ).toBe(true);
  });

  test('isResetSuccessful returns false when any target failed', () => {
    expect(
      isResetSuccessful([
        { id: 'a', label: 'A', status: 'reset', at: '' },
        { id: 'b', label: 'B', status: 'failed', at: '', error: 'boom' },
      ]),
    ).toBe(false);
  });

  test('summarizeResetOutcomes renders a per-target status line', () => {
    const text = summarizeResetOutcomes([
      { id: 'a', label: 'A', status: 'reset', at: '' },
      { id: 'b', label: 'B', status: 'missing', at: '' },
      { id: 'c', label: 'C', status: 'skipped', at: '' },
      { id: 'd', label: 'D', status: 'failed', at: '', error: 'x' },
    ]);
    expect(text).toContain('[x] a (reset)');
    expect(text).toContain('[-] b (missing)');
    expect(text).toContain('[~] c (skipped)');
    expect(text).toContain('[!] d (failed)');
  });

  test('summarizeResetOutcomes renders a placeholder for an empty report', () => {
    expect(summarizeResetOutcomes([])).toBe('no reset targets executed');
  });
});
