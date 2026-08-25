import React, { useMemo } from 'react';
import chicagoGeoData from '../data/chicago-community-areas.json';
import { BORDER_COLOR, DARK_TEXT, MUTED_TEXT } from './data';

interface ChicagoVectorMapProps {
  width: number;
  height: number;
  opacity: number;
}

const MIN_LON = -87.940114;
const MAX_LON = -87.52414;
const MIN_LAT = 41.644543;
const MAX_LAT = 42.023039;

export const ChicagoVectorMap: React.FC<ChicagoVectorMapProps> = ({
  width,
  height,
  opacity,
}) => {
  const pad = 24;
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;

  // Pre-generate SVG paths for all 77 Chicago Community Areas
  const areaPaths = useMemo(() => {
    return chicagoGeoData.areas.map((area, idx) => {
      const d = area.rings
        .map((ring) => {
          return (
            ring
              .map(([lon, lat], i) => {
                const x = pad + ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * innerW;
                const y = pad + ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * innerH;
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ') + ' Z'
          );
        })
        .join(' ');

      // Alternating subtle tone for clean academic distinction
      const fillColors = ['#f8fafc', '#f1f5f9', '#f3f6f9', '#f8fafc'];
      const fill = fillColors[idx % fillColors.length];

      return {
        name: area.name,
        number: area.number,
        d,
        fill,
      };
    });
  }, [innerW, innerH, pad]);

  if (opacity <= 0.01) return null;

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
        pointerEvents: 'none',
        transition: 'opacity 0.1s ease',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        <defs>
          {/* Subtle Background Coordinate Grid */}
          <pattern
            id="chicago-grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="1.2"
            />
          </pattern>
        </defs>

        {/* Map Bounding Box Background */}
        <rect
          width={width}
          height={height}
          fill="url(#chicago-grid)"
          rx="14"
        />

        {/* Lake Michigan Water Body (East of Chicago Shoreline) */}
        <rect
          x={width * 0.72}
          y={pad}
          width={width * 0.28 - pad}
          height={height - 2 * pad}
          fill="#f0f9ff"
          rx="8"
          opacity="0.8"
        />

        {/* 77 Authentic Chicago Community Areas Vector Polygons */}
        <g stroke={BORDER_COLOR} strokeWidth="1.4" strokeLinejoin="round">
          {areaPaths.map((area) => (
            <path
              key={area.number}
              d={area.d}
              fill={area.fill}
            />
          ))}
        </g>

        {/* Outer Map Frame */}
        <rect
          x="1"
          y="1"
          width={width - 2}
          height={height - 2}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.6"
          rx="14"
        />
      </svg>

      {/* Discrete Corner Header Badge */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          top: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          padding: '4px 10px',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 850,
            color: DARK_TEXT,
            letterSpacing: 0.6,
          }}
        >
          CHICAGO, IL
        </span>
        <span
          style={{
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 650,
            color: MUTED_TEXT,
          }}
        >
          77 Community Areas
        </span>
      </div>

      {/* Discrete Lake Michigan Label */}
      <div
        style={{
          position: 'absolute',
          right: 32,
          top: 24,
          fontSize: 15,
          fontFamily: 'monospace',
          fontWeight: 750,
          color: '#64748b',
          letterSpacing: 1.0,
        }}
      >
        LAKE MICHIGAN
      </div>

      {/* Scale/Space Tag */}
      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 18,
          fontSize: 13,
          fontFamily: 'monospace',
          fontWeight: 750,
          color: MUTED_TEXT,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          padding: '4px 10px',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
        }}
      >
        GEOGRAPHIC SPACE (2D)
      </div>
    </div>
  );
};
