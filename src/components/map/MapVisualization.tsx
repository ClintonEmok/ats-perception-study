"use client";

import React, { useMemo, useRef } from 'react';
import { Layers } from 'lucide-react';
import { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import { useStore } from 'zustand';
import MapBase from './MapBase';
import MapEventLayer from './MapEventLayer';
import MapSelectionOverlay, { LatLonBounds } from './MapSelectionOverlay';
import MapSelectionMarker from './MapSelectionMarker';
import MapDebugOverlay from './MapDebugOverlay';
import { MapClusterHighlights } from './MapClusterHighlights';
import { MapHeatmapOverlay } from './MapHeatmapOverlay';
import { MapTrajectoryLayer } from './MapTrajectoryLayer';
import { MapStkdeHeatmapLayer } from './MapStkdeHeatmapLayer';
import { MapPoiLayer } from './MapPoiLayer';
import { Button } from '@/components/ui/button';
import { project } from '@/lib/projection';
import { findNearestIndexByScenePosition, resolvePointByIndex } from '@/lib/selection';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapLayerStore } from '@/store/useMapLayerStore';
import { useStkdeStore } from '@/store/useStkdeStore';
import { useLogger } from '@/hooks/useLogger';
import { useCrimeData } from '@/hooks/useCrimeData';
import { useViewportStore } from '@/lib/stores/viewportStore';
import type { StkdeResponse } from '@/lib/stkde/contracts';

interface MapVisualizationProps {
  stkdeResponse?: StkdeResponse | null;
  stkdeSelectedHotspotId?: string | null;
  stkdeVisibleOverride?: boolean;
  disableHeatmapOverlay?: boolean;
  statsOverlay?: React.ReactNode;
  filterStoreOverride?: unknown;
  coordinationStoreOverride?: unknown;
  mapLayerStoreOverride?: unknown;
  sliceTimeRange?: [number, number] | null;
  sliceHighlightRange?: [number, number] | null;
  activeSliceLabel?: string | null;
}

