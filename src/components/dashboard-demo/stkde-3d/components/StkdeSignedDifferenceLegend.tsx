'use client';

import { getStkdeSignedDifferencePaletteGradient } from '../lib/palette';

export function StkdeSignedDifferenceLegend() {
  return (
    <aside
      className="pointer-events-auto w-full min-w-0 rounded-2xl border border-border bg-white px-4 py-3 text-xs text-muted-foreground shadow-sm sm:w-[18rem] sm:max-w-[18rem] sm:ml-auto"
      aria-label="Signed KDE difference legend: blue is lower in A, neutral is no change, red is higher in A, gray is no activity"
      data-signed-difference-legend
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">KDE(A) − KDE(B)</div>
      <div className="mt-3 h-3 overflow-hidden rounded-full border border-border" style={{ background: getStkdeSignedDifferencePaletteGradient() }} />
      <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] font-semibold uppercase tracking-[0.12em]">
        <span className="text-left text-blue-700" aria-label="Lower in A">LOWER IN A</span>
        <span className="text-center text-foreground" aria-label="No change in active intensity">NO CHANGE</span>
        <span className="text-right text-red-800" aria-label="Higher in A">HIGHER IN A</span>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span className="size-2 rounded-full border border-slate-400/60 bg-slate-400/50" aria-hidden="true" />
        <span>NO ACTIVITY IN EITHER INTERVAL</span>
      </div>
    </aside>
  );
}
