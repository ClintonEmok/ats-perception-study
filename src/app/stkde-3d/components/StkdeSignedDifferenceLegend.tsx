'use client';

import { getStkdeSignedDifferencePaletteGradient } from '../lib/palette';

export function StkdeSignedDifferenceLegend() {
  return (
    <aside
      className="pointer-events-auto w-full min-w-0 rounded-2xl border border-border bg-white px-4 py-3 text-xs text-muted-foreground shadow-sm sm:max-w-none"
      aria-label="Signed KDE difference legend"
      data-signed-difference-legend
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">KDE(A) − KDE(B)</div>
      <div className="mt-3 h-3 overflow-hidden rounded-full border border-border" style={{ background: getStkdeSignedDifferencePaletteGradient() }} />
      <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] font-semibold uppercase tracking-[0.12em]">
        <span className="text-left text-blue-700" aria-label="B higher">B HIGHER</span>
        <span className="text-center text-foreground" aria-label="0 / no difference">0 / NO DIFFERENCE</span>
        <span className="text-right text-red-800" aria-label="A higher">A HIGHER</span>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
        Blue means B higher · neutral means no difference · red means A higher.
      </p>
    </aside>
  );
}
