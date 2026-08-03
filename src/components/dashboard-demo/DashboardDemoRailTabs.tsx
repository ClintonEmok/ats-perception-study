"use client";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Focus,
  GitCompareArrows,
  Layers,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { DemoDetectPanel } from '@/components/dashboard-demo/DemoDetectPanel';
import { DemoSlicePanel } from '@/components/dashboard-demo/DemoSlicePanel';
import { DemoInspectPanel } from '@/components/dashboard-demo/DemoInspectPanel';
import { DemoComparePanel } from '@/components/dashboard-demo/DemoComparePanel';
import { StkdeAnalysisPanel } from '@/components/dashboard-demo/StkdeAnalysisPanel';
import { GlobalWarpControls } from '@/components/dashboard-demo/GlobalWarpControls';
import { useDashboardDemoCoordinationStore } from '@/store/useDashboardDemoCoordinationStore';
import { useIsEvaluationLocked } from '@/store/useEvaluationStudyStore';

type TabSpec = {
  value: 'scan' | 'detect' | 'slices' | 'inspect' | 'compare';
  label: string;
  icon: typeof BarChart3;
};

const TAB_SPECS: TabSpec[] = [
  { value: 'scan', label: 'STKDE', icon: BarChart3 },
  { value: 'inspect', label: 'Inspect 3D', icon: Focus },
  { value: 'detect', label: 'Detect', icon: Sparkles },
  { value: 'slices', label: 'Slices', icon: Layers },
  { value: 'compare', label: 'Compare', icon: GitCompareArrows },
];

export interface DashboardDemoRailTabsProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function DashboardDemoRailTabs({ collapsed, onToggleCollapse }: DashboardDemoRailTabsProps) {
  const tab = useDashboardDemoCoordinationStore((state) => state.activeRailTab);
  const setActiveRailTab = useDashboardDemoCoordinationStore((state) => state.setActiveRailTab);
  const isEvaluationLocked = useIsEvaluationLocked();

  if (collapsed) {
    return <CollapsedRail tab={tab} setTab={setActiveRailTab} onExpand={onToggleCollapse} />;
  }

  return (
    <ExpandedRail
      tab={tab}
      setTab={setActiveRailTab}
      onCollapse={onToggleCollapse}
      isEvaluationLocked={isEvaluationLocked}
    />
  );
}

function CollapsedRail({
  tab,
  setTab,
  onExpand,
}: {
  tab: string;
  setTab: (tab: string) => void;
  onExpand: () => void;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside
        aria-label="dashboard demo sidebar (collapsed)"
        className="fixed right-0 top-0 z-20 flex h-full w-12 flex-col items-center gap-1 border-l border-border bg-card/95 py-2 shadow-2xl backdrop-blur"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onExpand}
              aria-label="Expand sidebar"
              className="mb-2 rounded-md text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Expand sidebar</TooltipContent>
        </Tooltip>

        <div className="h-px w-6 bg-border" />

        {TAB_SPECS.map((spec) => {
          const Icon = spec.icon;
          const isActive = tab === spec.value;
          return (
            <Tooltip key={spec.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setTab(spec.value)}
                  aria-label={spec.label}
                  aria-pressed={isActive}
                  className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">{spec.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </aside>
    </TooltipProvider>
  );
}

function ExpandedRail({
  tab,
  setTab,
  onCollapse,
  isEvaluationLocked,
}: {
  tab: string;
  setTab: (tab: string) => void;
  onCollapse: () => void;
  isEvaluationLocked: boolean;
}) {
  return (
    <aside
      aria-label="dashboard demo sidebar"
      className="fixed right-0 top-0 z-20 h-full w-80 overflow-y-auto border-l border-border bg-card/95 shadow-2xl backdrop-blur"
    >
      {isEvaluationLocked ? (
        <div
          className="mx-2 mt-2 flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          role="note"
          aria-label="setup locked during evaluation"
        >
          <Lock className="size-3.5 text-muted-foreground" aria-hidden />
          Setup locked during evaluation.
        </div>
      ) : null}

      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-2">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onCollapse}
                aria-label="Collapse sidebar"
                className="rounded-md text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Collapse sidebar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="px-2 pt-2">
          <TabsList className="grid h-auto w-full grid-cols-5 rounded-md bg-muted p-0.5">
            {TAB_SPECS.map((spec) => {
              const Icon = spec.icon;
              return (
                <TooltipProvider key={spec.value} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value={spec.value}
                        aria-label={spec.label}
                        className="rounded-sm px-1 py-1.5"
                      >
                        <Icon className="size-3.5" />
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{spec.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="scan" className="mt-2 px-2">
          <StkdeAnalysisPanel />
        </TabsContent>

        <TabsContent value="inspect" className="mt-2 px-2">
          <GlobalWarpControls />
          <DemoInspectPanel />
        </TabsContent>

        <TabsContent value="detect" className="mt-2 px-2">
          <DemoDetectPanel />
        </TabsContent>

        <TabsContent value="slices" className="mt-2 px-2">
          <DemoSlicePanel />
        </TabsContent>

        <TabsContent value="compare" className="mt-2 px-2">
          <DemoComparePanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
