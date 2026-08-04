"use client";

import type { DemoDetailPeriodSelection, DemoBurstWindowSelection } from '@/store/useDashboardDemoCoordinationStore';
import React from 'react';
import { DensityHeatStrip } from '@/components/timeline/DensityHeatStrip';
import type { BurstTaxonomy } from '@/lib/binning/burst-taxonomy';
import { resolveAdaptiveSlicePalette } from './lib/adaptive-slice-palette';

export interface SurfaceBurstWindow extends Omit<DemoBurstWindowSelection, 'metric'> {
  metric?: 'density';
}

interface SurfaceBucket {
  x0?: number;
  x1?: number;
  length: number;
}

interface SurfaceSliceGeometry {
  id: string;
  left: number;
  width: number;
  isActive: boolean;
  isBurst: boolean;
  isSuggestion: boolean;
  isGeneratedDraft: boolean;
  isGeneratedApplied: boolean;
  overlapCount: number;
  burstClass?: BurstTaxonomy;
  isNeutralPartition?: boolean;
  warpEnabled?: boolean;
  warpWeight?: number;
  color?: { fill?: string; stroke?: string } | string;
}

interface DualTimelineSurfaceProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isTimelineLoading: boolean;
  width: number;
  overviewInnerWidth: number;
  detailInnerWidth: number;
  isComputing: boolean;
  densityMap: Float32Array | null;
  showAdaptiveDensityStrip: boolean;
  overviewInteractionScale: (date: Date) => number;
  overviewScale: (date: Date) => number;
  detailScale: (date: Date) => number;
  overviewSvgRef: React.RefObject<SVGSVGElement | null>;
  detailSvgRef: React.RefObject<SVGSVGElement | null>;
  overviewBins: SurfaceBucket[];
  overviewMax: number;
  stripSelection: { left: number; width: number } | null;
  userWarpOverlayBands: Array<{ id: string; startSec: number; endSec: number; isDebugPreview: boolean }>;
  timeScaleMode: 'linear' | 'adaptive';
  brushRef: React.RefObject<SVGGElement | null>;
  overviewTicks: Date[];
  overviewTickFormat: (date: Date) => string;
  burstWindows: SurfaceBurstWindow[];
  activeBurstWindowId: string | null;
  onBurstWindowClick?: (window: SurfaceBurstWindow) => void;
  detailDensityMap: Float32Array | null;
  detailMax: number;
  resolvedDetailRenderMode: 'points' | 'bins';
  detailPoints: number[];
  detailBins: SurfaceBucket[];
  selectedDetailPeriodId?: string | null;
  onDetailPeriodClick?: (period: DemoDetailPeriodSelection) => void;
  orderedSliceGeometries: SurfaceSliceGeometry[];
  activeSliceUpdatedAt: number | null;
  pendingGeneratedGeometries: SurfaceSliceGeometry[];
  pendingManualGeometries?: SurfaceSliceGeometry[];
  maxSliceOverlap: number;
  cursorX: number | null;
  selectionX: number | null;
  zoomRef: React.RefObject<SVGRectElement | null>;
  handlePointerDown: (event: React.PointerEvent<SVGRectElement>) => void;
  handlePointerMove: (event: React.PointerEvent<SVGRectElement>) => void;
  handlePointerUpWithSelection: (event: React.PointerEvent<SVGRectElement>) => void;
  handlePointerCancel: (event: React.PointerEvent<SVGRectElement>) => void;
  detailTicks: Date[];
  detailTickFormat: (date: Date) => string;
  hoveredDetail: { x: number; label: string } | null;
  isDetailEmpty: boolean;
}

const OVERVIEW_HEIGHT = 42;
const DETAIL_HEIGHT = 60;
const AXIS_HEIGHT = 28;

