import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import communityAreaData from '../data/chicago-community-areas.json';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  colorForType,
  isSelectedRecord,
  REAL_WEEK_RECORDS,
} from '../real/data';

type Coordinate = [number, number];
type CommunityArea = { name: string; number: string; rings: Coordinate[][] };

const MAP_WIDTH = 1490;
const MAP_HEIGHT = 560;

export const MAPLIBRE_VIEWPORT = new WebMercatorViewport({
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  longitude: -87.68,
  latitude: 41.83,
  zoom: 9.6,
});

const areas = communityAreaData.areas as CommunityArea[];

const areaPaths = areas.map((area) => ({
  number: area.number,
  name: area.name,
  path: area.rings
    .map((ring) =>
      ring
        .map(([lon, lat], index) => {
          const [x, y] = MAPLIBRE_VIEWPORT.project([lon, lat]);
          return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ') + ' Z'
    )
    .join(' '),
}));

const displayType = (type: string) =>
  type in {
    THEFT: true,
    BATTERY: true,
    ASSAULT: true,
    'CRIMINAL DAMAGE': true,
    BURGLARY: true,
    ROBBERY: true,
    'MOTOR VEHICLE THEFT': true,
  }
    ? type
    : 'OTHER';

const pointPaths = Array.from(new Set(REAL_WEEK_RECORDS.map((r) => displayType(r.type)))).map((type) => {
  const records = REAL_WEEK_RECORDS.filter((r) => displayType(r.type) === type);
  const contextRecords = records.filter((r) => !isSelectedRecord(r));
  const selectedRecords = records.filter((r) => isSelectedRecord(r));

  const buildPath = (list: typeof records) =>
    list
      .map((r) => {
        const [x, y] = MAPLIBRE_VIEWPORT.project([r.lon, r.lat]);
        return `M${x.toFixed(1)},${y.toFixed(1)}h0.01`;
      })
      .join(' ');

  return {
    type,
    contextPath: buildPath(contextRecords),
    selectedPath: buildPath(selectedRecords),
  };
});

export function RealDashboardMap({
  selectionProgress = 0,
  revealProgress = 1,
}: {
  selectionProgress?: number;
  revealProgress?: number;
}) {
  const selectedOpacity = interpolate(selectionProgress, [0.15, 0.7], [0.55, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contextOpacity =
    interpolate(selectionProgress, [0.15, 0.75], [0.75, 0.15], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) * revealProgress;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#090d16',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* 1. Authentic 2D MapLibre Flat Basemap */}
      <Img
        src={staticFile('chicago-positron-basemap.png')}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          filter: 'brightness(0.92) contrast(1.05)',
        }}
      />

      {/* 2. SVG Vector Overlays: Boundaries & Incidents */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Community Area Boundaries */}
        <g stroke="#475569" strokeWidth="0.85" strokeLinejoin="round" fill="none" opacity="0.35">
          {areaPaths.map((area) => (
            <path key={area.number} d={area.path} />
          ))}
        </g>

        {/* Precomputed Static Incident Points */}
        {pointPaths.map(({ type, contextPath, selectedPath }) => (
          <g key={type}>
            {/* Context Incidents */}
            <path
              d={contextPath}
              fill="none"
              stroke={colorForType(type)}
              strokeWidth="3.4"
              strokeLinecap="round"
              opacity={contextOpacity}
            />

            {/* Glowing Selected Halos */}
            {selectionProgress > 0.4 ? (
              <path
                d={selectedPath}
                fill="none"
                stroke={colorForType(type)}
                strokeWidth="9"
                strokeLinecap="round"
                opacity={0.25 * selectedOpacity * revealProgress}
              />
            ) : null}

            {/* Selected Incidents */}
            <path
              d={selectedPath}
              fill="none"
              stroke={colorForType(type)}
              strokeWidth="4"
              strokeLinecap="round"
              opacity={selectedOpacity * revealProgress}
            />
          </g>
        ))}
      </svg>

      {/* Top Left Viewport Title Tag */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '7px 12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, fontFamily: MONO_FONT }}>
          SPATIAL OVERVIEW
        </div>
        <div style={{ color: '#f8fafc', fontSize: 12.5, fontWeight: 800, marginTop: 1 }}>
          2D MapLibre Geographic Map
        </div>
      </div>

      {/* Bottom Right Crime Category Legend */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          padding: '7px 12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {[
          ['THEFT', colorForType('THEFT')],
          ['BATTERY', colorForType('BATTERY')],
          ['ASSAULT', colorForType('ASSAULT')],
          ['CRIMINAL DAMAGE', colorForType('CRIMINAL DAMAGE')],
          ['OTHER', colorForType('OTHER')],
        ].map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: color }} />
            <span style={{ fontSize: 9, fontWeight: 750, fontFamily: MONO_FONT, color: '#cbd5e1' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
