# UI Control Surfaces & UX Patterns for Burstiness/Clustering

**Analysis Date:** 2026-06-01

---

## 1. UI Control Components for Burstiness/Clustering

### 1.1 BurstList Component
**File:** `src/components/viz/BurstList.tsx`

| Control | Line | Type | Store | Description |
|---------|------|------|-------|-------------|
| `burstThreshold` slider | 323-330 | `Slider` (shadcn) | `useAdaptiveStore` | Range 0-1, step 0.01, shows percentage |
| `burstMetric` select | 338-345 | Native `<select>` | `useAdaptiveStore` | Options: "density", "burstiness" |

**Pattern observed:** The BurstList combines a slider for threshold with a select dropdown for metric selection. Both controls are co-located in a `space-y-3 pb-3 border-b` section.

```tsx
// Lines 323-330 (slider pattern)
<Slider
  min={0} max={1} step={0.01}
  value={[burstThreshold]}
  onValueChange={(vals) => setBurstThreshold(vals[0])}
  className="w-full"
/>

// Lines 338-345 (native select - NOT shadcn Select)
<select
  value={burstMetric}
  onChange={(e) => setBurstMetric(e.target.value as 'density' | 'burstiness')}
  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
>
  <option value="density">Density (event count)</option>
  <option value="burstiness">Burstiness (clustering)</option>
</select>
```

### 1.2 AdaptiveControls Component
**File:** `src/components/timeline/AdaptiveControls.tsx`

| Control | Line | Type | Store | Description |
|---------|------|------|-------|-------------|
| `warpFactor` slider | 85-93 | `Slider` (shadcn) | `useAdaptiveStore` | 0-1 range with preview commit pattern |
| `densityScope` select | 111-120 | Native `<select>` | `useAdaptiveStore` | viewport/global toggle |
| `burstMetric` select | 128-137 | Native `<select>` | `useAdaptiveStore` | density/burstiness |
| `burstThreshold` slider | 146-153 | `Slider` (shadcn) | `useAdaptiveStore` | 0-1 range, shows percentile |

**Key pattern - Preview commit:** The `warpFactor` slider uses a "preview" pattern (lines 16-44) where dragging shows a preview indicator but doesn't commit until slider interaction ends.

### 1.3 DashboardStkdePanel Component
**File:** `src/components/stkde/DashboardStkdePanel.tsx`

| Control | Line | Type | Store | Description |
|---------|------|------|-------|-------------|
| `spatialBandwidthMeters` | 93-106 | Native `<input type="number">` | `useStkdeStore` | Range 100-5000, step 50 |
| `temporalBandwidthHours` | 107-119 | Native `<input type="number">` | `useStkdeStore` | Range 1-168 |
| `gridCellMeters` | 120-131 | Native `<input type="number">` | `useStkdeStore` | Range 100-5000, step 50 |
| `topK` | 132-142 | Native `<input type="number">` | `useStkdeStore` | Range 1-100 |
| `minSupport` | 143-153 | Native `<input type="number">` | `useStkdeStore` | Range 1-1000 |
| `timeWindowHours` | 154-165 | Native `<input type="number">` | `useStkdeStore` | Range 1-168 |
| Scope mode toggle | 61-84 | `<button>` pair | `useDashboardStkde` | applied-slices/full-viewport |

**Layout:** Uses `grid grid-cols-2 gap-2` layout with `<label>` wrapping.

### 1.4 DemoStkdePanel Component
**File:** `src/components/dashboard-demo/DemoStkdePanel.tsx`

| Control | Line | Type | Description |
|---------|------|------|-------------|
| Scope toggle | 89-105 | `<Button>` pair | applied-slices/full-viewport |
| Hotspot list | 110-170 | Clickable card list | Per-hotspot selection with spatial/temporal filter |

**Key change from earlier versions:** No preset buttons remain. The panel now uses `useDemoStkde()` hook for data and `useDashboardDemoCoordinationStore` for state. The `useDashboardDemoAnalysisStore` was deleted in Phase 76. All parameters are preset-only (no individual parameter controls in the demo rail).

### 1.5 BinningControls Component
**File:** `src/components/binning/BinningControls.tsx`

