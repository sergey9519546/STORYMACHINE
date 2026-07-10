// Rulebook generator (ROADMAP.md §11, Run 15 — trust & publishing).
//
// Parses the 14 revision-pass files (server/nvm/revision/passes/*.ts) plus
// three adjacent extension points (doctor.ts's excellence detectors,
// cluster.ts's root-cause templates, genre-router.ts's genre-conditioned
// thresholds) and emits browsable docs under docs/rulebook/. This is a depth
// proof: a deterministic, regenerable listing of every rule the ~1,300+-rule
// pipeline actually contains, with as much attributable human context as the
// source comments honestly support.
//
// Extraction method (read this before trusting a "wave" number below):
// Every pass file opens with a contiguous leading comment block (verified: no
// code line appears before it in any of the 14 files) containing a "Wave N —
// Pass M: ..." founding line followed by zero or more "Wave N additions: ..."
// entries — the CLAUDE.md-mandated header line every wave commits alongside
// its 3 new rules. This script:
//   1. Slices that header block off from the rest of the file (first
//      non-comment, non-blank line ends it).
//   2. Splits it into per-wave entries at each line matching
//      `Wave <N> —` or `Wave <N> additions`.
//   3. For each entry, builds a whitespace-collapsed "compact" copy of its
//      text (comment markers stripped, all whitespace including newlines
//      removed) — this reconstructs rule-constant identifiers that wrap
//      across comment lines (always at an underscore, never mid-word, by
//      the file's own house style) without needing a real tokenizer.
//   4. For every `rule: 'RULE_NAME'` literal in the file body, searches
//      every wave entry's compact text for that exact identifier and
//      attributes the rule to the LOWEST-numbered entry that contains it
//      (a rule can only be cross-referenced by LATER waves citing its own
//      earlier introduction — e.g. "distinct from X (Wave 1092)" — so the
//      minimum matching wave is always the true introduction, never a
//      forward reference).
//   5. Rules whose name never appears in ANY wave-header entry (common for
//      waves before the "Wave N additions:" convention hardened, or for
//      prose that describes checks descriptively — "talking heads" — rather
//      than by constant name) are listed separately, honestly, as
//      "unattributed" rather than guessed into a wave they were never named
//      in.
//
// This is a best-effort textual extraction, not a semantic parse of the
// TypeScript AST — it is deliberately conservative: nothing is invented, and
// every rule that cannot be cleanly mapped to a wave says so instead of
// guessing.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export const PASSES_DIR = path.join(REPO_ROOT, 'server/nvm/revision/passes');
export const DOCTOR_FILE = path.join(REPO_ROOT, 'server/nvm/analyze/doctor.ts');
export const CLUSTER_FILE = path.join(REPO_ROOT, 'server/nvm/analyze/cluster.ts');
export const GENRE_FILE = path.join(REPO_ROOT, 'server/lib/genre-router.ts');
export const OUT_DIR = path.join(REPO_ROOT, 'docs/rulebook');

// ── Shared textual-extraction primitives ────────────────────────────────────

const WAVE_HEADER_RE = /^\/\/\s*Wave (\d+)(?:\s+—|\s+additions\b)/;
const RULE_LITERAL_RE = /rule:\s*'([A-Z][A-Z0-9_]*)'/g;
const SECTION_TITLE_RE = /^\s*\/\/\s*──\s*(.+?)\s*──+\s*$/;

function stripCommentMarker(line: string): string {
  return line
    .replace(/^\s*\/\/\s?/, '')
    .replace(/^\s*\*\/?\s?/, '')
    .replace(/^\s*\/\*\*?\s?/, '')
    // Trailing JSDoc close ("... last words. */") when it shares a line with
    // content rather than sitting on its own line.
    .replace(/\s*\*\/\s*$/, '')
    // Decorative box-drawing rules ("── Title ──────") are separators, never
    // semantic content — strip them wherever they appear on the line.
    .replace(/─+/g, '')
    .trim();
}

/** Join stripped comment lines into readable prose WITHOUT inserting a space
 *  at a mid-identifier wrap point. The codebase's own house style only wraps
 *  a long comment line at an underscore inside a rule-constant name (never
 *  mid-word otherwise), so "line ends with '_'" is a reliable, cheap signal
 *  that the next line continues the same identifier rather than starting a
 *  new sentence/clause — joining those two with a plain space would corrupt
 *  the constant name in the rendered doc (e.g. "DIALOGUE_ REVELATION_..."). */
