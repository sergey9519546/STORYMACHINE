// P-3 EVIDENCE — re-derive the CLIMAX_RELOCATE novelty experiment from
// COMMITTED SOURCE, and test the one sanctioned next step: noun-TYPE-aware
// novelty (proper vs. relational/anaphoric reference).
//
// ── What this is ─────────────────────────────────────────────────────────
// docs/PATH_TO_EXCELLENCE.md P-3: "The CLIMAX_RELOCATE wall: the one
// sanctioned next experiment is noun-type-aware novelty (proper vs.
// relational/anaphoric reference), reproduced from committed source against
// the real corpus — the prior result is marked unreproducible-historical and
// must not be cited until re-derived."
//
// The prior result is docs/p1-benchmark/NOVELTY_SIGNAL_2026-08-05.md, whose
// own status line reads "HISTORICAL / UNREPRODUCIBLE AS CURRENT EVIDENCE": it
// reported that the relocated climax scene's proper-noun novelty rose from
// mean 0.31 to 0.76 (delta +0.45) on 10 of 11 scripts, but the targeted probe
// source was never committed. That document also names the missing piece
// exactly: "a discriminator likely needs either (a) the *type* of novel noun
// (a new character name at a new location is expected; a cluster of
// already-relationship-laden names like 'her father' / 'the vault' / 'the
// plan' at position 1 is not), or (b) a coreference layer". This harness
// implements (a) and measures it.
//
// ── What "from committed source" means here, precisely ───────────────────
// The targeted probe was never committed, so it cannot be re-run. What IS
// committed is scripts/probe-forward-reference.mjs and
// scripts/probe-novelty-global.mjs, and between them they carry the three
// pieces the targeted claim needs: the `segment()` scene splitter, the
// `relocate()` / `shuffle()` / `midpointDrop()` degradations, and the
// `properNouns()` extractor with its STOP list. Those are copied VERBATIM
// below, with line provenance, and the targeted statistic is rebuilt on top
// of them from NOVELTY_SIGNAL_2026-08-05.md's own prose specification. That
// is the strongest available sense of "re-derived from committed source", and
// its limits are stated rather than glossed: a rebuilt statistic is not the
// original inline probe, and this document never claims the historical table
// was reproduced.
//
// Not a scoring change. Read-only over the corpus; imports nothing from
// doctor.ts's graph beyond the shared measurement library.
// `node scripts/check-scoring-receipt.mjs` exits 0 for this file.
//
// ── Run ──────────────────────────────────────────────────────────────────
//   node --experimental-strip-types scripts/rederive-climax-relocate.ts
// Owner machine, against the real corpus:
//   CORPUS_DIR=<761-script corpus> node --experimental-strip-types scripts/rederive-climax-relocate.ts
// Output: stdout report + scripts/output/climax-relocate-rederivation.json

import fs from 'node:fs';
import path from 'node:path';
import { REFERENCE_CORPUS } from '../server/nvm/analyze/calibration/corpus.ts';
// Shared verbatim with rebuild-experiment.mjs / measure-rule-channel-evidence.ts
// so the matched-pair AUC and the seeded percentile bootstrap are the SAME
// estimator every other P1 number in this repository uses.
import { pairwiseAuc, bootstrapCi } from './lib/rebuild-experiment-lib.mjs';

const OUT_DIR = path.resolve('scripts/output');
const BOOTSTRAP = 2000;
const SEED = 42;
const report: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  script: 'scripts/rederive-climax-relocate.ts',
  priorResult: 'docs/p1-benchmark/NOVELTY_SIGNAL_2026-08-05.md (HISTORICAL / UNREPRODUCIBLE)',
};

function h1(s: string): void {
  console.log(`\n${'═'.repeat(78)}\n${s}\n${'═'.repeat(78)}`);
}
function fmt(n: number): string {
  return Number.isNaN(n) ? '  n/a  ' : n.toFixed(3).padStart(7);
}
function ciStr(c: { lo: number; hi: number }): string {
  return Number.isNaN(c.lo) ? '[  n/a,   n/a]' : `[${c.lo.toFixed(3)}, ${c.hi.toFixed(3)}]`;
}

console.log('=== P-3: CLIMAX_RELOCATE NOUN-TYPE RE-DERIVATION ===');
console.log('The 2026-08-05 targeted result is marked unreproducible-historical and is NOT cited');
console.log('as evidence anywhere below. Every number here was produced by this run.');

