// CRAWL INVENTORY — deep analysis of every file in the O:\ crawl collection.
// Reports: format, encoding, byte size, scene-heading count, word count,
// parseability, and dedup status. Produces a full CSV inventory.
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'O:/.cluster/scripts-crawl-20260713/DELIVERY/by-genre';
const OUT = 'scripts/output/crawl-inventory.csv';

function gatherFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...gatherFiles(full));
    else out.push(full);
  }
  return out;
}

function detectEncoding(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return 'utf-16le-bom';
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return 'utf-16be-bom';
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return 'utf-8-bom';
  // heuristic: lots of null bytes = UTF-16 without BOM
  let nulls = 0;
  for (let i = 1; i < Math.min(400, buf.length); i += 2) if (buf[i] === 0) nulls++;
  if (nulls > 80) return 'utf-16le-nobom';
  return 'utf-8';
}

function readText(filePath, buf) {
  const enc = detectEncoding(buf);
  if (enc.startsWith('utf-16')) {
    try { return { text: buf.toString('utf16le'), enc }; } catch { /* fall */ }
  }
  return { text: buf.toString('utf8'), enc };
}

function extractScreenplay(filePath, ext) {
  const buf = fs.readFileSync(filePath);
  const { text, enc } = readText(filePath, buf);
  let body = text;
  if (ext === '.html') {
    const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (preMatch) {
      body = preMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim();
    } else {
      body = text.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim();
    }
  } else if (ext === '.md') {
    body = text.replace(/^#+\s.*$/gm,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/^\s*---+\s*$/gm,'').trim();
  }
  return { body, enc };
}

const allFiles = gatherFiles(BASE).sort();
console.log(`Total files found: ${allFiles.length}`);
console.log('');

const rows = [];
const stats = { byExt: {}, byEnc: {}, byGenre: {}, convertible: 0, pdf: 0, lowQuality: 0 };

for (const filePath of allFiles) {
  const ext = path.extname(filePath).toLowerCase();
  const genre = path.basename(path.dirname(filePath));
  const name = path.basename(filePath);
  const size = fs.statSync(filePath).size;

  stats.byExt[ext] = (stats.byExt[ext] || 0) + 1;
  stats.byGenre[genre] = (stats.byGenre[genre] || 0) + 1;

  if (ext === '.pdf') {
    stats.pdf++;
    rows.push({ genre, name, ext, encoding: 'binary', size, headings: -1, words: -1, status: 'PDF-skip' });
    continue;
  }

  let body, enc;
  try {
    ({ body, enc } = extractScreenplay(filePath, ext));
  } catch (e) {
    rows.push({ genre, name, ext, encoding: 'error', size, headings: -1, words: -1, status: 'EXTRACT-FAIL' });
    continue;
  }

  stats.byEnc[enc] = (stats.byEnc[enc] || 0) + 1;

  const headings = (body.match(/^(INT\.|EXT\.|INT\/EXT\.|EST\.)/gim) || []).length;
  const words = body.split(/\s+/).filter(Boolean).length;

  let status;
  if (headings < 3) { status = 'low-headings'; stats.lowQuality++; }
  else if (words < 500) { status = 'too-short'; stats.lowQuality++; }
  else { status = 'convertible'; stats.convertible++; }

  rows.push({ genre, name, ext, encoding: enc, size, headings, words, status });
}

// Report
console.log('=== BY EXTENSION ===');
for (const [k, v] of Object.entries(stats.byExt).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log('');
console.log('=== BY ENCODING (text files only) ===');
for (const [k, v] of Object.entries(stats.byEnc).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log('');
console.log('=== BY GENRE ===');
for (const [k, v] of Object.entries(stats.byGenre).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log('');
console.log('=== CONVERTIBILITY ===');
console.log(`  Convertible (>=3 headings, >=500 words): ${stats.convertible}`);
console.log(`  PDF (need OCR/extraction):                ${stats.pdf}`);
console.log(`  Low quality (rejected):                   ${stats.lowQuality}`);
console.log('');

// Size distribution of convertible files
const convertible = rows.filter(r => r.status === 'convertible');
const sizes = convertible.map(r => r.words).sort((a, b) => a - b);
if (sizes.length > 0) {
  console.log('=== CONVERTIBLE WORD-COUNT DISTRIBUTION ===');
  console.log(`  min: ${sizes[0]}  |  median: ${sizes[Math.floor(sizes.length / 2)]}  |  max: ${sizes[sizes.length - 1]}`);
  console.log(`  <2000 words: ${sizes.filter(s => s < 2000).length}`);
  console.log(`  2000-10000:  ${sizes.filter(s => s >= 2000 && s < 10000).length}`);
  console.log(`  10000-20000: ${sizes.filter(s => s >= 10000 && s < 20000).length}`);
  console.log(`  >20000:      ${sizes.filter(s => s >= 20000).length}`);
}

// Heading distribution
const headings = convertible.map(r => r.headings).sort((a, b) => a - b);
if (headings.length > 0) {
  console.log('');
  console.log('=== CONVERTIBLE SCENE-HEADING DISTRIBUTION ===');
  console.log(`  min: ${headings[0]}  |  median: ${headings[Math.floor(headings.length / 2)]}  |  max: ${headings[headings.length - 1]}`);
}

// Write CSV
const header = 'genre,name,ext,encoding,size,headings,words,status';
const csv = header + '\n' + rows.map(r =>
  `${r.genre},${JSON.stringify(r.name)},${r.ext},${r.encoding},${r.size},${r.headings},${r.words},${r.status}`
).join('\n') + '\n';
fs.writeFileSync(OUT, csv, 'utf-8');
console.log(`\nWrote full inventory to ${OUT} (${rows.length} rows)`);
