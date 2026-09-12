// ── WHAT SHAPE IS THE CORPUS, AND HOW MUCH OF IT IS NOT SCREENPLAY? ────────
// (2026-09-12, round 3 of the adversarial batch.)
//
// `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`'s pending entry for
// `scoring/adversarial-2026-09-12` tells the owner, in four ordered steps and
// BEFORE reading any rank statistic:
//
//   1. `submittedWordCount` against `wordCount`, per script — how much text
//      left the denominator, and on which document shape.
//   2. per-script health, verdict, sceneCount and issue counts by severity.
//   3. the 72-row real-corpus manifest, which needs re-locking either way.
//   4. only then AUC-24.
//
// Step 1 was not executable when it was written: `submittedWordCount` was a
// local in fountain-analyzer.ts that nothing read, and the double-spaced
// decision was private to screenplay-normalizer.ts. Both are now reported on
// `FountainAnalysis`, and THIS SCRIPT is steps 1 and 2 as one command, so the
// branch's most important owner instruction is mechanical rather than prose.
//
// WHY THE SPLIT VARIABLE IS `isDoubleSpaced`. Two changes on this branch land
// entirely on documents that take `normalizeScreenplay`'s double-spaced
// reconstruction branch — the scraped-PDF and FDX-export shape, which is what
// the private corpus is made of and which NO fixture in this repository is:
// the non-printing strip now runs BEFORE that reconstruction, and the 14
// revision passes now receive the reconstructed text. Two more — the forced-
// marker strip and the cue-extension fold — fire wherever a real draft carries
// a forced marker or a non-canonical extension, which the 32 committed
// benchmark scripts do NOT (zero of either, measured). All four are invisible
// from this repository, and this script is how they become visible on the only
// corpus that has them.
//
// WHAT IT IS NOT. It computes no AUC, asserts no floor and re-locks nothing.
// A moved number here is a fact to read, not a pass or a fail.
//
// COPYRIGHT BOUNDARY (identical to tests/core/real-script-corpus.test.ts and
// scripts/measure-real-script-discrimination.ts): the corpus is local-only and
// is never committed. It is pointed at by REAL_SCRIPT_CORPUS_DIR. This script
// reads it on the owner's machine, prints numbers and file names to stdout,
// WRITES NO FILE and sends nothing anywhere. It never prints screenplay text.
// With the env var unset it SKIPS with exit 0, so an unset env can never
// masquerade as a result.
//
// THE OUTPUT IS A LOCAL ARTIFACT. DO NOT PASTE IT ANYWHERE. Every row begins
// with a corpus file path, and on the private corpus those paths are the
// TITLES of 761 real screenplays — not screenplay text, so the copyright
// boundary above still holds, but collectively they are the corpus's index,
// which this repository has never published and must not start publishing in a
// receipt, a ticket, a commit message or a chat. Keep the table and any
// `--csv` file on the machine that produced them, and quote only aggregates
// (the group summaries) if a number has to travel. The `--public` form is the
// exception and the only one: those 32 files are committed here already.
//
// RUN:
//   REAL_SCRIPT_CORPUS_DIR="../real-script-corpus" npm run probe-corpus-shape
//   REAL_SCRIPT_CORPUS_DIR="../real-script-corpus" npm run --silent probe-corpus-shape -- --csv > shape.csv
//   npm run probe-corpus-shape -- --public     # smoke test on the 32 committed
//                                              # scripts; NOT the owner's run
//
// `--silent` MATTERS FOR `--csv` AND ONLY FOR IT. Without it npm writes four
// banner/blank lines ahead of stdout, so the redirected file's first line is
// blank and its header is line 5 — a plain `diff` of two such files is
// unaffected (the banner is identical on both sides), but a spreadsheet or a
// csv-aware differ will not read it. With `--silent` the header is line 1.
//
// COST: the analysis runs twice per script — once through `runScriptDoctor`
// for health/verdict/severity and once through `analyzeFountainText` for the
// two diagnostic fields. That is deliberate: the diagnostic fields are NOT on
// `ScriptDoctorReport`, so the 45 committed output-identity fixtures stay
// byte-identical, and this probe pays the cost instead of the product.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { parseFountain, FORCED_CUE_MARKER } from '../src/lib/fountain.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
const CSV = ARGS.includes('--csv');
const PUBLIC = ARGS.includes('--public');
const MIN_LINES = 50;   // same fragment cutoff measure-real uses