// ════════════════════════════════════════════════════════════════════════
// COMMITTED SOURCE, copied verbatim (provenance in each comment)
// ════════════════════════════════════════════════════════════════════════

/** scripts/probe-forward-reference.mjs lines 32-42 / probe-novelty-global.mjs
 *  lines 27-37 — byte-identical between the two committed probes. */
function segment(text: string): string[] {
  const lines = text.split('\n');
  const pre: string[] = []; const scenes: string[][] = []; let cur: string[] | null = null; let seen = false;
  for (const l of lines) {
    if (/^(INT|EXT)\./.test(l)) { if (cur && seen) scenes.push(cur); seen = true; cur = [l]; }
    else if (seen) cur!.push(l); else pre.push(l);
  }
  if (cur) scenes.push(cur);
  if (pre.length && scenes.length) scenes[0] = [...pre, ...scenes[0]];
  return scenes.map(s => s.join('\n'));
}

/** probe-novelty-global.mjs line 38 — pop the last scene, splice it at index 1. */
function relocate(text: string): string | null {
  const s = segment(text); if (s.length < 3) return null;
  const last = s.pop()!; s.splice(1, 0, last); return s.join('\n');
}

/** probe-novelty-global.mjs lines 39-44 — Lehmer RNG seeded 42, Fisher-Yates. */
function shuffle(text: string): string | null {
  const s = segment(text); if (s.length < 3) return null;
  let rng = 42; const rand = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };
  const sh = s.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
  return sh.join('\n');
}

/** probe-novelty-global.mjs lines 45-48 — drop the middle 20% of scenes. */
function midpointDrop(text: string): string | null {
  const s = segment(text); const n = s.length; if (n < 5) return null;
  return [...s.slice(0, Math.floor(n * 0.4)), ...s.slice(Math.floor(n * 0.6))].join('\n');
}

/** probe-forward-reference.mjs line 61 — the stoplist, verbatim. */
const STOP = new Set(['The', 'A', 'An', 'And', 'But', 'Or', 'So', 'Then', 'When', 'As', 'He', 'She', 'It', 'They', 'We', 'I', 'You', 'His', 'Her', 'Its', 'Their', 'Our', 'My', 'Your', 'This', 'That', 'These', 'Those', 'There', 'Here', 'Now', 'Just', 'Very', 'Into', 'Onto', 'Over', 'Under', 'Across', 'Through', 'Before', 'After', 'During', 'While', 'Because', 'Although', 'Though', 'If', 'Unless', 'Until', 'Since', 'Once', 'Suddenly', 'Quickly', 'Slowly', 'Back', 'Down', 'Up', 'Out', 'Off', 'Away', 'Toward', 'Towards', 'Behind', 'Beside', 'Between', 'Among', 'Against', 'Within', 'Without', 'Upon', 'Both', 'Each', 'Every', 'Some', 'Any', 'All', 'None', 'One', 'Two', 'Three', 'First', 'Second', 'Next', 'Last', 'Final', 'New', 'Old', 'Big', 'Small', 'Good', 'Bad', 'Right', 'Left', 'Yes', 'No', 'Not', 'INT', 'EXT', 'CONTINUOUS', 'DAY', 'NIGHT', 'LATER', 'MOMENTS', 'CLOSE', 'OPEN', 'CUT', 'FADE', 'DISSOLVE', 'BACK', 'ANGLE', 'POV', 'V.O', 'O.S', 'CONT', 'INTERCUT']);

/** probe-forward-reference.mjs lines 63-73 — the proper-noun extractor,
 *  verbatim. All-caps tokens (fountain cues, props) plus capitalized words
 *  not at line start, minus the stoplist. Returns DISTINCT nouns per scene,
 *  which is what NOVELTY_SIGNAL's "fraction of its proper nouns" measures. */
function properNouns(text: string): Set<string> {
  const nouns = new Set<string>();
  for (const m of text.match(/\b[A-Z]{3,}\b/g) ?? []) nouns.add(m.toLowerCase());
  for (const m of text.match(/(?<=\s)[A-Z][a-z]{2,}/g) ?? []) {
    if (!STOP.has(m)) nouns.add(m.toLowerCase());
  }
  return nouns;
}

