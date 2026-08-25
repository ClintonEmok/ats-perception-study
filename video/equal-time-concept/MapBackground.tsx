import React from 'react';
import { BORDER_COLOR, DARK_TEXT, MUTED_TEXT } from './data';

interface MapBackgroundProps {
  width: number;
  height: number;
  opacity: number;
}

export const MapBackground: React.FC<MapBackgroundProps> = ({
  width,
  height,
  opacity,
}) => {
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
        viewBox="0 0 1000 500"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        <defs>
          <pattern
            id="map-minor-grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="1.5"
            />
            {/* Fine coordinate cross */}
            <path
              d="M 23 25 L 27 25 M 25 23 L 25 27"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* Map Grid Background */}
        <rect
          width="1000"
          height="500"
          fill="url(#map-minor-grid)"
          rx="12"
        />

        {/* Geographic Neighborhood Polygons (Light theme TU/e style) */}
        <g stroke={BORDER_COLOR} strokeWidth="1.5" strokeLinejoin="round">
          {/* North Side / Lakeshore */}
          <path d="M 120 40 L 260 30 L 310 110 L 190 140 Z" fill="#f8fafc" />
          <path d="M 260 30 L 440 20 L 490 90 L 310 110 Z" fill="#f1f5f9" />
          <path d="M 440 20 L 620 15 L 680 80 L 490 90 Z" fill="#f8fafc" />
          <path d="M 620 15 L 820 10 L 870 70 L 680 80 Z" fill="#f1f5f9" />

          {/* Central / Downtown / Loop Corridor */}
          <path d="M 190 140 L 310 110 L 360 240 L 220 260 Z" fill="#f1f5f9" />
          <path d="M 310 110 L 490 90 L 530 230 L 360 240 Z" fill="#f8fafc" />
          <path d="M 490 90 L 680 80 L 720 220 L 530 230 Z" fill="#eef2f6" />
          <path d="M 680 80 L 870 70 L 890 210 L 720 220 Z" fill="#f8fafc" />

          {/* West & South Central Districts */}
          <path d="M 140 280 L 220 260 L 280 390 L 170 410 Z" fill="#f8fafc" />
          <path d="M 220 260 L 360 240 L 410 380 L 280 390 Z" fill="#eef2f6" />
          <path d="M 360 240 L 530 230 L 570 370 L 410 380 Z" fill="#f1f5f9" />
          <path d="M 530 230 L 720 220 L 750 360 L 570 370 Z" fill="#f8fafc" />
          <path d="M 720 220 L 890 210 L 910 350 L 750 360 Z" fill="#eef2f6" />

          {/* Far South / Southwest Districts */}
          <path d="M 170 410 L 280 390 L 340 480 L 210 490 Z" fill="#f1f5f9" />
          <path d="M 280 390 L 410 380 L 470 475 L 340 480 Z" fill="#f8fafc" />
          <path d="M 410 380 L 570 370 L 620 470 L 470 475 Z" fill="#eef2f6" />
          <path d="M 570 370 L 750 360 L 790 465 L 620 470 Z" fill="#f1f5f9" />
          <path d="M 750 360 L 910 350 L 930 460 L 790 465 Z" fill="#f8fafc" />
        </g>

        {/* Arterial Road Networks */}
        <g stroke="#cbd5e1" fill="none">
          <path
            d="M 50 130 C 250 120, 500 160, 950 110"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 60 270 C 300 250, 600 290, 940 240"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 80 400 C 350 380, 650 420, 950 380"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 250 10 C 270 180, 240 340, 290 490"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 520 10 C 500 190, 550 330, 540 490"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 740 10 C 720 170, 760 350, 780 490"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Lake / Coastal Boundary (East) */}
        <path
          d="M 870 0 C 900 120, 890 280, 950 500 L 1000 500 L 1000 0 Z"
          fill="#f0f9ff"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="4 3"
        />

        {/* Geographic Outer Frame Border */}
        <rect
          x="1"
          y="1"
          width="998"
          height="498"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          rx="12"
        />
      </svg>

      {/* Discrete Corner Scale Tag */}
      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 14,
          fontSize: 13,
          fontFamily: 'monospace',
          fontWeight: 700,
          color: MUTED_TEXT,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          padding: '2px 8px',
          borderRadius: 4,
          border: '1px solid #e2e8f0',
        }}
      >
        GEOGRAPHIC SPACE
      </div>
    </div>
  );
};
