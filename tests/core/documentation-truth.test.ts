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

function extractFirstScreenBanner(document: string, label: string) {
  const firstScreenLines = document.split(/\r?\n/).slice(0, 24);
  const start = firstScreenLines.findIndex((line) => /^>\s?/.test(line));
  assert.notEqual(start, -1, `${label} needs a first-screen banner block`);

  const bannerLines: string[] = [];
  for (let index = start; index < firstScreenLines.length; index += 1) {
    const line = firstScreenLines[index];
    if (!/^>\s?/.test(line)) break;
    bannerLines.push(line.replace(/^>\s?/, ''));
  }

  assert.ok(bannerLines.length > 0, `${label} needs a non-empty first-screen banner block`);
  return bannerLines.join(' ').replace(/\s+/g, ' ').trim();
}

function extractCurrentStatusBlock(document: string, label: string) {
  const banner = extractFirstScreenBanner(document, label);
  assert.match(banner, /current (?:truth|status)/i, `${label} must identify this banner as current status`);
  return banner;
}

function assertCurrentPhaseTruth(statusBlock: string, label: string) {
  const normalized = statusBlock.replace(/\s+/g, ' ');
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

function assertLegacyAuthorityBanner(document: string, label: string) {
  const banner = extractFirstScreenBanner(document, label);
  assert.match(banner, /(?:archiv|histor|experimental)/i, `${label} needs an archival or historical designation`);
  assert.match(
    banner,
    /(?:production-ready|production targets|product readiness|current-(?:status|state)|current direction).{0,240}\bnot\b.{0,120}(?:current|product|direction|authority|readiness|phase|evidence)/i,
    `${label} must disclaim its production-ready or current-status claims in the banner`,
  );
  assert.match(banner, /ROADMAP\.md/, `${label} must name ROADMAP.md in the same banner`);
  assert.match(banner, /current (?:truth|status|authority|direction)/i, `${label} must identify ROADMAP.md as current authority`);
}

test('phase truth cannot be supplied by facts appended outside a weak status block', () => {
  const weakenedDocument = `# Execution guide

> **Current status.** This block contains no phase facts.

P0 fielding is GO with 0 valid documented human sessions and no P0 outcome verdict.
P1 is active/partial, may run in parallel, never substitutes for P0 human evidence,
and its exit gate is not met. P2 and P3 are complete. P4 remains blocked until
P0 PASS and the required P1 evidence.
`;

  assert.throws(
    () => assertCurrentPhaseTruth(extractCurrentStatusBlock(weakenedDocument, 'synthetic weakened document'), 'synthetic weakened document'),
    /must state that P0 fielding is GO/,
  );
});

test('legacy banner truth cannot be assembled from scattered first-screen keywords', () => {
  const weakenedDocument = `# Legacy report

> **ARCHIVED STATUS.** Historical implementation record.

The current-status claims are not current product authority.
See ROADMAP.md for current truth.
`;

  assert.throws(
    () => assertLegacyAuthorityBanner(weakenedDocument, 'synthetic weakened legacy report'),
    /must disclaim its production-ready or current-status claims in the banner/,
  );
});

test('active execution guidance states the canonical phase truth without stale gates', () => {
  const ultraplans = read('ULTRAPLAN.md');
  const inventory = read('docs/user-validation/P1_BASELINE_INVENTORY.md');

  assertCurrentPhaseTruth(extractCurrentStatusBlock(ultraplans, 'ULTRAPLAN.md'), 'ULTRAPLAN.md');
  assertCurrentPhaseTruth(
    extractCurrentStatusBlock(inventory, 'P1_BASELINE_INVENTORY.md'),
    'P1_BASELINE_INVENTORY.md',
  );

  assert.doesNotMatch(ultraplans, /P0 blocks new product and engine work/i);
  assert.doesNotMatch(ultraplans, /P1 begins only after P0 clears/i);
  assert.doesNotMatch(ultraplans, /## 3\. THEN — P2 through P4/i);
  assert.doesNotMatch(ultraplans, /Until P0 clears, \*\*the next task is user validation/i);
});

test('the old P1 inventory is clearly historical and cannot restate stale current truth', () => {
  const inventory = read('docs/user-validation/P1_BASELINE_INVENTORY.md');
  const statusBlock = extractCurrentStatusBlock(inventory, 'P1_BASELINE_INVENTORY.md');

  assert.match(statusBlock, /pre-P1 historical snapshot/i);
  assert.match(statusBlock, /ROADMAP\.md/);
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
    assertLegacyAuthorityBanner(read(relativePath), relativePath);
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
