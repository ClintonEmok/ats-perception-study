import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { buildAdaptiveHourLayout, DAILY_COUNTS, SELECTED_HOURLY_COUNTS } from '../real/data';
import { DASHBOARD_COLORS, DENSITY_GRADIENT } from './palette';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const DAY_LABELS = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 31', 'Fri 01', 'Sat 02', 'Sun 03'];

export function DashboardDemoTimeline({
  selectionProgress,
  warpProgress,
  multiplier,
  highlightDensity,
  highlightDetail,
}: {
  selectionProgress: number;
  warpProgress: number;
  multiplier: number;
  highlightDensity: boolean;
  highlightDetail: boolean;
}) {
  const width = 1600;
  const margin = 14;
  const innerWidth = width - margin * 2;
  const overviewHeight = 52;
  const detailHeight = 68;
  const hourLayout = buildAdaptiveHourLayout(warpProgress, multiplier);
  const maximumDay = Math.max(...DAILY_COUNTS, 1);
  const maximumHour = Math.max(...SELECTED_HOURLY_COUNTS, 1);
  const fullBrushWidth = innerWidth;
  const selectedBrushWidth = innerWidth / 7;
  const brushLeft = interpolate(selectionProgress, [0, 1], [0, (3 / 7) * innerWidth], clamp);
  const brushWidth = interpolate(selectionProgress, [0, 1], [fullBrushWidth, selectedBrushWidth], clamp);
  const cursorHour = 18.5;
  const cursorIndex = Math.floor(cursorHour);
  const cursorX = (hourLayout[cursorIndex].start + 0.5 * hourLayout[cursorIndex].width) * innerWidth;
  const burstLeft = hourLayout[17].start * innerWidth;
  const burstRight = (hourLayout[20].start + hourLayout[20].width) * innerWidth;

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', background: DASHBOARD_COLORS.card, color: DASHBOARD_COLORS.foreground, fontFamily: FONT_FAMILY, padding: '12px 0 10px', overflow: 'hidden' }}>
      <div style={{ margin: `0 ${margin}px`, border: highlightDensity ? `1.5px solid ${DASHBOARD_COLORS.brushStroke}` : '1px solid transparent', borderRadius: 7, padding: '4px 0 2px', boxShadow: highlightDensity ? '0 0 20px rgba(139, 92, 246, 0.14)' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, height: 16, color: DASHBOARD_COLORS.mutedForeground, fontSize: 9, padding: '0 8px' }}>
          <span>Sparse</span><span style={{ width: 96, height: 7, borderRadius: 3, border: `1px solid ${DASHBOARD_COLORS.border}`, background: DENSITY_GRADIENT }} /><span>Dense</span>
        </div>
        <div style={{ position: 'relative', margin: '5px 8px 0', height: 10, borderRadius: 3, overflow: 'hidden', background: DENSITY_GRADIENT }}>
          <div style={{ position: 'absolute', left: brushLeft, width: brushWidth, insetBlock: 0, background: 'rgba(139, 92, 246, 0.22)', border: `1px solid ${DASHBOARD_COLORS.brushStroke}` }} />
        </div>
        <svg width={width} height={overviewHeight + 24} style={{ display: 'block' }}>
          <g transform={`translate(${margin},4)`}>
            {DAILY_COUNTS.map((count, index) => {
              const dayWidth = innerWidth / 7;
              const barHeight = (count / maximumDay) * overviewHeight;
              return (
                <g key={index}>
                  <rect x={index * dayWidth + 2} y={overviewHeight - barHeight} width={dayWidth - 4} height={barHeight} rx={2} fill="rgba(23, 23, 23, 0.18)" />
                  <text x={index * dayWidth + dayWidth / 2} y={overviewHeight - barHeight - 3} textAnchor="middle" fill={DASHBOARD_COLORS.mutedForeground} fontSize="8" fontFamily={MONO_FONT}>{count}</text>
                </g>
              );
            })}
            <rect x={brushLeft} y={0} width={brushWidth} height={overviewHeight} fill="rgba(139, 92, 246, 0.18)" stroke={DASHBOARD_COLORS.brushStroke} strokeWidth="1.5" />
            <rect x={brushLeft - 3} y={0} width={6} height={overviewHeight} rx={2} fill={DASHBOARD_COLORS.brushHandle} stroke={DASHBOARD_COLORS.brushHandleStroke} />
            <rect x={brushLeft + brushWidth - 3} y={0} width={6} height={overviewHeight} rx={2} fill={DASHBOARD_COLORS.brushHandle} stroke={DASHBOARD_COLORS.brushHandleStroke} />
            {DAY_LABELS.map((label, index) => <text key={label} x={(index + 0.5) * (innerWidth / 7)} y={overviewHeight + 17} textAnchor="middle" fill={index === 3 ? DASHBOARD_COLORS.brushHandle : DASHBOARD_COLORS.mutedForeground} fontSize="9" fontWeight={index === 3 ? 750 : 500} fontFamily={MONO_FONT}>{label}</text>)}
          </g>
        </svg>
      </div>

      <div style={{ margin: `8px ${margin}px 0`, border: highlightDetail ? '1.5px solid rgba(234, 88, 12, 0.7)' : '1px solid transparent', borderRadius: 7, padding: '4px 0 2px', boxShadow: highlightDetail ? '0 0 20px rgba(234, 88, 12, 0.12)' : 'none' }}>
        <div style={{ height: 18, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 8.5, letterSpacing: 1 }}>
          <span>DETAIL · THURSDAY 31 JULY · 24 HOURS</span>
          <span style={{ color: warpProgress > 0.1 ? '#ea580c' : DASHBOARD_COLORS.mutedForeground }}>{warpProgress > 0.1 ? `ADAPTIVE · ${multiplier.toFixed(1)}×` : 'LINEAR'}</span>
        </div>
        <div style={{ margin: '3px 8px 0', height: 10, borderRadius: 3, background: DENSITY_GRADIENT }} />
        <svg width={width} height={detailHeight + 26} style={{ display: 'block' }}>
          <g transform={`translate(${margin},5)`}>
            {hourLayout.map((hour, index) => {
              const count = SELECTED_HOURLY_COUNTS[index];
              const x = hour.start * innerWidth;
              const barWidth = Math.max(1, hour.width * innerWidth - 2);
              const barHeight = (count / maximumHour) * detailHeight;
              const burst = index >= 17 && index <= 20;
              return <rect key={index} x={x + 1} y={detailHeight - barHeight} width={barWidth} height={barHeight} rx={2} fill={burst ? 'rgba(251, 146, 60, 0.26)' : 'rgba(23, 23, 23, 0.18)'} stroke={burst ? 'rgba(234, 88, 12, 0.92)' : 'transparent'} />;
            })}
            <rect x={burstLeft} y={2} width={burstRight - burstLeft} height={detailHeight - 4} rx={3} fill="rgba(251, 146, 60, 0.12)" stroke="rgba(234, 88, 12, 0.92)" strokeWidth="1.8" />
            <line x1={cursorX} x2={cursorX} y1={0} y2={detailHeight} stroke={DASHBOARD_COLORS.timeCursor} strokeWidth="2" />
            <circle cx={cursorX} cy={0} r="5.5" fill={DASHBOARD_COLORS.timeCursor} stroke="#ffffff" strokeWidth="2" />
            {[0, 4, 8, 12, 16, 17, 18, 19, 20, 24].map((hour) => {
              const x = hour === 24 ? innerWidth : hourLayout[hour].start * innerWidth;
              return <text key={hour} x={x} y={detailHeight + 17} textAnchor="middle" fill={hour >= 17 && hour <= 20 ? '#ea580c' : DASHBOARD_COLORS.mutedForeground} fontSize="8" fontFamily={MONO_FONT}>{String(hour).padStart(2, '0')}:00</text>;
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
