'use client';

import { ComparisonKdeHeatmap } from '@/components/dashboard-demo/ComparisonKdeHeatmap';
import { useDemoCompareData } from './lib/useDemoCompareData';

export function DemoCompareStage() {
  const {
    leftSlice,
    rightSlice,
    leftKde,
    rightKde,
    leftIsLoading,
    rightIsLoading,
    responseStatus,
    responseError,
    responseIsStale,
    signedDifferenceReason,
  } = useDemoCompareData();

  return (
    <div className="flex h-full w-full flex-col gap-3 bg-slate-950 p-6">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/30 bg-amber-50 px-3 py-2 text-[11px] text-amber-950" role="status" aria-label="Signed difference unavailable for sparse server surfaces">
        <span>{signedDifferenceReason}</span>
        <span className="shrink-0 uppercase tracking-[0.14em]">{responseIsStale ? 'stale response' : responseStatus}</span>
      </div>
      {responseError ? <div className="rounded-lg border border-red-400/30 bg-red-50 px-3 py-2 text-[11px] text-red-950" role="alert">{responseError}</div> : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex min-w-0 flex-col items-center justify-center">
        <ComparisonKdeHeatmap
          cells={leftKde}
          label={leftSlice ? `${leftSlice.label} (left)` : 'Left KDE'}
          crimeCount={leftSlice?.crimeCount ?? 0}
          colorScheme="blue"
          isLoading={leftIsLoading}
          status="server-normalized · sparse · A"
          size={420}
        />
      </div>
      <div className="flex min-w-0 flex-col items-center justify-center">
        <ComparisonKdeHeatmap
          cells={rightKde}
          label={rightSlice ? `${rightSlice.label} (right)` : 'Right KDE'}
          crimeCount={rightSlice?.crimeCount ?? 0}
          colorScheme="orange"
          isLoading={rightIsLoading}
          status="server-normalized · sparse · B"
          size={420}
        />
      </div>
      </div>
    </div>
  );
}
