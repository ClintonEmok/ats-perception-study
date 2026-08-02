'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { getStkdePaletteGradient } from '../lib/palette';

export function StkdeIntensityLegend({
  mode = 'field',
  domain,
}: {
  mode?: 'field' | 'legacy';
  domain?: [number, number];
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <aside
      className="pointer-events-auto w-full min-w-0 rounded-2xl border border-border bg-white px-5 py-4 text-xs text-muted-foreground shadow-sm sm:w-[20rem] sm:max-w-[24rem]"
      aria-label="STKDE intensity legend"
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] text-left text-sm font-semibold text-foreground outline-none transition hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="uppercase tracking-[0.2em]">STKDE INTENSITY</span>
        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      <div className="mt-4 h-4 overflow-hidden rounded-full border border-border bg-muted" style={{ background: getStkdePaletteGradient(mode) }} />

      {isExpanded ? (
        <div className="mt-3 space-y-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>sparse</span>
            <span>hot</span>
          </div>
          {domain ? (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono normal-case tracking-normal tabular-nums">
              <span>{domain[0].toPrecision(3)}</span>
              <span>{domain[1].toPrecision(3)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
