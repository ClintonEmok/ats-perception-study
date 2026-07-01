import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Exp2Variant = "baseline" | "warp";

export type Exp2WindowData = {
  key: string;
  windowDays: number;
  rank: number;
  start: string;
  end: string;
  totalEvents: number;
  counts: number[];
  timestamps: number[];
  strategyA: string;
  strategyB: string;
};

export type Exp2Data = {
  seed: number;
  generatedAt: string;
  orderings: Record<string, "AB" | "BA">[];
  windows: Exp2WindowData[];
};

function dataDirForVariant(variant: Exp2Variant): string {
  return variant === "baseline" ? "experiment2_expert_stimuli" : "experiment2_warp_factor_stimuli";
}

export function exp2DataPath(variant: Exp2Variant): string {
  return join(process.cwd(), "scripts", "output", dataDirForVariant(variant), "data.json");
}

export function loadExp2Data(variant: Exp2Variant): Exp2Data | null {
  const path = exp2DataPath(variant);
  const exists = existsSync(path);
  console.debug("[exp2-data] load", { variant, path, exists });
  if (!exists) return null;
  const data = JSON.parse(readFileSync(path, "utf8")) as Exp2Data;
  console.debug("[exp2-data] loaded", { variant, path, windowCount: data.windows.length, keys: data.windows.map((window) => window.key) });
  return data;
}

export function loadExp2WindowData(variant: Exp2Variant, windowKey: string): Exp2WindowData | null {
  const data = loadExp2Data(variant);
  if (!data) {
    console.debug("[exp2-data] window lookup skipped", { variant, windowKey, reason: "no-data" });
    return null;
  }
  const windowData = data.windows.find((window) => window.key === windowKey) ?? null;
  console.debug("[exp2-data] window lookup", {
    variant,
    windowKey,
    found: Boolean(windowData),
    available: data.windows.map((window) => window.key),
  });
  return windowData;
}
