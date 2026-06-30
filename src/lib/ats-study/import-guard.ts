export const FORBIDDEN_PATH_PATTERNS: ReadonlyArray<RegExp> = [
  /@\/app\/(algorithms|cube-sandbox|dashboard-demo|demo|docs|evaluation|figures|hotspot-evolution|stats|stkde|stkde-3d|timeline-test|timeline-test-3d|timeslicing|timeslicing-algos)(\/|$)/,
  /@\/app\/api\//,
  /@\/lib\/(study|adaptive|binning|clustering|cohort|demographics|mapbox|stkde|synthetic|tessellation)(\/|$)/,
  /@\/store\/(useStudyStore|useEvaluationStudyStore|useStkdeStore|useDashboardDemoCoordinationStore)/,
  /@\/components\/(map|charts|cube|cube-sandbox|dashboard|dashboard-v2|demo|figures|hotspot|stkde|stkde-3d|timeline|timeslicing|timeslicing-algos|onboarding|layout)(\/|$)/,
  /@\/hooks\/(useClusterAnalysis|useStkde|useCubeSandbox|useAdaptive|useCoordination|useCoordinationStore|useDashboardDemo)/,
  /@\/workers\//,
];

export const FORBIDDEN_MODULES: ReadonlyArray<string> = [
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

export interface ImportViolation {
  file: string;
  line: number;
  source: string;
  rule: string;
}

export interface ImportGuardResult {
  ok: boolean;
  violations: ImportViolation[];
}

export function scanImportsForViolations(
  file: string,
  source: string,
): ImportViolation[] {
  const lines = source.split(/\r?\n/);
  const violations: ImportViolation[] = [];
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    const match = line.match(/(?:from\s+|require\()["']([^"']+)["']/g);
    if (!match) return;
    for (const occurrence of match) {
      const sourceMatch = occurrence.match(/["']([^"']+)["']/);
      if (!sourceMatch) continue;
      const spec = sourceMatch[1]!;
      const isForbiddenModule = FORBIDDEN_MODULES.some((m) => spec === m || spec.startsWith(`${m}/`));
      if (isForbiddenModule) {
        violations.push({ file, line: lineNo, source: spec, rule: `forbidden-module:${spec.split("/")[0]}` });
        continue;
      }
      const isForbiddenPath = FORBIDDEN_PATH_PATTERNS.some((re) => re.test(spec));
      if (isForbiddenPath) {
        violations.push({ file, line: lineNo, source: spec, rule: `forbidden-path:${spec}` });
      }
    }
  });
  return violations;
}
