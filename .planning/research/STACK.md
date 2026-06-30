# Stack Research — ATS Perception Study (v4.0)

**Domain:** Web-based controlled perception experiment (within-subjects, counterbalanced)
**Researched:** 2026-06-30
**Confidence:** HIGH

## Executive Summary

The ATS Perception Study adds a self-contained experiment route to the existing Next.js 16 prototype. The study requires: **(1)** SVG timeline stimulus rendering with Visx (interactive event rug + allocation bands), **(2)** Convex as the backend for anonymous response storage, **(3)** client-side ATS mapping computation, and **(4)** a stripped standalone route deployed to Vercel. Most of the visualization stack already exists; only three Visx packages and the Convex client need to be added. No new databases, state managers, or CSS frameworks are required.

---

## Recommended Stack

### New Dependencies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `convex` | ^1.42.1 | Real-time backend for experiment response storage (EXP-04, EXP-08) | Convex is already the designated study backend per PROJECT.md decision ("Convex-only backend avoids DuckDB dependency"); provides type-safe mutations/queries with zero-config real-time reactivity |
| `@visx/tooltip` | ^3.12.0 | Hover tooltips on SVG timeline stimuli (event details, interval info) | Pinned to 3.12.0 to match existing @visx ecosystem; `useTooltip` hook integrates naturally with React 19 functional components |
| `@visx/text` | ^3.12.0 | SVG text labels with proper vertical alignment for timeline axes and band labels | Native SVG `<text>` lacks vertical centering; @visx/text provides `verticalAnchor`, `textAnchor`, and line-wrapping in SVG |
| `@visx/annotation` | ^3.12.0 | Callout annotations labeling burst regions or peak points on timeline stimuli | Connector + label pattern for highlighting specific intervals without cluttering the chart |

### Existing Dependencies (Reused — No Changes)

| Technology | Version | Role in Study |
|------------|---------|---------------|
| `next` | 16.2.9 | App Router for `/study` standalone route |
| `react` / `react-dom` | 19.2.7 | UI rendering for experiment flow |
| `zustand` | ^5.0.10 | Experiment state management (trial progress, responses, participant session) |
| `@visx/axis` | ^3.12.0 | Time axis for SVG timeline stimuli |
| `@visx/scale` | ^3.12.0 | Time and band scales for event positioning and allocation band widths |
| `@visx/shape` | ^3.12.0 | Bar, Line, Circle primitives for event rug marks and allocation bands |
| `@visx/group` | ^3.12.0 | SVG `<g>` grouping for stimulus layout |
| `@visx/responsive` | ^3.12.0 | Responsive SVG container adapting to viewport |
| `@visx/curve` | ^3.12.0 | Interpolation curves for smooth timeline transitions |
| `date-fns` | ^4.4.0 | Date formatting and manipulation for stimulus generation |
| `tailwind-merge` + `clsx` | existing | Styling experiment UI (instructions, questionnaire, trial chrome) |
| `sonner` | ^2.0.7 | Toast notifications (e.g., "Response saved") |
| `vitest` | ^4.0.18 | Unit testing for ATS mapping, counterbalancing, stimulus generation |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `convex` CLI (`npx convex dev`) | Local Convex development server | Runs alongside `next dev`; provides type generation into `convex/_generated/` |
| `npx convex deploy` | Deploy Convex functions to production | Run before Vercel deployment; target determined by `CONVEX_DEPLOYMENT` env var |
| Vercel CLI | Preview and production deployments | `vercel.json` for route configuration |

---

## Installation

```bash
# New dependencies (study-specific)
pnpm add convex@^1.42.1 @visx/tooltip@^3.12.0 @visx/text@^3.12.0 @visx/annotation@^3.12.0
```

