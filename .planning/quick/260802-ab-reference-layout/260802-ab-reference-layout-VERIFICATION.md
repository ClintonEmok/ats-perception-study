# Quick Task 260802-ab-reference-layout Verification

## Automated checks

| Check | Result |
| --- | --- |
| Targeted Vitest: route and comparison integration contracts | PASS — 6 tests |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS — 0 errors; 100 repository warnings reported |
| `pnpm build` | PASS |

Targeted command:

```text
pnpm exec vitest run src/app/stkde-3d/page.stkde.test.ts src/app/stkde-3d/comparison.integration.test.ts
```

The targeted command was run after each implementation task and after the final contract updates; all runs passed.

## Browser checklist

The route was launched with the configured mock path:

```text
USE_MOCK_DATA=true NEXT_PUBLIC_USE_MOCK_DATA=true pnpm dev --hostname 127.0.0.1
```

The public alias was included because `/stkde-3d` is a client component and otherwise the private mock flag is not available in the client bundle.

| Required check | Result | Evidence |
| --- | --- | --- |
| Ready absolute comparison at desktop | PASS | `A/B COMPARISON` header, shared domain copy, right-side intensity card, exactly two map panels in A then B order; 1440px DOM geometry measured 1044×485 for each panel with `scrollWidth=innerWidth=1440` |
| Ready absolute comparison at narrow width | PASS | 375px screenshot showed stacked readable header/legend and centered map frames; A/B panels measured 299×346 with `scrollWidth=innerWidth=375` |
| Ready signed difference at desktop | PASS | One `data-difference-field="signed-kde"` panel measured 1044×495; signed legend displayed B HIGHER, 0 / NO DIFFERENCE, A HIGHER and the blue/neutral/red explanation |
| Ready signed difference at narrow width | PASS | 375px screenshot showed one readable tall map and stacked signed legend; panel measured 299×407 with `scrollWidth=innerWidth=375` |
| Difference map remains single and clutter-free | PASS | DOM count was exactly 1 signed field; no stack, events, trajectories, volume, axis, or comparison camera layers appeared |
| Normal stack recovery | PASS | Back to stack returned the existing Stack view, Active events, Trajectories, Adaptive time, and normal Map controls; no comparison preset cards remained |

Screenshots captured during review:

- `/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/ab-absolute-desktop.png`
- `/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/ab-absolute-narrow.png`
- `/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/ab-difference-desktop.png`
- `/var/folders/ht/_t09b17d0p11tcppmbhzsry40000gn/T/opencode/ab-difference-narrow.png`

## Scope check

Only the eight planned implementation/test files were changed by the task commits. `page.tsx`, comparison state/data/API files, dataset loader, palette, normal stack/focused scene, and dependency manifests were not modified. Existing unrelated working-tree changes were preserved and not staged.

## Baseline note

The known unrelated full-suite stale source-contract failures and repository lint warnings were not changed. No authentication gate or external service setup was required.
