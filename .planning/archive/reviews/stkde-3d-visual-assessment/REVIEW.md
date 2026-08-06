---
phase: stkde-3d-visual-assessment
reviewed: 2026-07-25T00:00:00Z
depth: deep
files_reviewed: 18
files_reviewed_list:
  - src/app/stkde-3d/components/Stkde3DScene.tsx
  - src/app/stkde-3d/components/StkdeSliceStack.tsx
  - src/app/stkde-3d/components/AdaptiveWarpAxis.tsx
  - src/app/stkde-3d/components/HotspotTrajectoryOverlay.tsx
  - src/app/stkde-3d/components/StkdeIntensityLegend.tsx
  - src/app/stkde-3d/page.tsx
  - src/app/stkde-3d/lib/timeline-axis.ts
  - src/app/stkde-3d/lib/palette.ts
  - src/app/stkde-3d/lib/volume-encoding.ts
  - src/app/stkde-3d/lib/types.ts
  - src/components/dashboard-demo/Demo3dSpatialView.tsx
  - src/components/dashboard-demo/DemoMapVisualization.tsx
  - src/components/dashboard-demo/DemoComparePanel.tsx
  - src/components/dashboard-demo/DemoCompareStage.tsx
  - src/components/dashboard-demo/DashboardDemoShell.tsx
  - src/components/dashboard-demo/DashboardDemoRailTabs.tsx
  - src/components/dashboard-demo/GlobalWarpControls.tsx
  - src/components/dashboard-demo/ComparisonKdeHeatmap.tsx
  - src/store/useDashboardDemoCoordinationStore.ts
  - src/lib/adaptive-warp-utils.ts
  - src/components/timeline/hooks/useScaleTransforms.ts
  - src/components/dashboard-demo/lib/demo-warp-map.ts
  - src/components/map/MapVisualization.tsx
  - src/hooks/useSelectionSync.ts
findings:
  critical: 2
  warning: 6
  info: 5
  total: 13
status: issues_found
---

# Phase: 2.5D Space-Time Cube — Visual Quality Assessment

**Reviewed:** 2026-07-25
**Depth:** deep
**Files Reviewed:** 18
**Status:** issues_found

## Summary

The 2.5D STKDE cube is a substantial, well-architected visualization that layers KDE heatmap textures onto horizontal planes stacked along a warped time axis. The warp integration correctly remaps temporal position via `resolveWarpedEpochY`, and the adaptive axis visualizes density-driven bin heights. However, two critical issues undermine the visualization's core thesis contribution: (1) the map and 3D cube are **not truly linked** — they are mutually exclusive viewports, not simultaneous views, which weakens the "2.5D constrained representation" claim; and (2) the warp slider's visual effect is obscured because it only affects vertical position, not the slab volume or thickness proportionally. Additionally, the comparison view does not show uniform-vs-adaptive side-by-side in 3D — it shows two 2D heatmaps in different color schemes.

---

## 1. Rendering Code — How STKDE Surfaces Are Rendered

### Architecture

The rendering pipeline is:
- `Stkde3DScene.tsx` → React Three Fiber `<Canvas>` with `@react-three/fiber` + `@react-three/drei`
- `StkdeSliceStack.tsx` → Each time slice is a `<group>` at a warped Y position containing:
  - A `boxGeometry` slab (thickness from `volumeProfile`) with `meshStandardMaterial`
  - A `planeGeometry` heatmap texture on top with `meshBasicMaterial`
  - An underlay plane for depth effect
  - Grid helpers, ring outlines for active/adjacent slices
  - HTML labels via `<Html>` from drei

### Texture Generation

`StkdeSliceStack.tsx:67-101` — `buildHeatmapTexture()`:
- Creates a 256×256 canvas
- For each `KdeCell`, draws radial gradients using `getStkdeIntensityColor()` from `palette.ts`
- Maps cell x/z from [-50,50] → [0, TEXTURE_SIZE]
- Gradient stops: center at full intensity, 42% at 0.72×, 78% at 0.24×, edge transparent
- Produces a `THREE.CanvasTexture` with `LinearFilter` (no mipmaps)

