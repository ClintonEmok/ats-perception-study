"use client";

import { ReactNode, useSyncExternalStore } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { useLayoutStore } from "@/store/useLayoutStore";

interface DashboardLayoutProps {
  leftPanel: ReactNode;
  topRightPanel: ReactNode;
  bottomRightPanel: ReactNode;
  className?: string;
}

export default function DashboardLayout({
  leftPanel,
  topRightPanel,
  bottomRightPanel,
  className = "",
}: DashboardLayoutProps) {
  const { outerLayout, innerLayout, setOuterLayout, setInnerLayout } = useLayoutStore();
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!isMounted) {
    return null; // Avoid hydration mismatch and ensure store is ready
  }

  return (
    <div
      className={`h-full w-full overflow-hidden bg-background text-foreground ${className}`}
      aria-label="Phase 1 overview-first map, cube, and timeline shell"
      data-phase="overview-pattern-summaries"
    >
      {/* Outer Group: Vertical split between the main overview rail and timeline control rail */}
      <Group orientation="vertical" onLayoutChange={setOuterLayout} id="outer-group">
        {/* Top area: map foreground with cube as supporting context */}
        <Panel id="top" defaultSize={outerLayout.top} minSize={30}>
          <Group orientation="horizontal" onLayoutChange={setInnerLayout} id="inner-group">
            {/* Left panel: primary overview surface */}
            <Panel id="top-left" defaultSize={innerLayout.left} minSize={20}>
              <div id="tour-map-panel" className="h-full w-full relative overflow-hidden">
                {leftPanel}
              </div>
            </Panel>

            <Separator className="w-1 bg-border hover:bg-primary/50 transition-colors flex items-center justify-center z-50 focus:outline-none cursor-col-resize" />

            {/* Right panel: secondary 3D context */}
            <Panel id="top-right" defaultSize={innerLayout.right} minSize={20}>
              <div id="tour-cube-panel" className="h-full w-full relative overflow-hidden">
                {topRightPanel}
              </div>
            </Panel>
          </Group>
        </Panel>

        <Separator className="h-1 bg-border hover:bg-primary/50 transition-colors flex items-center justify-center z-50 focus:outline-none cursor-row-resize" />

        {/* Bottom panel: lower timeline control rail */}
        <Panel id="bottom" defaultSize={outerLayout.bottom} minSize={10}>
          <div id="tour-timeline-panel" className="h-full w-full relative overflow-hidden">
            {bottomRightPanel}
          </div>
        </Panel>
      </Group>
    </div>
  );
}
