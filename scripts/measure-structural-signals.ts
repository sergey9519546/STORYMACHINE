#!/usr/bin/env node --experimental-strip-types
// Density + separation measurement for server/nvm/analyze/structural-signals.ts.
//
//   node --experimental-strip-types scripts/measure-structural-signals.ts
//
// Produces the numbers recorded in docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md.
// Nothing here changes a scoring path; it only reads the additive, unwired
// `structuralSignals` block and reports what it is worth.
//
// ── WHAT IS MEASURED, AND WITH WHICH STATISTIC ───────────────────────────────
// PART A — DENSITY. For every per-scene channel, the fraction of scenes on
//   which it is non-zero (for the boolean channel: the fraction true), over the
//   20 `data/screenplays/*.fountain` fixtures plus the 20 calibration
//   REFERENCE_CORPUS samples. The brief this work answers sets the bar
//   explicitly: a channel that is zero on more than half of scenes is NOT the
//   fix and must be reported as such. The four legacy lexicon channels are
//   measured on the same scenes, in the same units, as the control — they are
//   the "absent on ~93% of scenes" baseline this whole module exists to answer.
//
// PART B/C/D — SEPARATION. ONE statistic throughout, so the three sets are
//   directly comparable: the RANK-ORDERING COUNT — of the N cross-group script
//   pairs, how many does this channel order in the registered direction (ties
//   count 0.5). Divided by N that number IS the Mann-Whitney AUC, so it is
//   reported both ways and no second statistic is smuggled in.
//     B: the advice-quality audit's matched excellent/bad pair (N = 1).
//     C: calibration corpus, 5 'strong' vs 5 'troubled' (N = 25).
//     D: tests/fixtures/blind-pairs/, if that directory exists (another lane
//        may add it); skipped with a printed notice when it does not.
//
//   The direction each channel is scored in is PRE-REGISTERED in
//   STRUCTURAL_SIGNAL_SPECS (structural-signals.ts) and was written before any
//   of these numbers existed. Channels registered `direction: 'none'` have no
//   defensible craft prior; for them the raw AUC is printed in the arbitrary
//   'higher' direction and marked DESCRIPTIVE, and it is not counted as a hit
//   or a miss. That is what keeps this from being direction-fishing after the
//   fact: a channel cannot be scored a winner by picking its sign once the
//   answer is visible.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeStructuralSignals,
  STRUCTURAL_SIGNAL_SPECS,
  type StructuralSignalsReport,
  type SceneStructuralSignals,
} from '../server/nvm/analyze/structural-signals.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { detectSceneAgency } from '../server/nvm/analyze/agency-signal.ts';
import { detectReversals } from '../server/nvm/analyze/reversal-detection.ts';
import { REFERENCE_CORPUS } from '../server/nvm/analyze/calibration/corpus.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

interface Script {
  label: string;
  fountain: string;
}

function loadScreenplayFixtures(): Script[] {
  const dir = path.join(REPO_ROOT, 'data/screenplays');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.fountain'))
    .sort()
    .map(f => ({ label: `cc0/${f.replace(/\.fountain$/, '')}`, fountain: readFileSync(path.join(dir, f), 'utf8') }));
}

function loadBlindPairs(): Array<{ label: string; good: Script; bad: Script }> {
  const dir = path.join(REPO_ROOT, 'tests/fixtures/blind-pairs');
  if (!existsSync(dir)) return [];
  // Convention-tolerant: pair files whose basenames differ only by a
  // good/strong/excellent vs bad/weak/troubled marker, or that sit in a
  // per-pair subdirectory. Anything unpaired is reported, never guessed at.
  const out: Array<{ label: string; good: Script; bad: Script }> = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const GOOD = /(good|strong|excellent|better|a)\b/i;
  const BAD = /(bad|weak|troubled|worse|b)\b/i;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const sub = path.join(dir, e.name);
    const files = readdirSync(sub).filter(f => f.endsWith('.fountain')).sort();
    const goodFile = files.find(f => GOOD.test(path.basename(f, '.fountain')));
    const badFile = files.find(f => BAD.test(path.basename(f, '.fountain')) && f !== goodFile);
    if (!goodFile || !badFile) continue;
    out.push({
      label: e.name,
      good: { label: `${e.name}/${goodFile}`, fountain: readFileSync(path.join(sub, goodFile), 'utf8') },
      bad: { label: `${e.name}/${badFile}`, fountain: readFileSync(path.join(sub, badFile), 'utf8') },
    });
  }
  return out;
}

