import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { selectFilteredData } from '@/lib/data/selectors';
import { FeatureCollection, LineString } from 'geojson';

export const MapTrajectoryLayer: React.FC = () => {
  const selectedBlock = useTrajectoryStore((state) => state.selectedBlock);
  const isVisible = useTrajectoryStore((state) => state.isVisible);
  const columns = useTimelineDataStore((state) => state.columns);
  const data = useTimelineDataStore((state) => state.data);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);

  const geojson = useMemo<FeatureCollection<LineString> | null>(() => {
    if (!selectedBlock || !isVisible) return null;

    let points: { lat: number; lon: number }[] = [];

    if (columns && columns.lat && columns.lon) {
      const filtered = selectFilteredData(
        {
          columns,
          data,
          minTimestampSec,
          maxTimestampSec,
        },
        {
          selectedTypes: [],
          selectedDistricts: [],
          selectedTimeRange: null,
        }
      );
      for (let i = 0; i < filtered.length; i += 1) {
        const point = filtered[i];
        const { lat, lon } = point;
        if (point.block !== selectedBlock || typeof lat !== 'number' || typeof lon !== 'number') {
          continue;
        }
        points.push({ lat, lon });
      }
    } else {
      points = data
        .filter(
          (p) =>
            p.block === selectedBlock &&
            typeof p.lat === 'number' &&
            typeof p.lon === 'number'
        )
        .map((p) => ({ lat: p.lat as number, lon: p.lon as number }));
    }

    if (points.length < 2) return null;

    // Sort by something if needed? In this project points are usually chronologically sorted in store.
    // If not, we might need timestamps.

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: points.map(p => [p.lon, p.lat])
          }
        }
      ]
    };
  }, [selectedBlock, isVisible, columns, data, minTimestampSec, maxTimestampSec]);

  if (!geojson) return null;

  return (
    <Source type="geojson" data={geojson}>
      <Layer
        id="trajectory-path"
        type="line"
        paint={{
          'line-color': '#60a5fa', // blue-400
          'line-width': 4,
          'line-opacity': 0.8
        }}
      />
      <Layer
        id="trajectory-points"
        type="circle"
        paint={{
          'circle-radius': 5,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#60a5fa'
        }}
      />
    </Source>
  );
};
