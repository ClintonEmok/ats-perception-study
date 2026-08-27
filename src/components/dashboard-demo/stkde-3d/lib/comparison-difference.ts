import type { KdeCell, KdeField } from '@/lib/kde';

export const MIN_COMPARISON_DOMAIN = 1e-9;

export type ComparisonDomain = [number, number];

export interface SignedKdeDifference {
  field: KdeField;
  values: Float32Array;
  noActivityMask: Uint8Array;
  domain: ComparisonDomain;
  maxAbs: number;
}

export type KdeComparisonErrorCode = 'missing-field' | 'invalid-field' | 'grid-mismatch';

export class KdeComparisonError extends Error {
  readonly code: KdeComparisonErrorCode;

  constructor(code: KdeComparisonErrorCode, message: string) {
    super(message);
    this.name = 'KdeComparisonError';
    this.code = code;
  }
}

function assertValidKdeField(
  field: KdeField | null | undefined,
  name: 'A' | 'B',
): asserts field is KdeField {
  if (!field) {
    throw new KdeComparisonError(
      'missing-field',
      `KDE comparison requires a complete field for ${name}`,
    );
  }

  const expectedLength = field.gridSize * field.gridSize;
  if (
    !Number.isInteger(field.gridSize) ||
    field.gridSize < 1 ||
    !Number.isFinite(field.cellWidth) ||
    field.cellWidth <= 0 ||
    !Number.isFinite(field.cellHeight) ||
    field.cellHeight <= 0 ||
    !Number.isFinite(field.maxIntensity) ||
    field.maxIntensity < 0 ||
    !(field.values instanceof Float32Array) ||
    !(field.support instanceof Float32Array) ||
    field.values.length !== expectedLength ||
    field.support.length !== expectedLength
  ) {
    throw new KdeComparisonError(
      'invalid-field',
      `KDE comparison requires valid grid metadata for field ${name}`,
    );
  }

  let observedMax = 0;
  for (let index = 0; index < field.values.length; index += 1) {
    const value = field.values[index] ?? 0;
    const support = field.support[index] ?? 0;
    if (!Number.isFinite(value) || value < 0 || !Number.isFinite(support) || support < 0) {
      throw new KdeComparisonError(
        'invalid-field',
        `KDE comparison field ${name} contains a non-finite or negative value`,
      );
    }
    observedMax = Math.max(observedMax, value);
  }

  if (field.maxIntensity + Number.EPSILON < observedMax) {
    throw new KdeComparisonError(
      'invalid-field',
      `KDE comparison field ${name} has an inconsistent raw maximum`,
    );
  }
}

function assertAlignedFields(a: KdeField, b: KdeField): void {
  if (
    a.gridSize !== b.gridSize ||
    a.values.length !== b.values.length ||
    a.support.length !== b.support.length ||
    a.cellWidth !== b.cellWidth ||
    a.cellHeight !== b.cellHeight
  ) {
    throw new KdeComparisonError(
      'grid-mismatch',
      'KDE comparison requires matching grids and cell dimensions',
    );
  }
}

function safeDomainMaximum(value: number): number {
  return Number.isFinite(value) && value > MIN_COMPARISON_DOMAIN
    ? value
    : MIN_COMPARISON_DOMAIN;
}

/**
 * Derive one absolute domain for both raw fields.
 *
 * The small positive fallback keeps empty fields renderable without changing
 * the fact that their raw maximum is zero.
 */
export function getSharedAbsoluteDomain(a: KdeField, b: KdeField): ComparisonDomain {
  assertValidKdeField(a, 'A');
  assertValidKdeField(b, 'B');
  return [0, safeDomainMaximum(Math.max(a.maxIntensity, b.maxIntensity))];
}

export const computeSharedAbsoluteDomain = getSharedAbsoluteDomain;

function safeThreshold(threshold: number): number {
  return Number.isFinite(threshold) ? Math.max(0, threshold) : 0;
}

/**
 * Convert a complete raw field into the sparse cells used by the existing
 * display renderer, normalizing against a shared absolute maximum.
 */
export function convertKdeFieldToDisplayCells(
  field: KdeField,
  absoluteMaximum: number,
  threshold = 0,
): KdeCell[] {
  assertValidKdeField(field, 'A');
  const safeMaximum = safeDomainMaximum(absoluteMaximum);
  const safeCutoff = safeThreshold(threshold);
  const cells: KdeCell[] = [];

  for (let row = 0; row < field.gridSize; row += 1) {
    for (let col = 0; col < field.gridSize; col += 1) {
      const index = row * field.gridSize + col;
      const rawValue = field.values[index] ?? 0;
      const normalized = Math.min(1, Math.max(0, rawValue / safeMaximum));
      if (normalized <= safeCutoff) continue;

      cells.push({
        x: Number((-50 + (col + 0.5) * field.cellWidth).toFixed(2)),
        z: Number((-50 + (row + 0.5) * field.cellHeight).toFixed(2)),
        intensity: Number(normalized.toFixed(4)),
        support: Math.round(field.support[index] ?? 0),
      });
    }
  }

  return cells;
}

export const toSharedAbsoluteDisplayCells = convertKdeFieldToDisplayCells;

/**
 * Subtract complete raw grids, retaining values that the sparse display
 * threshold would have removed from either input.
 */
export function computeSignedKdeDifference(
  a: KdeField | null | undefined,
  b: KdeField | null | undefined,
): SignedKdeDifference {
  assertValidKdeField(a, 'A');
  assertValidKdeField(b, 'B');
  assertAlignedFields(a, b);

  const values = new Float32Array(a.values.length);
  const support = new Float32Array(a.support.length);
  const noActivityMask = new Uint8Array(a.support.length);
  let maxAbs = 0;

  for (let index = 0; index < values.length; index += 1) {
    const difference = (a.values[index] ?? 0) - (b.values[index] ?? 0);
    values[index] = difference;
    const supportA = a.support[index] ?? 0;
    const supportB = b.support[index] ?? 0;
    support[index] = Math.max(supportA, supportB);
    noActivityMask[index] = supportA === 0 && supportB === 0 ? 1 : 0;
    maxAbs = Math.max(maxAbs, Math.abs(difference));
  }

  const signedDomainMaximum = safeDomainMaximum(maxAbs);
  const field: KdeField = {
    values,
    support,
    gridSize: a.gridSize,
    cellWidth: a.cellWidth,
    cellHeight: a.cellHeight,
    maxIntensity: maxAbs,
  };

  return {
    field,
    values,
    noActivityMask,
    maxAbs,
    domain: [-signedDomainMaximum, signedDomainMaximum],
  };
}
