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
      className="pointer-events-auto w-full min-w-0 rounded-2xl border border-border bg-white px-4 py-3 text-xs text-muted-foreground shadow-sm sm:w-[18rem] sm:max-w-[20rem]"
      aria-label="STKDE intensity legend"
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] text-left text-xs font-semibold text-foreground outline-none transition hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="uppercase tracking-[0.2em]">STKDE INTENSITY</span>
        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      <div className="mt-3 h-3 overflow-hidden rounded-full border border-border bg-muted" style={{ background: getStkdePaletteGradient(mode) }} />

      {isExpanded ? (
        <div className="mt-2 space-y-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
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
