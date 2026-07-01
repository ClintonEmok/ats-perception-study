import { describe, expect, it } from "vitest";
import {
  A_B_ORDERING_COUNT,
  TASK_CYCLE,
  WINDOWS_PER_PARTICIPANT,
  buildParticipantTrialItems,
  type TaskOrdering,
  balanceReport,
  orderingForParticipant,
  selectParticipantWindows,
  taskForWindow,
} from "./assignment";
import type { ABWindowSpec } from "./experiments";

const WINDOW_KEYS = [
  ...Array.from({ length: 10 }, (_, i) => `1,${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `14,${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `30,${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `90,${i + 1}`),
] as const;

const WINDOW_POOL: ABWindowSpec[] = WINDOW_KEYS.map((windowKey, windowIndex) => {
  const [windowDays, rank] = windowKey.split(",").map(Number);
  return { windowIndex, windowKey, windowDays, rank };
});

const buildOrderings = (picker: (i: number) => TaskOrdering): ReadonlyArray<Record<string, TaskOrdering>> =>
  Array.from({ length: 6 }, (_, s) => {
    const slot: Record<string, TaskOrdering> = {};
    WINDOW_KEYS.forEach((k, i) => {
      slot[k] = picker(s + i);
    });
    return slot;
  });

const fakeOrderings = buildOrderings((i) => (i % 2 === 0 ? "AB" : "BA"));

describe("taskForWindow", () => {
  it("returns one of the three task types", () => {
    for (let p = 0; p < 5; p += 1) {
      for (let i = 0; i < WINDOWS_PER_PARTICIPANT; i += 1) {
        const task = taskForWindow(p, i);
        expect(TASK_CYCLE).toContain(task);
      }
    }
  });

  it("gives each participant 4 trials per task across the 12-window subset", () => {
    for (let p = 0; p < 6; p += 1) {
      const counts: Record<string, number> = { peak: 0, comparison: 0, pattern: 0 };
      for (let i = 0; i < WINDOWS_PER_PARTICIPANT; i += 1) {
        const task = taskForWindow(p, i);
        counts[task] = (counts[task] ?? 0) + 1;
      }
      expect(counts).toEqual({ peak: 4, comparison: 4, pattern: 4 });
    }
  });

  it("covers each task exactly once per window across 3 participants", () => {
    for (let i = 0; i < WINDOWS_PER_PARTICIPANT; i += 1) {
      const seen = new Set<string>();
      for (let p = 0; p < TASK_CYCLE.length; p += 1) {
        seen.add(taskForWindow(p, i));
      }
      expect(seen.size).toBe(TASK_CYCLE.length);
    }
  });

  it("rejects negative or non-integer indices", () => {
    expect(() => taskForWindow(-1, 0)).toThrow();
    expect(() => taskForWindow(0, -1)).toThrow();
    expect(() => taskForWindow(1.5, 0)).toThrow();
    expect(() => taskForWindow(0, 1.5)).toThrow();
  });
});

describe("selectParticipantWindows", () => {
  it("selects a balanced 12-window subset from the 40-window pool", () => {
    const subset = selectParticipantWindows(0, WINDOW_POOL);
    expect(subset).toHaveLength(WINDOWS_PER_PARTICIPANT);
    expect(subset.some((window) => window.windowKey === "14,3")).toBe(false);
    expect(subset.some((window) => window.windowKey === "30,3")).toBe(false);
    const perGroup = new Map<number, number>();
    for (const window of subset) {
      perGroup.set(window.windowDays, (perGroup.get(window.windowDays) ?? 0) + 1);
    }
    expect([...perGroup.values()]).toEqual(Array.from({ length: 4 }, () => 3));
  });

  it("changes the subset with participant index", () => {
    const subset0 = selectParticipantWindows(0, WINDOW_POOL).map((w) => w.windowKey);
    const subset1 = selectParticipantWindows(1, WINDOW_POOL).map((w) => w.windowKey);
    expect(subset0).not.toEqual(subset1);
  });

  it("rejects invalid pool sizes", () => {
    expect(() => selectParticipantWindows(0, WINDOW_POOL.slice(0, 39))).toThrow();
  });
});

describe("buildParticipantTrialItems", () => {
  it("builds a comparison-only participant deck", () => {
    const items = buildParticipantTrialItems(0, WINDOW_POOL);
    expect(items).toHaveLength(WINDOWS_PER_PARTICIPANT);
    expect(items.every((item) => item.kind === "comparison")).toBe(true);
  });
});

describe("orderingForParticipant", () => {
  it("picks the ordering slot via participantIndex % 6", () => {
    expect(orderingForParticipant(0, "1,1", fakeOrderings)).toBe("AB");
    expect(orderingForParticipant(1, "1,1", fakeOrderings)).toBe("BA");
    expect(orderingForParticipant(6, "1,1", fakeOrderings)).toBe("AB");
    expect(orderingForParticipant(7, "1,1", fakeOrderings)).toBe("BA");
  });

  it("rejects negative or non-integer participant indices", () => {
    expect(() => orderingForParticipant(-1, "1,1", fakeOrderings)).toThrow();
    expect(() => orderingForParticipant(1.5, "1,1", fakeOrderings)).toThrow();
  });

  it("rejects missing window keys", () => {
    expect(() => orderingForParticipant(0, "no-such-window", fakeOrderings)).toThrow();
  });
});

describe("balanceReport", () => {
  it("reports 12 trials per task across the 3 canonical participants", () => {
    const report = balanceReport(12, fakeOrderings);
    expect(report.perTask).toEqual({ peak: 12, comparison: 12, pattern: 12 });
    expect(report.perOrdering.ab + report.perOrdering.ba).toBe(A_B_ORDERING_COUNT * WINDOW_KEYS.length);
  });
});
