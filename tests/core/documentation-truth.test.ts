import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relativePath: string) => readFileSync(resolve(ROOT, relativePath), 'utf8');

const LEGACY_REPORTS = [
  'docs/CRITICAL_PATH_COMPLETE.md',
  'docs/PROJECT_GAP_ANALYSIS.md',
  'docs/V5.0_VICTORY.md',
  'docs/V5.0_INTEGRATION_WORK_PLAN.md',
  'docs/trinity-gate-integration-report.md',
  'server/nvm/kernel/TRINITY_GATE.md',
  'server/nvm/quantum/README.md',
  'server/planning/IMPLEMENTATION_SUMMARY.md',
];

function assertCurrentPhaseTruth(document: string, label: string) {
  const normalized = document.replace(/^>\s?/gm, '').replace(/\s+/g, ' ');
  assert.match(normalized, /P0 fielding is GO/i, `${label} must state that P0 fielding is GO`);
  assert.match(normalized, /0 valid documented human sessions/i, `${label} must state the documented session count`);
  assert.match(normalized, /no (?:P0 )?outcome verdict/i, `${label} must not imply a P0 verdict`);
  assert.match(normalized, /P1 is active\/partial/i, `${label} must state the active P1 status`);
  assert.match(normalized, /P1.{0,80}may run in parallel/i, `${label} must allow evidence-gated parallel work`);
  assert.match(normalized, /never substitutes for P0 human evidence/i, `${label} must preserve the human-evidence gate`);
  assert.match(normalized, /P1 exit gate is not met|(?:P1|its) exit gate is not met/i, `${label} must state that P1 has not exited`);
  assert.match(normalized, /P2 and P3 are complete/i, `${label} must state the completed phases`);
  assert.match(
    normalized,
    /P4.{0,80}blocked until P0 PASS.{0,80}P1.{0,30}evidence/i,
    `${label} must preserve the P4 dependency gate`,
  );
}

test('active execution guidance states the canonical phase truth without stale gates', () => {
  const ultraplans = read('ULTRAPLAN.md');
  const inventory = read('docs/user-validation/P1_BASELINE_INVENTORY.md');

  assertCurrentPhaseTruth(ultraplans, 'ULTRAPLAN.md');
  assertCurrentPhaseTruth(inventory, 'P1_BASELINE_INVENTORY.md');

  assert.doesNotMatch(ultraplans, /P0 blocks new product and engine work/i);
  assert.doesNotMatch(ultraplans, /P1 begins only after P0 clears/i);
  assert.doesNotMatch(ultraplans, /## 3\. THEN — P2 through P4/i);
  assert.doesNotMatch(ultraplans, /Until P0 clears, \*\*the next task is user validation/i);
});

test('the old P1 inventory is clearly historical and cannot restate stale current truth', () => {
  const inventory = read('docs/user-validation/P1_BASELINE_INVENTORY.md');
  const firstScreen = inventory.split(/\r?\n/).slice(0, 24).join('\n');

  assert.match(firstScreen, /pre-P1 historical snapshot/i);
  assert.match(firstScreen, /ROADMAP\.md/);
  assert.match(firstScreen, /current (?:truth|status|authority)/i);
  assert.doesNotMatch(inventory, /P1 HAS NOT STARTED/i);
  assert.doesNotMatch(inventory, /P1 remains \*\*not started\*\*/i);
  assert.doesNotMatch(inventory, /8,917/);
  assert.match(inventory, /3,216/);
});

test('the discrimination baseline separates pre-deduction results from final test results', () => {
  const baseline = read('docs/p1-benchmark/DISCRIMINATION_BASELINE_2026-07-29.md');

  assert.match(baseline, /## Pre-deduction historical results/i);
  assert.match(baseline, /pre-deduction[^\n]*pooled AUC[^\n]*~?0\.62/i);
  assert.match(baseline, /pre-deduction[\s\S]{0,80}dialogue AUC[\s\S]{0,20}~?0\.54/i);
  assert.match(baseline, /Final test pooled AUC 0\.754/i);
  assert.match(baseline, /AUC 0\.990 on[\s\n]+test/i);
});

test('discoverable legacy reports identify their authority and historical status near the top', () => {
  for (const relativePath of LEGACY_REPORTS) {
    const firstScreen = read(relativePath).split(/\r?\n/).slice(0, 24).join('\n');
    assert.match(firstScreen, /(?:archiv|histor|experimental)/i, `${relativePath} needs an archival-status banner`);
    assert.match(firstScreen, /ROADMAP\.md/, `${relativePath} must point to ROADMAP.md`);
    assert.match(firstScreen, /current (?:truth|status|authority|direction)/i, `${relativePath} must identify current authority`);
  }
});

test('active runtime docs match the package engine exactly', () => {
  const packageJson = JSON.parse(read('package.json')) as { engines: { node: string } };
  assert.equal(packageJson.engines.node, '>=22.13.0 || >=24');

  for (const relativePath of ['ARCHITECTURE.md', 'CLAUDE.md', 'CONTRIBUTING.md']) {
    const runtimeDoc = read(relativePath);
    assert.match(
      runtimeDoc,
      /Node(?:\.js)? >=22\.13\.0 \\?\|\\?\| >=24/,
      `${relativePath} must use the package engine wording`,
    );
    assert.doesNotMatch(runtimeDoc, /Node(?:\.js)? (?:≥\s*)?22\.6\+?/, `${relativePath} must not retain the old runtime floor`);
  }
});

test('the honesty audit no longer exempts the corrected P1 inventory', () => {
  const audit = read('scripts/honesty-audit.mjs');
  assert.doesNotMatch(audit, /['"]docs\/user-validation\/P1_BASELINE_INVENTORY\.md['"]/);
});
