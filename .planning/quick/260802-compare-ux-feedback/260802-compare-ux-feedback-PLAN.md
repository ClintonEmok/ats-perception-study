---
id: 260802-compare-ux-feedback
description: "Redesign only /stkde-3d comparison mode from Phase 4 UX feedback."
status: planned
mode: quick
validated: true
files_modified:
  - src/app/stkde-3d/components/StkdeComparisonControls.tsx
  - src/app/stkde-3d/components/StkdeComparisonStage.tsx
  - src/app/stkde-3d/components/StkdeComparisonViewport.tsx
  - src/app/stkde-3d/components/StkdeDifferenceScene.tsx
  - src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx
  - src/app/stkde-3d/lib/comparison.ts
  - src/app/stkde-3d/lib/comparison-difference.ts
  - src/app/stkde-3d/lib/comparison-map.ts
  - src/app/stkde-3d/page.tsx
  - src/app/stkde-3d/lib/comparison.test.ts
  - src/app/stkde-3d/lib/comparison-map.test.ts
  - src/app/stkde-3d/lib/comparison-source-context.test.ts
  - src/app/stkde-3d/lib/comparison-difference.test.ts
  - src/app/stkde-3d/page.stkde.test.ts
  - src/app/stkde-3d/comparison.integration.test.ts
