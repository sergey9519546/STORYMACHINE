// CONTENT-HASH DEDUP — detect scripts that appear in both the existing
// corpus and the crawl, or appear multiple times within the crawl, even when
// the filenames differ. Uses a normalized-text fingerprint:
//   - lowercase, strip all whitespace and non-alphanumeric chars
//   - take first 4000 chars (scripts differ in their first few pages;
//     a full-hash would miss truncated-version dupes)
//   - SHA-256 of that prefix
// Reports any collisions so they can be reviewed/removed before the AUC
// split, since cross-partition duplicates would leak information.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function gather(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...gather(f));
    else out.push(f);
  }
  return out;
}

function fingerprint(text) {
  const norm = text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4000);
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

const all = gather('data/screenplays').filter(f => !f.includes('output'));
const byFp = new Map();

for (const f of all) {
  let text;
  try { text = fs.readFileSync(f, 'utf-8'); } catch { continue; }
  const fp = fingerprint(text);
  if (!byFp.has(fp)) byFp.set(fp, []);
  byFp.get(fp).push(f.replace(/\\/g, '/').replace(/^data\/screenplays\//, ''));
}

// Find collisions
const dupes = [...byFp.entries()].filter(([_, files]) => files.length > 1);
console.log('=== CONTENT-HASH DUPLICATES ===');
console.log(`Total files: ${all.length}  |  Unique fingerprints: ${byFp.size}  |  Collision groups: ${dupes.length}`);
console.log('');

if (dupes.length === 0) {
  console.log('No duplicates found — corpus is fully deduplicated.');
} else {
  for (const [fp, files] of dupes) {
    console.log(`[${fp}]`);
    for (const f of files) console.log(`  ${f}`);
  }
  console.log('');
  console.log('NOTE: For each group, keep one and remove the rest BEFORE re-splitting,');
  console.log('or the AUC measurement will leak between train/val/test partitions.');
}