### Materials

| Element | Material | Notable Properties |
|---------|----------|-------------------|
| Slab body | `meshStandardMaterial` | color `#1e40af` (active) / `#334155` (inactive), roughness 0.96, metalness 0.02 |
| Heatmap surface | `meshBasicMaterial` | `map={texture}`, transparent, `side: DoubleSide` |
| Underlay | `meshBasicMaterial` | Same texture, lower opacity, offset -0.03 in Y |
| Grid helper | `meshBasicMaterial` | color `#38bdf8`, very low opacity |
| Active ring | `meshBasicMaterial` | color `#ffffff`, opacity 0.4 |
| Map base plane | `meshBasicMaterial` | CartoDB dark-matter tiles as texture at Y=-38 |

### Critical Finding: No 3D height encoding on KDE surfaces

**CR-01: Heatmap is flat — intensity is color-only, not geometric**

**File:** `StkdeSliceStack.tsx:555-578`
**Issue:** The STKDE heatmap is rendered as a flat plane with color encoding intensity. The thesis contribution is a "2.5D constrained representation" — meaning intensity should be encoded as geometric height (a terrain mesh), not just color on a flat plane. A flat color texture is a 2D heatmap, not a 2.5D surface. The "2.5D" in the cube comes from the time-axis warping and stacked planes, but each individual slice has zero geometric variation in Z — it is purely a 2D colormap projected onto a horizontal plane.

**Fix:** Convert the KDE cell grid into a `BufferGeometry` with vertex displacement:
```tsx
// For each slice, build a subdivided plane geometry and displace vertices
// by intensity value to create a terrain-mesh effect
const geometry = new THREE.PlaneGeometry(100, 100, gridSize, gridSize);
const positions = geometry.attributes.position;
for (let i = 0; i < cells.length; i++) {
  // Displace Y by intensity * heightScale
  positions.setY(i, cells[i].intensity * heightScale);
}
geometry.computeVertexNormals();
```
This would make each slice a true 2.5D surface where peaks correspond to high-density regions, fulfilling the thesis claim.

---

## 2. Warp Integration — How Adaptive Scaling Changes the Cube

### Data Flow

```
GlobalWarpControls (slider 0→3)
  → setWarpFactor(value)  [coordination store]
  → warpFactor / 3 = warpBlend (clamped 0→1)
  → resolveWarpedEpochY(epoch, START_Y, {timeScaleMode, warpBlend, warpMap, ...})
    → toDisplaySeconds(epoch, warpBlend, warpMap, warpDomain)
      = epoch * (1 - warpBlend) + sampleWarpSeconds(epoch, warpMap, warpDomain) * warpBlend
```

**File:** `timeline-axis.ts:24-43` — `resolveWarpedEpochY()` correctly:
1. Checks if adaptive mode is on and warpBlend > 0
2. Transforms the epoch through `toDisplaySeconds` (which blends linear and warped)
3. Maps the display-domain Y to the axis range [-32.625, 67.375]

**File:** `useScaleTransforms.ts:37-44` — `toDisplaySeconds()`:
```ts
const warpedSec = sampleWarpSeconds(linearSec, warpMap, warpDomain);
return linearSec * (1 - warpFactor) + warpedSec * warpFactor;
```
This is a clean linear interpolation between uniform and warped time. As `warpFactor` increases, time positions shift to match density-weighted bins.

### Critical Finding: Warp only affects Y-position, not volume thickness

**CR-02: Warp slider changes slab position but not proportional thickness — the "compression/expansion" visual is weak**

**File:** `Demo3dSpatialView.tsx:251-261` — `volumeProfile` is computed via `buildDurationVolumeProfile()` which does receive warp parameters. However, looking at `volume-encoding.ts:49-67` — `resolveWarpAdjustedDuration()` computes the warp-adjusted duration, which affects the `thickness` field in the profile. But the warp's effect on thickness is subtle because:

