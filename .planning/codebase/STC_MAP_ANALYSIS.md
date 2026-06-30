# STC/Map Visualization Analysis

**Analysis Date:** 2026-06-01

## 1. Cube Components (`src/components/viz/`)

| File | Purpose |
|------|---------|
| `CubeVisualization.tsx` | Main wrapper component - loads data, shows debug overlay, renders `MainScene` |
| `MainScene.tsx` | R3F scene container - hosts `Scene`, `TimeSlices`, map background, and `useSelectionSync` |
| `Scene.tsx` | R3F `<Canvas>` wrapper with theme background/fog |
| `SimpleCrimePoints.tsx` | **Primary cube rendering** - renders crime points with adaptive warp, filtering, hover/click |
| `DataPoints.tsx` | Alternative/legacy instanced mesh rendering with custom shaders for ghosting/slices |
| `TimeSlices.tsx` | Manages slice creation via double-click, renders `SlicePlane` components |
| `SlicePlane.tsx` | **Individual slice plane rendering** - draggable time planes in 3D space |
| `SliceManagerUI.tsx` | Sheet/panel for managing slices (add, remove, lock, visibility) |
| `SliceStats.tsx` | Stats for a given slice |
| `ContextualSlicePanel.tsx` | Side panel showing Point/Burst/Slice details |
| `FloatingToolbar.tsx` | Re-exported as `Controls`; contains `SliceManagerUI` trigger |
| `Controls.tsx` | Re-exports `FloatingToolbar` for backwards compatibility (4 lines) |
| `TimeGrid.tsx`, `Grid.tsx`, `TimePlane.tsx` | Grid/plane helpers |
| `BurstList.tsx` | Burst window selection with threshold slider + metric select |
| `BurstEvolutionOverlay.tsx` | Burst window indicators in 3D cube |
| `EvolutionFlowOverlay.tsx` | Flow connections between slices |
| `ClusterManager.tsx` | Logic-only; debounced DBSCAN clustering at 400ms |
| `ClusterHighlights.tsx` | Wireframe + transparent box per cluster |
| `ClusterLabels.tsx` | HTML labels atop cluster boxes |

**Key finding:** `TimeSlices.tsx` IS rendered in `MainScene.tsx` (line 185). Earlier analysis incorrectly stated it was not included.

## 2. Map Components (`src/components/map/`)

| File | Purpose |
|------|---------|
| `MapVisualization.tsx` | Main map wrapper - renders `MapBase` + layers + controls overlay |
| `MapBase.tsx` | React-map-gl `<Map>` wrapper with theme styling |
| `MapEventLayer.tsx` | **Renders crime points as GeoJSON circle layer** with burst/type coloring |
| `MapHeatmapOverlay.tsx` | Heatmap layer (separate from STKDE) |
| `MapStkdeHeatmapLayer.tsx` | STKDE hotspot heatmap cells |
| `MapClusterHighlights.tsx` | Cluster markers |
| `MapTrajectoryLayer.tsx` | Trajectory paths |
| `MapDistrictLayer.tsx` | District boundaries |
| `MapPoiLayer.tsx` | Points of interest |
| `MapSelectionOverlay.tsx` | Rectangle selection bounds |
| `MapSelectionMarker.tsx` | Selected point marker |
| `MapDebugOverlay.tsx` | Debug info overlay |
| `MapTypeLegend.tsx` | Crime type legend |
| `MapLayerManager.tsx` | Layer visibility toggles |
| `DeckGlHeatmapOverlay.tsx` | Deck.gl-based heatmap overlay |

**Map renders crime data as GeoJSON circles** (not heatmap by default) with up to 20,000 points sampled.

## 3. Coordination Store (`src/store/useCoordinationStore.ts`)

```typescript
interface CoordinationState {
  selectedIndex: number | null;      // Selected point index
  selectedSource: SelectionSource;  // 'cube' | 'timeline' | 'map' | null
  lastInteractionAt: number | null;
  lastInteractionSource: SelectionSource;
  brushRange: [number, number] | null;  // Timeline brush range
  selectedBurstWindows: { start, end, metric }[];
  detailsOpen: boolean;
  workflowPhase: WorkflowPhase;
  syncStatus: SyncStatus;
  panelNoMatch: ...;
  setSelectedIndex: (index, source) => void;
  commitSelection: (index, source) => void;
  clearSelection: (reason?) => void;
  reconcileSelection: ({ isValid, reason, panel }) => void;
  setBrushRange: (range) => void;
  // ...
}
```

**Dashboard-demo has its own parallel store:** `useDashboardDemoCoordinationStore.ts` with similar structure but enhanced with playback controls (inspectIsPlaying, inspectInterpolation, inspectTrailEnabled), volume encoding settings, comparison slices, and district/time filtering. This store absorbed `useDashboardDemoAdaptiveStore`, `useDashboardDemoWarpStore`, and `useDashboardDemoAnalysisStore` in Phase 76.

