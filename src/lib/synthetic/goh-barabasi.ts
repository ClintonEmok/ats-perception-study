/**
 * Goh-Barabási bursty synthetic data generator.
 *
 * Implements the hybrid approach:
 *  1. A priority queue (the classic Goh-Barabási mechanism) selects the
 *     event TYPE. High-priority types fire repeatedly in short bursts,
 *     then go quiet for long stretches.
 *  2. Inter-event TIMESTAMPS are drawn from a power-law distribution
 *     P(τ) ~ τ^(-α) using inverse transform sampling. This produces
 *     bursty gaps in the global event stream.
 *
 * The two mechanisms compound: you get type clustering AND temporal
 * burstiness, which matches real-world crime patterns and gives the
 * adaptive scaling algorithm rich, realistic input.
 *
 * References:
 *  - Barabási, A.-L. (2005). The origin of bursts and heavy tails in
 *    human dynamics. Nature 435, 207-211.
 *  - Goh, K.-I. and Barabási, A.-L. (2008). Burstiness and memory in
 *    complex systems. EPL 81, 48002.
 */
import type { CrimeRecord } from '@/types/crime';
import { CHICAGO_BOUNDS, lonLatToNormalized } from '@/lib/coordinate-normalization';
import { CRIME_TYPE_MAP, getAllCrimeTypeIds, getCrimeTypeName } from '@/lib/category-maps';
import { createSeededRandom, uniformRange } from './prng';
import type {
  BurstinessMetrics,
  BurstyGeneratorConfig,
  BurstySequence,
  ResolvedBurstyConfig,
  RollingBurstinessPoint,
  TypeBurstinessProfile,
} from './types';

/** Approximate real Chicago crime-type frequency weights (normalized). */
const CHICAGO_TYPE_WEIGHTS: Record<string, number> = {
  THEFT: 0.22,
  BATTERY: 0.17,
  CRIMINAL_DAMAGE: 0.10,
  ASSAULT: 0.09,
  OTHER_OFFENSE: 0.07,
  BURGLARY: 0.06,
  MOTOR_VEHICLE_THEFT: 0.05,
  DECEPTIVE_PRACTICE: 0.05,
  ROBBERY: 0.04,
  CRIMINAL_TRESPASS: 0.03,
  WEAPONS_VIOLATION: 0.02,
  PROSTITUTION: 0.02,
  PUBLIC_PEACE_VIOLATION: 0.02,
  OFFENSE_INVOLVING_CHILDREN: 0.015,
  CRIM_SEXUAL_ASSAULT: 0.012,
  SEX_OFFENSE: 0.01,
  INTERFERENCE_WITH_PUBLIC_OFFICER: 0.008,
  GAMBLING: 0.005,
  LIQUOR_LAW_VIOLATION: 0.004,
  ARSON: 0.003,
  HOMICIDE: 0.002,
  KIDNAPPING: 0.002,
  INTIMIDATION: 0.002,
  STALKING: 0.002,
  OBSCENITY: 0.001,
  CONCEALED_CARRY_LICENSE_VIOLATION: 0.001,
  NON_CRIMINAL: 0.001,
  PUBLIC_INDECENCY: 0.001,
  HUMAN_TRAFFICKING: 0.001,
  OTHER_NARCOTIC_VIOLATION: 0.001,
  NON_CRIMINAL_SUBJECT_SPECIFIED: 0.0005,
  RITUALISM: 0.0001,
};

/**
 * Per-type burstiness profiles. Higher alpha = more concentrated bursts
 * (rarer events tend to cluster more). Values are tuned so the global
 * stream shows clear burstiness around alpha_base = 1.5.
 */
const TYPE_BURSTINESS_PROFILES: Record<string, TypeBurstinessProfile> = Object.fromEntries(
  Object.keys(CRIME_TYPE_MAP)
    .filter((key) => key === key.toUpperCase())
    .map((type) => {
      const weightKey = type.replace(/ /g, '_');
      const baseWeight = CHICAGO_TYPE_WEIGHTS[weightKey] ?? 0.001;
      const defaultAlpha = type === 'HOMICIDE' || type === 'KIDNAPPING' || type === 'ARSON'
        ? 2.2
        : type === 'BURGLARY' || type === 'MOTOR VEHICLE THEFT' || type === 'ROBBERY'
          ? 1.8
          : type === 'THEFT' || type === 'BATTERY' || type === 'CRIMINAL DAMAGE'
            ? 1.3
            : 1.5;
      return [type, { baseWeight, defaultAlpha }];
    })
);

