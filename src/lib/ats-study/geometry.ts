export interface Domain {
  min: number;
  max: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface RugPoint extends Point {
  eventTime: number;
}

export interface BandRect {
  x: number;
  y: number;
  width: number;
  height: number;
  weight: number;
  index: number;
}

export function mapTimeToX(time: number, domain: Domain, width: number): number {
  const span = Math.max(1, domain.max - domain.min);
  return ((time - domain.min) / span) * width;
}

export function eventRugPoints(
  events: readonly number[],
  domain: Domain,
  size: Size,
  bandHeight: number,
): RugPoint[] {
  if (events.length === 0) return [];
  const rugHeight = size.height - bandHeight;
  const half = Math.max(1, rugHeight / 2);
  const sorted = [...events].sort((a, b) => a - b);
  return sorted
    .map((eventTime) => ({
      x: mapTimeToX(eventTime, domain, size.width),
      y: bandHeight + half,
      eventTime,
    }))
    .filter((point) => Number.isFinite(point.x));
}

export function bandsFromIntervals(
  intervals: ReadonlyArray<{ index: number; start: number; end: number; weight: number }>,
  domain: Domain,
  size: Size,
  bandHeight: number,
): BandRect[] {
  return intervals
    .map((interval) => {
      const x0 = mapTimeToX(interval.start, domain, size.width);
      const x1 = mapTimeToX(interval.end, domain, size.width);
      const width = Math.max(1, x1 - x0);
      return {
        index: interval.index,
        x: x0,
        y: 0,
        width,
        height: bandHeight,
        weight: interval.weight,
      };
    })
    .filter((band) => Number.isFinite(band.x) && Number.isFinite(band.width) && band.width > 0);
}
