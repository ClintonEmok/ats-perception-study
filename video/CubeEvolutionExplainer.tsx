import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ExplainerShell } from './ComponentExplainers';
import { colorForType, CUBE_CELLS, DAILY_COUNTS, WEEK_START } from './real/data';

type SurfaceCell = { x: number; z: number; count: number; dominantType: string };
type ScreenPoint = { x: number; y: number };

const DAY_LABELS = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 31', 'Fri 01', 'Sat 02', 'Sun 03'];
const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const DAILY_SURFACES = Array.from({ length: 7 }, (_, day) => {
  const cells = new Map<string, SurfaceCell & { types: Record<string, number> }>();
  for (const cell of CUBE_CELLS) {
    if (Math.floor((cell.time - WEEK_START) / 86400) !== day) continue;
    const key = `${cell.x}:${cell.z}`;
    const aggregate = cells.get(key) ?? { x: cell.x, z: cell.z, count: 0, dominantType: cell.dominantType, types: {} };
    aggregate.count += cell.count;
    aggregate.types[cell.dominantType] = (aggregate.types[cell.dominantType] ?? 0) + cell.count;
    if (aggregate.types[cell.dominantType] > (aggregate.types[aggregate.dominantType] ?? 0)) aggregate.dominantType = cell.dominantType;
    cells.set(key, aggregate);
  }
  return Array.from(cells.values());
});

const project = (x: number, z: number, time: number, cameraProgress: number): ScreenPoint => {
  const oblique = {
    x: 960 + x * 6.4 - z * 3.1,
    y: 745 - time * 500 + x * 0.72 + z * 0.96,
  };
  const overhead = {
    x: 960 + x * 8.6,
    y: 510 + z * 7,
  };
  return {
    x: interpolate(cameraProgress, [0, 1], [oblique.x, overhead.x]),
    y: interpolate(cameraProgress, [0, 1], [oblique.y, overhead.y]),
  };
};

const cornersAt = (time: number, cameraProgress: number) => [
  project(-50, -50, time, cameraProgress),
  project(50, -50, time, cameraProgress),
  project(50, 50, time, cameraProgress),
  project(-50, 50, time, cameraProgress),
];

const polygon = (points: ScreenPoint[]) => points.map((point) => `${point.x},${point.y}`).join(' ');