/** Active types used by the generator (uppercase keys of CRIME_TYPE_MAP). */
const ACTIVE_TYPES = Object.keys(CRIME_TYPE_MAP).filter(
  (key) => key === key.toUpperCase()
);

/** District IDs 1-25. */
const ACTIVE_DISTRICTS = Array.from({ length: 25 }, (_, i) => String(i + 1));

/** Default rolling window: 7 days. */
const DEFAULT_ROLLING_WINDOW_SEC = 7 * 24 * 60 * 60;

/**
 * Resolve a user-supplied config into a fully-populated one with defaults
 * applied. Validates ranges and surfaces clear errors early.
 */
export function resolveConfig(config: Partial<BurstyGeneratorConfig>): ResolvedBurstyConfig {
  if (config.alpha !== undefined && config.alpha <= 1) {
    throw new Error(`alpha must be > 1 (got ${config.alpha}); a power-law with alpha <= 1 is not normalizable.`);
  }
  if (config.delta !== undefined && config.delta <= 0) {
    throw new Error(`delta must be > 0 (got ${config.delta}).`);
  }
  if (config.numEvents !== undefined && config.numEvents < 1) {
    throw new Error(`numEvents must be >= 1 (got ${config.numEvents}).`);
  }
  if (config.startTime !== undefined && config.endTime !== undefined && config.endTime <= config.startTime) {
    throw new Error(`endTime must be > startTime.`);
  }

  return {
    alpha: config.alpha ?? 1.5,
    delta: config.delta ?? 1,
    numEvents: config.numEvents ?? 10000,
    startTime: config.startTime ?? 1704067200,
    endTime: config.endTime ?? 1735689600,
    typeStrategy: config.typeStrategy ?? 'weighted',
    perTypeAlpha: config.perTypeAlpha ?? {},
    rollingWindowSec: config.rollingWindowSec ?? DEFAULT_ROLLING_WINDOW_SEC,
    seed: config.seed ?? 42,
  };
}

/**
 * Get the effective alpha for a given type: explicit override from the
 * config wins, otherwise fall back to the per-type default profile.
 */
function alphaFor(type: string, baseAlpha: number, overrides: Record<string, number>): number {
  return overrides[type] ?? baseAlpha;
}

/**
 * Sample one inter-event time from a power-law distribution with
 * exponent `alpha`, using inverse transform: τ = (1-u)^(-1/(α-1)) with
 * u ~ Uniform(0,1). Returns seconds.
 *
 * Note: for α close to 1, the heavy tail can produce very large values.
 * We cap at 30 days to prevent pathological single gaps from dominating
 * the time range. This is a deliberate trade-off: it preserves the
 * bursty feel without one outlier consuming the entire window.
 */
function samplePowerLawIET(rng: () => number, alpha: number, capSec: number): number {
  let u = rng();
  if (u <= 0) u = 1e-12;
  const exponent = -1 / (alpha - 1);
  const tau = Math.pow(1 - u, exponent);
  return Math.min(tau, capSec);
}

/**
 * The priority queue step: pick the type with the highest current
 * priority and increment its priority by delta. Returns the index of
 * the firing type.
 */
function fireHighestPriority(priorities: number[], delta: number, rng: () => number): number {
  let maxVal = -Infinity;
  let maxIdx = 0;
  for (let i = 0; i < priorities.length; i += 1) {
    if (priorities[i]! > maxVal) {
      maxVal = priorities[i]!;
      maxIdx = i;
    }
  }
  if (maxVal === -Infinity) {
    maxIdx = Math.floor(rng() * priorities.length);
  }
  priorities[maxIdx]! += delta;
  return maxIdx;
}

