import React, { useMemo } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import { Layer, Source } from 'react-map-gl/maplibre';

interface MapDebugOverlayProps {
  clickPoint: { lat: number; lon: number } | null;
  selectedPoint: { lat: number; lon: number } | null;
}

export default function MapDebugOverlay({ clickPoint, selectedPoint }: MapDebugOverlayProps) {
  const geoJson = useMemo(() => {
    const features = [];

    if (clickPoint) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [clickPoint.lon, clickPoint.lat],
        },
        properties: { type: 'click' },
      });
    }

    if (selectedPoint) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [selectedPoint.lon, selectedPoint.lat],
        },
        properties: { type: 'selected' },
      });
    }

    if (clickPoint && selectedPoint) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [clickPoint.lon, clickPoint.lat],
            [selectedPoint.lon, selectedPoint.lat],
          ],
        },
        properties: { type: 'link' },
      });
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [clickPoint, selectedPoint]);

  if (!clickPoint && !selectedPoint) return null;

  return (
      <Source id="debug-overlay-source" type="geojson" data={geoJson as FeatureCollection<Geometry>}>
      {/* Link Line */}
      <Layer
        id="debug-line"
        type="line"
        filter={['==', 'type', 'link']}
        paint={{
          'line-color': '#ff0000',
          'line-width': 2,
          'line-dasharray': [2, 2],
        }}
      />
      {/* Click Point */}
      <Layer
        id="debug-click-point"
        type="circle"
        filter={['==', 'type', 'click']}
        paint={{
          'circle-radius': 4,
          'circle-color': '#ff0000',
          'circle-opacity': 0.8,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        }}
      />
      {/* Selected Point Target */}
      <Layer
        id="debug-selected-point"
        type="circle"
        filter={['==', 'type', 'selected']}
        paint={{
          'circle-radius': 6,
          'circle-color': '#00ff00',
          'circle-opacity': 0.5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        }}
      />
    </Source>
  );
}