| Control | Line | Type | Description |
|---------|------|------|-------------|
| Neighbourhood select | 307-318 | Native `<select>` | Filter by district |
| Time window start | 323-333 | `<Input type="datetime-local">` | Start time filter |
| Time window end | 338-348 | `<Input type="datetime-local">` | End time filter |
| Generation strategy | 353-363 | Native `<select>` | 8 strategies |
| Granularity buttons | 370-387 | `<button>` grid | hourly/daily/weekly/monthly |
| Crime types | 403-419 | `<button>` toggles | Multi-select tag buttons |
| Save/Load config | 519-545 | `<select>` + `<Input>` | Config management |

**Layout:** Complex grid layout with `md:grid-cols-2 xl:grid-cols-4` responsiveness.

### 1.6 SettingsPanel Component
**File:** `src/components/settings/SettingsPanel.tsx`

| Control | Line | Type | Description |
|---------|------|------|-------------|
| Theme select | 116-127 | `Select` (shadcn) | Appearance |
| Feature flag toggles | 146-153 | `FeatureFlagItem` | Per-flag switches |
| Tabs | 131-156 | `Tabs` (shadcn) | visualization/experimental/accessibility |

---

## 2. Layout Patterns

### 2.1 Resizable Panels
**File:** `src/components/layout/DashboardLayout.tsx`

Uses `react-resizable-panels` for dashboard composition:
```tsx
<Group orientation="vertical" onLayoutChange={setOuterLayout}>
  <Panel id="top" defaultSize={outerLayout.top} minSize={30}>
    <Group orientation="horizontal" onLayoutChange={setInnerLayout}>
      <Panel id="top-left" defaultSize={innerLayout.left} minSize={20}>map</Panel>
      <Separator />
      <Panel id="top-right" defaultSize={innerLayout.right} minSize={20}>cube</Panel>
    </Group>
  </Panel>
  <Separator />
  <Panel id="bottom" defaultSize={outerLayout.bottom} minSize={10}>timeline</Panel>
</Group>
```

### 2.2 Panel Structure Patterns

**Card-based (DemoStkdePanel):**
```tsx
<Card>
  <CardHeader>...</CardHeader>
  <CardContent className="flex flex-col gap-4">
    <Card>inner control group</Card>
    <Card>presets</Card>
    <Card>hotspots list</Card>
  </CardContent>
</Card>
```

**Section-based (DashboardStkdePanel):**
```tsx
<section className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
  <header>...</header>
  <div className="space-y-3">
    {/* controls */}
  </div>
</section>
```

**Grid form (BinningControls):**
```tsx
<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
  <label className="space-y-1 text-xs">
    <span>Field name</span>
    <Input/select className="h-9 w-full..." />
  </label>
</div>
```

### 2.3 Control Spacing Conventions
- Control groups: `space-y-3` with `border-b` dividers
- Individual controls: `space-y-2`
- Labels: `text-xs text-slate-300` with helper text `text-[10px] text-muted-foreground`
- Button groups: `flex items-center gap-2` or `grid gap-2`

---

## 3. Missing Controls for Users

### 3.1 Clustering Controls (DBSCAN)

| Missing Control | Impact | File to Add |
|-----------------|--------|-------------|
| **DBSCAN epsilon (sensitivity)** | No spatial clustering sensitivity slider | `useClusterStore.ts` + cluster controls UI |
| **minPoints parameter** | Can't adjust minimum points per cluster | `src/lib/clustering/cluster-analysis.ts` |
| **Silhouette score display** | No cluster quality metric shown to user | New UI component |
| **Cluster visualization toggle** | Can't turn cluster labels on/off | `ClusterLabels.tsx` + store |

**Evidence of clustering code but no UI:**
- `src/lib/clustering/cluster-analysis.ts` uses DBSCAN from `density-clustering` with `epsilon` and `minPoints`
- `src/components/viz/ClusterManager.tsx` calls `analyzeClusters`
- `src/components/viz/ClusterLabels.tsx` renders cluster labels
- **No user-accessible controls for any of these parameters**

### 3.2 STKDE Controls

