import React from 'react';
import { Html } from '@react-three/drei';

interface TrajectoryTooltipProps {
  duration: number;
  distance: number;
  block: string;
}

export const TrajectoryTooltip: React.FC<TrajectoryTooltipProps> = ({ duration, distance, block }) => {
  return (
    <Html center distanceFactor={10}>
      <div className="pointer-events-none min-w-[200px] rounded-lg border border-border bg-background/90 p-3 text-foreground shadow-xl backdrop-blur">
        <h4 className="mb-2 border-b border-border pb-1 text-sm font-bold uppercase tracking-wider text-sky-700">
          Trajectory Summary
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location:</span>
            <span className="font-mono">{block}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-mono">{duration.toFixed(1)} units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Travel Dist:</span>
            <span className="font-mono">{distance.toFixed(2)} units</span>
          </div>
        </div>
      </div>
    </Html>
  );
};
