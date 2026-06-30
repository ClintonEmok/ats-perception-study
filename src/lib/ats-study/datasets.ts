export type EventTime = number;

export interface BaseDataset {
  id: string;
  domain: [EventTime, EventTime];
  events: EventTime[];
  pattern: "uniform" | "single_burst" | "multi_burst" | "gradual_change";
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildUniform(seed: number, count: number, domain: [number, number]): EventTime[] {
  const rand = mulberry32(seed);
  const [lo, hi] = domain;
  const out: EventTime[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(lo + rand() * (hi - lo));
  }
  return out.sort((a, b) => a - b);
}

function buildSingleBurst(seed: number, count: number, domain: [number, number], burstCenter: number, burstWidth: number, burstFraction: number): EventTime[] {
  const rand = mulberry32(seed);
  const [lo, hi] = domain;
  const burstCount = Math.floor(count * burstFraction);
  const restCount = count - burstCount;
  const out: EventTime[] = [];
  for (let i = 0; i < burstCount; i += 1) {
    out.push(burstCenter + (rand() * 2 - 1) * burstWidth);
  }
  for (let i = 0; i < restCount; i += 1) {
    out.push(lo + rand() * (hi - lo));
  }
  return out
    .map((t) => Math.max(lo, Math.min(hi, t)))
    .sort((a, b) => a - b);
}

function buildMultiBurst(seed: number, count: number, domain: [number, number], centers: number[], burstWidth: number, burstFraction: number): EventTime[] {
  const rand = mulberry32(seed);
  const [lo, hi] = domain;
  const burstCount = Math.floor(count * burstFraction);
  const restCount = count - burstCount;
  const out: EventTime[] = [];
  for (let i = 0; i < burstCount; i += 1) {
    const center = centers[i % centers.length]!;
    out.push(center + (rand() * 2 - 1) * burstWidth);
  }
  for (let i = 0; i < restCount; i += 1) {
    out.push(lo + rand() * (hi - lo));
  }
  return out
    .map((t) => Math.max(lo, Math.min(hi, t)))
    .sort((a, b) => a - b);
}

function buildGradualChange(seed: number, count: number, domain: [number, number]): EventTime[] {
  const rand = mulberry32(seed);
  const [lo, hi] = domain;
  const out: EventTime[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const offset = (rand() * 2 - 1) * 0.05;
    const drifted = Math.max(0, Math.min(1, t + offset));
    out.push(lo + drifted * (hi - lo));
  }
  return out.sort((a, b) => a - b);
}

export const BASE_DATASETS: readonly BaseDataset[] = [
  {
    id: "ds-01-uniform-200",
    domain: [0, 1000],
    events: buildUniform(101, 200, [0, 1000]),
    pattern: "uniform",
  },
  {
    id: "ds-02-single-burst-220",
    domain: [0, 1000],
    events: buildSingleBurst(202, 220, [0, 1000], 500, 80, 0.7),
    pattern: "single_burst",
  },
  {
    id: "ds-03-multi-burst-260",
    domain: [0, 1000],
    events: buildMultiBurst(303, 260, [0, 1000], [200, 500, 800], 60, 0.65),
    pattern: "multi_burst",
  },
  {
    id: "ds-04-gradual-180",
    domain: [0, 1000],
    events: buildGradualChange(404, 180, [0, 1000]),
    pattern: "gradual_change",
  },
  {
    id: "ds-05-single-burst-300",
    domain: [0, 1000],
    events: buildSingleBurst(505, 300, [0, 1000], 300, 50, 0.8),
    pattern: "single_burst",
  },
  {
    id: "ds-06-multi-burst-240",
    domain: [0, 1000],
    events: buildMultiBurst(606, 240, [0, 1000], [350, 650], 70, 0.6),
    pattern: "multi_burst",
  },
] as const;

export const UNIFORM_DATASET_IDS = BASE_DATASETS.map((d) => `${d.id}--uniform`);
export const ATS_DATASET_IDS = BASE_DATASETS.map((d) => `${d.id}--ats`);

export interface RenderedVariant {
  datasetId: string;
  baseDatasetId: string;
  condition: "uniform" | "ats";
  events: EventTime[];
  domain: [EventTime, EventTime];
  pattern: BaseDataset["pattern"];
}

export function getBaseDataset(id: string): BaseDataset {
  const found = BASE_DATASETS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown base dataset: ${id}`);
  return found;
}

export function getUniformVariants(): RenderedVariant[] {
  return BASE_DATASETS.map((d) => ({
    datasetId: `${d.id}--uniform`,
    baseDatasetId: d.id,
    condition: "uniform",
    events: [...d.events],
    domain: d.domain,
    pattern: d.pattern,
  }));
}

export function getAtsVariants(): RenderedVariant[] {
  return BASE_DATASETS.map((d) => ({
    datasetId: `${d.id}--ats`,
    baseDatasetId: d.id,
    condition: "ats",
    events: [...d.events],
    domain: d.domain,
    pattern: d.pattern,
  }));
}

export function getVariantByDatasetId(datasetId: string): RenderedVariant {
  const lastDash = datasetId.lastIndexOf("--");
  if (lastDash < 0) throw new Error(`Invalid datasetId (missing condition suffix): ${datasetId}`);
  const baseId = datasetId.slice(0, lastDash);
  const condition = datasetId.slice(lastDash + 2);
  if (condition !== "uniform" && condition !== "ats") {
    throw new Error(`Invalid condition suffix: ${condition}`);
  }
  const base = getBaseDataset(baseId);
  return {
    datasetId,
    baseDatasetId: base.id,
    condition,
    events: [...base.events],
    domain: base.domain,
    pattern: base.pattern,
  };
}
