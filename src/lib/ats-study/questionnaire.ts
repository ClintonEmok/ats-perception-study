export const CONFIDENCE_ANCHORS = [
  "Very unconfident",
  "Unconfident",
  "Neutral",
  "Confident",
  "Very confident",
] as const;

export type ConfidenceAnchor = (typeof CONFIDENCE_ANCHORS)[number];

export const PREFERENCE_LABELS_5PT = [
  "Strongly uniform",
  "Uniform",
  "Neutral",
  "ATS",
  "Strongly ATS",
] as const;

export type Preference5pt = (typeof PREFERENCE_LABELS_5PT)[number];

export const PREFERENCE_LABELS_3WAY = ["uniform", "ats", "no-preference"] as const;
export type Preference3way = (typeof PREFERENCE_LABELS_3WAY)[number];

export const PREFERENCE_VALUES = [
  ...PREFERENCE_LABELS_3WAY,
  ...PREFERENCE_LABELS_5PT,
] as const;
export type Preference = (typeof PREFERENCE_VALUES)[number];

export const MIN_FREE_TEXT_CHARS = 10;

export function isPreference5pt(value: string): value is Preference5pt {
  return (PREFERENCE_LABELS_5PT as ReadonlyArray<string>).includes(value);
}

export function isPreference3way(value: string): value is Preference3way {
  return (PREFERENCE_LABELS_3WAY as ReadonlyArray<string>).includes(value);
}

export function isPreference(value: string): value is Preference {
  return (PREFERENCE_VALUES as ReadonlyArray<string>).includes(value);
}

export interface FreeTextValidation {
  ok: boolean;
  reason: "ok" | "empty" | "too-short";
  remaining: number;
}

export function validateFreeText(text: string): FreeTextValidation {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "empty", remaining: MIN_FREE_TEXT_CHARS };
  }
  if (trimmed.length < MIN_FREE_TEXT_CHARS) {
    return { ok: false, reason: "too-short", remaining: MIN_FREE_TEXT_CHARS - trimmed.length };
  }
  return { ok: true, reason: "ok", remaining: 0 };
}

export function confidenceAnchor(value: number): ConfidenceAnchor | undefined {
  if (!Number.isInteger(value) || value < 1 || value > 5) return undefined;
  return CONFIDENCE_ANCHORS[value - 1];
}
