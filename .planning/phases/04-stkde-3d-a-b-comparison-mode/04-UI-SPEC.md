---
phase: 04
slug: stkde-3d-a-b-comparison-mode
status: draft
shadcn_initialized: true
preset: new-york / radix / neutral / CSS variables
created: 2026-08-01
---

# Phase 04 — UI Design Contract

> Visual and interaction contract for the `/stkde-3d` A/B comparison phase. This is the source of truth for implementation and screenshot review; it preserves the existing desktop-first STKDE-3D route rather than redesigning the dashboard control layer.

---

## Upstream Locks Applied

- Comparison is an explicit mode entered from the existing full ten-slice stack; the default route remains stack view.
- A and B are temporary references to two existing rendered intervals. They never create duplicate or persistent slices.
- Absolute comparison is two focused viewports arranged vertically: A on top, B below.
- Completing A/B selection locks the pair. `Reset comparison` is the explicit path back to A selection; clicking another surface never silently replaces a completed slot.
- Built-in comparison presets contain exact, distinct A/B interval identities and must validate dataset, slice index, and epoch bounds before rendering.
- Absolute views retain the existing sequential KDE palette and share one absolute color domain.
- Difference mode is one top-down 2D `KDE(A) - KDE(B)` field, heatmap-only, with a symmetric zero-centered domain.
- Difference encoding is red-neutral-blue: red means A-dominant, neutral means zero/no difference, and blue means B-dominant.
- Linked cameras are on by default. Re-enabling the link immediately snaps B to A, then keeps both poses synchronized. `Reset views` restores both to the front-oblique pose.

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui |
| Preset | new-york style, Radix base, neutral base color, CSS variables; `npx shadcn info` reports no preset code |
| Component library | Radix primitives through shadcn/ui |
| Icon library | Lucide React, already used by the route |
| Font | Geist for UI and labels; Geist Mono for dates, counts, indices, and numeric values |
| Styling | Existing Tailwind CSS v4 tokens in `src/app/globals.css`; no second styling system |

Use the installed shadcn primitives where they improve semantics: `Button`, `Card`, `Label`, `Select`, `Slider`, `Switch`, `Tabs`, `Tooltip`, and `Skeleton`. Existing route-local classes may remain where they are already the established pattern. Do not add a registry block or a new component library.

## Layout Hierarchy

### Page frame

1. Preserve the current `/stkde-3d` frame: `min-h-dvh`, `max-w-[1920px]`, 16px page padding on desktop and 16px on narrow widths, with no horizontal overflow.
2. Keep the existing route header at the top. It contains the `STKDE 3D` identifier, playback/view controls, existing analysis toggles, and the explicit `Compare intervals` entry point.
3. Keep the desktop two-column body at `lg`: a flexible visualization stage on the left and an approximately 288px control rail on the right, separated by a 16px gap.
4. On widths below `lg`, collapse to one column in this order: comparison/stack stage, comparison status and controls, then the existing KDE and analysis controls. The rail must remain scrollable without shrinking a WebGL viewport to zero.

### Comparison stage

The stage is a single rounded analytical surface with a thin border and the existing warm neutral canvas treatment. It must read as one matched comparison, not two unrelated cubes.

- **Selecting state:** keep the existing ten-slice stack visible. Add a compact DOM interval picker in the rail as the keyboard-accessible equivalent of clicking a rendered surface. Show the current prompt above the stage: `Select interval A` or `Select interval B`. The selected surface gets the existing warm accent ring; no new slice geometry is created.
- **Absolute state:** render exactly two focused viewports in a vertical CSS grid. A is always the top row and B is always the bottom row. Each row contains one selected temporal slab/surface, its spatial KDE, the shared map context, and a DOM overlay header. There is no additive A+B geometry and no second full ten-slice cube.
- **Difference state:** replace both absolute viewports with exactly one top-down 2D field over the same spatial extent. Keep A/B metadata in the DOM header and controls. Do not add a temporal axis, lifted slab, events, trajectories, burst volume, or unrelated volume geometry.

