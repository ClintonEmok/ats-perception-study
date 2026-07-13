'use client';

import { getCrimeTypeName, getDistrictName } from '@/lib/category-maps';
import type { DataPoint } from '@/lib/data/types';
import { useTimelineDataStore } from '@/store/useTimelineDataStore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizedToEpochSeconds, toEpochSeconds } from '@/lib/time-domain';

interface PointInspectorProps {
  pointId: string;
}

export function PointInspector({ pointId }: PointInspectorProps) {
  const { data, columns, minTimestampSec, maxTimestampSec } = useTimelineDataStore();

  const point = useMemo(() => {
    // If using columnar data, assume pointId is the index
    if (columns) {
        const index = parseInt(pointId, 10);
        if (isNaN(index) || index < 0 || index >= columns.length) return null;
        
        const { timestamp, type, district, block } = columns;
        
        return {
            timestamp: timestamp[index], // normalized
            type: getCrimeTypeName(type[index]),
            district: getDistrictName(district[index]),
            block: block ? block[index] : 'Unknown',
        };
    }
    
    const index = Number.parseInt(pointId, 10);
    if (!Number.isNaN(index) && index >= 0 && index < data.length) {
      return data[index];
    }

    return data.find((p) => p.id === pointId);
  }, [pointId, data, columns]);

  const timestampLabel = useMemo(() => {
    if (!point) return null;

    if (columns) {
      const normalized = typeof point.timestamp === 'number' ? point.timestamp : null;
      if (normalized === null) return null;
      if (minTimestampSec !== null && maxTimestampSec !== null) {
        const epochSec = normalizedToEpochSeconds(normalized, minTimestampSec, maxTimestampSec);
        return {
          primary: new Date(epochSec * 1000).toLocaleString(),
          secondary: normalized.toFixed(2)
        };
      }
      return { primary: 'Time not available', secondary: normalized.toFixed(2) };
    }

    const raw: unknown = (point as DataPoint).timestamp;
    if (raw instanceof Date) {
      return { primary: raw.toLocaleString(), secondary: null };
    }
    if (typeof raw === 'number') {
      if (minTimestampSec !== null && maxTimestampSec !== null && raw >= 0 && raw <= 100) {
        const epochSec = normalizedToEpochSeconds(raw, minTimestampSec, maxTimestampSec);
        return {
          primary: new Date(epochSec * 1000).toLocaleString(),
          secondary: raw.toFixed(2)
        };
      }
      const epochSec = toEpochSeconds(raw);
      return { primary: new Date(epochSec * 1000).toLocaleString(), secondary: null };
    }

    return null;
  }, [point, columns, minTimestampSec, maxTimestampSec]);

  if (!point) {
      return (
          <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
          </div>
      );
  }

  return (
    <div className="p-4 border-t bg-muted/10">
      <h3 className="text-sm font-semibold mb-2">Selected Event</h3>
      <div className="space-y-1 text-sm">
        {timestampLabel && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Datetime:</span>
            <span>{timestampLabel.primary}</span>
          </div>
        )}
        {timestampLabel?.secondary && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Normalized:</span>
            <span>{timestampLabel.secondary}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type:</span>
          <span>{point.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">District:</span>
          <span>{String(point.district ?? 'Unknown')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Block:</span>
          <span className="truncate max-w-[150px]">{String(point.block ?? 'Unknown')}</span>
        </div>
      </div>
    </div>
  );
}
