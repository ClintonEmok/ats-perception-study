import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';
import { KDE_SCENE_SPAN_METERS } from '@/lib/kde';

export type HotspotMatchingMode = 'fixed' | 'adaptive';

export interface HotspotMatchingOptions {
  mode?: HotspotMatchingMode;
  gridSize?: number;
  smoothingMeters?: number;
  /** Physical server grid width; avoids treating meters as scene-cell counts. */
  cellWidthMeters?: number;
}

export interface TrackedHotspotSnapshot {
  hotspotId: string;
  sliceId: string;
  sliceLabel: string;
  centroidLng: number;
  centroidLat: number;
  supportCount: number;
  intensityScore: number;
  radiusMeters: number;
  peakStartEpochSec: number;
  peakEndEpochSec: number;
}

export interface TrackedHotspot {
  id: string;
  label: string;
  snapshots: TrackedHotspotSnapshot[];
  startEpoch: number;
  endEpoch: number;
  displacementKm: number;
  supportTrend: 'increasing' | 'decreasing' | 'stable';
  extentTrend: 'expanding' | 'contracting' | 'stable';
  status: 'stable' | 'transient' | 'displacing';
}

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function centroidDistance(a: TrackedHotspotSnapshot, b: TrackedHotspotSnapshot): number {
  return haversineKm(a.centroidLat, a.centroidLng, b.centroidLat, b.centroidLng);
}

const MATCH_DISTANCE_KM = 3;
const DISPLACING_THRESHOLD_KM = 1.5;
const ADAPTIVE_SCORE_THRESHOLD = 0.55;

interface SliceEntry {
  id: string;
  label: string;
  hotspots: TrackedHotspotSnapshot[];
}

function buildSliceEntries(
  sliceResults: Record<string, StkdeSurfaceResponse>,
): SliceEntry[] {
  return Object.entries(sliceResults).map(([sliceId, surface]) => {
    const hotspots: TrackedHotspotSnapshot[] = (surface.hotspots ?? [])
      .filter((h) => h.supportCount > 0)
      .sort((a, b) => b.intensityScore - a.intensityScore)
      .map((h) => ({
        hotspotId: h.id,
        sliceId,
        sliceLabel: sliceId,
        centroidLng: h.centroidLng,
        centroidLat: h.centroidLat,
        supportCount: h.supportCount,
        intensityScore: h.intensityScore,
        radiusMeters: h.radiusMeters,
        peakStartEpochSec: h.peakStartEpochSec,
        peakEndEpochSec: h.peakEndEpochSec,
      }));

    return { id: sliceId, label: sliceId, hotspots };
  });
}

function sanitizeGridSize(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(4, Math.round(value as number)) : 32;
}