must_haves:
  truths:
    - "This follow-up supersedes the Phase 4 presentation and interaction semantics only: comparison entry and preset-ready state use nullable activeSlot with no active slot, selection is slot-first (including B-first), and visible comparison cards show dates/counts only; every other Phase 4 contract remains intact."
    - "The slot-first flow has an explicit no-active-slot entry state, supports activating either A or B and selecting B first, replaces only an occupied active slot before lock, rejects duplicate identities, locks both slots into ready comparison, and resets to empty with A active."
    - "Both absolute fields and the signed difference are resolved through source identity to the selected raw KDE fields, share the canonical normalized [-50, 50] x/z extent and documented row y-flip, and never use compact display indexes as data identity."
    - "The A-B field preserves raw signed subtraction and symmetric domain while applying sign-preserving gamma contrast (sign(x) * abs(x)^0.65 after clamping) so zero is exactly neutral and low non-zero values remain sign-correct and visibly non-neutral."
    - "Comparison has one keyboard-accessible control rail with native slot buttons/select, aria-pressed/aria-selected state, full date/count accessible labels, and polite live announcements; visible cards contain no source IDs or slice names."
    - "Comparison rendering contains no live camera refs, CameraControls, camera buttons, rendered interval list, viewport labels, duplicate A/B metadata, top-down badge, raw events, trajectories, burst volumes, adaptive axis, or duplicate mode controls, while compatibility fields remain internal when required by types."
    - "Presets, exact internal source/date identity, shared context/domain, raw signed difference, invalidation, no-duplicate-request loading, and normal stack/focused behavior remain intact."
  artifacts:
    - path: "src/app/stkde-3d/lib/comparison.ts"
      provides: "Temporary slot-first A/B state machine with explicit activation, replacement, duplicate guards, locking, reset, and invalidation"
    - path: "src/app/stkde-3d/components/StkdeComparisonControls.tsx"
      provides: "Native slot-first A/B controls, compact interval select, date/count-only cards, preset/mode/reset controls, focus handling, and live status"
    - path: "src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx"
      provides: "Named fixed-extent 2D renderer for raw absolute fields and signed difference fields without camera interaction"
    - path: "src/app/stkde-3d/lib/comparison-map.ts"
      provides: "Source-safe normalized coordinate/row mapping, shared-domain display mapping, and sign-preserving gamma contrast helpers"
    - path: "src/app/stkde-3d/components/StkdeComparisonStage.tsx"
      provides: "Comparison-only orchestration that resolves both source contexts, owns one shared map capture, and renders two maps or one signed map"
    - path: "src/app/stkde-3d/page.tsx"
      provides: "Route-owned comparison slot activation wiring and preset-ready state creation with activeSlot explicitly null"
      contains: "activateComparisonSlot"
    - path: "src/app/stkde-3d/lib/comparison-difference.ts"
      provides: "Validated aligned raw-field subtraction and symmetric signed domain"
    - path: "src/app/stkde-3d/lib/comparison.test.ts"
      provides: "Explicit state-transition coverage for no active slot, A/B activation, B-first selection, replacement, duplicates, lock, reset, and invalidation"
    - path: "src/app/stkde-3d/lib/comparison-map.test.ts"
      provides: "Unit coverage for [-50,50] mapping, row y-flip, raw shared-domain display, gamma contrast, zero neutral, and low-value sign semantics"
    - path: "src/app/stkde-3d/page.stkde.test.ts"
      provides: "Route/source/DOM contracts proving camera and overlay clutter removal, accessible controls, preset-ready activeSlot null, comparison-only 2D rendering, and preserved standalone rendering"
  key_links:
    - from: "src/app/stkde-3d/components/StkdeComparisonControls.tsx"
      to: "src/app/stkde-3d/lib/comparison.ts"
      via: "activate slot, select interval, reset, and live status callbacks"
      pattern: "activateComparisonSlot|selectComparisonSlice|aria-pressed|aria-selected"
    - from: "src/app/stkde-3d/components/StkdeComparisonStage.tsx"
      to: "src/app/stkde-3d/lib/comparison-source-context.ts"
      via: "two explicit source-aware resolutions for selected A and B KDE results"
      pattern: "resolveComparisonSourceContext"
    - from: "src/app/stkde-3d/components/StkdeComparisonStage.tsx"
      to: "src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx"
      via: "resolved raw fields, one map capture, canonical extent, and shared absolute domain"
      pattern: "StkdeComparisonFieldMap|absoluteDomain|mapTexture"
    - from: "src/app/stkde-3d/components/StkdeDifferenceScene.tsx"
      to: "src/app/stkde-3d/lib/comparison-map.ts"
      via: "aligned raw signed field values passed through clamped sign-preserving gamma mapping"
      pattern: "computeSignedKdeDifference|sign.*Math\\.pow|data-difference-field"
    - from: "src/app/stkde-3d/page.tsx"
      to: "src/app/stkde-3d/components/Stkde3DScene.tsx"
      via: "unchanged stack/focus branch when comparison is null or selecting"
      pattern: "viewMode={isFocusedView ? 'focus' : 'stack'}"
    - from: "src/app/stkde-3d/page.tsx"
      to: "src/app/stkde-3d/components/StkdeComparisonControls.tsx"
      via: "route-owned activateComparisonSlot action passed to both slot buttons"
      pattern: "activateComparisonSlot"
    - from: "src/app/stkde-3d/page.tsx"
      to: "src/app/stkde-3d/lib/dataset-loader.ts"
      via: "case-study/retry-only loader lifecycle, independent of comparison and shared settings"
      pattern: "\\[caseStudyPresetId, retryToken\\]"
---

# Quick Task: Phase 4 comparison UX feedback

<objective>
Redesign only the completed A/B comparison presentation and selection UX on `/stkde-3d` so analysts can read spatial contrast immediately and choose intervals through explicit A/B slots. This follow-up supersedes the Phase 4 presentation and interaction semantics only; keep the existing standalone stack workflow and all other Phase 4 route-local state/preset/data contracts intact.

Purpose: This is a narrow presentation-contract supersession from new user feedback. It changes absolute comparison from two 3D panes/linked cameras to two matched 2D KDE maps, removes comparison-only camera/overlay clutter, and makes selection/contrast accessible without changing analytical truth or normal stack behavior.

Output: A compact slot-first comparison rail, source-safe matched absolute 2D KDE maps or one high-contrast signed difference map, and regression/browser verification covering the preserved Phase 4 behavior.
</objective>

<contract_supersession>
The following new user feedback supersedes the Phase 4 presentation and interaction semantics only in `04-SPEC.md`, `04-CONTEXT.md`, and `04-UI-SPEC.md`:

