// P-2 EVIDENCE — the rule-catalog retirement bar B1-B7, measured on
// everything this repository can actually reach.
//
// ── What this is ─────────────────────────────────────────────────────────
// docs/PATH_TO_EXCELLENCE.md P-2: "The rule-catalog decision: run retirement
// evidence bar B1-B7 (channel-zero AUC on the real corpus). The project's own
// rebuild experiment measured the weighted-rule channel as inverted; two weeks
// later the question is still open. Settle it."
//
// The bar itself is defined in docs/p1-benchmark/RULE_CATALOG_RETIREMENT_
// DESIGN.md §3. Three of its seven items (B1, B3, B4) name the 761-script
// REAL_SCRIPT_CORPUS_DIR / CORPUS_DIR corpus, which is owner-local by
// copyright and physically absent from any remote session (CLAUDE.md's
// standing constraint; re-confirmed by this script's own reachability probe).
// This harness therefore does exactly what the P-1 evidence lane
// (scripts/measure-unwired-signals.ts, docs/p1-benchmark/UNWIRED_SIGNALS_
// EVIDENCE_2026-08-21.md) established as the honest pattern: measure what is
// reachable, report real numbers with uncertainty, and print the exact
// one-command discharge step for what is not.
//
// It DOES NOT retire anything. Removal is "a separate approved migration,
// never implied by 'freeze'" (CLAUDE.md / ROADMAP P1), and this file changes
// no scoring path — it calls only EXPORTED functions (runScriptDoctor,
// computeHealthScore, computeRawCraftScore) and edits nothing.
// `node scripts/check-scoring-receipt.mjs` exits 0 for this file.
//
// ── What it measures ─────────────────────────────────────────────────────
//   PART 1  Catalog census on the CURRENT tree (the design's §1 numbers,
//           re-derived rather than quoted — this is also B-step-1's freeze
//           check, done by counting, not by trusting).
//   PART 2  Step-0 firing frequency: which pass-scoped rules ever fire on the
//           reachable corpus, i.e. how large the design's Tier B (silent,
//           removable at zero measurable score cost BY CONSTRUCTION) actually
//           is on this material.
//   PART 3  B1 in-repo proxy: baseline vs. RULE_ZERO AUC over the four
//           degradation recipes, matched-pair, with a seeded percentile
//           bootstrap 95% CI. Adds the thing the 2026-08-04 rebuild
//           experiment flagged but did not resolve: the health-floor
//           saturation correction. A degraded variant that bottomed out at
//           health 0 has already lost the information the rule channel took
//           below zero, so every saturated pair TIES under RULE_ZERO and the
//           AUC on that degradation is measuring the floor, not the channel.
//           This harness reports both the all-pairs number and the
//           saturation-excluded number, so the reader can tell them apart.
//   PART 4  Graded top-K ablation: keep only the K most-firing rules, zero
//           the rest, and watch pooled AUC and DIALOGUE_FLATTEN AUC as a
//           function of K. This is the "smallest signal set that actually
//           separates" question (ROADMAP P1) asked OF THE CATALOG ITSELF.
//   PART 5  B5 calibration band monotonicity under the same ablations. The
//           calibration corpus is fully in-repo, so B5 is the one bar item
//           that can be settled here outright.
//   PART 6  B3 / B4 reachability probe (honest SKIP + the owner command).
//   PART 7  B2 / B6 / B7 process checks that can be verified mechanically.
//
// ── Run ──────────────────────────────────────────────────────────────────
//   node --experimental-strip-types scripts/measure-rule-channel-evidence.ts
// Owner machine, for the real B1:
//   CORPUS_DIR=<761-script corpus> node scripts/rebuild-experiment.mjs --partition=trainval
// Output: stdout report + scripts/output/rule-channel-evidence.json
// (a NEW artifact name — this script can never overwrite a committed
// evidence baseline, per the same discipline rebuild-experiment.mjs adopts).

import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor, computeHealthScore, computeRawCraftScore } from '../server/nvm/analyze/doctor.ts';
import { REFERENCE_CORPUS, type CorpusBand } from '../server/nvm/analyze/calibration/corpus.ts';
import type { ScriptDoctorReport } from '../server/nvm/analyze/types.ts';
// .mjs sibling library, deliberately shared verbatim with
// scripts/rebuild-experiment.mjs so the degradation recipes, the matched-pair
// AUC and the seeded bootstrap are the SAME code, not a second implementation
// that could drift. tsc types it structurally through allowJs.
import { DEGRADATIONS, pairwiseAuc, bootstrapCi } from './lib/rebuild-experiment-lib.mjs';

type Severity = 'critical' | 'major' | 'minor';
interface BySeverity { critical: number; major: number; minor: number }

const OUT_DIR = path.resolve('scripts/output');
const BOOTSTRAP = 2000;
const SEED = 42;

const report: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  script: 'scripts/measure-rule-channel-evidence.ts',
  bar: 'docs/p1-benchmark/RULE_CATALOG_RETIREMENT_DESIGN.md §3 (B1-B7)',
};

