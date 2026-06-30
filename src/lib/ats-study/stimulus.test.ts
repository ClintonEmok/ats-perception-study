import { describe, expect, it } from "vitest";
import { BASE_DATASETS, getAtsVariants, getUniformVariants } from "./datasets";
import { buildStimulusLayout } from "./stimulus";

describe("buildStimulusLayout", () => {
  it("produces a layout that contains every event as a rug point", () => {
    const variant = getUniformVariants()[0]!;
    const layout = buildStimulusLayout(variant, { width: 400, height: 100, bandHeight: 16 });
    expect(layout.rug).toHaveLength(variant.events.length);
    expect(layout.bands.length).toBeGreaterThan(0);
    expect(layout.width).toBe(400);
    expect(layout.height).toBe(100);
    expect(layout.bandHeight).toBe(16);
  });

  it("uses ats intervals when the variant is ats", () => {
    const variant = getAtsVariants()[0]!;
    const layout = buildStimulusLayout(variant, { width: 600, height: 200, bandHeight: 24 });
    expect(layout.condition).toBe("ats");
    expect(layout.intervalCount).toBeGreaterThan(0);
    const totalBandWidth = layout.bands.reduce((acc, b) => acc + b.width, 0);
    // Allow up to one min-width bin of slack because ats intervals clamp to a minimum band width.
    expect(Math.abs(totalBandWidth - layout.width)).toBeLessThanOrEqual(20);
  });

  it("is deterministic for the same inputs", () => {
    const variant = getUniformVariants()[1]!;
    const a = buildStimulusLayout(variant);
    const b = buildStimulusLayout(variant);
    expect(a.bands).toEqual(b.bands);
    expect(a.rug.map((p) => p.x)).toEqual(b.rug.map((p) => p.x));
  });

  it("covers all base datasets with non-empty rugs", () => {
    const uniform = getUniformVariants();
    const ats = getAtsVariants();
    expect(uniform).toHaveLength(BASE_DATASETS.length);
    expect(ats).toHaveLength(BASE_DATASETS.length);
    for (let i = 0; i < BASE_DATASETS.length; i++) {
      const base = BASE_DATASETS[i]!;
      const layoutU = buildStimulusLayout(uniform[i]!);
      const layoutA = buildStimulusLayout(ats[i]!);
      expect(layoutU.rug.length).toBe(base.events.length);
      expect(layoutA.rug.length).toBe(base.events.length);
    }
  });
});