1. The thickness range is `0.85 → 5.8` (lerp), with a power-0.9 easing — small dynamic range
2. The warp only adjusts the *duration seconds* used for normalization, not the geometric compression of the axis itself
3. `StkdeSliceStack.tsx:508`: `thickness = (volume?.thickness ?? 0.3) * heightScale` — this is the slab height, not the Y-spacing between slices

The **Y-spacing** between slices is determined by `resolveWarpedEpochY()` which *does* warp, but the slab thickness comes from duration-volume-profile which has a much smaller effect range. The visual result: slices move closer/farther apart (good), but their individual thickness barely changes (missed opportunity).

**Fix:** Make slab thickness proportional to the warp-displaced gap between adjacent slices. When dense time periods are expanded, the slabs in those regions should also be thicker (longer duration = thicker slab). The current `volume-encoding.ts` partially does this but the effect is dampened by the `0.85 → 5.8` lerp range and 0.9 power easing.

---

## 3. Comparison View — Uniform vs Adaptive

### Architecture

The comparison is **not** a side-by-side 3D view. It is:

- **DashboardDemoShell.tsx:19,86-119** — Three mutually exclusive viewports: `'map' | '3d' | 'compare'`
- **DemoCompareStage.tsx:6-40** — The compare view renders two `ComparisonKdeHeatmap` components side-by-side
- **ComparisonKdeHeatmap.tsx** — Renders a 32×32 SVG grid of colored cells (blue scheme for left, orange for right)

### Warning: Comparison does not show uniform vs adaptive in 3D

**WR-01: The "comparison" is 2D slice-vs-slice, not uniform-vs-adaptive 3D**

**File:** `DemoCompareStage.tsx:17-39`
**Issue:** The compare view lets you pick two arbitrary time slices and see their KDE heatmaps in different colors. This is useful for comparing time periods, but it does NOT show the thesis's core contribution: uniform time axis vs adaptive time axis side-by-side. A viewer cannot visually see the difference between the two approaches from this view. The comparison is between slices, not between scaling methods.

**Fix:** Add a true comparison mode that renders two 3D cubes side-by-side (or overlaid with transparency):
- Left cube: linear time axis (uniform spacing)
- Right cube: adaptive time axis (density-warped spacing)
- Same slices, same data, different vertical positioning
This would make the thesis contribution immediately visible.

---

## 4. Map View ↔ 3D Cube Interaction

### Architecture

The map and 3D cube are **mutually exclusive viewports**, not simultaneous views:

**File:** `DashboardDemoShell.tsx:19,161-168`
```tsx
{activeViewport === 'map' ? (
  <DemoMapVisualization stkdeVisible={showStkde} />
) : activeViewport === '3d' ? (
  <Demo3dSpatialView />
) : (
  <DemoCompareStage />
)}
```

Users toggle between map and 3D via buttons in the top-right corner (lines 86-119). They are never visible simultaneously.

### Selection Synchronization

The map and 3D cube do share state through `useDashboardDemoCoordinationStore`:
- `activeSliceIndex` is shared
- `Demo3dSpatialView.tsx:68` reads `activeSliceIndex` from the coordination store
- `DemoMapVisualization.tsx:52` reads `activeSliceIndex` and computes `sliceTimeRange` for filtering

The map filters its crime points by the active slice's time range (`MapVisualization.tsx:74-78`):
```tsx
const filteredData = useMemo(() => {
  if (!sliceTimeRange) return data;
  const [start, end] = sliceTimeRange;
  return data.filter((r) => r.timestamp >= start && r.timestamp <= end);
}, [data, sliceTimeRange]);
```

So when the 3D cube's active slice changes (via playback or scrubbing), the map view filters to that slice's time window. But since they're in separate viewports, the user never sees this simultaneously.

### Warning: Map and cube are not simultaneously visible

**WR-02: The map and 3D cube are mutually exclusive viewports — no simultaneous view**

**File:** `DashboardDemoShell.tsx:161-168`
**Issue:** The "2.5D constrained representation" implies a spatial cube where the map footprint is visible beneath the 3D structure. While the `Stkde3DScene` does render a map texture at Y=-38 (`Stkde3DScene.tsx:433-446`), this is a static CartoDB dark tile — it does not show the same crime data points or STKDE hotspots that the interactive map shows. The user cannot see the 2D map and 3D cube at the same time to understand the spatial correspondence.

