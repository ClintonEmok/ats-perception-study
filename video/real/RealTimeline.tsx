import { interpolate } from 'remotion';
import {
  buildAdaptiveHourLayout,
  type AdaptiveDayLayout,
  REAL_WEEK_RECORDS,
  SELECTED_END,
  SELECTED_START,
  WEEK_END,
  WEEK_START,
} from './data';

const buildBins = (start: number, end: number, count: number): number[] => {
  const bins = Array.from({ length: count }, () => 0);
  for (const record of REAL_WEEK_RECORDS) {
    if (record.timestamp < start || record.timestamp >= end) continue;
    const index = Math.min(count - 1, Math.floor(((record.timestamp - start) / (end - start)) * count));
    bins[index] += 1;
  }
  return bins;
};

const OVERVIEW_BINS = buildBins(WEEK_START, WEEK_END, 56);
const DETAIL_BINS = buildBins(SELECTED_START, SELECTED_END, 24);
const OVERVIEW_MAX = Math.max(...OVERVIEW_BINS);
const DETAIL_MAX = Math.max(...DETAIL_BINS);
const DAY_LABELS = ['MON 28', 'TUE 29', 'WED 30', 'THU 31', 'FRI 01', 'SAT 02', 'SUN 03'];
const HOUR_LABELS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
const DENSITY_COLORS = ['#315cdd', '#4f8fea', '#5fc8ce', '#f2ce55', '#ef7f4d', '#d94c5c'];

function DensityStrip({ bins, maximum, layout, selectionLeft, selectionWidth }: { bins: number[]; maximum: number; layout?: AdaptiveDayLayout[]; selectionLeft?: number; selectionWidth?: number }) {
  return (
    <div style={{ position: 'relative', height: 9, display: layout ? 'block' : 'flex', overflow: 'hidden', border: '1px solid #d7d7d7', borderRadius: 2 }}>
      {bins.map((value, index) => {
        const colorIndex = Math.min(DENSITY_COLORS.length - 1, Math.floor((value / maximum) * DENSITY_COLORS.length));
        const adaptiveStyle = layout
          ? {
              position: 'absolute' as const,
              left: `${layout[index].start * 100}%`,
              width: `${layout[index].width * 100 + 0.08}%`,
              top: 0,
              bottom: 0,
            }
          : { flex: 1 };
        return <i key={`${index}-${value}`} style={{ ...adaptiveStyle, background: DENSITY_COLORS[colorIndex] }} />;
      })}
      {selectionLeft !== undefined && selectionWidth !== undefined ? (
        <i style={{ position: 'absolute', left: `${selectionLeft}%`, width: `${selectionWidth}%`, top: -1, bottom: -1, border: '1px solid #6d28d9', background: 'rgba(124,58,237,0.14)' }} />
      ) : null}
    </div>
  );
}