interface Row {
  file: string;
  // ── RUNNING THIS ON A PRE-BRANCH CHECKOUT (2026-09-12, round 4) ──────────
  // The owner's comparison is this command on a tree from before this branch
  // against this command here. The script does not exist there, so it has to
  // be COPIED across — and on that tree `analyzeFountainText` has no
  // `submittedWordCount` and no `isDoubleSpaced`, because neither field
  // existed. Both come back `undefined`, which is correct and is itself the
  // finding: on a pre-branch tree `wordCount` IS the raw submission, so the
  // pre-branch `wordCount` column and this tree's `submittedWordCount` column
  // are the same number. (Verified on a `git archive 8aa1f696` export:
  // chain-of-custody wordCount 824 there, submittedWordCount 824 here.)
  // These two are therefore optional, and every derived column, the table and
  // the group summaries all say "not reported" rather than printing NaN.
  doubleSpaced: boolean | undefined;
  submitted: number | undefined;
  words: number;
  health: number;
  verdict: string;
  scenes: number;
  critical: number;
  major: number;
  minor: number;
  /** Cue lines the writer FORCED with Fountain's `@` — see countForcedCues. */
  forcedCues: number;
}

/** How many of this document's character cues are forced with `@`.
 *
 *  Round 3 taught the parser Fountain's forced cue, and this column is how the
 *  owner sees which of the 761 drafts that change can possibly have touched:
 *  before it, `@MARY` was action prose and so was every line of her speech;
 *  after it, she is a speaker with dialogue. A script whose count is 0 cannot
 *  have moved because of that change — and a corpus of all-zero counts settles
 *  the question for the whole corpus in one column.
 *
 *  It counts BLOCKS the parser typed as a cue, not lines matching `/^@/`, so an
 *  `@` opening an action line or sitting inside a speech (a handle, an address)
 *  is not counted — those are exactly the lines the change deliberately leaves
 *  alone, and a regex would have reported them as affected.
 *
 *  COST: one extra `parseFountain` per script. Against the two full analyses
 *  each row already pays (`runScriptDoctor` + `analyzeFountainText`) it is
 *  inside the run-to-run noise — `npm run probe-corpus-shape -- --public`,
 *  three consecutive runs each way on one machine: 2162 / 2157 / 2235 ms with
 *  the column, 2191 / 2146 / 2122 ms with the call replaced by a constant. */
function countForcedCues(text: string): number {
  let n = 0;
  for (const b of parseFountain(text)) {
    if (b.type !== 'character' && b.type !== 'dual_dialogue') continue;
    if (b.text.trim().startsWith(FORCED_CUE_MARKER)) n++;
  }
  return n;
}

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(full));
    else if (/\.(fountain|fountain\.txt|txt)$/.test(e.name)) out.push(full);
  }
  return out;
}

/** The two corpora this script can read, kept apart on purpose: the private
 *  one is the measurement, the committed one is only a smoke test that the
 *  command works. */
function collect(): { label: string; base: string; files: string[] } {
  if (PUBLIC) {
    const files = [
      ...readdirSync(path.join(REPO_ROOT, 'data/screenplays')).filter((f) => f.endsWith('.fountain'))
        .map((f) => path.join(REPO_ROOT, 'data/screenplays', f)),
      ...readdirSync(path.join(REPO_ROOT, 'tests/fixtures/blind-pairs')).filter((f) => f.endsWith('.fountain'))
        .map((f) => path.join(REPO_ROOT, 'tests/fixtures/blind-pairs', f)),
    ].sort();
    return { label: 'the 32 COMMITTED distributable scripts (smoke test — NOT the owner\'s run)', base: REPO_ROOT, files };
  }
  const dir = process.env.REAL_SCRIPT_CORPUS_DIR ?? '';
  if (!dir) {
    console.log('\n[SKIP] REAL_SCRIPT_CORPUS_DIR not set — corpus text is local-only (copyright).');
    console.log('  Set it to a local directory of screenplays to run steps 1 and 2 of');
    console.log('  MEASUREMENT_RECEIPTS.md\'s pending entry. An unset env var is the expected');
    console.log('  state in CI and is never a result. For a smoke test on the committed');
    console.log('  corpus instead: npm run probe-corpus-shape -- --public');
    process.exit(0);
  }
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(`\n[FATAL] REAL_SCRIPT_CORPUS_DIR is set to "${dir}" but that path does not`);
    console.error('        exist or is not a directory. Fix the path, or unset it to skip cleanly.');
    process.exit(2);
  }
  return { label: `the private corpus at ${dir}`, base: dir, files: walk(dir).sort() };
}

function pct(a: number, b: number): string {
  return b === 0 ? '—' : `${((a / b) * 100).toFixed(1)}%`;
}
function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const { label, base, files } = collect();
const rows: Row[] = [];
let skippedShort = 0;

