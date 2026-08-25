import fs from 'fs';
import https from 'https';
import path from 'path';
import sharp from 'sharp';
import { WebMercatorViewport } from '@math.gl/web-mercator';

const WIDTH = 1510;
const HEIGHT = 542;
const LONGITUDE = -87.68;
const LATITUDE = 41.83;
const ZOOM = 9.6;

const viewport = new WebMercatorViewport({
  width: WIDTH,
  height: HEIGHT,
  longitude: LONGITUDE,
  latitude: LATITUDE,
  zoom: ZOOM,
});

// Download a single tile buffer
function downloadTile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AdaptiveCubePresentation/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch tile ${url}, status: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function lon2tileFloat(lon, zoom) {
  return (lon + 180) / 360 * Math.pow(2, zoom);
}

function lat2tileFloat(lat, zoom) {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
}

async function main() {
  const nw = viewport.unproject([0, 0]);
  const se = viewport.unproject([WIDTH, HEIGHT]);

  const tileZoom = 11;
  const minTileX = Math.floor(lon2tileFloat(nw[0], tileZoom));
  const maxTileX = Math.floor(lon2tileFloat(se[0], tileZoom));
  const minTileY = Math.floor(lat2tileFloat(nw[1], tileZoom));
  const maxTileY = Math.floor(lat2tileFloat(se[1], tileZoom));

  const tilesX = maxTileX - minTileX + 1;
  const tilesY = maxTileY - minTileY + 1;
  const fullWidth = tilesX * 256;
  const fullHeight = tilesY * 256;

  console.log(`Downloading ${tilesX * tilesY} CARTO Positron tiles for Chicago (zoom ${tileZoom})...`);

  const composites = [];

  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const server = ['a', 'b', 'c', 'd'][(tx + ty) % 4];
      const url = `https://${server}.basemaps.cartocdn.com/light_all/${tileZoom}/${tx}/${ty}.png`;
      const buf = await downloadTile(url);
      composites.push({
        input: buf,
        left: (tx - minTileX) * 256,
        top: (ty - minTileY) * 256,
      });
    }
  }

  // Create base composite of full tiles
  const fullTileMap = await sharp({
    create: {
      width: fullWidth,
      height: fullHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  // Calculate the crop box in tileZoom coordinates
  // Top-left corner of viewport in tile pixel coords
  const nwTileX = lon2tileFloat(nw[0], tileZoom) * 256;
  const nwTileY = lat2tileFloat(nw[1], tileZoom) * 256;
  const originX = minTileX * 256;
  const originY = minTileY * 256;

  const cropLeft = Math.round(nwTileX - originX);
  const cropTop = Math.round(nwTileY - originY);

  const seTileX = lon2tileFloat(se[0], tileZoom) * 256;
  const seTileY = lat2tileFloat(se[1], tileZoom) * 256;
  const cropWidth = Math.round(seTileX - nwTileX);
  const cropHeight = Math.round(seTileY - nwTileY);

  console.log(`Cropping tile canvas (${cropWidth}x${cropHeight}) and resizing to (${WIDTH}x${HEIGHT})...`);

  const outDir = path.resolve('video/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'chicago-positron-basemap.png');

  await sharp(fullTileMap)
    .extract({
      left: Math.max(0, cropLeft),
      top: Math.max(0, cropTop),
      width: Math.min(cropWidth, fullWidth - Math.max(0, cropLeft)),
      height: Math.min(cropHeight, fullHeight - Math.max(0, cropTop)),
    })
    .resize(WIDTH, HEIGHT)
    .png({ quality: 100 })
    .toFile(outFile);

  fs.copyFileSync(outFile, path.resolve('public/chicago-positron-basemap.png'));
  console.log(`Saved flawless high-res basemap to ${outFile} and public/chicago-positron-basemap.png!`);
}

main().catch(console.error);