// ── Part A: density ─────────────────────────────────────────────────────────

const SCENE_CHANNELS: Array<{ key: keyof SceneStructuralSignals; label: string }> = [
  { key: 'words', label: 'words' },
  { key: 'lengthZ', label: 'lengthZ' },
  { key: 'dialogueShare', label: 'dialogueShare' },
  { key: 'dialogueShareDelta', label: 'dialogueShareDelta' },
  { key: 'speakerTurns', label: 'speakerTurns' },
  { key: 'meanTurnWords', label: 'meanTurnWords' },
  { key: 'speakers', label: 'speakers' },
  { key: 'newPairs', label: 'newPairs' },
  { key: 'leadShare', label: 'leadShare' },
  { key: 'actionSentenceCv', label: 'actionSentenceCv' },
  { key: 'openCloseShift', label: 'openCloseShift' },
  { key: 'openCloseModeFlip', label: 'openCloseModeFlip (boolean)' },
];

function pct(n: number, d: number): string {
  return d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}%`;
}

function measureDensity(setLabel: string, scripts: Script[]): void {
  const nonZero = new Map<string, number>();
  let scenes = 0;

  // Legacy lexicon-channel control, measured on exactly the same scenes.
  let neutralShift = 0;
  let clockRaised = 0;
  let revelation = 0;
  let suspenseNonZero = 0;
  let agencyEvidence = 0;
  let reversalScenes = 0;
  // DROPPED CANDIDATE, kept measured: per-scene dialogue question density.
  // Measured here inline rather than emitted on every report, because that is
  // exactly the finding — it fails the same >50% density bar the lexicon
  // channels fail, so it is not the fix and does not earn report bytes.
  let questionScenes = 0;

  for (const s of scripts) {
    const block = computeStructuralSignals(s.fountain);
    scenes += block.scenes.length;
    for (const row of block.scenes) {
      for (const ch of SCENE_CHANNELS) {
        const v = row[ch.key];
        const hit = typeof v === 'boolean' ? v : Math.abs(v as number) > 0;
        if (hit) nonZero.set(ch.label, (nonZero.get(ch.label) ?? 0) + 1);
      }
    }

    const analysis = analyzeFountainText(s.fountain);
    const lead = analysis.characters[0] ?? '';
    for (const r of analysis.records) {
      if (r.emotionalShift === 'neutral') neutralShift++;
      if (r.clockRaised) clockRaised++;
      if (r.revelation) revelation++;
      if (r.suspenseDelta !== 0) suspenseNonZero++;
      if (lead && detectSceneAgency(r, lead).evidenceKind !== null) agencyEvidence++;
    }
    reversalScenes += detectReversals(analysis.records).reversalCount;

    for (const sceneText of s.fountain.split(/^(?=(?:INT|EXT)\.)/mi).filter(t => /^(?:INT|EXT)\./i.test(t))) {
      // Question density over the scene's dialogue-ish lines: any line that is
      // neither the slugline nor an ALL-CAPS cue, ending in '?'.
      const lines = sceneText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(1);
      if (lines.some(l => /\?\s*$/.test(l))) questionScenes++;
    }
  }

  console.log(`\n## PART A — DENSITY — ${setLabel} (${scripts.length} scripts, ${scenes} scenes)\n`);
  console.log('| channel | non-zero scenes | rate | verdict |');
  console.log('|---|---|---|---|');
  for (const ch of SCENE_CHANNELS) {
    const n = nonZero.get(ch.label) ?? 0;
    const rate = scenes === 0 ? 0 : n / scenes;
    const verdict = rate > 0.5 ? 'DENSE' : 'SPARSE — fails the >50% bar';
    console.log(`| ${ch.label} | ${n}/${scenes} | ${pct(n, scenes)} | ${verdict} |`);
  }
  console.log('\nLegacy lexicon-channel control, same scenes:\n');
  console.log('| legacy channel | present scenes | rate |');
  console.log('|---|---|---|');
  console.log(`| emotionalShift !== neutral | ${scenes - neutralShift}/${scenes} | ${pct(scenes - neutralShift, scenes)} |`);
  console.log(`| clockRaised | ${clockRaised}/${scenes} | ${pct(clockRaised, scenes)} |`);
  console.log(`| revelation present | ${revelation}/${scenes} | ${pct(revelation, scenes)} |`);
  console.log(`| suspenseDelta !== 0 | ${suspenseNonZero}/${scenes} | ${pct(suspenseNonZero, scenes)} |`);
  console.log(`| agency-signal evidence (unwired) | ${agencyEvidence}/${scenes} | ${pct(agencyEvidence, scenes)} |`);
  console.log(`| reversal-detection candidates (unwired) | ${reversalScenes}/${scenes} | ${pct(reversalScenes, scenes)} |`);
  console.log('\nDropped candidate, measured on the same scenes:\n');
  console.log('| dropped channel | scenes with any question | rate |');
  console.log('|---|---|---|');
  console.log(`| dialogue question density | ${questionScenes}/${scenes} | ${pct(questionScenes, scenes)} |`);
}

