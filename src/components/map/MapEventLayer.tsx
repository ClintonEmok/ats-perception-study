import React, { useMemo } from 'react';
import type { CircleLayerSpecification, ExpressionSpecification } from 'maplibre-gl';
import { Layer, Source } from 'react-map-gl/maplibre';
import { CrimeRecord } from '@/types/crime';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { epochSecondsToNormalized, normalizedToEpochSeconds } from '@/lib/time-domain';
import { unproject } from '@/lib/projection';
import { getCrimeTypeId, getCrimeTypeName, getDistrictId } from '@/lib/category-maps';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';
import { normalizeTimeRange, type TimeRangeLike } from '@/lib/time-range';

const MAX_POINTS = 20000;

/**
 * Resolves a timestamp to Unix epoch seconds across the existing data-path
 * conventions: milliseconds are divided down, normalized 0-100 values are
 * converted through the timeline domain, and everything else is treated as
 * already epoch seconds.
 */
function resolvePointEpochSeconds(
  timestamp: number,
  minTimestampSec: number | null,
  maxTimestampSec: number | null,
): number {
  if (!Number.isFinite(timestamp)) return Number.NaN;
  if (Math.abs(timestamp) >= 1e11) return timestamp / 1000;
  if (
    timestamp >= 0 &&
    timestamp <= 100 &&
    minTimestampSec !== null &&
    maxTimestampSec !== null &&
    maxTimestampSec > minTimestampSec
  ) {
    return normalizedToEpochSeconds(timestamp, minTimestampSec, maxTimestampSec);
  }
  return timestamp;
}

type ScenePoint = {
  x: number;
  z: number;
  index: number;
  lat?: number;
  lon?: number;
  typeId: number;
  linearY: number;
  /** Unix epoch seconds for active-slice highlight matching. */
  epochTimestamp: number;
};

interface MapEventLayerProps {
  hoveredTypeId?: number | null;
  records?: CrimeRecord[];
  selectedTimeRange?: TimeRangeLike;
  selectedTypes?: number[];
  selectedDistricts?: number[];
  selectedSpatialBounds?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } | null;
  /** Active-slice epoch range used to emphasize matching points, in seconds. */
  highlightRange?: [number, number] | null;
}

