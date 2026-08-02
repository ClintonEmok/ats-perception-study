'use client';

import { getStkdeSignedDifferencePaletteGradient, STKDE_SIGNED_DIFFERENCE_LABELS } from '../lib/palette';

export function StkdeSignedDifferenceLegend() {
  return (
    <aside
      className="pointer-events-auto w-full max-w-[22rem] rounded-[var(--radius)] border border-border bg-card/95 px-2.5 py-2 text-[10px] text-muted-foreground shadow-sm backdrop-blur-md"
      aria-label="Signed KDE difference legend"
      data-signed-difference-legend
    >
      <div className="font-semibold uppercase tracking-[0.2em] text-foreground">KDE(A) − KDE(B)</div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-border" style={{ background: getStkdeSignedDifferencePaletteGradient() }} />
      <div className="mt-1.5 grid grid-cols-3 gap-1 text-[9px] uppercase tracking-[0.12em]">
        <span className="text-left text-blue-700">B higher</span>
        <span className="text-center text-foreground">0 / no difference</span>
        <span className="text-right text-red-800">A higher</span>
      </div>
      <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
        {STKDE_SIGNED_DIFFERENCE_LABELS.red} · {STKDE_SIGNED_DIFFERENCE_LABELS.neutralColor} · {STKDE_SIGNED_DIFFERENCE_LABELS.blue}
      </p>
    </aside>
  );
}