| Missing Control | Impact | Current Workaround |
|----------------|--------|-------------------|
| **Spatial bandwidth slider (visual)** | Users must type numbers | Native number inputs (lines 93-106) |
| **Temporal bandwidth slider (visual)** | Users must type numbers | Native number inputs (lines 107-119) |
| **Grid resolution slider** | Can't visually adjust | Type gridCellMeters |
| **Min support slider** | Can't visually adjust | Type minSupport |

### 3.3 Adaptive Time Controls

| Missing Control | Impact | Location |
|----------------|--------|----------|
| **Warp preview mode toggle** | Always on, no way to disable | `AdaptiveControls.tsx` |
| **Automatic/manual warp mode** | No explicit toggle | `useAdaptiveStore.warpControlMode` exists but no UI |
| **Peer-relative warping toggle** | No UI for `peerRelativeWarping` | Store exists, no UI |
| **Per-bin warp override** | No UI for `manualWarpWeightOverrides` | Store exists, no UI |

---

## 4. shadcn/Radix UI Components Available

### 4.1 Component Inventory
**File:** `src/components/ui/`

| Component | Radix Primitive | Used in Controls? |
|-----------|----------------|-------------------|
| `Slider` | `@radix-ui/react-slider` | ✅ BurstList, AdaptiveControls |
| `Select` | `@radix-ui/react-select` | ✅ SettingsPanel |
| `Switch` | `@radix-ui/react-switch` | ❌ Not used in any control panel |
| `Button` | - | ✅ Everywhere |
| `Label` | - | ✅ Forms |
| `Input` | - | ✅ BinningControls |
| `Tabs` | `@radix-ui/react-tabs` | ✅ SettingsPanel |
| `Sheet` | `@radix-ui/react-dialog` | ✅ SettingsPanel (drawer) |
| `Card` | - | ✅ DemoStkdePanel |
| `Badge` | - | ✅ Status indicators |
| `Dialog` | `@radix-ui/react-dialog` | Available |
| `AlertDialog` | `@radix-ui/react-alert-dialog` | Available |
| `Popover` | `@radix-ui/react-popover` | Available |
| `Tooltip` | `@radix-ui/react-tooltip` | Available |
| `Accordion` | `@radix-ui/react-accordion` | Available |

### 4.2 Component Usage Patterns

**Slider (shadcn) - Preferred pattern:**
```tsx
import { Slider } from '@/components/ui/slider';
<Slider
  min={0} max={1} step={0.01}
  value={[value]}
  onValueChange={(vals) => setValue(vals[0])}
  className="w-full"
/>
```

**Native select (NOT shadcn - inconsistency):**
```tsx
// Lines 338-345 in BurstList.tsx — uses native <select>
<select
  value={burstMetric}
  onChange={(e) => setBurstMetric(e.target.value as 'density' | 'burstiness')}
  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
>
```

**Should use shadcn Select:**
```tsx
<Select value={burstMetric} onValueChange={(v) => setBurstMetric(v as typeof burstMetric)}>
  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="density">Density (event count)</SelectItem>
    <SelectItem value="burstiness">Burstiness (clustering)</SelectItem>
  </SelectContent>
</Select>
```

### 4.3 Missing shadcn Components Needed

| Component | Purpose | Priority |
|-----------|---------|----------|
| `Slider` | Already available ✅ | - |
| `Switch` | Toggle controls (e.g., warp preview on/off) | HIGH |
| `Select` | Replace native selects for consistency | MEDIUM |
| `Tooltip` | Add explanatory tooltips to controls | MEDIUM |

---

## 5. Dashboard Layout Patterns

### 5.1 Panel Arrangement
**Primary pattern:** Left panel (map) + Right panel (cube) + Bottom panel (timeline)

```
┌─────────────────────────────────────┐
│  LEFT (map)    │    RIGHT (cube)     │  ← Top Group (resizable)
├───────────────┴──────────────────────┤
│         BOTTOM (timeline)            │  ← Bottom Panel (resizable)
└─────────────────────────────────────┘
```

### 5.2 Control Panel Placement

| Panel Location | Contents | Resizable |
|--------------|----------|-----------|
| `leftPanel` slot | Map + map controls | Yes (minSize 20%) |
| `topRightPanel` slot | 3D cube + controls | Yes (minSize 20%) |
| `bottomRightPanel` slot | Timeline + burst controls | Yes (minSize 10%) |