for (const full of files) {
  const text = readFileSync(full, 'utf8');
  if (text.split('\n').length < MIN_LINES) { skippedShort++; continue; }
  // Read through a widened view: on a pre-branch checkout these two fields do
  // not exist and arrive as undefined, which every consumer below handles.
  const analysis = analyzeFountainText(text) as { wordCount: number; submittedWordCount?: number; isDoubleSpaced?: boolean };
  const report = await runScriptDoctor(text);
  rows.push({
    file: path.relative(base, full).replace(/\\/g, '/'),
    doubleSpaced: analysis.isDoubleSpaced,
    submitted: analysis.submittedWordCount,
    words: analysis.wordCount,
    health: report.health,
    // `verdict` is optional on the report (it is derived from health +
    // sceneCount and omitted when either is missing); a probe row says so
    // rather than inventing one.
    verdict: report.verdict ?? '(none)',
    scenes: report.sceneCount,
    critical: report.bySeverity.critical,
    major: report.bySeverity.major,
    minor: report.bySeverity.minor,
    forcedCues: countForcedCues(text),
  });
}

/** The gap and its share, or undefined when this tree does not report the
 *  diagnostic fields. Never NaN: an empty cell says "not reported", NaN says
 *  nothing and breaks every csv reader. */
function gapOf(r: Row): { gap: number; share: number } | undefined {
  if (r.submitted === undefined) return undefined;
  const gap = r.submitted - r.words;
  return { gap, share: r.submitted === 0 ? 0 : (gap / r.submitted) * 100 };
}

const REPORTED = rows.filter((r) => r.submitted !== undefined);
const UNREPORTED = rows.length - REPORTED.length;

if (CSV) {
  console.log('file,isDoubleSpaced,submittedWordCount,wordCount,notScreenplayWords,notScreenplayPct,health,verdict,sceneCount,critical,major,minor,forcedCueLines');
  for (const r of rows) {
    const g = gapOf(r);
    console.log([
      JSON.stringify(r.file), r.doubleSpaced ?? '', r.submitted ?? '', r.words,
      g ? g.gap : '', g ? g.share.toFixed(2) : '',
      r.health, r.verdict, r.scenes, r.critical, r.major, r.minor, r.forcedCues,
    ].join(','));
  }
  process.exit(0);
}

console.log('\n============================================================================');
console.log('CORPUS SHAPE PROBE — steps 1 and 2 of MEASUREMENT_RECEIPTS.md\'s pending entry');
console.log('============================================================================');
console.log(`Corpus: ${label}`);
console.log(`Scripts read: ${rows.length}${skippedShort ? ` (${skippedShort} skipped: under ${MIN_LINES} lines)` : ''}`);
console.log('Nothing was written to disk and no screenplay text is printed.\n');

const head = `${'script'.padEnd(38)} ${'2x'.padEnd(3)} ${'submitted'.padStart(9)} ${'words'.padStart(7)} ${'gap'.padStart(7)} ${'gap%'.padStart(6)} ${'health'.padStart(6)} ${'verdict'.padEnd(10)} ${'sc'.padStart(4)} ${'c/m/n'.padStart(12)} ${'@cue'.padStart(5)}`;
console.log(head);
console.log('-'.repeat(head.length));
for (const r of rows) {
  const g = gapOf(r);
  console.log(
    `${r.file.length > 38 ? `…${r.file.slice(-37)}` : r.file.padEnd(38)} `
    + `${(r.doubleSpaced === undefined ? '?' : r.doubleSpaced ? 'YES' : '—').padEnd(3)} `
    + `${(r.submitted === undefined ? '—' : String(r.submitted)).padStart(9)} ${String(r.words).padStart(7)} `
    + `${(g ? String(g.gap) : '—').padStart(7)} `
    + `${(g ? pct(g.gap, r.submitted!) : '—').padStart(6)} ${r.health.toFixed(1).padStart(6)} ${r.verdict.padEnd(10)} `
    + `${String(r.scenes).padStart(4)} ${`${r.critical}/${r.major}/${r.minor}`.padStart(12)} `
    + `${String(r.forcedCues).padStart(5)}`,
  );
}

if (UNREPORTED > 0) {
  console.log(`\n  NOTE: ${UNREPORTED} of ${rows.length} rows have no submittedWordCount / isDoubleSpaced.`);
  console.log('  That is what this script prints on a checkout from BEFORE the two fields existed,');
  console.log('  and it is correct rather than broken: on such a tree `wordCount` IS the raw');
  console.log('  submission, so its wordCount column is the same number as this tree\'s');
  console.log('  submittedWordCount column. Diff the two runs on that basis.');
}

