import { readFile, writeFile } from 'node:fs/promises';

const source = JSON.parse(await readFile('public/data/chicago-community-areas.geojson', 'utf8'));

const perpendicularDistance = (point, start, end) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const area = Math.abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]);
  return area / Math.hypot(dx, dy);
};

const simplify = (points, tolerance) => {
  if (points.length <= 3) return points;
  let maximumDistance = 0;
  let splitIndex = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], points[0], points[points.length - 1]);
    if (distance > maximumDistance) {
      maximumDistance = distance;
      splitIndex = index;
    }
  }
  if (maximumDistance <= tolerance) return [points[0], points[points.length - 1]];
  const before = simplify(points.slice(0, splitIndex + 1), tolerance);
  const after = simplify(points.slice(splitIndex), tolerance);
  return [...before.slice(0, -1), ...after];
};

const areas = source.features.flatMap((feature) => {
  const geometry = feature.geometry;
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  const rings = polygons
    .map((polygon) => polygon[0])
    .filter((ring) => Array.isArray(ring) && ring.length >= 4)
    .map((ring) => {
      const simplified = simplify(ring, 0.00045);
      const first = simplified[0];
      const last = simplified[simplified.length - 1];
      return first[0] === last[0] && first[1] === last[1] ? simplified : [...simplified, first];
    });
  if (rings.length === 0) return [];
  return [{
    name: String(feature.properties?.community ?? ''),
    number: String(feature.properties?.area_numbe ?? ''),
    rings,
  }];
});

await writeFile('video/data/chicago-community-areas.json', `${JSON.stringify({ areas })}\n`);
console.log(`Wrote ${areas.length} simplified Chicago community areas`);