function h1(s: string): void {
  console.log(`\n${'═'.repeat(78)}\n${s}\n${'═'.repeat(78)}`);
}
function fmt(n: number): string {
  return Number.isNaN(n) ? '  n/a  ' : n.toFixed(3).padStart(7);
}
function ci(c: { lo: number; hi: number }): string {
  return Number.isNaN(c.lo) ? '[  n/a,   n/a]' : `[${c.lo.toFixed(3)}, ${c.hi.toFixed(3)}]`;
}

console.log('=== P-2 RULE-CHANNEL RETIREMENT EVIDENCE (B1-B7) ===');
console.log('Nothing here retires anything. Removal is a separate approved migration.');

// ════════════════════════════════════════════════════════════════════════
// PART 1 — Catalog census on the CURRENT tree
// ════════════════════════════════════════════════════════════════════════
// RULE_CATALOG_RETIREMENT_DESIGN.md §1 reports 3,216 pass-scoped constants /
// 3,185 distinct names as of 2026-08-04. Re-derived here by the same scan
// rather than quoted: a census that is only ever quoted is exactly how the
// disproven "~8,917 rules" story survived for as long as it did (R2-C01).
h1('PART 1 — CATALOG CENSUS (re-derived from the current tree, not quoted)');

const PASS_DIR = path.resolve('server/nvm/revision/passes');
const RULE_LITERAL_RE = /\brule:\s*'([A-Z0-9_]+)'/g;
const perPassRules = new Map<string, Set<string>>();
let passScopedTotal = 0;
let passFileLines = 0;

for (const f of fs.readdirSync(PASS_DIR).sort()) {
  if (!f.endsWith('.ts') || f === 'types.ts') continue;
  const src = fs.readFileSync(path.join(PASS_DIR, f), 'utf-8');
  passFileLines += src.split('\n').length;
  const names = new Set<string>();
  for (const m of src.matchAll(RULE_LITERAL_RE)) names.add(m[1]);
  perPassRules.set(f.replace(/\.ts$/, ''), names);
  passScopedTotal += names.size;
}
const distinctNames = new Set<string>();
for (const s of perPassRules.values()) for (const n of s) distinctNames.add(n);

console.log(`pass files scanned:            ${perPassRules.size} (excluding types.ts)`);
console.log(`pass-scoped constants (pass,RULE): ${passScopedTotal}   [design §1 records 3,216]`);
console.log(`distinct rule NAMES:               ${distinctNames.size}   [design §1 records 3,185]`);
console.log(`names owned by two passes:         ${passScopedTotal - distinctNames.size}   [design §1 records 31]`);
console.log(`total lines in those files:        ${passFileLines}   [design §1 records 97,953]`);

// The REAL freeze detector is tests/core/rulebook.test.ts, which compares the
// live extraction against docs/rulebook/README.md's published total. Read that
// published total here so this census reports drift against the live source of
// truth, not only against a dated design document.
let publishedTotal = Number.NaN;
try {
  const m = /Total distinct rules:\s*([0-9,]+)/.exec(fs.readFileSync(path.resolve('docs/rulebook/README.md'), 'utf-8'));
  if (m) publishedTotal = Number(m[1].replace(/,/g, ''));
} catch { /* generated file absent: leave NaN and say so below */ }
console.log(`docs/rulebook/README.md publishes:  ${Number.isNaN(publishedTotal) ? '(unreadable)' : publishedTotal}`);
console.log(publishedTotal === passScopedTotal
  ? 'LIVE FREEZE HOLDS: the census matches the generated rulebook exactly (this is the check'
    + '\n  tests/core/rulebook.test.ts enforces in CI).'
  : 'LIVE FREEZE BROKEN: the census does NOT match the generated rulebook — run `npm run rulebook`.');
console.log(passScopedTotal === 3216
  ? 'DESIGN DOC CURRENT: the 2026-08-04 design\'s 3,216 still matches the tree.'
  : `DESIGN DOC STALE: RULE_CATALOG_RETIREMENT_DESIGN.md §1 (and CLAUDE.md / ROADMAP P1) say 3,216;`
    + `\n  the tree holds ${passScopedTotal}. Delta ${passScopedTotal - 3216}. This is drift to RECORD, not`
    + '\n  necessarily a violation — check git log over server/nvm/revision/passes/ for the addition.');
report.part1Census = {
  passFiles: perPassRules.size,
  passScopedConstants: passScopedTotal,
  distinctNames: distinctNames.size,
  dualOwned: passScopedTotal - distinctNames.size,
  passFileLines,
  publishedTotal: Number.isNaN(publishedTotal) ? null : publishedTotal,
  liveFreezeHolds: publishedTotal === passScopedTotal,
  designRecords: { passScopedConstants: 3216, distinctNames: 3185, dualOwned: 31, lines: 97953 },
  designDocCurrent: passScopedTotal === 3216,
};