function sanitizeSmoothingMeters(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(1, value as number) : 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getAdaptiveMatchToleranceMeters(
  gridSize?: number,
  smoothingMeters?: number,
  cellWidthMeters?: number,
): number {
  const cellMeters = Number.isFinite(cellWidthMeters)
    ? Math.max(1, cellWidthMeters as number)
    : KDE_SCENE_SPAN_METERS / sanitizeGridSize(gridSize);
  const tolerance = cellMeters + sanitizeSmoothingMeters(smoothingMeters);
  return clamp(tolerance, cellMeters, cellMeters * 2);
}

function normalizedDifference(left: number, right: number): number {
  const denominator = Math.max(Math.abs(left), Math.abs(right), Number.EPSILON);
  return clamp(Math.abs(left - right) / denominator, 0, 1);
}

interface HotspotLink {
  currentIndex: number;
  nextIndex: number;
  snapshot: TrackedHotspotSnapshot;
  distance: number;
}

function getFixedLinks(current: SliceEntry, next: SliceEntry): HotspotLink[] {
  const links: HotspotLink[] = [];
  const usedInNext = new Set<number>();

  for (let currentIndex = 0; currentIndex < current.hotspots.length; currentIndex += 1) {
    const curHs = current.hotspots[currentIndex];
    if (!curHs) continue;

    let bestMatch: HotspotLink | null = null;
    for (let nextIndex = 0; nextIndex < next.hotspots.length; nextIndex += 1) {
      if (usedInNext.has(nextIndex)) continue;
      const nxtHs = next.hotspots[nextIndex];
      if (!nxtHs) continue;
      const distance = centroidDistance(curHs, nxtHs);
      if (distance < MATCH_DISTANCE_KM && (!bestMatch || distance < bestMatch.distance)) {
        bestMatch = { currentIndex, nextIndex, snapshot: nxtHs, distance };
      }
    }

    if (bestMatch) {
      usedInNext.add(bestMatch.nextIndex);
      links.push(bestMatch);
    }
  }

  return links;
}

function getAdaptiveLinks(
  current: SliceEntry,
  next: SliceEntry,
  options: HotspotMatchingOptions,
): HotspotLink[] {
  const toleranceKm = getAdaptiveMatchToleranceMeters(
    options.gridSize,
    options.smoothingMeters,
    options.cellWidthMeters,
  ) / 1000;
  const candidates: Array<HotspotLink & { score: number }> = [];

  for (let currentIndex = 0; currentIndex < current.hotspots.length; currentIndex += 1) {
    const curHs = current.hotspots[currentIndex];
    if (!curHs) continue;

    for (let nextIndex = 0; nextIndex < next.hotspots.length; nextIndex += 1) {
      const nxtHs = next.hotspots[nextIndex];
      if (!nxtHs) continue;
      const distance = centroidDistance(curHs, nxtHs);
      if (distance > toleranceKm) continue;

      const score =
        0.45 * (distance / toleranceKm) +
        0.35 * normalizedDifference(curHs.intensityScore, nxtHs.intensityScore) +
        0.2 * normalizedDifference(curHs.supportCount, nxtHs.supportCount);
      if (score >= ADAPTIVE_SCORE_THRESHOLD) continue;

      candidates.push({ currentIndex, nextIndex, snapshot: nxtHs, distance, score });
    }
  }

  candidates.sort((left, right) =>
    left.score - right.score ||
    left.distance - right.distance ||
    left.currentIndex - right.currentIndex ||
    left.nextIndex - right.nextIndex,
  );

  const usedCurrent = new Set<number>();
  const usedNext = new Set<number>();
  const links: HotspotLink[] = [];
  for (const candidate of candidates) {
    if (usedCurrent.has(candidate.currentIndex) || usedNext.has(candidate.nextIndex)) continue;
    usedCurrent.add(candidate.currentIndex);
    usedNext.add(candidate.nextIndex);
    links.push(candidate);
  }

  return links.sort((left, right) => left.currentIndex - right.currentIndex || left.nextIndex - right.nextIndex);
}

function matchHotspotsAcrossSlices(
  entries: SliceEntry[],
  options: HotspotMatchingOptions = {},
): TrackedHotspot[] {
  if (entries.length < 2) return [];

  const tracks: TrackedHotspot[] = [];

  for (let i = 0; i < entries.length - 1; i++) {
    const current = entries[i];
    const next = entries[i + 1];
    const links = options.mode === 'adaptive'
      ? getAdaptiveLinks(current, next, options)
      : getFixedLinks(current, next);
    const usedInNext = new Set(links.map((link) => link.nextIndex));

    for (const link of links) {
      const curHs = current.hotspots[link.currentIndex];
      if (!curHs) continue;

      const existingTrack = tracks.find(
        (t) =>
          t.snapshots.length > 0 &&
          t.snapshots[t.snapshots.length - 1].sliceId === curHs.sliceId,
      );

      if (existingTrack) {
        existingTrack.snapshots.push(link.snapshot);
      } else {
        tracks.push({
          id: `track-${tracks.length + 1}`,
          label: `Track ${tracks.length + 1}`,
          snapshots: [curHs, link.snapshot],
          startEpoch: curHs.peakStartEpochSec,
          endEpoch: link.snapshot.peakEndEpochSec,
          displacementKm: 0,
          supportTrend: 'stable',
          extentTrend: 'stable',
          status: 'stable',
        });
      }
    }

    for (let j = 0; j < next.hotspots.length; j++) {
      if (!usedInNext.has(j)) {
        tracks.push({
          id: `track-${tracks.length + 1}`,
          label: `Track ${tracks.length + 1}`,
          snapshots: [next.hotspots[j]],
          startEpoch: next.hotspots[j].peakStartEpochSec,
          endEpoch: next.hotspots[j].peakEndEpochSec,
          displacementKm: 0,
          supportTrend: 'stable',
          extentTrend: 'stable',
          status: 'transient',
        });
      }
    }
  }

  for (const track of tracks) {
    if (track.snapshots.length < 2) {
      track.status = 'transient';
      continue;
    }

    let totalKm = 0;
    for (let i = 1; i < track.snapshots.length; i++) {
      totalKm += centroidDistance(track.snapshots[i - 1], track.snapshots[i]);
    }
    track.displacementKm = Math.round(totalKm * 100) / 100;

    const supports = track.snapshots.map((s) => s.supportCount);
    const firstSupport = supports[0];
    const lastSupport = supports[supports.length - 1];
    if (lastSupport > firstSupport * 1.2) {
      track.supportTrend = 'increasing';
    } else if (lastSupport < firstSupport * 0.8) {
      track.supportTrend = 'decreasing';
    } else {
      track.supportTrend = 'stable';
    }

    const radii = track.snapshots.map((s) => s.radiusMeters);
    const firstRadius = radii[0];
    const lastRadius = radii[radii.length - 1];
    if (lastRadius > firstRadius * 1.2) {
      track.extentTrend = 'expanding';
    } else if (lastRadius < firstRadius * 0.8) {
      track.extentTrend = 'contracting';
    } else {
      track.extentTrend = 'stable';
    }

    if (totalKm > DISPLACING_THRESHOLD_KM) {
      track.status = 'displacing';
    } else {
      track.status = 'stable';
    }
  }

  return tracks.sort((a, b) => {
    const aScore = a.snapshots.reduce((s, hs) => s + hs.intensityScore, 0) / a.snapshots.length;
    const bScore = b.snapshots.reduce((s, hs) => s + hs.intensityScore, 0) / b.snapshots.length;
    return bScore - aScore || a.displacementKm - b.displacementKm;
  });
}

export interface HotspotEvolutionResult {
  tracks: TrackedHotspot[];
  totalDisplacementKm: number;
  sliceCount: number;
  hasMultiSlice: boolean;
}

export function buildHotspotEvolution(
  sliceResults: Record<string, StkdeSurfaceResponse> | null | undefined,
  options: HotspotMatchingOptions = {},
): HotspotEvolutionResult {
  if (!sliceResults || Object.keys(sliceResults).length < 2) {
    return { tracks: [], totalDisplacementKm: 0, sliceCount: Object.keys(sliceResults ?? {}).length, hasMultiSlice: false };
  }

  const entries = buildSliceEntries(sliceResults);
  const tracks = matchHotspotsAcrossSlices(entries, options);
  const totalDisplacementKm = Math.round(tracks.reduce((sum, t) => sum + t.displacementKm, 0) * 100) / 100;

  return {
    tracks,
    totalDisplacementKm,
    sliceCount: entries.length,
    hasMultiSlice: true,
  };
}