// ════════════════════════════════════════════════════════════════════════
// NEW: the noun-TYPE layer P-3 sanctions
// ════════════════════════════════════════════════════════════════════════
// NOVELTY_SIGNAL_2026-08-05.md §"Why globalizing is hard": the per-scene
// proper-noun signal is real but LOCAL, and screening for high-novelty scenes
// fails because legitimate screenplays have them too — "a new character name
// at a new location is expected; a cluster of already-relationship-laden
// names like 'her father' / 'the vault' / 'the plan' at position 1 is not."
//
// So: separate the two kinds of reference.
//   PROPER      — a name being INTRODUCED. Novel-in-scene-1 is normal.
//   RELATIONAL  — a DEFINITE or POSSESSIVE noun phrase ("the vault", "her
//                 father", "the plan"). A definite reference PRESUPPOSES
//                 shared knowledge, so one whose head noun has no antecedent
//                 in any earlier scene is a genuine forward reference, not an
//                 introduction.
//   ANAPHORIC   — bare markers with no head at all ("again", "this time",
//                 "like before"). Unanchorable by construction; counted and
//                 reported separately rather than folded into a rate, so the
//                 rate stays interpretable.
//
// HONEST LIMIT, stated up front: this is a LEXICAL approximation, not a parse.
// There is no POS tagger and no coreference layer in this codebase
// (agency-signal.ts:99 documents that gap explicitly), so "the head noun after
// a determiner, with a one-step adjective skip" is the best available
// approximation of a definite NP head. It will mis-head some phrases. The
// measurement below is only as good as that approximation, and a null result
// from it does not refute a real coreference implementation.

/** Adjectives common enough after a determiner that taking them as the head
 *  would be wrong more often than not. One step only — no chunker here. */
const ADJ_SKIP = new Set(['old', 'new', 'same', 'other', 'little', 'big', 'small', 'young', 'dead', 'dark', 'last', 'first', 'next', 'whole', 'entire', 'only', 'very', 'real', 'good', 'bad', 'long', 'short', 'thin', 'thick', 'heavy', 'empty', 'open', 'closed', 'front', 'back', 'left', 'right', 'top', 'bottom', 'red', 'blue', 'black', 'white', 'grey', 'gray', 'green']);

/** Heads of definite and possessive-relational noun phrases in a scene.
 *  Returns one entry per OCCURRENCE, deduped to distinct heads (matching
 *  properNouns' per-scene dedup so the two rates are commensurable). */
function relationalHeads(text: string): Set<string> {
  const heads = new Set<string>();
  const lower = text.toLowerCase();
  const DET = /\b(?:the|his|her|their|my|your|our)\s+([a-z]{3,})(?:\s+([a-z]{3,}))?/g;
  for (const m of lower.matchAll(DET)) {
    const first = m[1]; const second = m[2];
    const head = (ADJ_SKIP.has(first) && second) ? second : first;
    if (head.length >= 3) heads.add(normalize(head));
  }
  return heads;
}

/** Bare anaphoric markers — references to a prior state with no head noun to
 *  anchor. Counted per scene, reported as a density. */
const ANAPHORIC_RE = /\b(?:again|this time|last time|like before|as usual|as always|the same|back here|still here|by now|ever since)\b/g;
function anaphoricMarkerCount(text: string): number {
  return (text.toLowerCase().match(ANAPHORIC_RE) ?? []).length;
}

/** Crude singular/plural fold so "the papers" anchors to an earlier "paper".
 *  Deliberately naive; a stemmer is not worth the dependency here. */
function normalize(w: string): string {
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

/** Every lowercase alphabetic content token in a scene, normalized — the
 *  "has this been mentioned before" index a relational head is checked
 *  against. Deliberately WIDER than relationalHeads: a head anchors if the
 *  word appeared anywhere earlier, in any grammatical role. */
function contentTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? []) out.add(normalize(m));
  return out;
}

function wordCount(text: string): number {
  return (text.match(/\b\w+\b/g) ?? []).length;
}

// ════════════════════════════════════════════════════════════════════════
// Per-script statistics
// ════════════════════════════════════════════════════════════════════════

interface SceneStats {
  properNovelty: number;      // fraction of this scene's proper nouns unseen earlier
  relationalUnanchored: number; // fraction of definite/possessive heads unseen earlier
  relationalExcess: number;   // relationalUnanchored - properNovelty
  anaphoricDensity: number;   // bare anaphoric markers per 100 words
  properCount: number;
  relationalCount: number;
}

