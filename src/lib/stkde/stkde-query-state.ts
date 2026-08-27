import { CHICAGO_BOUNDS } from '@/lib/coordinate-normalization';

export interface StkdeQueryState {
  computeMode: 'sampled' | 'full-population';
  startEpochSec: number;
  endEpochSec: number;
  spatialBandwidthMeters: number;
  temporalBandwidthHours: number;
  gridCellMeters: number;
  topK: number;
  minSupport: number;
  timeWindowHours: number;
}

const DEFAULT_QUERY_STATE: StkdeQueryState = {
  computeMode: 'sampled',
  startEpochSec: 1_609_459_200,
  endEpochSec: 1_735_689_600,
  spatialBandwidthMeters: 750,
  temporalBandwidthHours: 24,
  gridCellMeters: 500,
  topK: 12,
  minSupport: 5,
  timeWindowHours: 24,
};

const coerceNumber = (value: string | null, fallback: number, min: number, max: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const coerceComputeMode = (value: string | null): StkdeQueryState['computeMode'] =>
  value === 'full-population' ? 'full-population' : 'sampled';

export const resolveStkdeQueryState = (searchParamsInput: URLSearchParams | string | null | undefined): StkdeQueryState => {
  const searchParams =
    searchParamsInput instanceof URLSearchParams
      ? searchParamsInput
      : new URLSearchParams(searchParamsInput ?? '');

  const startEpochSec = coerceNumber(searchParams.get('start'), DEFAULT_QUERY_STATE.startEpochSec, 946684800, 1893456000);
  const endEpochSec = coerceNumber(searchParams.get('end'), DEFAULT_QUERY_STATE.endEpochSec, 946684800, 1893456000);

  return {
    computeMode: coerceComputeMode(searchParams.get('mode')),
    startEpochSec: Math.min(startEpochSec, endEpochSec - 1),
    endEpochSec: Math.max(endEpochSec, startEpochSec + 1),
    spatialBandwidthMeters: coerceNumber(searchParams.get('sbw'), DEFAULT_QUERY_STATE.spatialBandwidthMeters, 100, 5000),
    temporalBandwidthHours: coerceNumber(searchParams.get('tbw'), DEFAULT_QUERY_STATE.temporalBandwidthHours, 1, 168),
    gridCellMeters: coerceNumber(searchParams.get('cell'), DEFAULT_QUERY_STATE.gridCellMeters, 100, 5000),
    topK: coerceNumber(searchParams.get('topk'), DEFAULT_QUERY_STATE.topK, 1, 100),
    minSupport: coerceNumber(searchParams.get('mins'), DEFAULT_QUERY_STATE.minSupport, 1, 1000),
    timeWindowHours: coerceNumber(searchParams.get('twin'), DEFAULT_QUERY_STATE.timeWindowHours, 1, 168),
  };
};

export const serializeStkdeQueryState = (
  searchParamsInput: URLSearchParams | string | null | undefined,
  state: StkdeQueryState,
): URLSearchParams => {
  const next =
    searchParamsInput instanceof URLSearchParams
      ? new URLSearchParams(searchParamsInput.toString())
      : new URLSearchParams(searchParamsInput ?? '');

  next.set('start', String(state.startEpochSec));
  next.set('end', String(state.endEpochSec));
  next.set('mode', state.computeMode);
  next.set('sbw', String(state.spatialBandwidthMeters));
  next.set('tbw', String(state.temporalBandwidthHours));
  next.set('cell', String(state.gridCellMeters));
  next.set('topk', String(state.topK));
  next.set('mins', String(state.minSupport));
  next.set('twin', String(state.timeWindowHours));
  return next;
};

export const DEFAULT_STKDE_BBOX: [number, number, number, number] = [
  CHICAGO_BOUNDS.minLon,
  CHICAGO_BOUNDS.minLat,
  CHICAGO_BOUNDS.maxLon,
  CHICAGO_BOUNDS.maxLat,
];