export function RealTimeline({ selectionProgress, warpProgress, multiplier }: { selectionProgress: number; warpProgress: number; multiplier: number }) {
  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);
  const selectedDay = 3;
  const selectedLeft = (selectedDay / 7) * 100;
  const selectedFullWidth = 100 / 7;
  const selectedWidth = interpolate(selectionProgress, [0, 1], [2.2, selectedFullWidth]);
  const currentLeft = selectedLeft + (selectedFullWidth - selectedWidth) / 2;
  const detailReveal = interpolate(selectionProgress, [0.18, 0.72], [0.18, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cursorHour = interpolate(selectionProgress, [0.45, 1], [3, 18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cursorIndex = Math.min(23, Math.floor(cursorHour));
  const cursorX = (hourLayout[cursorIndex].start + (cursorHour - cursorIndex) * hourLayout[cursorIndex].width) * 100;

  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', color: '#171717', padding: '10px 20px 9px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 7, color: '#727272', fontSize: 8, marginBottom: 5 }}>
        <span>Sparse</span>
        <div style={{ width: 104, height: 7, borderRadius: 2, border: '1px solid #ddd', background: `linear-gradient(90deg, ${DENSITY_COLORS.join(',')})` }} />
        <span>Dense</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', columnGap: 8 }}>
        <div style={{ color: '#888', fontSize: 7, letterSpacing: 1.2, paddingTop: 1 }}>OVERVIEW</div>
        <DensityStrip bins={OVERVIEW_BINS} maximum={OVERVIEW_MAX} selectionLeft={currentLeft} selectionWidth={selectedWidth} />
      </div>

      <div style={{ position: 'relative', height: 54, margin: '5px 0 0 50px', borderBottom: '1px solid #aaa' }}>
        {Array.from({ length: 7 }, (_, index) => <i key={`slice-${index}`} style={{ position: 'absolute', left: `${(index / 7) * 100}%`, width: `${100 / 7}%`, top: 0, bottom: 0, borderLeft: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.15)', background: index % 2 === 0 ? 'rgba(148,163,184,0.045)' : 'transparent', boxSizing: 'border-box' }} />)}
        {OVERVIEW_BINS.map((value, index) => {
          const day = Math.min(6, Math.floor(index / 8));
          const slot = index % 8;
          return <i key={`${index}-${value}`} style={{ position: 'absolute', left: `${((day + slot / 8) / 7) * 100}%`, width: `${100 / 56 - 0.12}%`, bottom: 0, height: `${Math.max(3, (value / OVERVIEW_MAX) * 43)}px`, background: 'rgba(24,24,27,0.16)', borderRadius: '1px 1px 0 0' }} />;
        })}
        <div style={{ position: 'absolute', left: `${currentLeft}%`, width: `${selectedWidth}%`, top: 0, bottom: 0, border: '1.7px solid #7c3aed', background: 'rgba(124,58,237,0.15)', boxSizing: 'border-box' }}>
          <i style={{ position: 'absolute', left: -3, top: 16, width: 5, height: 20, borderRadius: 2, background: '#6d28d9' }} />
          <i style={{ position: 'absolute', right: -3, top: 16, width: 5, height: 20, borderRadius: 2, background: '#6d28d9' }} />
        </div>
      </div>
      <div style={{ position: 'relative', marginLeft: 50, height: 11, color: '#777', fontSize: 7, paddingTop: 3 }}>
        {DAY_LABELS.map((label, index) => <span key={label} style={{ position: 'absolute', left: `${((index + 0.5) / 7) * 100}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap', color: index === selectedDay ? '#6d28d9' : '#777', fontWeight: index === selectedDay ? 700 : 400 }}>{label}</span>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', columnGap: 8, marginTop: 8, opacity: detailReveal }}>
        <div style={{ color: '#888', fontSize: 7, letterSpacing: 1.2, paddingTop: 1 }}>DETAIL</div>
        <DensityStrip bins={DETAIL_BINS} maximum={DETAIL_MAX} layout={hourLayout} />
      </div>

      <div style={{ position: 'relative', height: 66, margin: '5px 0 0 50px', borderBottom: '1px solid #999', opacity: detailReveal }}>
        {[0.33, 0.66].map((position) => <i key={position} style={{ position: 'absolute', left: 0, right: 0, bottom: `${position * 100}%`, height: 1, background: '#ececec' }} />)}
        {DETAIL_BINS.map((value, index) => (
          <i key={`${index}-${value}`} style={{ position: 'absolute', left: `${hourLayout[index].start * 100}%`, width: `${Math.max(0.25, hourLayout[index].width * 100 - 0.16)}%`, bottom: 0, height: `${Math.max(3, (value / DETAIL_MAX) * 59)}px`, background: warpProgress > 0.4 && value > DETAIL_MAX * 0.72 ? 'rgba(245,158,11,0.28)' : 'rgba(59,130,246,0.2)', border: '1px solid rgba(148,163,184,0.45)', boxSizing: 'border-box' }} />
        ))}
        {hourLayout.slice(1).map((hour, index) => <i key={`hour-${index}`} style={{ position: 'absolute', left: `${hour.start * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(148,163,184,0.18)' }} />)}
        <div style={{ position: 'absolute', inset: '3px 0', border: '2px solid rgba(74,222,128,0.92)', background: 'rgba(16,185,129,0.16)', opacity: 0.32 + selectionProgress * 0.35 }} />
        <div style={{ position: 'absolute', left: `${cursorX}%`, top: 0, bottom: 0, width: 2, background: '#10b981', boxShadow: '0 0 5px rgba(16,185,129,0.65)' }}>
          <i style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, borderRadius: 99, border: '2px solid #fff', background: '#10b981', boxShadow: '0 0 5px rgba(16,185,129,0.5)' }} />
        </div>
      </div>
      <div style={{ position: 'relative', marginLeft: 50, height: 11, color: '#777', fontSize: 7, paddingTop: 3, opacity: detailReveal }}>
        {HOUR_LABELS.map((label, index) => {
          const hour = index * 4;
          const left = hour === 24 ? 100 : hourLayout[hour].start * 100;
          return <span key={label} style={{ position: 'absolute', left: `${left}%`, transform: index === 0 ? undefined : index === HOUR_LABELS.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{label}</span>;
        })}
      </div>
    </div>
  );
}