- **Absolute presentation:** **Old:** two focused 3D panes with linked/independent comparison cameras and camera reset controls. **New:** exactly two matched 2D KDE maps, A above B, using one shared map context and shared absolute domain; no comparison camera interaction.
- **Selection interaction:** **Old:** the Phase 4 selection/preset flow may imply an active A slot on entry. **New:** `activeSlot` is nullable on comparison entry and on preset-ready state; the rail is slot-first, either A or B can be activated and filled first (including B-first), and an occupied active slot is the only slot replaceable before lock.
- **Visible comparison cards:** **Old:** cards may expose the richer Phase 4 interval metadata. **New:** visible cards contain only A/B, full interval dates/date ranges, counts, and state; source IDs, indexes, slice names, and other identity metadata remain internal.

All other Phase 4 contracts remain locked: comparison remains temporary route-local A/B state over existing rendered slices; presets remain reproducible and dataset changes invalidate them; exact source ID/index/epoch metadata remains internal and preset-safe; both maps share context/domain; A-B subtracts aligned raw fields and remains signed/symmetric; shared setting changes recompute without a new request; the range loader remains the sole request path; and the normal standalone stack/focused workflow is unchanged. `linkedCameras` and preset `camera` fields may remain only as compatibility fields if existing types require them; they must not drive rendered UI, refs, `CameraControls`, or comparison behavior.
</contract_supersession>

<execution_context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-stkde-3d-a-b-comparison-mode/04-SPEC.md
@.planning/phases/04-stkde-3d-a-b-comparison-mode/04-CONTEXT.md
@.planning/phases/04-stkde-3d-a-b-comparison-mode/04-UI-SPEC.md
@.planning/phases/04-stkde-3d-a-b-comparison-mode/04-VERIFICATION.md
@src/app/stkde-3d/page.tsx
@src/app/stkde-3d/components/StkdeComparisonControls.tsx
@src/app/stkde-3d/components/StkdeComparisonStage.tsx
@src/app/stkde-3d/components/StkdeComparisonViewport.tsx
@src/app/stkde-3d/components/StkdeDifferenceScene.tsx
@src/app/stkde-3d/lib/comparison.ts
@src/app/stkde-3d/lib/comparison-source-context.ts
@src/app/stkde-3d/lib/comparison-difference.ts
@src/app/stkde-3d/lib/palette.ts
</execution_context>

<scope_guard>
- Modify only `/stkde-3d` comparison presentation/state tests and the new comparison map helper/component. Leave the now-unused comparison camera helper/test untouched; compatibility/dead-code cleanup is deferred. The live comparison camera path must still be removed from the comparison components.
- Do not redesign or refactor the normal standalone stack/focused `Stkde3DScene` path, dashboard controls, APIs, stores, data loader, KDE math contract, or Phase 5 cube integration.
- Do not add dependencies or a persistent comparison store.
- Keep source slice IDs, indices, epoch bounds, internal labels, event counts, presets, and `linkedCameras`/camera preset fields available internally for Phase 4 compatibility even though 2D comparison no longer exposes camera interaction. Do not show source IDs or slice names in visible comparison cards.
- The 15 entries in `files_modified` are the complete planned source/test scope. Do not add generated `260802-compare-ux-feedback-SUMMARY.md` or `260802-compare-ux-feedback-VERIFICATION.md` to `files_modified`; they are execution artifacts only.
- Use a single quick plan with three bounded tasks: state/rail, map/math/render integration, and tests/verification. Do not expand into a second plan or unrelated cleanup.
</scope_guard>

<tasks>

