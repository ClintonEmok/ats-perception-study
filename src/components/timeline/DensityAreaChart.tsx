import { useId, useMemo } from 'react';
import { AreaClosed, LinePath } from '@visx/shape';
import { LinearGradient } from '@visx/gradient';
import { scaleLinear, scaleTime } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { max } from 'd3-array';

export interface DensityPoint {
  time: Date;
  density: number;
}

export interface DensityAreaChartProps {
  data: DensityPoint[];
  width: number;
  height?: number;
  isLoading?: boolean;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

const DEFAULT_HEIGHT = 72;
const DEFAULT_MARGIN = { top: 8, right: 12, bottom: 8, left: 12 };
const BASELINE_DENSITY = 0.001;
const FALLBACK_TIME_DOMAIN: [Date, Date] = [new Date(0), new Date(60_000)];

const clampDensity = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

export function DensityAreaChart({
  data,
  width,
  height = DEFAULT_HEIGHT,
  isLoading = false,
  margin = DEFAULT_MARGIN
}: DensityAreaChartProps) {
  const gradientId = useId().replace(/:/g, '_');

  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : DEFAULT_HEIGHT;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const innerWidth = Math.max(0, safeWidth - margin.left - margin.right);
  const innerHeight = Math.max(0, safeHeight - margin.top - margin.bottom);

  const sanitizedData = useMemo(() => {
    if (data.length === 0) {
      return [] as DensityPoint[];
    }

    return data
      .map((point) => ({
        time: new Date(point.time),
        density: clampDensity(point.density)
      }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [data]);

  const hasData = sanitizedData.length > 1;
  const densityMax = useMemo(() => max(sanitizedData, (d) => d.density) ?? 0, [sanitizedData]);
  const yMax = densityMax > 0 ? densityMax : BASELINE_DENSITY;

  const timeDomain = hasData
    ? [sanitizedData[0].time, sanitizedData[sanitizedData.length - 1].time]
    : FALLBACK_TIME_DOMAIN;

  const xScale = useMemo(
    () =>
      scaleTime({
        domain: timeDomain,
        range: [0, innerWidth]
      }),
    [innerWidth, timeDomain]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, yMax],
        range: [innerHeight, 0],
        nice: true
      }),
    [innerHeight, yMax]
  );

  const zeroSeries = useMemo(() => {
    if (hasData) {
      return sanitizedData.map((point) => ({ ...point, density: BASELINE_DENSITY }));
    }
    return [
      { time: timeDomain[0], density: BASELINE_DENSITY },
      { time: timeDomain[1], density: BASELINE_DENSITY }
    ];
  }, [hasData, sanitizedData, timeDomain]);

  if (safeWidth <= 0 || safeHeight <= 0) {
    return null;
  }

  const showArea = hasData && densityMax > 0;

  return (
    <svg
      width={safeWidth}
      height={safeHeight}
      viewBox={`0 0 ${safeWidth} ${safeHeight}`}
      className={isLoading ? 'opacity-60 transition-opacity duration-200' : 'opacity-100 transition-opacity duration-200'}
      aria-busy={isLoading}
    >
      <defs>
        <LinearGradient
          id={`density-gradient-${gradientId}`}
          from="#3b82f6"
          fromOpacity={0.5}
          to="#3b82f6"
          toOpacity={0.05}
          vertical
        />
      </defs>

      <g transform={`translate(${margin.left},${margin.top})`}>
        {showArea ? (
          <AreaClosed
            data={sanitizedData}
            x={(d) => xScale(d.time) ?? 0}
            y={(d) => yScale(d.density) ?? innerHeight}
            yScale={yScale}
            fill={`url(#density-gradient-${gradientId})`}
            stroke="#3b82f6"
            strokeOpacity={0.6}
            strokeWidth={1.5 / dpr}
            curve={curveMonotoneX}
          />
        ) : null}

        <LinePath
          data={zeroSeries}
          x={(d) => xScale(d.time) ?? 0}
          y={(d) => yScale(d.density) ?? innerHeight}
          stroke="#3b82f6"
          strokeOpacity={showArea ? 0.25 : 0.15}
          strokeWidth={1 / dpr}
          curve={curveMonotoneX}
        />
      </g>
    </svg>
  );
}
