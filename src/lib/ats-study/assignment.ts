import type { TaskType } from "./protocol";

export type TaskOrdering = "AB" | "BA";

export const A_B_ORDERING_COUNT = 6;

export const TASK_CYCLE: ReadonlyArray<TaskType> = ["peak", "comparison", "pattern"] as const;

export function taskForWindow(participantIndex: number, windowIndex: number): TaskType {
  if (!Number.isInteger(participantIndex) || participantIndex < 0) {
    throw new Error(`participantIndex must be a non-negative integer, got ${participantIndex}`);
  }
  if (!Number.isInteger(windowIndex) || windowIndex < 0) {
    throw new Error(`windowIndex must be a non-negative integer, got ${windowIndex}`);
  }
  return TASK_CYCLE[(participantIndex + windowIndex) % TASK_CYCLE.length]!;
}

export function orderingForParticipant(
  participantIndex: number,
  windowKey: string,
  orderings: ReadonlyArray<Record<string, TaskOrdering>>,
): TaskOrdering {
  if (!Number.isInteger(participantIndex) || participantIndex < 0) {
    throw new Error(`participantIndex must be a non-negative integer, got ${participantIndex}`);
  }
  const slot = orderings[participantIndex % A_B_ORDERING_COUNT];
  if (!slot) {
    throw new Error(`Missing ordering for participant slot ${participantIndex % A_B_ORDERING_COUNT}`);
  }
  const value = slot[windowKey];
  if (value !== "AB" && value !== "BA") {
    throw new Error(`Missing ordering for windowKey ${windowKey}`);
  }
  return value;
}

export function balanceReport(
  windowCount: number,
  orderings: ReadonlyArray<Record<string, TaskOrdering>>,
): {
  perTask: Record<TaskType, number>;
  perOrdering: { ab: number; ba: number };
} {
  if (!Number.isInteger(windowCount) || windowCount <= 0) {
    throw new Error(`windowCount must be a positive integer, got ${windowCount}`);
  }
  const perTask: Record<TaskType, number> = { peak: 0, comparison: 0, pattern: 0 };
  for (let p = 0; p < TASK_CYCLE.length; p += 1) {
    for (let i = 0; i < windowCount; i += 1) {
      const task = taskForWindow(p, i);
      perTask[task] = (perTask[task] ?? 0) + 1;
    }
  }
  let ab = 0;
  let ba = 0;
  for (const slot of orderings) {
    for (const key of Object.keys(slot)) {
      const value = slot[key];
      if (value === "AB") ab += 1;
      else if (value === "BA") ba += 1;
    }
  }
  return { perTask, perOrdering: { ab, ba } };
}
