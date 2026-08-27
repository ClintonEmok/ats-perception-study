export const CHICAGO_BOUNDS = {
  west: -87.725,
  east: -87.605,
  north: 41.92,
  south: 41.835,
} as const;

export const SCENE_EXTENT = {
  minX: -48,
  maxX: 48,
  minZ: -48,
  maxZ: 48,
} as const;

export function mapChicagoToScene(lat: number, lon: number): [number, number] {
  const lonSpan = Math.max(1e-9, CHICAGO_BOUNDS.east - CHICAGO_BOUNDS.west);
  const latSpan = Math.max(1e-9, CHICAGO_BOUNDS.north - CHICAGO_BOUNDS.south);

  const normalizedX = (lon - CHICAGO_BOUNDS.west) / lonSpan;
  const normalizedZ = (CHICAGO_BOUNDS.north - lat) / latSpan;

  const x = SCENE_EXTENT.minX + normalizedX * (SCENE_EXTENT.maxX - SCENE_EXTENT.minX);
  const z = SCENE_EXTENT.minZ + normalizedZ * (SCENE_EXTENT.maxZ - SCENE_EXTENT.minZ);

  return [x, z];
}