**No dev dependencies needed beyond existing.** Vitest, TypeScript, ESLint are already configured.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `convex` ^1.42.1 | Supabase (already available) | If real-time collaboration or auth becomes a requirement; but study is anonymous and single-participant, so Convex's simplicity wins |
| `convex` ^1.42.1 | DuckDB + API routes | If study responses need to join with crime data; but study is isolated from prototype data per "Convex-only backend" decision |
| `@visx/tooltip` ^3.12.0 | Custom `onMouseMove` tooltip | For trivial tooltips; but Visx tooltip handles boundary detection (`TooltipWithBounds`) and portal rendering out of the box |
| `@visx/text` ^3.12.0 | Native SVG `<text>` | For simple one-line labels; but timeline band labels need vertical centering which native SVG doesn't support |
| `crypto.randomUUID()` (built-in) | `nanoid` ^5.1.16 | If shorter, human-readable participant codes are required (e.g., `P-X7K9M3` vs `550e8400-e29b-41d4-a716-446655440000`); currently `crypto.randomUUID()` is already used in `useStudyStore` and is sufficient |
| `@visx/annotation` ^3.12.0 | Manual SVG `<line>` + `<text>` | For one-off annotations; but @visx/annotation provides connector routing, label backgrounds, and subject positioning that would be tedious to implement manually |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `nanoid` or `uuid` packages | `crypto.randomUUID()` is built into all modern browsers and already used in `useStudyStore`; adding a dependency for ID generation is unnecessary | `crypto.randomUUID()` (built-in, zero deps) |
| New state management library | Zustand 5 already covers all experiment state (trial progress, responses, session); the existing `useEvaluationStudyStore` patterns are proven | Zustand 5 slices with the existing `useEvaluationStudyStore` pattern |
| New CSS framework or component library | Tailwind CSS 4 + Radix UI + shadcn/ui are already installed and sufficient for experiment chrome (instructions, questionnaire forms, progress indicators) | Existing Tailwind + Radix + shadcn |
| New database (Postgres, SQLite, etc.) | The study uses Convex exclusively for response storage; DuckDB is reserved for crime data analytics | Convex (per PROJECT.md decision: "Convex-only backend avoids DuckDB dependency") |
| `@visx/xychart` or other high-level charting | The timeline stimuli need custom rendering (event rug marks on allocation bands) that @visx/xychart doesn't support natively; lower-level Visx primitives provide full control | @visx/shape + @visx/scale + @visx/axis (already installed) |
| Python backend or computation | ATS mapping is client-side JS per EXP-07; no Python runtime needed for the study | Pure TypeScript computation in `src/lib/study/ats-mapping.ts` |
| Cloud storage (S3, R2, etc.) | Study responses are small JSON blobs stored directly in Convex tables; no file uploads needed | Convex document storage |
| Authentication library (Clerk, NextAuth, etc.) | Study is anonymous by design (EXP-05); participant codes are generated client-side with no auth | Anonymous participant flow with random ID |
| New testing framework | Vitest 4 already configured; stimulus generation and ATS mapping are pure functions testable with existing setup | Vitest 4 |
| `driver.js` (already installed) | Not needed for study — the experiment uses on-screen instructions, not interactive tours | Plain instructions UI |

---

## Stack Patterns by Variant

**If standalone `/study` route (recommended):**
- Use Next.js App Router route group `(study)` for layout isolation
- Wrap the study layout with its own `ConvexClientProvider` (or share the root one)
- Keep study components in `src/components/study/` and stores in a dedicated Zustand slice
- Because: keeps experiment code isolated from prototype; easy to strip for Vercel deployment

**If embedded within `/evaluation` route (existing):**
- Extend `useEvaluationStudyStore` with ATS-specific trial state
- Use the existing `EvaluationShell` as the experiment chrome
- Because: evaluation infrastructure already exists (Phase 80); but risks coupling study to prototype

**If Convex is not available (offline fallback):**
- Fall back to `sessionStorage` / `localStorage` for response persistence
- Queue responses and sync when Convex becomes available
- Because: the experiment must not lose data if Convex is unreachable; `sessionStorage` provides crash recovery

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `convex` ^1.42.1 | Next.js 16.2.9, React 19.2.7 | Convex client is framework-agnostic; `ConvexReactClient` + `ConvexProvider` pattern works with React 19 |
| `@visx/tooltip` ^3.12.0 | React 19.2.7, @visx/event ^3.12.0 | All @visx packages at 3.12.0 are mutually compatible; `useTooltip` is a React hook compatible with React 19 |
| `@visx/text` ^3.12.0 | React 19.2.7 | Pure SVG text component; no known React 19 issues |
| `@visx/annotation` ^3.12.0 | React 19.2.7, @visx/group ^3.12.0 | Uses @visx/group internally; version lock ensures compatibility |

---

## Integration Points

### Convex Integration

