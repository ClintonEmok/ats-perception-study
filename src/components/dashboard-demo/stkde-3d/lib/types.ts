export interface KdeCell {
  x: number;
  z: number;
  intensity: number;
  support: number;
}

export interface EvolvingSlice {
  index: number;
  label: string;
  startEpoch: number;
  endEpoch: number;
  burstScore: number;
  crimeCount: number;
}

export interface Stkde3dHotspot {
  name: string;
  type: string;
  evolution: Array<{
    centerX: number;
    centerZ: number;
    radius: number;
    weight: number;
  } | null>;
}

export interface MockCrimeEvent {
  x: number;
  z: number;
  type: string;
  /** Unix epoch timestamp in seconds. */
  timestampEpochSec: number;
}
