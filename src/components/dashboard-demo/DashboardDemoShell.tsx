"use client";

import { useEffect, useState, useRef } from 'react';
import { Map, Box, Flame, Layers3, MapPin, GitCompareArrows } from 'lucide-react';
import { DemoTimelinePanel } from '@/components/dashboard-demo/DemoTimelinePanel';
import { DashboardDemoRailTabs } from '@/components/dashboard-demo/DashboardDemoRailTabs';
import { DemoCompareStage } from '@/components/dashboard-demo/DemoCompareStage';
import { Button } from '@/components/ui/button';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { DemoMapVisualization } from '@/components/dashboard-demo/DemoMapVisualization';
import { Demo3dSpatialView } from '@/components/dashboard-demo/Demo3dSpatialView';
import { DashboardDemo3dProvider } from '@/components/dashboard-demo/DashboardDemo3dProvider';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useDashboardDemoTimeslicingModeStore } from '@/store/useDashboardDemoTimeslicingModeStore';
import { useDashboardDemoMapLayerStore } from '@/store/useDashboardDemoMapLayerStore';
import { useSliceDomainStore } from '@/store/useSliceDomainStore';
import { DemoPresetSelect } from '@/components/dashboard-demo/DemoPresetSelect';

type DemoViewport = 'map' | '3d' | 'compare';

export function DashboardDemoShell() {
  const [activeViewport, setActiveViewport] = useState<DemoViewport>('map');
  const [showStkde, setShowStkde] = useState(true);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const loadSummaryData = useTimelineDataStore((state) => state.loadSummaryData);
  const minTimestampSec = useTimelineDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useTimelineDataStore((state) => state.maxTimestampSec);
  const setViewport = useViewportStore((state) => state.setViewport);
  const setActiveRailTab = useDashboardDemoCoordinationStore((state) => state.setActiveRailTab);
  const lastAppliedAt = useDashboardDemoTimeslicingModeStore((state) => state.lastAppliedAt);
  const poiVisible = useDashboardDemoMapLayerStore((state) => state.visibility.poi);
  const heatmapVisible = useDashboardDemoMapLayerStore((state) => state.visibility.heatmap);
  const toggleLayer = useDashboardDemoMapLayerStore((state) => state.toggleVisibility);

  useEffect(() => {
    void (async () => {
      await loadSummaryData();
    })();
  }, [loadSummaryData]);

  useEffect(() => {
    if (minTimestampSec === null || maxTimestampSec === null) return;
    if (maxTimestampSec <= minTimestampSec) return;
    setViewport(minTimestampSec, maxTimestampSec);
  }, [maxTimestampSec, minTimestampSec, setViewport]);

  const appliedSliceCount = useSliceDomainStore(
    (s) => s.slices.filter((sl) => sl.source === 'generated-applied' && sl.type === 'range').length,
  );
  const autoSwitchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (appliedSliceCount === 0) {
      autoSwitchKeyRef.current = null;
      return;
    }

    const nextKey = lastAppliedAt === null
      ? `hydrated:${appliedSliceCount}`
      : `applied:${lastAppliedAt}`;

    if (autoSwitchKeyRef.current === nextKey) {
      return;
    }

    if (lastAppliedAt !== null || autoSwitchKeyRef.current === null) {
      setActiveViewport('3d');
      setActiveRailTab('inspect');
    }
    autoSwitchKeyRef.current = nextKey;
  }, [appliedSliceCount, lastAppliedAt, setActiveRailTab]);

  return (
    <DashboardDemo3dProvider>
      <main
        className="relative h-screen w-screen overflow-hidden bg-background text-foreground"
        aria-label="dashboard demo workspace"
      >
        <div className={`flex h-full min-w-0 flex-col transition-[padding] duration-200 ${railCollapsed ? 'pr-12' : 'pr-80'}`}>
         <section className="relative min-h-0 flex-1 overflow-hidden bg-background" aria-label="dashboard demo shared viewport">
           <div className="absolute left-4 top-4 z-40">
             <DemoPresetSelect onCaseStudyApplied={() => {
               setActiveViewport('3d');
               setActiveRailTab('inspect');
             }} />
           </div>
           <div className="absolute right-4 top-4 z-40 flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1 shadow-sm backdrop-blur">
            <Button
              type="button"
              onClick={() => setActiveViewport('map')}
              aria-label="Show map viewport"
              title="Map"
              variant={activeViewport === 'map' ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="rounded-full"
            >
              <Map className="size-3.5" />
            </Button>
            <Button
              type="button"
              onClick={() => setActiveViewport('3d')}
              aria-label="Show 3D viewport"
              title="3D"
              variant={activeViewport === '3d' ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="rounded-full"
            >
              <Box className="size-3.5" />
            </Button>
            <Button
              type="button"
              onClick={() => setActiveViewport('compare')}
              aria-label="Show compare view"
              title="Compare slices"
              variant={activeViewport === 'compare' ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="rounded-full"
            >
              <GitCompareArrows className="size-3.5" />
            </Button>
            {activeViewport === 'map' ? (
              <>
                <div className="mx-1 h-5 w-px bg-border/70" aria-hidden="true" />
                <Button
                  type="button"
                  onClick={() => toggleLayer('poi')}
                  aria-label={poiVisible ? 'Hide POIs' : 'Show POIs'}
                  title={poiVisible ? 'Hide POIs' : 'Show POIs'}
                  variant={poiVisible ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="rounded-full"
                >
                  <MapPin className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowStkde((current) => !current)}
                  aria-label={showStkde ? 'Hide STKDE hotspots' : 'Show STKDE hotspots'}
                  title={showStkde ? 'Hide STKDE hotspots' : 'Show STKDE hotspots'}
                  variant={showStkde ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="rounded-full"
                >
                  <Flame className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  onClick={() => toggleLayer('heatmap')}
                  aria-label={heatmapVisible ? 'Hide heatmap' : 'Show heatmap'}
                  title={heatmapVisible ? 'Hide heatmap' : 'Show heatmap'}
                  variant={heatmapVisible ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  className="rounded-full"
                >
                  <Layers3 className="size-3.5" />
                </Button>
              </>
            ) : null}
          </div>

          <div className="h-full w-full transition-opacity duration-200 ease-out">
            {activeViewport === 'map' ? (
              <DemoMapVisualization stkdeVisible={showStkde} />
            ) : activeViewport === '3d' ? (
              <Demo3dSpatialView />
            ) : (
              <DemoCompareStage />
            )}
          </div>
        </section>

        <div className="shrink-0 border-t border-border bg-card/65">
          <DemoTimelinePanel />
        </div>
        </div>

        <DashboardDemoRailTabs
          collapsed={railCollapsed}
          onToggleCollapse={() => setRailCollapsed((value) => !value)}
        />
      </main>
    </DashboardDemo3dProvider>
  );
}
