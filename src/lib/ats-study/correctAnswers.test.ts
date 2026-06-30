import { describe, expect, it } from "vitest";
import { pickCorrectAnswer } from "./correctAnswers";
import { getUniformVariants } from "./datasets";

const variants = getUniformVariants();

describe("pickCorrectAnswer", () => {
  it("returns one of the three peak choices", () => {
    for (const variant of variants) {
      const choice = pickCorrectAnswer({ variant, taskType: "peak" });
      expect(["A", "B", "C"]).toContain(choice);
    }
  });

  it("returns one of the two comparison choices", () => {
    for (const variant of variants) {
      const choice = pickCorrectAnswer({ variant, taskType: "comparison" });
      expect(["first", "second"]).toContain(choice);
    }
  });

  it("returns the dataset's encoded pattern", () => {
    for (const variant of variants) {
      const choice = pickCorrectAnswer({ variant, taskType: "pattern" });
      expect(["uniform", "single-burst", "multi-burst", "gradual-change"]).toContain(choice);
    }
  });
});
