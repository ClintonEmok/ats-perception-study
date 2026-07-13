'use client';
import { useMemo, useState } from 'react';
import { ParentSize } from '@visx/responsive';
import { scaleTime, scaleLinear } from '@visx/scale';
import { max } from 'd3-array';
import { BarChart2, CircleDot } from 'lucide-react';
import { binTimeData } from '@/utils/binning';
import { HistogramLayer } from './layers/HistogramLayer';
import { AxisLayer } from './layers/AxisLayer';
import { MarkerLayer } from './layers/MarkerLayer';
import { TimelineBrush } from './TimelineBrush';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useTimeStore } from '@/store/useTimeStore';
import { useCoordinationStore } from '@/store/useCoordinationStore';
import { normalizedToEpochSeconds, epochSecondsToNormalized } from '@/lib/time-domain';
import { DensityTrack } from './DensityTrack';

interface DataPoint {
  timestamp: Date | number;
  [key: string]: unknown;
}

interface TimelineProps {
  // data is now optional as we fetch from store if not provided
  data?: DataPoint[];
  onChange?: (domain: [Date, Date]) => void;
  selectedDomain?: [Date, Date];
}

const TimelineContent = ({ width, height, data: propData, onChange, selectedDomain }: TimelineProps & { width: number; height: number }) => {
   const [viewMode, setViewMode] = useState<'histogram' | 'markers'>('histogram');
   
   // Connect to stores
   const { columns, minTimestampSec, maxTimestampSec } = useTimelineDataStore();
   const { setRange, timeRange } = useTimeStore();
   const { setBrushRange } = useCoordinationStore();

   // Prepare data from store if not provided via props
   const data = useMemo(() => {
     if (propData) return propData;
     if (!columns || minTimestampSec === null || maxTimestampSec === null) return [];
     
     const count = columns.length;
     const mapped = [];
     for(let i=0; i<count; i++) {
        // Reconstruct timestamp from normalized 0-100 y
        const normalized = columns.timestamp[i];
        const epoch = normalizedToEpochSeconds(normalized, minTimestampSec, maxTimestampSec);
        mapped.push({ timestamp: epoch * 1000 }); // ms for Date
     }
     return mapped;
   }, [columns, minTimestampSec, maxTimestampSec, propData]);

    // Handle brush selection - converts dates to normalized time range
    const handleChange = (domain: [Date, Date] | null) => {
      if (!domain) return;
      
      if (onChange) {
        onChange(domain);
      }
      
      // Always update the store for 3D view synchronization
      // Convert Date (ms) to normalized 0-100 range
      if (minTimestampSec !== null && maxTimestampSec !== null) {
        const startEpoch = domain[0].getTime() / 1000; // ms to seconds
        const endEpoch = domain[1].getTime() / 1000;
        
        const startNormalized = epochSecondsToNormalized(startEpoch, minTimestampSec, maxTimestampSec);
        const endNormalized = epochSecondsToNormalized(endEpoch, minTimestampSec, maxTimestampSec);
        
        setRange([startNormalized, endNormalized]);
        setBrushRange([startNormalized, endNormalized]);
      }
    };

   const densityHeight = 12;
   const margin = { top: 20, right: 20, bottom: 20, left: 20 };
   const innerWidth = width - margin.left - margin.right;
   // Subtract densityHeight from available chart height
   const innerHeight = height - margin.top - margin.bottom - densityHeight;

   const { xScale, yScale, bins } = useMemo(() => {
     if (!data.length) return { xScale: null, yScale: null, bins: [] };

     const timestamps = data.map(d => d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp));
     const xMin = new Date(Math.min(...timestamps.map(t => t.getTime())));
     const xMax = new Date(Math.max(...timestamps.map(t => t.getTime())));

     const xScale = scaleTime({
       range: [0, innerWidth],
       domain: [xMin, xMax],
     });

     const bins = binTimeData(data, d => d.timestamp, [xMin.getTime(), xMax.getTime()]);
     const yMax = max(bins, b => b.length) || 0;

     const yScale = scaleLinear({
       range: [0, innerHeight],
       domain: [0, yMax],
     });

     return { xScale, yScale, bins };
   }, [data, innerWidth, innerHeight]);

   if (width < 10) return null;

   if (!xScale || !yScale) {
     return (
       <svg width={width} height={height}>
         <text x={width/2} y={height/2} textAnchor="middle" fill="#666">No Data</text>
       </svg>
     );
   }

   // ...

   return (
     <div className="relative w-full h-full">
        {/* View Toggle */}
        <button
          onClick={() => setViewMode(m => m === 'histogram' ? 'markers' : 'histogram')}
          className="absolute top-0 right-0 p-1 bg-background/80 backdrop-blur rounded border shadow-sm z-10 hover:bg-accent"
          title={`Switch to ${viewMode === 'histogram' ? 'Markers' : 'Histogram'}`}
        >
          {viewMode === 'histogram' ? <CircleDot className="w-4 h-4" /> : <BarChart2 className="w-4 h-4" />}
        </button>

        {/* Density Track - Placed above the chart area */}
        <div 
            className="absolute" 
            style={{ 
                left: margin.left, 
                top: margin.top, 
                width: innerWidth, 
                height: densityHeight 
            }}
        >
            <DensityTrack width={innerWidth} height={densityHeight} />
        </div>

        <svg width={width} height={height}>
            {/* Shift chart down by densityHeight */}
            <g transform={`translate(${margin.left}, ${margin.top + densityHeight})`}>
              {viewMode === 'histogram' && (
                  <HistogramLayer 
                    bins={bins} 
                    xScale={xScale} 
                    yScale={yScale} 
                    height={innerHeight} 
                    color="#3b82f6" 
                  />
              )}
              {viewMode === 'markers' && (
                  <MarkerLayer
                    data={data}
                    xScale={xScale}
                    yScale={yScale}
                    height={innerHeight}
                  />
              )}
              
              <AxisLayer xScale={xScale} height={innerHeight} />
              
              <TimelineBrush 
                xScale={xScale}
                yScale={yScale}
                width={innerWidth}
                height={innerHeight}
                onChange={handleChange}
                selectedDomain={selectedDomain}
              />
            </g>
        </svg>
     </div>
   );
};


export function Timeline(props: TimelineProps) {
  return (
    <div className="w-full h-full min-h-[100px]">
      <ParentSize>
        {({ width, height }) => (
          <TimelineContent width={width} height={height} {...props} />
        )}
      </ParentSize>
    </div>
  );
}
