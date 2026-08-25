export type EventItem = {
  id: string;
  intervalIndex: number;
  xPercent: number; // 0 to 100 within interval on timeline
  yPercent: number; // 0 to 100 within timeline track (default 50)
  lon: number; // Real geographic longitude
  lat: number; // Real geographic latitude
  mapXPercent?: number; // fallback percent
  mapYPercent?: number; // fallback percent
  appearFrame: number; // frame at which event appears on map (frames 25–100)
};

export type IntervalSpec = {
  index: number;
  label: string; // e.g. "12:00", "Mon", etc.
  startTime?: string;
  endTime?: string;
  durationLabel?: string;
  densityType: 'sparse' | 'moderate' | 'dense';
  events: EventItem[];
};
