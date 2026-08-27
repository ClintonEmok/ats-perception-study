import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(resolve(root, 'data/manifest.json'), 'utf8'));
const datasetPath = process.env.DATASET_PATH
  ? resolve(root, process.env.DATASET_PATH)
  : resolve(root, 'data/sources', manifest.filename);

if (!existsSync(datasetPath)) {
  console.error(`Dataset not found: ${datasetPath}`);
  console.error(`Download the snapshot described by ${resolve(root, 'data/manifest.json')}.`);
  process.exit(1);
}

const hash = createHash('sha256');
let bytes = 0;
await new Promise((resolvePromise, reject) => {
  const stream = createReadStream(datasetPath);
  stream.on('data', (chunk) => {
    bytes += chunk.length;
    hash.update(chunk);
  });
  stream.on('error', reject);
  stream.on('end', resolvePromise);
});

const actualHash = hash.digest('hex');
const hashMatches = actualHash === manifest.sha256;
const sizeMatches = bytes === manifest.bytes;

console.log(`Dataset: ${datasetPath}`);
console.log(`Bytes:   ${bytes.toLocaleString()}${sizeMatches ? '' : ' (manifest mismatch)'}`);
console.log(`SHA-256: ${actualHash}${hashMatches ? '' : ' (manifest mismatch)'}`);

if (!hashMatches || !sizeMatches) {
  process.exit(1);
}

console.log('Dataset verification passed.');
