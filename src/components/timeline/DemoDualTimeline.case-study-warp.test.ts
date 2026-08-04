import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('DemoDualTimeline case-study warp wiring', () => {
  it('prefers a scoped density warp map for the brushed detail range', () => {
    const source = readFileSync(new URL('./DemoDualTimeline.tsx', import.meta.url), 'utf8');

    expect(source).toMatch(/const scopedDensityWarpMap = useMemo/);
    expect(source).toMatch(/buildDensityWarpMap\(detailDensityMap, detailRangeSec\)/);
    expect(source).toMatch(/const authoredScopedWarpMap = useMemo/);
    expect(source).toMatch(/const effectiveWarpMap = usingDensitySource/);
    expect(source).toMatch(/\? \(scopedDensityWarpMap \?\? precomputedWarpMap\)/);
    expect(source).toMatch(/: \(authoredScopedWarpMap \?\? authoredWarpMap\)/);
    expect(source).toMatch(/const effectiveWarpDomain = usingDensitySource/);
  });

  it('does not auto-overwrite the user-selected warp source', () => {
    const source = readFileSync(new URL('./DemoDualTimeline.tsx', import.meta.url), 'utf8');

    expect(source).not.toMatch(/const nextWarpSource =/);
    expect(source).not.toMatch(/setWarpSource\(/);
  });
});
