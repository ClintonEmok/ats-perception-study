'use client';

import * as React from 'react';
import Map, { MapRef, MapLayerMouseEvent, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CENTER } from '@/lib/projection';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTES } from '@/lib/palettes';

// Initial view state for Chicago
const INITIAL_VIEW_STATE = {
  longitude: CENTER.longitude,
  latitude: CENTER.latitude,
  zoom: 12,
  pitch: 0,
  bearing: 0
};

interface MapBaseProps {
  children?: React.ReactNode;
  className?: string;
  onMouseDown?: (event: MapLayerMouseEvent) => void;
  onMouseMove?: (event: MapLayerMouseEvent) => void;
  onMouseUp?: (event: MapLayerMouseEvent) => void;
  onClick?: (event: MapLayerMouseEvent) => void;
  onMouseLeave?: (event: MapLayerMouseEvent) => void;
  onMoveEnd?: (event: ViewStateChangeEvent) => void;
  dragPan?: boolean;
  cursor?: string;
}

const MapBase = React.forwardRef<MapRef, MapBaseProps>(
  (
    {
      children,
      className,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onClick,
      onMouseLeave,
      onMoveEnd,
      dragPan,
      cursor
    },
    ref
  ) => {
    const theme = useThemeStore((state) => state.theme);
    const mapStyle = PALETTES[theme].mapStyle;

    return (
      <div className={`relative w-full h-full ${className || ''}`}>
        <Map
          ref={ref}
          initialViewState={INITIAL_VIEW_STATE}
          style={{ width: '100%', height: '100%', cursor }}
          mapStyle={mapStyle}
          attributionControl={false}
        dragPan={dragPan}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onClick={onClick}
        onMouseLeave={onMouseLeave}
        onMoveEnd={onMoveEnd}
      >
        {children}
      </Map>
    </div>
    );
  }
);

MapBase.displayName = 'MapBase';

export default MapBase;
