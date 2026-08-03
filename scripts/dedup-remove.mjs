// DEDUP REMOVAL — collapse the 226 content-fingerprint duplicate groups found
// by dedup-corpus.mjs down to ONE canonical file each.
//
// Strategy:
//   1. For each fingerprint group, rank candidates and keep the best one.
//      Ranking prefers (in order):
//        - non-crawl files over crawl files (existing corpus is canonical)
//        - then by byte size (larger = more complete script)
//        - then alphabetically (deterministic tiebreak)
//   2. Remove all other files in the group.
//   3. Report what was removed so the action is auditable.
//
// The crawl collection mirrors IMSDb's multi-genre tagging, so the same
// script appears in 2-4 genre folders. The genre folder assignment is NOT
// meaningful for scoring (a comedy can land in /horror/), so we do not try
// to pick the "right" genre — we just keep one copy.
// Safety: the removal-log write at the end used to happen unconditionally,
// even when data/screenplays/ was absent/near-empty locally (gather()
// already tolerates a missing dir by returning []) — which produced zero
// duplicate groups and silently overwrote the committed removal log with
// an empty one. It now refuses to run against a missing/empty corpus dir,
// and refuses to shrink the committed CSV by more than half unless --force
// is passed (see scripts/lib/output-guard.mjs header for the incident this
// class of guard responds to).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { requireCorpus, guardedWrite } from './lib/output-guard.mjs';

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
requireCorpus(all.length, {
  label: 'data/screenplays (non-output files)',
  hint: 'This script requires the private research corpus locally (see MEASUREMENT_RUNBOOK.md).',
});
const byFp = new Map();
for (const f of all) {
  let text;
  try { text = fs.readFileSync(f, 'utf-8'); } catch { continue; }
  const fp = fingerprint(text);
  if (!byFp.has(fp)) byFp.set(fp, []);
  byFp.get(fp).push(f);
}

const dupes = [...byFp.entries()].filter(([_, files]) => files.length > 1);
console.log(`Duplicate groups: ${dupes.length}`);

let removed = 0;
let removedCrawl = 0;
const removalLog = [];

for (const [fp, files] of dupes) {
  // Rank: non-crawl first, then larger size, then alphabetical
  const ranked = files.map(f => {
    const isCrawl = f.includes('crawl');
    const size = fs.statSync(f).size;
    return { file: f, isCrawl, size };
  }).sort((a, b) => {
    if (a.isCrawl !== b.isCrawl) return a.isCrawl ? 1 : -1; // non-crawl first
    if (b.size !== a.size) return b.size - a.size;          // larger first
    return a.file.localeCompare(b.file);                     // alpha tiebreak
  });

  const keep = ranked[0].file;
  const drop = ranked.slice(1).map(r => r.file);

  for (const f of drop) {
    fs.unlinkSync(f);
    removed++;
    if (f.includes('crawl')) removedCrawl++;
    removalLog.push({ fp, kept: path.basename(keep), removed: f.replace(/\\/g, '/').replace(/^data\/screenplays\//, '') });
  }
}

console.log(`Removed: ${removed} files (${removedCrawl} from crawl/)`);
console.log(`Remaining: ${all.length - removed} files`);
console.log('');

// Verify post-dedup
const postAll = gather('data/screenplays').filter(f => !f.includes('output'));
const postByFp = new Map();
for (const f of postAll) {
  let text;
  try { text = fs.readFileSync(f, 'utf-8'); } catch { continue; }
  const fp = fingerprint(text);
  if (!postByFp.has(fp)) postByFp.set(fp, []);
  postByFp.get(fp).push(f);
}
const postDupes = [...postByFp.entries()].filter(([_, files]) => files.length > 1);
console.log(`POST-DEDUP duplicate groups: ${postDupes.length} (must be 0)`);
if (postDupes.length > 0) {
  for (const [fp, files] of postDupes) {
    console.log(`  REMAINING [${fp}]:`);
    for (const f of files) console.log(`    ${f.replace(/\\/g,'/')}`);
  }
}

// Write removal log
const csv = 'fingerprint,kept,removed\n' +
  removalLog.map(r => `${r.fp},${r.kept},${r.removed}`).join('\n') + '\n';
guardedWrite('scripts/output/dedup-removal-log.csv', csv, { rowCount: removalLog.length });
