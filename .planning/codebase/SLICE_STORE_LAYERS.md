# Slice Store Layers — Zustand Architecture

**Analysis Date:** 2026-06-25

---

## 1. Architecture Overview

The slice-related state is distributed across **30+ Zustand stores**, organized in layers:

```
┌──────────────────────────────────────────────────┐
│              Dashboard Demo Stores               │
│  (parallel implementations for final dashboard and legacy shared flows) │
├──────────────────────────────────────────────────┤
│           Coordination & Sync Stores             │
│  (cross-view coordination, selection sync)        │
├──────────────────────────────────────────────────┤
│            Slice Domain Store (Unified)           │
│  Core + Selection + Creation + Adjustment slices  │
├──────────────────────────────────────────────────┤
│          Domain-Specific Slice Stores             │
│  WarpSlice, WarpProposal, IntervalProposal        │
├──────────────────────────────────────────────────┤
│            Supporting Data Stores                 │
│  TimelineData, Binning, Adaptive, Suggestion      │
└──────────────────────────────────────────────────┘
```

---

## 2. Slice Domain Store (Core)

**File:** `src/store/useSliceDomainStore.ts`

Created via the **slice pattern** — four separate `create*Slice` functions composed into one store:

```typescript
export const useSliceDomainStore = create<SliceDomainState>()(
  persist(
    (...args) => ({
      ...createSliceCoreSlice(...args),
      ...createSliceSelectionSlice(...args),
      ...createSliceCreationSlice(...args),
      ...createSliceAdjustmentSlice(...args),
    }),
    {
      name: 'slice-domain-v1',
      partialize: (state) => ({ slices: state.slices }),
    }
  )
);
```

### Slice Files:
| Slice | File | Purpose |
|---|---|---|
| `createSliceCoreSlice` | `src/store/slice-domain/createSliceCoreSlice.ts` | CRUD, burst slices, merge, visibility, locking |
| `createSliceSelectionSlice` | `src/store/slice-domain/createSliceSelectionSlice.ts` | Multi-select with Set |
| `createSliceCreationSlice` | `src/store/slice-domain/createSliceCreationSlice.ts` | Preview/ghost/commit workflow |
| `createSliceAdjustmentSlice` | `src/store/slice-domain/createSliceAdjustmentSlice.ts` | Drag, hover, snap, tooltip |
| `selectors.ts` | `src/store/slice-domain/selectors.ts` | Derived selectors with caching |

### TypeScript Pattern:
```typescript
type SliceDomainState =
  & SliceCoreState
  & SliceSelectionState
  & SliceCreationState
  & SliceAdjustmentState;

type SliceDomainStateCreator<T> = StateCreator<SliceDomainState, [], [], T>;
```

### Persistence:
- Only `slices` array is persisted
- Transient states (creation preview, drag state, selection) are NOT persisted
- Storage key: `'slice-domain-v1'`

### Re-export Shield:
`src/store/useSliceStore.ts` — re-exports `useSliceDomainStore` with a `noNewRootGuard` that returns the same store reference (prevents accidental new root store creation):

```typescript
const noNewRootGuard = <T>(store: T): T => store;
export const useSliceStore = noNewRootGuard(useSliceDomainStore);
```

`src/store/useSliceSelectionStore.ts`, `useSliceCreationStore.ts`, `useSliceAdjustmentStore.ts` — all just re-export the same `useSliceDomainStore` via the same guard pattern. This means ALL these store hooks return the SAME Zustand store reference — they are aliases, not separate stores.

---

## 3. Cross-Store Communication

### Direct `getState()` Access (No Events)

Stores reference each other directly via `.getState()`:

```
useSliceDomainStore
  → useAdaptiveStore.getState()       (mapDomain for normalization)
  → useTimelineDataStore.getState()   (minTimestampSec, maxTimestampSec)

useTimeslicingModeStore
  → useSliceDomainStore.getState()    (replaceSlicesFromBins)

useDashboardDemoTimeslicingModeStore
  → useSliceDomainStore.getState()    (replaceSlicesFromBins, addSliceFromBin)
  → useDashboardDemoCoordinationStore.getState() (setWarpSource)
```