// ── Parts B/C/D: separation ─────────────────────────────────────────────────

type ReportKey = (typeof STRUCTURAL_SIGNAL_SPECS)[number]['key'];

function value(block: StructuralSignalsReport, key: ReportKey): number {
  const v = block[key];
  return typeof v === 'number' ? v : 0;
}

interface PairSet {
  name: string;
  /** Every (better, worse) pair to be ordered. */
  pairs: Array<{ better: StructuralSignalsReport; worse: StructuralSignalsReport }>;
}

function rankOrderingCount(set: PairSet, key: ReportKey, direction: 'higher' | 'lower' | 'none'): number {
  let hits = 0;
  for (const p of set.pairs) {
    const b = value(p.better, key);
    const w = value(p.worse, key);
    if (b === w) { hits += 0.5; continue; }
    // 'none' is scored in the arbitrary 'higher' direction and printed as
    // DESCRIPTIVE — it is never counted as evidence for or against.
    const wantHigher = direction !== 'lower';
    if (wantHigher ? b > w : b < w) hits += 1;
  }
  return hits;
}

function reportSeparation(sets: PairSet[]): void {
  console.log('\n## PARTS B/C/D — SEPARATION (rank-ordering count / N pairs = AUC)\n');
  const header = ['| channel | direction |', ...sets.map(s => ` ${s.name} (N=${s.pairs.length}) |`)].join('');
  console.log(header);
  console.log(`|---|---|${sets.map(() => '---|').join('')}`);
  for (const spec of STRUCTURAL_SIGNAL_SPECS) {
    const cells = sets.map(set => {
      if (set.pairs.length === 0) return ' — |';
      const hits = rankOrderingCount(set, spec.key, spec.direction);
      const auc = hits / set.pairs.length;
      const tag = spec.direction === 'none' ? ' desc' : (auc > 0.5 ? ' ✓' : auc < 0.5 ? ' ✗' : ' =');
      return ` ${hits}/${set.pairs.length} = ${auc.toFixed(3)}${tag} |`;
    });
    console.log(`| ${String(spec.key)} | ${spec.direction} |${cells.join('')}`);
  }
}

function printRawPair(label: string, better: StructuralSignalsReport, worse: StructuralSignalsReport): void {
  console.log(`\n### Raw values — ${label}\n`);
  console.log('| channel | better | worse |');
  console.log('|---|---|---|');
  for (const spec of STRUCTURAL_SIGNAL_SPECS) {
    console.log(`| ${String(spec.key)} | ${value(better, spec.key)} | ${value(worse, spec.key)} |`);
  }
}