function sceneStats(scenes: string[]): SceneStats[] {
  const priorProper = new Set<string>();
  const priorTokens = new Set<string>();
  const out: SceneStats[] = [];
  for (const scene of scenes) {
    const proper = properNouns(scene);
    const heads = relationalHeads(scene);
    let novelProper = 0;
    for (const n of proper) if (!priorProper.has(n)) novelProper++;
    let unanchored = 0;
    for (const h of heads) if (!priorTokens.has(h)) unanchored++;
    const pn = proper.size > 0 ? novelProper / proper.size : 0;
    const ru = heads.size > 0 ? unanchored / heads.size : 0;
    const wc = wordCount(scene);
    out.push({
      properNovelty: pn,
      relationalUnanchored: ru,
      relationalExcess: ru - pn,
      anaphoricDensity: wc > 0 ? (100 * anaphoricMarkerCount(scene)) / wc : 0,
      properCount: proper.size,
      relationalCount: heads.size,
    });
    for (const n of proper) priorProper.add(n);
    for (const t of contentTokens(scene)) priorTokens.add(t);
  }
  return out;
}

/** The five global formulations. A real detector does NOT know which scene
 *  moved, so every one of these is computable from the document alone.
 *  All are expected to RISE under a reordering degradation. */
const FORMULATIONS = {
  /** F1 — the historical "second cold open", reproduced: proper-noun novelty
   *  at scene index 1, which is exactly where CLIMAX_RELOCATE lands the
   *  climax. NOVELTY_SIGNAL's table records this formulation as "noisy;
   *  many intact scripts have a high-novelty scene 1 legitimately". */
  F1_properNoveltyAtScene1: (s: SceneStats[]) => (s.length > 1 ? s[1].properNovelty : Number.NaN),
  /** F2 — the same position, RELATIONAL type instead of proper. */
  F2_relationalUnanchoredAtScene1: (s: SceneStats[]) => (s.length > 1 ? s[1].relationalUnanchored : Number.NaN),
  /** F3 — the noun-TYPE contrast P-3 actually names: how much MORE unanchored
   *  the definite references are than the proper nouns at scene 1. An
   *  introduction scene scores near 0 (both high); a misplaced climax scores
   *  high (definite references presuppose what the audience has not seen). */
  F3_relationalExcessAtScene1: (s: SceneStats[]) => (s.length > 1 ? s[1].relationalExcess : Number.NaN),
  /** F4 — position-free version of F3: the worst relational excess anywhere
   *  after scene 0 (scene 0 saturates by construction and is excluded, the
   *  same exclusion the historical "second cold open" formulation used). */
  F4_maxRelationalExcess: (s: SceneStats[]) => (s.length > 1 ? Math.max(...s.slice(1).map(x => x.relationalExcess)) : Number.NaN),
  /** F5 — bare anaphoric markers at scene 1, per 100 words. The (b) branch of
   *  NOVELTY_SIGNAL's hypothesis, in the only form available without a
   *  coreference layer. */
  F5_anaphoricDensityAtScene1: (s: SceneStats[]) => (s.length > 1 ? s[1].anaphoricDensity : Number.NaN),
} as const;
type FormulationId = keyof typeof FORMULATIONS;
const FORMULATION_IDS = Object.keys(FORMULATIONS) as FormulationId[];

// ════════════════════════════════════════════════════════════════════════
// PART 1 — committed-source reachability audit
// ════════════════════════════════════════════════════════════════════════
h1('PART 1 — CAN THE COMMITTED PROBES RUN AT ALL? (audit before re-derivation)');

const SCREENPLAY_DIR = path.resolve(process.env.CORPUS_DIR ?? 'data/screenplays');
const dirExists = fs.existsSync(SCREENPLAY_DIR);
const allFiles = dirExists ? fs.readdirSync(SCREENPLAY_DIR).filter(f => fs.statSync(path.join(SCREENPLAY_DIR, f)).isFile()) : [];
const dotFountainTxt = allFiles.filter(f => f.endsWith('.fountain.txt'));
const dotFountain = allFiles.filter(f => f.endsWith('.fountain'));

