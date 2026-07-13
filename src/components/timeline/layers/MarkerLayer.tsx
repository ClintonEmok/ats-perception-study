import { memo } from 'react';
import { ScaleLinear, ScaleTime } from 'd3-scale';

interface MarkerLayerProps {
  data: Array<{ timestamp: Date | number }>;
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
  height: number;
}

export const MarkerLayer = memo(function MarkerLayer({ data, xScale, yScale, height }: MarkerLayerProps) {
  return (
    <g>
      {data.map((d, i) => {
        const timestamp = d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp);
        const x = xScale(timestamp);
        // Random Y scatter or specific logic? 
        // For timeline events, we often put them on a line or scatter if we have another dimension.
        // Let's scatter them slightly vertically or put them on a line.
        // Research didn't specify, so let's put them on a middle line for now, or random.
        // "Event Markers (individual dots)" often implies a scatterplot if overlap is an issue.
        // Let's use a fixed Y for now, or random jitter.
        const y = height / 2; 

        return (
          <circle
            key={`marker-${i}`}
            cx={x}
            cy={y}
            r={3}
            fill="#ef4444" // red-500
            opacity={0.6}
          />
        );
      })}
    </g>
  );
});
