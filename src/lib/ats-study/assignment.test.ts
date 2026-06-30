import { describe, expect, it } from "vitest";
import {
  CONDITION_ORDERS,
  TOTAL_EXPERIMENTAL_TRIALS,
  assignConditionOrder,
  balanceReport,
  conditionForTrial,
} from "./assignment";

describe("assignConditionOrder", () => {
  it("returns the first order for participant 0", () => {
    expect(assignConditionOrder(0)).toEqual(CONDITION_ORDERS[0]);
  });

  it("returns the second order for participant 1", () => {
    expect(assignConditionOrder(1)).toEqual(CONDITION_ORDERS[1]);
  });

  it("cycles across the Latin square", () => {
    expect(assignConditionOrder(2)).toEqual(CONDITION_ORDERS[0]);
    expect(assignConditionOrder(3)).toEqual(CONDITION_ORDERS[1]);
  });

  it("is deterministic", () => {
    const a = assignConditionOrder(7);
    const b = assignConditionOrder(7);
    expect(a).toEqual(b);
  });

  it("rejects negative or non-integer indices", () => {
    expect(() => assignConditionOrder(-1)).toThrow();
    expect(() => assignConditionOrder(1.5)).toThrow();
  });
});

describe("conditionForTrial", () => {
  it("returns the order's condition for each trial index", () => {
    expect(conditionForTrial(0, 0)).toBe("uniform");
    expect(conditionForTrial(0, 1)).toBe("ats");
    expect(conditionForTrial(1, 0)).toBe("ats");
  });

  it("rejects out-of-range trial indices", () => {
    expect(() => conditionForTrial(0, -1)).toThrow();
    expect(() => conditionForTrial(0, TOTAL_EXPERIMENTAL_TRIALS)).toThrow();
  });
});

describe("balanceReport", () => {
  it("is balanced across orders", () => {
    const report = balanceReport();
    expect(report.uniformCount).toBe(report.atsCount);
    for (const perOrder of report.perOrder) {
      expect(perOrder.uniform).toBe(perOrder.ats);
    }
  });
});
