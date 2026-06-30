#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();
const NEXT_DIR = join(REPO_ROOT, ".next");

const FORBIDDEN_BUNDLE_HINTS = [
  { name: "duckdb", matches: ["duckdb", "duckdb-async", "duckdb-node"] },
  { name: "three", matches: ["three.module", "three.js"] },
  { name: "maplibre-gl", matches: ["maplibre-gl"] },
  { name: "react-map-gl", matches: ["react-map-gl"] },
  { name: "leaflet", matches: ["leaflet"] },
  { name: "deck.gl", matches: ["@deck.gl"] },
];

function shouldBuild() {
  if (!existsSync(NEXT_DIR)) return true;
  const buildManifest = join(NEXT_DIR, "build-manifest.json");
  if (!existsSync(buildManifest)) return true;
  return false;
}

function listAllFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listAllFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function scanBundle() {
  if (!existsSync(NEXT_DIR)) {
    return { built: false, hits: [] };
  }
  const files = listAllFiles(NEXT_DIR);
  const hits = [];
  for (const file of files) {
    if (!statSync(file).isFile()) continue;
    if (file.endsWith(".html") || file.endsWith(".json")) continue;
    let content = "";
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const forbidden of FORBIDDEN_BUNDLE_HINTS) {
      for (const needle of forbidden.matches) {
        if (content.includes(needle)) {
          hits.push({ file: file.replace(`${REPO_ROOT}/`, ""), forbidden: forbidden.name, needle });
        }
      }
    }
  }
  return { built: true, hits };
}

if (shouldBuild()) {
  console.log("[check-bundle] .next/ not present; running `pnpm build` first…");
  try {
    execSync("pnpm build", { stdio: "inherit" });
  } catch (err) {
    console.error("[check-bundle] pnpm build failed; cannot continue.");
    process.exit(1);
  }
}

const result = scanBundle();
if (!result.built) {
  console.error("[check-bundle] .next/ still missing after build.");
  process.exit(1);
}
if (result.hits.length > 0) {
  console.error(`[check-bundle] FAILED — ${result.hits.length} forbidden hit(s):`);
  for (const hit of result.hits) {
    console.error(`  - ${hit.file}: matches ${hit.forbidden} via "${hit.needle}"`);
  }
  process.exit(1);
}
console.log("[check-bundle] OK — no forbidden modules in .next/ output.");
