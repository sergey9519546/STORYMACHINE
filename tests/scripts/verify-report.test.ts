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
import { startTestServer, freshSessionId, type TestServer } from '../routes/helpers.ts';
import {
  buildReaderTier, NO_LOGLINE_NOTE, NO_LOGLINE_NOTE_HTML, type ReaderTierData,
} from '../../server/lib/reader-tier.ts';
import {
  encodePageRefs, formatLengthLine, type ArtifactClaims,
} from '../../server/lib/artifact-claims.ts';
import { prioritiesHeadingFor } from '../../src/lib/priorities-copy.ts';
import { healthPercentileSentence, notComparableSentence } from '../../src/lib/percentile-copy.ts';

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
      // The producer tier's own reading — a FOURTH rendering, added 2026-09-11 and
      // unchecked until 2026-09-12 (writer-loop.md finding 2). It has to move with
      // the others or this case no longer tests what it says it does: it would be
      // caught by the document disagreeing with itself, one step before the
      // recomputation this case exists to exercise.
      .replace(`Health ${realHealth} / 100`, `Health ${inflated} / 100`)
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

    // 2026-09-12: the letter now publishes a machine-readable claim block of its
    // own (`Health: 76.3`, `Scenes: 13`, …), so its HEADLINE is no longer the
    // claim — it is a second rendering, cross-checked against the block. An
    // unreadable headline is therefore caught one step EARLIER and more precisely
    // (the document cannot be compared with itself) rather than as an unreadable
    // claim. The guarantee the 2026-09-06 finding installed is unchanged and is
    // asserted directly, at the block, by the case below this one.
    it('letter: "6.5.0" in place of the headline health number -> exit 1, the unreadable rendering is named', () => {
      const original = readFileSync(letterMdPath, 'utf8');
      const healthMatch = original.match(/Health\s+([\d.]+)\/100/);
      assert.ok(healthMatch, 'sanity: fixture letter must publish a headline Health figure');
      const tampered = original.replace(`Health ${healthMatch![1]}/100`, 'Health 6.5.0/100');
      const tamperedPath = path.join(dir, 'attack-nan-letter.md');
      writeFileSync(tamperedPath, tampered);

      const { status, stdout } = runCli([tamperedPath, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /the headline health figure does not state a readable health/);
      assert.doesNotMatch(stdout, /^VERIFIED/m);
      assert.doesNotMatch(stdout, /NaN/, 'an unreadable figure must be named as unreadable, not printed as NaN');
    });

    it('letter: "6.5.0" in the CLAIM ROW itself -> exit 1, "claim unreadable: health" (the 2026-09-06 guarantee, at the block)', () => {
      const original = readFileSync(letterMdPath, 'utf8');
      const rowMatch = original.match(/^Health: ([\d.]+)$/m);
      assert.ok(rowMatch, 'sanity: the letter must publish a Health claim row (2026-09-12)');
      const tampered = original.replace(`Health: ${rowMatch![1]}`, 'Health: 6.5.0');
      const tamperedPath = path.join(dir, 'attack-nan-letter-row.md');
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
      // 2026-09-12: the disagreement is now named against the HEADLINE, because the
      // letter publishes its own claim row for health and the headline is a second
      // rendering of it. Before that the headline WAS the claim, so the only other
      // rendering that could contradict it was the plainSummary sentence. Either
      // way the forgery fails with the contradicting rendering named — which is
      // what this case exists to prove.
      assert.match(stdout, /the headline health figure says health = /);
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

// ═══════════════════════════════════════════════════════════════════════════
// BUG-1 (2026-09-12) — the producer tier's claims, in every artifact shape.
//
// docs/audits/2026-09-12-adversarial/server-data-tests.md BUG-1: the tier put a
// scene count, a word count, an estimated page/minute figure, a per-finding page
// reference, a priorities count, a percentile reading and the reference bounds on
// the one page a producer is told to trust, and the verifier checked none of them
// — `9,999 scenes · 999,999 words · p. 999` printed VERIFIED at exit 0. And
// docs/audits/2026-09-12-adversarial/writer-loop.md finding 2: the tier is also a
// SECOND rendering of the verdict and health, which the CLI's scrape did not read
// either, so `**Verdict.** RECOMMEND · Health 94.6 / 100` verified too.
//
// EVERY CASE BELOW WAS RUN AGAINST 3bb623cc FIRST and printed
// `VERIFIED — authentic and reproducible under this engine.` at exit 0. Two
// directions per claim, because they fail differently:
//
//   BODY ONLY  — the reader-facing rendering is edited, the verify block is left
//                genuine. Caught by the document disagreeing with itself, before
//                the engine is re-run at all.
//   CONSISTENT — the rendering AND the block are edited together, so the document
//                agrees with itself. Only recomputation from the script text
//                catches it, and it must name the field.
//
// The genuine artifacts come from a LIVE KEYLESS SERVER (the real export routes,
// not renderCoverageHtml/renderCoverageLetter called directly), because a
// recipient only ever holds what a route produced.
describe('the producer tier\u2019s claims are verifiable in every artifact shape (BUG-1)', () => {
  let server: TestServer;
  let dir: string;
  let scriptPath: string;
  /** kind -> the genuine artifact a live route produced. */
  const genuine: Record<string, string> = {};
  let tier: ReaderTierData;

  const SHAPES = ['html', 'md', 'txt'] as const;
  type Shape = typeof SHAPES[number];
  const EXT: Record<Shape, string> = { html: 'html', md: 'md', txt: 'txt' };

  before(async () => {
    clearDoctorCache();
    server = await startTestServer();
    dir = mkdtempSync(path.join(tmpdir(), 'verify-tier-claims-'));
    scriptPath = path.join(dir, 'script.fountain');
    writeFileSync(scriptPath, MULTI_SCENE_FOUNTAIN);

    const htmlRes = await fetch(`${server.baseUrl}/api/export/coverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Warehouse' }),
    });
    assert.equal(htmlRes.status, 200);
    genuine.html = await htmlRes.text();

    const letterRes = await fetch(`${server.baseUrl}/api/export/coverage-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Warehouse' }),
    });
    assert.equal(letterRes.status, 200);
    const letter = await letterRes.json() as { markdown: string; text: string };
    genuine.md = letter.markdown;
    genuine.txt = letter.text;

    const doctorRes = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), fountain: MULTI_SCENE_FOUNTAIN }),
    });
    assert.equal(doctorRes.status, 200);
    genuine.json = JSON.stringify(await doctorRes.json(), null, 2);

    // The strings the tier actually rendered, taken from the tier itself rather
    // than re-typed here — a forgery test that hand-types the genuine value can
    // pass while testing nothing.
    const report = await runScriptDoctor(MULTI_SCENE_FOUNTAIN);
    tier = buildReaderTier(report, { fountain: MULTI_SCENE_FOUNTAIN });
  });
  after(async () => {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  function write(name: string, contents: string): string {
    const p = path.join(dir, name);
    writeFileSync(p, contents);
    return p;
  }

  /** A replacement that FAILS LOUDLY when its target is absent — a forgery test
   *  whose edit silently did not apply proves nothing. */
  function forgeFirst(text: string, find: string, replacement: string): string {
    assert.ok(text.includes(find), `sanity: the genuine artifact must contain ${JSON.stringify(find)}`);
    return text.replace(find, replacement);
  }
  function forgeEvery(text: string, find: string, replacement: string): string {
    assert.ok(text.includes(find), `sanity: the genuine artifact must contain ${JSON.stringify(find)}`);
    return text.split(find).join(replacement);
  }

  // ── The verify block, by label ─────────────────────────────────────────────
  // The letter's rows are scoped to its FOOTER: its plain-text tier prints
  // `Logline: …` and `Verdict: …` lines of its own, so an unscoped `^Label:` edit
  // would forge the page instead of the block — the opposite of what these cases
  // are isolating.
  const FOOTER_ANCHOR = 'Script-text hash (SHA-256):';

  function readRow(artifact: string, shape: Shape, label: string): string {
    if (shape === 'html') {
      const m = artifact.match(new RegExp(`<dt>${label.replace(/[().]/g, '\\$&')}</dt><dd><code>([^<]*)</code></dd>`));
      assert.ok(m, `sanity: the genuine ${shape} artifact must publish a ${label} row`);
      return m[1];
    }
    const footerStart = artifact.indexOf(FOOTER_ANCHOR);
    assert.ok(footerStart > 0, 'sanity: the letter must carry its verify footer');
    const m = artifact.slice(footerStart).match(new RegExp(`^${label.replace(/[().]/g, '\\$&')}: (.*)$`, 'm'));
    assert.ok(m, `sanity: the genuine ${shape} artifact must publish a ${label} row`);
    return m[1];
  }

  function forgeRow(artifact: string, shape: Shape, label: string, value: string): string {
    const old = readRow(artifact, shape, label);
    if (shape === 'html') {
      return forgeFirst(artifact, `<dt>${label}</dt><dd><code>${old}</code></dd>`,
        `<dt>${label}</dt><dd><code>${value}</code></dd>`);
    }
    const footerStart = artifact.indexOf(FOOTER_ANCHOR);
    return artifact.slice(0, footerStart)
      + forgeFirst(artifact.slice(footerStart), `${label}: ${old}`, `${label}: ${value}`);
  }

  // ── The forgery matrix ────────────────────────────────────────────────────
  // One entry per CLAIM. `page` edits only what a reader sees; `row` is the label
  // whose claim has to move with it for the consistent forgery. `named` is what the
  // failure must name, in both directions.
  interface Forgery {
    claim: string;
    row: string;
    /** A THUNK, not a value: this table is built when the describe body runs, which
     *  is before before() has produced the artifacts — an eager value here reads
     *  `tier` unassigned. */
    rowValue: () => string;
    named: RegExp;
    page: (artifact: string, shape: Shape) => string;
    /** The OTHER renderings of this claim, for the consistent direction only.
     *
     *  health and verdict are each rendered three or four times in one document (the
     *  summary page, the health headline or the letter's own verdict line, the
     *  doctor's plainSummary sentence), and the body-versus-block check fires on any
     *  one of them disagreeing — which is correct, and which means a forgery that
     *  edits only the summary page and the block never reaches the recomputation at
     *  all. To prove recomputation ALSO names these two, every rendering has to move
     *  together. The tier's own claims (scene count, page references, …) are rendered
     *  once, so they need no such hook. */
    alsoForge?: (artifact: string, shape: Shape) => string;
  }

  /** The doctor's own summary sentence — `CONSIDER — <descriptor>; overall score
   *  65/100.` — present verbatim in all three shapes. Rewritten through its own
   *  structure rather than by a literal replace, so neither capture can be confused
   *  with the same words elsewhere in the document. */
  function forgePlainSummary(text: string, over: { verdict?: string; health?: number }): string {
    const re = /(RECOMMEND|CONSIDER|PASS)( \u2014 [^;]+; overall score )(\d+)(\/100\.)/;
    assert.match(text, re, 'sanity: the artifact must carry the doctor\u2019s summary sentence');
    return text.replace(re, (_m, verdict, middle, health, tail) =>
      `${over.verdict ?? verdict}${middle}${over.health !== undefined ? Math.round(over.health) : health}${tail}`);
  }

  function forgedLengthLine(over: Partial<Pick<ArtifactClaims, 'sceneCount' | 'wordCount' | 'estimatedPages' | 'estimatedRuntimeMinutes'>>): string {
    return formatLengthLine({ ...tier.claims, ...over });
  }

  const FORGERIES: Forgery[] = [
    {
      claim: 'sceneCount',
      row: 'Scenes',
      rowValue: () => '9999',
      named: /sceneCount/,
      page: a => forgeEvery(a, tier.lengthLine, forgedLengthLine({ sceneCount: 9999 })),
    },
    {
      claim: 'wordCount',
      row: 'Words',
      rowValue: () => '999999',
      named: /wordCount/,
      page: a => forgeEvery(a, tier.lengthLine, forgedLengthLine({ wordCount: 999_999 })),
    },
    {
      claim: 'estimatedPages',
      row: 'Estimated pages',
      rowValue: () => '500',
      named: /estimatedPages/,
      page: a => forgeEvery(a, tier.lengthLine, forgedLengthLine({ estimatedPages: 500 })),
    },
    {
      claim: 'estimatedRuntimeMinutes',
      row: 'Estimated runtime (minutes)',
      rowValue: () => '500',
      named: /estimatedRuntimeMinutes/,
      page: a => forgeEvery(a, tier.lengthLine, forgedLengthLine({ estimatedRuntimeMinutes: 500 })),
    },
    {
      claim: 'prioritiesListed',
      row: 'Priorities listed',
      rowValue: () => '9',
      named: /prioritiesListed/,
      page: (a, shape) => (shape === 'txt'
        ? forgeFirst(a, tier.prioritiesHeading.toUpperCase(), prioritiesHeadingFor(9).toUpperCase())
        : forgeFirst(a, tier.prioritiesHeading, prioritiesHeadingFor(9))),
    },
    {
      claim: 'percentileReading',
      row: 'Health percentile reading',
      rowValue: () => 'top 10%',
      named: /percentileReading/,
      // The honest "not comparable" reading replaced by a flattering band — the
      // forgery this gate exists for: 0 of the 20 CC0 shorts are inside the
      // reference set's bounds, so every real draft takes the not-comparable path.
      page: a => forgeFirst(a, notComparableSentence(), healthPercentileSentence(100)),
    },
    {
      claim: 'referenceBounds',
      row: 'Reference bounds',
      rowValue: () => '200 samples / 9\u201310 scenes / 256\u2013337 words',
      named: /referenceBounds/,
      // A wider reference set makes the percentile look like a reading about real
      // writing rather than about twenty synthetic 9-10-scene samples.
      page: a => forgeFirst(a, tier.claims.referenceBounds, '200 samples / 9\u201310 scenes / 256\u2013337 words'),
    },
    {
      claim: 'loglineState',
      row: 'Logline',
      rowValue: () => 'not derived',
      named: /loglineState/,
      page: (a, shape) => forgeFirst(a, tier.logline as string,
        shape === 'html' ? NO_LOGLINE_NOTE_HTML : NO_LOGLINE_NOTE),
    },
    {
      claim: 'pageRefs',
      row: 'Page references',
      rowValue: () => encodePageRefs((tier.claims.pageRefs ?? []).map((r, i) => (i === 0 ? { ...r, page: 999 } : r))),
      named: /page reference|pageRefs/,
      page: (a, shape) => (shape === 'html'
        ? forgeFirst(a, '<span class="tier-page">p. 1</span>', '<span class="tier-page">p. 999</span>')
        : forgeFirst(a, '\u2014 p. 1', '\u2014 p. 999')),
    },
    // writer-loop.md finding 2, verbatim: the tier's own verdict/health line.
    {
      claim: 'verdict',
      row: 'Verdict',
      rowValue: () => 'RECOMMEND',
      named: /verdict/,
      page: (a, shape) => (shape === 'html'
        // The HTML tier states the verdict as the stamp the tier owns.
        ? forgeFirst(a, `>${tier.verdictLabel}</span>`, '>RECOMMEND</span>')
        : forgeFirst(a, `${tier.verdictLabel} \u00b7 ${tier.healthLine}`, `RECOMMEND \u00b7 ${tier.healthLine}`)),
      alsoForge: (a, shape) => {
        const withSummary = forgePlainSummary(a, { verdict: 'RECOMMEND' });
        if (shape === 'html') return withSummary;
        // The letter states the verdict a third time, below the divider.
        return shape === 'md'
          ? forgeFirst(withSummary, `**Verdict: ${tier.verdictLabel}**`, '**Verdict: RECOMMEND**')
          : forgeFirst(withSummary, `VERDICT: ${tier.verdictLabel}`, 'VERDICT: RECOMMEND');
      },
    },
    {
      claim: 'health',
      row: 'Health',
      rowValue: () => '94.6',
      named: /health/,
      page: a => forgeFirst(a, tier.healthLine, 'Health 94.6 / 100'),
      alsoForge: (a, shape) => {
        const withSummary = forgePlainSummary(a, { health: 94.6 });
        const genuineHealth = tier.claims.health.toFixed(1);
        return shape === 'html'
          // The health headline below the divider.
          ? forgeFirst(withSummary, `>${genuineHealth}</div>`, '>94.6</div>')
          // The letter's headline: `Health 65.0/100 (Fair) · …` — no spaces around
          // the slash, which is what distinguishes it from the tier's reading.
          : forgeFirst(withSummary, `Health ${genuineHealth}/100`, 'Health 94.6/100');
      },
    },
  ];

  for (const shape of SHAPES) {
    for (const forgery of FORGERIES) {
      it(`${shape}: ${forgery.claim} forged on the page only -> exit 1, the document disagrees with its own verify block`, () => {
        const forged = forgery.page(genuine[shape], shape);
        assert.notEqual(forged, genuine[shape], 'sanity: the forgery must have applied');
        const p = write(`body-${forgery.claim}.${EXT[shape]}`, forged);
        const { status, stdout } = runCli([p, scriptPath]);
        assert.equal(status, 1, stdout);
        assert.match(stdout, /authentic: no — the visible report disagrees with its own verify block/);
        assert.match(stdout, forgery.named);
        assert.doesNotMatch(stdout, /^VERIFIED/m);
      });

      it(`${shape}: ${forgery.claim} forged in every rendering AND in the verify block -> exit 1, reproduction names ${forgery.claim}`, () => {
        const onPage = forgery.page(genuine[shape], shape);
        const everywhere = forgery.alsoForge ? forgery.alsoForge(onPage, shape) : onPage;
        const forged = forgeRow(everywhere, shape, forgery.row, forgery.rowValue());
        const p = write(`consistent-${forgery.claim}.${EXT[shape]}`, forged);
        const { status, stdout } = runCli([p, scriptPath]);
        assert.equal(status, 1, stdout);
        assert.match(stdout, /authentic: yes/, 'the script text is untouched — only the claims were forged');
        assert.doesNotMatch(stdout, /disagrees with its own verify block/,
          'a document that agrees with itself must reach the recomputation, not be caught before it');
        assert.match(stdout, new RegExp(`NOT VERIFIED — reproduction disagrees on:.*${forgery.claim}`));
        assert.doesNotMatch(stdout, /^VERIFIED/m);
      });
    }

    it(`${shape}: the genuine artifact a live keyless server produced verifies at exit 0`, () => {
      const p = write(`genuine.${EXT[shape]}`, genuine[shape]);
      const { status, stdout } = runCli([p, scriptPath]);
      assert.equal(status, 0, stdout);
      assert.match(stdout, /^VERIFIED/m);
      // and every tier claim was actually CHECKED, not quietly absent
      for (const field of [
        'sceneCount', 'wordCount', 'estimatedPages', 'estimatedRuntimeMinutes',
        'prioritiesListed', 'percentileReading', 'referenceBounds', 'loglineState', 'pageRefs',
      ]) {
        assert.match(stdout, new RegExp(`^  ${field}: yes`, 'm'), `${field} must be reported as checked`);
      }
    });
  }

  // ── The raw report JSON ───────────────────────────────────────────────────
  // No reader summary page exists in this shape, so there is no body/block split:
  // the fields ARE the claims, and recomputation is the only check. The four the
  // tier renders from are the four this shape states.
  for (const [field, forge] of [
    ['sceneCount', (r: Record<string, unknown>) => ({ ...r, sceneCount: 9999 })],
    ['wordCount', (r: Record<string, unknown>) => ({ ...r, wordCount: 999_999 })],
    ['estimatedPages', (r: Record<string, unknown>) => ({
      ...r, pageEstimate: { ...(r.pageEstimate as object), pages: 500 },
    })],
    ['estimatedRuntimeMinutes', (r: Record<string, unknown>) => ({
      ...r, pageEstimate: { ...(r.pageEstimate as object), runtimeMinutes: 500 },
    })],
  ] as Array<[string, (r: Record<string, unknown>) => Record<string, unknown>]>) {
    it(`json: a forged ${field} -> exit 1, reproduction names ${field}`, () => {
      const forged = forge(JSON.parse(genuine.json) as Record<string, unknown>);
      const p = write(`json-${field}.json`, JSON.stringify(forged, null, 2));
      const { status, stdout } = runCli([p, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, new RegExp(`NOT VERIFIED — reproduction disagrees on:.*${field}`));
    });
  }

  it('json: the genuine report a live keyless server returned verifies at exit 0, and says which claims its shape cannot carry', () => {
    const p = write('genuine.json', genuine.json);
    const { status, stdout } = runCli([p, scriptPath]);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /^VERIFIED/m);
    assert.match(stdout, /^  sceneCount: yes/m);
    assert.match(stdout, /^  wordCount: yes/m);
    // No silent gaps: the page-only claims are NAMED as unchecked for this shape.
    assert.match(stdout, /not claimed by this json report, so not checked:.*prioritiesListed/);
    assert.match(stdout, /not claimed by this json report, so not checked:.*pageRefs/);
  });

  // ── A block with the tier's rows deleted ─────────────────────────────────
  it('html: a report that renders the summary page but publishes none of its claims is refused, not verified on what remains', () => {
    const stripped = genuine.html.replace(
      /\s*<div><dt>(Scenes|Words|Priorities listed|Reference bounds|Page references)<\/dt><dd><code>[^<]*<\/code><\/dd><\/div>/g,
      '',
    );
    assert.notEqual(stripped, genuine.html, 'sanity: rows must have been removed');
    const p = write('stripped-rows.html', stripped);
    const { status, stdout } = runCli([p, scriptPath]);
    assert.equal(status, 1, stdout);
    assert.match(stdout, /renders a reader summary page whose numbers its verify block does not publish/);
    for (const label of ['Scenes', 'Words', 'Priorities listed', 'Reference bounds', 'Page references']) {
      assert.match(stdout, new RegExp(`missing claim: ${label}`));
    }
    assert.doesNotMatch(stdout, /^VERIFIED/m);
  });

  it('a report with NO summary page at all (every artifact exported before 2026-09-11) is unaffected by that rule', () => {
    // The pre-tier shape, reconstructed by removing the tier section: the claims it
    // publishes are checked, the ones it does not state are reported as unchecked,
    // and it verifies. Gating on the tier's PRESENCE rather than on a version stamp
    // is what makes that true.
    const tierStart = genuine.html.indexOf('<section class="reader-tier">');
    const dividerEnd = genuine.html.indexOf('/>', genuine.html.indexOf('<hr class="tier-divider"')) + 2;
    assert.ok(tierStart > 0 && dividerEnd > tierStart, 'sanity: the genuine report has a tier to remove');
    const noTier = genuine.html.slice(0, tierStart) + genuine.html.slice(dividerEnd);
    const p = write('no-tier.html', noTier);
    const { status, stdout } = runCli([p, scriptPath]);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /^VERIFIED/m);
  });

  // ── CRLF and BOM ─────────────────────────────────────────────────────────
  // CLAUDE.md's own OneDrive/`core.autocrlf` hazard, applied to the artifact rather
  // than to the script: a Windows checkout or an editor that rewrote line endings
  // must not turn a genuine report into a failure, and must not turn a forged one
  // into a pass.
  const BOM = '\uFEFF';
  for (const [name, transform] of [
    ['CRLF', (t: string) => t.replace(/\n/g, '\r\n')],
    ['a BOM', (t: string) => BOM + t],
    ['CRLF and a BOM', (t: string) => BOM + t.replace(/\n/g, '\r\n')],
  ] as Array<[string, (t: string) => string]>) {
    it(`${name} in the genuine letter still verifies at exit 0`, () => {
      const p = write(`genuine-${name.replace(/\W+/g, '-')}.md`, transform(genuine.md));
      const { status, stdout } = runCli([p, scriptPath]);
      assert.equal(status, 0, stdout);
      assert.match(stdout, /^VERIFIED/m);
    });

    it(`${name} in the genuine HTML report still verifies at exit 0`, () => {
      const p = write(`genuine-${name.replace(/\W+/g, '-')}.html`, transform(genuine.html));
      const { status, stdout } = runCli([p, scriptPath]);
      assert.equal(status, 0, stdout);
      assert.match(stdout, /^VERIFIED/m);
    });

    it(`${name} does not let a forged scene count through`, () => {
      const forged = forgeEvery(genuine.md, tier.lengthLine, forgedLengthLine({ sceneCount: 9999 }));
      const p = write(`forged-${name.replace(/\W+/g, '-')}.md`, transform(forged));
      const { status, stdout } = runCli([p, scriptPath]);
      assert.equal(status, 1, stdout);
      assert.match(stdout, /sceneCount/);
      assert.doesNotMatch(stdout, /^VERIFIED/m);
    });
  }
});