function smartJoin(strippedLines: string[]): string {
  let out = '';
  for (const raw of strippedLines) {
    const t = raw.trim();
    if (t === '') continue;
    if (out === '') { out = t; continue; }
    // '_' always means "mid-identifier wrap, no space". A single trailing
    // '-' means a hyphenated-word wrap ("relationshipShifts-\nmagnitude");
    // a trailing '--' is the codebase's own em-dash substitute (a real
    // punctuation break, e.g. "triggers --\nneither...") and must keep its
    // space, so it's deliberately excluded from the no-space case.
    const continuesIdentifier = out.endsWith('_') || (out.endsWith('-') && !out.endsWith('--'));
    out += continuesIdentifier ? t : ' ' + t;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Index (0-based, exclusive) of the first non-comment, non-blank line — the
 *  end of a file's leading header comment block. */
function findHeaderEnd(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '') continue;
    if (t.startsWith('//')) continue;
    return i;
  }
  return lines.length;
}

export interface WaveEntry {
  wave: number;
  /** Human-readable, space-joined prose for this wave's header entry. */
  display: string;
  /** Whitespace-collapsed copy of the same text, for identifier matching. */
  compact: string;
}

/** Split a file's leading header block into per-wave entries. */
function parseWaveEntries(lines: string[], headerEnd: number): WaveEntry[] {
  const markerLines: Array<{ idx: number; wave: number }> = [];
  for (let i = 0; i < headerEnd; i++) {
    const m = WAVE_HEADER_RE.exec(lines[i]);
    if (m) markerLines.push({ idx: i, wave: parseInt(m[1], 10) });
  }

  const entries: WaveEntry[] = [];
  for (let i = 0; i < markerLines.length; i++) {
    const start = markerLines[i].idx;
    const end = i + 1 < markerLines.length ? markerLines[i + 1].idx : headerEnd;
    const raw = lines.slice(start, end).map(stripCommentMarker);
    const display = smartJoin(raw);
    const compact = raw.join('').replace(/\s+/g, '');
    entries.push({ wave: markerLines[i].wave, display, compact });
  }
  return entries;
}

/** All "── Section title ──" line positions in a file, for nearest-preceding
 *  lookup against a given rule's source line. Best-available per-check
 *  context when a rule isn't individually named in the wave-header prose. */
function parseSectionTitles(lines: string[]): Array<{ line: number; title: string }> {
  const out: Array<{ line: number; title: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = SECTION_TITLE_RE.exec(lines[i]);
    if (m) out.push({ line: i, title: m[1].trim() });
  }
  return out;
}

function nearestSectionTitle(
  titles: Array<{ line: number; title: string }>, ruleLine: number,
): string | null {
  let best: string | null = null;
  for (const t of titles) {
    if (t.line < ruleLine) best = t.title;
    else break;
  }
  return best;
}

/** From `startIdx` (a "// Wave N additions (...)" marker line), how far a
 *  contiguous "//"-style comment paragraph extends, capped at `maxIdx`
 *  (typically the next marker, so two adjacent wave blocks with no code
 *  between them never bleed into each other). A blank line is tolerated as a
 *  paragraph break WITHIN the block only if the next non-blank line is also
 *  a "//" comment; a blank line followed by anything else (a `/**` doc
 *  block, real code, or end of file) ends the span. This is what keeps the
 *  extracted "wave prose" to the marker's own header comment — never the
 *  code, JSDoc, or function bodies that follow it. */
function forwardCommentSpan(lines: string[], startIdx: number, maxIdx: number): number {
  let i = startIdx;
  let end = startIdx;
  while (i < maxIdx) {
    const t = lines[i].trim();
    if (t.startsWith('//')) { end = i + 1; i++; continue; }
    if (t === '') {
      let j = i + 1;
      while (j < maxIdx && lines[j].trim() === '') j++;
      if (j < maxIdx && lines[j].trim().startsWith('//')) { i = j; continue; }
      break;
    }
    break;
  }
  return end;
}

interface InlineWaveMarker {
  /** 0-based line index of the marker itself. */
  line: number;
  wave: number;
  /** The marker's own header-comment prose — never code past it. */
  display: string;
}

/** Find every line matching `markerRe` (a "// ... Wave N additions (Program
 *  v2, Type K ...) ..." style header) and extract just its own comment
 *  paragraph as `display`, bounded by whichever comes first: the next
 *  marker, or the end of the "//"-style comment run. Shared by the
 *  excellence/root-cause/genre extractors below — all three follow the same
 *  house style for their Program v2 wave headers. */
