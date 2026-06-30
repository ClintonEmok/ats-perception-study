import type { RenderedVariant } from "./datasets";
import type { TaskType } from "./protocol";

export interface CorrectAnswerContext {
  variant: RenderedVariant;
  taskType: TaskType;
}

const TRIAL_INDEX_FOR_THIRD = (events: ReadonlyArray<number>, third: "first" | "second" | "third"): number => {
  const len = events.length;
  if (len === 0) return 0;
  if (third === "first") return Math.floor(len / 3);
  if (third === "second") return Math.floor((2 * len) / 3);
  return len - 1;
};

const countInWindow = (
  events: ReadonlyArray<number>,
  domain: readonly [number, number],
  startFraction: number,
  endFraction: number,
): number => {
  const [lo, hi] = domain;
  const span = hi - lo;
  const loCutoff = lo + span * startFraction;
  const hiCutoff = lo + span * endFraction;
  let count = 0;
  for (const t of events) {
    if (t >= loCutoff && t < hiCutoff) count += 1;
  }
  return count;
};

const pickPeakChoice = (variant: RenderedVariant): "A" | "B" | "C" => {
  const events = variant.events;
  if (events.length === 0) return "A";
  const first = countInWindow(events, variant.domain, 0, 1 / 3);
  const second = countInWindow(events, variant.domain, 1 / 3, 2 / 3);
  const third = countInWindow(events, variant.domain, 2 / 3, 1);
  const max = Math.max(first, second, third);
  if (second === max) return "B";
  if (third === max) return "C";
  return "A";
};

const pickComparisonChoice = (variant: RenderedVariant): "first" | "second" => {
  const first = countInWindow(variant.events, variant.domain, 0, 0.5);
  const second = countInWindow(variant.events, variant.domain, 0.5, 1);
  return second > first ? "second" : "first";
};

const pickPatternChoice = (variant: RenderedVariant): "uniform" | "single-burst" | "multi-burst" | "gradual-change" => {
  const meta = variant.pattern;
  if (meta === "single_burst") return "single-burst";
  if (meta === "multi_burst") return "multi-burst";
  if (meta === "gradual_change") return "gradual-change";
  return "uniform";
};

export function pickCorrectAnswer({ variant, taskType }: CorrectAnswerContext): string {
  switch (taskType) {
    case "peak":
      return pickPeakChoice(variant);
    case "comparison":
      return pickComparisonChoice(variant);
    case "pattern":
      return pickPatternChoice(variant);
    default:
      return "A";
  }
}

export function _exportInternalHelpersForTests() {
  return { pickPeakChoice, pickComparisonChoice, pickPatternChoice, countInWindow, TRIAL_INDEX_FOR_THIRD };
}