```
src/
├── convex/                          # NEW: Convex backend directory
│   ├── schema.ts                    # Table definitions (responses, participants)
│   ├── responses.ts                 # Mutations (submitResponse) + queries (getResponses)
│   └── _generated/                  # Auto-generated by `npx convex dev`
├── components/
│   └── ConvexClientProvider.tsx     # NEW: Client component wrapping ConvexProvider
├── app/
│   └── layout.tsx                   # MODIFIED: Add ConvexClientProvider wrapper
│   └── (study)/                     # NEW: Route group for experiment
│       ├── layout.tsx               # Study-specific layout (no prototype chrome)
│       └── page.tsx                 # Experiment entry point
```

### Environment Variables

```bash
# .env.local (development)
NEXT_PUBLIC_CONVEX_URL=https://happy-hedgehog-123.convex.cloud
CONVEX_DEPLOYMENT=dev:your-team/happy-hedgehog-123

# Vercel (production)
NEXT_PUBLIC_CONVEX_URL=https://happy-hedgehog-123.convex.cloud
CONVEX_DEPLOY_KEY=prod:your-team/happy-hedgehog-123|...
```

### Zustand Store Pattern

The existing `useEvaluationStudyStore` pattern (flat slices, `sessionStorage` persistence, `partialize` for crash recovery) should be extended with an ATS-specific trial store rather than creating a separate store from scratch.

---

## Deployment Architecture

```
┌─────────────────────────────────────┐
│  Vercel (Next.js 16 standalone)     │
│  ┌───────────────────────────────┐  │
│  │  /study route (stripped)      │  │
│  │  - SVG timeline stimuli       │  │
│  │  - Experiment flow UI         │  │
│  │  - Zustand state management   │  │
│  │  - Convex client hooks        │  │
│  └──────────┬────────────────────┘  │
└─────────────┼───────────────────────┘
              │ HTTPS (Convex client)
              ▼
┌─────────────────────────────────────┐
│  Convex Cloud                       │
│  ┌───────────────────────────────┐  │
│  │  responses table               │  │
│  │  - participantId               │  │
│  │  - trialIndex                  │  │
│  │  - condition (Uniform / ATS)   │  │
│  │  - taskType                    │  │
│  │  - accuracy                    │  │
│  │  - responseTimeMs              │  │
│  │  - confidence                  │  │
│  │  - datasetId                   │  │
│  │  - timestamp                   │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  participants table (optional) │  │
│  │  - participantCode             │  │
│  │  - conditionOrder              │  │
│  │  - completedAt                 │  │
│  │  - questionnaireResponses      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Sources

| Source | What Was Verified | Confidence |
|--------|-------------------|------------|
| Context7 `/websites/convex_dev` | Convex client version 1.42.1, `ConvexProvider` setup, `useMutation`/`useQuery` hooks, schema definition with `defineTable`, Next.js App Router integration pattern | HIGH |
| Context7 `/airbnb/visx` v3.12.0 | `@visx/tooltip` (useTooltip hook, TooltipWithBounds), `@visx/text` (verticalAnchor), `@visx/annotation` (connector + label components) | HIGH |
| Context7 `/ai/nanoid` | `customAlphabet` for custom participant codes — **not needed**; `crypto.randomUUID()` is built-in and already used in codebase | HIGH |
| npm registry (via `npm view`) | `convex@1.42.1`, `@visx/tooltip@3.12.0`, `@visx/text@3.12.0`, `@visx/annotation@3.12.0`, `nanoid@5.1.16` — all version-verified | HIGH |
| Codebase inspection (`package.json`, `src/store/useStudyStore.ts`, `src/store/useEvaluationStudyStore.ts`, `src/app/evaluation/`) | Existing study infrastructure (evaluation route, study stores, protocol types), Visx packages at ^3.12.0, Zustand 5 patterns | HIGH |
| Codebase inspection (`src/app/` directory listing) | No Convex setup exists yet; `/evaluation` route already present; `/study` route needs creation | HIGH |

---

*Stack research for: ATS Perception Study (v4.0) — additions to existing Adaptive Space-Time Cube Prototype*
*Researched: 2026-06-30*
*Base stack: Next.js 16.2.9, React 19.2.7, TypeScript 5.9, Zustand 5, Tailwind CSS 4, Visx 3.12*
