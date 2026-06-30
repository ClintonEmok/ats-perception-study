import { describe, expect, it } from "vitest";
import {
  ATS_DATASET_IDS,
  BASE_DATASETS,
  UNIFORM_DATASET_IDS,
  getAtsVariants,
  getBaseDataset,
  getUniformVariants,
  getVariantByDatasetId,
} from "./datasets";

describe("BASE_DATASETS", () => {
  it("has at least 6 unique base datasets", () => {
    expect(BASE_DATASETS.length).toBeGreaterThanOrEqual(6);
    const ids = new Set(BASE_DATASETS.map((d) => d.id));
    expect(ids.size).toBe(BASE_DATASETS.length);
  });

  it("contains events sorted ascending within each dataset", () => {
    for (const d of BASE_DATASETS) {
      for (let i = 1; i < d.events.length; i += 1) {
        expect(d.events[i]!).toBeGreaterThanOrEqual(d.events[i - 1]!);
      }
    }
  });
});

describe("variant exports", () => {
  it("exposes 6+ uniform and 6+ ats variant ids", () => {
    expect(UNIFORM_DATASET_IDS.length).toBeGreaterThanOrEqual(6);
    expect(ATS_DATASET_IDS.length).toBeGreaterThanOrEqual(6);
  });

  it("produces matched uniform and ats pairs by base dataset", () => {
    const uniform = getUniformVariants();
    const ats = getAtsVariants();
    expect(uniform.length).toBe(ats.length);
    for (let i = 0; i < uniform.length; i += 1) {
      expect(uniform[i]!.baseDatasetId).toBe(ats[i]!.baseDatasetId);
      expect(uniform[i]!.condition).toBe("uniform");
      expect(ats[i]!.condition).toBe("ats");
    }
  });
});

describe("getVariantByDatasetId", () => {
  it("round-trips a uniform dataset id", () => {
    const uniform = getUniformVariants()[0]!;
    const resolved = getVariantByDatasetId(uniform.datasetId);
    expect(resolved.condition).toBe("uniform");
    expect(resolved.baseDatasetId).toBe(uniform.baseDatasetId);
  });

  it("rejects malformed dataset ids", () => {
    expect(() => getVariantByDatasetId("no-suffix")).toThrow();
    expect(() => getVariantByDatasetId("ds-01--bogus")).toThrow();
  });
});

describe("getBaseDataset", () => {
  it("returns the dataset when present", () => {
    const d = getBaseDataset(BASE_DATASETS[0]!.id);
    expect(d.id).toBe(BASE_DATASETS[0]!.id);
  });

  it("throws on unknown id", () => {
    expect(() => getBaseDataset("nope")).toThrow();
  });
});
