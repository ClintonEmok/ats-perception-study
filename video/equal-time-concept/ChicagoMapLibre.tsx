import React, { useMemo } from 'react';
import { Img, staticFile } from 'remotion';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import chicagoGeoData from '../data/chicago-community-areas.json';

interface ChicagoMapLibreProps {
  width: number;
  height: number;
  opacity: number;
}

// Center & zoom settings aligned with our high-res CARTO Positron basemap
export const MAPLIBRE_VIEW_STATE = {
  longitude: -87.67,
  latitude: 41.84,
  zoom: 10.55,
  pitch: 0,
  bearing: 0,
};

export const ChicagoMapLibre: React.FC<ChicagoMapLibreProps> = ({
  width,
  height,
  opacity,
}) => {
  const viewport = useMemo(() => {
    return new WebMercatorViewport({
      width,
      height,
      longitude: MAPLIBRE_VIEW_STATE.longitude,
      latitude: MAPLIBRE_VIEW_STATE.latitude,
      zoom: MAPLIBRE_VIEW_STATE.zoom,
    });
  }, [width, height]);

  // Project all 77 Chicago Community Areas GeoJSON boundaries
  const areaPaths = useMemo(() => {
    return chicagoGeoData.areas.map((area) => {
      const d = area.rings
        .map((ring) => {
          return (
            ring
              .map(([lon, lat], i) => {
                const [x, y] = viewport.project([lon, lat]);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ') + ' Z'
          );
        })
        .join(' ');

      return {
        number: area.number,
        name: area.name,
        d,
      };
    });
  }, [viewport]);

  if (opacity <= 0.001) return null;

  return (
    <div
      style={{
        position: 'absolute',
        width,
        height,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        opacity,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
        border: '1.5px solid #cbd5e1',
        pointerEvents: 'none',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* 1. Local High-Resolution CARTO Positron Light Basemap (Glitch-Free & Instant) */}
      <Img
        src={staticFile('chicago-positron-basemap.png')}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* 2. Authentic 77 Chicago Community Areas GeoJSON Vector Overlays */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        <g stroke="#334155" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(15, 23, 42, 0.02)">
          {areaPaths.map((area) => (
            <path key={area.number} d={area.d} />
          ))}
        </g>
      </svg>
    </div>
  );
};