export default function MapVisualization({
  stkdeResponse: demoStkdeResponse = null,
  stkdeSelectedHotspotId,
  stkdeVisibleOverride,
  disableHeatmapOverlay = false,
  statsOverlay,
  filterStoreOverride,
  coordinationStoreOverride,
  mapLayerStoreOverride,
  sliceTimeRange = null,
  sliceHighlightRange = null,
  activeSliceLabel = null,
}: MapVisualizationProps = {}) {
  const mapRef = useRef<MapRef>(null);
  const { log } = useLogger();
  
  // Get viewport bounds for crime data query
  const viewportStart = useViewportStore((state) => state.startDate);
  const viewportEnd = useViewportStore((state) => state.endDate);
  const viewportFilters = useViewportStore((state) => state.filters);
  
  // Get crime data using unified hook
  const { data: crimeRecords } = useCrimeData({
    startEpoch: viewportStart,
    endEpoch: viewportEnd,
    crimeTypes: viewportFilters.crimeTypes.length > 0 ? viewportFilters.crimeTypes : undefined,
    districts: viewportFilters.districts.length > 0 ? viewportFilters.districts : undefined,
    bufferDays: 30,
    limit: 50000,
  });
  
  const data = useMemo(() => crimeRecords || [], [crimeRecords]);
  
  const filteredData = useMemo(() => {
    if (!sliceTimeRange) return data;
    const [start, end] = sliceTimeRange;
    return data.filter((r) => r.timestamp >= start && r.timestamp <= end);
  }, [data, sliceTimeRange]);

  // When an active-slice highlight range is present, keep the regular
  // viewport/filter query data available to the event layer so out-of-slice
  // events stay visible as subdued context instead of being filtered away.
  const eventRecords = useMemo(
    () => (sliceHighlightRange ? data : filteredData),
    [data, filteredData, sliceHighlightRange],
  );

  const filterStore = (filterStoreOverride ?? useFilterStore) as typeof useFilterStore;
  const coordinationStore = (coordinationStoreOverride ?? useCoordinationStore) as typeof useCoordinationStore;
  const mapLayerStore = (mapLayerStoreOverride ?? useMapLayerStore) as typeof useMapLayerStore;

  const selectedSpatialBounds = useStore(filterStore, (state) => state.selectedSpatialBounds);
  const selectedTypes = useStore(filterStore, (state) => state.selectedTypes);
  const selectedDistricts = useStore(filterStore, (state) => state.selectedDistricts);
  const selectedTimeRange = useStore(filterStore, (state) => state.selectedTimeRange);
  const selectedIndex = useStore(coordinationStore, (state) => state.selectedIndex);
  const setSelectedIndex = useStore(coordinationStore, (state) => state.setSelectedIndex);
  const clearSelection = useStore(coordinationStore, (state) => state.clearSelection);
  const setSelectedPoi = useStore(coordinationStore, (state) => (state as { setSelectedPoi?: (id: string | null) => void }).setSelectedPoi) as ((id: string | null) => void) | undefined;
  const hoveredTypeId = useStore(coordinationStore, (state) => (state as { hoveredTypeId?: number | null }).hoveredTypeId) as number | null | undefined;
  const setHoveredTypeId = useStore(coordinationStore, (state) => (state as { setHoveredTypeId?: (id: number | null) => void }).setHoveredTypeId) as ((id: number | null) => void) | undefined;
  const lastClick = useStore(coordinationStore, (state) => (state as { lastClick?: { lat: number; lon: number } | null }).lastClick) as { lat: number; lon: number } | null | undefined;
  const setLastClick = useStore(coordinationStore, (state) => (state as { setLastClick?: (click: { lat: number; lon: number } | null) => void }).setLastClick) as ((click: { lat: number; lon: number } | null) => void) | undefined;
  const mapOverlayOpen = useStore(coordinationStore, (state) => (state as { mapOverlayOpen?: boolean }).mapOverlayOpen) as boolean | undefined;
  const setMapOverlayOpen = useStore(coordinationStore, (state) => (state as { setMapOverlayOpen?: (open: boolean) => void }).setMapOverlayOpen) as ((open: boolean) => void) | undefined;
  const visibility = useStore(mapLayerStore, (state) => state.visibility);
  const opacity = useStore(mapLayerStore, (state) => state.opacity);

  const stkdeStoreResponse = useStkdeStore((state) => state.response);
  const stkdeStoreSelectedHotspotId = useStkdeStore((state) => state.selectedHotspotId);
  const stkdeResponse = demoStkdeResponse ?? stkdeStoreResponse;
  const selectedHotspotId = stkdeSelectedHotspotId ?? stkdeStoreSelectedHotspotId;
  const isStkdeVisible = typeof stkdeVisibleOverride === 'boolean' ? stkdeVisibleOverride : visibility.stkde;
  const activeHotspotCentroid = useMemo(() => {
    if (!stkdeResponse || !selectedHotspotId) return null;
    const hotspot = stkdeResponse.hotspots.find((row) => row.id === selectedHotspotId);
    return hotspot ? ([hotspot.centroidLng, hotspot.centroidLat] as [number, number]) : null;
  }, [selectedHotspotId, stkdeResponse]);

  const selectedBounds = useMemo<LatLonBounds | null>(() => {
    if (!selectedSpatialBounds) return null;
    return {
      minLat: selectedSpatialBounds.minLat,
      maxLat: selectedSpatialBounds.maxLat,
      minLon: selectedSpatialBounds.minLon,
      maxLon: selectedSpatialBounds.maxLon
    };
  }, [selectedSpatialBounds]);

  const selectionPoint = useMemo(() => {
    if (selectedIndex === null) return null;
    return resolvePointByIndex(selectedIndex);
  }, [selectedIndex]);

  const handleClick = (event: MapLayerMouseEvent) => {
    const { lng, lat } = event.lngLat;
    setLastClick?.({ lat, lon: lng });

    const [x, z] = project(lat, lng);
    const nearest = findNearestIndexByScenePosition(x, z);
    
    if (nearest) {
      if (nearest.distance <= 12) {
        setSelectedIndex(nearest.index, 'map');
        log('map_point_selected', { index: nearest.index, distance: nearest.distance });
      } else {
        clearSelection();
        log('map_click_missed', { distance: nearest.distance });
      }
    } else {
      clearSelection();
    }
  };

  const handleMoveEnd = (event: { viewState: { zoom: number; latitude: number; longitude: number } }) => {
      const { viewState } = event;
      log('map_moved', {
          zoom: viewState.zoom,
          latitude: viewState.latitude,
          longitude: viewState.longitude
      });
  };

  const handlePoiClick = (poi: { id: string }) => {
    if (typeof setSelectedPoi === 'function') {
      setSelectedPoi(poi.id);
    }
  };

  return (
    <div className="w-full h-full relative">
      <MapBase
        ref={mapRef}
        onClick={handleClick}
        onMoveEnd={handleMoveEnd}
      >
        {visibility.events ? (
          <MapEventLayer
            hoveredTypeId={hoveredTypeId}
            records={eventRecords}
            selectedTimeRange={selectedTimeRange}
            selectedTypes={selectedTypes}
            selectedDistricts={selectedDistricts}
            selectedSpatialBounds={selectedSpatialBounds}
            highlightRange={sliceHighlightRange}
          />
        ) : null}
        {!disableHeatmapOverlay && visibility.heatmap ? <MapHeatmapOverlay /> : null}
        {visibility.trajectories ? <MapTrajectoryLayer /> : null}
        {visibility.clusters ? <MapClusterHighlights /> : null}
        {statsOverlay ?? null}
        {isStkdeVisible && stkdeResponse?.heatmap.cells?.length ? (
          <MapStkdeHeatmapLayer
            cells={stkdeResponse.heatmap.cells}
            activeHotspotId={selectedHotspotId}
            activeHotspotCentroid={activeHotspotCentroid}
            opacity={opacity.stkde}
          />
        ) : null}
        {visibility.poi ? (
          <div className="pointer-events-auto" style={{ opacity: opacity.poi }}>
            <MapPoiLayer
              visible
              categories={['police', 'schools', 'transit', 'parks']}
              onPoiClick={handlePoiClick}
            />
          </div>
        ) : null}
        <MapSelectionOverlay selectedBounds={selectedBounds} dragBounds={null} />
        <MapDebugOverlay clickPoint={lastClick ?? null} selectedPoint={selectionPoint} />

        {selectionPoint && (
          <MapSelectionMarker lat={selectionPoint.lat} lon={selectionPoint.lon} />
        )}
      </MapBase>

      <div className="absolute left-4 top-4 z-10">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => setMapOverlayOpen?.(!mapOverlayOpen)}
          aria-label={mapOverlayOpen ? 'Hide map legend' : 'Show map legend'}
          title={mapOverlayOpen ? 'Hide map legend' : 'Show map legend'}
          className="border-border/70 bg-background/85 shadow-sm backdrop-blur-sm"
        >
          <Layers className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
