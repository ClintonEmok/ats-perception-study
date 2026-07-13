import { Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MapVisualization from '@/components/map/MapVisualization';
import CubeVisualization from '@/components/viz/CubeVisualization';
import { TimelinePanel } from '@/components/timeline/TimelinePanel';
import { StudyControls } from '@/components/study/StudyControls';
import { ContextualSlicePanel } from '@/components/viz/ContextualSlicePanel';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardThemeSync } from '@/components/dashboard/DashboardThemeSync';

export default function DashboardPage() {
  return (
    <main
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
      aria-label="Phase 1 overview and pattern summaries dashboard"
      data-phase="overview-pattern-summaries"
    >
      <DashboardThemeSync />
      <Suspense fallback={null}>
        <DashboardHeader />
      </Suspense>
      <div className="flex-1">
        <DashboardLayout
          leftPanel={<MapVisualization />}
          topRightPanel={<CubeVisualization />}
          bottomRightPanel={<TimelinePanel />}
        />
      </div>
      <StudyControls />
      <ContextualSlicePanel />
    </main>
  );
}
