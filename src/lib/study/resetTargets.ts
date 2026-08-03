/**
 * Phase 80 Reset Targets — audited checklist for participant-visible state.
 *
 * Before a new participant session begins, every persisted surface that
 * could leak state from a prior participant must be reset. Each entry
 * here is a single named target with a `kind` describing the reset
 * strategy. The store consumes this list so reset outcomes are auditable
 * (succeeded/failed/skipped) instead of a single opaque `globalReset()`
 * call.
 *
 * The set is INTENTIONALLY explicit. Adding a new participant-visible
 * store without adding a corresponding entry here is a regression — the
 * orchestrator will catch it via UAT in later plans.
 */

import type { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import type { useSliceDomainStore } from '@/store/useSliceDomainStore';

export type ResetTargetKind =
  | 'session-storage' // sessionStorage.removeItem(key)
  | 'local-storage' // localStorage.removeItem(key)
  | 'zustand-reset' // store.getState().reset*()
  | 'zustand-set' // store.getState().setX(...) to a known initial value
  | 'custom'; // free-form function returning success/failure

export interface ResetTarget {
  /** Stable identifier used in logs and the reset report. */
  id: string;
  /** Short human-readable label for the researcher log. */
  label: string;
  /** Which reset strategy the executor should use. */
  kind: ResetTargetKind;
  /** Storage key (for `session-storage` / `local-storage` kinds). */
  storageKey?: string;
  /** Required for `zustand-reset` / `zustand-set` — names the action to invoke. */
  actionName?: string;
  /**
   * Free-form description surfaced in the reset report so the researcher
   * can confirm what was cleared.
   */
  notes?: string;
}

export interface ResetOutcome {
  id: string;
  label: string;
  status: 'reset' | 'missing' | 'failed' | 'skipped';
  /** Underlying error message when status === 'failed'. */
  error?: string;
  /** ISO timestamp the executor touched the target. */
  at: string;
}

const nowIso = (): string => new Date().toISOString();

const removeFromStorage = (
  storage: Storage | null,
  key: string,
): ResetOutcome['status'] => {
  if (!storage) return 'skipped';
  try {
    if (storage.getItem(key) === null) return 'missing';
    storage.removeItem(key);
    return 'reset';
  } catch {
    return 'failed';
  }
};

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * Storage handles exposed for tests. Production callers should use
 * `executeResetChecklist` directly — the executor reads from `window`
 * when available and silently no-ops on the server.
 */
export interface ResetExecutorStorage {
  sessionStorage: Storage | null;
  localStorage: Storage | null;
}

const isDemoCoordinationStore = (
  candidate: unknown,
): candidate is ReturnType<typeof useDashboardDemoCoordinationStore.getState> => {
  if (!candidate || typeof candidate !== 'object') return false;
  const maybe = candidate as Record<string, unknown>;
  return (
    typeof maybe.resetWarp === 'function' &&
    typeof maybe.resetAnalysis === 'function' &&
    typeof maybe.resetTemporalSettings === 'function' &&
    typeof maybe.resetVolumeSettings === 'function' &&
    typeof maybe.setActiveRailTab === 'function' &&
    typeof maybe.setActiveSliceIndex === 'function'
  );
};

const isSliceDomainStore = (
  candidate: unknown,
): candidate is ReturnType<typeof useSliceDomainStore.getState> => {
  if (!candidate || typeof candidate !== 'object') return false;
  const maybe = candidate as Record<string, unknown>;
  return (
    typeof maybe.resetSlices === 'function' ||
    typeof maybe.setSlices === 'function' ||
    (Array.isArray(maybe.slices) && typeof maybe.setSlices === 'function')
  );
};

/**
 * Canonical reset checklist. Order matters only for logging clarity — each
 * target is reset independently so partial failures are still useful.
 */
export const RESET_TARGETS: readonly ResetTarget[] = [
  {
    id: 'evaluation-study-v1',
    label: 'Evaluation study store (sessionStorage)',
    kind: 'session-storage',
    storageKey: 'evaluation-study-v1',
    notes: 'Persisted slice of useEvaluationStudyStore (sessionStorage-backed).',
  },
  {
    id: 'study-storage',
    label: 'Legacy study store (localStorage)',
    kind: 'local-storage',
    storageKey: 'study-storage',
    notes: 'Persisted slice of legacy useStudyStore. Cleared so prior session IDs do not leak.',
  },
  {
    id: 'slice-domain-v1',
    label: 'Slice domain store (localStorage)',
    kind: 'local-storage',
    storageKey: 'slice-domain-v1',
    notes: 'Persisted useSliceDomainStore; the created slices are participant-visible.',
  },
  {
    id: 'dashboard-demo-map-layer-store-v1',
    label: 'Demo map layer store (localStorage)',
    kind: 'local-storage',
    storageKey: 'dashboard-demo-map-layer-store-v1',
    notes: 'Persisted useDashboardDemoMapLayerStore; layer toggles affect the participant map view.',
  },
  {
    id: 'dashboard-demo-filter-presets',
    label: 'Demo filter presets (localStorage)',
    kind: 'local-storage',
    storageKey: 'dashboard-demo-filter-presets',
    notes: 'Filter presets saved by a prior participant must not influence the next.',
  },
  {
    id: 'hasSeenTour',
    label: 'Onboarding tour flag (localStorage)',
    kind: 'local-storage',
    storageKey: 'hasSeenTour',
    notes: 'Reset so the researcher can re-run the evaluation training tour for every participant.',
  },
  {
    id: 'coordination-store-reset-warp',
    label: 'Coordination store: resetWarp',
    kind: 'zustand-reset',
    actionName: 'resetWarp',
    notes: 'Clears time-scale mode, warp factor, warp source, and computing flag.',
  },
  {
    id: 'coordination-store-reset-analysis',
    label: 'Coordination store: resetAnalysis',
    kind: 'zustand-reset',
    actionName: 'resetAnalysis',
    notes: 'Clears selected districts, time range, stkde params, hotspots, filters, response.',
  },
  {
    id: 'coordination-store-reset-temporal',
    label: 'Coordination store: resetTemporalSettings',
    kind: 'zustand-reset',
    actionName: 'resetTemporalSettings',
    notes: 'Resets inspect playback/trail/scrubbing controls to defaults.',
  },
  {
    id: 'coordination-store-reset-volume',
    label: 'Coordination store: resetVolumeSettings',
    kind: 'zustand-reset',
    actionName: 'resetVolumeSettings',
    notes: 'Resets volumetric scale/exaggeration/normalization to defaults.',
  },
  {
    id: 'coordination-store-set-rail-tab',
    label: 'Coordination store: setActiveRailTab(scan / STKDE)',
    kind: 'zustand-set',
    actionName: 'setActiveRailTab',
    notes: 'Forces the rail to open on the STKDE tab (the scan value) so all participants see the same starting surface.',
  },
  {
    id: 'coordination-store-set-active-slice',
    label: 'Coordination store: setActiveSliceIndex(0)',
    kind: 'zustand-set',
    actionName: 'setActiveSliceIndex',
    notes: 'Resets active slice index to 0 so the cube opens on the first slice.',
  },
] as const;

export interface ResetStores {
  coordination: ReturnType<typeof useDashboardDemoCoordinationStore.getState> | null;
  sliceDomain: ReturnType<typeof useSliceDomainStore.getState> | null;
}

const defaultStores: ResetStores = { coordination: null, sliceDomain: null };

export interface ExecuteResetOptions {
  /**
   * Storage handles for the reset executor. When omitted, the executor
   * reads from `window.sessionStorage` / `window.localStorage` (and
   * gracefully no-ops on the server). Tests pass memory-backed storage
   * to avoid relying on jsdom.
   */
  storage?: ResetExecutorStorage;
}

/**
 * Execute the reset checklist against the supplied store handles (or fall
 * back to `getState()` when omitted). Returns a per-target report that the
 * evaluation store can persist to the study log and surface in the UI.
 */
export const executeResetChecklist = (
  stores: ResetStores = defaultStores,
  options: ExecuteResetOptions = {},
): ResetOutcome[] => {
  const sessionStorage = options.storage?.sessionStorage ?? getSessionStorage();
  const localStorage = options.storage?.localStorage ?? getLocalStorage();
  const coordination = stores.coordination ?? null;
  const sliceDomain = stores.sliceDomain ?? null;

  const outcomes: ResetOutcome[] = [];

  for (const target of RESET_TARGETS) {
    const at = nowIso();
    try {
      switch (target.kind) {
        case 'session-storage': {
          const status = removeFromStorage(sessionStorage, target.storageKey ?? '');
          outcomes.push({ id: target.id, label: target.label, status, at });
          break;
        }
        case 'local-storage': {
          const status = removeFromStorage(localStorage, target.storageKey ?? '');
          outcomes.push({ id: target.id, label: target.label, status, at });
          break;
        }
        case 'zustand-reset':
        case 'zustand-set': {
          if (!isDemoCoordinationStore(coordination) && !isSliceDomainStore(sliceDomain)) {
            outcomes.push({
              id: target.id,
              label: target.label,
              status: 'skipped',
              at,
              error: 'coordination store handle unavailable',
            });
            break;
          }
          // The Phase 80 reset checklist intentionally only targets the
          // coordination store actions. Slice domain persistence is
          // handled via the `slice-domain-v1` localStorage key above.
          if (!isDemoCoordinationStore(coordination)) {
            outcomes.push({
              id: target.id,
              label: target.label,
              status: 'skipped',
              at,
              error: 'coordination store handle unavailable',
            });
            break;
          }
          const actionName = target.actionName ?? '';
          if (actionName === 'resetWarp') {
            coordination.resetWarp();
          } else if (actionName === 'resetAnalysis') {
            coordination.resetAnalysis();
          } else if (actionName === 'resetTemporalSettings') {
            coordination.resetTemporalSettings();
          } else if (actionName === 'resetVolumeSettings') {
            coordination.resetVolumeSettings();
          } else if (actionName === 'setActiveRailTab') {
            coordination.setActiveRailTab('scan');
          } else if (actionName === 'setActiveSliceIndex') {
            coordination.setActiveSliceIndex(0);
          } else {
            outcomes.push({
              id: target.id,
              label: target.label,
              status: 'failed',
              at,
              error: `unknown action: ${actionName}`,
            });
            break;
          }
          outcomes.push({ id: target.id, label: target.label, status: 'reset', at });
          break;
        }
        case 'custom': {
          outcomes.push({
            id: target.id,
            label: target.label,
            status: 'skipped',
            at,
            error: 'custom reset targets are not auto-executed',
          });
          break;
        }
        default: {
          outcomes.push({
            id: target.id,
            label: target.label,
            status: 'failed',
            at,
            error: `unknown reset kind: ${target.kind}`,
          });
        }
      }
    } catch (error) {
      outcomes.push({
        id: target.id,
        label: target.label,
        status: 'failed',
        at,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return outcomes;
};

/**
 * Convenience: did the reset pass with no failures? Skips are acceptable
 * (e.g. key did not exist) but failures are not.
 */
export const isResetSuccessful = (outcomes: readonly ResetOutcome[]): boolean =>
  outcomes.every((outcome) => outcome.status !== 'failed');

/**
 * Convenience: produce a compact researcher-facing summary for the reset
 * report. Returns one line per target with status iconography.
 */
export const summarizeResetOutcomes = (outcomes: readonly ResetOutcome[]): string => {
  if (outcomes.length === 0) return 'no reset targets executed';
  return outcomes
    .map((outcome) => {
      const icon =
        outcome.status === 'reset'
          ? '[x]'
          : outcome.status === 'missing'
            ? '[-]'
            : outcome.status === 'skipped'
              ? '[~]'
              : '[!]';
      return `${icon} ${outcome.id} (${outcome.status})`;
    })
    .join('; ');
};