**Fix:** Either:
1. Make map and 3D visible simultaneously (split view), or
2. Ensure the static map texture in the 3D scene includes the current STKDE hotspot overlay (not just base tiles)

---

## 5. Visual Encoding — Colors, Opacity, Height, Legend

### Color Palette

**File:** `palette.ts:6-13` — STKDE intensity palette:
```
0.0  → [34, 76, 255]    (deep blue)
0.28 → [0, 212, 255]    (cyan)
0.55 → [42, 255, 163]   (green)
0.75 → [255, 214, 64]   (yellow)
0.9  → [255, 122, 42]   (orange)
1.0  → [255, 64, 96]    (red-pink)
```

This is a perceptually clear sequential palette — good choice.

### Opacity Encoding

**File:** `StkdeSliceStack.tsx:497-519`:
- Active slice: opacity multiplier = 1.0
- Adjacent slice: opacity multiplier = 0.35
- Other slices: opacity multiplier = 0.1
- Volume-based slab opacity: clamped to [0.08, 0.26]
- Surface texture opacity: clamped to [0.16, 0.82]

This creates a clear focus effect — the active slice is bright, neighbors are dim, distant slices are nearly invisible.

### Height/Thickness Encoding

**File:** `volume-encoding.ts:91-113`:
- Thickness: `lerp(0.85, 5.8, eased)` × exaggeration (default 1.15)
- Range: [0.6, 8.5] units
- Longer-duration slices get thicker slabs

### Legend

**File:** `StkdeIntensityLegend.tsx` — Renders:
- Title: "STKDE intensity"
- Color gradient bar (blue → cyan → green → yellow → orange → red)
- Labels: "sparse" → "hot"
- Explanatory text: "Brighter colors mean denser space-time concentration after smoothing"
- Additional note: "Taller stacked slices indicate longer active windows"

This is clear and helpful.

### Warning: Legend does not explain what Y-position means

**WR-03: No legend entry explains what vertical position represents**

**File:** `StkdeIntensityLegend.tsx`
**Issue:** The legend explains color (intensity) and mentions "taller stacked slices indicate longer active windows," but does not explain what the vertical axis represents. A new user seeing stacked planes at different heights has no axis labels, no tick marks, and no indication that Y = time. The `AdaptiveWarpAxis` component (`AdaptiveWarpAxis.tsx`) renders colored bins on the side, but has no text labels for time values.

**Fix:** Add Y-axis labels showing date/time at key positions (e.g., every slice boundary). The `AdaptiveWarpAxis` already computes boundary positions — add `<Html>` labels at each bin boundary showing the date.

---

## 6. The 2.5D Experience — Warp Slider Interaction

### What Happens When the User Adjusts the Warp Slider

1. User moves slider in `GlobalWarpControls.tsx:160-168` (range 0→3)
2. `setWarpFactor(next)` updates the coordination store
3. `warpBlend = warpFactor / 3` (clamped 0→1)
4. Every slice's Y position is recomputed via `resolveWarpedEpochY()`
5. The cube re-renders with slices at new vertical positions
6. The `AdaptiveWarpAxis` bins resize to show the density-weighted time distribution

### Smoothness

The transition is **not animated**. When the slider moves, all slice positions jump to their new Y values instantly. There is no interpolation or spring animation on the Y positions. This is a missed opportunity for a compelling visual effect.

### Warning: No smooth transition animation when warping

**WR-04: Warp slider changes are instantaneous — no morph animation**

**File:** `StkdeSliceStack.tsx:259-271` — `resolveSliceY` is a `useMemo` that recomputes when warp changes.
**Issue:** The cube snaps to the new warped configuration. A smooth morphing animation (e.g., slices gliding to their new positions over 300ms) would make the "adaptive vs linear" difference much more perceptible and compelling. The existing `TRANSITION_DURATION_MS = 240` is used for playback interpolation between slices, not for warp transitions.