### Viewport anatomy

Each absolute viewport has this hierarchy:

1. A 32px metadata strip inside the viewport: `A` or `B`, interval label, start/end time, and event count.
2. The focused R3F scene below the strip, with the same map extent, projection, KDE parameters, adaptive-time setting, renderer, and absolute domain in both panes.
3. A shared `STKDE intensity` legend positioned in the stage chrome, not duplicated inside both panes.

The difference viewport has:

1. A 32px strip reading `A − B difference` and `KDE(A) − KDE(B)`.
2. One top-down signed field with the geographic base map retained as context.
3. An expanded signed legend with text labels `B higher`, `0 / no difference`, and `A higher`.

### Control rail anatomy

1. **Case study:** existing case-study selector and range label remain first. Changing the case study clears A/B and returns to A selection after the new dataset is ready.
2. **Comparison section:** mode status, built-in comparison preset selector, A and B metadata cards, selection prompt, and `Reset comparison` / `Back to stack` actions.
3. **View controls:** `Absolute` and `A − B difference` tabs; `Linked cameras` switch; `Reset views` button. `Absolute` is the default mode after a valid pair is selected.
4. **Existing analysis controls:** KDE tuning, renderer, adaptive time, active events, trajectories, opacity, matching, inspector, and scrubber remain in the established rail. In difference mode, event and trajectory controls remain visible only if needed for route continuity and are disabled with an explanatory message because the difference layer is heatmap-only.

### Component inventory

The planner may consolidate files, but the contract requires these visual responsibilities:

| Surface | Contract |
|---------|----------|
| Comparison stage | Orchestrates `selecting`, `absolute`, and `difference` without adding a persistent store or slice collection |
| Interval picker | Lists all currently rendered intervals with exact label, bounds, and event count; supports A/B assignment and keyboard access |
| A/B metadata cards | Shows slot, interval identity, start/end time, event count, and locked/selected state |
| Focused comparison viewport | One independent camera/event surface per pane; A above B; shared analytical context |
| Signed difference viewport | One top-down field, zero-centered domain, geographic context only |
| Absolute legend | Reuses the existing field/legacy KDE palette and labels low-to-high intensity |
| Signed legend | Uses the dedicated red-neutral-blue scale and states sign meaning in text |

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gaps, legend stop spacing, metadata separation |
| sm | 8px | Control group gaps, viewport gap, compact card padding |
| md | 16px | Page padding, body grid gap, default section padding |
| lg | 24px | Major section padding and rail group separation |
| xl | 32px | Comparison stage inset and viewport metadata band |
| 2xl | 48px | Large stage separation or empty-state breathing room |
| 3xl | 64px | Page-level breathing room only; not used inside the dense rail |

Exceptions: icon-only or switch controls must expose a 44px minimum hit area on narrow/touch widths; the visual glyph may remain 16px. Each comparison viewport must have a real minimum height of 320px so R3F never receives an auto-height parent. Desktop absolute panes use a 20rem minimum row height; narrow panes retain the same vertical A-over-B order and may grow with page height.

## Responsive Behavior

- **`lg` and wider:** stage and 288px rail sit side-by-side. Absolute comparison is two equal vertical rows in the stage. Do not switch to side-by-side A/B panes.
- **Below `lg`:** stage becomes full width and the rail moves below it. The comparison stage remains a two-row grid. Keep `min-h-0 min-w-0` on grid children and provide explicit pane heights.
- **Below `sm`:** header controls wrap into full-width rows; mode tabs become a full-width two-column control; metadata cards stack; the interval picker uses one column if two columns would truncate labels. Never horizontally scroll the page to preserve a control row.
- **Narrow viewport minimums:** each absolute pane is at least 320px high; the difference map is at least 320px high. Use page scrolling rather than clipping or overlaying A and B.
- **Long labels:** interval labels may wrap to two lines in metadata cards. Dates and event counts use tabular numerals and may wrap only at the separator. Preserve full values in a `title`/tooltip and accessible name; do not hide interval identity behind ellipsis alone.

