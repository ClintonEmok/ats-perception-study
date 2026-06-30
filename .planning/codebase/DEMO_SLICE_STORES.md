# Demo/Dashboard Slice Store Implementations

**Analysis Date:** 2026-06-25

---

## 1. Overview

The final dashboard route has its own parallel set of stores under `src/store/useDashboardDemo*`. These stores replicate, extend, or specialize the behavior of the legacy shared stores while powering `/dashboard-demo` as the canonical workspace.

### Store Inventory:

| Demo Store | Main Counterpart | Relationship |
|---|---|---|
| `useDashboardDemoCoordinationStore` | `useCoordinationStore` | Extended — adds demo-specific features |
| `useDashboardDemoTimeslicingModeStore` | `useTimeslicingModeStore` | Extended — adds burst generation from API |
| `useDashboardDemoFilterStore` | `useFilterStore` | Extended — adds presets, spatial bounds |
| `useDashboardDemoMapLayerStore` | `useMapLayerStore` | Standalone — persisted layer config |
| `useDashboardDemoTimeStore` | `useTimeStore` | Identical structure — time playback |

---

## 2. Dashboard Demo Coordination Store

**File:** `src/store/useDashboardDemoCoordinationStore.ts` (426 lines)

### State Coverage (vs Main):

| Capability | Main (`useCoordinationStore`) | Demo (`useDashboardDemoCoordinationStore`) |
|---|---|---|
| Index selection | ✅ | ✅ (with `DemoSelectionSource`) |
| Brush range | ✅ | ✅ |
| Burst windows | ✅ (basic) | ✅ (rich `DemoBurstWindowSelection`) |
| Sync status | ✅ | ✅ |
| Panel no-match | ✅ | ✅ |
| Workflow phase | ✅ | ❌ (removed) |
| Comparison slices | ❌ | ✅ (`left` / `right` slots) |
| Slice view mode | ❌ | ✅ (`stack` / `focus`) |
| Inspection playback | ❌ | ✅ (play, speed, trail, scrub) |
| Volume settings | ❌ | ✅ (scale, exaggeration, normalization) |
| Warp maps | ❌ | ✅ (densityMap, warpMap, mapDomain) |
| Rail tab | ❌ | ✅ (`scan` / `detect` / `slices` / `inspect` / `configure`) |
| District filter | ❌ | ✅ (`selectedDistricts`) |
| STKDE params | ❌ | ✅ (full STKDE integration) |
| Crime fetch status | ❌ | ✅ (`crimeFetchStatus`) |

### Key Design Decision:
The demo coordination store acts as an **aggregator** for demo state that would otherwise be spread across multiple stores in the main app. This simplifies prop drilling for the dashboard but creates a very large store interface (85+ properties/actions).

### Default State Values:
- `timeScaleMode`: `'adaptive'` (not `'linear'`) — intentionally set so the 3D cube's non-uniform time axis is visible by default (thesis core contribution)
- `stkdeScopeMode`: `'applied-slices'` — STKDE automatically scoped to active slices
- `warpSource`: `'density'`
- `warpFactor`: `1`

---

## 3. Dashboard Demo Timeslicing Mode Store

**File:** `src/store/useDashboardDemoTimeslicingModeStore.ts` (544 lines)

### Differences from Main (`useTimeslicingModeStore`):

| Feature | Main | Demo |
|---|---|---|
| Presets | ✅ 8 presets (hourly..custom) | ❌ No presets / `PRESET_DEFINITIONS` |
| `getPresetIntervals()` | ✅ | ❌ |
| `generateBurstDraftBinsFromWindows()` | ❌ | ✅ — fetches crime data from API, runs `buildNonUniformDraftBinsFromSelection` |
| `applySingleGeneratedBin()` | ❌ | ✅ — applies individual bins directly |
| `addManualDraftRange()` | ❌ | ✅ — adds manual draft with `TimeBin` creation |
| `updatePendingBinRange()` | ❌ | ✅ — updates range in-place |
| `computeManualDraftBin()` | ❌ | ✅ — fetches crime data, computes burstiness stats |
| Persistence | ✅ (`persist` middleware) | ❌ (no persistence) |

### Burst Generation Flow (Demo-specific):

```
generateBurstDraftBinsFromWindows()
  1. Validate time window
  2. partitionSelectionByGranularity() — split window by granularity
  3. fetchCrimeRecordsForRange() — parallel API calls to /api/crimes/range
  4. buildNonUniformDraftBinsFromSelection() — local burst detection
  5. setPendingGeneratedBins() with metadata
```

