import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useClusterStore } from '@/store/useClusterStore';
import { PALETTES } from '@/lib/palettes';
import { useThemeStore } from '@/store/useThemeStore';
import { useFilterStore } from '@/store/useFilterStore';

type FitToBoxControls = {
  fitToBox?: (
    box: THREE.Box3,
    smooth?: boolean,
    options?: {
      paddingLeft?: number;
      paddingRight?: number;
      paddingTop?: number;
      paddingBottom?: number;
    }
  ) => void;
};

export const ClusterLabels: React.FC = () => {
  const { clusters, selectedClusterId, hoveredClusterId, setSelectedClusterId, setHoveredClusterId, clearClusterSelection } = useClusterStore();
  const setSpatialBounds = useFilterStore((state) => state.setSpatialBounds);
  const clearSpatialBounds = useFilterStore((state) => state.clearSpatialBounds);
  const controls = useThree((state) => state.controls as FitToBoxControls | undefined);
  const theme = useThemeStore((state) => state.theme);
  const palette = PALETTES[theme].categoryColors;

  const resolveClusterColor = (dominantType: string) =>
    palette[dominantType.toUpperCase()] || palette[dominantType] || '#a855f7';

  const formatClusterTimeRange = (range: [number, number]) => {
    const [start, end] = range;
    if (Math.max(start, end) > 10000) {
      return `${new Date(start * 1000).toLocaleDateString()} → ${new Date(end * 1000).toLocaleDateString()}`;
    }

    return `${start.toFixed(1)}% → ${end.toFixed(1)}%`;
  };

  const topClusters = useMemo(() => {
    if (!clusters) return [];
    return [...clusters]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [clusters]);

  if (topClusters.length === 0) return null;

  return (
    <group name="cluster-labels">
      {topClusters.map((cluster) => (
        <group key={cluster.id} position={cluster.center}>
          <Html
            position={[0, cluster.size[1] / 2, 0]} // Exactly at the top edge of the box
            center
            distanceFactor={20}
            zIndexRange={[100, 0]}
          >
            <div
              className="flex flex-col items-center -translate-y-full pb-1 pointer-events-auto select-none group cursor-pointer"
              onPointerEnter={() => setHoveredClusterId(cluster.id)}
              onPointerLeave={() => setHoveredClusterId(null)}
              onClick={() => {
                if (selectedClusterId === cluster.id) {
                  clearClusterSelection();
                  clearSpatialBounds();
                  return;
                }

                setSelectedClusterId(cluster.id);
                setSpatialBounds({
                  minX: cluster.bounds.minX,
                  maxX: cluster.bounds.maxX,
                  minZ: cluster.bounds.minZ,
                  maxZ: cluster.bounds.maxZ,
                  minLat: cluster.bounds.minLat,
                  maxLat: cluster.bounds.maxLat,
                  minLon: cluster.bounds.minLon,
                  maxLon: cluster.bounds.maxLon,
                });
                if (controls && controls.fitToBox) {
                  const center = new THREE.Vector3().fromArray(cluster.center);
                  const size = new THREE.Vector3().fromArray(cluster.size);
                  const min = center.clone().sub(size.clone().multiplyScalar(0.5));
                  const max = center.clone().add(size.clone().multiplyScalar(0.5));
                  const box = new THREE.Box3(min, max);
                  controls.fitToBox(box, true, { 
                    paddingLeft: 1, 
                    paddingRight: 1, 
                    paddingTop: 1, 
                    paddingBottom: 1 
                  });
                }
              }}
            >
              <div 
                className={`px-2 py-1 rounded border text-[10px] whitespace-nowrap shadow-xl flex items-center gap-2 transition-transform group-hover:scale-110 group-active:scale-95 ${cluster.id === selectedClusterId ? 'bg-violet-50 border-violet-200 text-violet-950' : cluster.id === hoveredClusterId ? 'bg-sky-50 border-sky-200 text-sky-950' : 'bg-background/90 border-border text-foreground'}`}
                style={{ borderTop: `2px solid ${resolveClusterColor(cluster.dominantType)}` }}
              >
                <span className="font-medium">{cluster.dominantType}</span>
                <span className="rounded bg-foreground/5 px-1 text-[9px] opacity-70">{cluster.count}</span>
              </div>
              <div className="mt-1 rounded border border-border bg-background/85 px-2 py-1 text-center whitespace-nowrap text-[9px] leading-tight text-muted-foreground shadow-lg backdrop-blur">
                <div>{formatClusterTimeRange(cluster.timeRange)}</div>
                <div className="uppercase tracking-[0.18em] text-foreground">{cluster.dominantType}</div>
              </div>
              {/* Leader Line (CSS) */}
              <div 
                className="w-[1px] h-6 bg-gradient-to-b from-white/60 to-transparent" 
              />
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
};