function parseInlineWaveMarkers(lines: string[], markerRe: RegExp): InlineWaveMarker[] {
  const markers: Array<{ line: number; wave: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = markerRe.exec(lines[i]);
    if (m) markers.push({ line: i, wave: parseInt(m[1], 10) });
  }
  return markers.map((mk, idx) => {
    const hardEnd = markers[idx + 1]?.line ?? lines.length;
    const commentEnd = forwardCommentSpan(lines, mk.line, hardEnd);
    const raw = lines.slice(mk.line, commentEnd).map(stripCommentMarker);
    return { line: mk.line, wave: mk.wave, display: smartJoin(raw) };
  });
}

function nearestMarkerFor(markers: InlineWaveMarker[], line: number): InlineWaveMarker | null {
  let best: InlineWaveMarker | null = null;
  for (const mk of markers) {
    if (mk.line <= line) best = mk;
    else break;
  }
  return best;
}

// ── Deliverable 1: per-pass rule extraction ─────────────────────────────────

export interface RuleRecord {
  rule: string;
  pass: string;
  /** Lowest wave number whose header prose names this rule; null if never
   *  found in any wave-header entry (see module comment). */
  wave: number | null;
  /** The matching wave entry's full prose, when `wave` is non-null. */
  waveProse: string | null;
  /** Nearest preceding "── Title ──" section comment, when one exists. */
  sectionTitle: string | null;
  /** First source line (1-based) this rule constant appears on. */
  line: number;
}

export interface PassExtraction {
  pass: string;
  file: string;
  /** The wave named on the file's very first header line ("Wave N — Pass M: ..."). */
  foundingWave: number | null;
  rules: RuleRecord[];
}

/** Core parse: one pass file's distinct rules, each attributed to its best
 *  identifiable wave + prose. Exported for tests/core/rulebook.test.ts's
 *  freshness check — it imports this directly rather than shelling out to
 *  the CLI, so the test asserts the same live data the generator would. */
export function extractPassFile(filePath: string): PassExtraction {
  const pass = path.basename(filePath, '.ts');
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');

  const headerEnd = findHeaderEnd(lines);
  const waveEntries = parseWaveEntries(lines, headerEnd);
  const sectionTitles = parseSectionTitles(lines);
  const foundingWave = waveEntries.length > 0 ? waveEntries[0].wave : null;

  // First source line (0-based) each distinct rule name appears on, and
  // dedupe by name — the same rule constant is often pushed from more than
  // one branch/guard within a pass (see module comment: this is normal).
  const firstLineByRule = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    RULE_LITERAL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = RULE_LITERAL_RE.exec(lines[i]))) {
      if (!firstLineByRule.has(m[1])) firstLineByRule.set(m[1], i);
    }
  }

  const rules: RuleRecord[] = [];
  for (const [rule, lineIdx] of firstLineByRule) {
    let wave: number | null = null;
    let waveProse: string | null = null;
    for (const entry of waveEntries) {
      if (entry.compact.includes(rule)) {
        if (wave === null || entry.wave < wave) {
          wave = entry.wave;
          waveProse = entry.display;
        }
      }
    }
    const sectionTitle = nearestSectionTitle(sectionTitles, lineIdx);
    rules.push({ rule, pass, wave, waveProse, sectionTitle, line: lineIdx + 1 });
  }

  // Deterministic ordering: rule name, ascending — stable regardless of
  // Map iteration order or future insertions.
  rules.sort((a, b) => a.rule.localeCompare(b.rule));

  return { pass, file: filePath, foundingWave, rules };
}

/** All 14 pass files (types.ts excluded — it has no `rule:` literals; it's
 *  the shared type contract, not a pass), in stable alphabetical order. */
export function listPassFiles(passesDir: string = PASSES_DIR): string[] {
  return readdirSync(passesDir)
    .filter(f => f.endsWith('.ts') && f !== 'types.ts')
    .sort()
    .map(f => path.join(passesDir, f));
}

export function extractAllPasses(passesDir: string = PASSES_DIR): PassExtraction[] {
  return listPassFiles(passesDir).map(extractPassFile);
}

// ── Deliverable: excellence detectors (doctor.ts buildStrengths) ───────────