## Typography

| Role | Size | Weight | Line Height |
|------|--------|--------|-------------|
| Body | 14px | 400 regular | 1.5 |
| Label | 10px | 600 semibold | 1.2 |
| Heading | 20px | 600 semibold | 1.2 |
| Display | 28px | 600 semibold | 1.15 |

Only two weights are permitted: 400 and 600. Use the existing uppercase, wide-tracked 10px label treatment for rail section labels and viewport metadata. Use Geist Mono at 400 for dates, counts, slice indices, and numeric KDE/domain values; never use color alone to convey sign or status.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f4f1eb` / existing scene neutral, mapped through a project token | Canvas backing, comparison stage field, zero-difference neutral context |
| Secondary (30%) | `var(--card)` / `#ffffff` | Header, rail, metadata bands, cards, interval picker, legends |
| Accent (10%) | `#b45309` / existing warm KDE interaction accent | `Compare intervals`, selected A/B borders, active controls, selected interval focus rings only |
| Destructive | `var(--destructive)` | Load failure actions or genuinely destructive system errors only; never use for signed KDE meaning |

Accent reserved for: the `Compare intervals` CTA, selected A/B outlines, the active `Absolute`/difference tab indicator, and selected/active route toggles. Neutral borders, hover states, and informational text use existing `border`, `muted`, and `muted-foreground` tokens rather than consuming the accent.

### Data color tokens

Absolute views must reuse the existing `src/app/stkde-3d/lib/palette.ts` stops, including the field/legacy choice. Do not reinterpret the sequential warm cream-to-red palette for signed values. The comparison absolute domain is shared by A and B.

Difference mode uses one fixed symmetric scale with these semantic stops:

| Signed value | Token | Meaning |
|--------------|-------|---------|
| `-1` / strong negative | `#175CD3` | B-dominant: KDE(B) is higher |
| `-0.5` | `#84CAFF` | Moderately B-dominant |
| `0` | `#F4F1EB` | Neutral / no KDE difference |
| `+0.5` | `#FDA29B` | Moderately A-dominant |
| `+1` / strong positive | `#B42318` | A-dominant: KDE(A) is higher |

The signed domain is symmetric around zero. The legend and supporting copy must state `red = A higher`, `blue = B higher`, and `neutral = no difference`; the field must remain interpretable in grayscale or without color perception.

## Stateful Controls and Interaction Contract

### Entry, selection, and reset

- The default route opens in full stack view with the existing controls unchanged. `Compare intervals` is a visible, text-labeled button in the route header or comparison section.
- Activating `Compare intervals` pauses playback and enters `selecting` with `activeSlot = A`. Show `Select interval A` in both the stage status and an `aria-live="polite"` region.
- The first click on a rendered surface or interval-picker button assigns A and automatically advances to B. Show the A outline and `Select interval B` without requiring a second mode change.
- Selecting the same source interval for B is rejected. Keep A selected and show the inline message `Choose a different interval for B.` Do not mutate the pair or create a duplicate slice.
- After B is assigned, enter `absolute` and lock the pair. A new surface click cannot replace either slot.
- `Reset comparison` clears both temporary references, returns to A selection, and announces `Comparison reset. Select interval A.` It does not require a confirmation modal because the action is explicitly labeled and the references are temporary; it does not delete data.
- `Back to stack` exits comparison and restores the existing full ten-slice stack. It does not alter the dataset, KDE settings, or persistent slice domain.

### A/B metadata and exact presets

