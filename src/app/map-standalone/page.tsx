'use client';

import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const AMSTERDAM = {
  longitude: 4.9041,
  latitude: 52.3676,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export default function MapStandalonePage() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: 1440, height: 900 }}>
      <Map
        initialViewState={AMSTERDAM}
        style={{ width: 1440, height: 900 }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
      />
    </div>
  );
}
