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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside className="pointer-events-auto w-[15rem] rounded-[var(--radius)] border border-border bg-card/95 px-2.5 py-2 text-[10px] text-muted-foreground shadow-sm backdrop-blur-md">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] text-left text-foreground outline-none transition hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-semibold uppercase tracking-[0.2em]">STKDE intensity</span>
        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-border bg-muted" style={{ background: getStkdePaletteGradient(mode) }} />

      {isExpanded ? (
        <div className="mt-1.5 space-y-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>sparse</span>
            <span>hot</span>
          </div>
          {domain ? (
            <div className="flex items-center justify-between font-mono normal-case tracking-normal tabular-nums">
              <span>{domain[0].toPrecision(3)}</span>
              <span>{domain[1].toPrecision(3)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