// ════════════════════════════════════════════════════════════════════════
// Corpus assembly — everything reachable, with partition discipline
// ════════════════════════════════════════════════════════════════════════
// Two reachable sources, kept LABELLED and reported separately, because they
// are not the same kind of evidence:
//   - CC0 screenplays under data/screenplays/ (real prose, third-party,
//     licence-clean). Files in the hash-locked held-out TEST partition
//     (scripts/output/corpus-split.json) are EXCLUDED — exploration that
//     touches the test set burns it (MEASUREMENT_RUNBOOK / PRE_REGISTRATION_
//     PROTOCOL, the same rule rebuild-experiment.mjs enforces).
//   - The 20-sample calibration reference corpus, which is AI-authored and
//     controlled-richness by design (CLAUDE.md's calibration gotcha). It is
//     the material B5 is defined over, so it belongs here — but it is a
//     sensitivity read on B1, never a corpus claim.

interface Source { label: string; origin: 'cc0' | 'calibration'; band?: CorpusBand; text: string }
const sources: Source[] = [];

const SPLIT_FILE = path.join(OUT_DIR, 'corpus-split.json');
let testPartition = new Set<string>();
if (fs.existsSync(SPLIT_FILE)) {
  try {
    const split = JSON.parse(fs.readFileSync(SPLIT_FILE, 'utf-8')) as { test: Array<{ file: string }> };
    testPartition = new Set(split.test.map(s => s.file));
  } catch { /* absent or malformed split: every file is unassigned, which trainval includes */ }
}

const CC0_DIR = path.resolve('data/screenplays');
let excludedAsTest = 0;
if (fs.existsSync(CC0_DIR)) {
  for (const f of fs.readdirSync(CC0_DIR).sort()) {
    if (!/\.(fountain|fountain\.txt|txt)$/i.test(f)) continue;
    if (testPartition.has(f)) { excludedAsTest++; continue; }
    sources.push({ label: f, origin: 'cc0', text: fs.readFileSync(path.join(CC0_DIR, f), 'utf-8') });
  }
}
for (const s of REFERENCE_CORPUS) {
  sources.push({ label: `calibration/${s.label}`, origin: 'calibration', band: s.band, text: s.fountain });
}

console.log(`\ncorpus: ${sources.filter(s => s.origin === 'cc0').length} CC0 (trainval; ${excludedAsTest} excluded as held-out test)`
  + ` + ${sources.filter(s => s.origin === 'calibration').length} calibration = ${sources.length} sources`);

// ════════════════════════════════════════════════════════════════════════
// Scoring — every variant scored ONCE; every ablation is arithmetic after
// ════════════════════════════════════════════════════════════════════════
// The exact-ablation identity is rebuild-experiment-lib.mjs's
// ruleChannelZeroAdjustment, generalised from "zero the whole channel" to
// "keep an arbitrary SUBSET of rules". doctor.ts:
//   health     = max(0, round10(baseHealth - structural - arc - dialogue))
//   baseHealth = computeHealthScore(bySeverity, sceneCount)
//   computeHealthScore = clamp(100 - densityPenalty(bySeverity, wordCount)
//                                  - scarcityPenalty(sceneCount))
// densityPenalty is the ONLY term reading bySeverity. So for any rule subset
// S, evaluating the EXPORTED computeHealthScore with bySeverity restricted to
// S, minus the same call with the real bySeverity, is the exact health delta
// of removing everything outside S — no edit to any scoring file, no
// approximation. The two honest edges the rebuild experiment already
// documented apply unchanged and are reported: health is rounded to 0.1
// before the adjustment (<= 0.05 drift), and health is floored at 0 (the
// saturation problem PART 3 corrects for).

interface Variant {
  health: number;
  sceneCount: number;
  wordCount: number;
  bySeverity: BySeverity;
  /** severity counts keyed by rule name — the input to any subset ablation */
  byRule: Map<string, BySeverity>;
  saturated: boolean;
}

function severityCountsByRule(rep: ScriptDoctorReport): Map<string, BySeverity> {
  const m = new Map<string, BySeverity>();
  for (const p of rep.passes) {
    for (const issue of p.issues) {
      const cur = m.get(issue.rule) ?? { critical: 0, major: 0, minor: 0 };
      cur[issue.severity as Severity] += 1;
      m.set(issue.rule, cur);
    }
  }
  return m;
}

async function scoreVariant(text: string): Promise<Variant | null> {
  let rep: ScriptDoctorReport;
  // Third argument omitted deliberately. rebuild-experiment.mjs passes the
  // string 'quick' here, which is not the options type — reading `.deepRead`
  // off a string yields undefined, so at runtime that call is IDENTICAL to
  // passing nothing. Omitting it keeps this harness numerically comparable to
  // that one while staying type-correct.
  try { rep = await runScriptDoctor(text, { theme: '', genre: '', directorStyle: '', characters: '' }); }
  catch { return null; }
  if (!rep.sceneCount || rep.sceneCount < 5) return null;
  const bySeverity = rep.passes.reduce<BySeverity>(
    (acc, p) => ({ critical: acc.critical + p.critical, major: acc.major + p.major, minor: acc.minor + p.minor }),
    { critical: 0, major: 0, minor: 0 },
  );
  return {
    health: rep.health,
    sceneCount: rep.sceneCount,
    wordCount: rep.wordCount,
    bySeverity,
    byRule: severityCountsByRule(rep),
    saturated: rep.health === 0,
  };
}