## 4. Slice Plane Rendering

**Yes, slice planes exist in the cube and ARE rendered in MainScene.**

- `src/components/viz/TimeSlices.tsx` - Manages slices, renders `SlicePlane` components
- `src/components/viz/SlicePlane.tsx` - Renders horizontal planes in 3D:
  - Single point slice: plane at Y with grid helper, draggable sphere handle
  - Range slice: box geometry spanning Y range
  - Colors: `#00ffff` (cyan) for point, `#ff00ff` (magenta) for range
  - Draggable via pointer events on the handle sphere

**TimeSlices IS rendered in MainScene (line 185):**
```tsx
<TimeSlices sliceStoreOverride={sliceStoreOverride} timeStoreOverride={timeStoreOverride} />
```

## 5. Map ↔ Cube Interaction Mechanism

### Selection Sync (`src/hooks/useSelectionSync.ts`)

The `useSelectionSync` hook is the "conductor" that ties views together:

1. **Effect 1: Selection → Timeline scroll**
   - When `selectedIndex` changes, looks up point's timestamp
   - Calls `setTime(actualTime)` to scroll timeline to selected point

2. **Effect 2: Selection → Slice activation**
   - When `selectedIndex` changes, checks if point falls inside any slice
   - Calls `setActiveSlice(sliceId)` to activate containing slice

### Point Selection Flow

```
Cube click → setSelectedIndex(sourceIndex, 'cube')
   ↓
CoordinationStore.selectedIndex updated
   ↓
useSelectionSync Effect 1 → Timeline scrolls to point time
useSelectionSync Effect 2 → Slice containing point becomes active
   ↓
ContextualSlicePanel shows SliceStats or PointInspector
```

```
Map click → handleClick() in MapVisualization
   → findNearestIndexByScenePosition(x, z)
   → setSelectedIndex(nearest.index, 'map')
   (same flow as cube)
```

### Missing Bidirectional Sync

**Map and cube do NOT directly update each other's positions.** When a point is selected:
- Map shows a marker via `MapSelectionMarker` (lat/lon from resolved point)
- Cube could highlight the point but this is via the index lookup mechanism, not direct coordinate sync

## 6. Dashboard-Demo Page Layout (`src/app/dashboard-demo/page.tsx`)

**Final dashboard shell** (`src/components/dashboard-demo/DashboardDemoShell.tsx`):
- Uses tab switching between map/3d (only one visible at a time)
- No longer uses `CubeVisualization` with store overrides
- Directly renders `DemoMapVisualization` or `Demo3dSpatialView`
- Has per-slice crime fetching, KDE computation via `kdeSlice.worker.ts`
- Has playback controls: `inspectIsPlaying`, `inspectInterpolation`, `inspectTrailEnabled`

## 7. What's Missing for "STC Slice Planes" + "Linked 2D + 3D Interaction"

### Slice Planes

| Gap | Description |
|-----|-------------|
| **No shared legacy cube shell** | The final dashboard now routes all slice authoring and inspection through `DashboardDemoShell`, so legacy `DashboardLayout`/`ContextualSlicePanel` flows no longer exist as live surfaces |
| **Limited slice interaction** | Slices are created via double-click hitbox, but no UI for time-based slice creation from timeline |

### Linked 2D + 3D Interaction

| Gap | Description |
|-----|-------------|
| **No map slice projection** | When a slice plane is selected in cube, map does NOT highlight corresponding geographic area/time range |
| **No temporal sync to map** | MapEventLayer uses `selectedTimeRange` but there's no mechanism to sync a cube slice's time range to the map's time filter |
| **DashboardDemo vs Dashboard split** | Two parallel implementations - DashboardDemo has better UI but Dashboard has the "real" visualization stack |
| **No slice-aware map rendering** | Map doesn't render "filtered by slice" - it only filters by selectedTimeRange, selectedTypes, selectedDistricts |
| **No brush sync to cube** | Timeline brush selection (`brushRange` in CoordinationStore) doesn't update cube visualization |
| **SimpleCrimePoints vs DataPoints** | Two different point rendering systems exist - SimpleCrimePoints (POINTS) vs DataPoints (INSTANCED_MESH with shaders) - potential confusion |

### Key Files for Implementation

- `src/components/viz/MainScene.tsx` - TimeSlices already included here
- `src/components/map/MapVisualization.tsx` - Need slice-aware filtering
- `src/store/useCoordinationStore.ts` - `brushRange` already exists but not wired
- `src/hooks/useSelectionSync.ts` - Could extend for slice-based map highlighting
- `src/components/viz/SlicePlane.tsx` - Already has drag interaction

---

*Analysis for STC visualization gap: 2026-06-01*