export interface ExcellenceDetector {
  functionName: string;
  wave: number | null;
  waveProse: string | null;
  doc: string;
  line: number;
}

const TYPE2_MARKER_RE = /Wave (\d+) additions \(Program v2, Type 2/;

export function extractExcellenceDetectors(filePath: string = DOCTOR_FILE): ExcellenceDetector[] {
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');

  const markers = parseInlineWaveMarkers(lines, TYPE2_MARKER_RE);

  const detectors: ExcellenceDetector[] = [];
  const fnRe = /^function (build\w+Strength)\(/;
  for (let i = 0; i < lines.length; i++) {
    const m = fnRe.exec(lines[i]);
    if (!m) continue;
    const doc = commentBlockAbove(lines, i).map(stripCommentMarker).join(' ').replace(/\s+/g, ' ').trim();
    const p = nearestMarkerFor(markers, i);
    detectors.push({
      functionName: m[1],
      wave: p?.wave ?? null,
      waveProse: p?.display ?? null,
      doc,
      line: i + 1,
    });
  }
  detectors.sort((a, b) => a.functionName.localeCompare(b.functionName));
  return detectors;
}

/** Contiguous comment lines directly above `targetLineIdx` (no blank-line
 *  gap), in source order. Used for both // line-comment and block /** *\/
 *  comments above a function/constant declaration. */
function commentBlockAbove(lines: string[], targetLineIdx: number): string[] {
  let i = targetLineIdx - 1;
  const collected: string[] = [];
  while (i >= 0) {
    const t = lines[i].trim();
    if (t === '') break;
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) {
      collected.unshift(lines[i]);
      i--;
      continue;
    }
    break;
  }
  return collected;
}

// ── Deliverable: root-cause templates (cluster.ts) ──────────────────────────

export interface RootCauseTemplateInfo {
  id: string;
  requiredRules: string[];
  title: string;
  wave: number | null;
  waveProse: string | null;
  line: number;
}

const TYPE4_MARKER_RE = /Wave (\d+) additions \(Program v2, Type 4/;

export function extractRootCauseTemplates(filePath: string = CLUSTER_FILE): RootCauseTemplateInfo[] {
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');

  const markers = parseInlineWaveMarkers(lines, TYPE4_MARKER_RE);

  const templates: RootCauseTemplateInfo[] = [];
  const idRe = /^\s*id:\s*'([^']+)'/;
  for (let i = 0; i < lines.length; i++) {
    const m = idRe.exec(lines[i]);
    if (!m) continue;
    // requiredRules and title are the following two fields in the same
    // object literal (fixed shape — see the RootCauseTemplate interface in
    // cluster.ts).
    let requiredRules: string[] = [];
    let title = '';
    for (let j = i; j < Math.min(i + 6, lines.length); j++) {
      const rr = /requiredRules:\s*\[([^\]]*)\]/.exec(lines[j]);
      if (rr) requiredRules = rr[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
      // Title is single-quoted normally, but double-quoted wherever the text
      // itself contains an apostrophe (e.g. "Consequences don't land").
      const tt = /title:\s*'([^']*)'/.exec(lines[j]) ?? /title:\s*"([^"]*)"/.exec(lines[j]);
      if (tt) title = tt[1];
    }
    const w = nearestMarkerFor(markers, i);
    templates.push({
      id: m[1], requiredRules, title,
      wave: w?.wave ?? null, waveProse: w?.display ?? null,
      line: i + 1,
    });
  }
  templates.sort((a, b) => a.id.localeCompare(b.id));
  return templates;
}

// ── Deliverable: genre-conditioned rule modifiers (genre-router.ts) ────────

export interface GenreModifierInfo {
  genre: string;
  fields: Array<{ field: string; value: string }>;
  rationale: string;
  wave: number | null;
  waveProse: string | null;
  line: number;
}

