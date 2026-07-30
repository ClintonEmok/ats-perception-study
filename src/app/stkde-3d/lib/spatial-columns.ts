import type { KdeCell } from '@/lib/kde/types';
import type { EvolvingSlice } from './types';

const COORDINATE_KEY_PRECISION = 4;

export type PersistentSpatialSlice = Pick<EvolvingSlice, 'index' | 'startEpoch' | 'endEpoch'>;

export interface PersistentSpatialColumnSegment {
  sliceIndex: number;
  startEpoch: number;
  endEpoch: number;
  intensity: number;
  support: number;
  normalizedIntensity: number;
}

export interface PersistentSpatialColumn {
  x: number;
  z: number;
  segments: PersistentSpatialColumnSegment[];
}

export interface PersistentSpatialSegmentY {
  startY: number;
  endY: number;
  centerY: number;
  height: number;
}

interface SpatialObservation extends PersistentSpatialColumnSegment {
  x: number;
  z: number;
  sourcePosition: number;
  cellPosition: number;
}

interface SpatialObservationGroup {
  x: number;
  z: number;
  observations: SpatialObservation[];
}

function roundCoordinate(value: number): number {
  const rounded = Number(value.toFixed(COORDINATE_KEY_PRECISION));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function coordinateKey(x: number, z: number): string {
  return `${roundCoordinate(x)}:${roundCoordinate(z)}`;
}

function isValidSlice(slice: PersistentSpatialSlice | undefined): slice is PersistentSpatialSlice {
  return Boolean(
    slice &&
      Number.isFinite(slice.startEpoch) &&
      Number.isFinite(slice.endEpoch) &&
      slice.endEpoch > slice.startEpoch,
  );
}

function isValidCell(cell: KdeCell, intensityCutoff: number | undefined): boolean {
  return (
    Number.isFinite(cell.x) &&
    Number.isFinite(cell.z) &&
    Number.isFinite(cell.intensity) &&
    Number.isFinite(cell.support) &&
    cell.support >= 0 &&
    cell.intensity > 0 &&
    (intensityCutoff === undefined || cell.intensity > intensityCutoff)
  );
}

function isPreferredDuplicate(candidate: SpatialObservation, current: SpatialObservation): boolean {
  if (candidate.intensity !== current.intensity) {
    return candidate.intensity > current.intensity;
  }

  if (candidate.support !== current.support) {
    return candidate.support > current.support;
  }

  return candidate.cellPosition < current.cellPosition;
}

function compareSegments(left: SpatialObservation, right: SpatialObservation): number {
  if (left.startEpoch !== right.startEpoch) {
    return left.startEpoch - right.startEpoch;
  }

  if (left.sliceIndex !== right.sliceIndex) {
    return left.sliceIndex - right.sliceIndex;
  }

  return left.sourcePosition - right.sourcePosition;
}

function compareColumns(left: PersistentSpatialColumn, right: PersistentSpatialColumn): number {
  if (left.x !== right.x) {
    return left.x - right.x;
  }

  return left.z - right.z;
}

/**
 * Aggregates KDE cells that persist across multiple actual source slices.
 * Cell arrays are paired with slices by position, while each source slice can
 * contribute at most one observation for a normalized x/z key.
 */
export function buildPersistentSpatialColumns(
  slices: readonly PersistentSpatialSlice[],
  sliceKdes: readonly (readonly KdeCell[] | undefined)[],
  minSlices = 2,
  intensityCutoff?: number,
): PersistentSpatialColumn[] {
  const persistenceThreshold = Number.isFinite(minSlices)
    ? Math.max(1, Math.ceil(minSlices))
    : 2;
  const cutoff = Number.isFinite(intensityCutoff) ? intensityCutoff : undefined;
  const groups = new Map<string, SpatialObservationGroup>();

  for (let sourcePosition = 0; sourcePosition < slices.length; sourcePosition += 1) {
    const slice = slices[sourcePosition];
    if (!isValidSlice(slice)) continue;

    const cells = sliceKdes[sourcePosition];
    if (!cells || cells.length === 0) continue;

    const observationsForSlice = new Map<string, SpatialObservation>();
    for (let cellPosition = 0; cellPosition < cells.length; cellPosition += 1) {
      const cell = cells[cellPosition];
      if (!cell || !isValidCell(cell, cutoff)) continue;

      const observation: SpatialObservation = {
        x: cell.x,
        z: cell.z,
        sliceIndex: slice.index,
        startEpoch: slice.startEpoch,
        endEpoch: slice.endEpoch,
        intensity: cell.intensity,
        support: cell.support,
        normalizedIntensity: 0,
        sourcePosition,
        cellPosition,
      };
      const key = coordinateKey(cell.x, cell.z);
      const current = observationsForSlice.get(key);
      if (!current || isPreferredDuplicate(observation, current)) {
        observationsForSlice.set(key, observation);
      }
    }

    for (const observation of observationsForSlice.values()) {
      const key = coordinateKey(observation.x, observation.z);
      const group = groups.get(key);
      if (group) {
        group.observations.push(observation);
      } else {
        groups.set(key, {
          x: observation.x,
          z: observation.z,
          observations: [observation],
        });
      }
    }
  }

  const retainedGroups = [...groups.values()].filter(
    (group) => group.observations.length >= persistenceThreshold,
  );
  const retainedIntensities = retainedGroups.flatMap((group) =>
    group.observations.map((observation) => observation.intensity),
  );
  const maximumIntensity = Math.max(...retainedIntensities);
  if (!Number.isFinite(maximumIntensity) || maximumIntensity <= 0) {
    return [];
  }

  return retainedGroups
    .map(({ x, z, observations }): PersistentSpatialColumn => ({
      x,
      z,
      segments: observations
        .sort(compareSegments)
        .map((observation) => ({
          sliceIndex: observation.sliceIndex,
          startEpoch: observation.startEpoch,
          endEpoch: observation.endEpoch,
          intensity: observation.intensity,
          support: observation.support,
          normalizedIntensity: Math.min(1, Math.max(0, observation.intensity / maximumIntensity)),
        })),
    }))
    .sort(compareColumns);
}

export function mapPersistentSpatialSegmentToY(
  segment: PersistentSpatialColumnSegment,
  resolveEpochY: (epochSec: number) => number,
): PersistentSpatialSegmentY | null {
  const startY = resolveEpochY(segment.startEpoch);
  const endY = resolveEpochY(segment.endEpoch);

  if (!Number.isFinite(startY) || !Number.isFinite(endY) || endY <= startY) {
    return null;
  }

  return {
    startY,
    endY,
    centerY: (startY + endY) / 2,
    height: endY - startY,
  };
}
