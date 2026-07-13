export interface DataPoint {
  id: string;
  timestamp: number;
  x: number;
  y: number;
  z: number;
  type: string;
  block?: string;
  [key: string]: unknown;
}

// Re-export ColumnarData from canonical location
export type { ColumnarData } from '@/types/data';

export interface FilteredPoint {
  x: number;
  y: number;
  z: number;
  lat?: number;
  lon?: number;
  typeId: number;
  districtId: number;
  block?: string;
  originalIndex: number;
}