console.log(`corpus dir: ${SCREENPLAY_DIR}${process.env.CORPUS_DIR ? ' (from CORPUS_DIR)' : ' (default)'}`);
console.log(`files matching *.fountain.txt (what the committed probes glob): ${dotFountainTxt.length}`);
console.log(`files matching *.fountain   (what is actually on disk):         ${dotFountain.length}`);
if (dotFountainTxt.length === 0 && dotFountain.length > 0) {
  console.log('\nFINDING: every committed probe in the 2026-08-05 family selects its corpus with');
  console.log('  readdirSync(\'data/screenplays\').filter(f => f.endsWith(\'.fountain.txt\'))');
  console.log('  - scripts/probe-novelty-global.mjs:25');
  console.log('  - scripts/probe-forward-reference.mjs:29');
  console.log('  - scripts/probe-climax-relocate-discrimination.mjs:34');
  console.log('  - scripts/probe-climax-locators.mjs:26');
  console.log('The in-repo CC0 corpus uses the .fountain extension, so all four select ZERO files');
  console.log('and exit 0 having measured nothing. NOVELTY_SIGNAL_2026-08-05.md\'s "Reproduction"');
  console.log('section names two of them as the commands that reproduce its committed formulations;');
  console.log('on this checkout those commands produce an empty table, not a reproduction.');
  console.log('This harness therefore reads *.fountain and says so, rather than inheriting the bug.');
}
report.part1Reachability = {
  corpusDir: SCREENPLAY_DIR,
  dotFountainTxt: dotFountainTxt.length,
  dotFountain: dotFountain.length,
  committedProbesInert: dotFountainTxt.length === 0 && dotFountain.length > 0,
};

// ── Corpus assembly, with partition discipline ──────────────────────────
interface Source { label: string; origin: 'cc0' | 'calibration'; text: string }
const SPLIT_FILE = path.join(OUT_DIR, 'corpus-split.json');
let testPartition = new Set<string>();
if (fs.existsSync(SPLIT_FILE)) {
  try {
    const split = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8')) as { test: Array<{ file: string }> };
    testPartition = new Set(split.test.map(s => s.file));
  } catch { /* no split: everything is unassigned, which trainval includes */ }
}
const sources: Source[] = [];
let excludedAsTest = 0;
for (const f of [...dotFountain, ...dotFountainTxt].sort()) {
  if (testPartition.has(f)) { excludedAsTest++; continue; }
  sources.push({ label: f, origin: 'cc0', text: fs.readFileSync(path.join(SCREENPLAY_DIR, f), 'utf-8') });
}
for (const s of REFERENCE_CORPUS) sources.push({ label: `calibration/${s.label}`, origin: 'calibration', text: s.fountain });

const cc0Count = sources.filter(s => s.origin === 'cc0').length;
console.log(`\ncorpus: ${cc0Count} CC0 (trainval; ${excludedAsTest} excluded as held-out test)`
  + ` + ${REFERENCE_CORPUS.length} calibration = ${sources.length} sources`);

// ════════════════════════════════════════════════════════════════════════
// PART 2 — the TARGETED historical claim, rebuilt from committed pieces
// ════════════════════════════════════════════════════════════════════════
h1('PART 2 — THE TARGETED CLAIM, REBUILT (NOT a reproduction of the lost probe)');
console.log('Method, per NOVELTY_SIGNAL_2026-08-05.md: take the original last scene (the climax) and');
console.log('compute what fraction of its proper nouns do NOT appear in any scene before it; then');
console.log('relocate it to index 1 and recompute against the new (near-empty) prior set.');
console.log('Historical reported figures — CITED ONLY AS THE CLAIM UNDER TEST, never as evidence:');
console.log('  intact mean 0.31 (0.12-0.55) | relocated mean 0.76 (0.59-0.92) | delta +0.45 | 10/11 rose >0.1');

interface TargetedRow { label: string; origin: string; scenes: number; intact: number; relocated: number; delta: number }
const targeted: TargetedRow[] = [];
for (const src of sources) {
  const scenes = segment(src.text);
  if (scenes.length < 3) continue;
  // intact: the climax sits last, measured against every scene before it
  const intactStats = sceneStats(scenes);
  const intactNovelty = intactStats[intactStats.length - 1].properNovelty;
  // relocated: the SAME scene now sits at index 1, measured against scene 0
  const rel = relocate(src.text);
  if (rel === null) continue;
  const relStats = sceneStats(segment(rel));
  if (relStats.length < 2) continue;
  const relocatedNovelty = relStats[1].properNovelty;
  targeted.push({
    label: src.label, origin: src.origin, scenes: scenes.length,
    intact: intactNovelty, relocated: relocatedNovelty, delta: relocatedNovelty - intactNovelty,
  });
}

