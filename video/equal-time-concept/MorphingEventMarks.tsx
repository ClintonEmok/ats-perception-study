import React, { useMemo } from 'react';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { MAPLIBRE_VIEW_STATE } from './ChicagoMapLibre';
import { DARK_TEXT, HOURLY_INTERVALS, TUE_RED } from './data';

interface MorphingEventMarksProps {
  mapBounds: { x: number; y: number; width: number; height: number };
  timelineBounds: { x: number; y: number; width: number };
  morphProgress: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const MorphingEventMarks: React.FC<MorphingEventMarksProps> = ({
  mapBounds,
  timelineBounds,
  morphProgress,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 345 for 100% static hold starting at 11.5s (frame 345)
  const effectiveFrame = Math.min(frame, 345);

  // Red accent emphasis on dense burst interval only after settling onto baseline (frames 310–340 / 10.3s–11.3s)
  const redEmphasisProgress = interpolate(effectiveFrame, [310, 340], [0, 1], clamp);

  const allEvents = HOURLY_INTERVALS.flatMap((interval) => interval.events);
  const intervalWidth = timelineBounds.width / HOURLY_INTERVALS.length; // 336px per interval

  // WebMercator projection aligned with the zoomed MapLibre MAPLIBRE_VIEW_STATE
  const viewport = useMemo(() => {
    return new WebMercatorViewport({
      width: mapBounds.width,
      height: mapBounds.height,
      longitude: MAPLIBRE_VIEW_STATE.longitude,
      latitude: MAPLIBRE_VIEW_STATE.latitude,
      zoom: MAPLIBRE_VIEW_STATE.zoom,
    });
  }, [mapBounds.width, mapBounds.height]);

  return (
    <>
      {allEvents.map((event) => {
        if (effectiveFrame < event.appearFrame) return null;

        // Pop entrance on the MapLibre map
        const entrance = spring({
          frame: effectiveFrame - event.appearFrame,
          fps,
          config: { damping: 14, mass: 0.45, stiffness: 160 },
        });

        const initialScale = interpolate(entrance, [0, 1], [0.2, 1], clamp);
        const initialOpacity = interpolate(entrance, [0, 1], [0, 1], clamp);

        // Project Geographic (lon, lat) -> Exact Map Pixel (x, y) on MapLibre
        const [pixelX, pixelY] = viewport.project([event.lon, event.lat]);
        const mapX = mapBounds.x + pixelX;
        const mapY = mapBounds.y + pixelY;

        // 1D Timeline Coordinates
        const timeX =
          timelineBounds.x +
          event.intervalIndex * intervalWidth +
          (event.xPercent / 100) * intervalWidth;
        const timeY = timelineBounds.y;

        // Smoothly interpolate position from MapLibre Map -> 1D Horizontal Timeline
        const currentX = interpolate(morphProgress, [0, 1], [mapX, timeX]);
        const currentY = interpolate(morphProgress, [0, 1], [mapY, timeY]);

        const isDense = event.intervalIndex === 2;
        const isRed = isDense && redEmphasisProgress > 0;

        return (
          <div
            key={event.id}
            style={{
              position: 'absolute',
              left: currentX,
              top: currentY,
              transform: `translate(-50%, -50%) scale(${initialScale})`,
              opacity: initialOpacity,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: isRed
                ? `rgba(200, 16, 46, ${0.85 + redEmphasisProgress * 0.15})`
                : DARK_TEXT,
              border: isRed ? `3px solid ${TUE_RED}` : '3px solid #ffffff',
              boxShadow: isRed
                ? '0 3px 12px rgba(200, 16, 46, 0.45)'
                : '0 2px 8px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        );
      })}
    </>
  );
};
