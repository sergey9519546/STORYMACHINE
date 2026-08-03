// PROBE — Structural-form bias (D7 magnitude check), 2026-08-03.
//
// Runs matched Kishotenketsu / three-act fixture pairs through
// runScriptDoctor and reports health, verdict, sceneCount, the full
// RevisionIssue list per script, and the arcIncoherenceDeduction (recomputed
// here with doctor.ts's own published formula/constants, since the
// deduction itself is not a field on ScriptDoctorReport — only the
// diagnostic emotionalArc.arcHealth it's derived from is).
//
// Fixtures: tests/fixtures/structural-form-experiment/pair{1,2}-*.fountain.
// See docs/p1-benchmark/STRUCTURAL_FORM_EXPERIMENT_2026-08-03.md for the
// method, matched-quality argument, and full results write-up. This script
// only prints raw data; it does not interpret it.
//
// Run: node --experimental-strip-types docs/p1-benchmark/probe-structural-form-bias.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor, verdictFor } from '../../server/nvm/analyze/doctor.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'tests/fixtures/structural-form-experiment');

// doctor.ts ~1908-1911 (ARC_DED_MIN_SCENES/REF/K/CAP) — kept identical here
// so this probe's numbers match the live scoring path exactly.
const ARC_DED_MIN_SCENES = 15;
const ARC_DED_REF = 1.2;
const ARC_DED_K = 8;
const ARC_DED_CAP = 15;

function arcIncoherenceDeduction(sceneCount, emotionalArc) {
  if (sceneCount < ARC_DED_MIN_SCENES) return { applicable: false, value: 0 };
  if (!emotionalArc?.scored) return { applicable: true, value: 0, note: 'not scored' };
  const value = Math.min(ARC_DED_CAP, ARC_DED_K * Math.max(0, ARC_DED_REF - emotionalArc.arcHealth));
  return { applicable: true, value };
}

const FIXTURES = [
  { pair: 1, form: 'kishotenketsu', file: 'pair1-kishotenketsu.fountain' },
  { pair: 1, form: 'three_act_control', file: 'pair1-three-act-control.fountain' },
  { pair: 2, form: 'kishotenketsu', file: 'pair2-kishotenketsu.fountain' },
  { pair: 2, form: 'three_act_control', file: 'pair2-three-act-control.fountain' },
];

const results = [];

for (const fx of FIXTURES) {
  const fountain = fs.readFileSync(path.join(FIXTURE_DIR, fx.file), 'utf-8');
  const report = await runScriptDoctor(fountain);
  const ded = arcIncoherenceDeduction(report.sceneCount, report.emotionalArc);
  const rawVerdict = verdictFor(report.health, report.sceneCount);

  const issuesByRule = {};
  for (const passSummary of report.passes) {
    for (const issue of passSummary.issues) {
      issuesByRule[issue.rule] = issuesByRule[issue.rule] ?? [];
      issuesByRule[issue.rule].push({
        pass: passSummary.pass,
        severity: issue.severity,
        location: issue.location,
        description: issue.description,
      });
    }
  }

  results.push({
    pair: fx.pair,
    form: fx.form,
    file: fx.file,
    wordCount: report.wordCount,
    sceneCount: report.sceneCount,
    health: report.health,
    grade: report.grade,
    verdict: report.verdict,
    rawVerdictBeforeSccCap: rawVerdict,
    totalIssues: report.totalIssues,
    bySeverity: report.bySeverity,
    arcHealth: report.emotionalArc?.arcHealth ?? null,
    arcScored: report.emotionalArc?.scored ?? false,
    arcIncoherenceDeduction: ded,
    issuesByRule,
  });
}

console.log(JSON.stringify(results, null, 2));

// ── Compact console summary ────────────────────────────────────────────────
console.error('\n=== SUMMARY ===');
for (const r of results) {
  console.error(
    `pair ${r.pair} / ${r.form.padEnd(18)} scenes=${r.sceneCount} words=${r.wordCount} ` +
    `health=${r.health} verdict=${r.verdict} arcDed(applicable=${r.arcIncoherenceDeduction.applicable})=${r.arcIncoherenceDeduction.value.toFixed(2)}`,
  );
}
console.error('\n=== RULES FIRED PER FIXTURE ===');
for (const r of results) {
  console.error(`${r.pair}/${r.form}: ${Object.keys(r.issuesByRule).sort().join(', ') || '(none)'}`);
}
