// CI gate integrity — the gates must be able to fail.
//
// WHY THIS EXISTS: six automated-agent PRs (#236–241, all closed 2026-08-02)
// each carried the same undisclosed hunk:
//
//     - name: Dependency review
//       uses: actions/dependency-review-action@v4
//   +     continue-on-error: true
//       with:
//         # Fail the PR on high/critical vulnerable packages in the diff.
//         fail-on-severity: high
//
// `continue-on-error: true` inserted directly above the comment asserting the
// step blocks the PR — turning the repo's only blocking supply-chain gate into
// a reporting-only step while leaving the comment claiming otherwise. None of
// the six PR bodies mentioned `security.yml`. Had any one merged, every later
// PR would have sailed past dependency review, and the diff that did it was a
// single line inside a change titled "performance improvement."
//
// A gate that can be silently disabled by the thing it gates is not a gate.
// The console-grep and honesty-audit gates are enforced mechanically in CI for
// the same reason (see .github/workflows/ci.yml); this test extends that
// principle to the gate definitions themselves, so neutering one fails the
// build instead of passing quietly.
//
// This asserts the SHAPE of the workflow, not its full content — new steps,
// renames, and reordering are all fine. It fails only when a gate that is
// supposed to block stops blocking.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const securityYml = path.join(root, '.github/workflows/security.yml');
const ciYml = path.join(root, '.github/workflows/ci.yml');
const releaseYml = path.join(root, '.github/workflows/release.yml');

/** Every `- name: …` step in a workflow, in file order. */
function stepNames(source: string): string[] {
  return source
    .split('\n')
    .map((l) => /^\s*-\s+name:\s+(.+?)\s*$/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m[1]);
}

/**
 * Extract the YAML block for a named step: everything from `- name: <name>`
 * up to (not including) the next sibling `- name:` or a dedent to a new job.
 */
function stepBlock(source: string, stepName: string): string | null {
  const lines = source.split('\n');
  const startIdx = lines.findIndex((l) => l.trim() === `- name: ${stepName}`);
  if (startIdx === -1) return null;
  const indent = lines[startIdx].indexOf('-');
  const out = [lines[startIdx]];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { out.push(line); continue; }
    const lineIndent = line.search(/\S/);
    // A sibling step, or any dedent past this step's own indent, ends the block.
    if (lineIndent <= indent) break;
    out.push(line);
  }
  return out.join('\n');
}

