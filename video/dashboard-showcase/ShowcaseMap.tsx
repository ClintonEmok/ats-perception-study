import React from 'react';
import { interpolate } from 'remotion';
import communityAreaData from '../data/chicago-community-areas.json';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { colorForType, isSelectedRecord, REAL_WEEK_RECORDS, SOURCE_RECORD_COUNT } from '../real/data';

type Coordinate = [number, number];
type CommunityArea = { name: string; number: string; rings: Coordinate[][] };

const WIDTH = 1000;
const HEIGHT = 610;
const MARGIN = 24;
const BOUNDS = { west: -87.94, east: -87.52, south: 41.64, north: 42.03 };
const areas = communityAreaData.areas as CommunityArea[];

const project = (lon: number, lat: number) => ({
  x: MARGIN + ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * (WIDTH - MARGIN * 2),
  y: MARGIN + ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * (HEIGHT - MARGIN * 2),
});

const ringPath = (ring: Coordinate[]) =>
  ring
    .map(([lon, lat], index) => {
      const point = project(lon, lat);
      return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(' ') + ' Z';

const areaPaths = areas.map((area) => ({
  ...area,
  path: area.rings.map(ringPath).join(' '),
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
  const buildPath = (selected: boolean, countLimit?: number) => {
    const filtered = records.filter((r) => isSelectedRecord(r) === selected);
    const sliced = countLimit !== undefined ? filtered.slice(0, countLimit) : filtered;
    return sliced
      .map((r) => {
        const point = project(r.lon, r.lat);
        return `M${point.x.toFixed(1)},${point.y.toFixed(1)}h0.01`;
      })
      .join(' ');
  };
  return {
    type,
    totalRecords: records.length,
    contextPath: (limit?: number) => buildPath(false, limit),
    selectedPath: (limit?: number) => buildPath(true, limit),
  };
});

const labelNames = new Set(['ROGERS PARK', 'AUSTIN', 'NEAR NORTH SIDE', 'LOOP', 'ENGLEWOOD', 'HYDE PARK']);
const labels = areas
  .filter((area) => labelNames.has(area.name))
  .map((area) => {
    const points = area.rings.flat();
    const center = points.reduce(
      (sum, [lon, lat]) => ({ lon: sum.lon + lon, lat: sum.lat + lat }),
      { lon: 0, lat: 0 }
    );
    return { name: area.name, ...project(center.lon / points.length, center.lat / points.length) };
  });

export function ShowcaseMap({
  selectionProgress,
  buildProgress = 1,
  highlightHotspots = false,
}: {
  selectionProgress: number;
  buildProgress?: number;
  highlightHotspots?: boolean;
}) {
  const baseMapOpacity = interpolate(buildProgress, [0, 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pointsReveal = interpolate(buildProgress, [0.2, 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const selectedOpacity = interpolate(selectionProgress, [0.15, 0.7], [0.55, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contextOpacity = interpolate(selectionProgress, [0.15, 0.75], [0.65, 0.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#f1f5f9',
        overflow: 'hidden',
        fontFamily: FONT_FAMILY,
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
        <rect width={WIDTH} height={HEIGHT} fill="#f1f5f9" />

        {/* 1. Community Areas Basemap */}
        <g opacity={baseMapOpacity}>
          {areaPaths.map((area, index) => (
            <path
              key={area.number}
              d={area.path}
              fill={index % 2 === 0 ? '#ffffff' : '#f8fafc'}
              stroke="#cbd5e1"
              strokeWidth="0.85"
              fillRule="evenodd"
            />
          ))}
        </g>

        {/* 2. Neighborhood Labels */}
        <g opacity={baseMapOpacity * 0.7}>
          {labels.map((label) => (
            <text
              key={label.name}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              fill="#64748b"
              fontSize="7.5"
              fontWeight="700"
              letterSpacing="0.6"
              fontFamily={FONT_FAMILY}
            >
              {label.name}
            </text>
          ))}
        </g>

        {/* 3. Hotspot Focus Rings (When Highlighted) */}
        {highlightHotspots ? (
          <g>
            {[
              { name: 'LOOP', x: 670, y: 260, r: 42 },
              { name: 'AUSTIN', x: 280, y: 250, r: 36 },
              { name: 'NEAR NORTH', x: 660, y: 190, r: 32 },
            ].map((hotspot) => (
              <g key={hotspot.name}>
                <circle
                  cx={hotspot.x}
                  cy={hotspot.y}
                  r={hotspot.r}
                  fill="rgba(37, 99, 235, 0.08)"
                  stroke="#2563eb"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <circle cx={hotspot.x} cy={hotspot.y} r={hotspot.r + 10} fill="rgba(37, 99, 235, 0.04)" />
              </g>
            ))}
          </g>
        ) : null}

        {/* 4. Incident Points (Stream In) */}
        {pointPaths.map(({ type, totalRecords, contextPath, selectedPath }) => {
          const countLimit = Math.floor(totalRecords * pointsReveal);
          return (
            <g key={type} opacity={Math.min(1, pointsReveal * 1.5)}>
              <path
                d={contextPath(countLimit)}
                fill="none"
                stroke={colorForType(type)}
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity={contextOpacity}
              />
              {selectionProgress > 0.4 ? (
                <path
                  d={selectedPath(countLimit)}
                  fill="none"
                  stroke={colorForType(type)}
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  opacity={0.15 * selectedOpacity}
                />
              ) : null}
              <path
                d={selectedPath(countLimit)}
                fill="none"
                stroke={colorForType(type)}
                strokeWidth="3.8"
                strokeLinecap="round"
                opacity={selectedOpacity}
              />
            </g>
          );
        })}
      </svg>

      {/* Mode Badge (Top Left) */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 18,
          border: '1px solid rgba(15, 23, 42, 0.12)',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ color: '#64748b', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
          Spatial Distribution
        </div>
        <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 800, marginTop: 2 }}>
          Chicago Community Areas
        </div>
      </div>

      {/* Selection Pill (Top Right) */}
      <div
        style={{
          position: 'absolute',
          right: 18,
          top: 18,
          border: '1px solid rgba(15, 23, 42, 0.12)',
          borderRadius: 8,
          background: '#ffffff',
          padding: '8px 12px',
          fontSize: 10,
          fontFamily: MONO_FONT,
          fontWeight: 750,
          color: selectionProgress > 0.4 ? '#2563eb' : '#475569',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        {selectionProgress > 0.4
          ? '31 July Selected · 734 Incidents'
          : `${Math.floor(SOURCE_RECORD_COUNT * pointsReveal).toLocaleString()} Incidents Loaded`}
      </div>

      {/* Legend (Bottom Left) */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          bottom: 16,
          display: 'flex',
          gap: 10,
          border: '1px solid rgba(15, 23, 42, 0.12)',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '6px 12px',
          fontSize: 9,
          fontFamily: MONO_FONT,
          fontWeight: 700,
          color: '#334155',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        {['THEFT', 'BATTERY', 'ASSAULT', 'CRIMINAL DAMAGE'].map((type) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <i style={{ width: 7, height: 7, borderRadius: 99, background: colorForType(type) }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}
