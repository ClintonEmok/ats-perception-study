'use client';

import { getStkdePaletteGradient } from '../lib/palette';

export function StkdeIntensityLegend({ mode = 'field' }: { mode?: 'field' | 'legacy' }) {
  return (
    <aside className="pointer-events-none max-w-[18rem] rounded-2xl border border-slate-700/70 bg-slate-950/78 px-3 py-2.5 text-[10px] text-slate-300 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.9)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold uppercase tracking-[0.2em] text-slate-200">STKDE intensity</div>
          <p className="mt-1 max-w-[24ch] leading-4 text-slate-400">
            Brighter colors mean denser space-time concentration after smoothing.
          </p>
        </div>
        <div className="shrink-0 rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-slate-400">
          normalized
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full border border-slate-700/80 bg-slate-900" style={{ background: getStkdePaletteGradient(mode) }} />

      <div className="mt-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-slate-500">
        <span>sparse</span>
        <span>hot</span>
      </div>

      <p className="mt-2 leading-4 text-slate-400">
        The cube shows when crimes cluster in both space and time, not just raw counts. Taller stacked slices indicate longer active windows.
      </p>
    </aside>
  );
}