- Each slot card is labeled exactly `A` or `B` and includes the rendered interval label, full start/end time, and event count.
- The preset selector is labeled `Comparison preset`. Every item must expose the exact dataset preset and exact A/B pair, for example `{dataset label} · {A interval} vs {B interval}`. A display nickname is never sufficient.
- Loading a preset applies dataset, A/B interval identities, KDE parameters, adaptive time, renderer, layer, view mode, and front-oblique camera together. The UI may show `Loading comparison preset…` while the dataset resolves.
- The exact pair is validated by source slice ID/index and epoch bounds. If it cannot be resolved, show the comparison error state and do not select a nearby interval or silently fall back.
- Presets are code-defined and reproducible. Do not expose save, share, URL encoding, or persistent comparison actions in this phase.

### Absolute and difference modes

- Use a two-option tab control with exact labels `Absolute` and `A − B difference`. The selected tab is visible in the DOM and in the stage heading.
- `Absolute` shows two focused panes with a shared sequential color domain. Shared KDE, adaptive-time, renderer, and dataset changes update both panes consistently without clearing A/B.
- `A − B difference` replaces the pair with one top-down field. It uses raw aligned KDE values, a symmetric domain, and the signed palette above. It retains A/B metadata but hides events, trajectories, additive overlays, burst geometry, and temporal-axis cues.
- Difference mode disables event and trajectory toggles semantically, with helper copy `Unavailable in A − B difference view: signed heatmap only.` Do not leave them visually checked as if they were rendering.

### Cameras

- `Linked cameras` is a labeled switch and defaults on for every newly completed pair and preset.
- With linking on, rotation, pan, and zoom in either absolute viewport mirror orientation, target, and zoom in the other viewport.
- Turning linking off preserves the current matched pose and permits independent inspection.
- Turning linking back on immediately snaps B to A's current pose before subsequent synchronization. Show the checked state immediately; do not wait for another pointer event.
- `Reset views` applies the same front-oblique camera pose to both panes. It uses a short transition unless reduced motion is requested.
- Camera pose changes stay imperative and do not appear as noisy numeric UI. The DOM must still expose `Linked cameras: on/off` for evaluation.

### Existing controls