export function CubeEvolutionExplainer() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stackProgress = spring({ frame: frame - 15, fps, durationInFrames: 125, config: { damping: 200 } });
  const cameraProgress = interpolate(frame, [150, 300], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const scanProgress = interpolate(frame, [305, 620], [0, 6.99], clamp);
  const scanFocus = interpolate(frame, [260, 330], [0, 1], clamp);
  const activeDay = Math.min(6, Math.floor(scanProgress));
  const activeStage = frame < 150 ? 0 : frame < 305 ? 1 : frame < 620 ? 2 : 3;
  const orderedDays = [...Array.from({ length: 7 }, (_, day) => day).filter((day) => day !== activeDay), activeDay];
  const notes = [
    'Seven daily intensity surfaces rise from one shared geographic plane.',
    'The viewpoint rotates above the stack while temporal order is preserved.',
    `The top-down scan isolates ${DAY_LABELS[activeDay]} · ${DAILY_COUNTS[activeDay].toLocaleString()} incidents.`,
    'A fixed overhead view makes movement and persistence of hotspots directly comparable.',
  ];

  return (
    <ExplainerShell
      title="Cube evolution"
      subtitle="An overhead temporal scan shows how spatial intensity changes as successive daily surfaces pass through the same view."
      stages={['Assemble stack', 'Move overhead', 'Scan through days', 'Compare patterns']}
      activeStage={activeStage}
    >
      <div style={{ position: 'absolute', left: 155, right: 155, top: 145, height: 770, border: '1px solid #d6d6d2', borderRadius: 12, background: '#f9faf8', overflow: 'hidden', boxShadow: '0 14px 40px rgba(0,0,0,0.08)' }}>
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="evolution-low"><stop offset="0" stopColor="#38bdf8" stopOpacity="0.72" /><stop offset="1" stopColor="#38bdf8" stopOpacity="0" /></radialGradient>
            <radialGradient id="evolution-mid"><stop offset="0" stopColor="#f59e0b" stopOpacity="0.82" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
            <radialGradient id="evolution-high"><stop offset="0" stopColor="#ef4444" stopOpacity="0.88" /><stop offset="1" stopColor="#ef4444" stopOpacity="0" /></radialGradient>
          </defs>

          <polygon points={polygon(cornersAt(0, cameraProgress))} fill="#e2e8e5" stroke="#8d989d" strokeWidth="1.5" />
          {[0.2, 0.4, 0.6, 0.8].map((offset) => {
            const horizontalStart = project(-50, -50 + offset * 100, 0, cameraProgress);
            const horizontalEnd = project(50, -50 + offset * 100, 0, cameraProgress);
            const verticalStart = project(-50 + offset * 100, -50, 0, cameraProgress);
            const verticalEnd = project(-50 + offset * 100, 50, 0, cameraProgress);
            return <g key={offset} opacity="0.6"><line x1={horizontalStart.x} y1={horizontalStart.y} x2={horizontalEnd.x} y2={horizontalEnd.y} stroke="#aab5b1" /><line x1={verticalStart.x} y1={verticalStart.y} x2={verticalEnd.x} y2={verticalEnd.y} stroke="#aab5b1" /></g>;
          })}

          {orderedDays.map((day) => {
            const reveal = interpolate(stackProgress, [day / 7, (day + 1) / 7], [0, 1], clamp);
            const time = ((day + 0.5) / 7) * reveal;
            const isActive = day === activeDay;
            const layerOpacity = interpolate(scanFocus, [0, 1], [0.58 * reveal, isActive ? 1 : 0.035]);
            const points = cornersAt(time, cameraProgress);
            return (
              <g key={day} opacity={layerOpacity}>
                <polygon points={polygon(points)} fill={isActive ? 'rgba(124,58,237,0.085)' : 'rgba(255,255,255,0.12)'} stroke={isActive ? '#7c3aed' : '#aab3b7'} strokeWidth={isActive ? 2.2 : 0.9} />
                {DAILY_SURFACES[day].map((cell, index) => {
                  const point = project(cell.x, cell.z, time, cameraProgress);
                  const intensity = Math.min(1, cell.count / 13);
                  const gradient = intensity > 0.67 ? 'url(#evolution-high)' : intensity > 0.34 ? 'url(#evolution-mid)' : 'url(#evolution-low)';
                  const radius = 8 + Math.sqrt(cell.count) * 5.2;
                  return <circle key={`${cell.x}-${cell.z}-${index}`} cx={point.x} cy={point.y} r={radius} fill={gradient} />;
                })}
                {isActive && scanFocus > 0.65 ? DAILY_SURFACES[day].filter((cell) => cell.count >= 8).map((cell, index) => {
                  const point = project(cell.x, cell.z, time, cameraProgress);
                  return <circle key={`peak-${cell.x}-${cell.z}-${index}`} cx={point.x} cy={point.y} r="4.2" fill={colorForType(cell.dominantType)} stroke="#fff" strokeWidth="1.2" />;
                }) : null}
              </g>
            );
          })}
        </svg>

        <div style={{ position: 'absolute', left: 20, top: 18, border: '1px solid #d8d8d5', borderRadius: 8, background: 'rgba(255,255,255,0.94)', padding: '9px 12px' }}>
          <div style={{ color: '#777', fontSize: 8, letterSpacing: 1.7 }}>VIEWPOINT</div>
          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700 }}>{cameraProgress < 0.5 ? 'Oblique stack' : 'Overhead temporal scan'}</div>
        </div>
        <div style={{ position: 'absolute', right: 20, top: 18, border: '1px solid #c4b5fd', borderRadius: 8, background: '#faf5ff', color: '#6d28d9', padding: '9px 12px', fontSize: 10, fontWeight: 700 }}>
          {scanFocus < 0.5 ? 'Weekly stack · 7 daily surfaces' : `${DAY_LABELS[activeDay]} · ${DAILY_COUNTS[activeDay].toLocaleString()} incidents`}
        </div>
        <div style={{ position: 'absolute', left: 26, right: 26, bottom: 18, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
          {DAY_LABELS.map((label, day) => <div key={label} style={{ borderTop: `2px solid ${day === activeDay && scanFocus > 0.5 ? '#7c3aed' : '#d5d5d2'}`, paddingTop: 6, color: day === activeDay && scanFocus > 0.5 ? '#6d28d9' : '#888', fontSize: 8, fontWeight: day === activeDay && scanFocus > 0.5 ? 700 : 500 }}>{label}</div>)}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 80, bottom: 108, display: 'flex', alignItems: 'center', gap: 12, color: '#444', fontSize: 18, fontWeight: 610 }}>
        <i style={{ width: 28, height: 2, background: '#7c3aed' }} />{notes[activeStage]}
      </div>
    </ExplainerShell>
  );
}
