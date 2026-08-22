import { interpolate } from 'remotion';
import { VIDEO_COLORS } from '../theme';

type MapModuleProps = {
  selectionProgress: number;
  linked: boolean;
};

const ROADS = [
  'M-20 55 C120 80 170 20 310 58 S520 120 720 36',
  'M10 175 C150 120 240 220 390 160 S610 130 760 205',
  'M-30 300 C120 260 240 350 410 285 S590 250 760 330',
  'M90 -20 C120 90 75 180 135 390',
  'M285 -20 C250 95 330 180 275 410',
  'M505 -20 C540 80 475 190 545 410',
  'M650 -20 C610 105 690 240 625 410',
];

const INCIDENTS = [
  [11, 21, 0], [17, 38, 1], [24, 28, 2], [30, 63, 0], [36, 44, 1], [42, 24, 0],
  [47, 53, 2], [52, 34, 1], [58, 68, 0], [63, 46, 2], [69, 30, 1], [74, 58, 0],
  [80, 39, 2], [85, 70, 1], [21, 76, 0], [38, 79, 1], [55, 82, 2], [72, 81, 0],
  [89, 25, 1], [14, 57, 2], [33, 35, 0], [49, 67, 1], [66, 19, 2], [77, 48, 0],
];

const POINT_COLORS = [VIDEO_COLORS.cyan, VIDEO_COLORS.red, VIDEO_COLORS.amber];

export function MapModule({ selectionProgress, linked }: MapModuleProps) {
  const focusX = interpolate(selectionProgress, [0, 1], [48, 64]);
  const focusY = interpolate(selectionProgress, [0, 1], [54, 42]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0c1218' }}>
      <svg width="100%" height="100%" viewBox="0 0 740 390" preserveAspectRatio="none">
        <defs>
          <radialGradient id="map-focus">
            <stop offset="0%" stopColor={VIDEO_COLORS.violet} stopOpacity={linked ? 0.55 : 0.12} />
            <stop offset="100%" stopColor={VIDEO_COLORS.violet} stopOpacity="0" />
          </radialGradient>
          <pattern id="minor-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="#1c2733" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="740" height="390" fill="url(#minor-grid)" />
        <path d="M0 15 L115 0 L170 82 L82 132 L0 96Z" fill="#111c24" stroke="#293746" />
        <path d="M172 0 L340 0 L326 112 L170 82Z" fill="#101922" stroke="#293746" />
        <path d="M340 0 L548 0 L514 114 L326 112Z" fill="#121b25" stroke="#293746" />
        <path d="M548 0 L740 0 L740 142 L514 114Z" fill="#0e1821" stroke="#293746" />
        <path d="M0 96 L82 132 L110 270 L0 290Z" fill="#111922" stroke="#293746" />
        <path d="M82 132 L326 112 L342 272 L110 270Z" fill="#0f1821" stroke="#293746" />
        <path d="M326 112 L514 114 L528 284 L342 272Z" fill="#111c24" stroke="#293746" />
        <path d="M514 114 L740 142 L740 295 L528 284Z" fill="#101820" stroke="#293746" />
        <path d="M0 290 L110 270 L270 390 L0 390Z" fill="#0f1922" stroke="#293746" />
        <path d="M110 270 L342 272 L430 390 L270 390Z" fill="#121b25" stroke="#293746" />
        <path d="M342 272 L528 284 L600 390 L430 390Z" fill="#101922" stroke="#293746" />
        <path d="M528 284 L740 295 L740 390 L600 390Z" fill="#111c24" stroke="#293746" />
        {ROADS.map((road, index) => (
          <g key={road}>
            <path d={road} fill="none" stroke="#091017" strokeWidth={index < 3 ? 9 : 6} />
            <path d={road} fill="none" stroke={index < 3 ? '#465261' : '#313c49'} strokeWidth={index < 3 ? 2.2 : 1.3} />
          </g>
        ))}
        <ellipse cx={`${focusX}%`} cy={`${focusY}%`} rx="150" ry="120" fill="url(#map-focus)" />
        {INCIDENTS.map(([x, y, type]) => {
          const dx = x - focusX;
          const dy = y - focusY;
          const inFocus = Math.sqrt(dx * dx + dy * dy) < 19;
          return (
            <g key={`${x}-${y}`} opacity={linked ? (inFocus ? 1 : 0.22) : 0.82}>
              {inFocus && linked ? <circle cx={`${x}%`} cy={`${y}%`} r="11" fill={POINT_COLORS[type]} opacity="0.16" /> : null}
              <circle cx={`${x}%`} cy={`${y}%`} r={inFocus && linked ? 4.6 : 3.2} fill={POINT_COLORS[type]} stroke="#e8f3ff" strokeWidth="0.7" />
            </g>
          );
        })}
        <rect
          x={`${focusX - 11}%`}
          y={`${focusY - 15}%`}
          width="22%"
          height="30%"
          rx="7"
          fill="none"
          stroke={VIDEO_COLORS.violetLight}
          strokeWidth={linked ? 2 : 0}
          strokeDasharray="7 5"
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: 14,
          bottom: 14,
          display: 'flex',
          gap: 10,
          padding: '7px 10px',
          border: `1px solid ${VIDEO_COLORS.border}`,
          borderRadius: 6,
          background: 'rgba(7,9,13,0.84)',
          color: VIDEO_COLORS.textMuted,
          fontSize: 8,
        }}
      >
        {['THEFT', 'ASSAULT', 'BURGLARY'].map((label, index) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: POINT_COLORS[index] }} />
            {label}
          </span>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 14,
          top: 14,
          border: `1px solid ${linked ? VIDEO_COLORS.violet : VIDEO_COLORS.border}`,
          borderRadius: 6,
          padding: '7px 10px',
          background: 'rgba(7,9,13,0.84)',
          color: linked ? VIDEO_COLORS.violetLight : VIDEO_COLORS.textMuted,
          fontSize: 9,
        }}
      >
        {linked ? '14 incidents in selected window' : '8,532 visible incidents'}
      </div>
    </div>
  );
}