export default function MapEventLayer({
  hoveredTypeId,
  records = [],
  selectedTimeRange,
  selectedTypes = [],
  selectedDistricts = [],
  selectedSpatialBounds,
  highlightRange = null,
}: MapEventLayerProps) {
  const columns = useTimelineDataStore((state) => state.columns);
  const data = useTimelineDataStore((state) => state.data);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme];

  const activeEpochRange = useMemo<[number, number] | null>(
    () => (highlightRange ? normalizeTimeRange(highlightRange) : null),
    [highlightRange],
  );

  const filteredPoints = useMemo<ScenePoint[]>(() => {
    const points: ScenePoint[] = [];
    const normalizedTimeRange = normalizeTimeRange(selectedTimeRange);

    if (records.length > 0) {
      let minTime = -Infinity;
      let maxTime = Infinity;

      if (normalizedTimeRange) {
        const [rangeStart, rangeEnd] = normalizedTimeRange;
        minTime = Math.min(rangeStart, rangeEnd);
        maxTime = Math.max(rangeStart, rangeEnd);
      }

      for (let i = 0; i < records.length; i += 1) {
        const point = records[i];
        const timestamp = point.timestamp;
        if (timestamp < minTime || timestamp > maxTime) continue;

        const typeId = getCrimeTypeId(point.type);
        if (selectedTypes.length > 0 && !selectedTypes.includes(typeId)) continue;

        const districtId = getDistrictId(point.district);
        if (selectedDistricts.length > 0 && !selectedDistricts.includes(districtId)) continue;

        if (selectedSpatialBounds && typeof point.lat === 'number' && typeof point.lon === 'number') {
          if (
            point.lat < selectedSpatialBounds.minLat ||
            point.lat > selectedSpatialBounds.maxLat ||
            point.lon < selectedSpatialBounds.minLon ||
            point.lon > selectedSpatialBounds.maxLon
          ) {
            continue;
          }
        }

        points.push({
          x: point.x,
          z: point.z,
          index: i,
          lat: point.lat,
          lon: point.lon,
          typeId,
          linearY: timestamp,
          epochTimestamp: point.timestamp,
        });
      }
    } else if (columns) {
      let minTime = -Infinity;
      let maxTime = Infinity;
      const normalizedTimeRange = normalizeTimeRange(selectedTimeRange);

      if (normalizedTimeRange) {
        const [rangeStart, rangeEnd] = normalizedTimeRange;
        if (minTimestampSec !== null && maxTimestampSec !== null) {
          const normalizedStart = epochSecondsToNormalized(rangeStart, minTimestampSec, maxTimestampSec);
          const normalizedEnd = epochSecondsToNormalized(rangeEnd, minTimestampSec, maxTimestampSec);
          minTime = Math.min(normalizedStart, normalizedEnd);
          maxTime = Math.max(normalizedStart, normalizedEnd);
        } else if (rangeStart >= 0 && rangeEnd <= 100) {
          minTime = Math.min(rangeStart, rangeEnd);
          maxTime = Math.max(rangeStart, rangeEnd);
        }
      }

      for (let i = 0; i < columns.length; i += 1) {
        const timestamp = columns.timestamp[i];
        if (timestamp < minTime || timestamp > maxTime) continue;
        if (selectedTypes.length > 0 && !selectedTypes.includes(columns.type[i])) continue;
        if (selectedDistricts.length > 0 && !selectedDistricts.includes(columns.district[i])) continue;

        if (selectedSpatialBounds && columns.lat && columns.lon) {
          const lat = columns.lat[i];
          const lon = columns.lon[i];
          if (
            lat < selectedSpatialBounds.minLat ||
            lat > selectedSpatialBounds.maxLat ||
            lon < selectedSpatialBounds.minLon ||
            lon > selectedSpatialBounds.maxLon
          ) {
            continue;
          }
        }
        points.push({
          x: columns.x[i],
          z: columns.z[i],
          index: i,
          lat: columns.lat?.[i],
          lon: columns.lon?.[i],
          typeId: columns.type[i],
          linearY: columns.timestamp[i],
          epochTimestamp:
            typeof columns.timestampSec !== 'undefined'
              ? columns.timestampSec[i]
              : resolvePointEpochSeconds(columns.timestamp[i], minTimestampSec, maxTimestampSec),
        });
      }
    } else if (data.length > 0) {
      let minTime = -Infinity;
      let maxTime = Infinity;
      const normalizedTimeRange = normalizeTimeRange(selectedTimeRange);

      if (normalizedTimeRange) {
        const [rangeStart, rangeEnd] = normalizedTimeRange;
        if (rangeStart >= 0 && rangeEnd <= 100) {
          minTime = Math.min(rangeStart, rangeEnd);
          maxTime = Math.max(rangeStart, rangeEnd);
        }
      }

      for (let i = 0; i < data.length; i += 1) {
        const point = data[i];
        if (point.timestamp < minTime || point.timestamp > maxTime) continue;
        const typeId = getCrimeTypeId(point.type);
        if (selectedTypes.length > 0 && !selectedTypes.includes(typeId)) continue;

        const districtId = point.districtId;
        if (selectedDistricts.length > 0 && typeof districtId === 'number' && !selectedDistricts.includes(districtId)) {
          continue;
        }

        const lat = typeof point.lat === 'number' ? point.lat : undefined;
        const lon = typeof point.lon === 'number' ? point.lon : undefined;

        if (selectedSpatialBounds && lat !== undefined && lon !== undefined) {
          if (
            lat < selectedSpatialBounds.minLat ||
            lat > selectedSpatialBounds.maxLat ||
            lon < selectedSpatialBounds.minLon ||
            lon > selectedSpatialBounds.maxLon
          ) {
            continue;
          }
        }
        points.push({
          x: point.x,
          z: point.z,
          index: i,
          lat,
          lon,
          typeId,
          linearY: typeof point.y === 'number' ? point.y : point.timestamp,
          epochTimestamp: resolvePointEpochSeconds(point.timestamp, minTimestampSec, maxTimestampSec),
        });
      }
    }

    if (points.length <= MAX_POINTS) {
      return points;
    }

    const stride = Math.ceil(points.length / MAX_POINTS);
    const sampled: ScenePoint[] = [];
    for (let i = 0; i < points.length; i += stride) {
      sampled.push(points[i]);
    }
    return sampled;
  }, [
    columns,
    data,
    records,
    maxTimestampSec,
    minTimestampSec,
    selectedDistricts,
    selectedSpatialBounds,
    selectedTimeRange,
    selectedTypes
  ]);

  const geoJson = useMemo(() => {
    if (filteredPoints.length === 0) return null;
    const inActiveSlice = (epochTimestamp: number): boolean => {
      if (!activeEpochRange) return false;
      return (
        Number.isFinite(epochTimestamp) &&
        epochTimestamp >= activeEpochRange[0] &&
        epochTimestamp <= activeEpochRange[1]
      );
    };
    return {
      type: 'FeatureCollection' as const,
      features: filteredPoints
        .map((point) => {
          const lat = point.lat;
          const lon = point.lon;

          const [resolvedLat, resolvedLon] =
            Number.isFinite(lat) && Number.isFinite(lon)
              ? [lat as number, lon as number]
              : unproject(point.x, point.z);
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [resolvedLon, resolvedLat]
            },
            properties: {
              index: point.index,
              typeId: point.typeId,
              inActiveSlice: inActiveSlice(point.epochTimestamp)
            }
          };
        })
        .filter((feature) => {
          const coords = feature.geometry.coordinates;
          return Number.isFinite(coords[0]) && Number.isFinite(coords[1]);
        })
    };
  }, [activeEpochRange, filteredPoints]);

  const typeColorExpression = useMemo(() => {
    const entries: (string | number)[] = [];
    for (let id = 1; id <= 35; id += 1) {
      const label = getCrimeTypeName(id);
      const key = label.toUpperCase();
      const color =
        palette.categoryColors[key] ||
        palette.categoryColors[label] ||
        palette.categoryColors['OTHER'] ||
        '#94a3b8';
      entries.push(id, color);
    }
    const fallback = palette.categoryColors['OTHER'] || '#94a3b8';
    return ['match', ['get', 'typeId'], ...entries, fallback] as unknown as ExpressionSpecification;
  }, [palette]);

  const paint = useMemo<CircleLayerSpecification['paint']>(() => {
    const isActiveSlice = ['==', ['get', 'inActiveSlice'], true] as ExpressionSpecification;
    const isHovered = ['==', ['get', 'typeId'], hoveredTypeId ?? -1] as ExpressionSpecification;
    const hasHover = hoveredTypeId !== undefined && hoveredTypeId !== null;
    const hasHighlight = activeEpochRange !== null;

    if (hasHighlight) {
      // Active-slice points are emphasized (larger, brighter, with a ring);
      // context points stay visible but subdued. Category colors are kept.
      const radius: ExpressionSpecification = hasHover
        ? ['case', ['all', isActiveSlice, isHovered], 6, isActiveSlice, 5, isHovered, 4, 2]
        : ['case', isActiveSlice, 5, 2.5];
      const opacity: ExpressionSpecification = hasHover
        ? ['case', ['all', isActiveSlice, isHovered], 0.95, isActiveSlice, 0.9, isHovered, 0.95, 0.18]
        : ['case', isActiveSlice, 0.95, 0.22];
      return {
        'circle-radius': radius,
        'circle-color': typeColorExpression,
        'circle-opacity': opacity,
        'circle-stroke-color': ['case', isActiveSlice, 'rgba(255, 255, 255, 0.9)', 'transparent'] as ExpressionSpecification,
        'circle-stroke-width': ['case', isActiveSlice, 1.2, 0] as ExpressionSpecification,
      };
    }

    if (hasHover) {
      return {
        'circle-radius': ['case', isHovered, 4, 2] as ExpressionSpecification,
        'circle-color': typeColorExpression,
        'circle-opacity': ['case', isHovered, 0.95, 0.15] as ExpressionSpecification,
      };
    }

    return {
      'circle-radius': 3,
      'circle-color': typeColorExpression,
      'circle-opacity': 0.7,
    };
  }, [activeEpochRange, hoveredTypeId, typeColorExpression]);

  if (!geoJson) return null;

  return (
    <Source id="map-events-source" type="geojson" data={geoJson}>
      <Layer
        id="map-events-layer"
        type="circle"
        paint={paint}
      />
    </Source>
  );
}