### 5.3 Floating Controls

| Component | File | Position | Pattern |
|-----------|------|----------|---------|
| `TimeControls` | `src/components/ui/TimeControls.tsx` | Fixed bottom | Full-width bar |
| `StudyControls` | `src/components/study/StudyControls.tsx` | Fixed bottom-left | Collapsible panel |

**Note:** `FloatingToolbar` is now re-exported as `Controls` from `src/components/viz/Controls.tsx`.

---

## 6. Preset vs Individual Controls Pattern

### 6.1 Preset Pattern (DemoStkdePanel — DEPRECATED)

DemoStkdePanel **no longer has presets**. The panel now uses a simplified scope toggle (applied-slices/full-viewport) via `useDemoStkde()` hook. All STKDE parameters are preset-only (fixed values set by the hook, no individual parameter controls).

The `useDashboardDemoAnalysisStore` that previously managed presets was deleted in Phase 76. State is now in `useDashboardDemoCoordinationStore`.

### 6.2 Config Save/Load Pattern (BinningControls)
**File:** `src/components/binning/BinningControls.tsx` (lines 516-546)

```typescript
// Save config
const [showSaveDialog, setShowSaveDialog] = useState(false);
const [configName, setConfigName] = useState('');

// Dialog for naming config
{showSaveDialog && (
  <div className="flex gap-2">
    <Input value={configName} onChange={(e) => setConfigName(e.target.value)} />
    <Button size="sm" onClick={handleSaveConfig}>Save</Button>
  </div>
)}

// Load config dropdown
{savedConfigs.length > 0 && (
  <select onChange={(event) => onLoadConfig?.(event.target.value)}>
    <option value="">Load config</option>
    {savedConfigs.map((config) => (
      <option key={config.id} value={config.id}>{config.name}</option>
    ))}
  </select>
)}
```

### 6.3 Individual Control Pattern (DashboardStkdePanel)
Direct number inputs with immediate parameter application:
```tsx
<input
  type="number"
  min={STKDE_PARAM_LIMITS.spatialBandwidthMeters.min}
  max={STKDE_PARAM_LIMITS.spatialBandwidthMeters.max}
  step={50}
  value={params.spatialBandwidthMeters}
  onChange={(event) => setParams({ spatialBandwidthMeters: parseNumericInput(event.target.value) })}
/>
```

---

## 7. Accessibility Patterns

### 7.1 Button Accessibility
```tsx
// Line 355-360 in BurstList.tsx
<button
  type="button"
  onClick={() => handleSelectWindow(window)}
  aria-pressed={isSelected}
  aria-label={`Burst ${index + 1}. Peak ${Math.round(window.peak * 100)}%. Selects existing burst slice.`}
>
```

### 7.2 Label Associations
```tsx
// Standard label pattern
<label className="space-y-1 text-xs text-slate-300">
  <span>Field Name</span>
  <input className="..." />
</label>
```

### 7.3 Status Announcements
- `aria-pressed` for toggle button states
- `aria-label` for icon-only buttons
- `aria-invalid` styling for error states
- Status badges with `rounded-full border` styling

### 7.4 Missing Accessibility
- No `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` on custom sliders
- No live regions for status updates
- No keyboard navigation documented for custom controls

---

## 8. Parameter Propagation Pattern

### 8.1 Store Update Flow

```
User Interaction → Component State → Store Setter → Zustand Store
                                                        ↓
                                              Side Effects (if any)
                                                        ↓
                                              Dependent Components Re-render
```

### 8.2 BurstThreshold Example
**File:** `src/store/useAdaptiveStore.ts` (lines 142-146)

```typescript
setBurstThreshold: (v) =>
  set((state) => ({
    burstThreshold: v,
    burstCutoff: resolveBurstMap(state) ?
      computePercentile(resolveBurstMap(state) as Float32Array, v) :
      state.burstCutoff
  })),
```

**Flow:**
1. User drags slider → `onValueChange` fires
2. `setBurstThreshold(vals[0])` called
3. Store updates `burstThreshold` AND recomputes `burstCutoff`
4. All components subscribed to `burstThreshold` or `burstCutoff` re-render