### No Event Bus or Pub/Sub

All coordination happens through:
1. Direct store-to-store calls in action handlers
2. React hooks subscribing to multiple stores and reacting to changes

---

## 4. Coordination Store

**File:** `src/store/useCoordinationStore.ts`

Central coordination between cube, timeline, and map panels:

```typescript
interface CoordinationState {
  selectedIndex: number | null;            // Current selected data index
  selectedSource: 'cube' | 'timeline' | 'map' | null;
  lastInteractionAt: number | null;
  lastInteractionSource: SelectionSource;
  brushRange: [number, number] | null;      // Normalized time brush
  selectedBurstWindows: BurstWindowSelection[];
  detailsOpen: boolean;
  workflowPhase: 'generate' | 'review' | 'applied' | 'refine';
  syncStatus: { status: SyncStatusToken; reason?: string; panel?: PanelName };
  panelNoMatch: Partial<Record<PanelName, PanelNoMatchState>>;
}
```

### Sync Protocol:

| Action | Effect |
|---|---|
| `setSelectedIndex(index, source)` | Immediate sync, `synchronized` status |
| `commitSelection(index, source)` | Optimistic → `syncing` status |
| `reconcileSelection({ isValid, reason, panel })` | Valid → remove panel from noMatch; Invalid → add, set `partial` |
| `clearSelection(reason?)` | Clear with optional reason for `partial` status |

### Panel No-Match:
Tracks per-panel reasons when a selection can't be matched across views. Partial sync resolves when all panels are reconciled.

---

## 5. Dashboard Demo Coordination Store

**File:** `src/store/useDashboardDemoCoordinationStore.ts`

Significantly larger than the main `useCoordinationStore` — includes all demo-specific state:

| Area | Fields |
|---|---|
| Selection | `selectedIndex`, `selectedSource`, `brushRange` |
| Burst windows | `selectedBurstWindows: DemoBurstWindowSelection[]` |
| Sync | `syncStatus`, `panelNoMatch` |
| Comparison | `comparisonSliceIds`, `comparisonSelectionOrder` |
| Inspection | `inspectIsPlaying`, `inspectPlaybackSpeed`, `inspectInterpolation`, `inspectTrailEnabled`, `inspectTrailDecay` |
| Volume | `volumeScaleSeconds`, `volumeExaggeration`, `volumeNormalizationMode` |
| Warp | `timeScaleMode`, `warpSource`, `warpFactor`, `densityMap`, `warpMap`, `mapDomain` |
| Rail | `activeRailTab` |
| Districts | `selectedDistricts: string[]` |
| Time | `timeRange: DemoAnalysisTimeRange` |
| STKDE | `stkdeScopeMode`, `stkdeParams`, `spatialFilter`, `temporalFilter`, `stkdeResponse`, `selectedHotspotId`, `hoveredHotspotId` |

### Key Differences from Main Coordination Store:
- Holds its own warp/density maps (main adaptive store handles this)
- Manages STKDE state directly
- Includes district filtering
- Has comparison slice system
- Has inspection/playback system

---

## 6. Supporting Slice Stores

### WarpSlice Store
**File:** `src/store/useWarpSliceStore.ts`

Separate from the main slice store. Manages warp profiles with weight/range pairs for non-uniform time scaling. Has its own CRUD (`addSlice`, `updateSlice`, `removeSlice`, `clearSlices`) plus `replaceActiveWarp()` for bulk replacement with new profile IDs.

### Warp Proposal Store
**File:** `src/store/useWarpProposalStore.ts`

Three-phase workflow:
```
generate(constraints, temporalContext) → select(id) → applySelected()
```

Generates proposals from cube spatial constraints, allows selection, and applies via `applyWarpProposal()`.

### Interval Proposal Store
**File:** `src/store/useIntervalProposalStore.ts`