/** Health with only rules in `keep` still counting. `keep === null` keeps
 *  every rule (the identity — must reproduce doctor's own health exactly).
 *  `keep` empty is the full RULE_ZERO ablation. */
function healthKeeping(v: Variant, keep: Set<string> | null): number {
  if (keep === null) return v.health;
  const kept: BySeverity = { critical: 0, major: 0, minor: 0 };
  for (const [rule, counts] of v.byRule) {
    if (!keep.has(rule)) continue;
    kept.critical += counts.critical; kept.major += counts.major; kept.minor += counts.minor;
  }
  const adj = computeHealthScore(kept, v.sceneCount)
    - computeHealthScore(v.bySeverity, v.sceneCount);
  return Math.max(0, Math.min(100, v.health + adj));
}

interface Scored { src: Source; intact: Variant; degraded: Map<string, Variant> }
const scored: Scored[] = [];
let skipped = 0;

for (const src of sources) {
  const intact = await scoreVariant(src.text);
  if (!intact) { skipped++; continue; }
  const degraded = new Map<string, Variant>();
  for (const d of DEGRADATIONS as Array<{ id: string; fn: (t: string) => string | null }>) {
    const dt = d.fn(src.text);
    if (dt === null) continue;
    const dv = await scoreVariant(dt);
    if (dv) degraded.set(d.id, dv);
  }
  scored.push({ src, intact, degraded });
}
console.log(`scored ${scored.length} source(s); ${skipped} skipped (<5 scenes, unreadable, or analyzer failure).`);

// ════════════════════════════════════════════════════════════════════════
// PART 2 — Step-0 firing frequency (how big is Tier B, really?)
// ════════════════════════════════════════════════════════════════════════
h1('PART 2 — STEP-0 FIRING FREQUENCY (design §4 Step 0, on the reachable corpus)');

const firingScripts = new Map<string, number>();   // rule -> # intact scripts it fires on
const firingWeight = new Map<string, number>();    // rule -> total weighted severity (4/1.5/0.5)
for (const s of scored) {
  for (const [rule, counts] of s.intact.byRule) {
    firingScripts.set(rule, (firingScripts.get(rule) ?? 0) + 1);
    const w = counts.critical * 4 + counts.major * 1.5 + counts.minor * 0.5;
    firingWeight.set(rule, (firingWeight.get(rule) ?? 0) + w);
  }
}
/** Every rule observed firing on ANY variant, intact or degraded. Distinct
 *  from the Tier-B census above, which is (correctly) defined over INTACT
 *  scripts only — a rule is a retirement candidate because real drafts never
 *  trip it, not because a synthetic degradation never does. The two sets are
 *  not the same, and the gap is itself a measured quantity, reported below. */
const firedAnywhere = new Set<string>(firingScripts.keys());
for (const s of scored) for (const v of s.degraded.values()) for (const rule of v.byRule.keys()) firedAnywhere.add(rule);
const degradationOnly = firedAnywhere.size - firingScripts.size;
// A rule NAME can be owned by two passes; the design counts pass-scoped
// constants. Firing is observed by NAME (RevisionIssue carries no pass), so
// this is a NAME-level census and is reported as such — an over-count of
// Tier B by at most the 31 dual-owned names, stated rather than hidden.
const everFired = firingScripts.size;
const silentNames = distinctNames.size - everFired;
console.log(`distinct rule names that fire at least once: ${everFired} / ${distinctNames.size}`
  + ` (${(100 * everFired / distinctNames.size).toFixed(1)}%)`);
console.log(`SILENT on this corpus (Tier B candidates):   ${silentNames} / ${distinctNames.size}`
  + ` (${(100 * silentNames / distinctNames.size).toFixed(1)}%)`);
console.log(`fires only on a DEGRADED variant, never intact: ${degradationOnly} name(s)`);
console.log('NAME-level, not pass-scoped: RevisionIssue carries no pass, so a name owned by two');
console.log(`passes is observed once. Upper bound on the discrepancy: ${passScopedTotal - distinctNames.size} constants.`);
console.log('READ WITH CARE: "silent on 38 short scripts" is NOT "silent on 761 features". Design §4');
console.log('Step 0 requires this census on the REAL corpus before any name enters Tier B.');