function summarize(rows: TargetedRow[]) {
  if (rows.length === 0) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const i = rows.map(r => r.intact); const r2 = rows.map(r => r.relocated); const d = rows.map(r => r.delta);
  return {
    n: rows.length,
    intactMean: mean(i), intactMin: Math.min(...i), intactMax: Math.max(...i),
    relocatedMean: mean(r2), relocatedMin: Math.min(...r2), relocatedMax: Math.max(...r2),
    deltaMean: mean(d), deltaMin: Math.min(...d), deltaMax: Math.max(...d),
    roseOver0_1: rows.filter(r => r.delta > 0.1).length,
  };
}
for (const [name, rows] of [
  ['CC0 only', targeted.filter(r => r.origin === 'cc0')],
  ['ALL sources', targeted],
] as const) {
  const s = summarize(rows);
  if (!s) { console.log(`\n${name}: no eligible scripts (>= 3 scenes).`); continue; }
  console.log(`\n${name} (n=${s.n} with >= 3 scenes):`);
  console.log(`  intact    mean ${s.intactMean.toFixed(2)}  range ${s.intactMin.toFixed(2)}-${s.intactMax.toFixed(2)}`);
  console.log(`  relocated mean ${s.relocatedMean.toFixed(2)}  range ${s.relocatedMin.toFixed(2)}-${s.relocatedMax.toFixed(2)}`);
  console.log(`  delta     mean ${s.deltaMean >= 0 ? '+' : ''}${s.deltaMean.toFixed(2)}  range `
    + `${s.deltaMin >= 0 ? '+' : ''}${s.deltaMin.toFixed(2)} to ${s.deltaMax >= 0 ? '+' : ''}${s.deltaMax.toFixed(2)}`);
  console.log(`  rose > 0.1: ${s.roseOver0_1}/${s.n} (${(100 * s.roseOver0_1 / s.n).toFixed(0)}%)`);
}
console.log('\nThis is the PER-SCENE, ORACLE-ASSISTED statistic: it is told which scene moved. It is');
console.log('a property check on the novelty measure, not a detector. Part 3 measures detectors.');
report.part2Targeted = {
  cc0: summarize(targeted.filter(r => r.origin === 'cc0')),
  all: summarize(targeted),
  rows: targeted.map(r => ({ ...r, intact: +r.intact.toFixed(4), relocated: +r.relocated.toFixed(4), delta: +r.delta.toFixed(4) })),
};

// ════════════════════════════════════════════════════════════════════════
// PART 3 — noun-TYPE-aware global detectors, with AUC
// ════════════════════════════════════════════════════════════════════════
h1('PART 3 — NOUN-TYPE-AWARE GLOBAL FORMULATIONS (the P-3 experiment)');
console.log('Each formulation is computable WITHOUT knowing which scene moved.');
console.log('  CLIMAX_RELOCATE   — the target: last scene moved to index 1.');
console.log('  SCENE_SHUFFLE     — a second, harsher reordering.');
console.log('  MIDPOINT_DROP     — the committed LENGTH control (removes the middle 40-60% of scenes).');
console.log('                      NOTE: it cannot touch scene 0 or 1, so it leaves every position-1');
console.log('                      statistic bit-identical and passes vacuously. Reported for');
console.log('                      continuity with the committed probes, but it proves nothing here.');
console.log('  MID_SCENE_RELOCATE— the SPECIFICITY control this harness adds: a MIDDLE scene moved to');
console.log('                      index 1. A formulation that rises as much here is detecting "a');
console.log('                      scene moved to the front", not "the CLIMAX moved to the front".');

/** SPECIFICITY CONTROL, added by this harness (not committed source).
 *  Four of the five formulations below read scene index 1, and MIDPOINT_DROP
 *  removes only the middle 40-60% of scenes — it cannot touch scene 0 or
 *  scene 1, so it leaves every position-1 statistic BIT-IDENTICAL and passes
 *  the "control stays quiet" test vacuously. A control that cannot move is
 *  not a control. This one can: it moves a MIDDLE scene to position 1 instead
 *  of the climax. If a formulation rises just as much here, it is detecting
 *  "some scene was moved to the front", not "the CLIMAX was" — which is
 *  precisely the confusion NOVELTY_SIGNAL_2026-08-05.md's failure analysis
 *  says a viable discriminator has to resolve ("distinguish a LEGITIMATE
 *  high-novelty scene from a MISPLACED one"). */
