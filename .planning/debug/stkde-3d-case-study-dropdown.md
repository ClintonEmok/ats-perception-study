---
status: diagnosed
trigger: "Investigate the reported `/stkde-3d` case-study dropdown issue in the current repository and runtime. User says the dropdown does not work. We observed the handler changes the select, but when the server was launched with `NEXT_PUBLIC_USE_MOCK_DATA=true`, the page uses `loadConfiguredMockStkde3dDataset()` which ignores the selected case-study preset; the running API also returned `x-data-warning: Using demo data - database disabled`. After restarting with `USE_MOCK_DATA=false NEXT_PUBLIC_USE_MOCK_DATA=false DISABLE_DUCKDB=false`, the API initialized DuckDB and selecting Fourth of July triggered the correct paginated requests. Validate this diagnosis against the code and advise whether a source fix is needed or this is an environment/runtime issue. Do not edit files. Return a concise root-cause report."
created: 2026-08-02T17:23:51Z
updated: 2026-08-02T17:33:07Z
---

## Current Focus

hypothesis: Confirmed: the apparent dropdown failure is caused by mock/runtime configuration selecting a dataset loader that ignores the preset; the source handler and real loader are correct.
test: Compare the route's source paths, focused tests, active server response headers/logs, and the prior mock-runtime browser verification.
expecting: Mock mode bypasses preset-aware loading; DuckDB mode preserves the selected date window and paginated request lifecycle.
next_action: Return concise root-cause report; no source fix is indicated.

## Symptoms

expected: Selecting a `/stkde-3d` case-study preset changes the displayed dataset and requests to match that preset.
actual: The select handler changes the selected value, but the displayed/requested data appears unchanged when the server is running with `NEXT_PUBLIC_USE_MOCK_DATA=true`.
errors: The running API returned `x-data-warning: Using demo data - database disabled`.
reproduction: Start the server with `NEXT_PUBLIC_USE_MOCK_DATA=true`, open `/stkde-3d`, select a different case study, and observe that the mock dataset ignores the selected preset. Restart with `USE_MOCK_DATA=false NEXT_PUBLIC_USE_MOCK_DATA=false DISABLE_DUCKDB=false`; select Fourth of July and observe the correct paginated requests.
started: Reported in the current runtime; behavior differs by runtime configuration. The DuckDB-enabled restart was observed to work.

## Eliminated

## Evidence

- timestamp: 2026-08-02T17:26:34Z
  checked: `src/app/stkde-3d/page.tsx` case-study state/effect and select control
  found: The native select is controlled by `caseStudyPresetId`; `onChange` calls `handleCaseStudyChange`, which stops playback, clears comparison state, and calls `setCaseStudyPresetId`. The effect depends only on `[caseStudyPresetId, retryToken]`, selects the matching preset, and chooses `loadConfiguredMockStkde3dDataset()` when `USE_CONFIGURED_MOCK_DATA` is true, otherwise `loadStkde3dDataset(preset)`.
  implication: The UI event and state transition are wired. Runtime mode determines whether the selected preset reaches the loader.

- timestamp: 2026-08-02T17:26:34Z
  checked: `src/app/stkde-3d/lib/dataset-loader.ts` and `lib/mock-data.ts`
  found: `loadStkde3dDataset(preset)` sends `startEpoch`, `endEpoch`, `limit`, and cursor to `/api/crimes/range`; `loadConfiguredMockStkde3dDataset()` takes no preset and always calls `generateStkde3dMockData()`. That generator uses the fixed full-range constants `978307200` and `1767225599` and always creates ten slices.
  implication: Configured client mock mode necessarily ignores Fourth of July, Spring Break, or New Year's selection. This matches the reported symptom without requiring a source defect in the dropdown.

- timestamp: 2026-08-02T17:26:34Z
  checked: `src/app/api/crimes/range/route.ts` and `src/lib/db.ts`
  found: The range API returns synthetic rows plus `X-Data-Warning: Using demo data - database disabled` when `isMockDataEnabled()` is true. `getDb()` refuses to initialize DuckDB in that mode; with `USE_MOCK_DATA=false` and no disabling flag, it initializes DuckDB and the route executes the date-filtered paginated query path.
  implication: The observed warning directly identifies the runtime as mock/DB-disabled, and the environment flags described by the reporter select the preset-aware DuckDB path.

- timestamp: 2026-08-02T17:26:34Z
  checked: Existing route integration and loader tests plus prior browser verification artifact
  found: Tests assert one range-loader lifecycle, `[caseStudyPresetId, retryToken]` dependencies, injected cursor pagination, and explicit mock labeling. The prior browser verification records that `NEXT_PUBLIC_USE_MOCK_DATA=true` produced zero range requests and that the DuckDB/real-load path worked after restarting with the public mock flag disabled.
  implication: Existing contracts and runtime evidence independently support an environment/runtime diagnosis rather than a missing handler fix.

- timestamp: 2026-08-02T17:33:07Z
  checked: Focused Vitest suites (`route.test.ts`, `dataset-loader.test.ts`, `comparison.integration.test.ts`, `page.stkde.test.ts`)
  found: 17 tests passed. The route test covers the DB-backed and mock response branches; loader tests cover preset query parameters and cursor pagination; integration tests enforce the single loader effect and mock path contract.
  implication: No regression or broken dropdown wiring is exposed by the targeted automated checks.

- timestamp: 2026-08-02T17:33:07Z
  checked: Active runtime at `127.0.0.1:3000`, `/api/crimes/range` responses, and `.next/dev/logs/next-development.log`
  found: Fourth-of-July request returned rows beginning at `1719705600` with no `x-data-warning`; Spring Break request returned rows beginning at `1711324800` with no warning. The server log explicitly reports `DuckDB initialized ... crime.duckdb` and repeated `crimes_sorted table already exists`.
  implication: The current runtime is on the intended real-data path and honors case-study date windows; the previously reported warning belongs to the mock/DB-disabled runtime, not the source dropdown.

- timestamp: 2026-08-02T17:33:07Z
  checked: Git diff limited to the investigated source files
  found: `page.tsx`, `dataset-loader.ts`, `mock-data.ts`, `/api/crimes/range/route.ts`, and `db.ts` are unchanged; the repository has unrelated pre-existing worktree changes and this debug artifact.
  implication: Investigation made no source-code edits.

## Resolution

root_cause: `NEXT_PUBLIC_USE_MOCK_DATA=true` makes the client route call `loadConfiguredMockStkde3dDataset()` instead of `loadStkde3dDataset(selectedPreset)`. That mock loader has no preset argument and always generates the fixed full-range ten-slice fixture. In parallel, `USE_MOCK_DATA=true`/`DISABLE_DUCKDB=true` makes `/api/crimes/range` return synthetic data with `X-Data-Warning: Using demo data - database disabled`. The dropdown changes state correctly; the selected preset is simply not part of the configured mock data path.
fix: None. Use `USE_MOCK_DATA=false NEXT_PUBLIC_USE_MOCK_DATA=false DISABLE_DUCKDB=false` (and restart Next so env values are rebuilt) when validating case-study-specific data. A source fix is not required for the reported case; only add preset-aware mock fixtures if mock mode is intended to simulate distinct case studies.
verification: Focused tests passed (17/17). The active DuckDB runtime logged initialization, omitted the mock warning, and returned distinct Fourth-of-July and Spring-Break date-window responses. Prior browser verification also observed no range requests in public mock mode and correct paginated requests after the DuckDB-enabled restart.
files_changed: []