<task type="auto">
  <name>Task 1: Implement the explicit slot-first state machine and accessible rail</name>
  <read_first>
    .planning/phases/04-stkde-3d-a-b-comparison-mode/04-SPEC.md,
    .planning/phases/04-stkde-3d-a-b-comparison-mode/04-CONTEXT.md,
    .planning/phases/04-stkde-3d-a-b-comparison-mode/04-UI-SPEC.md,
    src/app/stkde-3d/lib/comparison.ts,
    src/app/stkde-3d/components/StkdeComparisonControls.tsx,
    src/app/stkde-3d/lib/comparison.test.ts
  </read_first>
  <files>
    src/app/stkde-3d/lib/comparison.ts,
    src/app/stkde-3d/components/StkdeComparisonControls.tsx,
    src/app/stkde-3d/lib/comparison.test.ts
  </files>
  <action>
    Change the typed local state to make `activeSlot: 'A' | 'B' | null` explicit and add an `awaiting-slot` status/message. `enterComparison()` starts selecting with `a=null`, `b=null`, `activeSlot=null`, and `status='awaiting-slot'` (announce `Choose comparison slot A or B`). Add an `activateComparisonSlot(state, slot)` transition that works only while selecting; `StkdeComparisonControls` must receive this route-owned action/handler and each native A/B slot button must invoke it with its own slot value rather than mutating local UI state or selecting an interval implicitly. The two buttons expose both `aria-pressed` and `aria-selected`, and visibly/focusably identify the active slot. A user may activate B first. Selecting a rendered interval is allowed only after a slot is active, fills that slot with the exact existing `{index, sourceSliceId, sourceSliceIndex, startEpoch, endEpoch, label, eventCount}` payload, and automatically activates the other empty slot so the Phase 4 A→B convenience remains available. If the active slot already contains a reference and the candidate is different from the other slot, replace only that active slot before the pair locks; never clear or rewrite the other slot. If the candidate matches either other-slot identity by source ID or source index, reject it without mutation and announce `Choose a different interval for B.` or the equivalent active-slot duplicate message. Once both slots are distinct, set `mode='absolute'`, `status='ready'`, and `activeSlot=null`; subsequent selection attempts are ignored until reset.

    Make `resetComparison()` return `mode='selecting'`, empty A/B, `activeSlot='A'`, and `Comparison reset. Select interval A.`; preserve invalidation as an empty A-pending state with its dataset-change announcement. Preserve exact preset-ready state compatibility and keep the compatibility `linkedCameras` state field if required by existing types, but do not render or mutate it from controls. Route preset application and comparison-branch wiring are bounded to Task 3.

    Replace the scrollable ten-button `Rendered intervals` list with one compact native `<select>` whose option copy contains the full date/date-range and event count, not source IDs or slice names. Keep source identity only in the selection payload and stable `data-source-slice-id` markers. Cards show only A/B, full formatted interval dates, counts, and selected/pending/ready status; do not render `selection.label` or source IDs in visible card text. Keep the single authoritative mode selector in this control rail, plus `Compare intervals`, preset selection, `Reset comparison`, and `Back to stack`; do not introduce a second mode/picker surface.

    Specify keyboard behavior in the component: slot buttons and select are native/focusable, focus returns to the interval select after assignment, `Escape` does not silently clear a slot, and a polite live region announces slot activation, assignment, duplicate rejection, ready lock, reset, invalidation, loading, and unresolved-preset errors. Keep zero/one/many states and normal stack controls unchanged outside comparison.
  </action>
  <verify>
    Run `pnpm exec vitest run src/app/stkde-3d/lib/comparison.test.ts` and inspect the rendered control source. The tests must cover: initial `awaiting-slot`/no active slot; activating A; activating B and selecting B first; selecting into the active slot; replacing only an occupied active slot while partial; duplicate A/B rejection with unchanged references; automatic activation of the other empty slot; ready lock with no active slot; reset to empty/A-active; invalidation; exact source metadata preservation; and preset-ready compatibility. Source assertions must require native `button`/`select`, both slot buttons wired to the provided `activateComparisonSlot` callback/action, `aria-pressed`, `aria-selected`, `aria-live="polite"`, full date/count option/card copy, and must reject visible source IDs, slice names, or the old rendered interval list.
  </verify>
  <done>
    Entering comparison has no active slot until A or B is activated. Either slot can be filled first, a partial active slot can be replaced without touching the other slot, duplicates are rejected, both distinct slots lock into ready comparison with no active slot, and reset produces empty A-active selection. The rail is keyboard-accessible with native controls/live announcements, both slot buttons dispatch the route-owned activation action, visible cards show only dates/counts, and exact identity/preset/invalidation/normal-stack contracts remain intact.
  </done>
  <acceptance_criteria>
    `comparison.ts` contains explicit slot activation and nullable active-slot transitions; `comparison.test.ts` proves every required transition; and `StkdeComparisonControls.tsx` has one native compact picker, invokes the supplied activation action from both slot buttons, has no rendered interval list, and has no source ID/slice-name card copy. Route wiring is verified in Task 3.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Define the bounded source-safe field-map and signed-contrast math</name>
  <read_first>
    src/app/stkde-3d/lib/comparison-source-context.ts,
    src/app/stkde-3d/lib/comparison-difference.ts,
    src/app/stkde-3d/lib/palette.ts,
    src/app/stkde-3d/lib/comparison-source-context.test.ts,
    src/app/stkde-3d/lib/comparison-difference.test.ts
  </read_first>
  <files>
    src/app/stkde-3d/components/StkdeComparisonFieldMap.tsx,
    src/app/stkde-3d/lib/comparison-map.ts,
    src/app/stkde-3d/lib/comparison-difference.ts,
    src/app/stkde-3d/lib/comparison-source-context.test.ts,
    src/app/stkde-3d/lib/comparison-difference.test.ts,
    src/app/stkde-3d/lib/comparison-map.test.ts
  </files>
  <action>
    Add `StkdeComparisonFieldMap.tsx` as the only named comparison field renderer. It may use a fixed orthographic/static surface and the one stage-owned captured map context, but it must have no `CameraControls`, live comparison camera refs, camera callbacks, camera buttons, or camera state. The map's analytical extent is canonical and fixed: normalized x and z each span `[-50, 50]` (100 units total). Define and export helpers in `comparison-map.ts` for cell-center mapping and canvas row orientation: `x = -50 + (column + 0.5) * (100 / gridSize)`, `z = -50 + (row + 0.5) * (100 / gridSize)`, and canvas pixel row `gridSize - 1 - row` so KDE row 0 has the same geographic orientation in every absolute and signed map. Do not use the existing 96-unit ad hoc extent or independently rescale A and B.

    Keep `StkdeComparisonFieldMap` presentation-bounded: accept a raw `KdeField`, a display mode/domain, and the shared map context; do not accept source indexes, event arrays, trajectory results, volume profiles, camera refs, or layer toggles. Missing fields render an explicit unresolved state; valid all-zero fields render neutral. The route-level source resolution and Stage/Viewport/DifferenceScene wiring are deliberately assigned to Task 3.

    Keep raw signed math unchanged: `computeSignedKdeDifference` subtracts aligned `Float32Array` values `A - B`, retains the raw values, and returns `[-maxAbs, maxAbs]` with the existing positive fallback only for a valid all-zero domain. Add the display-only helper `mapSignedContrast(value, maxAbs)` in `comparison-map.ts`: compute `ratio = clamp(value / maxAbs, -1, 1)`, map zero exactly to `0`, otherwise return `sign(ratio) * abs(ratio) ** 0.65`, and feed that normalized result to the existing signed palette. This must not alter analytical subtraction or the raw/domain values. Keep red = A higher, neutral = zero, blue = B higher in legend/copy; render the geographic context subdued beneath a strong signed field so low non-zero raw values produce a non-neutral, sign-correct color.

  </action>
  <verify>
    Run `pnpm exec vitest run src/app/stkde-3d/lib/comparison-source-context.test.ts src/app/stkde-3d/lib/comparison-difference.test.ts src/app/stkde-3d/lib/comparison-map.test.ts`. Tests must prove raw field validation/alignment, shared absolute-domain math, raw A-B subtraction and symmetric domains, `[-50,50]` cell centers, `gridSize - 1 - row` y-flip, finite/clamped/sign-preserving contrast, `mapSignedContrast(0, maxAbs) === 0`, and low positive/negative values are visibly non-neutral on the correct side of neutral. Keep source/render-path assertions in Task 3.
  </verify>
  <done>
    The named field-map component and pure helpers implement the canonical extent, raw shared-domain display mapping, aligned signed-field contract, and tested gamma contrast without changing analytical subtraction. They are ready for the route/UI integration in Task 3.
  </done>
  <acceptance_criteria>
    `StkdeComparisonFieldMap` consumes raw fields and pure mapping helpers only; coordinate/y-flip and gamma helpers are pure and tested; and no new data source, normalized-cell subtraction, or dependency is introduced.
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Add route/DOM regression coverage and run the preserved workflow checks</name>
  <read_first>
    src/app/stkde-3d/page.tsx,
    src/app/stkde-3d/components/StkdeComparisonControls.tsx,
    src/app/stkde-3d/components/StkdeComparisonStage.tsx,
    src/app/stkde-3d/components/StkdeComparisonViewport.tsx,
    src/app/stkde-3d/components/StkdeDifferenceScene.tsx,
    src/app/stkde-3d/page.stkde.test.ts,
    src/app/stkde-3d/comparison.integration.test.ts,
    .planning/phases/04-stkde-3d-a-b-comparison-mode/04-VERIFICATION.md
  </read_first>
  <files>
    src/app/stkde-3d/components/StkdeComparisonStage.tsx,
    src/app/stkde-3d/components/StkdeComparisonViewport.tsx,
    src/app/stkde-3d/components/StkdeDifferenceScene.tsx,
    src/app/stkde-3d/page.tsx,
    src/app/stkde-3d/page.stkde.test.ts,
    src/app/stkde-3d/comparison.integration.test.ts
  </files>
  <action>
    Integrate the bounded map/math contract through the route: at the Stage boundary call `resolveComparisonSourceContext` separately for A and B with the full source slices and full `sliceKdeResults`; derive `fieldA`/`fieldB` only from each resolved `selectedKde`; and never index the KDE collection with `selection.sourceSliceIndex`. Derive one shared absolute domain from those resolved raw fields, pass the same domain/map texture/canonical extent to both `StkdeComparisonFieldMap` instances, keep A above B, and use the aligned raw fields for one `computeSignedKdeDifference` result in difference mode. Make `StkdeComparisonViewport` a metadata-light map wrapper that preserves only stable `data-interval-slot`/`data-source-slice-id` markers and accessibility labels without visible viewport labels or duplicated A/B metadata. Make `StkdeDifferenceScene` a camera-free signed-map wrapper with `data-difference-field="signed-kde"` and no temporal/overlay layers.

    In `page.tsx`, keep the comparison state/action route-owned and pass the `activateComparisonSlot` action/handler explicitly to `StkdeComparisonControls`; the control component must call it from the A and B slot buttons, preserving slot-first selection and allowing B to be activated/filled first. When creating/applying a built-in comparison preset, explicitly set `activeSlot: null` in the resulting preset-ready state (not the reset A-active default), and add a regression assertion that a completed preset has no active slot while retaining both exact selections.

     Remove the entire live comparison camera path from `StkdeComparisonStage`, `StkdeComparisonViewport`, and `StkdeDifferenceScene`: no comparison camera refs/imports/props/callbacks/state, `CameraControls`, camera buttons, or camera-driven behavior may remain. Leave the now-unused `comparison-camera.ts` and `comparison-camera.test.ts` untouched; their compatibility/dead-code cleanup is deferred. Retain `linkedCameras`/preset `camera` only as unused compatibility fields when types require them. Remove the stage's duplicate `Absolute`/`A − B difference` tabs; `StkdeComparisonControls` is the only mode control. Remove visible stage A/B interval metadata, the `TOP-DOWN SPATIAL FIELD` badge, raw event points, trajectories, burst volumes, adaptive axis, and other 3D layers from absolute/difference comparison. Hide comparison-only event/trajectory controls as appropriate in `page.tsx`, while keeping the normal stack/focused branch and its existing analysis controls/props untouched. Do not remove the stack surface renderer needed for selecting existing intervals. Preserve exact preset resolution, no-active-slot entry, completed-preset lock, dataset invalidation, and the single `[caseStudyPresetId, retryToken]` loader lifecycle in the route.

    Extend the existing source-contract/integration tests rather than creating another harness. Assert: default stack/focused rendering remains present and its overlay props are unchanged; Compare enters no-active-slot selection; `page.tsx` passes `activateComparisonSlot` to `StkdeComparisonControls`; both slot buttons invoke that action and B-first selection works; selection fills/replaces only the active partial slot; duplicate identities are rejected; a completed pair has no active slot and ignores further selection; reset returns to empty/A-active; preset creation explicitly yields `activeSlot: null` and a regression assertion proves the ready preset retains both exact selections with no active slot; presets resolve exact dataset/index/source/date metadata; shared KDE/renderer/adaptive changes preserve the pair; case-study changes invalidate it; Absolute and A − B mode switching remain available from the single control rail; absolute has exactly two named 2D field maps in A-before-B order; difference has exactly one signed field and explicit red/neutral/blue text; source IDs exist only in internal markers/payloads; and no camera refs/buttons, interval list, viewport labels, duplicate metadata, top-down badge, event/trajectory/burst/axis layer, or duplicate mode controls remain in comparison.

    Add DOM/source assertions for native `<button>`/`<select>`, slot `aria-pressed` and `aria-selected`, polite live announcements, full accessible date/count interval labels, hidden source IDs/slice names in visible cards, `data-comparison-mode`, `data-selection-slot`, `data-interval-slot`, `data-source-slice-id`, and `data-difference-field="signed-kde"`. Scope negative assertions to the comparison branch/components so the normal stack's existing raw-event/trajectory/analysis controls remain explicitly untouched. Keep the one `/api/crimes/range` occurrence and `[caseStudyPresetId, retryToken]` lifecycle assertions; shared setting changes must not create duplicate requests.

    Record a mock-data browser checklist using the existing `dev` script (there is no browser script in `package.json`): from the project root run this exact environment/launch command, which leaves the server running for the browser session: `USE_MOCK_DATA=true pnpm dev --hostname 127.0.0.1 > /tmp/stkde-3d-compare-ux.log 2>&1 & DEV_PID=$!; trap 'kill "$DEV_PID"' EXIT; sleep 3; agent-browser --session stkde-compare batch "open http://127.0.0.1:3000/stkde-3d" "wait 2000" "snapshot -i"`. Required checks: (1) default stack has its existing controls and no comparison state; (2) Compare shows no active slot, both native slot buttons are keyboard reachable, A-first and B-first activation/selection work, duplicate rejection/focus return/live status/reset work; (3) applying an exact preset produces ready comparison with no active slot, two vertically ordered matched 2D maps, and only date/count cards; (4) difference produces one high-contrast signed map with red=A, neutral=zero, blue=B copy and no badge; (5) desktop and narrow widths have no horizontal overflow; (6) preset, shared-setting recomputation, dataset invalidation, Back to stack, and no-new-request behavior work. Capture browser evidence outside the planned source scope; do not change or waive the four unrelated full-suite stale source-contract failures documented in Phase 4 verification.
  </action>
  <verify>
    Run:
    `pnpm exec vitest run src/app/stkde-3d/lib/comparison.test.ts src/app/stkde-3d/lib/comparison-map.test.ts src/app/stkde-3d/lib/comparison-difference.test.ts src/app/stkde-3d/lib/comparison-source-context.test.ts src/app/stkde-3d/lib/comparison-presets.test.ts src/app/stkde-3d/page.stkde.test.ts src/app/stkde-3d/comparison.integration.test.ts src/lib/kde/index.test.ts`
     Then run `pnpm typecheck`, `pnpm lint`, and `pnpm build`. For the browser gate, from the project root run the exact mock-data launch/browser command in the preceding checklist, continue with fresh snapshots after each interaction, and check every item there, including preset-ready `activeSlot` absence, both slot-button activation paths, date/count-only cards, reset/invalidation, no overflow, and no duplicate range request. Treat only the four documented unrelated full-suite failures as baseline; require no new `/stkde-3d` failures, leave the deferred comparison-camera helper/test untouched, and do not include that deferred camera-policy test in the targeted command. Generated browser screenshots/logs/reports are evidence artifacts, not planned source files.
  </verify>
  <done>
    Targeted comparison/state/map/source/DOM tests, typecheck, lint, and production build pass; mock-browser verification demonstrates the superseded 2D comparison UX, explicit slot lifecycle, route-wired A/B activation including B-first, preset-ready `activeSlot: null`, source-safe shared fields/domain, high-contrast signed map, exact clutter removals, preserved Phase 4 lifecycle/state/preset/invalidation/request contracts, and unchanged standalone stack behavior.
  </done>
  <acceptance_criteria>
    Test coverage is executable and specific for every requested feedback item, including slot transitions, page-to-control activation wiring, preset-ready nullable state, map coordinates/y-flip, gamma contrast, accessibility attributes/live status, negative clutter assertions, exact internal identity, no duplicate requests, and normal-stack preservation. Browser evidence uses `USE_MOCK_DATA=true pnpm dev --hostname 127.0.0.1` plus `agent-browser` against `http://127.0.0.1:3000/stkde-3d`, with deterministic mock data covering both comparison modes plus reset/invalidation/return paths.
  </acceptance_criteria>
