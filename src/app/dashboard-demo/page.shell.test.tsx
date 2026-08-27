import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/dashboard-demo shell', () => {
  test('renders the demo shell through DashboardDemoShell', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    const shellSource = readFileSync(new URL('../../components/dashboard-demo/DashboardDemoShell.tsx', import.meta.url), 'utf8');
    const railTabsSource = readFileSync(new URL('../../components/dashboard-demo/DashboardDemoRailTabs.tsx', import.meta.url), 'utf8');
    const demoStatsSource = readFileSync(new URL('../../components/dashboard-demo/DemoStatsPanel.tsx', import.meta.url), 'utf8');
    const demoDetectPanelSource = readFileSync(new URL('../../components/dashboard-demo/DemoDetectPanel.tsx', import.meta.url), 'utf8');
    const demoAnalysisStoreSource = readFileSync(new URL('../../store/useDashboardDemoCoordinationStore.ts', import.meta.url), 'utf8');
    const demoNeighborhoodStatsSource = readFileSync(
      new URL('../../components/dashboard-demo/lib/useDemoNeighborhoodStats.ts', import.meta.url),
      'utf8'
    );
    const demoStkdeHookSource = readFileSync(new URL('../../components/dashboard-demo/lib/useDemoStkde.ts', import.meta.url), 'utf8');
    const demo3dProviderSource = readFileSync(new URL('../../components/dashboard-demo/DashboardDemo3dProvider.tsx', import.meta.url), 'utf8');
    const demoTimelinePanelSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoTimelinePanel.tsx', import.meta.url),
      'utf8'
    );
    const demoDualTimelineSurfaceSource = readFileSync(
      new URL('../../components/timeline/DualTimelineSurface.tsx', import.meta.url),
      'utf8'
    );
    const globalWarpControlsSource = readFileSync(
      new URL('../../components/dashboard-demo/GlobalWarpControls.tsx', import.meta.url),
      'utf8'
    );
    const demoMapVisualizationSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoMapVisualization.tsx', import.meta.url),
      'utf8'
    );
    const demoStatsMapOverlaySource = readFileSync(
      new URL('../../components/dashboard-demo/DemoStatsMapOverlay.tsx', import.meta.url),
      'utf8'
    );
    const demoInspectPanelSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoInspectPanel.tsx', import.meta.url),
      'utf8'
    );
    const demoStkdePanelSource = readFileSync(
      new URL('../../components/dashboard-demo/StkdeAnalysisPanel.tsx', import.meta.url),
      'utf8'
    );
    const demoSpatialSource = readFileSync(
      new URL('../../components/dashboard-demo/Demo3dSpatialView.tsx', import.meta.url),
      'utf8'
    );
    const intensityLegendSource = readFileSync(
      new URL('../stkde-3d/components/StkdeIntensityLegend.tsx', import.meta.url),
      'utf8'
    );
    const demoCompareHookSource = readFileSync(
      new URL('../../components/dashboard-demo/lib/useDemoCompareData.ts', import.meta.url),
      'utf8'
    );
    const demoCompareStageSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoCompareStage.tsx', import.meta.url),
      'utf8'
    );
    const demoSlicePanelSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoSlicePanel.tsx', import.meta.url),
      'utf8'
    );
    const demoBurstGenerationSource = readFileSync(
      new URL('../../components/dashboard-demo/lib/demo-burst-generation.ts', import.meta.url),
      'utf8'
    );
    const demoBurstWindowsSource = readFileSync(
      new URL('../../components/dashboard-demo/lib/useDemoBurstWindows.ts', import.meta.url),
      'utf8'
    );
    const demoWarpMapSource = readFileSync(
      new URL('../../components/dashboard-demo/lib/demo-warp-map.ts', import.meta.url),
      'utf8'
    );
    const demoTimelineSummarySource = readFileSync(
      new URL('../../components/timeline/hooks/useDemoTimelineSummary.ts', import.meta.url),
      'utf8'
    );
    const demoTimeslicingModeStoreSource = readFileSync(
      new URL('../../store/useDashboardDemoTimeslicingModeStore.ts', import.meta.url),
      'utf8'
    );
    const mapVisualizationSource = readFileSync(new URL('../../components/map/MapVisualization.tsx', import.meta.url), 'utf8');
    const demoDualTimelineSource = readFileSync(
      new URL('../../components/timeline/DemoDualTimeline.tsx', import.meta.url),
      'utf8'
    );
    const demoPresetSelectSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoPresetSelect.tsx', import.meta.url),
      'utf8'
    );
    expect(pageSource).toMatch(/DashboardDemoShell/);
    expect(shellSource).not.toMatch(/WorkflowSkeleton/);
    expect(shellSource).not.toMatch(/Phase 13 guided analysis workflow/);
    expect(shellSource).not.toMatch(/Orient → Find → Compare → Inspect → Explain → Apply/);
    expect(shellSource).not.toMatch(/Shared dataset · one workflow · linked views/);
    expect(shellSource).toMatch(/DemoMapVisualization/);
    expect(shellSource).toMatch(/DemoTimelinePanel/);
    expect(shellSource).toMatch(/DashboardDemoRailTabs/);
    expect(shellSource).toMatch(/DemoCompareStage/);
    expect(shellSource).toMatch(/loadSummaryData/);
    expect(shellSource).toMatch(/useViewportStore/);
    expect(shellSource).toMatch(/setViewport/);
    expect(shellSource).toMatch(/z-40/);
    expect(shellSource).toMatch(/Show map viewport/);
    expect(shellSource).toMatch(/Show 3D viewport/);
    expect(shellSource).toMatch(/DashboardDemo3dProvider/);
    expect(shellSource).toMatch(/DemoPresetSelect/);
    expect(shellSource).toMatch(/setActiveViewport\('3d'\)/);
    expect(shellSource).toMatch(/setActiveRailTab\('inspect'\)/);
    expect(shellSource).not.toMatch(/DemoStkdeTrigger|useDemoStkde/);
    expect(demo3dProviderSource).toMatch(/useDemoStkde/);
    expect(demo3dProviderSource).toMatch(/DashboardDemo3dContext/);
    expect(demoMapVisualizationSource).toMatch(/DemoStatsMapOverlay/);
    expect(demoMapVisualizationSource).toMatch(/stkdeVisibleOverride/);
    expect(demoMapVisualizationSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoMapVisualizationSource).toMatch(/useDashboardDemoFilterStore/);
    expect(demoMapVisualizationSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoMapVisualizationSource).not.toMatch(/useDashboardDemoAdaptiveStore/);
    expect(demoMapVisualizationSource).toMatch(/useDashboardDemoMapLayerStore/);
    expect(shellSource).not.toMatch(/Map-first shared viewport|2D map|3D cube|generationStatus|lastGeneratedMetadata|\bTimelinePanel\b/);
    expect(railTabsSource).toMatch(/TabsTrigger/);
    expect(railTabsSource).toMatch(/TabsContent value="overview"/);
    expect(railTabsSource).toMatch(/TabsContent value="scan"/);
    expect(railTabsSource).toMatch(/TabsContent value="slices"/);
    expect(railTabsSource).toMatch(/StkdeAnalysisPanel/);
    expect(railTabsSource).toMatch(/DemoStatsPanel/);
    expect(railTabsSource).toMatch(/DemoDetectPanel[\s\S]*DemoSlicePanel/);
    expect(railTabsSource).not.toMatch(/TabsContent value="detect"/);
    expect(railTabsSource).not.toMatch(/HotspotEvolutionCard/);
    expect(railTabsSource).toMatch(/label: 'Overview'/);
    expect(railTabsSource).toMatch(/label: 'STKDE'/);
    expect(railTabsSource).toMatch(/label: 'Slices'/);
    expect(railTabsSource).toMatch(/label: 'Inspect 3D'/);
    expect(demoAnalysisStoreSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoAnalysisStoreSource).toMatch(/DemoRailTab = 'overview' \| 'scan' \| 'slices' \| 'inspect' \| 'compare'/);
    expect(demoAnalysisStoreSource).toMatch(/activeRailTab: 'overview'/);
    expect(demoAnalysisStoreSource).toMatch(/selectedDistricts/);
    expect(demoAnalysisStoreSource).toMatch(/stkdeParams/);
    expect(demoNeighborhoodStatsSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoNeighborhoodStatsSource).toMatch(/aggregateStats/);
    expect(demoNeighborhoodStatsSource).toMatch(/transformStatsSummary/);
    expect(demoStkdeHookSource).toMatch(/callerIntent: 'dashboard-demo'/);
    expect(demoStkdeHookSource).toMatch(/buildStkdeViewModel/);
    expect(demoStkdeHookSource).toMatch(/DEFAULT_STKDE_BBOX/);
    expect(demoStkdeHookSource).toMatch(/useSliceDomainStore/);
    expect(demoStkdeHookSource).not.toMatch(/\buseSliceStore\b/);
    expect(demoStatsSource).toMatch(/Focus range/);
    expect(demoStatsSource).toMatch(/selectedDistrictLabels/);
    expect(demoStatsSource).toMatch(/Start/);
    expect(demoStatsSource).toMatch(/End/);
    expect(demoStatsSource).toMatch(/TabsList/);
    expect(demoStatsSource).toMatch(/TabsTrigger value="hourly"/);
    expect(demoStatsSource).toMatch(/TabsTrigger value="daily"/);
    expect(demoStatsSource).toMatch(/TabsTrigger value="monthly"/);
    expect(demoStatsSource).toMatch(/TabsContent value="hourly"/);
    expect(demoStatsSource).toMatch(/TabsContent value="daily"/);
    expect(demoStatsSource).toMatch(/TabsContent value="monthly"/);
    expect(demoStatsSource).toMatch(/Hourly pulse/);
    expect(demoStatsSource).toMatch(/Daily trend/);
    expect(demoStatsSource).toMatch(/Monthly trend/);
    expect(demoStatsSource).toMatch(/PulseChart/);
    expect(demoStatsSource).toMatch(/Selected period/);
    expect(demoStatsSource).toMatch(/Crime flow/);
    expect(demoStatsSource).toMatch(/peak period/);
    expect(demoStatsSource).toMatch(/Top crimes/);
    expect(demoStatsSource).toMatch(/District context/);
    expect(demoStatsSource).toMatch(/Distribution/);
    expect(demoStatsSource).not.toMatch(/Top types\W/);
    expect(demoStatsSource).not.toMatch(/all districts/);
    expect(globalWarpControlsSource).toMatch(/Temporal resolution/);
    expect(globalWarpControlsSource).toMatch(/Time scale/);
    expect(globalWarpControlsSource).toMatch(/Warp factor/);
    expect(globalWarpControlsSource).toMatch(/Linear|Adaptive/);
    expect(globalWarpControlsSource).toMatch(/cubeScopeMode|setCubeScopeMode/);
    expect(globalWarpControlsSource).toMatch(/Overview mode|Detail mode/);
    expect(demoStatsMapOverlaySource).toMatch(/heatmap/);
    expect(demoStatsMapOverlaySource).toMatch(/demo-stats-districts/);
    expect(demoStatsMapOverlaySource).toMatch(/chicago-police-districts\.geojson/);
    expect(demoStatsMapOverlaySource).toMatch(/dist_num/);
    expect(demoStatsMapOverlaySource).toMatch(/dist_label/);
    expect(demoStatsMapOverlaySource).toMatch(/selectedDistricts/);
    expect(mapVisualizationSource).toMatch(/statsOverlay/);
    expect(demoInspectPanelSource).not.toMatch(/useCrimeData|computeSliceKde|kdeSlice\.worker/);
    expect(demoInspectPanelSource).toMatch(/showRawEvents|showHotspotTrajectories|hotspotMatchingMode/);
    expect(demoInspectPanelSource).toMatch(/Adaptive server cell/);
    expect(demoInspectPanelSource).not.toMatch(/Fixed 3 km/);
    expect(demoInspectPanelSource).toMatch(/const hotspotMatchingMode = useDashboardDemoCoordinationStore/);
    expect(demoInspectPanelSource).toMatch(/const setMatchingMode = useDashboardDemoCoordinationStore/);
    expect(demoInspectPanelSource).toMatch(/setMatchingMode\('adaptive'\)/);
    expect(demoAnalysisStoreSource).toMatch(/type DemoHotspotMatchingMode = 'fixed' \| 'adaptive'/);
    expect(demoAnalysisStoreSource).toMatch(/hotspotMatchingMode: DemoHotspotMatchingMode/);
    expect(demoAnalysisStoreSource).toMatch(/setHotspotMatchingMode: \(mode: DemoHotspotMatchingMode\) => void/);
    expect(demoInspectPanelSource).not.toMatch(/StkdeIntensityLegend/);
    expect(demoInspectPanelSource).not.toMatch(/Field renderer|Legacy renderer|setRenderer/);
    expect(demoInspectPanelSource).not.toMatch(/SliceInspector/);
    expect(demoInspectPanelSource).toMatch(/Unavailable/);
    expect(demoInspectPanelSource).toMatch(/SliceScrubber/);
    expect(demoStkdePanelSource).toMatch(/STKDE_PARAM_LIMITS/);
    expect(demoStkdePanelSource).toMatch(/setParams|setScopeMode|refresh/);
    expect(demoStkdePanelSource).not.toMatch(/StkdeIntensityLegend/);
    expect(demoSpatialSource).toMatch(/projectStkdeResponseToSceneSlices/);
    expect(demoSpatialSource).toMatch(/<Stkde3DScene/);
    expect(demoSpatialSource).toMatch(/<StkdeIntensityLegend mode=\{heatmapRenderer\} domain=\{\[0, 1\]\} compact defaultExpanded=\{false\}/);
    expect(intensityLegendSource).toMatch(/compact\?: boolean/);
    expect(intensityLegendSource).toMatch(/defaultExpanded\?: boolean/);
    expect(intensityLegendSource).toMatch(/compact = false/);
    expect(intensityLegendSource).toMatch(/defaultExpanded = true/);
    expect(intensityLegendSource).toMatch(/aria-expanded/);
    expect(intensityLegendSource).toMatch(/focus-visible:ring-2/);
    expect(demoSpatialSource).toMatch(/buildDurationVolumeProfile/);
    expect(demoSpatialSource).toMatch(/selectedSourceEvents/);
    expect(demoSpatialSource).toMatch(/showHotspotTrajectories=\{showHotspotTrajectories\}/);
    expect(demoSpatialSource).toMatch(/showAdaptiveWarpAxis=\{false\}/);
    expect(demoSpatialSource).toMatch(/showSliceBoundaryBackdrop=\{true\}/);
    expect(demoSpatialSource).not.toMatch(/SliceInspector|buildAllocationMetrics|inspectedAllocationMetrics/);
    expect(demoSpatialSource).toMatch(/isInterpolated: false/);
    expect(demoSpatialSource).not.toMatch(/computeSliceKde|kdeSlice\.worker/);
    expect(demo3dProviderSource).toMatch(/inspectIsPlaying|setActiveSliceIndex/);
    expect(demoCompareHookSource).not.toMatch(/useCrimeData|computeSliceKde|StkdeComparisonStage/);
    expect(demoCompareHookSource).toMatch(/adaptStkdeSurfaceToKdeCells/);
    expect(demoCompareHookSource).toMatch(/computeSparseKdeDifference/);
    expect(demoCompareHookSource).toMatch(/signedDifferenceAvailable: Boolean\(leftKde && rightKde\)/);
    expect(demoCompareStageSource).not.toMatch(/StkdeSignedDifferenceLegend/);
    expect(demoCompareStageSource).toMatch(/Signed difference · A − B/);
    expect(demoCompareStageSource).toMatch(/borderTone="a"/);
    expect(demoCompareStageSource).toMatch(/borderTone="difference"/);
    expect(demoCompareStageSource).toMatch(/borderTone="b"/);
    expect(demoCompareStageSource).toMatch(/aria-pressed=\{showDifference\}/);
    expect(demoCompareStageSource).not.toMatch(/normalized intensity · sparse/);
    expect(demoDetectPanelSource).toMatch(/selectedTimeRange/);
    expect(demoDetectPanelSource).toMatch(/selectedTimeRange !== null/);
    expect(demoDetectPanelSource).toMatch(/rounded-md border px-3 py-1.5 text-\[11px\] transition-colors/);
    expect(demoDetectPanelSource).toMatch(/Generate slices|generateBurstDraftBinsFromWindows/);
    expect(demoDetectPanelSource).toMatch(/recommendGranularityForSelection/);
    expect(demoDetectPanelSource).not.toMatch(/replaceSlicesFromBins|addSliceFromBin/);
    expect(demoDetectPanelSource).not.toMatch(/Scan brushed range|handleFetchBurstBins|burst bins ready for review/);
    expect(demoDetectPanelSource).toMatch(/disabled=\{!canGenerate \|\| isEvaluationLocked\}/);
    expect(demoTimelinePanelSource).toMatch(/DemoDualTimeline/);
    expect(demoTimelinePanelSource).not.toMatch(/useDashboardDemoWarpStore|useDashboardDemoTimeStore|Warp factor|Warp source|Temporal Resolution|Time Scale|requestAnimationFrame/);
    expect(demoTimelinePanelSource).not.toMatch(/useSliceStore|useTimeslicingModeStore|Slice companion|Side panel/);
    expect(railTabsSource).toMatch(/Tabs/);
    expect(railTabsSource).toMatch(/DemoSlicePanel/);
    expect(demoPresetSelectSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoPresetSelectSource).not.toMatch(/useCoordinationStore/);
    expect(demoPresetSelectSource).not.toMatch(/useTimeStore/);
    // Phase 86: the select wires through the applyDemoPreset helper
    // rather than touching the demo stores inline — this pins the helper
    // as the single source of truth for the preset-to-store sync contract.
    expect(demoPresetSelectSource).toMatch(/applyDemoPreset/);
    expect(demoPresetSelectSource).toMatch(/applyDashboardCaseStudy/);
    expect(demoPresetSelectSource).toMatch(/CASE_STUDY_PRESETS/);
    expect(demoPresetSelectSource).toMatch(/Case studies/);
    expect(demoPresetSelectSource).toMatch(/setPendingGeneratedBins/);
    expect(demoPresetSelectSource).toMatch(/applyGeneratedBins/);
    expect(demoPresetSelectSource).not.toMatch(/loadStkde3dDataset|loadConfiguredMockStkde3dDataset|computeSliceKde/);
    expect(demoSlicePanelSource).toMatch(/useSliceDomainStore/);
    expect(demoSlicePanelSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoSlicePanelSource).toMatch(/useDashboardDemoTimeStore/);
    expect(demoSlicePanelSource).toMatch(/useDashboardDemoTimeslicingModeStore/);
    expect(demoSlicePanelSource).toMatch(/DialogContent|DialogTitle|DialogDescription/);
    expect(demoSlicePanelSource).toMatch(/selectedSliceId/);
    expect(demoSlicePanelSource).toMatch(/selectedDraftId/);
    expect(demoSlicePanelSource).toMatch(/mergePendingGeneratedBins|splitPendingGeneratedBin|deletePendingGeneratedBin/);
    expect(demoSlicePanelSource).not.toMatch(/Pending selection-first drafts|editable before apply|Brushed selection is canonical|State idle/);
    expect(demoSlicePanelSource).toMatch(/toast\.(success|error)/);
    expect(demoSlicePanelSource).not.toMatch(/generateBurstDraftBinsFromWindows\(\[\]\)/);
    expect(demoSlicePanelSource).toMatch(/warpEnabled|Warp enabled|Warp disabled/);
    expect(demoSlicePanelSource).toMatch(/warpWeight|Warp strength/);
    expect(demoSlicePanelSource).toMatch(/Warp disabled|Warp \d/);
    expect(demoSlicePanelSource).toMatch(/handleSelectedSliceWarpWeightChange|clampComparableWarpWeight/);
    expect(demoSlicePanelSource).toMatch(/addManualDraftRange/);
    expect(demoSlicePanelSource).toMatch(/applySingleGeneratedBin/);
    expect(demoSlicePanelSource).not.toMatch(/replaceSlicesFromBins/);
    expect(demoSpatialSource).toMatch(/addManualDraftRange/);
    expect(demoSpatialSource).toMatch(/computeManualDraftBin/);
    expect(demoSpatialSource).not.toMatch(/replaceSlicesFromBins|addSliceFromBin/);
    expect(demoBurstGenerationSource).not.toMatch(/preset-bias|fallback to preset-bias/i);
    expect(demoBurstGenerationSource).toMatch(/buildDemoBurstWindowsFromSelection/);
    expect(demoBurstGenerationSource).toMatch(/buildBurstWindowsFromSeries/);
    expect(demoBurstGenerationSource).toMatch(/monthly/);
    expect(demoWarpMapSource).toMatch(/scoreComparableWarpBins/);
    expect(demoWarpMapSource).toMatch(/buildComparableWarpMap/);
    expect(demoWarpMapSource).toMatch(/ComparableWarpBinInput/);
    expect(demoWarpMapSource).toMatch(/buildSampleWarpMapFromComparableWarp/);
    expect(demoWarpMapSource).toMatch(/minimumWidthShare/);
    expect(demoTimeslicingModeStoreSource).toMatch(/generateBurstDraftBinsFromWindows/);
    expect(demoTimeslicingModeStoreSource).toMatch(/buildNonUniformDraftBinsFromSelection/);
    expect(demoTimeslicingModeStoreSource).toMatch(/\/api\/crimes\/range/);
    expect(demoTimeslicingModeStoreSource).toMatch(/maxSlices/);
    expect(demoDualTimelineSource).toMatch(/DemoDualTimeline/);
    expect(demoDualTimelineSource).toMatch(/buildDemoSliceAuthoredWarpMap/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoDualTimelineSource).toMatch(/warpSource/);
    expect(demoDualTimelineSource).toMatch(/computeDensityMap/);
    expect(demoDualTimelineSource).toMatch(/setPrecomputedMaps/);
    expect(demoDualTimelineSource).toMatch(/useSliceDomainStore/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoTimeStore/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoFilterStore/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoTimeslicingModeStore/);
    expect(demoDualTimelineSource).toMatch(/useDemoBurstWindows/);
    expect(demoDualTimelineSource).toMatch(/authoredScopedWarpMap|scopedDensityWarpMap/);
    expect(demoDualTimelineSource).toMatch(/warpEnabled/);
    expect(demoDualTimelineSource).toMatch(/isGeneratedDraft/);
    expect(demoDualTimelineSource).toMatch(/overviewInteractionScale|detailInteractionScale/);
    expect(demoDualTimelineSource).not.toMatch(/adaptiveWarpMapOverride|adaptiveWarpDomainOverride|warpOverlayBandsOverride/);
    expect(demoDualTimelineSource).not.toMatch(/timeStoreOverride|filterStoreOverride|coordinationStoreOverride|adaptiveStoreOverride|sliceDomainStoreOverride|timeslicingModeStoreOverride/);
    expect(demoDualTimelineSource).not.toMatch(/showWarpConnectors|warpConnectorStyle/);
    expect(demoDualTimelineSurfaceSource).not.toMatch(/Overview density/);
    expect(demoDualTimelineSurfaceSource).not.toMatch(/Detail density/);
    expect(demoDualTimelineSurfaceSource).not.toMatch(/Binned detail/);

    expect(demoTimelineSummarySource).toMatch(/useDemoBurstWindows/);
    expect(demoBurstWindowsSource).toMatch(/buildDemoBurstWindowsFromSelection/);
    expect(demoBurstWindowsSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoBurstWindowsSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoTimeslicingModeStoreSource).not.toMatch(/buildTimelineEvents|useTimelineDataStore\.getState|getCrimeTypeName/);
  });

  test('Phase 86: DemoPresetSelect wires through the demo filter / time / coordination stores via applyDemoPreset', () => {
    const demoPresetSelectSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoPresetSelect.tsx', import.meta.url),
      'utf8'
    );

    // Imports the three dashboard-demo stores that the sync contract touches.
    expect(demoPresetSelectSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoPresetSelectSource).toMatch(/useDashboardDemoFilterStore/);
    expect(demoPresetSelectSource).toMatch(/useDashboardDemoTimeStore/);

    // The select itself delegates to the applyDemoPreset helper, which is
    // the single source of truth for the preset-to-store sync contract.
    expect(demoPresetSelectSource).toMatch(/from '@\/components\/dashboard-demo\/lib\/applyDemoPreset'/);
    expect(demoPresetSelectSource).toMatch(/applyDemoPreset\(/);

    // Does NOT import the legacy /dashboard stores.
    expect(demoPresetSelectSource).not.toMatch(/from '@\/store\/useCoordinationStore'/);
    expect(demoPresetSelectSource).not.toMatch(/from '@\/store\/useTimeStore'/);
    // nor the bare, non-prefixed legacy hooks (defense-in-depth).
    expect(demoPresetSelectSource).not.toMatch(/\buseCoordinationStore\b/);
    expect(demoPresetSelectSource).not.toMatch(/\buseTimeStore\b/);
  });
});