// ── Collinearity attack ─────────────────────────────────────────────────────
// A channel that "separates" is worth nothing if it is a restatement of a
// channel already present. This prints Spearman rho between every report
// channel and `meanSpeakersPerScene` — the crudest possible cast-size proxy —
// across every script measured. |rho| near 1 means the channel is telling you
// how many people are in the room, not how good the writing is.

function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]): number[] => {
    const idx = xs.map((v, i) => ({ v, i })).sort((p, q) => p.v - q.v);
    const out = new Array<number>(xs.length).fill(0);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) out[idx[k].i] = avg;
      i = j + 1;
    }
    return out;
  };
  const ra = rank(a);
  const rb = rank(b);
  const ma = ra.reduce((x, y) => x + y, 0) / ra.length;
  const mb = rb.reduce((x, y) => x + y, 0) / rb.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

function reportCollinearity(blocks: StructuralSignalsReport[]): void {
  console.log(`\n## COLLINEARITY — Spearman rho vs meanSpeakersPerScene (${blocks.length} scripts)\n`);
  const cast = blocks.map(b => b.meanSpeakersPerScene);
  console.log('| channel | rho |');
  console.log('|---|---|');
  for (const spec of STRUCTURAL_SIGNAL_SPECS) {
    if (spec.key === 'meanSpeakersPerScene') continue;
    const rho = spearman(blocks.map(b => value(b, spec.key)), cast);
    console.log(`| ${String(spec.key)} | ${rho.toFixed(3)} |`);
  }
}

// ── main ────────────────────────────────────────────────────────────────────

function main(): void {
  const cc0 = loadScreenplayFixtures();
  const calibration: Script[] = REFERENCE_CORPUS.map(s => ({ label: `calib/${s.label}`, fountain: s.fountain }));

  console.log('# structural-signals measurement');
  console.log(`\nRun: node --experimental-strip-types scripts/measure-structural-signals.ts`);

  measureDensity('20 CC0 fixtures + 20 calibration samples', [...cc0, ...calibration]);
  measureDensity('20 CC0 fixtures only', cc0);
  measureDensity('20 calibration samples only', calibration);

  // Part B — the audit's matched pair.
  const auditDir = path.join(REPO_ROOT, 'tests/fixtures/advice-quality');
  const sets: PairSet[] = [];
  if (existsSync(path.join(auditDir, 'excellent.fountain'))) {
    const better = computeStructuralSignals(readFileSync(path.join(auditDir, 'excellent.fountain'), 'utf8'));
    const worse = computeStructuralSignals(readFileSync(path.join(auditDir, 'bad.fountain'), 'utf8'));
    sets.push({ name: 'B: audit pair', pairs: [{ better, worse }] });
    printRawPair('B: excellent vs bad (audit fixtures)', better, worse);
  }

  // Part C — calibration strong vs troubled.
  const strong = REFERENCE_CORPUS.filter(s => s.band === 'strong').map(s => computeStructuralSignals(s.fountain));
  const troubled = REFERENCE_CORPUS.filter(s => s.band === 'troubled').map(s => computeStructuralSignals(s.fountain));
  const calibPairs: PairSet['pairs'] = [];
  for (const b of strong) for (const w of troubled) calibPairs.push({ better: b, worse: w });
  sets.push({ name: 'C: calib strong>troubled', pairs: calibPairs });

  // Part D — blind pairs, if another lane has landed them.
  const blind = loadBlindPairs();
  if (blind.length === 0) {
    console.log('\n(Part D skipped: tests/fixtures/blind-pairs/ is absent or contains no recognizable pair directories.)');
  } else {
    sets.push({
      name: 'D: blind pairs',
      pairs: blind.map(p => ({
        better: computeStructuralSignals(p.good.fountain),
        worse: computeStructuralSignals(p.bad.fountain),
      })),
    });
    console.log(`\n(Part D: ${blind.length} blind pair(s) found: ${blind.map(p => p.label).join(', ')})`);
  }

  reportSeparation(sets);
  reportCollinearity([...cc0, ...calibration].map(sc => computeStructuralSignals(sc.fountain)));
  reportCollinearity(cc0.map(sc => computeStructuralSignals(sc.fountain)));
}

main();
