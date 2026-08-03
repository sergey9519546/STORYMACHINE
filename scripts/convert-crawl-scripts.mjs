// CRAWL-SCRIPT CONVERTER — converts the O:\.cluster\scripts-crawl-20260713
// collection (1224 files: HTML/MD/TXT/PDF) into clean Fountain for the
// STORYMACHINE benchmark corpus.
//
// Handles three input formats:
//   .html — IMSDb/DailyScript HTML wrapping screenplay text in <pre>...</pre>
//   .md   — markdown-extracted screenplay text (IMSDb .html.md files)
//   .txt  — DailyScript plain text (UTF-16LE encoded)
// PDFs are skipped (would require OCR; out of scope).
//
// Conversion strategy: extract the screenplay text, normalize to UTF-8,
// strip HTML/markdown wrappers, and write as .fountain. The analyzer's
// own normalizeScreenplay() handles double-spacing and hard-wrap joining
// at analysis time, so we don't need perfect Fountain here — just clean
// UTF-8 text with INT./EXT. scene headings intact.
//
// Run:  node scripts/convert-crawl-scripts.mjs
// Output: data/screenplays/crawl/<genre>/<name>.fountain + summary report

// Safety: SRC_BASE below is a maintainer-machine-only path, and the CSV
// report write at the end used to happen unconditionally — refusing only
// via a raw ENOENT crash on readdirSync if SRC_BASE didn't exist at all,
// and not at all if SRC_BASE existed but was empty/near-empty. It now
// checks SRC_BASE explicitly with a clear message, and refuses to shrink
// the committed conversion-report CSV by more than half unless --force is
// passed (see scripts/lib/output-guard.mjs header for the incident this
// class of guard responds to).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { formatCanonicalFountain } from '../server/nvm/analyze/canonical-fountain.ts';
import { requireCorpus, guardedWrite } from './lib/output-guard.mjs';

const SRC_BASE = 'O:/.cluster/scripts-crawl-20260713/DELIVERY/by-genre';
const DEST_BASE = 'data/screenplays/crawl';

if (!fs.existsSync(SRC_BASE)) {
  console.error(`ERROR: ${SRC_BASE} does not exist — refusing to run.`);
  console.error('This script requires the raw crawl delivery, which lives only on the maintainer machine that ran the crawl. Nothing was written.');
  process.exit(1);
}

// ── Format converters ─────────────────────────────────────────────────────

/** Read a file as UTF-8, detecting and converting UTF-16LE if needed. */
function readText(filePath) {
  const buf = fs.readFileSync(filePath);
  // UTF-16LE BOM: FF FE
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le');
  }
  // UTF-8 BOM: EF BB BF
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  // Heuristic: if every other byte is 0x00, it's probably UTF-16LE without BOM
  let nullCount = 0;
  const sample = buf.slice(0, Math.min(200, buf.length));
  for (let i = 1; i < sample.length; i += 2) {
    if (sample[i] === 0x00) nullCount++;
  }
  if (nullCount > sample.length / 4) {
    try { return buf.toString('utf16le'); } catch { /* fall through */ }
  }
  return buf.toString('utf8');
}

/** Decode common HTML entities to plain text. */
function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
          .replace(/<br\s*\/?>/gi, '\n');
}

/** Extract screenplay text from IMSDb/DailyScript HTML.
 *
 *  Two IMSDb HTML archetypes exist in the crawl:
 *
 *    1. <pre> wrapped (434/471 files): screenplay sits in a single <pre> block
 *       as preformatted text. Strip tags + decode entities → clean text.
 *
 *    2. Structured <p ID="..."> (25/471 files): screenplay is split across
 *       <p> tags whose ID attribute marks the structural role — slug (scene
 *       heading), act (action), speaker (character cue), dia (dialogue),
 *       spkdir (parenthetical), loc (sub-location). These carry the gold-
 *       standard structure, so we emit PERFECT Fountain: heading/cue/dialogue
 *       each on their own line with blank-line separators. This is the only
 *       path that doesn't need runtime normalization.
 */