const DENSITY_DOMAIN: [number, number] = [0, 1];
const DENSITY_COLOR_LOW: [number, number, number] = [59, 130, 246];
const DENSITY_COLOR_HIGH: [number, number, number] = [239, 68, 68];
const DENSITY_COLOR_STOPS = [
  { offset: 0, color: [34, 76, 255] as [number, number, number] },
  { offset: 0.5, color: [0, 212, 255] as [number, number, number] },
  { offset: 0.8, color: [255, 214, 64] as [number, number, number] },
  { offset: 1, color: [255, 64, 96] as [number, number, number] },
];
const TIME_CURSOR_COLOR = '#10b981';

const OVERVIEW_MARGIN = { top: 8, right: 12, bottom: 10, left: 12 };
const DETAIL_MARGIN = { top: 8, right: 12, bottom: 12, left: 12 };

const resolveColorValue = (color: SurfaceSliceGeometry['color'], key: 'fill' | 'stroke'): string | undefined => {
  if (typeof color === 'string') {
    return color;
  }

  return color?.[key];
};

const resolveDraftPalette = (burstClass: BurstTaxonomy | undefined, isNeutralPartition: boolean | undefined) => {
  if (isNeutralPartition || burstClass === 'neutral') {
    return {
      fill: 'rgba(100, 116, 139, 0.10)',
      stroke: 'rgba(148, 163, 184, 0.72)',
    };
  }

  if (burstClass === 'prolonged-peak') {
    return {
      fill: 'rgba(34, 211, 238, 0.18)',
      stroke: 'rgba(125, 211, 252, 0.92)',
    };
  }

  if (burstClass === 'isolated-spike') {
    return {
      fill: 'rgba(168, 85, 247, 0.18)',
      stroke: 'rgba(216, 180, 254, 0.92)',
    };
  }

  if (burstClass === 'valley') {
    return {
      fill: 'rgba(16, 185, 129, 0.16)',
      stroke: 'rgba(110, 231, 183, 0.9)',
    };
  }

  return {
    fill: 'rgba(245, 158, 11, 0.08)',
    stroke: 'rgba(251, 191, 36, 0.82)',
  };
};

