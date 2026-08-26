import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import communityAreaData from '../data/chicago-community-areas.json';
import { REAL_WEEK_RECORDS, isSelectedRecord } from '../real/data';
import { DASHBOARD_CATEGORY_COLORS } from './palette';

type Coordinate = [number, number];
type CommunityArea = { name: string; number: string; rings: Coordinate[][] };

const MAP_WIDTH = 1600;
const MAP_HEIGHT = 710;
const viewport = new WebMercatorViewport({
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  longitude: -87.68,
  latitude: 41.83,
  zoom: 9.9,
});

const areaPaths = (communityAreaData.areas as CommunityArea[]).map((area) => ({
  number: area.number,
  path: area.rings
    .map((ring) => ring.map(([lon, lat], index) => {
      const [x, y] = viewport.project([lon, lat]);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ') + ' Z')
    .join(' '),
}));

const colorForType = (type: string): string =>
  DASHBOARD_CATEGORY_COLORS[type] ?? DASHBOARD_CATEGORY_COLORS.OTHER;

const pointPaths = Array.from(new Set(REAL_WEEK_RECORDS.map((record) => record.type))).map((type) => {
  const records = REAL_WEEK_RECORDS.filter((record) => record.type === type);
  const buildPath = (selected: boolean) => records
    .filter((record) => isSelectedRecord(record) === selected)
    .map((record) => {
      const [x, y] = viewport.project([record.lon, record.lat]);
      return `M${x.toFixed(1)},${y.toFixed(1)}h0.01`;
    })
    .join(' ');
  return { type, contextPath: buildPath(false), selectedPath: buildPath(true) };
});

export function DashboardDemoMap({ selectionProgress }: { selectionProgress: number }) {
  const selectedOpacity = interpolate(selectionProgress, [0.15, 0.7], [0.62, 0.95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const contextOpacity = interpolate(selectionProgress, [0.15, 0.75], [0.72, 0.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#ffffff' }}>
      <Img
        src={staticFile('chicago-positron-basemap.png')}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
      />
      <svg width="100%" height="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <g stroke="#a8a29e" strokeWidth="0.8" strokeLinejoin="round" fill="none" opacity="0.44">
          {areaPaths.map((area) => <path key={area.number} d={area.path} />)}
        </g>
        {pointPaths.map(({ type, contextPath, selectedPath }) => (
          <g key={type}>
            <path d={contextPath} fill="none" stroke={colorForType(type)} strokeWidth="3.2" strokeLinecap="round" opacity={contextOpacity} />
            {selectionProgress > 0.35 ? (
              <path d={selectedPath} fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" opacity={0.76 * selectedOpacity} />
            ) : null}
            <path d={selectedPath} fill="none" stroke={colorForType(type)} strokeWidth="4.2" strokeLinecap="round" opacity={selectedOpacity} />
          </g>
        ))}
      </svg>
    </div>
  );
}