function convertHtml(text) {
  // Path 2: structured <p ID="..."> — emit role-tagged Fountain directly.
  // Each <p ID="role">content</p> becomes a Fountain block. The ID→block map:
  //   slug/loc  → scene heading (emit verbatim, blank line after)
  //   speaker   → character cue (emit verbatim uppercase, NO blank after so
  //                the parser sees adjacent dialogue)
  //   spkdir    → parenthetical (emit in parens, no blank after)
  //   dia       → dialogue (emit verbatim, blank line after)
  //   act       → action (emit verbatim, blank line after)
  const idMatches = [...text.matchAll(/<p[^>]*\sID=["'](slug|loc|act|speaker|spkdir|dia|right)["'][^>]*>([\s\S]*?)<\/p>/gi)];
  if (idMatches.length >= 10) {
    const lines = [];
    let prevRole = null;
    for (const m of idMatches) {
      const role = m[1].toLowerCase();
      let content = decodeEntities(m[2]).replace(/<[^>]+>/g, '').trim();
      if (!content) continue;
      if (role === 'slug' || role === 'loc') {
        if (lines.length && lines[lines.length - 1] !== '') lines.push('');
        lines.push(content);
        lines.push('');
        prevRole = 'slug';
      } else if (role === 'speaker') {
        // Character cue: blank line before, NO blank after (dialogue must be adjacent)
        if (lines.length && lines[lines.length - 1] !== '') lines.push('');
        lines.push(content.toUpperCase());
        prevRole = 'speaker';
      } else if (role === 'spkdir') {
        // Parenthetical: no blank before/after (belongs inside dialogue)
        if (!content.startsWith('(')) content = '(' + content;
        if (!content.endsWith(')')) content = content + ')';
        lines.push(content);
        prevRole = 'spkdir';
      } else if (role === 'dia') {
        // Dialogue: emit adjacent to cue (no blank before), blank after
        lines.push(content);
        lines.push('');
        prevRole = 'dia';
      } else {
        // act / right / anything else: action
        if (prevRole === 'speaker' || prevRole === 'spkdir') lines.push(''); // close dangling cue
        if (lines.length && lines[lines.length - 1] !== '') lines.push('');
        lines.push(content);
        lines.push('');
        prevRole = 'act';
      }
    }
    const out = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (out.length > 1000) return out; // only use if we got real content
  }

  // Path 1: <pre> wrapped — strip tags + decode entities.
  const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) {
    let body = preMatch[1];
    body = body.replace(/<[^>]+>/g, '');
    body = decodeEntities(body);
    return body.trim();
  }
  // Fallback: strip all HTML tags.
  return decodeEntities(text.replace(/<script[\s\S]*?<\/script>/gi, '')
                            .replace(/<style[\s\S]*?<\/style>/gi, '')
                            .replace(/<[^>]+>/g, '')).trim();
}

/** Convert markdown-extracted script (.html.md) — mostly already text. */
function convertMd(text) {
  // Strip markdown headers/links but keep the body
  return text.replace(/^#+\s.*$/gm, '')        // markdown headers
             .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → text
             .replace(/^\s*---+\s*$/gm, '')     // horizontal rules
             .trim();
}

/** Extract text from a PDF via PyMuPDF (extracting-pdf-text skill).
 *  Returns the extracted text, or null if the PDF is scanned/image-only and
 *  would need OCR (out of scope for the deterministic corpus build).
 *  Sampled at 70% text-based / 30% image-only across the crawl collection. */
function convertPdf(filePath) {
  const scriptPath = path.join(process.cwd(), 'scripts', 'extract_pdf.py');
  try {
    const stdout = execFileSync('python', [scriptPath, filePath], {
      maxBuffer: 50 * 1024 * 1024,  // 50 MB — large PDFs
      encoding: 'utf-8',
    });
    if (stdout.startsWith('SKIP:')) return null;  // scanned/too-short
    return stdout;
  } catch (e) {
    return null;  // extraction error or python missing
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
const genres = fs.readdirSync(SRC_BASE).filter(d => {
  const stat = fs.statSync(path.join(SRC_BASE, d));
  return stat.isDirectory() && d !== 'ScriptSlug-PDFs';
});
requireCorpus(genres.length, { label: `${SRC_BASE} (genre subdirectories)` });

let totalConverted = 0, totalSkipped = 0, totalFailed = 0;
const results = [];

for (const genre of genres.sort()) {
  const genreDir = path.join(SRC_BASE, genre);
  const destDir = path.join(DEST_BASE, genre.toLowerCase());
  const files = fs.readdirSync(genreDir).filter(f =>
    f.endsWith('.html') || f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.pdf')
  );

  for (const file of files) {
    const srcPath = path.join(genreDir, file);
    let rawText, converted;
    try {
      if (file.endsWith('.pdf')) {
        converted = convertPdf(srcPath);
        if (converted === null) { totalSkipped++; continue; }  // scanned/image PDF
      } else {
        rawText = readText(srcPath);
        if (file.endsWith('.html')) converted = convertHtml(rawText);
        else if (file.endsWith('.md')) converted = convertMd(rawText);
        else converted = rawText; // .txt already screenplay text
      }
    } catch (e) {
      totalFailed++;
      continue;
    }

    // CANONICAL FOUNTAIN FORMATTING PASS — produce 100% clean Fountain from
    // whatever shape the source came in: clean, double-spaced, single-spaced
    // packed, or leading-tab indented. The formatter picks the best-scoring
    // of three repair strategies (never regresses) and writes that. This
    // means the corpus files are correct by construction, not by runtime
    // normalizeScreenplay() rescue at analysis time.
    const canonical = formatCanonicalFountain(converted);
    converted = canonical.text;

    // REAL-PIPELINE quality gate: run the actual analyzer. The previous naive
    // `^(INT\.|EXT\.)` regex rejected real scripts whose headings are indented
    // (e.g. "               EXT. PACIFIC OCEAN - DAY") or omit the INT./EXT.
    // prefix entirely (e.g. "PADUA HIGH SCHOOL - DAY"). The analyzer's
    // normalizeScreenplay() + parseFountain() handles these — that IS the gate.
    let sceneCount = 0, wordCount = 0, dialogueLines = 0;
    try {
      const a = analyzeFountainText(converted);
      sceneCount = a.sceneCount ?? 0;
      wordCount = a.wordCount ?? 0;
      dialogueLines = a.dialogueLineCount ?? 0;
    } catch (e) {
      totalFailed++;
      continue;
    }
    // Must parse to a real screenplay (>= 5 scenes, >= 500 words)
    if (sceneCount < 5 || wordCount < 500) {
      totalSkipped++;
      continue;
    }

    // Generate clean filename
    const baseName = file.replace(/\.(html|md|txt)$/, '')
                         .replace(/^\d{4}_/, '')   // strip year prefix
                         .replace(/^imsdb\.com-scripts-/, '')
                         .replace(/[^a-z0-9]+/gi, '-')
                         .replace(/^-+|-+$/g, '')
                         .toLowerCase()
                         .slice(0, 60);
    const destFile = path.join(destDir, `${baseName}.fountain`);

    // Check for duplicates (same baseName in same genre)
    if (fs.existsSync(destFile)) {
      totalSkipped++;
      continue;
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destFile, converted, 'utf8');

    results.push({ genre, file: `${baseName}.fountain`, sceneCount, wordCount, dialogueLines });
    totalConverted++;
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log('=== CRAWL-SCRIPT CONVERSION ===');
console.log(`Converted: ${totalConverted}  |  Skipped (low quality/dup): ${totalSkipped}  |  Failed: ${totalFailed}`);
console.log('');

// Genre breakdown
const byGenre = {};
for (const r of results) {
  if (!byGenre[r.genre]) byGenre[r.genre] = { count: 0, validScenes: 0 };
  byGenre[r.genre].count++;
  if (r.sceneCount >= 5) byGenre[r.genre].validScenes++;
}
console.log('By genre:');
for (const [g, s] of Object.entries(byGenre).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${g.padEnd(12)} ${String(s.count).padStart(4)} files, ${s.validScenes} with sceneCount>=5`);
}

// Parse quality
const valid = results.filter(r => r.sceneCount >= 5);
const broken = results.filter(r => r.sceneCount < 5);
console.log(`\nParse quality: ${valid.length} valid (sceneCount>=5), ${broken.length} parse-broken`);

// Write results CSV
const csv = 'genre,file,sceneCount,wordCount,dialogueLines\n' +
  results.map(r => `${r.genre},${r.file},${r.sceneCount},${r.wordCount},${r.dialogueLines}`).join('\n') + '\n';
guardedWrite('scripts/output/crawl-conversion-report.csv', csv, { rowCount: results.length });