const ranked = [...firingWeight.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
console.log('\nTop 15 rules by total weighted severity contributed:');
console.log('  rank | rule                                      | scripts | weight');
ranked.slice(0, 15).forEach(([rule, w], i) => {
  console.log(`  ${String(i + 1).padStart(4)} | ${rule.slice(0, 41).padEnd(41)} | `
    + `${String(firingScripts.get(rule)).padStart(7)} | ${w.toFixed(1).padStart(6)}`);
});
const totalWeight = ranked.reduce((s, [, w]) => s + w, 0);
for (const k of [1, 5, 10, 25, 50, 100]) {
  const share = ranked.slice(0, k).reduce((s, [, w]) => s + w, 0) / totalWeight;
  console.log(`  top ${String(k).padStart(3)} rules carry ${(100 * share).toFixed(1)}% of all weighted severity`);
}
report.part2Firing = {
  distinctNames: distinctNames.size,
  everFired,
  silentNames,
  silentFraction: silentNames / distinctNames.size,
  dualOwnedUpperBound: passScopedTotal - distinctNames.size,
  totalWeight,
  top15: ranked.slice(0, 15).map(([rule, w]) => ({ rule, scripts: firingScripts.get(rule), weight: +w.toFixed(2) })),
};

// ════════════════════════════════════════════════════════════════════════
// PART 3 — B1 in-repo proxy: baseline vs RULE_ZERO, saturation-corrected
// ════════════════════════════════════════════════════════════════════════
h1('PART 3 — B1 IN-REPO PROXY: channel-zero AUC (the real B1 needs the 761-script corpus)');

interface Pair { real: number; degraded: number; saturated: boolean; origin: Source['origin'] }
function pairsFor(keep: Set<string> | null, degId: string, filter?: (s: Scored) => boolean): Pair[] {
  const out: Pair[] = [];
  for (const s of scored) {
    if (filter && !filter(s)) continue;
    const dv = s.degraded.get(degId);
    if (!dv) continue;
    out.push({
      real: healthKeeping(s.intact, keep),
      degraded: healthKeeping(dv, keep),
      saturated: s.intact.saturated || dv.saturated,
      origin: s.src.origin,
    });
  }
  return out;
}

const DEG_IDS = (DEGRADATIONS as Array<{ id: string }>).map(d => d.id);
const EMPTY = new Set<string>();

function aucBlock(keep: Set<string> | null, filter?: (s: Scored) => boolean) {
  const rows: Record<string, { pairs: number; auc: number; ci: { lo: number; hi: number }; satPairs: number; aucExSat: number; ciExSat: { lo: number; hi: number } }> = {};
  const pooled: Pair[] = []; const pooledEx: Pair[] = [];
  for (const id of DEG_IDS) {
    const p = pairsFor(keep, id, filter);
    const ex = p.filter(x => !x.saturated);
    pooled.push(...p); pooledEx.push(...ex);
    rows[id] = {
      pairs: p.length, auc: pairwiseAuc(p), ci: bootstrapCi(p, BOOTSTRAP, SEED),
      satPairs: p.length - ex.length, aucExSat: pairwiseAuc(ex), ciExSat: bootstrapCi(ex, BOOTSTRAP, SEED),
    };
  }
  rows.POOLED = {
    pairs: pooled.length, auc: pairwiseAuc(pooled), ci: bootstrapCi(pooled, BOOTSTRAP, SEED),
    satPairs: pooled.length - pooledEx.length, aucExSat: pairwiseAuc(pooledEx), ciExSat: bootstrapCi(pooledEx, BOOTSTRAP, SEED),
  };
  return rows;
}

function printAucBlock(title: string, base: ReturnType<typeof aucBlock>, zero: ReturnType<typeof aucBlock>) {
  console.log(`\n${title}`);
  console.log('degradation      | baseline AUC  95% CI          | RULE_ZERO AUC  95% CI         | delta  | sat pairs');
  console.log('-----------------|-------------------------------|-------------------------------|--------|----------');
  for (const id of [...DEG_IDS, 'POOLED']) {
    const b = base[id]; const z = zero[id];
    const delta = z.auc - b.auc;
    console.log(`${id.padEnd(16)} | ${fmt(b.auc)} ${ci(b.ci)} | ${fmt(z.auc)} ${ci(z.ci)} | `
      + `${(delta >= 0 ? '+' : '') + delta.toFixed(3)} | ${b.satPairs}/${b.pairs}`);
  }
  console.log('saturation-corrected (health-0 pairs dropped — see the header note):');
  for (const id of [...DEG_IDS, 'POOLED']) {
    const b = base[id]; const z = zero[id];
    if (b.satPairs === 0) continue;
    console.log(`${id.padEnd(16)} | ${fmt(b.aucExSat)} ${ci(b.ciExSat)} | ${fmt(z.aucExSat)} ${ci(z.ciExSat)} | `
      + `${((z.aucExSat - b.aucExSat) >= 0 ? '+' : '') + (z.aucExSat - b.aucExSat).toFixed(3)} | n=${b.pairs - b.satPairs}`);
  }
}

const baseAll = aucBlock(null);
const zeroAll = aucBlock(EMPTY);
printAucBlock('ALL reachable sources (CC0 trainval + calibration)', baseAll, zeroAll);

const baseCc0 = aucBlock(null, s => s.src.origin === 'cc0');
const zeroCc0 = aucBlock(EMPTY, s => s.src.origin === 'cc0');
printAucBlock('CC0 ONLY (real third-party prose — the closer analogue of the real corpus)', baseCc0, zeroCc0);

// B1's explicit pass condition, checked rather than eyeballed.
console.log('\n── B1 PASS CONDITION, evaluated on this in-repo proxy ──');
console.log('Design §3 B1: RULE_ZERO must not be worse than baseline on POOLED AUC, AND its CI');
console.log('lower bound on DIALOGUE_FLATTEN must not fall below the >= 0.80 gate that channel clears.');
for (const [name, b, z] of [['ALL sources', baseAll, zeroAll], ['CC0 only', baseCc0, zeroCc0]] as const) {
  const pooledOk = z.POOLED.auc >= b.POOLED.auc;
  const dfLo = z.DIALOGUE_FLATTEN.ci.lo;
  const dfOk = !(dfLo < 0.80);
  console.log(`  ${name.padEnd(12)}: pooled ${b.POOLED.auc.toFixed(3)} -> ${z.POOLED.auc.toFixed(3)} `
    + `${pooledOk ? 'PASS' : 'FAIL'} | DIALOGUE_FLATTEN CI lo ${Number.isNaN(dfLo) ? 'n/a' : dfLo.toFixed(3)} `
    + `${dfOk ? 'PASS' : 'FAIL'} (gate 0.80) => ${pooledOk && dfOk ? 'B1-proxy PASS' : 'B1-proxy FAIL'}`);
}
console.log('This is a PROXY on 38 short scripts, not B1. B1 is defined over the 761-script corpus and');
console.log('is the only version of this number that can decide a retirement. See PART 6.');
report.part3B1Proxy = { all: { baseline: baseAll, ruleZero: zeroAll }, cc0: { baseline: baseCc0, ruleZero: zeroCc0 } };

// ════════════════════════════════════════════════════════════════════════
// PART 4 — Graded top-K ablation
// ════════════════════════════════════════════════════════════════════════
h1('PART 4 — GRADED TOP-K ABLATION (how few rules reproduce the channel?)');
console.log('Keep only the K rules contributing the most weighted severity across the corpus; zero the');
console.log('rest. K=0 is the full RULE_ZERO ablation; K=all is today\'s doctor. The interesting');
console.log('question is not "is the channel useful" but "how much of it is".');

const K_VALUES = [0, 1, 5, 10, 25, 50, 100, 250, 500];
const kRows: Array<{ k: number | 'all'; kept: number; pooled: number; pooledCi: { lo: number; hi: number }; dialogue: number; shuffle: number; drop: number; relocate: number }> = [];
for (const k of [...K_VALUES, 'all' as const]) {
  const keep = k === 'all' ? null : new Set(ranked.slice(0, k).map(([r]) => r));
  const block = aucBlock(keep);
  kRows.push({
    k, kept: keep === null ? everFired : keep.size,
    pooled: block.POOLED.auc, pooledCi: block.POOLED.ci,
    dialogue: block.DIALOGUE_FLATTEN.auc, shuffle: block.SCENE_SHUFFLE.auc,
    drop: block.MIDPOINT_DROP.auc, relocate: block.CLIMAX_RELOCATE.auc,
  });
}
console.log('\n  K      | rules kept | pooled AUC  95% CI          | SHUFFLE | DROP    | RELOCATE| DIALOGUE');
console.log('  -------|------------|-----------------------------|---------|---------|---------|---------');
for (const r of kRows) {
  console.log(`  ${String(r.k).padEnd(6)} | ${String(r.kept).padStart(10)} | ${fmt(r.pooled)} ${ci(r.pooledCi)} | `
    + `${fmt(r.shuffle)} | ${fmt(r.drop)} | ${fmt(r.relocate)} | ${fmt(r.dialogue)}`);
}
report.part4TopK = kRows;

// A Tier-B sanity check that must hold by construction: keeping exactly the
// rules that fire is arithmetically identical to keeping everything. If this
// ever prints a difference, the subset arithmetic is wrong and every number
// above is suspect.
const anywhereBlock = aucBlock(firedAnywhere);
const arithmeticSound = [...DEG_IDS, 'POOLED'].every(id => Object.is(anywhereBlock[id].auc, baseAll[id].auc));
console.log(`\nSubset-arithmetic soundness check (keep every rule observed firing on ANY variant):`);
console.log(`  ${arithmeticSound ? 'IDENTICAL to baseline on all five statistics, as required by construction.' : 'DIFFERS — the subset arithmetic is WRONG; treat every number above as suspect.'}`);

// Tier B as the design actually defines it: never fires on a real (intact)
// script. Removing exactly those rules is zero-cost on intact scoring by
// construction, but it is NOT zero-cost on a degraded variant, because
// `degradationOnly` rules exist. Measured, not assumed.
const tierBBlock = aucBlock(new Set(firingScripts.keys()));
const tierBIdentical = [...DEG_IDS, 'POOLED'].every(id => Object.is(tierBBlock[id].auc, baseAll[id].auc));
console.log(`\nTier-B removal (design §4 Step 2: drop rules no INTACT script fires):`);
console.log(`  ${degradationOnly} rule name(s) fire only under degradation, so this is NOT automatically a no-op`);
console.log('  on the degradation harness even though it is a no-op on every intact score.');
console.log(`  effect on discrimination: ${tierBIdentical ? 'none — all five AUCs unchanged' : 'measurable, see below'}`);
if (!tierBIdentical) {
  console.log('  degradation      | baseline AUC | Tier-B-removed AUC | delta');
  for (const id of [...DEG_IDS, 'POOLED']) {
    const d = tierBBlock[id].auc - baseAll[id].auc;
    console.log(`  ${id.padEnd(16)} | ${fmt(baseAll[id].auc)}      | ${fmt(tierBBlock[id].auc)}            | `
      + `${(d >= 0 ? '+' : '') + d.toFixed(3)}`);
  }
}
report.part4Arithmetic = { arithmeticSound, tierBIdentical, degradationOnlyRules: degradationOnly };

// ════════════════════════════════════════════════════════════════════════
// PART 5 — B5 calibration band monotonicity
// ════════════════════════════════════════════════════════════════════════
h1('PART 5 — B5: CALIBRATION BAND MONOTONICITY under the same ablations');
console.log('tests/core/calibration.test.ts asserts strict band-average monotonicity on');
console.log('computeRawCraftScore: strong > competent > weak > troubled. CLAUDE.md: the corpus\'s');
console.log('controlled-richness design makes CRAFT the only independent variable — every band shares');
console.log('scene/word budgets — so scarcityPenalty is near-constant across bands and the ordering is');
console.log('carried by densityPenalty, i.e. BY THE RULE CHANNEL. This part measures that directly.');

const BANDS: CorpusBand[] = ['strong', 'competent', 'weak', 'troubled'];
function bandAverages(keep: Set<string> | null): Record<CorpusBand, number> {
  const out = {} as Record<CorpusBand, number>;
  for (const band of BANDS) {
    const members = scored.filter(s => s.src.origin === 'calibration' && s.src.band === band);
    const vals = members.map(s => {
      const v = s.intact;
      if (keep === null) return computeRawCraftScore(v.bySeverity, v.sceneCount);
      const kept: BySeverity = { critical: 0, major: 0, minor: 0 };
      for (const [rule, c] of v.byRule) {
        if (!keep.has(rule)) continue;
        kept.critical += c.critical; kept.major += c.major; kept.minor += c.minor;
      }
      return computeRawCraftScore(kept, v.sceneCount);
    });
    out[band] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : Number.NaN;
  }
  return out;
}
function monotonic(a: Record<CorpusBand, number>): boolean {
  return a.strong > a.competent && a.competent > a.weak && a.weak > a.troubled;
}

const b5Rows: Array<{ label: string; kept: number | 'all'; averages: Record<CorpusBand, number>; monotonic: boolean }> = [];
for (const k of [0, 1, 5, 10, 25, 50, 100, 250, 500]) {
  const keep = new Set(ranked.slice(0, k).map(([r]) => r));
  const avg = bandAverages(keep);
  b5Rows.push({ label: k === 0 ? 'RULE_ZERO (channel fully removed)' : `top-${k} rules kept`, kept: keep.size, averages: avg, monotonic: monotonic(avg) });
}
{
  const avg = bandAverages(new Set(firingScripts.keys()));
  b5Rows.push({ label: 'Tier B removed (only never-firing rules dropped)', kept: firingScripts.size, averages: avg, monotonic: monotonic(avg) });
}
{
  const avg = bandAverages(null);
  b5Rows.push({ label: 'today (full catalog)', kept: 'all', averages: avg, monotonic: monotonic(avg) });
}
console.log('\n  configuration                                   | strong  | compet. | weak    | troubled| B5');
console.log('  ------------------------------------------------|---------|---------|---------|---------|------');
for (const r of b5Rows) {
  console.log(`  ${r.label.slice(0, 46).padEnd(46)} | ${fmt(r.averages.strong)} | ${fmt(r.averages.competent)} | `
    + `${fmt(r.averages.weak)} | ${fmt(r.averages.troubled)} | ${r.monotonic ? 'HOLDS' : 'BREAKS'}`);
}
report.part5B5 = b5Rows;

// ════════════════════════════════════════════════════════════════════════
// PART 6 — B3 / B4 reachability (honest SKIP)
// ════════════════════════════════════════════════════════════════════════
h1('PART 6 — B3 / B4 REACHABILITY: the owner-gated items, probed not assumed');

const REAL_DIR = process.env.REAL_SCRIPT_CORPUS_DIR ?? '';
const CORPUS_DIR = process.env.CORPUS_DIR ?? '';
const realPresent = REAL_DIR !== '' && fs.existsSync(REAL_DIR);
const corpusPresent = CORPUS_DIR !== '' && fs.existsSync(CORPUS_DIR);
const crawlPresent = fs.existsSync(path.resolve('data/screenplays/crawl'));
const manifestPath = path.resolve('tests/fixtures/real-corpus-manifest.json');
const manifestPresent = fs.existsSync(manifestPath);
let manifestEntries = 0;
if (manifestPresent) {
  try {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
    const arr = (m.scripts ?? m.entries ?? m) as unknown;
    manifestEntries = Array.isArray(arr) ? arr.length : Object.keys(arr as object).length;
  } catch { manifestEntries = -1; }
}
console.log(`REAL_SCRIPT_CORPUS_DIR set + present: ${realPresent}   (value: ${REAL_DIR || '(unset)'})`);
console.log(`CORPUS_DIR set + present:            ${corpusPresent}   (value: ${CORPUS_DIR || '(unset)'})`);
console.log(`data/screenplays/crawl/ present:     ${crawlPresent}`);
console.log(`real-corpus manifest present:        ${manifestPresent} (${manifestEntries} entries)`);
if (!realPresent && !corpusPresent) {
  console.log('\nB3 (AUC-24 >= 0.622 ratchet) and B4 (produced-feature floor: health >= 80, verdict');
  console.log('RECOMMEND) are both asserted in tests/core/real-script-corpus.test.ts, which SKIPS');
  console.log('without REAL_SCRIPT_CORPUS_DIR. Both are CANNOT-MEASURE here. This is the documented');
  console.log('local-only-corpus constraint (CLAUDE.md), not a harness defect.');
  console.log('\nOwner discharge commands, in the order the design runs them:');
  console.log('  # B1 (the real one) — channel-zero ablation on the 761-script corpus');
  console.log('  CORPUS_DIR=<761-script corpus> node scripts/rebuild-experiment.mjs --partition=trainval');
  console.log('  # B3 + B4 — the ratchet and the produced floor');
  console.log('  REAL_SCRIPT_CORPUS_DIR=<corpus> npm test');
  console.log('  # B5 — already settled in PART 5 above; re-run after any removal');
  console.log('  node --experimental-strip-types tests/core/calibration.test.ts');
  console.log('  # B2 — LAST, exactly once, after the migration shape is frozen');
  console.log('  CORPUS_DIR=<corpus> node scripts/measure-auc-split.mjs --partition test');
}
report.part6Reachability = { realPresent, corpusPresent, crawlPresent, manifestPresent, manifestEntries };

// ════════════════════════════════════════════════════════════════════════
// PART 7 — B2 / B6 / B7 process checks
// ════════════════════════════════════════════════════════════════════════
h1('PART 7 — B2 / B6 / B7: the process items, verified mechanically');

const receiptGuard = path.resolve('scripts/check-scoring-receipt.mjs');
const receiptGuardExists = fs.existsSync(receiptGuard);
let receiptGuardInCi = false;
const ghDir = path.resolve('.github/workflows');
if (fs.existsSync(ghDir)) {
  for (const f of fs.readdirSync(ghDir)) {
    if (fs.readFileSync(path.join(ghDir, f), 'utf-8').includes('check-scoring-receipt')) { receiptGuardInCi = true; break; }
  }
}
const receiptsDoc = path.resolve('docs/p1-benchmark/MEASUREMENT_RECEIPTS.md');
const receiptsDocExists = fs.existsSync(receiptsDoc);
const splitHashLock = fs.existsSync(path.join(OUT_DIR, 'corpus-test-hash.txt'));

console.log(`B6  scripts/check-scoring-receipt.mjs exists:        ${receiptGuardExists}`);
console.log(`B6  ...referenced by a .github/workflows/ job:       ${receiptGuardInCi}`);
console.log(`B6  MEASUREMENT_RECEIPTS.md exists:                  ${receiptsDocExists}`);
console.log(`B2  held-out hash lock (corpus-test-hash.txt):       ${splitHashLock}`);

// B7 asks for a NAMED owner and a rollback point. The rollback plan is §6 of
// the design; the owner is a person, and a person cannot be inferred from the
// filesystem. Report what is actually written down rather than guess.
const designDoc = fs.readFileSync(path.resolve('docs/p1-benchmark/RULE_CATALOG_RETIREMENT_DESIGN.md'), 'utf-8');
const hasRollbackSection = /##\s*6\.\s*Rollback plan/.test(designDoc);
const namesAnOwner = /\bowner:\s*\S/i.test(designDoc) || /named owner is\b/i.test(designDoc);
console.log(`B7  rollback plan written (design §6):               ${hasRollbackSection}`);
console.log(`B7  a specific person named as owner in the design:  ${namesAnOwner}`);
if (!namesAnOwner) {
  console.log('    B7 is UNSATISFIED: §6 describes branch discipline and per-step revert, but no');
  console.log('    individual is named as accountable for the migration. That is a one-line fix and');
  console.log('    a human decision — it is not something this harness can or should supply.');
}
report.part7Process = {
  receiptGuardExists, receiptGuardInCi, receiptsDocExists, splitHashLock,
  hasRollbackSection, namesAnOwner,
};

// ════════════════════════════════════════════════════════════════════════
fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, 'rule-channel-evidence.json');
fs.writeFileSync(outFile, JSON.stringify(report, (_k, v) => (typeof v === 'number' && Number.isNaN(v) ? null : v), 2));
console.log(`\nWrote ${outFile}`);
console.log('\nNOTHING WAS RETIRED BY THIS RUN. See docs/p1-benchmark/RULE_CHANNEL_EVIDENCE_2026-08-24.md.');
