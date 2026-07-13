"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, PanelRightOpen } from 'lucide-react';
import { AdaptiveControls } from '@/components/timeline/AdaptiveControls';
import { DemoPresetSelect } from '@/components/demo/DemoPresetSelect';
import { FloatingToolbar } from '@/components/viz/FloatingToolbar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useDraggable } from '@/hooks/useDraggable';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useViewportCrimeData } from '@/hooks/useViewportCrimeData';

export function TopBar() {
  const [adaptiveDocked, setAdaptiveDocked] = useState(true);
  const [toolbarDocked, setToolbarDocked] = useState(true);
  const [adaptiveOpen, setAdaptiveOpen] = useState(false);
  const setDetailsOpen = useCoordinationStore((state) => state.setDetailsOpen);
  const { columns, data, generateMockData, isMock, dataCount } = useTimelineDataStore();
  const activeFilterCount = useFilterStore((state) => state.getActiveFilterCount());
  const resetFilters = useFilterStore((state) => state.resetFilters);
  
  // Get currently loaded viewport data count
  const { data: viewportData, meta: viewportMeta } = useViewportCrimeData({ bufferDays: 30 });
  const viewportLoadedCount = viewportData?.length ?? null;
  const totalMatches = viewportMeta?.totalMatches ?? null;
  const isSampled = Boolean(viewportMeta?.sampled);
  
  // console.log('[TopBar] viewportData:', viewportData, 'viewportLoadedCount:', viewportLoadedCount);

  // Format count for display
  const formatCount = (count: number | null) => {
    if (count === null) return '...';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const { position, dragRef, handleMouseDown, isDragging } = useDraggable({
    storageKey: 'adaptive-controls-floating',
    initialPosition: { x: 24, y: 72 }
  });

  return (
    <div className="flex w-full flex-col">
      {/* Demo data warning banner */}
      {isMock && (
        <div className="flex w-full items-center justify-center border-b border-amber-200 bg-amber-50 px-4 py-1 text-xs text-amber-900">
          <span>⚠️ Using demo data</span>
          <span className="mx-2">|</span>
          <span>Real dataset unavailable</span>
          {dataCount !== undefined && (
            <span className="ml-2 text-amber-700">
              ({formatCount(dataCount)} records)
            </span>
          )}
        </div>
      )}
      <div className="flex h-14 w-full items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        {toolbarDocked ? (
          <FloatingToolbar variant="docked" onDetach={() => setToolbarDocked(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setToolbarDocked(true)}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Dock toolbar
          </button>
        )}
        {dataCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {formatCount(dataCount)} total
          </span>
        )}
        {viewportLoadedCount !== null && (
          <span className={`text-xs ${isSampled ? 'text-amber-700' : 'text-emerald-700'}`}>
            {formatCount(viewportLoadedCount)} loaded
          </span>
        )}
        {isSampled && totalMatches !== null && totalMatches > (viewportLoadedCount ?? 0) && (
          <span className="text-xs text-amber-700">
            sampled from {formatCount(totalMatches)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
            <span>Filters: {activeFilterCount}</span>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
        {!columns && (
          <button
            type="button"
            onClick={() => generateMockData(data.length > 0 ? data.length : 2000)}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            title="Regenerate mock data"
          >
            Regen mock
          </button>
        )}
        <DemoPresetSelect />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Popover open={adaptiveOpen} onOpenChange={setAdaptiveOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Adaptive Controls
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[260px]">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold">Adaptive Controls</span>
              <button
                type="button"
                onClick={() => {
                  setAdaptiveDocked(false);
                  setAdaptiveOpen(false);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                title="Detach"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
            <AdaptiveControls />
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="rounded-full border border-border bg-background p-2 text-muted-foreground hover:bg-muted"
          title="Open details"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </div>

      {!adaptiveDocked && (
        <div
          ref={dragRef}
          onMouseDown={handleMouseDown}
          className="fixed z-30 w-[260px] rounded-md border bg-background/95 shadow-sm"
          style={{ left: position.x, top: position.y }}
        >
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <GripVertical className={`h-3.5 w-3.5 ${isDragging ? 'opacity-80' : 'opacity-50'}`} />
              <span>Adaptive Controls</span>
            </div>
            <button
              type="button"
              onClick={() => setAdaptiveDocked(true)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              title="Dock"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-3">
            <AdaptiveControls />
          </div>
        </div>
      )}

      {!toolbarDocked && (
        <FloatingToolbar variant="floating" onDock={() => setToolbarDocked(true)} />
      )}
      </div>
    </div>
  );
}
