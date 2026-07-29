import type { StkdeSurfaceResponse } from '@/lib/stkde/contracts';

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
      .slice(0, 5)
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

function matchHotspotsAcrossSlices(entries: SliceEntry[]): TrackedHotspot[] {
  if (entries.length < 2) return [];

  const tracks: TrackedHotspot[] = [];

  for (let i = 0; i < entries.length - 1; i++) {
    const current = entries[i];
    const next = entries[i + 1];
    const usedInNext = new Set<number>();

    for (const curHs of current.hotspots) {
      let bestMatch: { snapshot: TrackedHotspotSnapshot; distance: number; index: number } | null = null;

      for (let j = 0; j < next.hotspots.length; j++) {
        if (usedInNext.has(j)) continue;
        const nxtHs = next.hotspots[j];
        const d = centroidDistance(curHs, nxtHs);
        if (d < MATCH_DISTANCE_KM && (!bestMatch || d < bestMatch.distance)) {
          bestMatch = { snapshot: nxtHs, distance: d, index: j };
        }
      }

      if (bestMatch) {
        usedInNext.add(bestMatch.index);

        const existingTrack = tracks.find(
          (t) =>
            t.snapshots.length > 0 &&
            t.snapshots[t.snapshots.length - 1].sliceId === curHs.sliceId,
        );

        if (existingTrack) {
          existingTrack.snapshots.push(bestMatch.snapshot);
        } else {
          tracks.push({
            id: `track-${tracks.length + 1}`,
            label: `Track ${tracks.length + 1}`,
            snapshots: [curHs, bestMatch.snapshot],
            startEpoch: curHs.peakStartEpochSec,
            endEpoch: bestMatch.snapshot.peakEndEpochSec,
            displacementKm: 0,
            supportTrend: 'stable',
            extentTrend: 'stable',
            status: 'stable',
          });
        }
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
): HotspotEvolutionResult {
  if (!sliceResults || Object.keys(sliceResults).length < 2) {
    return { tracks: [], totalDisplacementKm: 0, sliceCount: Object.keys(sliceResults ?? {}).length, hasMultiSlice: false };
  }

  const entries = buildSliceEntries(sliceResults);
  const tracks = matchHotspotsAcrossSlices(entries);
  const totalDisplacementKm = Math.round(tracks.reduce((sum, t) => sum + t.displacementKm, 0) * 100) / 100;

  return {
    tracks,
    totalDisplacementKm,
    sliceCount: entries.length,
    hasMultiSlice: true,
  };
}