Similar three-phase workflow but for interval proposals:
```
generate(constraints, burstWindows) → select(id) → previewSelected() → applySelected()
```

Additional capabilities:
- `updateProposalRange(proposalId, range)` — interactive range editing with quality recomputation
- `resetProposalRange(proposalId)` — revert to source range
- `undoLastApply()` — revert last application via receipt

Quality recomputation on edit: adjusts `densityConcentration`, `hotspotCoverage`, `intervalSharpness`, and confidence score based on span/center delta.

---

## 7. Data & Computation Stores

### Adaptive Store
**File:** `src/store/useAdaptiveStore.ts`

| State | Type | Purpose |
|---|---|---|
| `warpFactor` | 0–1 | Blending between linear and fully adaptive |
| `densityMap` | `Float32Array \| null` | Normalized density per bin |
| `burstinessMap` | `Float32Array \| null` | Inter-event burstiness per bin |
| `warpMap` | `Float32Array \| null` | Non-uniform timeline positions |
| `countMap` | `Float32Array \| null` | Raw event counts per bin |
| `mapDomain` | `[number, number]` | Domain for maps (default 0–100) |
| `burstMetric` | `'density' \| 'burstiness'` | Which metric to use for burst detection |
| `burstThreshold` | 0–1 percentile | Threshold percentile for burst classification |
| `burstCutoff` | number | Computed cutoff value |

**Worker integration:** Maintains a module-level `Worker` instance for `adaptiveTime.worker.ts`. Uses `activeRequestId` counter for stale request deduplication.

### Timeline Data Store
**File:** `src/store/useTimelineDataStore.ts`

Loads data from DuckDB via Arrow streaming. Provides `minTimestapSec`/`maxTimestampSec` used by the slice domain store for time normalization.

### Binning Store
**File:** `src/store/useBinningStore.ts`

Standalone store for binning strategy experimentation. Has its own `strategy`, `constraints`, `bins`, and actions for merge/split/resize/delete. Not directly coupled to slice stores — feeds slice creation via `useTimeslicingModeStore`.

### Timeslicing Mode Store
**File:** `src/store/useTimeslicingModeStore.ts`

Manages the generate → review → apply workflow. Persisted via `zustand/middleware/persist` with key `'timeslicing-mode-v2'`. Partially persists only configuration state (mode, preset, templates, inputs).

---

## 8. Middleware Usage

| Store | Middleware | Storage Key | Partialize |
|---|---|---|---|
| `useSliceDomainStore` | `persist` | `slice-domain-v1` | Only `{ slices }` |
| `useTimeslicingModeStore` | `persist` | `timeslicing-mode-v2` | Mode, preset, templates, inputs |
| `useDashboardDemoMapLayerStore` | `persist` | `dashboard-demo-map-layer-store-v1` | Full state |
| `useHeatmapStore` | `persist` | `heatmap-store-v1` | Full state |
| `usePresetStore` | `persist` | — | Full state |

---

## 9. Store Testing

### Test files:
| Test | Store Tested |
|---|---|
| `useSliceStore.test.ts` | Slice domain store core |
| `useSliceAdjustmentStore.test.ts` | Adjustment slice |
| `useAdaptiveStore.test.ts` | Adaptive store |
| `useAdaptiveStore.contract.test.ts` | Adaptive store contract |
| `useCoordinationStore.test.ts` | Coordination store |
| `useTimelineDataStore.test.ts` | Timeline data store |
| `useTimeslicingModeStore.test.ts` | Timeslicing mode store |
| `useDashboardDemoTimeslicingModeStore.test.ts` | Dashboard demo timeslicing |
| `useDashboardDemoTimeslicingModeStore.persist.test.ts` | Persistence tests |
| `useDashboardDemoCoordinationStore.test.ts` | Dashboard demo coordination |
| `useDashboardDemoFilterStore.test.ts` | Dashboard demo filter |
| `useCubeSpatialConstraintsStore.test.ts` | Cube spatial constraints |
| `useStkdeStore.test.ts` | STKDE store |

---

*Store layers analysis: 2026-06-25*
