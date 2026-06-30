#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, "..", "..");

const FORBIDDEN_PATH_PATTERNS = [
  /@\/app\/(algorithms|cube-sandbox|dashboard-demo|demo|docs|evaluation|figures|hotspot-evolution|stats|stkde|stkde-3d|timeline-test|timeline-test-3d|timeslicing|timeslicing-algos)(\/|$)/,
  /@\/app\/api\//,
  /@\/lib\/(study|adaptive|binning|clustering|cohort|demographics|mapbox|stkde|synthetic|tessellation)(\/|$)/,
  /@\/store\/(useStudyStore|useEvaluationStudyStore|useStkdeStore|useDashboardDemoCoordinationStore)/,
  /@\/components\/(map|charts|cube|cube-sandbox|dashboard|dashboard-v2|demo|figures|hotspot|stkde|stkde-3d|timeline|timeslicing|timeslicing-algos|onboarding|layout)(\/|$)/,
  /@\/hooks\/(useClusterAnalysis|useStkde|useCubeSandbox|useAdaptive|useCoordination|useCoordinationStore|useDashboardDemo)/,
  /@\/workers\//,
];

const FORBIDDEN_MODULES = [
  "duckdb",
  "three",
  "@react-three/fiber",
  "@react-three/drei",
  "@deck.gl/core",
  "@deck.gl/aggregation-layers",
  "@deck.gl/mapbox",
  "@deck.gl/react",
  "maplibre-gl",
  "react-map-gl",
  "react-leaflet",
  "react-leaflet-markercluster",
  "leaflet",
  "leaflet-draw",
  "leaflet.markercluster",
  "leaflet.fullscreen",
  "apache-arrow",
  "density-clustering",
  "driver.js",
  "cmdk",
  "@loaders.gl/arrow",
  "@loaders.gl/core",
  "@math.gl/web-mercator",
];

const STUDY_PATHS = [
  "src/lib/ats-study",
  "src/components/study",
  "src/store/useExperimentStore.ts",
  "src/app/experiment",
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/hooks/useStimulusTiming.ts",
  "src/hooks/useNavigationGuard.ts",
  "src/components/providers/ConvexClientProvider.tsx",
];

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (/\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

function scanFileForViolations(rel, source) {
  const lines = source.split(/\r?\n/);
  const violations = [];
  lines.forEach((line, index) => {
    const matches = line.match(/(?:from\s+|require\()["']([^"']+)["']/g);
    if (!matches) return;
    for (const occurrence of matches) {
      const sourceMatch = occurrence.match(/["']([^"']+)["']/);
      if (!sourceMatch) continue;
      const spec = sourceMatch[1];
      const isForbiddenModule = FORBIDDEN_MODULES.some((m) => spec === m || spec.startsWith(`${m}/`));
      if (isForbiddenModule) {
        violations.push({ file: rel, line: index + 1, source: spec, rule: `forbidden-module:${spec.split("/")[0]}` });
        continue;
      }
      const isForbiddenPath = FORBIDDEN_PATH_PATTERNS.some((re) => re.test(spec));
      if (isForbiddenPath) {
        violations.push({ file: rel, line: index + 1, source: spec, rule: `forbidden-path:${spec}` });
      }
    }
  });
  return violations;
}

const targets = [];
for (const p of STUDY_PATHS) {
  const abs = join(REPO_ROOT, p);
  let isDir = false;
  try {
    isDir = (await readdir(abs, { withFileTypes: true })).length > 0;
  } catch {
    isDir = false;
  }
  if (isDir) {
    targets.push(...(await walk(abs)));
  } else {
    targets.push(abs);
  }
}

const seen = new Set();
let allViolations = [];
for (const file of targets) {
  if (seen.has(file)) continue;
  seen.add(file);
  const rel = relative(REPO_ROOT, file);
  let source = "";
  try {
    source = await readFile(file, "utf8");
  } catch {
    continue;
  }
  if (!source) continue;
  allViolations = allViolations.concat(scanFileForViolations(rel, source));
}

if (allViolations.length > 0) {
  console.error(`[check-import-guard] FAILED with ${allViolations.length} violation(s):`);
  for (const v of allViolations) {
    console.error(`  - ${v.file}:${v.line} → ${v.rule} (${v.source})`);
  }
  process.exit(1);
}
console.log(`[check-import-guard] OK — scanned ${targets.length} target(s); 0 violations.${sep}`);