### 8.3 STKDE Parameter Example
**File:** `src/store/useStkdeStore.ts` (lines 92-132)

```typescript
setParams: (patch) =>
  set((state) => ({
    params: {
      ...state.params,
      spatialBandwidthMeters: coerceClampedParam(
        patch.spatialBandwidthMeters,
        state.params.spatialBandwidthMeters,
        STKDE_PARAM_LIMITS.spatialBandwidthMeters.min,
        STKDE_PARAM_LIMITS.spatialBandwidthMeters.max
      ),
      // ... other params with clamping
    },
  })),
```

### 8.4 Heavy Computation (Web Workers)
**File:** `src/store/useAdaptiveStore.ts` (lines 182-201)

```typescript
computeMaps: (timestamps, domain, options) => {
  if (!worker) return;
  activeRequestId += 1;
  set({ isComputing: true, mapDomain: domain });

  const timestampsCopy = timestamps.slice();
  worker.postMessage({
    requestId, timestamps: timestampsCopy, domain,
    config: { binCount: ADAPTIVE_BIN_COUNT, kernelWidth: ADAPTIVE_KERNEL_WIDTH, binningMode }
  }, [timestampsCopy.buffer]);
}
```

**Worker response updates store (lines 73-95):**
```typescript
worker.onmessage = (e) => {
  const { requestId, densityMap, burstinessMap, warpMap, countMap } = e.data;
  if (requestId !== activeRequestId) return; // Ignore stale responses
  set((state) => ({
    densityMap, burstinessMap, countMap, warpMap, isComputing: false,
    burstCutoff: computePercentile(..., state.burstThreshold)
  }));
};
```

### 8.5 STKDE API Call Pattern
**File:** `src/components/stkde/lib/useDashboardStkde.ts` (lines 200-281)

```typescript
const runStkde = useCallback(async () => {
  startRun();
  const result = await fetch('/api/stkde/hotspots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, filters: { bbox }, params, limits: DEFAULT_LIMITS }),
  });
  const response = sanitizeResponseSize(await result.json());
  const projectedRows = await projectHotspotsWithWorker(response.hotspots);
  finishRunSuccess({ ...response, hotspots: projectedRows });
}, [params, scopeMode, /* ... dependencies */]);
```

---

## 9. Summary: Controls Inventory

| Control | Component | File:Line | Type | Store |
|---------|-----------|-----------|------|-------|
| burstThreshold | BurstList, AdaptiveControls | `BurstList.tsx:323`, `AdaptiveControls.tsx:146` | shadcn Slider | useAdaptiveStore |
| burstMetric | BurstList, AdaptiveControls | `BurstList.tsx:338`, `AdaptiveControls.tsx:128` | native select | useAdaptiveStore |
| warpFactor | AdaptiveControls | `AdaptiveControls.tsx:85` | shadcn Slider | useAdaptiveStore |
| densityScope | AdaptiveControls | `AdaptiveControls.tsx:111` | native select | useAdaptiveStore |
| spatialBandwidthMeters | DashboardStkdePanel | `DashboardStkdePanel.tsx:93` | input number | useStkdeStore |
| temporalBandwidthHours | DashboardStkdePanel | `DashboardStkdePanel.tsx:107` | input number | useStkdeStore |
| gridCellMeters | DashboardStkdePanel | `DashboardStkdePanel.tsx:120` | input number | useStkdeStore |
| topK | DashboardStkdePanel | `DashboardStkdePanel.tsx:132` | input number | useStkdeStore |
| minSupport | DashboardStkdePanel | `DashboardStkdePanel.tsx:143` | input number | useStkdeStore |
| timeWindowHours | DashboardStkdePanel | `DashboardStkdePanel.tsx:154` | input number | useStkdeStore |
| scopeMode | Multiple | various | button pair | useStkdeStore / useDashboardDemoCoordinationStore |
| binning strategy | BinningControls | `BinningControls.tsx:353` | native select | useBinningStore |
| granularity | BinningControls | `BinningControls.tsx:370` | button grid | useTimeslicingModeStore |
| crimeTypes | BinningControls | `BinningControls.tsx:403` | button toggles | useTimeslicingModeStore |

---

*UI Control Surfaces & UX Patterns audit: 2026-06-01*
