import { interpolate } from 'remotion';
import { MONO_FONT, VIDEO_COLORS } from '../theme';

type CubeModuleProps = {
  selectionProgress: number;
  linked: boolean;
};

const CUBE_POINTS = [
  [235, 234, 0], [280, 218, 1], [330, 248, 2], [385, 216, 0], [435, 252, 1],
  [250, 186, 2], [308, 165, 0], [360, 190, 1], [420, 158, 2], [470, 185, 0],
  [270, 136, 1], [325, 114, 2], [382, 140, 0], [442, 106, 1], [500, 135, 2],
  [302, 84, 0], [360, 65, 1], [415, 88, 2], [475, 55, 0], [523, 83, 1],
];

export function CubeModule({ selectionProgress, linked }: CubeModuleProps) {
  const selectedY = interpolate(selectionProgress, [0, 1], [178, 115]);
  const pointPalette = [VIDEO_COLORS.cyan, VIDEO_COLORS.red, VIDEO_COLORS.amber];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0b0f16', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 700 390" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="cube-floor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#172131" />
            <stop offset="1" stopColor="#0c121a" />
          </linearGradient>
          <radialGradient id="cube-glow">
            <stop offset="0" stopColor={VIDEO_COLORS.violet} stopOpacity="0.48" />
            <stop offset="1" stopColor={VIDEO_COLORS.violet} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="375" cy={selectedY + 18} rx="180" ry="75" fill="url(#cube-glow)" opacity={linked ? 1 : 0.18} />
        <polygon points="185,285 420,335 570,260 335,215" fill="url(#cube-floor)" stroke="#526073" strokeWidth="1.5" />
        <polygon points="185,65 420,112 570,40 335,0" fill="rgba(34,211,238,0.025)" stroke="#3a4657" />
        <path d="M185 65V285 M420 112V335 M570 40V260 M335 0V215" stroke="#667287" strokeWidth="1.3" />
        {[78, 133, 188, 243].map((offset, index) => {
          const y1 = 285 - offset;
          const y2 = 335 - offset;
          const y3 = 260 - offset;
          const y4 = 215 - offset;
          return (
            <g key={offset} opacity={0.35 + index * 0.08}>
              <polygon points={`185,${y1} 420,${y2} 570,${y3} 335,${y4}`} fill="rgba(34,211,238,0.025)" stroke="#364353" />
              <line x1="185" y1={y1} x2="570" y2={y3} stroke="#263343" strokeDasharray="4 5" />
            </g>
          );
        })}
        <polygon
          points={`190,${selectedY + 34} 419,${selectedY + 80} 566,${selectedY + 9} 337,${selectedY - 31}`}
          fill="rgba(139,92,246,0.23)"
          stroke={VIDEO_COLORS.violetLight}
          strokeWidth={linked ? 2.5 : 1}
        />
        {CUBE_POINTS.map(([x, y, type]) => {
          const nearSelection = Math.abs(y - selectedY) < 40;
          return (
            <g key={`${x}-${y}`} opacity={linked ? (nearSelection ? 1 : 0.18) : 0.82}>
              <line x1={x} y1={285 + (x - 300) * 0.18} x2={x} y2={y} stroke={pointPalette[type]} strokeOpacity="0.18" />
              {nearSelection && linked ? <circle cx={x} cy={y} r="12" fill={pointPalette[type]} opacity="0.13" /> : null}
              <circle cx={x} cy={y} r={nearSelection && linked ? 5 : 3.5} fill={pointPalette[type]} stroke="#f5fbff" strokeWidth="0.7" />
            </g>
          );
        })}
        <line x1="128" y1="286" x2="128" y2="35" stroke={VIDEO_COLORS.violetLight} strokeWidth="1.5" />
        <path d="M122 44L128 34L134 44" fill="none" stroke={VIDEO_COLORS.violetLight} strokeWidth="1.5" />
        <text x="80" y="32" fill={VIDEO_COLORS.violetLight} fontSize="10" fontFamily={MONO_FONT}>TIME</text>
        <text x="80" y="90" fill="#79869a" fontSize="8" fontFamily={MONO_FONT}>JUL</text>
        <text x="80" y="150" fill="#79869a" fontSize="8" fontFamily={MONO_FONT}>MAY</text>
        <text x="80" y="210" fill="#79869a" fontSize="8" fontFamily={MONO_FONT}>MAR</text>
        <text x="80" y="272" fill="#79869a" fontSize="8" fontFamily={MONO_FONT}>JAN</text>
      </svg>

      <div
        style={{
          position: 'absolute',
          right: 14,
          top: 14,
          padding: '8px 10px',
          border: `1px solid ${linked ? VIDEO_COLORS.violet : VIDEO_COLORS.border}`,
          borderRadius: 6,
          background: 'rgba(7,9,13,0.82)',
          color: linked ? VIDEO_COLORS.violetLight : VIDEO_COLORS.textMuted,
          fontSize: 9,
          lineHeight: 1.5,
        }}
      >
        <div style={{ color: VIDEO_COLORS.text, fontWeight: 650 }}>Adaptive temporal volume</div>
        <div>{linked ? 'Selected interval expanded · density 0.82' : '20 temporal layers · adaptive scale'}</div>
      </div>
    </div>
  );
}
