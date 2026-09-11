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
  // Round 2 note: this tampers HEALTH EVERYWHERE the document renders it
  // (the <dl>, the header health-number, and the plainSummary sentence) —
  // i.e. a self-consistent forgery, the one shape finding 2's NEW
  // self-consistency check (below) correctly does NOT catch, because there
  // is no internal disagreement to find. That is what lets this case reach
  // the ORIGINAL bug this test exists for: does re-running the engine on
  // the genuine, untouched script text catch a score the document is
  // lying about? A forgery confined to ONE rendering (leaving the others
  // truthful) is covered by the dedicated "finding 2" tests further down,
  // and is caught earlier, by a different, more specific message.
  it('inflated health on untouched text (forged consistently everywhere it renders) -> exit 1, health named as the mismatch', () => {
    const original = readFileSync(reportHtmlPath, 'utf8');
    const healthMatch = original.match(/<dt>Health<\/dt><dd><code>([\d.]+)<\/code><\/dd>/);
    assert.ok(healthMatch, 'sanity: the fixture report must publish a Health verify-claim');
    const realHealth = healthMatch![1];
    const inflated = (Number(realHealth) > 50 ? Number(realHealth) - 40 : Number(realHealth) + 40).toFixed(1);
    const inflatedRounded = String(Math.round(Number(inflated)));
    const realRounded = String(Math.round(Number(realHealth)));

    let tampered = original
      .replace(`<dt>Health</dt><dd><code>${realHealth}</code></dd>`, `<dt>Health</dt><dd><code>${inflated}</code></dd>`)
      .replace(`>${realHealth}</div>`, `>${inflated}</div>`) // the health-number headline
      .replace(`overall score ${realRounded}/100`, `overall score ${inflatedRounded}/100`); // plainSummary
    assert.notEqual(tampered, original, 'sanity: at least one replace must have matched');
    assert.ok(!tampered.includes(`>${realHealth}</div>`) && !tampered.includes(`<code>${realHealth}</code>`),
      'sanity: every rendering of the real health value must have been replaced, or the checks below are not testing what they claim to');

    const tamperedPath = path.join(dir, 'report-tampered-health.html');
    writeFileSync(tamperedPath, tampered);

    const { status, stdout } = runCli([tamperedPath, scriptPath]);
    assert.equal(status, 1, stdout);
    assert.match(stdout, /authentic: yes/, 'the text itself is untouched — only the score was tampered');
    assert.doesNotMatch(stdout, /disagrees with its own verify block/, 'a CONSISTENT forgery must not be misreported as a self-inconsistency — it must reach the reproduction check');
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
  it('a report from a different engineCommit -> exit 0, engine line shows the mismatch, "reproduction is not attestation" is printed, AND the advisory + qualified verdict appear (round-2 finding 3)', () => {
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
    // Round-2 review finding 3: compareVerifyClaims's own ENGINE_MISMATCH_MESSAGE
    // (server/lib/verify-compare.ts) must actually reach stdout, and the
    // engine advisory must be the last substantive thing printed BEFORE the
    // verdict line — a skimming reader (or a script grepping only the final
    // line) must not see a bare, unqualified "VERIFIED".
    assert.match(stdout, /The engine has moved since this report was produced\./);
    const advisoryIdx = stdout.indexOf('The engine has moved since this report was produced.');
    const verdictIdx = stdout.search(/^VERIFIED/m);
    assert.ok(advisoryIdx > 0 && verdictIdx > advisoryIdx, 'the engine-mismatch advisory must print BEFORE the verdict line');
    assert.match(stdout, /^VERIFIED \(engine identity differs/m, 'an engine mismatch must qualify the closing verdict line, not read as a bare VERIFIED');
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

  // ═══════════════════════════════════════════════════════════════════════
  // Round 2 — independent review findings 1, 2, 4 (2026-09-06).
  // Each of these attacks reproduces the exact bypass the round-1 review
  // demonstrated against the round-1 commit (16bfec58): on that tree every
  // one of these cases printed VERIFIED / a misleading diagnosis, exit 0/1
  // for the wrong reason. They are written to fail against that tree and
  // pass against this one — the fail-first proof the review asked for.
  // ═══════════════════════════════════════════════════════════════════════

  // ── Finding 1: a claim the parser cannot read as a number ──────────────────
  describe('finding 1 — a health claim that is not a real number must be a hard failure, not silently unchecked', () => {
    it('HTML: "OUTSTANDING" in place of a health number -> exit 1, "claim unreadable: health" (NOT VERIFIED, never VERIFIED)', () => {
      const original = readFileSync(reportHtmlPath, 'utf8');
      const healthMatch = original.match(/<dt>Health<\/dt><dd><code>([\d.]+)<\/code><\/dd>/);
      assert.ok(healthMatch, 'sanity: fixture must publish a Health claim');
      const tampered = original.replace(
        `<dt>Health</dt><dd><code>${healthMatch![1]}</code></dd>`,
        '<dt>Health</dt><dd><code>OUTSTANDING</code></dd>',
      );
      const tamperedPath = path.join(dir, 'attack-nan.html');
      writeFileSync(tamperedPath, tampered);

      const { status, stdout } = runCli([tamperedPath, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /authentic: no — claim unreadable: health/);
      assert.doesNotMatch(stdout, /^VERIFIED/m, 'a NaN health claim must never print a bare VERIFIED');
      assert.match(stdout, /NOT VERIFIED — claim unreadable: health\./);
    });

    it('letter: "6.5.0" in place of the headline health number -> exit 1, "claim unreadable: health"', () => {
      const original = readFileSync(letterMdPath, 'utf8');
      const healthMatch = original.match(/Health\s+([\d.]+)\/100/);
      assert.ok(healthMatch, 'sanity: fixture letter must publish a headline Health figure');
      const tampered = original.replace(`Health ${healthMatch![1]}/100`, 'Health 6.5.0/100');
      const tamperedPath = path.join(dir, 'attack-nan-letter.md');
      writeFileSync(tamperedPath, tampered);

      const { status, stdout } = runCli([tamperedPath, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /authentic: no — claim unreadable: health/);
      assert.doesNotMatch(stdout, /^VERIFIED/m);
    });

    it('HTML: an unrecognized verdict word ("MAYBE") -> exit 1, "claim unreadable: verdict" (the zod enum, not a re-declared one, catches it)', () => {
      const original = readFileSync(reportHtmlPath, 'utf8');
      const tampered = original.replace('<dt>Verdict</dt><dd><code>CONSIDER</code></dd>', '<dt>Verdict</dt><dd><code>MAYBE</code></dd>');
      assert.notEqual(tampered, original, 'sanity: the fixture verdict must actually be CONSIDER for this substitution to apply');
      const tamperedPath = path.join(dir, 'attack-bad-verdict.html');
      writeFileSync(tamperedPath, tampered);

      const { status, stdout } = runCli([tamperedPath, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /authentic: no — claim unreadable: verdict/);
    });
  });

  // ── Finding 2: the visible document vs. its own verify block ───────────────
  describe('finding 2 — a forgery confined to what a reader sees, with the verify block untouched, must be caught', () => {
    it('HTML: only the health-headline number is forged (the <dl> is untouched) -> exit 1, "disagrees with its own verify block"', () => {
      const original = readFileSync(reportHtmlPath, 'utf8');
      const headlineMatch = original.match(/<div class="health-number"[^>]*>([\d.]+)<\/div>/);
      assert.ok(headlineMatch, 'sanity: fixture must render a health-number headline');
      const forged = (Number(headlineMatch![1]) > 50 ? 5 : 95).toFixed(1);
      const tampered = original.replace(headlineMatch![0], headlineMatch![0].replace(headlineMatch![1], forged));
      assert.notEqual(tampered, original);
      const tamperedPath = path.join(dir, 'attack-bodyonly.html');
      writeFileSync(tamperedPath, tampered);

      const { status, stdout } = runCli([tamperedPath, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /authentic: no — the visible report disagrees with its own verify block/);
      assert.match(stdout, /the health headline says health = /);
      assert.doesNotMatch(stdout, /^VERIFIED/m, 'a self-inconsistent document must never print VERIFIED');
      // Must fire BEFORE the hash/reproduction machinery even runs — the
      // script text is genuine and untouched, so nothing past this check
      // should have a reason to execute.
      assert.doesNotMatch(stdout, /reproducible under this engine:/);
    });

    // 2026-09-11: the stamp's TAG is matched loosely on purpose. It was a `<div>`
    // in the report header until the verdict moved into the producer tier and
    // became an inline `<span>`; the CLI's own scrape was pinned to `<div>` and
    // silently stopped catching a forged stamp at all. Both the CLI and this test
    // now accept either tag (with a backreference, so the close tag must match),
    // which also keeps every report exported before that change parseable. The
    // case below this one asserts the old shape still works.
    it('HTML: only the verdict stamp is forged (the <dl> Verdict is untouched) -> exit 1, disagreement names verdict', () => {
      const original = readFileSync(reportHtmlPath, 'utf8');
      const stampMatch = original.match(/<(?:div|span) class="stamp"[^>]*>([\s\S]*?)<\/(?:div|span)>/);
      assert.ok(stampMatch, 'sanity: fixture must render a verdict stamp');
      const realLabel = stampMatch![1].trim();
      assert.equal(realLabel, 'CONSIDER', 'sanity: fixture verdict must be CONSIDER for this test to target the right label');
      const tampered = original.replace(stampMatch![0], stampMatch![0].replace(realLabel, 'RECOMMEND'));
      const tamperedPath = path.join(dir, 'attack-stamp-only.html');
      writeFileSync(tamperedPath, tampered);

      const { status, stdout } = runCli([tamperedPath, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /authentic: no — the visible report disagrees with its own verify block/);
      assert.match(stdout, /verdict stamp says verdict = RECOMMEND/);
    });

    // REGRESSION GUARD (2026-09-11). The CLI's stamp scrape was pinned to
    // `<div class="stamp">`; the stamp became a `<span>` when it moved into the
    // producer tier, and the scrape silently stopped firing — a forged verdict
    // would have passed. This case proves the PRE-CHANGE markup shape is still
    // caught, so the fix is backward-compatible rather than a swap of one pinned
    // tag for another: every coverage report exported before today is a `<div>`,
    // and a reader checking one of those must still be protected.
    it('HTML: a forged stamp in the PRE-2026-09-11 <div> markup is still caught', () => {
      const original = readFileSync(reportHtmlPath, 'utf8');
      const spanStamp = original.match(/<span class="stamp"([^>]*)>([\s\S]*?)<\/span>/);
      assert.ok(spanStamp, 'sanity: today\u2019s renderer emits a <span> stamp');
      // Rewrite today's span stamp into the old div shape, THEN forge the label —
      // i.e. exactly the document a reader holding a report from last week has.
      const asDiv = `<div class="stamp"${spanStamp![1]}>RECOMMEND</div>`;
      const tampered = original.replace(spanStamp![0], asDiv);
      const tamperedPath = path.join(dir, 'attack-stamp-legacy-div.html');
      writeFileSync(tamperedPath, tampered);

      const { status, stdout } = runCli([tamperedPath, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /authentic: no — the visible report disagrees with its own verify block/);
      assert.match(stdout, /verdict stamp says verdict = RECOMMEND/);
    });

    it('letter: only the headline health number is forged (the plainSummary sentence is untouched) -> exit 1, disagreement named — proves the letter is genuinely immune, not merely lucky', () => {
      const original = readFileSync(letterMdPath, 'utf8');
      const headlineMatch = original.match(/Health\s+([\d.]+)\/100/);
      assert.ok(headlineMatch, 'sanity: fixture letter must publish a headline Health figure');
      const forged = (Number(headlineMatch![1]) > 50 ? 5 : 95).toFixed(1);
      const tampered = original.replace(`Health ${headlineMatch![1]}/100`, `Health ${forged}/100`);
      const tamperedPath = path.join(dir, 'attack-bodyonly-letter.md');
      writeFileSync(tamperedPath, tampered);

      const { status, stdout } = runCli([tamperedPath, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /authentic: no — the visible report disagrees with its own verify block/);
      assert.match(stdout, /the summary sentence says health = /);
      assert.doesNotMatch(stdout, /^VERIFIED/m);
    });
  });

  // ── Finding 4: CRLF vs LF must be diagnosed honestly, not as "a different script" ──
  describe('finding 4 — a CRLF copy of the exact same script must be diagnosed by line endings, not misreported as a different script', () => {
    it('a genuine report + a CRLF copy of its own script -> exit 1, "differs only by line endings" (never "does not describe the script")', () => {
      const crlfScript = MULTI_SCENE_FOUNTAIN.replace(/\n/g, '\r\n');
      const crlfScriptPath = path.join(dir, 'script-crlf.fountain');
      writeFileSync(crlfScriptPath, crlfScript);

      const { status, stdout } = runCli([reportHtmlPath, crlfScriptPath]);
      assert.equal(status, 1, `a real byte-for-byte hash mismatch must still fail — this is a diagnosis fix, not a bypass. stdout:\n${stdout}`);
      assert.match(stdout, /the hash differs only by line endings/i);
      assert.match(stdout, /NOT VERIFIED — the hash differs only by line endings, not by content\./);
      assert.doesNotMatch(stdout, /does not describe the script you provided/);
    });

    it('a genuinely different script (not a line-ending variant) still reports the original "does not describe" diagnosis', () => {
      // Regression guard alongside the fix: the CRLF check must not swallow
      // the case it did NOT create — a real different-script mismatch (this
      // suite's existing case 3 fixture) must keep its original wording.
      const { status, stdout } = runCli([reportHtmlPath, differentScriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /This report does not describe the script you provided/);
      assert.doesNotMatch(stdout, /line endings/i);
    });
  });
});