**Fix:** Add a spring or tween animation on Y positions when warpBlend changes. Use `useSpring` from `@react-spring/three` or a `useFrame`-based interpolation to smoothly move slices between their old and new Y positions.

---

## Info Findings

### IN-01: `normalizeWarpBlend` is duplicated in 3 files

**Files:** `Stkde3DScene.tsx:25`, `StkdeSliceStack.tsx:23`, `AdaptiveWarpAxis.tsx:19`, `Demo3dSpatialView.tsx:36`
**Issue:** The identical function `normalizeWarpBlend = (warpFactor) => Math.min(1, Math.max(0, warpFactor / 3))` is defined in at least 4 separate files. This is a DRY violation.
**Fix:** Export from a single location (e.g., `timeline-axis.ts` or `adaptive-warp-utils.ts`).

### IN-02: `resolveSliceEpochRange` is duplicated in 3 files

**Files:** `StkdeSliceStack.tsx:44-65`, `Demo3dSpatialView.tsx:38-59`, `DemoMapVisualization.tsx:15-36`
**Issue:** The identical epoch-range resolution logic is copy-pasted across three components.
**Fix:** Extract to a shared utility module.

### IN-03: Map base texture is static CartoDB dark tiles — no data overlay

**File:** `Stkde3DScene.tsx:433-446`
**Issue:** The 3D scene renders a static CartoDB dark-matter base map at Y=-38. This map shows city streets but no crime data, no STKDE hotspots, no district boundaries. The user sees a geographic reference but cannot connect the 3D surfaces to specific locations on the map.
**Fix:** Capture the interactive map (with STKDE overlay) as a texture instead of just the base tiles.

### IN-04: Hotspot trajectory overlay uses `yForIndex` which ignores warp

**File:** `HotspotTrajectoryOverlay.tsx:9,48`
**Issue:** The trajectory overlay imports `yForIndex` from `StkdeSliceStack` and uses it as a fallback when `resolveSliceY` is not provided. `yForIndex(index) = START_Y + index * SLICE_SPACING` — this is the **linear** (unwarped) position. The component does accept a `resolveSliceY` prop, but if the caller forgets to pass it, trajectories will be at wrong Y positions when warping is active.
**Fix:** Make `resolveSliceY` required, not optional.

### IN-05: Volume profile in brushed scope mode hardcodes thickness

**File:** `Demo3dSpatialView.tsx:282-301`
**Issue:** When `cubeScopeMode === 'brushed'`, the cube volume profile is computed with `thickness = Math.max(0.6, percentage * 100)` and `opacity = 0.2`, `falloff = 0.15` — completely bypassing the warp-aware `buildDurationVolumeProfile()`. This means in detail/brushed mode, slabs have uniform-looking thickness regardless of duration.
**Fix:** Use the warp-aware volume profile computation even in brushed mode, or at minimum document why the simplified version is intentional.

---

## Assessment Summary

| Category | Verdict |
|----------|---------|
| **Rendering quality** | Good — clean layered architecture, proper material choices, radial gradient textures are effective |
| **Warp correctness** | Correct — `resolveWarpedEpochY` properly remaps time to Y-position via the warp map |
| **Warp visual impact** | Weak — slice positions change but thickness barely does; no smooth animation |
| **Comparison view** | Misleading — labeled "compare" but does not show uniform-vs-adaptive 3D |
| **Map ↔ cube linking** | Broken — mutually exclusive viewports, not simultaneous |
| **Legend/clarity** | Good color legend, missing Y-axis labels for time |
| **2.5D claim** | Partially fulfilled — the cube stacks 2D heatmaps along a warped axis (2.5D temporal), but each heatmap is flat (not 2.5D spatial) |

### Top 3 Recommendations

1. **CR-01**: Add geometric height encoding to KDE surfaces (vertex displacement) to make each slice a true 2.5D terrain, not a flat color plane
2. **WR-02**: Add a simultaneous map+3D view so the spatial correspondence is visible
3. **WR-04**: Add smooth morph animation when the warp slider changes to make the adaptive effect visceral

---

_Reviewed: 2026-07-25_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