### Manual Bin Computation:
`computeManualDraftBin()` fetches crime data for a manually defined range, computes:
- Inter-event intervals: `mean`, `variance`, `stdDev`
- Burstiness coefficient: `(σ - mean) / (σ + mean)` → [-1, 1]
- Burst score: `((burstinessCoefficient + 1) / 2) * 100`
- Burst classification: `> 0.3` → `prolonged-peak`, `< -0.3` → `valley`
- Warp weight: `1 + max(0, burstinessCoefficient)`

### Burst Metadata Preservation:
The demo store preserves burst taxonomy metadata (`BURST_METADATA_KEYS`) during merge/split operations, ensuring burst classifications persist through bin editing.

### `stripTransientTimeslicingState()`:
Utility to extract persistable subset for save/restore scenarios:
```typescript
{
  mode, customIntervals, autoConfig,
  sliceTemplates, generationInputs
}
```

---

## 4. Dashboard Demo Filter Store

**File:** `src/store/useDashboardDemoFilterStore.ts` (267 lines)

### Differences from Main (`useFilterStore`):
- Has `selectedSpatialBounds: SpatialBounds` (not in main)
- Has `setSpatialBounds()` / `clearSpatialBounds()`
- Has `SpatialBounds` type with lat/lon and normalized x/z bounds
- Time range guard: warns if caller passes 0-100 normalized values (main does not)
- Uses LOCAL STORAGE presets via manual `getStorage()`/`persistPresets()` (not Zustand `persist` middleware)

### Time Range Canonical Unit:
Enforced convention: **epoch seconds** only. A console warning fires for 0-100 normalized values with guidance to use `normalizedToEpochSeconds()` first.

---

## 5. Dashboard Demo Map Layer Store

**File:** `src/store/useDashboardDemoMapLayerStore.ts` (75 lines)

Persisted map layer configuration:
```typescript
visibility: { poi, districts, stkde, heatmap, clusters, trajectories, events }
opacity: { poi, districts, stkde, heatmap }
```

Persisted via `zustand/middleware/persist` with key `'dashboard-demo-map-layer-store-v1'`. No main counterpart — this is demo-only.

---

## 6. Dashboard Demo Time Store

**File:** `src/store/useDashboardDemoTimeStore.ts` (81 lines)

Structurally identical to `useTimeStore` (`src/store/useTimeStore.ts`). Same state, same actions:

```typescript
interface DashboardDemoTimeState {
  currentTime: number;
  isPlaying: boolean;
  timeRange: [number, number];
  speed: number;
  timeWindow: number;
  timeResolution: TimeResolution;
  timeScaleMode: 'linear' | 'adaptive';
}
```

Both use `TIME_MIN`, `TIME_MAX`, `PLAYBACK_SPEED_DEFAULT`, `TIME_WINDOW_DEFAULT`, `TIME_STEP_DEFAULT` from `src/lib/constants.ts`.

---

## 7. Demo Burst Window Selection

**File:** `src/store/useDashboardDemoCoordinationStore.ts`, line 41

Rich burst window type for the demo:

```typescript
interface DemoBurstWindowSelection {
  id: string;
  start: number;           // epoch seconds
  end: number;
  metric: 'density' | 'burstiness';
  peak: number;
  count: number;
  duration: number;
  burstClass: 'prolonged-peak' | 'isolated-spike' | 'valley' | 'neutral';
  burstConfidence: number;
  burstScore: number;
  burstRationale: string;
  burstRuleVersion: string;
  burstProvenance: string;
  tieBreakReason: string;
  thresholdSource: string;
  neighborhoodSummary: string;
}
```

In the main coordination store, burst windows are simpler:
```typescript
{ start: number; end: number; metric: 'density' | 'burstiness' }
```

---

## 8. Demo Slice Comparison System

**File:** `src/store/useDashboardDemoCoordinationStore.ts`

### Two-slot comparison:
```typescript
comparisonSliceIds: { left: string | null, right: string | null }
```

### Insertion Policy:
- Empty slots filled left → right
- When both slots filled → replaces oldest (tracked by `comparisonSelectionOrder`)

### Swap:
`swapComparisonSlices()` — reverses both IDs and order array.

---

## 9. Demo STKDE Integration

The demo coordination store holds STKDE state directly:
- `stkdeParams: StkdeParams` — bandwidth, grid, support parameters
- `stkdeScopeMode: 'applied-slices' | 'full-viewport'`
- `stkdeResponse: StkdeResponse | null`
- `selectedHotspotId` / `hoveredHotspotId`
- `spatialFilter` / `temporalFilter`
- `setStkdeParams(patch)` — clamped via `STKDE_PARAM_LIMITS`

The main `useStkdeStore` is separate and has its own run lifecycle (idle/running/success/error/cancelled).

---

*Demo stores analysis: 2026-06-25*
