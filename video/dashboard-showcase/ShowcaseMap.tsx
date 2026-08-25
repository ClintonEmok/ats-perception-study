import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import communityAreaData from '../data/chicago-community-areas.json';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import {
  colorForType,
  isSelectedRecord,
  REAL_WEEK_RECORDS,
  SOURCE_RECORD_COUNT,
} from '../real/data';

type Coordinate = [number, number];
type CommunityArea = { name: string; number: string; rings: Coordinate[][] };

const MAP_WIDTH = 1510;
const MAP_HEIGHT = 542;

// Exact WebMercator projection matching MapLibre 2D viewport
export const MAPLIBRE_VIEWPORT = new WebMercatorViewport({
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  longitude: -87.68,
  latitude: 41.83,
  zoom: 9.6,
});

const areas = communityAreaData.areas as CommunityArea[];

// Project GeoJSON community area boundaries
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

// Precompute static SVG path strings for all 5,152 Chicago records
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

// Projected Hotspot centroids
const HOTSPOTS = [
  { name: 'THE LOOP', ...(() => { const [x, y] = MAPLIBRE_VIEWPORT.project([-87.6298, 41.8781]); return { x, y }; })(), r: 42 },
  { name: 'AUSTIN', ...(() => { const [x, y] = MAPLIBRE_VIEWPORT.project([-87.765, 41.89]); return { x, y }; })(), r: 38 },
  { name: 'NEAR NORTH SIDE', ...(() => { const [x, y] = MAPLIBRE_VIEWPORT.project([-87.635, 41.898]); return { x, y }; })(), r: 35 },
];

export function ShowcaseMap({
  selectionProgress = 0,
  revealProgress = 1,
  highlightHotspots = false,
}: {
  selectionProgress?: number;
  revealProgress?: number;
  highlightHotspots?: boolean;
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
        background: '#f8fafc',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* 1. Authentic 2D MapLibre Flat CARTO Positron Basemap */}
      <Img
        src={staticFile('chicago-positron-basemap.png')}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
      />

      {/* 2. SVG Vector Overlays: Boundaries, Hotspots & 5,152 Crime Incidents */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Subtle MapLibre Community Area Boundary Outlines */}
        <g stroke="#64748b" strokeWidth="0.8" strokeLinejoin="round" fill="none" opacity="0.32">
          {areaPaths.map((area) => (
            <path key={area.number} d={area.path} />
          ))}
        </g>

        {/* Hotspot Pulse Rings (Chapter 1 Spatial Foundation) */}
        {highlightHotspots ? (
          <g>
            {HOTSPOTS.map((hotspot) => (
              <g key={hotspot.name}>
                <circle
                  cx={hotspot.x}
                  cy={hotspot.y}
                  r={hotspot.r}
                  fill="rgba(37, 99, 235, 0.12)"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={hotspot.x}
                  cy={hotspot.y}
                  r={hotspot.r + 14}
                  fill="rgba(37, 99, 235, 0.04)"
                  stroke="#2563eb"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <rect
                  x={hotspot.x - 48}
                  y={hotspot.y - hotspot.r - 20}
                  width="96"
                  height="16"
                  rx="4"
                  fill="rgba(15, 23, 42, 0.88)"
                />
                <text
                  x={hotspot.x}
                  y={hotspot.y - hotspot.r - 9}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8.5"
                  fontWeight="850"
                  fontFamily={MONO_FONT}
                  letterSpacing="0.8"
                >
                  {hotspot.name}
                </text>
              </g>
            ))}
          </g>
        ) : null}

        {/* Precomputed Static Incident Points (Smooth WebGL/GPU Pipeline) */}
        {pointPaths.map(({ type, contextPath, selectedPath }) => (
          <g key={type}>
            {/* Context Incidents (Unselected Time Window) */}
            <path
              d={contextPath}
              fill="none"
              stroke={colorForType(type)}
              strokeWidth="3.4"
              strokeLinecap="round"
              opacity={contextOpacity}
            />

            {/* Glowing Selected Halo (Synchronized Selection) */}
            {selectionProgress > 0.4 ? (
              <path
                d={selectedPath}
                fill="none"
                stroke={colorForType(type)}
                strokeWidth="9"
                strokeLinecap="round"
                opacity={0.22 * selectedOpacity * revealProgress}
              />
            ) : null}

            {/* Selected Incidents (Thursday 31 July) */}
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

      {/* Top Left Spatial View Badge */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 18,
          border: '1.5px solid rgba(15, 23, 42, 0.12)',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.96)',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ color: '#64748b', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
          Spatial Distribution
        </div>
        <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 800, marginTop: 2 }}>
          2D MapLibre Geographic Map
        </div>
      </div>

      {/* Top Right Coordinated MapLibre Engine Badge */}
      <div
        style={{
          position: 'absolute',
          right: 18,
          top: 18,
          border: '1px solid rgba(15, 23, 42, 0.12)',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.96)',
          padding: '8px 12px',
          color: '#0f172a',
          fontSize: 10,
          fontFamily: MONO_FONT,
          fontWeight: 750,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 99, background: '#16a34a' }} />
        <span>MapLibre GL · CARTO Positron Light</span>
      </div>

      {/* Bottom Right Crime Category Legend */}
      <div
        style={{
          position: 'absolute',
          right: 18,
          bottom: 16,
          border: '1px solid rgba(15, 23, 42, 0.12)',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.96)',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
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
            <span style={{ fontSize: 9, fontWeight: 750, fontFamily: MONO_FONT, color: '#334155' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
