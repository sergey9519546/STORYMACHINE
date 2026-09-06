// scripts/verify-report.mjs — `npm run verify-report -- <report> <script>`,
// the offline, no-network re-attestation CLI (ROADMAP P3).
//
// WHY A REAL SUBPROCESS: this is a CLI whose entire contract is stdout text
// and an exit code — the same two things a writer reads and a CI step
// checks. Spawning the real command with `node --experimental-strip-types
// scripts/verify-report.mjs <args>` (exactly what `npm run verify-report --`
// invokes) is what proves the exit code a script consumer actually sees,
// not an in-process call to some internal function. `spawnSync` (not
// `execFileSync`) is used throughout because a non-zero exit is an expected,
// asserted OUTCOME here, not a thrown error to catch.
//
// Fixture/forgery shapes mirror tests/routes/export-verify.test.ts
// (MULTI_SCENE_FOUNTAIN, the tampered-health and different-script forgeries)
// so the CLI is proven against the SAME attack shapes the HTTP route already
// defends against — this is the same guarantee, reached without a server.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLI = path.join(REPO_ROOT, 'scripts/verify-report.mjs');

// Same fixture as tests/routes/export-verify.test.ts: enough scenes/
// dialogue/characters for a non-degenerate report (verdict/dimensions/
// healthPercentile all populated).
const MULTI_SCENE_FOUNTAIN = `INT. WAREHOUSE - NIGHT

Rain hammers the tin roof. JAX crouches behind a stack of crates, a gun in his hand.

JAX
(whispering)
She said midnight. It's already past that.

MARA
We wait. If they're not here by dawn, we run.

JAX
I don't like waiting in the dark.

EXT. WAREHOUSE - CONTINUOUS

A truck's headlights sweep across the gravel lot. MARA watches through a cracked window.

MARA
Someone's here. Get down.

INT. WAREHOUSE - MOMENTS LATER

The door bursts open. A STRANGER steps inside, face hidden in shadow.

STRANGER
I know what you did.

JAX
That's not true.

STRANGER
You've been lying to her since the beginning.

MARA
Jax? What is he talking about?

EXT. HIGHWAY - DAWN

JAX and MARA run toward the car as the "SILVER KEY" catches the first light.

MARA
Just drive. We'll figure out the rest later.

JAX
I'm sorry. I should have told you everything.
`;

const DIFFERENT_FOUNTAIN = `${MULTI_SCENE_FOUNTAIN}\n\nINT. SOMEWHERE ELSE - DAY\n\nA scene that was never analyzed.\n`;

