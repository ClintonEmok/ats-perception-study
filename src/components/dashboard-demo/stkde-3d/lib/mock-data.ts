import type { CrimeRecord } from '@/types/crime';
import { CHICAGO_BOUNDS, mapChicagoToScene } from './chicago-bounds';
import { computeSliceKde } from '@/lib/kde';
import type { EvolvingSlice, MockCrimeEvent, Stkde3dHotspot } from './types';

const SLICE_COUNT = 10;
const EVENTS_PER_SLICE = 300;
const NOISE_RATIO = 0.12;
const MOCK_RANGE_START = 978307200;
const MOCK_RANGE_END = 1767225599;

const CRIME_TYPES = [
  'Theft', 'Burglary', 'Assault', 'Robbery',
  'Vandalism', 'Battery', 'Narcotics', 'Criminal Damage',
];

const HOTSPOT_LOCATIONS = [
  { name: 'North Park', type: 'Theft', lat: 41.910, lon: -87.650 },
  { name: 'South Burst', type: 'Burglary', lat: 41.840, lon: -87.625 },
  { name: 'East Corridor', type: 'Robbery', lat: 41.878, lon: -87.580 },
  { name: 'West Scatter', type: 'Assault', lat: 41.880, lon: -87.710 },
] as const;

const EVOLUTION_OFFSETS: Array<Array<{
  dx: number; dz: number; radius: number; weight: number;
} | null>> = [
  [
    null,
    { dx: -4, dz: 2, radius: 3, weight: 0.3 },
    { dx: -2, dz: 0, radius: 2.5, weight: 0.6 },
    { dx: 0, dz: -1, radius: 2, weight: 0.9 },
    { dx: 2, dz: -2, radius: 2.5, weight: 0.7 },
    { dx: 4, dz: -3, radius: 3, weight: 0.4 },
    null,
    null,
    null,
    null,
  ],
  [
    null, null, null,
    { dx: 0, dz: 0, radius: 1.5, weight: 1.0 },
    null, null, null, null, null, null,
  ],
  [
    { dx: -4, dz: 4, radius: 3, weight: 0.15 },
    { dx: -3, dz: 3, radius: 3, weight: 0.25 },
    { dx: -2, dz: 2, radius: 3, weight: 0.4 },
    { dx: -1, dz: 1, radius: 3, weight: 0.5 },
    { dx: 0, dz: 0, radius: 3, weight: 0.65 },
    { dx: 1, dz: -1, radius: 3, weight: 0.75 },
    { dx: 2, dz: -2, radius: 3, weight: 0.6 },
    { dx: 3, dz: -3, radius: 3, weight: 0.4 },
    { dx: 4, dz: -4, radius: 3, weight: 0.2 },
    { dx: 5, dz: -5, radius: 3, weight: 0.1 },
  ],
  [
    null, null,
    { dx: 0, dz: 0, radius: 3, weight: 0.2 },
    { dx: 0, dz: 0, radius: 3, weight: 0.3 },
    { dx: 0, dz: 0, radius: 3, weight: 0.45 },
    { dx: 0, dz: 0, radius: 3, weight: 0.55 },
    { dx: 0, dz: 0, radius: 3, weight: 0.6 },
    { dx: 0, dz: 0, radius: 3, weight: 0.45 },
    { dx: 0, dz: 0, radius: 3, weight: 0.2 },
    null,
  ],
];

const HOTSPOT_DEFS: Stkde3dHotspot[] = HOTSPOT_LOCATIONS.map((loc, i) => {
  const [centerX, centerZ] = mapChicagoToScene(loc.lat, loc.lon);
  const offsets = EVOLUTION_OFFSETS[i];
  return {
    name: loc.name,
    type: loc.type,
    evolution: offsets.map((offset) => {
      if (!offset) return null;
      return {
        centerX: +(centerX + offset.dx).toFixed(1),
        centerZ: +(centerZ + offset.dz).toFixed(1),
        radius: offset.radius,
        weight: offset.weight,
      };
    }),
  };
});

