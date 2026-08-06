# Planning Changelog

## Scope

This file tracks the major decisions and tradeoffs captured in planning across the demo, STKDE, timeline, workflow-isolation, and docs work.

## Phase 4: Demo Stats + STKDE

- Decision: keep stats compact inside `/dashboard-demo` and make STKDE the primary analysis rail.
- Decision: use one demo-local analysis store to coordinate district, time, and hotspot state.
- Tradeoff: reused a compact demo summary instead of cloning the full `/stats` route.
- Tradeoff: source-inspection route tests were preferred over broader browser E2E coverage to keep regression checks cheap and fast.

## Phase 5: Stats + STKDE Interaction

- Decision: default the demo rail to Stats so the analysis flow opens on the most approachable surface.
- Decision: use friendly district names and keep district context plain-language.
- Decision: treat district selection as a request filter at the STKDE boundary.
- Tradeoff: kept the STKDE interaction one-way from stats to hotspot analysis instead of making it a shared bidirectional model.
- Tradeoff: kept the STKDE rail separate from stats writes so the demo stays easy to reason about.
- Tradeoff: locked behavior with source-inspection and API regression tests rather than adding heavier browser coverage.

## Phase 6: Demo Timeline Polish

- Decision: present the demo timeline as a two-track surface with the focused/adapted track above the raw baseline.
- Decision: keep the slice companion secondary and compress its copy instead of expanding the shell.
- Decision: preserve demo-local warp plumbing and make the visible warp cue quieter.
- Decision: use curved connectors when readable, then later simplify the visible warp language to subtle bands-first cueing.
- Tradeoff: kept the polish presentation-only and isolated from the stable dashboard and timeslicing routes.
- Tradeoff: accepted demo-local warp overlays rather than reworking the underlying timeline architecture.
- Tradeoff: used source-inspection shell tests to lock composition and route exclusion instead of snapshot-heavy UI tests.

## Phase 7: Preset Thresholds

- Decision: give `/dashboard-demo` separate threshold values per preset family.
- Decision: restore the active preset’s own threshold values when switching presets.
- Decision: reuse the existing preset families and labels instead of introducing a new algorithm family.
- Tradeoff: kept the feature demo-local and left the stable `/timeslicing` route unchanged.

## Phase 8: Contextual Enrichment

- Decision: add contextual layers only if they explain patterns instead of adding noise.
- Decision: keep the contextual model demo-local and feed it through the demo shell.
- Decision: keep the core analysis flow intact while layering context around it.
- Tradeoff: chose lightweight contextual presentation over a broader new data product.
- Tradeoff: preserved route isolation rather than sharing contextual state with stable routes.

## Phase 9: Workflow Isolation

- Decision: isolate generate/review/apply into a full-screen workflow shell on `/timeslicing`.
- Decision: keep explicit step labels and linear navigation.
- Decision: exclude dashboard-only panels from the workflow route.
- Tradeoff: used a route-scoped wizard shell instead of merging workflow chrome into the analysis dashboard.
- Tradeoff: kept the workflow visually separate to reduce cognitive load during handoff.

## Docs Route

- Decision: document the prototype with a single elegant `/docs` route built from shadcn primitives.
- Decision: use cards, tabs, breadcrumb, separator, badges, and accordion to keep the page structured and readable.
- Decision: add a home-page link so the docs route is easy to find.
- Tradeoff: diverged from the archived plan for a multi-file sidebar + MDX docs system.
- Tradeoff: shipped a single-page feature atlas instead of a larger docs framework to stay aligned with the prototype’s scope and keep maintenance low.

## Cross-Cutting Pattern

- Keep demo-local behavior isolated from stable routes.
- Prefer compact, readable surfaces over cloned full-feature pages.
- Use source-inspection or API-level regression tests when that is enough to lock a contract.
- Push heavy computation and complex state behind the smallest useful surface.