describe('CI gate integrity — blocking gates must stay blocking', () => {
  const security = fs.readFileSync(securityYml, 'utf8');
  const ci = fs.readFileSync(ciYml, 'utf8');
  const release = fs.readFileSync(releaseYml, 'utf8');

  it('the Dependency review step still exists', () => {
    assert.ok(
      stepBlock(security, 'Dependency review'),
      'security.yml must keep a step named "Dependency review" — it is the only blocking supply-chain gate',
    );
  });

  it('Dependency review is NOT continue-on-error (the #236-241 bypass)', () => {
    const block = stepBlock(security, 'Dependency review');
    assert.ok(block, 'Dependency review step missing');
    assert.doesNotMatch(
      block,
      /continue-on-error\s*:\s*true/,
      'Dependency review must block. `continue-on-error: true` makes it reporting-only while its own comment still claims it fails the PR — this is exactly the hunk six bot PRs shipped undisclosed.',
    );
  });

  it('Dependency review still fails on high severity', () => {
    const block = stepBlock(security, 'Dependency review');
    assert.ok(block, 'Dependency review step missing');
    assert.match(
      block,
      /fail-on-severity\s*:\s*(high|critical|moderate|low)/,
      'Dependency review must keep an explicit fail-on-severity threshold',
    );
  });

  it('the ci.yml gates that must block are not continue-on-error', () => {
    // These are the named hard gates. `Check documentation quality` is
    // deliberately non-blocking and is intentionally NOT listed here.
    //
    // 'Scoring-path change requires a measurement receipt' is on this list
    // for the same #236-241 reason as the rest: it is CI's only mechanical
    // enforcement of the AUC-floor human-measurement step (CLAUDE.md — the
    // corpus itself can never reach CI, so the VALUE stays unverifiable, but
    // the step existing at all must not be silently bypassable). If this
    // ever grows a `continue-on-error: true`, the gap it closes reopens
    // invisibly, exactly like the dependency-review bypass this file exists
    // to catch.
    //
    // The list below names steps that must EXIST. Whether a step BLOCKS is no
    // longer checked from a hardcoded list at all — see the derived test
    // further down, which was added after an audit found this list silently
    // omitting "Run tests", "Metamorphic scoring gate", and "Build". A list of
    // gates to protect is itself a thing that can be quietly shortened.
    for (const name of [
      'Type check',
      'Enforce no console.* under server/',
      'Honesty string audit',
      'Run tests (keyless — analysis-only posture)',
      'Scoring-path change requires a measurement receipt',
      'Metamorphic scoring gate',
      'Build',
    ]) {
      const block = stepBlock(ci, name);
      assert.ok(block, `ci.yml must keep a step named "${name}"`);
      assert.doesNotMatch(
        block,
        /continue-on-error\s*:\s*true/,
        `"${name}" is a hard gate and must not be continue-on-error`,
      );
    }
  });

  // -------------------------------------------------------------------------
  // Derived checks: four bypass shapes the hardcoded lists above cannot see.
  //
  // Every check below reasons over ALL steps/jobs found in the file rather
  // than over a list someone has to remember to extend. The audit that
  // prompted them found: (a) job-level `continue-on-error` unguarded,
  // (b) expression-valued `continue-on-error: ${{ true }}` unguarded,
  // (c) `if: <cond> && false` unguarded (only a bare `if: false` was checked),
  // and (d) three ci.yml steps absent from the hardcoded list entirely, so
  // neutering any of them was free.
  // -------------------------------------------------------------------------

  /**
   * The ONLY steps allowed to be non-blocking, each with the reason. Anything
   * else carrying `continue-on-error` fails — including a brand-new step
   * nobody thought to add to a list.
   */
  const ALLOWED_NON_BLOCKING: Record<string, string> = {
    'Check documentation quality':
      'AI-writing-pattern scan over markdown; warnings only, deliberately advisory to avoid false positives on legitimate usage.',
  };

  for (const [file, src] of [['ci.yml', ci], ['release.yml', release], ['security.yml', security]] as const) {
    it(`${file}: only explicitly-allowed steps are continue-on-error`, () => {
      const offenders: string[] = [];
      for (const name of stepNames(src)) {
        const block = stepBlock(src, name);
        if (!block) continue;
        if (!/continue-on-error\s*:/.test(block)) continue;
        if (name in ALLOWED_NON_BLOCKING) continue;
        offenders.push(name);
      }
      assert.deepEqual(
        offenders,
        [],
        `${file}: these steps carry \`continue-on-error\` without being on the allowlist in this test. `
        + 'A gate that cannot fail is not a gate. If a step genuinely must be advisory, add it to '
        + 'ALLOWED_NON_BLOCKING with the reason — in a diff a reviewer will see.',
      );
    });

    it(`${file}: no job-level continue-on-error`, () => {
      // `continue-on-error` at JOB level (4-space indent, a sibling of
      // `runs-on:`) makes every step in the job advisory at once without any
      // step being touched. None of the step-level checks above would see it.
      assert.doesNotMatch(
        src,
        /^ {4}continue-on-error\s*:/m,
        `${file} must not set continue-on-error at job level — it neuters every step in the job at once`,
      );
    });

    it(`${file}: continue-on-error is never expression-valued`, () => {
      // `continue-on-error: ${{ true }}` (or any expression) reads as
      // configuration and defeats every literal `: true` check, including the
      // one this file has had since #236-241.
      assert.doesNotMatch(
        src,
        /continue-on-error\s*:\s*\$\{\{/,
        `${file}: continue-on-error must be a literal true/false. An expression hides whether the gate blocks.`,
      );
    });

    it(`${file}: no \`if:\` condition can evaluate to a hardcoded false`, () => {
      // The original check looked only for a bare `if: false` on its own line.
      // `if: github.event_name == 'push' && false` skips the step just as
      // completely while looking like a real condition.
      const badIfs = src
        .split('\n')
        .filter((l) => /^\s*if\s*:/.test(l) && /\bfalse\b/.test(l));
      assert.deepEqual(
        badIfs.map((l) => l.trim()),
        [],
        `${file}: an \`if:\` containing a literal \`false\` disables a job or step while looking conditional`,
      );
    });
  }

  it('release.yml really does mirror ci.yml, step for step', () => {
    // release.yml's header claims it mirrors ci.yml's gate. It did not: it ran
    // 7 steps to ci.yml's 10 — no receipt check, no RUN_E2E, no doc-quality
    // check, no unverified-gates report — so a tag push could publish an image
    // built from an unreceipted scoring change. The claim is now mechanical:
    // if a gate is added to ci.yml and not to release.yml, this fails.
    const ciSteps = stepNames(ci);
    const releaseSteps = new Set(stepNames(release));
    const missing = ciSteps.filter((s) => !releaseSteps.has(s));
    assert.deepEqual(
      missing,
      [],
      'release.yml claims (in its header) to mirror ci.yml, but these ci.yml steps have no counterpart '
      + 'there. Either add them or rewrite the claim — a false claim of coverage is worse than an '
      + 'acknowledged gap.',
    );
  });

  it('release.yml runs the keyless suite with RUN_E2E enabled, like ci.yml', () => {
    const block = stepBlock(release, 'Run tests (keyless — analysis-only posture)');
    assert.ok(block, 'release.yml must keep the test step');
    assert.match(
      block,
      /RUN_E2E\s*:\s*"?1"?/,
      'release.yml must set RUN_E2E=1 like ci.yml — a release is the last place to skip the only full-stack test',
    );
  });

  it('both workflows checkout with full history (the receipt guard needs it)', () => {
    for (const [file, src] of [['ci.yml', ci], ['release.yml', release]] as const) {
      assert.match(
        src,
        /fetch-depth:\s*0/,
        `${file} must checkout with fetch-depth: 0 — the scoring-receipt guard degrades to "no base ref, `
        + 'nothing to check" on a shallow clone, which looks exactly like a pass',
      );
    }
  });

  it('ci.yml declares least-privilege permissions', () => {
    assert.match(
      ci,
      /^permissions:\n\s+contents:\s*read\s*$/m,
      'ci.yml must declare `permissions: contents: read`. With no permissions block the job inherits the '
      + 'repository default, which can be a read/write GITHUB_TOKEN held by every step including `npm ci`.',
    );
  });

  it('release.yml keeps the registry write token out of the test job', () => {
    // Workflow-level `packages: write` is inherited by EVERY job, so the test
    // job held a GHCR push credential while running `npm ci` — one malicious
    // postinstall away from an image push.
    const workflowLevel = release.match(/^permissions:\n((?:[ \t]+\S.*\n)+)/m);
    assert.ok(workflowLevel, 'release.yml must declare workflow-level permissions');
    assert.doesNotMatch(
      workflowLevel![1],
      /packages\s*:\s*write/,
      'release.yml must not grant `packages: write` at workflow level — scope it to the publish job',
    );
    const publishJob = release.match(/\n {2}publish:\n([\s\S]*?)(?=\n {2}\S|\n*$)/);
    assert.ok(publishJob, 'release.yml must keep a "publish" job');
    assert.match(
      publishJob![1],
      /packages\s*:\s*write/,
      'the publish job must declare its own `packages: write`',
    );
  });

  it('release.yml does not push :latest for a prerelease version', () => {
    // ghcr.io/…/storymachine:latest currently resolves to 1.0.0-rc.1 because
    // the tag list was unconditional. `latest` must mean the newest stable.
    assert.doesNotMatch(
      release,
      /^\s+\$\{\{ steps\.image\.outputs\.name \}\}:latest\s*$/m,
      'release.yml must not list `:latest` unconditionally in the build-push tag list',
    );
    assert.match(
      release,
      /is_prerelease/,
      'release.yml must compute a prerelease flag and gate the `:latest` tag on it',
    );
  });

  it('no workflow disables a gate by neutering the whole job', () => {
    // `if: false` on a job silently skips every step inside it, achieving the
    // same result as continue-on-error without touching any step.
    for (const [file, src] of [['security.yml', security], ['ci.yml', ci], ['release.yml', release]] as const) {
      assert.doesNotMatch(
        src,
        /^\s*if\s*:\s*false\s*$/m,
        `${file} must not contain a hardcoded \`if: false\`, which disables a job wholesale`,
      );
    }
  });

  // release.yml deliberately duplicates four of ci.yml's gates (its own
  // header comment: "Type check, no-console lint, keyless test suite,
  // build") rather than depending on a separate ci.yml run for the same
  // ref/SHA — workflow_dispatch has no associated PR/push CI run, and a
  // tag-push CI run is a separate, not-guaranteed-synchronous workflow run.
  // Because it duplicates rather than reuses, it can independently rot: a
  // bypass hunk landed here alone (nobody watching ci.yml would notice) would
  // let a tag push publish a broken image while ci.yml stayed fully intact.
  // Same #236-241 shape as security.yml's Dependency review step, just in a
  // workflow the original test never looked at.
  it('release.yml keeps its duplicated gates (Type check / no-console grep / honesty audit / run tests) and none are continue-on-error', () => {
    for (const name of [
      'Type check',
      'Enforce no console.* under server/',
      'Honesty string audit',
      'Run tests (keyless — analysis-only posture)',
    ]) {
      const block = stepBlock(release, name);
      assert.ok(block, `release.yml must keep a step named "${name}"`);
      assert.doesNotMatch(
        block,
        /continue-on-error\s*:\s*true/,
        `release.yml's "${name}" is a hard gate (duplicated from ci.yml) and must not be continue-on-error`,
      );
    }
  });

  // The honesty audit's repo-metadata lane is env-gated on HONESTY_AUDIT_REPO
  // so that a local, offline run stays deterministic and network-free. That
  // design is only honest if something actually sets the variable — otherwise
  // it is a check that silently never runs.
  //
  // This repo has already been bitten by exactly that: REAL_SCRIPT_CORPUS_DIR
  // gates the AUC-24 ratchet assertion in tests/core/real-script-corpus.test.ts
  // and appears nowhere in .github/, so that assertion has SKIPPED on every CI
  // run since it was written. (That one is unfixable here — the corpus is
  // local-only for copyright reasons and deliberately cannot reach CI. This
  // one is fixable, so it is fixed.)
  //
  // Deleting the env line below would not fail any other test, would not fail
  // the build, and would turn the lane back into decoration — which is the
  // whole failure mode. So it is asserted.
  it('both workflows actually SET HONESTY_AUDIT_REPO on the honesty-audit step (an env-gated check nothing enables is not a check)', () => {
    for (const [label, source] of [['ci.yml', ci], ['release.yml', release]] as const) {
      const block = stepBlock(source, 'Honesty string audit');
      assert.ok(block, `${label} must keep a step named "Honesty string audit"`);
      assert.match(
        block!,
        /HONESTY_AUDIT_REPO\s*:\s*\$\{\{\s*github\.repository\s*\}\}/,
        `${label}'s honesty-audit step must set HONESTY_AUDIT_REPO — without it the repo-metadata lane skips silently on every run, reproducing the REAL_SCRIPT_CORPUS_DIR failure mode`,
      );
    }
  });

  it("release.yml's publish job still hard-depends on the test job", () => {
    // Unlike ci.yml/security.yml (which have no downstream job to gate),
    // release.yml's four duplicated steps only actually block anything
    // because `publish: needs: test` makes a failing test job prevent
    // `publish` from running at all (see release.yml's own comment). Every
    // check above would be theater if this dependency were quietly dropped
    // or narrowed — that alone would let a failing/skipped test job publish
    // an image anyway, with no single step needing to be touched.
    const publishJob = release.match(/\n {2}publish:\n([\s\S]*?)(?=\n {2}\S|\n*$)/);
    assert.ok(publishJob, 'release.yml must keep a "publish" job');
    assert.match(
      publishJob![1],
      /^\s*needs\s*:\s*test\s*$/m,
      "release.yml's publish job must declare `needs: test` — without it, a failing test job cannot block image publication",
    );
  });

  it('mirrored gate steps run the SAME commands, not just the same names', () => {
    // 2026-08-24 adversarial verification found the step-for-step mirror
    // assertion above is name-only: replacing a release.yml gate's `run:`
    // body with `echo "..."` while keeping the step name left all checks
    // green — a tag push could publish an image whose gates are hollow.
    // This closes that: every step name shared by both files must carry an
    // identical run body, except the one documented deliberate difference.
    const runBody = (source: string, name: string): string | null => {
      const block = stepBlock(source, name);
      if (!block) return null;
      const m = /^\s*run:\s*(.*)$/m.exec(block);
      if (!m) return null;
      const inline = m[1].trim();
      if (inline !== '' && !/^[|>]-?$/.test(inline)) return inline;
      // Block scalar: collect the indented lines that follow.
      const lines = block.split('\n');
      const idx = lines.findIndex((l) => /^\s*run:\s*[|>]-?\s*$/.test(l));
      if (idx === -1) return m[1].trim();
      const body: string[] = [];
      let base = -1;
      for (let i = idx + 1; i < lines.length; i++) {
        const l = lines[i];
        if (l.trim() === '') { body.push(''); continue; }
        const li = l.search(/\S/);
        if (base === -1) base = li;
        if (li < base) break;
        body.push(l.slice(base));
      }
      return body.join('\n').trim();
    };
    // The receipt check is the one step whose bodies legitimately differ:
    // ci.yml checks the single change's range, release.yml checks the whole
    // release window with --structural-only (its own comment explains why
    // re-validating historical entry CONTENT over a wide window would fail
    // the honest squash-merged receipts). The exception still requires the
    // release body to actually invoke the guard — an `echo` fails here too.
    const ALLOWED_BODY_DIVERGENCE: Record<string, RegExp> = {
      'Scoring-path change requires a measurement receipt': /check-scoring-receipt(\.mjs|\b)/,
    };
    const ciSteps = stepNames(ci);
    for (const name of ciSteps) {
      const ciBody = runBody(ci, name);
      const relBody = runBody(release, name);
      if (ciBody === null || relBody === null) continue;
      if (name in ALLOWED_BODY_DIVERGENCE) {
        assert.match(
          relBody,
          ALLOWED_BODY_DIVERGENCE[name],
          `release.yml's "${name}" diverges from ci.yml by documented design, but its body no longer `
          + 'invokes the gate it is named for — a hollow step wearing an honest name.',
        );
        continue;
      }
      assert.equal(
        relBody,
        ciBody,
        `release.yml's "${name}" runs a different command than ci.yml's step of the same name. `
        + 'The mirror claim is about what executes, not what the step is called — if the divergence '
        + 'is deliberate, add it to ALLOWED_BODY_DIVERGENCE with the reason and a containment regex.',
      );
    }
  });

  it('continue-on-error appears nowhere except the one allowlisted named step', () => {
    // Same verification found continue-on-error on an UNNAMED step (e.g. a
    // bare `- uses: actions/setup-node@v4`) is invisible to every scan above
    // — stepNames() only enumerates `- name:` lines. This is the blunt
    // backstop: every continue-on-error occurrence in every workflow must
    // sit inside the step block of an explicitly allowlisted step name;
    // an occurrence in an unnamed step has no name to allowlist and fails.
    const ALLOWED_STEPS = new Set(['Check documentation quality']);
    for (const [file, source] of [['ci.yml', ci], ['release.yml', release], ['security.yml', security]] as const) {
      const lines = source.split('\n');
      lines.forEach((line, i) => {
        if (!/^\s*continue-on-error\s*:/.test(line)) return;
        // Walk back to the enclosing step's `- name:` (a `- uses:`/- run:`
        // opener without a name yields none — which is the point).
        let owner: string | null = null;
        for (let j = i; j >= 0; j--) {
          const dash = /^(\s*)-\s+(name:\s*(.+?)\s*)?/.exec(lines[j]);
          if (dash && /^\s*-\s/.test(lines[j])) {
            owner = /^\s*-\s+name:\s*(.+?)\s*$/.exec(lines[j])?.[1] ?? null;
            break;
          }
        }
        assert.ok(
          owner !== null && ALLOWED_STEPS.has(owner),
          `${file}:${i + 1} has continue-on-error ${owner === null
            ? 'on an UNNAMED step — unnamed steps are invisible to the named-step scans, which is exactly why this backstop exists'
            : `on step "${owner}", which is not allowlisted`}. Remove it, or name the step and allowlist it with a reason.`,
        );
      });
    }
  });
});