function midSceneRelocate(text: string): string | null {
  const s = segment(text); if (s.length < 5) return null;
  const mid = Math.floor(s.length / 2);
  if (mid <= 1 || mid === s.length - 1) return null;   // must be neither the opening nor the climax
  const [moved] = s.splice(mid, 1);
  s.splice(1, 0, moved);
  return s.join('\n');
}

const DEGS = [
  { id: 'CLIMAX_RELOCATE', fn: relocate },
  { id: 'SCENE_SHUFFLE', fn: shuffle },
  { id: 'MIDPOINT_DROP', fn: midpointDrop },
  { id: 'MID_SCENE_RELOCATE', fn: midSceneRelocate },
] as const;

/** pairwiseAuc scores `real > degraded` as correct. These statistics are
 *  expected to RISE under degradation, so both sides are negated — the
 *  estimator and its seeded bootstrap stay byte-identical to every other AUC
 *  in this repository, and the reported number reads in the usual direction
 *  (1.0 = the statistic separates perfectly, 0.5 = chance). */
type Pair = { real: number; degraded: number };
const pairsByFormulation: Record<string, Record<string, Pair[]>> = {};
const winsByFormulation: Record<string, Record<string, { rose: number; n: number }>> = {};
for (const id of FORMULATION_IDS) {
  pairsByFormulation[id] = {}; winsByFormulation[id] = {};
  for (const d of DEGS) { pairsByFormulation[id][d.id] = []; winsByFormulation[id][d.id] = { rose: 0, n: 0 }; }
}

/** Pairs where the statistic actually MOVED. A matched-pair AUC counts a tie
 *  as half, so a statistic that is identical on both arms of most scripts can
 *  report an AUC well away from 0.5 off a handful of moving pairs. This repo
 *  has been bitten by exactly that before — UNWIRED_SIGNALS_EVIDENCE §4
 *  records "SCENE_SHUFFLE AUC 0.523 n=44 but only 2 non-tied pairs" — so the
 *  non-tied count is reported next to every AUC here. */
function nonTied(pairs: Pair[]): number {
  return pairs.filter(p => p.real !== p.degraded).length;
}

let eligible = 0;
for (const src of sources) {
  const intactScenes = segment(src.text);
  if (intactScenes.length < 3) continue;
  const intactStats = sceneStats(intactScenes);
  eligible++;
  for (const d of DEGS) {
    const degText = d.fn(src.text);
    if (degText === null) continue;
    const degStats = sceneStats(segment(degText));
    for (const id of FORMULATION_IDS) {
      const a = FORMULATIONS[id](intactStats);
      const b = FORMULATIONS[id](degStats);
      if (Number.isNaN(a) || Number.isNaN(b)) continue;
      pairsByFormulation[id][d.id].push({ real: -a, degraded: -b });
      const w = winsByFormulation[id][d.id];
      w.n++; if (b > a + 0.02) w.rose++;
    }
  }
}
console.log(`\neligible scripts (>= 3 scenes): ${eligible}/${sources.length}`);

console.log('\n  formulation                      | degradation      |   AUC   95% CI          | rose>0.02 | non-tied');
console.log('  ---------------------------------|------------------|-------------------------|-----------|---------');
const part3: Record<string, unknown> = {};
for (const id of FORMULATION_IDS) {
  const row: Record<string, unknown> = {};
  for (const d of DEGS) {
    const p = pairsByFormulation[id][d.id];
    const auc = pairwiseAuc(p);
    const c = bootstrapCi(p, BOOTSTRAP, SEED);
    const w = winsByFormulation[id][d.id];
    const nt = nonTied(p);
    row[d.id] = { pairs: p.length, auc, ci: c, rose: w.rose, n: w.n, nonTied: nt };
    console.log(`  ${id.padEnd(32)} | ${d.id.padEnd(16)} | ${fmt(auc)} ${ciStr(c)} | `
      + `${String(`${w.rose}/${w.n}`).padStart(9)} | ${String(`${nt}/${p.length}`).padStart(8)}`);
  }
  part3[id] = row;
  console.log('  ---------------------------------|------------------|-------------------------|-----------|---------');
}
console.log('  non-tied = pairs where the statistic actually moved. A low count next to an AUC far from');
console.log('  0.5 means the number rests on a handful of scripts, whatever the CI says.');
report.part3Formulations = part3;

