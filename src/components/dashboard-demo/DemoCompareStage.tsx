'use client';

import { useState } from 'react';
import { ComparisonKdeHeatmap } from '@/components/dashboard-demo/ComparisonKdeHeatmap';
import { useDemoCompareData } from './lib/useDemoCompareData';

export function DemoCompareStage() {
  const [showDifference, setShowDifference] = useState(false);
  const {
    leftSlice,
    rightSlice,
    leftKde,
    rightKde,
    signedDifference,
    leftIsLoading,
    rightIsLoading,
    responseError,
  } = useDemoCompareData();

  return (
    <div className="relative flex h-full w-full flex-col gap-3 bg-background p-6">
      {responseError ? <div className="rounded-lg border border-red-400/30 bg-red-50 px-3 py-2 text-[11px] text-red-950" role="alert">{responseError}</div> : null}
      <div className="flex items-center justify-start border-b border-border/70 pb-3">
        <button
          type="button"
          aria-pressed={showDifference}
          onClick={() => setShowDifference((value) => !value)}
          className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${showDifference ? 'border-violet-400/75 bg-violet-500/10 text-violet-700' : 'border-border bg-card text-muted-foreground hover:border-violet-400/60 hover:text-foreground'}`}
        >
          {showDifference ? 'Hide A − B difference' : 'Show A − B difference'}
        </button>
      </div>
      <div className={`grid min-h-0 flex-1 grid-cols-1 gap-6 ${showDifference ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
        <div className="flex min-w-0 flex-col items-center justify-center">
          <ComparisonKdeHeatmap
            cells={leftKde}
            label={leftSlice ? `${leftSlice.label} (A)` : 'Left KDE (A)'}
            crimeCount={leftSlice?.crimeCount ?? 0}
            colorScheme="intensity"
            borderTone="a"
            isLoading={leftIsLoading}
            size={showDifference ? 360 : 520}
          />
        </div>
        {showDifference ? (
          <div className="flex min-w-0 flex-col items-center justify-center">
            <ComparisonKdeHeatmap
              cells={signedDifference}
              label="Signed difference · A − B"
              colorScheme="difference"
              borderTone="difference"
              isLoading={leftIsLoading || rightIsLoading}
              size={360}
            />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col items-center justify-center">
          <ComparisonKdeHeatmap
            cells={rightKde}
            label={rightSlice ? `${rightSlice.label} (B)` : 'Right KDE (B)'}
            crimeCount={rightSlice?.crimeCount ?? 0}
            colorScheme="intensity"
            borderTone="b"
            isLoading={rightIsLoading}
            size={showDifference ? 360 : 520}
          />
        </div>
      </div>
    </div>
  );
}
