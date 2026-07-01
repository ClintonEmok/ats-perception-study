import type { ABWindowSpec } from "./experiments";
import type { TaskType } from "./protocol";

export type TaskOrdering = "AB" | "BA";

export const A_B_ORDERING_COUNT = 6;
export const WINDOWS_PER_GROUP = 5;
export const WINDOWS_PER_GROUP_SELECTION = 3;
export const WINDOWS_PER_PARTICIPANT = 12;

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

function takeCircular<T>(items: readonly T[], start: number, count: number): T[] {
  const out: T[] = [];
  if (items.length === 0) return out;
  for (let i = 0; i < count; i += 1) {
    out.push(items[(start + i) % items.length]!);
  }
  return out;
}

export function selectParticipantWindows(
  participantIndex: number,
  windows: ReadonlyArray<ABWindowSpec>,
): ABWindowSpec[] {
  if (!Number.isInteger(participantIndex) || participantIndex < 0) {
    throw new Error(`participantIndex must be a non-negative integer, got ${participantIndex}`);
  }
  if (windows.length !== 20) {
    throw new Error(`windows must contain the 20-window pool, got ${windows.length}`);
  }

  const groups = new Map<number, ABWindowSpec[]>();
  for (const window of windows) {
    const bucket = groups.get(window.windowDays) ?? [];
    bucket.push(window);
    groups.set(window.windowDays, bucket);
  }

  const orderedGroups = [...groups.entries()].sort(([a], [b]) => a - b).map(([, group]) => group);
  if (orderedGroups.length !== 4 || orderedGroups.some((group) => group.length !== WINDOWS_PER_GROUP)) {
    throw new Error(`Expected 4 groups of ${WINDOWS_PER_GROUP} windows`);
  }

  const offset = participantIndex % WINDOWS_PER_GROUP;
  const perGroup = orderedGroups.map((group) => takeCircular(group, offset, WINDOWS_PER_GROUP_SELECTION));
  const selected: ABWindowSpec[] = [];
  for (let i = 0; i < WINDOWS_PER_GROUP_SELECTION; i += 1) {
    for (const group of perGroup) {
      selected.push(group[i]!);
    }
  }
  return selected;
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
