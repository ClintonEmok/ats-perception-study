import { describe, expect, it } from "vitest";
import { FORBIDDEN_MODULES, FORBIDDEN_PATH_PATTERNS, scanImportsForViolations } from "./import-guard";

describe("import-guard", () => {
  it("flags forbidden npm modules", () => {
    const violations = scanImportsForViolations(
      "src/lib/ats-study/foo.ts",
      `import duckdb from "duckdb";\nimport maplibre from "maplibre-gl";\n`,
    );
    expect(violations).toHaveLength(2);
    expect(violations[0]!.rule).toBe("forbidden-module:duckdb");
    expect(violations[1]!.rule).toBe("forbidden-module:maplibre-gl");
  });

  it("flags forbidden internal paths", () => {
    const violations = scanImportsForViolations(
      "src/components/study/bar.tsx",
      `import { foo } from "@/app/dashboard-demo/Page";\nimport { bar } from "@/lib/study/protocol";\nimport { ok } from "@/lib/ats-study/protocol";\n`,
    );
    expect(violations).toHaveLength(2);
    expect(violations[0]!.rule).toBe("forbidden-path:@/app/dashboard-demo/Page");
    expect(violations[1]!.rule).toBe("forbidden-path:@/lib/study/protocol");
  });

  it("does not flag study-safe modules", () => {
    const violations = scanImportsForViolations(
      "src/lib/ats-study/safe.ts",
      `import { z } from "zod";\nimport { create } from "zustand";\n`,
    );
    expect(violations).toEqual([]);
  });

  it("FORBIDDEN_PATH_PATTERNS includes all the major prototype paths", () => {
    const flattened = FORBIDDEN_PATH_PATTERNS.map((re) => re.source).join("\n");
    expect(flattened).toContain("dashboard-demo");
    expect(flattened).toContain("stkde");
    expect(flattened).toContain("timeline-test");
    expect(flattened).toContain("timeslicing");
  });

  it("FORBIDDEN_MODULES includes duckdb, three, maplibre-gl", () => {
    expect(FORBIDDEN_MODULES).toContain("duckdb");
    expect(FORBIDDEN_MODULES).toContain("three");
    expect(FORBIDDEN_MODULES).toContain("maplibre-gl");
  });
});