export function DualTimelineSurface(props: DualTimelineSurfaceProps) {
  const {
    containerRef,
    isTimelineLoading,
    width,
    overviewInnerWidth,
    detailInnerWidth,
    isComputing,
    densityMap,
    showAdaptiveDensityStrip,
    overviewInteractionScale,
    overviewScale,
    detailScale,
    overviewSvgRef,
    detailSvgRef,
    overviewBins,
    overviewMax,
    stripSelection,
    userWarpOverlayBands,
    timeScaleMode,
    brushRef,
    overviewTicks,
    overviewTickFormat,
    detailDensityMap,
    detailMax,
    resolvedDetailRenderMode,
    detailPoints,
    detailBins,
    selectedDetailPeriodId = null,
    onDetailPeriodClick,
    orderedSliceGeometries,
    activeSliceUpdatedAt,
    pendingGeneratedGeometries,
    pendingManualGeometries = [],
    maxSliceOverlap,
    cursorX,
    selectionX,
    zoomRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUpWithSelection,
    handlePointerCancel,
    detailTicks,
    detailTickFormat,
    hoveredDetail,
    isDetailEmpty,
  } = props;
  const overviewDensityScale = overviewScale as Parameters<typeof DensityHeatStrip>[0]['scale'];
  const detailDensityScale = detailScale as Parameters<typeof DensityHeatStrip>[0]['scale'];

  return (
    <div ref={containerRef} className="relative w-full" aria-busy={isTimelineLoading}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="px-2 py-2" style={{ marginLeft: OVERVIEW_MARGIN.left, marginRight: OVERVIEW_MARGIN.right }}>
          {showAdaptiveDensityStrip ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground sm:justify-end">
                <span className="leading-none">Sparse</span>
                <span
                  className="h-2 min-w-[4rem] flex-1 rounded-sm border border-foreground/15 sm:w-24 sm:flex-none"
                  style={{
                    background: `linear-gradient(90deg, ${DENSITY_COLOR_STOPS.map((stop) => `rgb(${stop.color.join(',')}) ${Math.round(stop.offset * 100)}%`).join(', ')})`,
                  }}
                  aria-hidden="true"
                />
                <span className="leading-none">Dense</span>
              </div>

              <div className="relative mt-2 w-full">
                {width > 0 ? (
                  <DensityHeatStrip
                    densityMap={densityMap}
                    width={overviewInnerWidth}
                    scale={overviewDensityScale}
                    height={10}
                    isLoading={isComputing}
                    densityDomain={DENSITY_DOMAIN}
                    colorLow={DENSITY_COLOR_LOW}
                    colorHigh={DENSITY_COLOR_HIGH}
                    colorStops={DENSITY_COLOR_STOPS}
                  />
                ) : (
                  <div className="h-3" />
                )}
                {stripSelection ? (
                  <div className="pointer-events-none absolute inset-0">
                    <div
                      className="absolute top-0 h-full rounded-sm border border-primary/60 bg-primary/15"
                      style={{ left: stripSelection.left, width: stripSelection.width }}
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <svg ref={overviewSvgRef} width={width} height={OVERVIEW_HEIGHT + AXIS_HEIGHT}>
          <defs>
            <linearGradient id="adaptiveAxisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.09" />
            </linearGradient>
          </defs>
          <g transform={`translate(${OVERVIEW_MARGIN.left},${OVERVIEW_MARGIN.top})`}>
            {overviewBins.map((bucket: SurfaceBucket, index: number) => {
              if (bucket.x0 === undefined || bucket.x1 === undefined) return null;
              const x0 = overviewScale(new Date(bucket.x0 * 1000));
              const x1 = overviewScale(new Date(bucket.x1 * 1000));
              const barWidth = Math.max(0, x1 - x0 - 1);
              const barHeight = (bucket.length / overviewMax) * OVERVIEW_HEIGHT;
              return <rect key={`overview-${index}`} x={x0} y={OVERVIEW_HEIGHT - barHeight} width={barWidth} height={barHeight} className="fill-primary/20" />;
            })}
            {userWarpOverlayBands.map((slice) => {
              const x0 = overviewInteractionScale(new Date(slice.startSec * 1000));
              const x1 = overviewInteractionScale(new Date(slice.endSec * 1000));
              const left = Math.min(x0, x1);
              const widthSpan = Math.max(1, Math.abs(x1 - x0));
              return <rect key={`overview-user-warp-${slice.id}`} x={left} y={0} width={widthSpan} height={OVERVIEW_HEIGHT} fill={slice.isDebugPreview ? 'rgba(56, 189, 248, 0.16)' : 'rgba(139, 92, 246, 0.15)'} stroke={slice.isDebugPreview ? 'rgba(34, 211, 238, 0.7)' : 'rgba(99, 102, 241, 0.55)'} strokeDasharray={slice.isDebugPreview ? '2 2' : '4 3'} strokeWidth={1} />;
            })}
            <g ref={brushRef} />
            <g transform={`translate(0, ${OVERVIEW_HEIGHT})`} className="text-muted-foreground">
              {timeScaleMode === 'adaptive' ? <rect x={0} y={0} width={overviewInnerWidth} height={AXIS_HEIGHT} fill="url(#adaptiveAxisGradient)" /> : null}
              {overviewTicks.map((tick: Date, index: number) => {
                const x = overviewScale(tick);
                return (
                  <g key={`overview-tick-${index}`} transform={`translate(${x}, 0)`}>
                    <line y2={6} stroke="currentColor" />
                    <text y={14} textAnchor="middle" fontSize={10} fill="currentColor">{overviewTickFormat(tick)}</text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        <div className="relative">
          {showAdaptiveDensityStrip ? (
            <div className="mb-2" style={{ paddingLeft: DETAIL_MARGIN.left, paddingRight: DETAIL_MARGIN.right }}>
              {width > 0 ? <DensityHeatStrip densityMap={detailDensityMap} width={detailInnerWidth} scale={detailDensityScale} height={10} isLoading={isComputing} densityDomain={DENSITY_DOMAIN} colorLow={DENSITY_COLOR_LOW} colorHigh={DENSITY_COLOR_HIGH} colorStops={DENSITY_COLOR_STOPS} /> : <div className="h-2" />}
            </div>
          ) : null}

          <svg ref={detailSvgRef} width={width} height={DETAIL_HEIGHT + AXIS_HEIGHT}>
            <defs>
              <filter id="timeCursorGlow" x="-50%" y="-10%" width="200%" height="120%"><feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor={TIME_CURSOR_COLOR} floodOpacity="0.65" /></filter>
              <pattern id="sliceOverlapHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="2" /></pattern>
            </defs>
            <g transform={`translate(${DETAIL_MARGIN.left},${DETAIL_MARGIN.top})`}>
              <rect
                ref={zoomRef}
                width={detailInnerWidth}
                height={DETAIL_HEIGHT}
                fill="transparent"
                pointerEvents="auto"
                className="cursor-crosshair"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpWithSelection}
                onPointerLeave={handlePointerCancel}
              />

              {resolvedDetailRenderMode === 'points'
                ? detailPoints.map((timestamp: number, index: number) => {
                    const x = detailScale(new Date(timestamp * 1000));
                    return <circle key={`detail-point-${index}`} cx={x} cy={DETAIL_HEIGHT - 6} r={2} className="fill-primary/60" />;
                  })
                : detailBins.map((bucket: SurfaceBucket, index: number) => {
                    const bucketStart = bucket.x0;
                    const bucketEnd = bucket.x1;
                    if (bucketStart === undefined || bucketEnd === undefined) return null;
                    const x0 = detailScale(new Date(bucketStart * 1000));
                    const x1 = detailScale(new Date(bucketEnd * 1000));
                    const left = Math.max(0, Math.min(detailInnerWidth, Math.min(x0, x1)));
                    const right = Math.max(0, Math.min(detailInnerWidth, Math.max(x0, x1)));
                    const barWidth = Math.max(0, right - left - 1);
                    const barHeight = (bucket.length / detailMax) * DETAIL_HEIGHT;
                    const periodId = `detail-bin-${bucketStart}-${bucketEnd}-${bucket.length}-${index}`;
                    const isSelected = selectedDetailPeriodId === periodId;
                    const handleClick = onDetailPeriodClick
                      ? () =>
                          onDetailPeriodClick({
                            id: periodId,
                            startSec: bucketStart,
                            endSec: bucketEnd,
                            count: bucket.length,
                            label: `${new Date(bucketStart * 1000).toLocaleDateString()} → ${new Date(bucketEnd * 1000).toLocaleDateString()}`,
                            renderMode: 'bins',
                            summary: `${bucket.length.toLocaleString()} crimes in this detail bin`,
                          })
                      : undefined;
                    return (
                      <rect
                        key={`detail-bin-${index}`}
                        x={left}
                        y={DETAIL_HEIGHT - barHeight}
                        width={barWidth}
                        height={barHeight}
                        className={`fill-primary/20 ${onDetailPeriodClick ? 'cursor-pointer' : ''}`}
                        role={onDetailPeriodClick ? 'button' : undefined}
                        tabIndex={onDetailPeriodClick ? 0 : undefined}
                        aria-label={`Detail bin ${index + 1}`}
                        onClick={handleClick}
                        onKeyDown={
                          onDetailPeriodClick
                            ? (event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleClick?.();
                                }
                              }
                            : undefined
                        }
                        fill={isSelected ? 'rgba(59, 130, 246, 0.28)' : 'rgba(59, 130, 246, 0.18)'}
                        stroke={isSelected ? 'rgba(96, 165, 250, 0.95)' : 'rgba(148, 163, 184, 0.5)'}
                        strokeWidth={isSelected ? 1.8 : 1}
                      />
                    );
                  })}

              {orderedSliceGeometries.map((geometry: SurfaceSliceGeometry) => {
                const baseOpacity = geometry.isActive ? 0.68 : geometry.overlapCount >= 3 ? 0.2 : geometry.overlapCount === 2 ? 0.28 : 0.38;
                const isSuggestionSlice = geometry.isSuggestion && !geometry.isBurst;
                const isGeneratedAppliedSlice = geometry.isGeneratedApplied;
                const adaptivePalette = timeScaleMode === 'adaptive'
                  ? resolveAdaptiveSlicePalette(geometry)
                  : null;
                const fill = adaptivePalette?.fill
                  ?? (isGeneratedAppliedSlice
                    ? 'rgba(16, 185, 129, 0.18)'
                    : isSuggestionSlice
                      ? 'rgba(139, 92, 246, 0.2)'
                      : geometry.isBurst
                        ? 'rgba(251, 146, 60, 0.26)'
                        : resolveColorValue(geometry.color, 'fill') ?? 'rgba(148, 163, 184, 0.3)');
                const stroke = adaptivePalette?.stroke
                  ?? (isGeneratedAppliedSlice
                    ? 'rgba(74, 222, 128, 0.92)'
                    : isSuggestionSlice
                      ? 'rgba(167, 139, 250, 0.85)'
                      : geometry.isBurst
                        ? 'rgba(251, 146, 60, 0.85)'
                        : resolveColorValue(geometry.color, 'stroke') ?? 'rgba(100, 116, 139, 0.8)');
                return (
                  <g key={`${geometry.id}-${geometry.isActive ? activeSliceUpdatedAt : 'base'}`}>
                    <rect x={geometry.left} y={3} width={Math.max(2, geometry.width)} height={DETAIL_HEIGHT - 6} rx={isGeneratedAppliedSlice ? 0 : 3} fill={fill} stroke={stroke} strokeWidth={geometry.isActive ? 2.3 : geometry.overlapCount >= 2 ? 1.5 : 1} strokeDasharray={geometry.overlapCount >= 3 || isSuggestionSlice ? '5 3' : undefined} opacity={baseOpacity} />
                    {geometry.overlapCount >= 2 && !geometry.isActive && <rect x={geometry.left} y={3} width={Math.max(2, geometry.width)} height={DETAIL_HEIGHT - 6} rx={isGeneratedAppliedSlice ? 0 : 3} fill="url(#sliceOverlapHatch)" opacity={geometry.overlapCount >= 3 ? 0.42 : 0.3} />}
                    {geometry.isActive && <rect x={geometry.left} y={2} width={Math.max(2, geometry.width)} height={DETAIL_HEIGHT - 4} rx={isGeneratedAppliedSlice ? 0 : 3} fill="none" stroke={geometry.isBurst ? 'rgba(253, 186, 116, 0.95)' : 'rgba(125, 211, 252, 0.95)'} strokeWidth={2.2} opacity={0.9}><animate attributeName="opacity" values="0.55;1;0.55" dur="1.8s" repeatCount="indefinite" /></rect>}
                  </g>
                );
              })}

              {pendingGeneratedGeometries.map((geometry: SurfaceSliceGeometry) => (
                <g key={geometry.id}>
                  {(() => {
                    const palette = resolveDraftPalette(geometry.burstClass, geometry.isNeutralPartition);
                    return (
                      <rect
                        x={geometry.left}
                        y={3}
                        width={Math.max(2, geometry.width)}
                        height={DETAIL_HEIGHT - 6}
                        rx={3}
                        fill={geometry.isGeneratedApplied ? 'rgba(16, 185, 129, 0.18)' : palette.fill}
                        stroke={geometry.isGeneratedApplied ? 'rgba(74, 222, 128, 0.92)' : palette.stroke}
                        strokeWidth={geometry.isGeneratedApplied ? 1.4 : 1.25}
                        strokeDasharray={geometry.isNeutralPartition || geometry.burstClass === 'neutral' ? '4 3' : '5 3'}
                        pointerEvents="none"
                      />
                    );
                  })()}
                </g>
              ))}

              {pendingManualGeometries.map((geometry: SurfaceSliceGeometry) => (
                <g key={geometry.id}>
                  <rect
                    x={geometry.left}
                    y={3}
                    width={Math.max(2, geometry.width)}
                    height={DETAIL_HEIGHT - 6}
                    rx={3}
                    fill="rgba(6, 182, 212, 0.16)"
                    stroke="rgba(34, 211, 238, 0.85)"
                    strokeWidth={1.25}
                    strokeDasharray="4 3"
                    pointerEvents="none"
                  />
                </g>
              ))}

              {maxSliceOverlap >= 3 && <g transform={`translate(${Math.max(0, detailInnerWidth - 90)}, 4)`}><rect width={86} height={18} rx={9} fill="rgba(15, 23, 42, 0.75)" stroke="rgba(148, 163, 184, 0.55)" /><text x={43} y={12} textAnchor="middle" fontSize={10} fill="rgba(226, 232, 240, 0.95)">{maxSliceOverlap}x overlap</text></g>}

              {cursorX !== null && <><line x1={cursorX} x2={cursorX} y1={0} y2={DETAIL_HEIGHT} stroke={TIME_CURSOR_COLOR} strokeWidth={2} filter="url(#timeCursorGlow)" /><circle cx={cursorX} cy={0} r={8} fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.45)" strokeWidth={1} pointerEvents="none" /><circle cx={cursorX} cy={0} r={5.5} fill={TIME_CURSOR_COLOR} stroke="rgba(255,255,255,0.95)" strokeWidth={2} filter="url(#timeCursorGlow)" /></>}
              {selectionX !== null && <g><line x1={selectionX} x2={selectionX} y1={0} y2={DETAIL_HEIGHT} stroke="rgba(125, 211, 252, 0.95)" strokeWidth={2.2} strokeDasharray="4 2"><animate attributeName="opacity" values="0.45;1;0.45" dur="1.7s" repeatCount="indefinite" /></line><circle cx={selectionX} cy={4} r={3.5} fill="rgba(186, 230, 253, 0.95)"><animate attributeName="r" values="3;4.5;3" dur="1.7s" repeatCount="indefinite" /></circle></g>}

              <g transform={`translate(0, ${DETAIL_HEIGHT})`} className="text-muted-foreground">
                {detailTicks.map((tick: Date, index: number) => { const x = detailScale(tick); return <g key={`detail-tick-${index}`} transform={`translate(${x}, 0)`}><line y2={6} stroke="currentColor" /><text y={14} textAnchor="middle" fontSize={10} fill="currentColor">{detailTickFormat(tick)}</text></g>; })}
              </g>
            </g>
          </svg>

          {isTimelineLoading && <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center"><div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm"><span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" aria-hidden="true" />Loading timeline data...</div></div>}
          {isDetailEmpty && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6"><div className="rounded-md border border-border/60 bg-background/90 px-4 py-3 text-center shadow-sm"><p className="text-sm font-medium text-foreground">No data in this range</p><p className="mt-1 text-xs text-muted-foreground">Try expanding the brush range or adjusting filters.</p></div></div>}
          {hoveredDetail && <div className="pointer-events-none absolute top-0 z-10 rounded bg-background/95 px-2 py-1 text-xs text-foreground shadow-sm" style={{ left: hoveredDetail.x + DETAIL_MARGIN.left, transform: 'translate(-50%, -100%)' }}>{hoveredDetail.label}</div>}
        </div>
      </div>
    </div>
  );
}