const TYPE3_MARKER_RE = /Wave (\d+) additions \(Program v2, Type 3/;

export function extractGenreModifiers(filePath: string = GENRE_FILE): GenreModifierInfo[] {
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');

  const markers = parseInlineWaveMarkers(lines, TYPE3_MARKER_RE);

  const objStart = lines.findIndex(l => /^export const GENRE_RULE_MODIFIERS/.test(l));
  if (objStart < 0) return [];

  const results: GenreModifierInfo[] = [];
  // Depth-tracked scan for top-level `genreName: {` blocks within the
  // GENRE_RULE_MODIFIERS object literal.
  let depth = 0;
  let i = objStart;
  for (; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { i = lines.length; break; } }
    }
    if (depth === 0 && i !== objStart) break;
  }
  const objEnd = i;

  const keyRe = /^\s{2}(\w+):\s*\{/;
  let j = objStart + 1;
  while (j < objEnd) {
    const km = keyRe.exec(lines[j]);
    if (km) {
      const genre = km[1];
      const rationale = commentBlockAbove(lines, j).map(stripCommentMarker).join(' ').replace(/\s+/g, ' ').trim();
      const fields: Array<{ field: string; value: string }> = [];
      let k = j + 1;
      while (k < objEnd && !/^\s{2}\},?/.test(lines[k])) {
        const fm = /^\s*(\w+):\s*([\d.]+),?/.exec(lines[k]);
        if (fm) fields.push({ field: fm[1], value: fm[2] });
        k++;
      }
      const w = nearestMarkerFor(markers, j);
      results.push({
        genre, fields, rationale,
        wave: w?.wave ?? null, waveProse: w?.display ?? null,
        line: j + 1,
      });
      j = k;
    } else {
      j++;
    }
  }
  results.sort((a, b) => a.genre.localeCompare(b.genre));
  return results;
}

// ── Doc rendering ────────────────────────────────────────────────────────

function eraOf(rule: RuleRecord, foundingWave: number | null): string {
  if (rule.wave === null) return 'unattributed';
  if (foundingWave !== null && rule.wave === foundingWave) return 'founding';
  if (rule.wave >= 1182) return 'program-v2';
  return 'program-v1';
}

