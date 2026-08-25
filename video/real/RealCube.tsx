import { interpolate } from 'remotion';
import { buildAdaptiveHourLayout, colorForType, CUBE_CELLS, SELECTED_START, WEEK_START } from './data';

type ScreenPoint = { x: number; y: number };

const project = (x: number, z: number, normalizedTime: number): ScreenPoint => ({
  x: 515 + x * 3.75 - z * 1.85,
  y: 526 - normalizedTime * 385 + x * 0.43 + z * 0.62,
});

const cornersAt = (time: number): ScreenPoint[] => [
  project(-50, -50, time),
  project(50, -50, time),
  project(50, 50, time),
  project(-50, 50, time),
];

const polygon = (points: ScreenPoint[]) => points.map((point) => `${point.x},${point.y}`).join(' ');
const selectedDay = Math.floor((SELECTED_START - WEEK_START) / 86400);
const dayCells = Array.from({ length: 7 }, (_, day) => CUBE_CELLS.filter((cell) => Math.floor((cell.time - WEEK_START) / 86400) === day));
const selectedTimeLayers = Array.from(new Set(dayCells[selectedDay].map((cell) => cell.time))).sort((a, b) => a - b);

export function RealCube({ selectionProgress, warpProgress, multiplier }: { selectionProgress: number; warpProgress: number; multiplier: number }) {
  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);
  const domainProgress = interpolate(selectionProgress, [0.35, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const contextOpacity = interpolate(selectionProgress, [0.12, 0.8], [0.68, 0.12], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (1 - domainProgress);
  const selectedOpacity = interpolate(selectionProgress, [0.2, 0.75], [0.52, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const base = cornersAt(0);
  const top = cornersAt(1);
  const adaptiveHourPosition = (hour: number) => {
    const index = Math.max(0, Math.min(23, Math.floor(hour)));
    return hourLayout[index].start + (hour - index) * hourLayout[index].width;
  };
  const detailDomainTime = (localTime: number) => interpolate(
    domainProgress,
    [0, 1],
    [(selectedDay + localTime) / 7, localTime],
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#f7f7f5', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 1000 610" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="kde-low"><stop offset="0" stopColor="#38bdf8" stopOpacity="0.65" /><stop offset="1" stopColor="#38bdf8" stopOpacity="0" /></radialGradient>
          <radialGradient id="kde-mid"><stop offset="0" stopColor="#f59e0b" stopOpacity="0.78" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
          <radialGradient id="kde-high"><stop offset="0" stopColor="#ef4444" stopOpacity="0.82" /><stop offset="1" stopColor="#ef4444" stopOpacity="0" /></radialGradient>
          <linearGradient id="map-plane" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e7ebe8" /><stop offset="1" stopColor="#d8dfdc" /></linearGradient>
        </defs>

        <polygon points={polygon(base)} fill="url(#map-plane)" stroke="#8d989d" strokeWidth="1.4" />
        {[0.18, 0.36, 0.54, 0.72, 0.9].map((offset) => {
          const a = project(-50, -50 + offset * 100, 0);
          const b = project(50, -50 + offset * 100, 0);
          const c = project(-50 + offset * 100, -50, 0);
          const d = project(-50 + offset * 100, 50, 0);
          return <g key={offset}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#bcc5c3" strokeWidth="0.8" /><line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#bcc5c3" strokeWidth="0.8" /></g>;
        })}
        {[0, 1, 2, 3].map((index) => {
          const start = project(-55, -32 + index * 22, 0);
          const end = project(55, -25 + index * 23, 0);
          return <path key={index} d={`M${start.x} ${start.y} C${start.x + 120} ${start.y - 20},${end.x - 100} ${end.y + 18},${end.x} ${end.y}`} fill="none" stroke="#fff" strokeWidth="5" opacity="0.88" />;
        })}

        {base.map((point, index) => <line key={`edge-${index}`} x1={point.x} y1={point.y} x2={top[index].x} y2={top[index].y} stroke="#9aa5aa" strokeWidth="1" opacity="0.72" />)}

        {Array.from({ length: 7 }, (_, day) => {
          const normalizedTime = (day + 0.5) / 7;
          const points = cornersAt(normalizedTime);
          const selected = day === selectedDay;
          if (selected) return null;
          return (
            <g key={day} opacity={contextOpacity}>
              <polygon
                points={polygon(points)}
                fill="rgba(59,130,246,0.025)"
                stroke="#aab3b7"
                strokeWidth="0.85"
              />
              {dayCells[day].map((cell, index) => {
                const point = project(cell.x, cell.z, normalizedTime);
                const intensity = Math.min(1, cell.count / 7);
                const gradient = intensity > 0.66 ? 'url(#kde-high)' : intensity > 0.32 ? 'url(#kde-mid)' : 'url(#kde-low)';
                const radius = 7 + Math.sqrt(cell.count) * 4.2;
                return <circle key={`${cell.x}-${cell.z}-${index}`} cx={point.x} cy={point.y} r={radius} fill={gradient} opacity="0.55" />;
              })}
            </g>
          );
        })}

        <g opacity={selectedOpacity}>
          {[0, 1].map((localTime, index) => (
            <polygon key={`slab-boundary-${index}`} points={polygon(cornersAt(detailDomainTime(localTime)))} fill="rgba(124,58,237,0.055)" stroke="#7c3aed" strokeWidth="1.8" />
          ))}
          {cornersAt(detailDomainTime(0)).map((point, index) => {
            const end = cornersAt(detailDomainTime(1))[index];
            return <line key={`slab-edge-${index}`} x1={point.x} y1={point.y} x2={end.x} y2={end.y} stroke="#7c3aed" strokeWidth="1.3" opacity="0.7" />;
          })}
          {selectedTimeLayers.map((time, layerIndex) => {
            const hour = (time - SELECTED_START) / 3600;
            const normalizedTime = detailDomainTime(adaptiveHourPosition(hour));
            const cells = dayCells[selectedDay].filter((cell) => cell.time === time);
            return (
              <g key={time}>
                <polygon points={polygon(cornersAt(normalizedTime))} fill={layerIndex % 2 === 0 ? 'rgba(124,58,237,0.065)' : 'rgba(245,158,11,0.045)'} stroke="rgba(124,58,237,0.62)" strokeWidth="0.8" />
                {cells.map((cell, index) => {
                  const point = project(cell.x, cell.z, normalizedTime);
                  const intensity = Math.min(1, cell.count / 7);
                  const gradient = intensity > 0.66 ? 'url(#kde-high)' : intensity > 0.32 ? 'url(#kde-mid)' : 'url(#kde-low)';
                  const radius = 7 + Math.sqrt(cell.count) * 4.2;
                  return <circle key={`${cell.x}-${cell.z}-${index}`} cx={point.x} cy={point.y} r={radius} fill={gradient} opacity="0.85" />;
                })}
                {selectionProgress > 0.45 ? cells.filter((cell) => cell.count >= 3).map((cell, index) => {
                  const point = project(cell.x, cell.z, normalizedTime);
                  const height = 8 + cell.count * 2.1;
                  return <g key={`volume-${cell.x}-${cell.z}-${index}`}><rect x={point.x - 2.4} y={point.y - height} width="4.8" height={height} fill={colorForType(cell.dominantType)} opacity="0.55" /><circle cx={point.x} cy={point.y - height} r="3.5" fill={colorForType(cell.dominantType)} stroke="#fff" strokeWidth="0.7" /></g>;
                }) : null}
              </g>
            );
          })}
        </g>

        <line x1="163" y1="530" x2="163" y2="105" stroke="#7c3aed" strokeWidth="1.6" />
        <path d="M156 116L163 103L170 116" fill="none" stroke="#7c3aed" strokeWidth="1.6" />
        <text x="124" y="91" fill="#6d28d9" fontSize="10" fontWeight="700">TIME</text>
        <g opacity={1 - domainProgress}>
          {['MON 28', 'TUE 29', 'WED 30', 'THU 31', 'FRI 01', 'SAT 02', 'SUN 03'].map((day, index) => {
            const position = project(-50, 58, (index + 0.5) / 7);
            return <g key={day}><line x1="157" y1={position.y} x2="169" y2={position.y} stroke={index === selectedDay ? '#7c3aed' : '#a1a1aa'} /><text x="115" y={position.y + 3} fill={index === selectedDay ? '#6d28d9' : '#777'} fontSize="8" fontWeight={index === selectedDay ? 700 : 400}>{day}</text></g>;
          })}
        </g>
        <g opacity={domainProgress}>
          {[0, 4, 8, 12, 16, 20, 24].map((hour) => {
            const localTime = hour === 24 ? 1 : hourLayout[hour].start;
            const position = project(-50, 58, detailDomainTime(localTime));
            return <g key={hour}><line x1="157" y1={position.y} x2="169" y2={position.y} stroke="#7c3aed" /><text x="121" y={position.y + 3} fill="#6d28d9" fontSize="8" fontWeight="650">{String(hour).padStart(2, '0')}:00</text></g>;
          })}
        </g>
      </svg>

      <div style={{ position: 'absolute', left: 18, top: 18, border: '1px solid #d4d4d4', borderRadius: 8, background: 'rgba(255,255,255,0.94)', padding: '9px 12px', boxShadow: '0 5px 18px rgba(0,0,0,0.08)' }}>
        <div style={{ color: '#777', fontSize: 8, letterSpacing: 1.7, textTransform: 'uppercase' }}>3D spatiotemporal mode</div>
        <div style={{ color: '#191919', fontSize: 13, fontWeight: 680, marginTop: 3 }}>Stacked STKDE surfaces</div>
      </div>
      <div style={{ position: 'absolute', right: 18, top: 18, border: '1px solid #c4b5fd', background: '#faf5ff', color: '#6d28d9', borderRadius: 7, padding: '8px 11px', fontSize: 9 }}>
        {domainProgress < 0.5 ? 'Weekly domain · 28 July–4 August' : 'Detail domain · 31 July · 00:00–24:00'}
      </div>
      <div style={{ position: 'absolute', right: 18, bottom: 16, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #ddd', borderRadius: 7, background: 'rgba(255,255,255,0.94)', padding: '7px 10px', fontSize: 8, color: '#666' }}>
        <span>Low</span><i style={{ width: 84, height: 7, borderRadius: 2, background: 'linear-gradient(90deg,#38bdf8,#f59e0b,#ef4444)' }} /><span>High intensity</span>
      </div>
    </div>
  );
}
