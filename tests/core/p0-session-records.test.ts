// p0-session-records.test.ts — the P0 session-records directory cannot
// silently accumulate fabricated evidence again.
//
// WHY THIS EXISTS. On 2026-09-19, five files tracked in
// docs/user-validation/sessions/ (P0-S01.md..P0-S05.md) were found to be
// harness-generated output from a superseded async harness
// (docs/user-validation/P0_WORKAROUND_HARNESS.md), not real human
// screenwriter sessions — moderator `research-harness-v1`, observer
// `automated-async-logger`, invented writer quotes, and an "Application
// commit SHA" field that was actually the sample report's contentHash.
// They entered `main` via merge commit `5a125054` (2026-08-12), present in
// neither parent, four days after
// docs/superpowers/plans/2026-08-08-main-consolidation.md:74 recorded the
// explicit decision not to commit them. See PHASE_TRACKER.md's 2026-09-19
// decision-log row for the full incident.
//
// This test is the mechanical guard against that class of file recurring:
// it scans every real session record (everything under
// docs/user-validation/sessions/ except the template) for the harness
// fingerprints, and cross-checks the file count against PHASE_TRACKER.md's
// own "Fully documented sessions" counter so the directory and the tracker
// can never silently disagree again.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SESSIONS_DIR = path.join(ROOT, 'docs', 'user-validation', 'sessions');
const TEMPLATE_NAME = 'P0_SESSION_TEMPLATE.md';

const HARNESS_FINGERPRINTS = ['research-harness', 'automated-async-logger', 'async research portal'];

/** Values that are not a real moderator/observer identity, only a stand-in for one. */
const NON_HUMAN_ID_PATTERN = /harness|automated|bot|agent/i;

/** Every *.md file under docs/user-validation/sessions/, excluding the template. */
function listSessionRecordFiles(): string[] {
  return readdirSync(SESSIONS_DIR)
    .filter((entry) => entry.endsWith('.md') && entry !== TEMPLATE_NAME)
    .sort();
}

function readSession(name: string): string {
  return readFileSync(path.join(SESSIONS_DIR, name), 'utf8');
}

/**
 * Checks a single session record's raw text for harness-generated-content
 * fingerprints. Returns a list of problems found (empty = clean). Exported
 * as a plain function (not folded into the test body) specifically so this
 * test can demonstrate, inline, that it actually rejects a fabricated
 * record — not just that the current directory happens to pass.
 */
function findHarnessFingerprints(text: string): string[] {
  const lower = text.toLowerCase();
  return HARNESS_FINGERPRINTS.filter((needle) => lower.includes(needle.toLowerCase()));
}

/**
 * Extracts a metadata table cell's value by its row label, e.g.
 * "Moderator ID or role" -> the `...` value in
 * "| Moderator ID or role | `research-harness-v1` |".
 * Returns null if the row is not present.
 */
function extractTableCell(text: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*\`?([^|\`]*)\`?\\s*\\|`, 'm');
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

/**
 * Full check for one session record's text: harness fingerprints anywhere
 * in the file, plus non-human moderator/observer identities. Returns a
 * list of human-readable problems (empty = the record passes).
 */
function checkSessionRecordText(text: string): string[] {
  const problems: string[] = [];

  const fingerprints = findHarnessFingerprints(text);
  if (fingerprints.length > 0) {
    problems.push(`contains harness fingerprint(s): ${fingerprints.join(', ')}`);
  }

  const moderator = extractTableCell(text, 'Moderator ID or role');
  if (!moderator) {
    problems.push('missing or empty "Moderator ID or role" cell');
  } else if (NON_HUMAN_ID_PATTERN.test(moderator)) {
    problems.push(`"Moderator ID or role" looks non-human: "${moderator}"`);
  }

  const observer = extractTableCell(text, 'Observer/notetaker ID or role');
  if (!observer) {
    problems.push('missing or empty "Observer/notetaker ID or role" cell');
  } else if (NON_HUMAN_ID_PATTERN.test(observer)) {
    problems.push(`"Observer/notetaker ID or role" looks non-human: "${observer}"`);
  }

  return problems;
}

/** Parses PHASE_TRACKER.md's `| Fully documented sessions | N |` counter row. */
function readFullyDocumentedCounter(): number {
  const tracker = readFileSync(path.join(ROOT, 'docs', 'user-validation', 'PHASE_TRACKER.md'), 'utf8');
  const m = /^\|\s*Fully documented sessions\s*\|\s*(\d+)\s*\|/m.exec(tracker);
  assert.ok(m, 'PHASE_TRACKER.md must contain a "| Fully documented sessions | N |" counter row');
  return Number(m![1]);
}

test('(a)+(b) every real session record is free of harness fingerprints and has a human moderator/observer', () => {
  const files = listSessionRecordFiles();
  const failures: string[] = [];

  for (const file of files) {
    const text = readSession(file);
    const problems = checkSessionRecordText(text);
    if (problems.length > 0) {
      failures.push(`${file}: ${problems.join('; ')}`);
    }
  }

  assert.deepEqual(
    failures,
    [],
    `docs/user-validation/sessions/ contains fabricated or harness-generated records:\n${failures.join('\n')}`,
  );
});

test('(c) session-record file count matches PHASE_TRACKER.md\'s "Fully documented sessions" counter', () => {
  const files = listSessionRecordFiles();
  const counter = readFullyDocumentedCounter();
  assert.equal(
    files.length,
    counter,
    `docs/user-validation/sessions/ has ${files.length} non-template record(s) but ` +
      `PHASE_TRACKER.md's "Fully documented sessions" counter reads ${counter}`,
  );
});

test('(d) fail-first regression pin: the checker rejects a fixture carrying the exact 2026-09-19 fingerprint', () => {
  // This is a minimal reconstruction of the shape that P0-S01.md..P0-S05.md
  // actually had — not a real session, never written to disk, used only to
  // prove this test's own checker function can fail. If this test ever
  // passes trivially (i.e. `checkSessionRecordText` stops flagging this
  // fixture), the guard above has gone blind.
  const fabricatedFixture = `# P0 Anonymous Session Record — P0-FIXTURE

## 1. Session metadata

| Field | Anonymous record |
|---|---|
| Session mode | \`remote / async research portal\` |
| Moderator ID or role | \`research-harness-v1\` |
| Observer/notetaker ID or role | \`automated-async-logger\` |
| Application commit SHA | \`a1b44eff859da29988dbd81354056b2574655302d63180022e679a7c942cf3ca\` |
`;

  const problems = checkSessionRecordText(fabricatedFixture);
  assert.ok(
    problems.length > 0,
    'checkSessionRecordText must reject the known-fabricated fixture, but reported it clean',
  );
  assert.ok(
    problems.some((p) => p.includes('harness fingerprint')),
    `expected a harness-fingerprint problem, got: ${JSON.stringify(problems)}`,
  );
  assert.ok(
    problems.some((p) => p.includes('Moderator ID or role')),
    `expected a non-human moderator problem, got: ${JSON.stringify(problems)}`,
  );
  assert.ok(
    problems.some((p) => p.includes('Observer/notetaker ID or role')),
    `expected a non-human observer problem, got: ${JSON.stringify(problems)}`,
  );

  // Sanity check the fixture actually matches what P0-S01.md..P0-S05.md
  // carried, so this pin cannot drift from the real incident.
  assert.ok(fabricatedFixture.includes('research-harness-v1'));
  assert.ok(fabricatedFixture.includes('automated-async-logger'));
});