function renderPassDoc(extraction: PassExtraction): string {
  const { pass, foundingWave, rules } = extraction;
  const byWave = new Map<number, RuleRecord[]>();
  const unattributed: RuleRecord[] = [];
  for (const r of rules) {
    if (r.wave === null) { unattributed.push(r); continue; }
    const arr = byWave.get(r.wave) ?? [];
    arr.push(r);
    byWave.set(r.wave, arr);
  }

  const waves = [...byWave.keys()].sort((a, b) => b - a); // newest first

  const lines: string[] = [];
  lines.push(`# Pass: \`${pass}\``);
  lines.push('');
  lines.push(`Founding wave: ${foundingWave ?? 'unknown'}. Total distinct rules: ${rules.length} ` +
    `(${rules.length - unattributed.length} attributed to a specific wave, ${unattributed.length} unattributed — see docs/rulebook/README.md's methodology note).`);
  lines.push('');

  for (const wave of waves) {
    const groupRules = byWave.get(wave)!.slice().sort((a, b) => a.rule.localeCompare(b.rule));
    lines.push(`## Wave ${wave}`);
    lines.push('');
    lines.push(groupRules[0].waveProse ?? '');
    lines.push('');
    lines.push('Rules named in this wave\'s header:');
    lines.push('');
    // Note: sectionTitle is deliberately NOT shown alongside a wave-
    // attributed rule — a rule's nearest preceding "── Title ──" comment can
    // predate the rule's own wave by hundreds of waves (a broad, reused code-
    // region label, not a per-rule one) and displaying it next to a specific
    // wave number here would read as a contradiction rather than context.
    // The wave's own prose above is the authoritative context in this case.
    for (const r of groupRules) {
      lines.push(`- \`${r.rule}\``);
    }
    lines.push('');
  }

  if (unattributed.length > 0) {
    lines.push('## Unattributed (no explicit wave-header mention)');
    lines.push('');
    lines.push(
      'These rule constants exist in this pass but were not found, by exact-name ' +
      'match, inside any "Wave N —" / "Wave N additions:" header entry in the ' +
      'file — typically because they predate that convention hardening, or the ' +
      'header describes the check descriptively rather than by constant name ' +
      '(e.g. "talking heads" rather than `TALKING_HEADS`). Listed here honestly ' +
      'rather than guessed into a wave, with the nearest preceding in-code ' +
      '"── section title ──" comment as the best-available substitute context ' +
      'where one exists.',
    );
    lines.push('');
    for (const r of unattributed.slice().sort((a, b) => a.rule.localeCompare(b.rule))) {
      const label = r.sectionTitle ? ` — ${r.sectionTitle}` : '';
      lines.push(`- \`${r.rule}\`${label}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderReadme(extractions: PassExtraction[]): { markdown: string; totalRules: number } {
  const totalRules = extractions.reduce((s, e) => s + e.rules.length, 0);

  const eraCounts = { founding: 0, 'program-v1': 0, 'program-v2': 0, unattributed: 0 } as Record<string, number>;
  for (const e of extractions) {
    for (const r of e.rules) eraCounts[eraOf(r, e.foundingWave)]++;
  }

  const lines: string[] = [];
  lines.push('# STORYMACHINE Rulebook');
  lines.push('');
  lines.push(
    'This is the full, generated rule catalog behind the Script Doctor\'s 14-pass ' +
    'revision engine — every deterministic craft check the pipeline runs, grouped ' +
    'by pass and by the wave that added it, with the human context the source ' +
    'comments actually support. No LLM is involved in producing a single finding ' +
    'this catalog describes: every rule below is a pure function of the parsed ' +
    'screenplay, fire-tested and no-fire-tested in `tests/passes/*.test.ts`, and ' +
    'governed end-to-end by `server/nvm/revision/WAVE_QUALITY_GUARANTEE.md`\'s ' +
    'binding per-wave acceptance checklist (exhaustive distinctness, complete ' +
    'guard conditions, symmetric fire/no-fire test coverage, and craft-grade ' +
    'authoring — never "good enough").',
  );
  lines.push('');
  lines.push(
    `**Total distinct rules: ${totalRules}** across the 14 revision passes ` +
    '(rule identity here is `(pass, rule-constant-name)` — a small number of ' +
    'names recur across two different passes, each with its own independent ' +
    'implementation and guard, and are counted once per owning pass, matching ' +
    'how the codebase itself scopes a rule).',
  );
  lines.push('');
  lines.push('This file, and everything else under `docs/rulebook/`, is generated by ' +
    '`scripts/generate-rulebook.ts` (`npm run rulebook`) directly from the live ' +
    'pass files — never hand-maintained. Regenerating after a wave lands is ' +
    'idempotent (a no-op diff) until the next wave actually changes something.');
  lines.push('');
  lines.push('## Rule counts per pass');
  lines.push('');
  lines.push('| Pass | Rules | Founding wave | Attributed | Unattributed |');
  lines.push('|---|---|---|---|---|');
  for (const e of extractions.slice().sort((a, b) => a.pass.localeCompare(b.pass))) {
    const unattr = e.rules.filter(r => r.wave === null).length;
    lines.push(`| [\`${e.pass}\`](./${e.pass}.md) | ${e.rules.length} | ${e.foundingWave ?? 'unknown'} | ${e.rules.length - unattr} | ${unattr} |`);
  }
  lines.push('');
  lines.push('## Rule counts per wave-era');
  lines.push('');
  lines.push(
    'Program v1 (waves after a pass\'s own founding wave, through the closed ' +
    'signals × modes × positions matrix rotation ending at Wave 1181) vs. ' +
    'Program v2 (Wave 1182 onward: signal channels, excellence detectors, ' +
    'genre-conditioned variants, root-cause templates — see ' +
    '`server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` §"Program v2"). ' +
    '"Founding" counts each pass\'s original wave-of-creation rules; ' +
    '"Unattributed" is the honest residual described above.',
  );
  lines.push('');
  lines.push('| Era | Rules |');
  lines.push('|---|---|');
  lines.push(`| Founding | ${eraCounts.founding} |`);
  lines.push(`| Program v1 rotation | ${eraCounts['program-v1']} |`);
  lines.push(`| Program v2 (signal / excellence / genre / root-cause) | ${eraCounts['program-v2']} |`);
  lines.push(`| Unattributed | ${eraCounts.unattributed} |`);
  lines.push('');
  lines.push('## Also in this rulebook');
  lines.push('');
  lines.push('- [`excellence.md`](./excellence.md) — the earned-strengths detectors ' +
    '(`buildStrengths` in `server/nvm/analyze/doctor.ts`), the positive-finding ' +
    'counterpart to the defect rules above.');
  lines.push('- [`root-causes.md`](./root-causes.md) — named co-occurrence templates ' +
    '(`server/nvm/analyze/cluster.ts`) that convert recurring symptom clusters ' +
    'into one plain-language diagnosis instead of several unrelated-looking hits.');
  lines.push('- [`genre.md`](./genre.md) — genre-conditioned thresholds ' +
    '(`GENRE_RULE_MODIFIERS` in `server/lib/genre-router.ts`) for the small set ' +
    'of generic rules where a genre legitimately moves the bar.');
  lines.push('');
  lines.push('## Methodology and honest limits');
  lines.push('');
  lines.push(
    'Wave attribution is textual, not a TypeScript AST parse: every pass file ' +
    'opens with a leading comment block naming its founding wave ("Wave N — ' +
    'Pass M: ...") and each subsequent "Wave N additions: ..." entry the ' +
    'CLAUDE.md wave discipline requires. A rule is attributed to the lowest- ' +
    'numbered wave entry whose text contains its exact constant name (later ' +
    'waves cite earlier rules by name as distinctness rationale — e.g. ' +
    '"distinct from X (Wave 1092)" — never the reverse, so the minimum match ' +
    'is always the true introduction). Rules whose constant name was never ' +
    'written into any wave-header entry — common for earlier waves, which often ' +
    'described a check descriptively ("talking heads") rather than by its ' +
    'constant name — are listed as unattributed rather than guessed. See ' +
    'this script\'s own header comment (`scripts/generate-rulebook.ts`) for the ' +
    'full algorithm.',
  );
  lines.push('');

  return { markdown: lines.join('\n'), totalRules };
}

function renderExcellenceDoc(detectors: ExcellenceDetector[]): string {
  const byWave = new Map<number, ExcellenceDetector[]>();
  const unattributed: ExcellenceDetector[] = [];
  for (const d of detectors) {
    if (d.wave === null) { unattributed.push(d); continue; }
    const arr = byWave.get(d.wave) ?? [];
    arr.push(d);
    byWave.set(d.wave, arr);
  }
  const waves = [...byWave.keys()].sort((a, b) => b - a);

  const lines: string[] = [];
  lines.push('# Excellence Detectors');
  lines.push('');
  lines.push(
    'Program v2 Type 2 rules: checks that detect what a script does WELL, ' +
    'feeding `buildStrengths`\' earned-strengths surface (`server/nvm/analyze/' +
    'doctor.ts`) rather than the defect issue list. The never-padded ' +
    'discipline is the binding acceptance bar here (see ' +
    '`server/nvm/revision/WAVE_QUALITY_GUARANTEE.md` §"Program v2" Type 2): ' +
    'a detector that fires on merely competent, unremarkable input is a ' +
    'FAILING detector, not a lenient one — each guard below documents the ' +
    'calibration-corpus evidence (`server/nvm/analyze/calibration/corpus.ts`) ' +
    'that separates it from the corpus\'s deliberately competent-but-' +
    'unremarkable band.',
  );
  lines.push('');
  for (const wave of waves) {
    lines.push(`## Wave ${wave}`);
    lines.push('');
    lines.push(byWave.get(wave)![0].waveProse ?? '');
    lines.push('');
    for (const d of byWave.get(wave)!.slice().sort((a, b) => a.functionName.localeCompare(b.functionName))) {
      lines.push(`### \`${d.functionName}\``);
      lines.push('');
      lines.push(d.doc || '_(no adjacent doc comment found)_');
      lines.push('');
    }
  }
  if (unattributed.length > 0) {
    lines.push('## Unattributed');
    lines.push('');
    for (const d of unattributed) {
      lines.push(`### \`${d.functionName}\``);
      lines.push('');
      lines.push(d.doc || '_(no adjacent doc comment found)_');
      lines.push('');
    }
  }
  return lines.join('\n');
}

function renderRootCausesDoc(templates: RootCauseTemplateInfo[]): string {
  const byWave = new Map<number, RootCauseTemplateInfo[]>();
  const unattributed: RootCauseTemplateInfo[] = [];
  for (const t of templates) {
    if (t.wave === null) { unattributed.push(t); continue; }
    const arr = byWave.get(t.wave) ?? [];
    arr.push(t);
    byWave.set(t.wave, arr);
  }
  const waves = [...byWave.keys()].sort((a, b) => b - a);

  const lines: string[] = [];
  lines.push('# Root-Cause Templates');
  lines.push('');
  lines.push(
    'Program v2 Type 4 rules: named, plain-language diagnoses for co-occurrence ' +
    'clusters that are always the SAME underlying craft wound wearing two rule- ' +
    'name hats, not a coincidence (`server/nvm/analyze/cluster.ts`). A template ' +
    'runs before the three generic clustering mechanisms and claims its matching ' +
    'issues first, so the flat issue list never double-reports the same wound ' +
    'as an unnamed generic cluster too. Each was chosen from measured rule-pair ' +
    'co-occurrence and spatial overlap evidence across the 20-sample calibration ' +
    'corpus, not intuition — see the wave commit history cited in ' +
    '`cluster.ts`\'s own header for the full top-pairs tables.',
  );
  lines.push('');
  for (const wave of waves) {
    lines.push(`## Wave ${wave}`);
    lines.push('');
    lines.push(byWave.get(wave)![0].waveProse ?? '');
    lines.push('');
    for (const t of byWave.get(wave)!.slice().sort((a, b) => a.id.localeCompare(b.id))) {
      lines.push(`### ${t.title} (\`${t.id}\`)`);
      lines.push('');
      lines.push(`Requires: ${t.requiredRules.map(r => `\`${r}\``).join(' + ')}`);
      lines.push('');
    }
  }
  if (unattributed.length > 0) {
    lines.push('## Unattributed');
    lines.push('');
    for (const t of unattributed) {
      lines.push(`### ${t.title} (\`${t.id}\`)`);
      lines.push('');
      lines.push(`Requires: ${t.requiredRules.map(r => `\`${r}\``).join(' + ')}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

function renderGenreDoc(modifiers: GenreModifierInfo[]): string {
  const byWave = new Map<number, GenreModifierInfo[]>();
  const unattributed: GenreModifierInfo[] = [];
  for (const g of modifiers) {
    if (g.wave === null) { unattributed.push(g); continue; }
    const arr = byWave.get(g.wave) ?? [];
    arr.push(g);
    byWave.set(g.wave, arr);
  }
  const waves = [...byWave.keys()].sort((a, b) => b - a);

  const lines: string[] = [];
  lines.push('# Genre-Conditioned Rule Modifiers');
  lines.push('');
  lines.push(
    'Program v2 Type 3 rules: a small set of high-firing generic checks whose ' +
    'THRESHOLD (not existence) legitimately moves per genre, via ' +
    '`GENRE_RULE_MODIFIERS` in `server/lib/genre-router.ts`. A genre with no ' +
    'live modifier for a given rule falls through to that rule\'s own generic ' +
    'constant — so `storyContext.genre` being absent, unknown, or simply not ' +
    'listed is always byte-identical to the pre-Wave-1184 behavior. Never used ' +
    'to quiet a rule for everyone; only to make a guard fire on genuinely ' +
    'different, genre-specific craft expectations, each with a one-sentence ' +
    'craft argument for why.',
  );
  lines.push('');
  for (const wave of waves) {
    lines.push(`## Wave ${wave}`);
    lines.push('');
    lines.push(byWave.get(wave)![0].waveProse ?? '');
    lines.push('');
    for (const g of byWave.get(wave)!.slice().sort((a, b) => a.genre.localeCompare(b.genre))) {
      lines.push(`### ${g.genre}`);
      lines.push('');
      if (g.rationale) { lines.push(g.rationale); lines.push(''); }
      for (const f of g.fields) lines.push(`- \`${f.field}\`: ${f.value}`);
      lines.push('');
    }
  }
  if (unattributed.length > 0) {
    lines.push('## Unattributed');
    lines.push('');
    for (const g of unattributed) {
      lines.push(`### ${g.genre}`);
      lines.push('');
      if (g.rationale) { lines.push(g.rationale); lines.push(''); }
      for (const f of g.fields) lines.push(`- \`${f.field}\`: ${f.value}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

// ── CLI entry point ─────────────────────────────────────────────────────────

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const extractions = extractAllPasses();
  const { markdown: readme, totalRules } = renderReadme(extractions);
  writeFileSync(path.join(OUT_DIR, 'README.md'), readme + '\n');

  for (const e of extractions) {
    writeFileSync(path.join(OUT_DIR, `${e.pass}.md`), renderPassDoc(e) + '\n');
  }

  writeFileSync(path.join(OUT_DIR, 'excellence.md'), renderExcellenceDoc(extractExcellenceDetectors()) + '\n');
  writeFileSync(path.join(OUT_DIR, 'root-causes.md'), renderRootCausesDoc(extractRootCauseTemplates()) + '\n');
  writeFileSync(path.join(OUT_DIR, 'genre.md'), renderGenreDoc(extractGenreModifiers()) + '\n');

  console.log(`rulebook: ${totalRules} rules across ${extractions.length} passes -> ${path.relative(REPO_ROOT, OUT_DIR)}/`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) main();
