import type { StkdeHotspot, StkdeResponse } from '@/lib/stkde/contracts';
import type { StkdeQueryState } from './stkde-query-state';

export interface StkdeHotspotRowModel {
  id: string;
  title: string;
  location: string;
  intensityLabel: string;
  supportLabel: string;
  windowLabel: string;
  centroid: [number, number];
  radiusMeters: number;
}

const formatDate = (epochSec: number) => new Date(epochSec * 1000).toLocaleString();

const toRow = (hotspot: StkdeHotspot, index: number): StkdeHotspotRowModel => ({
  id: hotspot.id,
  title: `Hotspot ${index + 1}`,
  location: `${hotspot.centroidLat.toFixed(4)}, ${hotspot.centroidLng.toFixed(4)}`,
  intensityLabel: hotspot.intensityScore.toFixed(3),
  supportLabel: hotspot.supportCount.toLocaleString(),
  windowLabel: `${formatDate(hotspot.peakStartEpochSec)} - ${formatDate(hotspot.peakEndEpochSec)}`,
  centroid: [hotspot.centroidLng, hotspot.centroidLat],
  radiusMeters: hotspot.radiusMeters,
});

export interface StkdeViewModel {
  summaryLabel: string;
  heatmapCellCount: number;
  rows: StkdeHotspotRowModel[];
}

export function buildStkdeViewModel(state: StkdeQueryState, response: StkdeResponse | null): StkdeViewModel {
  if (!response) {
    return {
      summaryLabel: 'No STKDE response loaded',
      heatmapCellCount: 0,
      rows: [],
    };
  }

  const summaryLabel = [
    `${response.meta.requestedComputeMode} → ${response.meta.effectiveComputeMode}`,
    `${response.meta.eventCount.toLocaleString()} events`,
    `${response.heatmap.cells.length.toLocaleString()} cells`,
    `${response.hotspots.length.toLocaleString()} hotspots`,
    `SBW ${state.spatialBandwidthMeters}m`,
    `TBW ${state.temporalBandwidthHours}h`,
  ].join(' • ');

  return {
    summaryLabel,
    heatmapCellCount: response.heatmap.cells.length,
    rows: response.hotspots.map(toRow),
  };
}