- Preserve case-study selection, KDE tuning, heatmap renderer, adaptive time, active events, trajectories, opacity, matching, inspector, and scrubber in stack mode.
- Preserve the shared analytical controls in absolute comparison mode; changes recompute both panes under the same context.
- Do not redesign the dashboard map/timeline or move this comparison state into the persistent Zustand slice domain.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Compare intervals` |
| Selection prompt A | `Select interval A` |
| Selection prompt B | `Select interval B` |
| Pair-ready status | `A/B comparison ready` |
| Absolute mode label | `Absolute` |
| Difference mode label | `A − B difference` |
| Camera control | `Linked cameras` |
| Camera reset | `Reset views` |
| Comparison reset | `Reset comparison` |
| Exit action | `Back to stack` |
| Empty state heading | `No intervals available` |
| Empty state body | `This case study returned no rendered intervals. Choose another case study or retry loading.` |
| Loading state | `Loading {case study} data…` |
| Preset loading state | `Loading comparison preset…` |
| Error state | `Unable to load {case study} data. Retry loading or choose another case study.` |
| Comparison error | `This comparison could not be resolved. Reset comparison and select two distinct intervals.` |
| Duplicate selection | `Choose a different interval for B.` |
| Invalidated selection | `The dataset changed. Select new A and B intervals.` |
| Fewer-than-two state | `Comparison needs at least two rendered intervals.` |
| Difference helper | `Red = A higher · Neutral = no difference · Blue = B higher` |
| Heatmap-only helper | `Unavailable in A − B difference view: signed heatmap only.` |
| Reset comparison: confirmation approach | No modal confirmation. The explicit action clears temporary references only, then announces `Comparison reset. Select interval A.` |

Avoid unexplained `delta`, `field`, or `mode` labels in the user-facing comparison controls. Keep the mathematical label `KDE(A) − KDE(B)` visible in difference mode.

## UI State Coverage

### Loading

- Before the dataset exists, retain the page frame and show a stage-sized skeleton matching the stack/viewport footprint plus rail section skeletons. Do not show a centered spinner that changes layout.
- During a preset or KDE recomputation, preserve stage dimensions and A/B metadata. Apply a quiet translucent loading veil with `Loading comparison preset…` or a specific analytical loading message; do not show stale data as ready.
- The ready state is exposed after both the dataset and selected field are available. A screenshot must not capture a blank Canvas with no status.

### Empty and partial

- Zero rendered intervals uses the documented `No intervals available` heading/body and disables `Compare intervals`.
- One rendered interval shows it in the interval picker, leaves B unavailable, and displays `Comparison needs at least two rendered intervals.`
- A selected with no B uses the B prompt and keeps the existing stack visible. A is never cleared by a failed duplicate B selection.
- Missing KDE data for one selected interval is an inline comparison error, not a neutral zero field. Do not imply that missing data equals no difference.

### Error and invalidation

- Data-load failure offers a visible `Retry loading` action and the existing case-study selector. If the application falls back to mock data, expose a non-blocking `Using mock data` warning instead of silently presenting it as live data.
- Exact-pair preset mismatch is a visible error with `Reset comparison`; never choose a closest label or stale source ID.
- Changing dataset/case study clears A/B immediately enough to prevent stale geometry, then returns to A selection when the new data is ready. KDE/adaptive/renderer changes recompute the same A/B references.

### Populated and overflow

- The normal populated state shows two clearly labeled panes, both A/B metadata cards, the active comparison tab, link state, shared legend, and the existing control rail.
- Ten interval entries remain usable in the picker. The picker may scroll within the rail, but the page and stage must not horizontally overflow.
- Interval labels wrap to two lines; full dates, counts, and source identity remain available to assistive technology and tooltip/title text.
- Difference with an all-zero field renders the neutral color across the map and states `0 / no difference`; it is valid data, not an error.

## Accessibility

- Use semantic `main`, `header`, `aside`, `section`, headings, labels, and real buttons/selects/switches/tabs. Do not make a `div` the only control for selecting a slice.
- Provide a DOM interval picker for all rendered slices. Each item is a button with an accessible name containing slot eligibility, interval label, full time range, and event count; `aria-pressed` exposes A/B selection.
- The rendered WebGL stack and each focused viewport receive stable accessible labels such as `Interactive focused 3D viewport for interval A, {interval label}`. The DOM controls remain the authoritative keyboard path.
- Use `aria-live="polite"` for selection, reset, loading completion, invalidation, and duplicate-selection messages. Never communicate selection only by an outline or color.
- Mode tabs use keyboard tab semantics and expose the active `Absolute` or `A − B difference` state. The camera switch exposes `Linked cameras` with its checked state; `Reset views` is always keyboard reachable.
- Maintain visible `:focus-visible` rings using the existing ring token. Interactive hit targets are at least 44px on narrow/touch layouts; dense desktop controls may remain 32px high where the surrounding label is still reachable.
- Signed semantics are redundant: the legend has text labels, supporting copy states the sign, and A/B metadata remains visible. Red and blue are never the only distinction.
- Use `title` or a Radix tooltip for truncated interval labels, but do not put essential identity only in a tooltip.

## Motion and Interaction Feedback

- Entering comparison, assigning a slot, switching view modes, and updating selection outlines use opacity/border transitions of 160–220ms. Do not animate layout dimensions or cause the stage to jump.
- `Reset views` may use the existing CameraControls smooth transition, capped at 300ms. Re-linking cameras is immediate for the B snap, as required by the locked decision.
- Do not add continuous decorative motion to the comparison UI. Analytical canvas interaction remains user-driven; playback is paused when entering selection.
- All transitions and camera easing must respect `prefers-reduced-motion: reduce`: switch to immediate state changes, disable interpolation, and avoid animated skeleton shimmer. The comparison remains fully usable.
- Buttons use the existing tactile pressed/disabled behavior, never a glow. Loading uses fixed-size skeletons or a quiet overlay, not a layout-shifting spinner.

## Screenshot and Evaluation Observability

The implementation must expose stable, human-readable state markers so screenshot review and automated source/DOM checks can distinguish the contract states without inferring them from WebGL pixels.

| Marker | Required value |
|--------|----------------|
| Comparison stage root | `data-comparison-stage` |
| Comparison mode | `data-comparison-mode="selecting\|absolute\|difference"` |
| Render readiness | `data-render-status="loading\|ready\|empty\|error"` |
| Active selection slot | `data-selection-slot="A\|B"` while selecting |
| Camera link state | `data-camera-linked="true\|false"` in absolute mode |
| Viewport identity | `data-interval-slot="A\|B"` and `data-source-slice-id` on each absolute pane |
| Difference field | `data-difference-field="signed-kde"` in difference mode |
| Preset identity | `data-comparison-preset-id` when a built-in preset is active |

Required screenshot checkpoints:

1. Default `/stkde-3d` stack view with no comparison state.
2. Selecting state with `Select interval A` and the ten rendered surfaces still visible.
3. A selected / B pending state with A metadata and `Select interval B` visible.
4. Absolute preset state with A above B, exact metadata, `Absolute` active, `Linked cameras` on, shared intensity legend, and `Reset views` visible.
5. Absolute unlinked state with `Linked cameras` off and both panes still usable.
6. Difference preset state with one top-down field, A/B metadata, `A − B difference` active, and the expanded red-neutral-blue legend visible.
7. Loading, no-interval, and error states at the same stage dimensions as the ready state.

For screenshot stability, wait for `data-render-status="ready"`, use a built-in exact-pair preset, and honor reduced motion. Do not require a reviewer to hover a WebGL surface to discover A/B identity, sign meaning, or camera-link state.

## UI Considerations

Applicable state considerations resolved: 8 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Dataset, rendered interval picker, comparison stage | ✅ covered | Zero rendered intervals use the documented `No intervals available` copy, retain the frame, and disable comparison entry. |
| loading | Dataset stage, both Canvas panes, preset controls | ✅ covered | Fixed-size stage/viewport skeletons and explicit loading status preserve dimensions during data or preset resolution. |
| error | Dataset load, exact-pair preset, KDE comparison field | ✅ covered | Inline error copy names the failure and provides retry, case-study change, or `Reset comparison`; missing data is not treated as neutral. |
| populated | Stack, selection stage, absolute pair, signed difference map | ✅ covered | Ready screenshots expose mode, A/B identity, metadata, legend, and camera-link state in DOM and visual chrome. |
| partial | A selected without B, one available rendered interval, incomplete preset | ✅ covered | B remains pending with a live prompt; fewer than two intervals and unresolved presets have explicit non-rendering states. |
| overflow | Rail, interval picker, metadata cards, narrow header | ✅ covered | Rail scrolls vertically, picker may scroll internally, labels wrap to two lines, and narrow controls wrap without page-level horizontal overflow. |
| zero-one-many | Rendered interval picker and A/B slots | ✅ covered | Zero, one, and many interval states have distinct copy and selection behavior; only two distinct references can complete comparison. |
| long-text | Case-study labels, interval metadata, preset labels, live status | ✅ covered | Full values remain in accessible names/title text; visual labels wrap or truncate without hiding identity or pushing the stage width. |

## Registry Safety

Phase 4 uses only the repository's existing/official shadcn primitives. No third-party registry blocks are used.

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official / repository existing primitives | Button, Card, Label, Select, Slider, Switch, Tabs, Tooltip, Skeleton | not required; no third-party blocks |

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
