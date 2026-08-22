import { mkdir, writeFile } from 'node:fs/promises';

const startEpoch = Date.parse('2025-07-28T00:00:00Z') / 1000;
const endEpoch = Date.parse('2025-08-04T00:00:00Z') / 1000;
const endpoint = process.env.VIDEO_DATA_URL ?? 'http://127.0.0.1:3100';
const query = new URLSearchParams({
  startEpoch: String(startEpoch),
  endEpoch: String(endEpoch),
  bufferDays: '0',
  limit: '12000',
  pageSize: '12000',
  target: 'remotion-week',
});

const response = await fetch(`${endpoint}/api/crimes/range?${query}`);
if (!response.ok) {
  throw new Error(`Unable to load real weekly records: ${response.status}`);
}

const payload = await response.json();
const records = Array.isArray(payload.data) ? payload.data : [];
if (records.length === 0) {
  throw new Error('The selected real-data week returned no records.');
}

const normalizedRecords = records.map((record) => ({
    timestamp: Number(record.timestamp),
    type: String(record.type),
    lat: Number(record.lat),
    lon: Number(record.lon),
    x: Number(record.x),
    z: Number(record.z),
    district: String(record.district),
  }));

const output = {
  source: 'Chicago crime records',
  generatedAt: new Date().toISOString(),
  startEpoch,
  endEpoch,
  sourceRecordCount: records.length,
  records: normalizedRecords,
};

await mkdir('video/data', { recursive: true });
await writeFile('video/data/real-week.json', `${JSON.stringify(output)}\n`);
console.log(`Wrote all ${records.length} real records to video/data/real-week.json`);