for (const [name, group] of [
  ['DOUBLE-SPACED (the reconstruction branch — the scraped-PDF / FDX shape)', REPORTED.filter((r) => r.doubleSpaced === true)],
  ['SINGLE-SPACED (the clean branch)', REPORTED.filter((r) => r.doubleSpaced === false)],
] as Array<[string, Row[]]>) {
  console.log(`\n── ${name} ──`);
  if (group.length === 0) { console.log('  none'); continue; }
  const gaps = group.map((r) => r.submitted! - r.words);
  const gapPcts = group.filter((r) => r.submitted! > 0).map((r) => ((r.submitted! - r.words) / r.submitted!) * 100);
  const verdicts = new Map<string, number>();
  for (const r of group) verdicts.set(r.verdict, (verdicts.get(r.verdict) ?? 0) + 1);
  console.log(`  scripts                    ${group.length} of ${rows.length}`);
  console.log(`  words NOT screenplay       total ${gaps.reduce((a, b) => a + b, 0)}, mean ${mean(gaps).toFixed(1)}, median ${median(gaps).toFixed(1)}, max ${Math.max(...gaps)}`);
  console.log(`  as a share of the submission  mean ${mean(gapPcts).toFixed(2)}%, median ${median(gapPcts).toFixed(2)}%, max ${Math.max(...gapPcts).toFixed(2)}%`);
  console.log(`  scripts with a non-zero gap   ${gaps.filter((g) => g !== 0).length} of ${group.length}`);
  console.log(`  health                     mean ${mean(group.map((r) => r.health)).toFixed(2)}, median ${median(group.map((r) => r.health)).toFixed(2)}, range ${Math.min(...group.map((r) => r.health)).toFixed(1)}–${Math.max(...group.map((r) => r.health)).toFixed(1)}`);
  console.log(`  scenes                     mean ${mean(group.map((r) => r.scenes)).toFixed(1)}, range ${Math.min(...group.map((r) => r.scenes))}–${Math.max(...group.map((r) => r.scenes))}`);
  console.log(`  issues per script          critical ${mean(group.map((r) => r.critical)).toFixed(1)}, major ${mean(group.map((r) => r.major)).toFixed(1)}, minor ${mean(group.map((r) => r.minor)).toFixed(1)}`);
  console.log(`  verdicts                   ${[...verdicts].map(([v, n]) => `${v} ${n}`).join(', ')}`);
  const forced = group.filter((r) => r.forcedCues > 0);
  console.log(`  scripts with a forced cue  ${forced.length} of ${group.length}`
    + (forced.length === 0 ? '  (so round 3\'s `@` change cannot have moved one of them)'
      : `, ${group.reduce((a, r) => a + r.forcedCues, 0)} cue lines in total, max ${Math.max(...group.map((r) => r.forcedCues))} in one script`));
}

console.log(`
── HOW TO READ IT ──────────────────────────────────────────────────────────
  * The GAP column is what the denominator correction removed: words the
    writer submitted that Fountain never prints — a title page, a boneyard,
    notes, synopses, section headings. A corpus of zero gaps means that
    correction cannot have moved anything on this corpus.
  * The 2x column is the split the receipt is built around. Four changes on
    this branch are invisible from the repository and fire here: the
    non-printing strip reaching the double-spaced path, the 14 passes reading
    the reconstructed text (both YES rows only), and the forced-marker strip
    and cue-extension fold (either row, wherever a draft carries a forced
    marker or a non-canonical extension — the 32 committed scripts carry
    neither, which is why no benchmark could catch them).
  * The @cue column is which scripts round 3's forced-cue change can have
    touched, and it is the whole answer for that change: \`@NAME\` used to be
    action prose and its speech with it, so a 0 there means that script's
    health, characters and dialogue counts cannot have moved because of it.
    A non-zero count is where to look first if anything did move.
  * sceneCount CANNOT move because of the marker strip: it removes a marker
    only when the whole document re-parses to the same block types. A scene
    count that changed against a pre-branch run is evidence of something else
    and should be read as such.
  * Compare these rows against the same command on a pre-branch checkout.
    COPY THIS FILE THERE FIRST — it does not exist on that tree — and expect
    its isDoubleSpaced and submittedWordCount columns to be empty, which is
    correct: those fields did not exist, and on that tree wordCount IS the raw
    submission, so its wordCount column is this tree's submittedWordCount
    column. Run "npm run --silent probe-corpus-shape -- --csv > shape.csv" on
    both sides and diff the files. Issue COUNTS move before health does: 24 issues
    moved on one synthetic document whose health moved 0.9.
  * Then, and only then, the 72-row manifest and AUC-24. These changes move
    both halves of every matched pair, so a rank statistic that does not move
    is NOT evidence that they did nothing.
  * If AUC-24 falls, the finding is about what those drafts contain and what
    shape they arrive in. Read them. Do not move AUC24_FLOOR.
`);