function gaussianRandom(mean: number, std: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomChicagoScenePoint(): [number, number] {
  const lon = CHICAGO_BOUNDS.west + Math.random() * (CHICAGO_BOUNDS.east - CHICAGO_BOUNDS.west);
  const lat = CHICAGO_BOUNDS.south + Math.random() * (CHICAGO_BOUNDS.north - CHICAGO_BOUNDS.south);
  return mapChicagoToScene(lat, lon);
}

function generateSliceEvents(
  sliceIndex: number,
  eventCount: number,
  startEpoch: number,
  endEpoch: number,
): MockCrimeEvent[] {
  const events: MockCrimeEvent[] = [];
  const noiseCount = Math.round(eventCount * NOISE_RATIO);
  const clusteredCount = eventCount - noiseCount;

  let totalWeight = 0;
  const activeHotspots: Array<{
    def: Stkde3dHotspot;
    state: NonNullable<Stkde3dHotspot['evolution'][number]>;
  }> = [];

  for (const hotspot of HOTSPOT_DEFS) {
    const state = hotspot.evolution[sliceIndex];
    if (state) {
      activeHotspots.push({ def: hotspot, state });
      totalWeight += state.weight;
    }
  }

  const safeTotalWeight = Math.max(0.001, totalWeight);
  for (const { def, state } of activeHotspots) {
    const count = Math.round(
      (state.weight / safeTotalWeight) * clusteredCount,
    );
    for (let i = 0; i < count; i++) {
      const x = clamp(
        gaussianRandom(state.centerX, state.radius / 2.5),
        -48,
        48,
      );
      const z = clamp(
        gaussianRandom(state.centerZ, state.radius / 2.5),
        -48,
        48,
      );
      events.push({ x, z, type: def.type, timestampEpochSec: 0 });
    }
  }

  while (
    events.length - noiseCount < clusteredCount
  ) {
    const [x, z] = randomChicagoScenePoint();
    events.push({
      x,
      z,
      type: CRIME_TYPES[Math.floor(Math.random() * CRIME_TYPES.length)],
      timestampEpochSec: 0,
    });
  }

  for (let i = 0; i < noiseCount; i++) {
    const [x, z] = randomChicagoScenePoint();
    events.push({
      x,
      z,
      type: CRIME_TYPES[Math.floor(Math.random() * CRIME_TYPES.length)],
      timestampEpochSec: 0,
    });
  }

  for (let i = events.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [events[i], events[j]] = [events[j]!, events[i]!];
  }

  const duration = Math.max(0, endEpoch - startEpoch);
  return events.map((event, index) => ({
    ...event,
    // Coordinates remain randomized, but timestamps are deterministic within
    // the slice so mock data exercises the same event-level Y placement path.
    timestampEpochSec: Math.floor(startEpoch + ((index + 1) / (events.length + 1)) * duration),
  }));
}

function computeBurstScore(
  events: MockCrimeEvent[],
  hotspots: Array<{ centerX: number; centerZ: number; radius: number }>,
): number {
  if (events.length === 0 || hotspots.length === 0) return 0;

  let clusteredCount = 0;
  for (const event of events) {
    for (const hs of hotspots) {
      const dx = event.x - hs.centerX;
      const dz = event.z - hs.centerZ;
      if (Math.sqrt(dx * dx + dz * dz) <= hs.radius * 1.5) {
        clusteredCount++;
        break;
      }
    }
  }

  const ratio = clusteredCount / events.length;
  const concentration = ratio / Math.max(1, hotspots.length);
  return clamp((concentration - 0.05) / 0.6, 0, 1);
}

function computeRealBurstScore(events: MockCrimeEvent[]): number {
  if (events.length === 0) return 0;

  const { maxIntensity } = computeSliceKde(events);
  return clamp((maxIntensity / events.length) * 24, 0, 1);
}

export interface Stkde3dMockData {
  slices: EvolvingSlice[];
  sliceEvents: MockCrimeEvent[][];
}

export function generateStkde3dMockData(): Stkde3dMockData {
  const slices: EvolvingSlice[] = [];
  const sliceEvents: MockCrimeEvent[][] = [];

  for (let i = 0; i < SLICE_COUNT; i++) {
    const startEpoch = Math.floor(
      MOCK_RANGE_START + (i / SLICE_COUNT) * (MOCK_RANGE_END - MOCK_RANGE_START),
    );
    const endEpoch = Math.floor(
      MOCK_RANGE_START + ((i + 1) / SLICE_COUNT) * (MOCK_RANGE_END - MOCK_RANGE_START),
    );

    const events = generateSliceEvents(i, EVENTS_PER_SLICE, startEpoch, endEpoch);
    sliceEvents.push(events);

    const activeHotspots = HOTSPOT_DEFS.map((h) => h.evolution[i]).filter(
      Boolean,
    );

    const burstScore = Number(
      computeBurstScore(
        events,
        activeHotspots.map((s) => ({
          centerX: s!.centerX,
          centerZ: s!.centerZ,
          radius: s!.radius,
        })),
      ).toFixed(3),
    );

    slices.push({
      index: i,
      label: `Slice ${i + 1}`,
      startEpoch,
      endEpoch,
      burstScore,
      crimeCount: events.length,
    });
  }

  return { slices, sliceEvents };
}

export function generateStkde3dRealData(records: CrimeRecord[]): Stkde3dMockData {
  const sortedRecords = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const slices: EvolvingSlice[] = [];
  const sliceEvents: MockCrimeEvent[][] = [];

  if (sortedRecords.length === 0) {
    return { slices, sliceEvents };
  }

  for (let i = 0; i < SLICE_COUNT; i++) {
    const startIndex = Math.floor((i / SLICE_COUNT) * sortedRecords.length);
    const endIndex = i === SLICE_COUNT - 1
      ? sortedRecords.length
      : Math.floor(((i + 1) / SLICE_COUNT) * sortedRecords.length);

    const recordsInSlice = sortedRecords.slice(startIndex, endIndex);
    const events = recordsInSlice.map((record) => ({
      x: record.x,
      z: record.z,
      type: record.type,
      timestampEpochSec: record.timestamp,
    }));

    sliceEvents.push(events);

    const burstScore = Number(computeRealBurstScore(events).toFixed(3));

    slices.push({
      index: i,
      label: `Slice ${i + 1}`,
      startEpoch: recordsInSlice[0] ? recordsInSlice[0].timestamp : sortedRecords[0]!.timestamp,
      endEpoch: recordsInSlice[recordsInSlice.length - 1]
        ? recordsInSlice[recordsInSlice.length - 1]!.timestamp
        : sortedRecords[sortedRecords.length - 1]!.timestamp,
      burstScore,
      crimeCount: events.length,
    });
  }

  return { slices, sliceEvents };
}