/**
 * Compute global burstiness metrics over an array of inter-event times.
 * Returns B, memory coefficient (Pearson r of consecutive IETs), mean,
 * std, and a max-likelihood power-law exponent estimate.
 */
export function computeBurstinessMetrics(iet: number[]): BurstinessMetrics {
  if (iet.length < 2) {
    return { burstinessParam: 0, memoryCoefficient: 0, meanIET: 0, stdIET: 0, fittedAlpha: 1 };
  }
  const n = iet.length;
  const mean = iet.reduce((s, v) => s + v, 0) / n;
  const variance = iet.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  let B: number;
  if (std === 0 && mean === 0) {
    B = 0;
  } else if (std === 0) {
    B = -1;
  } else {
    B = (std - mean) / (std + mean);
  }

  let mem = 0;
  if (n > 2) {
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    const m = n - 1;
    for (let i = 0; i < m; i += 1) {
      const x = iet[i]!;
      const y = iet[i + 1]!;
      sx += x;
      sy += y;
      sxx += x * x;
      syy += y * y;
      sxy += x * y;
    }
    const denom = Math.sqrt((m * sxx - sx * sx) * (m * syy - sy * sy));
    mem = denom > 0 ? (m * sxy - sx * sy) / denom : 0;
  }

  const positive = iet.filter((v) => v > 0);
  let fittedAlpha = 1;
  if (positive.length > 0) {
    const xmin = Math.min(...positive);
    fittedAlpha = 1 + positive.length / positive.reduce((s, v) => s + Math.log(v / xmin), 0);
  }

  return {
    burstinessParam: B,
    memoryCoefficient: mem,
    meanIET: mean,
    stdIET: std,
    fittedAlpha,
  };
}

/**
 * Compute the rolling burstiness time series B(t) over fixed-size
 * windows covering the entire time range. This is the ground-truth
 * signal that the adaptive scaling algorithm should respond to.
 */
export function computeRollingBurstiness(
  events: CrimeRecord[],
  startTime: number,
  endTime: number,
  windowSec: number
): RollingBurstinessPoint[] {
  if (windowSec <= 0 || endTime <= startTime) return [];

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const points: RollingBurstinessPoint[] = [];
  const numWindows = Math.ceil((endTime - startTime) / windowSec);

  for (let w = 0; w < numWindows; w += 1) {
    const wStart = startTime + w * windowSec;
    const wEnd = Math.min(wStart + windowSec, endTime);

    const inWindow = sorted.filter((e) => e.timestamp >= wStart && e.timestamp < wEnd);
    const typeBreakdown: Record<string, number> = {};

    if (inWindow.length < 2) {
      for (const e of inWindow) {
        typeBreakdown[e.type] = (typeBreakdown[e.type] ?? 0) + 1;
      }
      points.push({
        startEpoch: wStart,
        endEpoch: wEnd,
        burstinessParam: 0,
        eventCount: inWindow.length,
        typeBreakdown,
      });
      continue;
    }

    for (const e of inWindow) {
      typeBreakdown[e.type] = (typeBreakdown[e.type] ?? 0) + 1;
    }

    const iet: number[] = [];
    for (let i = 1; i < inWindow.length; i += 1) {
      iet.push(inWindow[i]!.timestamp - inWindow[i - 1]!.timestamp);
    }
    const metrics = computeBurstinessMetrics(iet);

    points.push({
      startEpoch: wStart,
      endEpoch: wEnd,
      burstinessParam: metrics.burstinessParam,
      eventCount: inWindow.length,
      typeBreakdown,
    });
  }

  return points;
}

/**
 * Main entry point: generate a bursty crime sequence.
 *
 * Algorithm summary:
 *  1. Initialize per-type priorities using `typeStrategy`.
 *  2. For each event:
 *     a. Fire the highest-priority type (priority queue).
 *     b. Sample τ from power-law with that type's alpha.
 *     c. Accumulate timestamp, assign random Chicago coordinates.
 *  3. Normalize timestamps to fit [startTime, endTime].
 *  4. Compute global and rolling burstiness metrics.
 */
