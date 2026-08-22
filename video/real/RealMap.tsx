import { interpolate } from 'remotion';
import communityAreaData from '../data/chicago-community-areas.json';
import { colorForType, isSelectedRecord, REAL_WEEK_RECORDS, SOURCE_RECORD_COUNT } from './data';

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

const ringPath = (ring: Coordinate[]) => ring.map(([lon, lat], index) => {
  const point = project(lon, lat);
  return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
}).join(' ') + ' Z';

const areaPaths = areas.map((area) => ({
  ...area,
  path: area.rings.map(ringPath).join(' '),
}));

const displayType = (type: string) => type in {
  THEFT: true,
  BATTERY: true,
  ASSAULT: true,
  'CRIMINAL DAMAGE': true,
  BURGLARY: true,
  ROBBERY: true,
  'MOTOR VEHICLE THEFT': true,
} ? type : 'OTHER';

const pointPaths = Array.from(new Set(REAL_WEEK_RECORDS.map((record) => displayType(record.type)))).map((type) => {
  const records = REAL_WEEK_RECORDS.filter((record) => displayType(record.type) === type);
  const buildPath = (selected: boolean) => records
    .filter((record) => isSelectedRecord(record) === selected)
    .map((record) => {
      const point = project(record.lon, record.lat);
      return `M${point.x.toFixed(1)},${point.y.toFixed(1)}h0.01`;
    })
    .join(' ');
  return { type, contextPath: buildPath(false), selectedPath: buildPath(true) };
});

const labelNames = new Set(['ROGERS PARK', 'AUSTIN', 'NEAR NORTH SIDE', 'LOOP', 'ENGLEWOOD', 'HYDE PARK']);
const labels = areas.filter((area) => labelNames.has(area.name)).map((area) => {
  const points = area.rings.flat();
  const center = points.reduce((sum, [lon, lat]) => ({ lon: sum.lon + lon, lat: sum.lat + lat }), { lon: 0, lat: 0 });
  return { name: area.name, ...project(center.lon / points.length, center.lat / points.length) };
});

export function RealMap({ selectionProgress }: { selectionProgress: number }) {
  const selectedOpacity = interpolate(selectionProgress, [0.15, 0.7], [0.55, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const contextOpacity = interpolate(selectionProgress, [0.15, 0.75], [0.72, 0.12], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#d8edf4', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
        <rect width={WIDTH} height={HEIGHT} fill="#d8edf4" />
        <g>
          {areaPaths.map((area, index) => (
            <path key={area.number} d={area.path} fill={index % 2 === 0 ? '#f2f3f0' : '#eceeeb'} stroke="#b8c0bd" strokeWidth="0.85" fillRule="evenodd" />
          ))}
        </g>
        <g opacity="0.58">
          {labels.map((label) => <text key={label.name} x={label.x} y={label.y} textAnchor="middle" fill="#7b827f" fontSize="7" fontWeight="650" letterSpacing="0.5">{label.name}</text>)}
        </g>
        {pointPaths.map(({ type, contextPath, selectedPath }) => (
          <g key={type}>
            <path d={contextPath} fill="none" stroke={colorForType(type)} strokeWidth="3" strokeLinecap="round" opacity={contextOpacity} />
            {selectionProgress > 0.4 ? <path d={selectedPath} fill="none" stroke={colorForType(type)} strokeWidth="8" strokeLinecap="round" opacity={0.11 * selectedOpacity} /> : null}
            <path d={selectedPath} fill="none" stroke={colorForType(type)} strokeWidth="3.7" strokeLinecap="round" opacity={selectedOpacity} />
          </g>
        ))}
      </svg>
      <div style={{ position: 'absolute', left: 18, top: 18, border: '1px solid #d4d4d4', borderRadius: 8, background: 'rgba(255,255,255,0.94)', padding: '9px 12px', boxShadow: '0 5px 18px rgba(0,0,0,0.08)' }}>
        <div style={{ color: '#777', fontSize: 8, letterSpacing: 1.7, textTransform: 'uppercase' }}>Coordinate-accurate 2D mode</div>
        <div style={{ color: '#191919', fontSize: 13, fontWeight: 680, marginTop: 3 }}>Chicago community areas</div>
      </div>
      <div style={{ position: 'absolute', right: 18, top: 18, border: '1px solid #ddd', borderRadius: 7, background: '#fff', padding: '8px 11px', fontSize: 9, color: selectionProgress > 0.4 ? '#6d28d9' : '#666' }}>
        {selectionProgress > 0.4 ? '31 July selected · exact incident coordinates' : `${SOURCE_RECORD_COUNT.toLocaleString()} geocoded incidents`}
      </div>
      <div style={{ position: 'absolute', left: 18, bottom: 16, display: 'flex', gap: 9, border: '1px solid #ddd', borderRadius: 7, background: 'rgba(255,255,255,0.94)', padding: '7px 10px', fontSize: 8, color: '#666' }}>
        {['THEFT', 'BATTERY', 'ASSAULT', 'CRIMINAL DAMAGE'].map((type) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i style={{ width: 6, height: 6, borderRadius: 99, background: colorForType(type) }} />{type}</span>
        ))}
      </div>
    </div>
  );
}