// ── Verdict, computed rather than asserted ──────────────────────────────
h1('PART 4 — VERDICT (computed from the numbers above, not asserted)');
console.log('A formulation is a viable CLIMAX_RELOCATE discriminator only if BOTH hold:');
console.log('  (a) SENSITIVITY — its CLIMAX_RELOCATE 95% CI lower bound is above 0.5, and');
console.log('  (b) SPECIFICITY — its MID_SCENE_RELOCATE AUC is materially LOWER than its');
console.log('      CLIMAX_RELOCATE AUC (>= 0.05 apart). Moving an ordinary scene to the front must');
console.log('      not look the same as moving the climax there, or the formulation is a');
console.log('      front-of-document-change detector wearing a climax label.');
console.log('  (MIDPOINT_DROP is shown for continuity but cannot move a position-1 statistic.)');
const verdicts: Array<{ id: string; relocateAuc: number; relocateLo: number; nonTied: number; midRelocateAuc: number; specificityGap: number; viable: boolean }> = [];
for (const id of FORMULATION_IDS) {
  const rel = part3[id] as Record<string, { auc: number; ci: { lo: number; hi: number }; nonTied: number; pairs: number }>;
  const relocate_ = rel.CLIMAX_RELOCATE; const midRel = rel.MID_SCENE_RELOCATE;
  const aboveChance = relocate_.ci.lo > 0.5;
  const gap = relocate_.auc - midRel.auc;
  const specific = gap >= 0.05;
  verdicts.push({
    id, relocateAuc: relocate_.auc, relocateLo: relocate_.ci.lo, nonTied: relocate_.nonTied,
    midRelocateAuc: midRel.auc, specificityGap: gap, viable: aboveChance && specific,
  });
  console.log(`  ${id.padEnd(32)} relocate ${fmt(relocate_.auc)} CI-lo ${relocate_.ci.lo.toFixed(3)} `
    + `${aboveChance ? 'ABOVE CHANCE' : 'at/below chance'} | mid-scene ${fmt(midRel.auc)} `
    + `gap ${(gap >= 0 ? '+' : '') + gap.toFixed(3)} ${specific ? 'SPECIFIC' : 'not specific'}`
    + ` | non-tied ${relocate_.nonTied}/${relocate_.pairs}`
    + ` => ${aboveChance && specific ? 'VIABLE' : 'NOT VIABLE'}`);
}
const anyViable = verdicts.some(v => v.viable);
console.log(`\n${anyViable
  ? 'At least one formulation clears both conditions on this corpus.'
  : 'NO formulation clears both conditions on this corpus. On the material this session can reach,'
    + '\nnoun-type-aware novelty does NOT discriminate CLIMAX_RELOCATE. That is a real result, not a'
    + '\ngap — and it does not by itself refute the hypothesis at feature scale (see the doc).'}`);
console.log('\nTWO THINGS THAT MUST BE READ WITH ANY "VIABLE" ABOVE:');
console.log(`  1. MULTIPLE COMPARISONS. ${FORMULATION_IDS.length} formulations were tested against the same target on the`);
console.log('     same 38 scripts. At a 95% CI, roughly one in twenty such tests clears chance by');
console.log('     accident, and nothing here was pre-registered. A single VIABLE row out of');
console.log(`     ${FORMULATION_IDS.length} is the weakest kind of positive result there is.`);
console.log('  2. TIES. Check the non-tied count. A statistic that is identical on both arms of most');
console.log('     scripts can post an AUC far from 0.5 off a handful of moving pairs.');
console.log('\nNOTHING HERE IS WIRED. No deduction, no rule, no scoring change.');
report.part4Verdict = { verdicts, anyViable };

console.log('\nOWNER DISCHARGE — the same harness against the real corpus:');
console.log('  CORPUS_DIR=<761-script corpus> node --experimental-strip-types scripts/rederive-climax-relocate.ts');

fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, 'climax-relocate-rederivation.json');
fs.writeFileSync(outFile, JSON.stringify(report, (_k, v) => (typeof v === 'number' && Number.isNaN(v) ? null : v), 2));
console.log(`\nWrote ${outFile}`);
