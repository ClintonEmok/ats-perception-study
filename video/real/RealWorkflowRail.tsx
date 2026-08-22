import { SELECTED_PEAK_HOUR, SELECTED_RECORD_COUNT, SELECTED_TOP_CRIME, SOURCE_RECORD_COUNT } from './data';

const METRICS = [
  ['TOTAL CRIMES', SOURCE_RECORD_COUNT.toLocaleString()],
  ['SELECTED DAY', SELECTED_RECORD_COUNT.toLocaleString()],
  ['PEAK HOUR', `${String(SELECTED_PEAK_HOUR).padStart(2, '0')}:00`],
  ['TOP CRIME', SELECTED_TOP_CRIME],
];

export function RealWorkflowRail({ cubeActive, warpProgress, multiplier }: { cubeActive: boolean; warpProgress: number; multiplier: number }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', color: '#171717', padding: 14, boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, padding: 5, background: '#f4f4f3', borderRadius: 8 }}>
        {['▦', '▥', '▱', '⌖', '⌁'].map((icon, index) => (
          <div key={`${icon}-${index}`} style={{ height: 31, display: 'grid', placeItems: 'center', borderRadius: 6, background: index === 2 ? '#fff' : 'transparent', boxShadow: index === 2 ? '0 1px 4px rgba(0,0,0,0.08)' : undefined, color: index === 2 ? '#6d28d9' : '#666' }}>{icon}</div>
        ))}
      </div>
      <div style={{ marginTop: 14, border: '1px solid #e1e1e1', borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 9, color: '#777', letterSpacing: 2.1 }}>ACTIVE WINDOW</div>
        <div style={{ fontSize: 12, fontWeight: 680, marginTop: 6 }}>31 July 2025</div>
        <div style={{ fontSize: 9, color: '#777', marginTop: 3 }}>00:00–24:00 · synchronized</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 9 }}>
        {METRICS.map(([label, value]) => (
          <div key={label} style={{ border: '1px solid #e1e1e1', borderRadius: 9, padding: '10px 9px' }}>
            <div style={{ fontSize: 7, color: '#888', letterSpacing: 1.3 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 680, marginTop: 5 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, border: '1px solid #e1e1e1', borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 9, color: '#777', letterSpacing: 1.8 }}>SHARED VIEWPORT</div>
        <div style={{ display: 'flex', gap: 5, marginTop: 9, padding: 4, background: '#f1f1f0', borderRadius: 7 }}>
          {['2D MAP', '3D CUBE'].map((label, index) => {
            const active = cubeActive ? index === 1 : index === 0;
            return <div key={label} style={{ flex: 1, borderRadius: 5, padding: '7px 4px', textAlign: 'center', fontSize: 8, fontWeight: 700, background: active ? '#fff' : 'transparent', color: active ? '#6d28d9' : '#777', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : undefined }}>{label}</div>;
          })}
        </div>
      </div>
      <div style={{ marginTop: 10, border: `1px solid ${warpProgress > 0.1 ? '#c4b5fd' : '#e1e1e1'}`, background: warpProgress > 0.1 ? '#faf5ff' : '#fff', borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 8, color: '#777', letterSpacing: 1.5 }}>TIME SCALE</div><div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: '#6d28d9' }}>Density-based</div></div>
          <div style={{ border: '1px solid #ddd6fe', borderRadius: 6, background: '#fff', padding: '6px 8px', color: '#6d28d9', fontSize: 11, fontWeight: 750 }}>{multiplier.toFixed(1)}×</div>
        </div>
        <div style={{ position: 'relative', height: 5, marginTop: 11, borderRadius: 99, background: '#e5e7eb' }}>
          <div style={{ width: `${20 + warpProgress * 70}%`, height: '100%', borderRadius: 99, background: '#7c3aed' }} />
          <i style={{ position: 'absolute', left: `${20 + warpProgress * 70}%`, top: '50%', width: 11, height: 11, borderRadius: 99, background: '#fff', border: '2px solid #7c3aed', transform: 'translate(-50%, -50%)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: '#888', fontSize: 7 }}><span>1.0×</span><span>Warp multiplier</span><span>2.5×</span></div>
      </div>
      <div style={{ marginTop: 10, border: '1px solid #ddd6fe', background: '#faf5ff', borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 8, color: '#7c3aed', letterSpacing: 1.6 }}>SYNC STATUS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, fontSize: 10, fontWeight: 650 }}><i style={{ width: 7, height: 7, borderRadius: 99, background: '#10b981' }} />Timeline · map · cube</div>
      </div>
    </div>
  );
}
