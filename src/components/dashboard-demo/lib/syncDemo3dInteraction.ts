import type { DemoBurstWindowSelection } from '@/store/useDashboardDemoCoordinationStore';
import type {
  Stkde3DBurstInteractionPayload,
  Stkde3DClusterInteractionPayload,
} from '@/components/dashboard-demo/stkde-3d/components/Stkde3DSceneProvider';

export interface Demo3dMapFocus {
  centroidLat: number;
  centroidLng: number;
  radiusMeters: number | null;
  epochRange: [number, number];
}

export interface Demo3dInteractionCommand {
  kind: 'burst' | 'trajectory';
  epochRange: [number, number] | null;
  selectedBurstWindow: DemoBurstWindowSelection | null;
  sourceSliceId: string | null;
  sourceSliceIndex: number | null;
  activeSliceTarget: { sourceSliceId: string; index: number | null } | null;
  trajectoryHotspotId: string | null;
  selectedHotspotId: string | null;
  hotspotResolution: 'not-applicable' | 'exact' | 'spatial-fallback' | 'unavailable';
  mapFocus: Demo3dMapFocus | null;
  cameraTarget: [number, number, number] | null;
}

export type Demo3dInteractionInput =
  | {
      kind: 'burst';
      payload: Stkde3DBurstInteractionPayload;
      existingBurstWindow?: DemoBurstWindowSelection | null;
      topLevelHotspotIds?: readonly string[];
      resolveEpochY: (epochSec: number) => number;
    }
  | {
      kind: 'trajectory';
      payload: Stkde3DClusterInteractionPayload;
      existingBurstWindow?: DemoBurstWindowSelection | null;
      topLevelHotspotIds?: readonly string[];
      resolveEpochY: (epochSec: number) => number;
    };

function resolveEpochRange(startEpoch: number, endEpoch: number): [number, number] | null {
  if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch) || startEpoch === endEpoch) {
    return null;
  }
  const start = Math.min(startEpoch, endEpoch);
  const end = Math.max(startEpoch, endEpoch);
  return end > start ? [start, end] : null;
}

function resolveCameraTarget(
  point: [number, number, number],
  epoch: number,
  resolveEpochY: (epochSec: number) => number,
): [number, number, number] | null {
  const y = resolveEpochY(epoch);
  if (!point.every(Number.isFinite) || !Number.isFinite(y)) return null;
  return [point[0], y, point[2]];
}

function resolveMapFocus(
  payload: Stkde3DClusterInteractionPayload,
  epochRange: [number, number] | null,
): Demo3dMapFocus | null {
  if (!epochRange || !Number.isFinite(payload.centroidLat) || !Number.isFinite(payload.centroidLng)) {
    return null;
  }
  return {
    centroidLat: payload.centroidLat,
    centroidLng: payload.centroidLng,
    radiusMeters: Number.isFinite(payload.radiusMeters ?? Number.NaN) ? payload.radiusMeters : null,
    epochRange,
  };
}

export function deriveDemo3dInteractionCommand(input: Demo3dInteractionInput): Demo3dInteractionCommand {
  const { payload } = input;
  const epochRange = resolveEpochRange(payload.startEpoch, payload.endEpoch);
  const focusEpoch = input.kind === 'burst'
    ? input.payload.sampleEpoch
    : epochRange ? (epochRange[0] + epochRange[1]) / 2 : input.payload.startEpoch;
  const cameraTarget = resolveCameraTarget(payload.focusPoint, focusEpoch, input.resolveEpochY);
  const sourceSliceId = payload.sourceSliceId;
  const sourceSliceIndex = payload.sourceSliceIndex ?? null;

  if (input.kind === 'burst') {
    return {
      kind: 'burst',
      epochRange,
      selectedBurstWindow: input.existingBurstWindow ?? null,
      sourceSliceId,
      sourceSliceIndex,
      activeSliceTarget: sourceSliceId ? { sourceSliceId, index: sourceSliceIndex } : null,
      trajectoryHotspotId: null,
      selectedHotspotId: null,
      hotspotResolution: 'not-applicable',
      mapFocus: null,
      cameraTarget,
    };
  }

  const trajectoryPayload = input.payload;
  const trajectoryHotspotId = trajectoryPayload.hotspotId;
  const exactTopLevelMatch = input.topLevelHotspotIds?.some((id) => id === trajectoryHotspotId) ?? false;
  const mapFocus = exactTopLevelMatch ? null : resolveMapFocus(trajectoryPayload, epochRange);

  return {
    kind: 'trajectory',
    epochRange,
    selectedBurstWindow: input.existingBurstWindow ?? null,
    sourceSliceId,
    sourceSliceIndex,
    activeSliceTarget: sourceSliceId ? { sourceSliceId, index: sourceSliceIndex } : null,
    trajectoryHotspotId,
    selectedHotspotId: exactTopLevelMatch ? trajectoryHotspotId : null,
    hotspotResolution: exactTopLevelMatch
      ? 'exact'
      : mapFocus
        ? 'spatial-fallback'
        : 'unavailable',
    mapFocus,
    cameraTarget,
  };
}