</task>

</tasks>

<verification>
- Plan validation: the user-feedback supersession is explicit; every requested state, mapping, contrast, accessibility, clutter, preservation, and scope item maps to a task, artifact, key link, and executable assertion.
- Scope validation: exactly one quick plan with three bounded tasks and no more than the 15 listed source/test files; generated SUMMARY/VERIFICATION/browser evidence files stay out of `files_modified`; no Phase 5 files, APIs, stores, dashboard routes, dependencies, or normal standalone implementation changes; the obsolete camera helper/test remain untouched while live comparison camera behavior is removed from Stage, Viewport, and DifferenceScene.
- Implementation validation: complete Task 3's targeted Vitest, typecheck, lint, build, and exact mock-browser launch/check command; prove page-to-control `activateComparisonSlot` wiring and preset creation with `activeSlot: null`; preserve the known four unrelated full-suite failures as documented baseline.
</verification>

<success_criteria>
- `/stkde-3d` comparison selection has explicit A/B activation, B-first support, partial-slot replacement, duplicate rejection, ready locking, reset-to-A-active, keyboard focus behavior, and live announcements.
- Absolute comparison is exactly two source-safe matched 2D KDE maps with canonical `[-50,50]` x/z mapping, documented row y-flip, one shared map context/domain, and no camera or 3D overlay chrome.
- Difference comparison is one high-contrast, raw-preserving symmetric signed map using the tested sign-preserving gamma curve, with explicit red=A, neutral=zero, blue=B semantics and no top-down badge.
- Visible comparison UI has only one control rail, native controls, date/count-only cards, and no list, IDs/names, viewport labels, duplicate metadata, camera controls, events, trajectories, burst volumes, adaptive axis, or duplicate mode controls.
- Presets, exact internal source identity, reset/invalidation, shared settings, mode switching, single-request loading, and the Phase 4 temporary state contract remain valid.
- Built-in preset creation produces ready comparison with `activeSlot: null`, and `page.tsx` passes the route-owned `activateComparisonSlot` action to controls whose A/B buttons invoke it without weakening slot-first/B-first semantics.
- Standalone stack/focused mode remains unchanged and all targeted quality gates pass.
</success_criteria>

<output>
After execution, create `.planning/quick/260802-compare-ux-feedback/260802-compare-ux-feedback-SUMMARY.md` and, for the validated workflow, `.planning/quick/260802-compare-ux-feedback/260802-compare-ux-feedback-VERIFICATION.md`.
</output>