export function generateBurstySequence(
  configInput: Partial<BurstyGeneratorConfig>
): BurstySequence {
  const config = resolveConfig(configInput);
  const rng = createSeededRandom(config.seed);

  const types = ACTIVE_TYPES;
  const n = types.length;
  const priorities: number[] = new Array(n);
  const alphaByType: number[] = new Array(n);

  for (let i = 0; i < n; i += 1) {
    const type = types[i]!;
    const profile = TYPE_BURSTINESS_PROFILES[type] ?? { baseWeight: 0.001, defaultAlpha: 1.5 };
    priorities[i] = config.typeStrategy === 'weighted' ? profile.baseWeight * 1000 : 1;
    alphaByType[i] = alphaFor(type, profile.defaultAlpha, config.perTypeAlpha);
  }

  const rawIET: number[] = new Array(config.numEvents);
  const typeSequence: number[] = new Array(config.numEvents);

  const capSec = 30 * 24 * 60 * 60;
  for (let i = 0; i < config.numEvents; i += 1) {
    const idx = fireHighestPriority(priorities, config.delta, rng);
    typeSequence[i] = idx;
    rawIET[i] = samplePowerLawIET(rng, alphaByType[idx]!, capSec);
  }

  const totalRawTime = rawIET.reduce((s, v) => s + v, 0);
  const targetSpan = config.endTime - config.startTime;
  const scale = totalRawTime > 0 ? targetSpan / totalRawTime : 1;

  const rawTimestamps: number[] = new Array(config.numEvents);
  let acc = 0;
  for (let i = 0; i < config.numEvents; i += 1) {
    acc += rawIET[i]!;
    rawTimestamps[i] = config.startTime + acc * scale;
  }

  const events: CrimeRecord[] = new Array(config.numEvents);
  for (let i = 0; i < config.numEvents; i += 1) {
    const type = types[typeSequence[i]!]!;
    const district = ACTIVE_DISTRICTS[Math.floor(rng() * ACTIVE_DISTRICTS.length)]!;
    const lon = uniformRange(rng, CHICAGO_BOUNDS.minLon, CHICAGO_BOUNDS.maxLon);
    const lat = uniformRange(rng, CHICAGO_BOUNDS.minLat, CHICAGO_BOUNDS.maxLat);
    const { x, z } = lonLatToNormalized(lon, lat);
    const timestamp = Math.floor(rawTimestamps[i]!);
    const year = new Date(timestamp * 1000).getUTCFullYear();
    const iucr = iucrForType(type);

    events[i] = {
      id: `synthetic-${i}`,
      timestamp,
      lat,
      lon,
      x,
      z,
      type,
      district,
      year,
      iucr,
    };
  }

  const metrics = computeBurstinessMetrics(rawIET);
  const rollingBurstiness = computeRollingBurstiness(
    events,
    config.startTime,
    config.endTime,
    config.rollingWindowSec
  );

  return { events, metrics, rollingBurstiness, config };
}

/**
 * Generate a simple IUCR code from a type name. Real Chicago IUCR codes
 * are 4-character strings; for synthetic data we use a stable hash of
 * the type to keep references consistent.
 */
function iucrForType(type: string): string {
  let h = 0;
  for (let i = 0; i < type.length; i += 1) {
    h = (h * 31 + type.charCodeAt(i)) & 0xffff;
  }
  return h.toString().padStart(4, '0').slice(0, 4);
}

/**
 * Helper: list the per-type burstiness profiles. Exposed for tooling
 * and inspection.
 */
export function getTypeProfiles(): Record<string, TypeBurstinessProfile> {
  return { ...TYPE_BURSTINESS_PROFILES };
}

/**
 * Helper: list active crime types used by the generator.
 */
export function getActiveTypes(): string[] {
  return [...ACTIVE_TYPES];
}

/**
 * Helper: get the count of valid crime type IDs (excluding 0).
 * Provided for consistency with the existing API surface.
 */
export function getActiveTypeCount(): number {
  return getAllCrimeTypeIds().length;
}

/**
 * Helper: look up a crime type name by its numeric ID.
 */
export function lookupTypeName(id: number): string {
  return getCrimeTypeName(id);
}