function runCli(args: string[]) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('scripts/verify-report.mjs — offline CLI', async () => {
  let dir: string;
  let scriptPath: string;
  let differentScriptPath: string;
  let reportHtmlPath: string;
  let letterMdPath: string;
  let reportJsonPath: string;

  before(async () => {
    clearDoctorCache();
    dir = mkdtempSync(path.join(tmpdir(), 'verify-report-cli-'));
    scriptPath = path.join(dir, 'script.fountain');
    differentScriptPath = path.join(dir, 'different.fountain');
    writeFileSync(scriptPath, MULTI_SCENE_FOUNTAIN);
    writeFileSync(differentScriptPath, DIFFERENT_FOUNTAIN);

    const report = await runScriptDoctor(MULTI_SCENE_FOUNTAIN);
    const html = renderCoverageHtml(report, 'The Warehouse');
    reportHtmlPath = path.join(dir, 'report.html');
    writeFileSync(reportHtmlPath, html);

    const { markdown } = renderCoverageLetter(report, { title: 'The Warehouse' });
    letterMdPath = path.join(dir, 'letter.md');
    writeFileSync(letterMdPath, markdown);

    reportJsonPath = path.join(dir, 'report.json');
    writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
  });
  after(() => { rmSync(dir, { recursive: true, force: true }); });

  it('never sends the script anywhere — the CLI states so in its own output header', () => {
    const { stdout } = runCli([reportHtmlPath, scriptPath]);
    assert.match(stdout, /never leaves this machine/i);
    assert.match(stdout, /no network call/i);
  });

  // ── Case 1: a genuine report + its own script -> exit 0 ────────────────────
  it('genuine report + its own script (html) -> exit 0, authentic yes, verified', () => {
    const { status, stdout } = runCli([reportHtmlPath, scriptPath]);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /authentic: yes/);
    assert.match(stdout, /health: yes/);
    assert.match(stdout, /verdict: yes/);
    assert.match(stdout, /totalIssues: yes/);
    assert.match(stdout, /^VERIFIED/m);
  });

  it('genuine report + its own script (letter .md) -> exit 0', () => {
    const { status, stdout } = runCli([letterMdPath, scriptPath]);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /Parsed as: letter/);
    assert.match(stdout, /authentic: yes/);
    assert.match(stdout, /health: yes/);
    assert.match(stdout, /verdict: yes/);
    assert.match(stdout, /^VERIFIED/m);
  });

  it('genuine report + its own script (raw report .json) -> exit 0, checks every field including healthPercentile', () => {
    const { status, stdout } = runCli([reportJsonPath, scriptPath]);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /Parsed as: json/);
    assert.match(stdout, /healthPercentile: yes/);
    assert.match(stdout, /^VERIFIED/m);
  });

  // ── Case 2: inflated health on untouched text -> exit 1, field named ───────
  it('inflated health on untouched text -> exit 1, health named as the mismatch', () => {
    const original = readFileSync(reportHtmlPath, 'utf8');
    const healthMatch = original.match(/<dt>Health<\/dt><dd><code>([\d.]+)<\/code><\/dd>/);
    assert.ok(healthMatch, 'sanity: the fixture report must publish a Health verify-claim');
    const realHealth = Number(healthMatch![1]);
    const inflated = (realHealth > 50 ? realHealth - 40 : realHealth + 40).toFixed(1);
    const tampered = original.replace(
      `<dt>Health</dt><dd><code>${healthMatch![1]}</code></dd>`,
      `<dt>Health</dt><dd><code>${inflated}</code></dd>`,
    );
    assert.notEqual(tampered, original, 'sanity: the replace must actually have matched something');
    const tamperedPath = path.join(dir, 'report-tampered-health.html');
    writeFileSync(tamperedPath, tampered);

    const { status, stdout } = runCli([tamperedPath, scriptPath]);
    assert.equal(status, 1, stdout);
    assert.match(stdout, /authentic: yes/, 'the text itself is untouched — only the score was tampered');
    assert.match(stdout, /health: no/);
    assert.match(stdout, /NOT VERIFIED.*health/s);
    // The other fields must still report clean — a real bug here would be
    // reporting a mismatch on a field nobody tampered with.
    assert.match(stdout, /verdict: yes/);
    assert.match(stdout, /totalIssues: yes/);
  });

  // ── Case 3: a genuine report paired with a DIFFERENT script -> exit 1, "authentic: no" ──
  it('a genuine report paired with a different script -> exit 1, "authentic: no"', () => {
    const { status, stdout } = runCli([reportHtmlPath, differentScriptPath]);
    assert.equal(status, 1, stdout);
    assert.match(stdout, /authentic: no/);
    assert.match(stdout, /NOT VERIFIED/);
    // Cheap-first: no score field comparison should even be attempted once
    // the hash itself disagrees.
    assert.doesNotMatch(stdout, /reproducible under this engine:\n\s*health:/);
  });

  // ── Case 4: a different engineCommit -> exit 0, engine line shows the mismatch ──
  it('a report from a different engineCommit -> exit 0, engine line shows the mismatch, "reproduction is not attestation" is printed', () => {
    const original = readFileSync(reportHtmlPath, 'utf8');
    const engineMatch = original.match(/<dt>Engine commit<\/dt><dd><code>([0-9a-f]+|dev)<\/code><\/dd>/);
    assert.ok(engineMatch, 'sanity: the fixture report must publish an Engine commit verify-claim');
    const fakeCommit = engineMatch![1] === 'a'.repeat(40) ? 'b'.repeat(40) : 'a'.repeat(40);
    const tampered = original.replace(
      `<dt>Engine commit</dt><dd><code>${engineMatch![1]}</code></dd>`,
      `<dt>Engine commit</dt><dd><code>${fakeCommit}</code></dd>`,
    );
    const tamperedPath = path.join(dir, 'report-different-engine.html');
    writeFileSync(tamperedPath, tampered);

    const { status, stdout } = runCli([tamperedPath, scriptPath]);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /authentic: yes/);
    assert.match(stdout, new RegExp(`engine: report ${fakeCommit} vs local \\S+ {2}\\(MISMATCH\\)`));
    assert.match(stdout, /reproduction is not attestation/i);
    assert.match(stdout, /^VERIFIED/m, 'an engine-only mismatch must not fail the run — reproduction is soft, not a tamper signal');
  });

  // ── Argument / file-not-found handling ──────────────────────────────────────
  it('no arguments prints usage and exits 0', () => {
    const { status, stdout } = runCli([]);
    assert.equal(status, 0);
    assert.match(stdout, /Usage: npm run verify-report/);
  });

  it('missing report file exits non-zero with a clear message', () => {
    const { status, stderr } = runCli([path.join(dir, 'nope.html'), scriptPath]);
    assert.notEqual(status, 0);
    assert.match(stderr, /Report file not found/);
  });

  it('missing script file exits non-zero with a clear message', () => {
    const { status, stderr } = runCli([reportHtmlPath, path.join(dir, 'nope.fountain')]);
    assert.notEqual(status, 0);
    assert.match(stderr, /Script file not found/);
  });
});
