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

/**
 * Extract the YAML block for a workflow-level `concurrency:` key (the block
 * at column 0, not a job-level one nested under a job — e.g. edge.yml's
 * `publish-edge` job has its own indented `concurrency:` a reader should not
 * mistake for this one). Returns null if no top-level key by that name exists.
 *
 * Comment lines (leading whitespace then `#`) are dropped from both the
 * search for the opening `concurrency:` line and from the collected block
 * body. Without this, a live `cancel-in-progress: true` sitting next to a
 * commented-out `# cancel-in-progress: ${{ github.ref != 'refs/heads/main'
 * }}` — the exact bypass shape this file's header exists to catch, applied
 * to this newer guard instead of an older one — makes the later regex match
 * the CORRECT text that is dead in a comment while the LIVE line stays
 * broken. Dropping comment lines first means only the live value can ever
 * satisfy the regex.
 */
function topLevelConcurrencyBlock(source: string): string | null {
  const lines = source.split('\n');
  const isComment = (l: string) => l.trim().startsWith('#');
  const startIdx = lines.findIndex((l) => !isComment(l) && l === 'concurrency:');
  if (startIdx === -1) return null;
  const out = [lines[startIdx]];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (isComment(line)) continue;
    if (line.search(/\S/) === 0) break; // dedent back to another top-level key
    out.push(line);
  }
  return out.join('\n');
}

/**
 * How many top-level `concurrency:` keys a workflow declares (comment lines
 * excluded, same rule as above). A second one later in the file wins for a
 * real YAML loader — later keys shadow earlier ones — but
 * `topLevelConcurrencyBlock` above reads only the FIRST, so a correct first
 * block plus a broken second block would read as correct here while the
 * broken one actually governs the running workflow. This must stay at 1.
 */
function topLevelConcurrencyKeyCount(source: string): number {
  return source
    .split('\n')
    .filter((l) => !l.trim().startsWith('#') && l === 'concurrency:')
    .length;
}

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
    // Round-2 review Finding 10 (the M6 comment-shadow shape, one helper
    // over from topLevelConcurrencyBlock's own fix): a comment line must
    // never be able to satisfy an `assert.match` against this block.
    // Skipped BEFORE the dedent check — not pushed into `out`, and not used
    // to decide the block boundary — so a comment sitting between this
    // step's real content and the next step's `- name:` line is simply
    // invisible here; the next step's actual marker line still ends the
    // block exactly as before, since it is not itself a comment. Verified:
    // deleting the live `set -o pipefail` line from the "Run tests" step
    // used to leave the guard green, because the comment directly above the
    // run block opens with the words "`set -o pipefail` is explicit rather
    // than assumed" — the regex matched the EXPLANATION of the line instead
    // of the line.
    if (line.trim().startsWith('#')) continue;
    const lineIndent = line.search(/\S/);
    // A sibling step, or any dedent past this step's own indent, ends the block.
    if (lineIndent <= indent) break;
    out.push(line);
  }
  return out.join('\n');
}

/**
 * A workflow source with comment-only lines removed.
 *
 * Round-2 review, minor item 3: the round-1 edge.yml assertions each carried
 * their own inline `split/filter/join` copy of this. One helper. (The three
 * PREDICATE uses above — topLevelConcurrencyBlock, topLevelConcurrencyKeyCount
 * and stepBlock — are deliberately left as they are: they filter while walking
 * indentation rather than producing a stripped source, and this lane is under
 * a "no deletions from the pre-existing file" constraint. See the round-2
 * closure section of docs/audits/2026-09-18-edge-image/review.md.)
 *
 * Stripping is load-bearing, not cosmetic: edge.yml's own explanatory prose
 * quotes the very strings the assertions below look for, so a raw match on the
 * file keeps reporting green after the LIVE line is deleted or commented out.
 */
function liveLines(source: string): string {
  return source
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The YAML block nested at an exact path of block-mapping keys — e.g.
 * `yamlBlock(edgeSrc, ['on', 'workflow_run'])` returns ONLY the body of
 * `on.workflow_run`, never a sibling trigger's body.
 *
 * WHY THIS EXISTS (round-2 review items 4 and 5). The round-1 assertions
 * captured the whole `on:` block and substring-searched it, and searched the
 * whole file for the job's `if:` conditions. Both were defeated by an ordinary
 * edit that MOVES the text rather than deleting it:
 *
 *   - `branches: [main]` relocated from `on.workflow_run` to a sibling
 *     `on.push` trigger — 49 pass / 0 fail, with the 467-skipped-runs defect
 *     fully restored;
 *   - the three `if:` conditions demoted from the `publish-edge` JOB to a
 *     step-level `if:` — 49 pass / 0 fail, while every CI completion on main
 *     again creates a real run that checks out the commit and holds
 *     `packages: write`.
 *
 * A guard that is green on input that cannot work is not a guard
 * (docs/LANE_STANDARD.md §3), so these read the structure instead of the text.
 *
 * This is an indentation-aware walk over YAML block mappings — the same walk
 * `topLevelConcurrencyBlock` above already does, generalised to a path — NOT a
 * full YAML implementation, and it is described that way deliberately: this
 * repository vendors no YAML parser (`require.resolve('yaml')` and
 * `require.resolve('js-yaml')` both fail), and adding a dependency to a test
 * is a bigger change than the defect warrants. It handles what GitHub workflow
 * files are: block mappings, comments, flow sequences and block scalars. It
 * does NOT handle flow mappings (`on: {workflow_run: {...}}`) or anchors,
 * both of which return null here and so fail the assertions CLOSED, which is
 * the correct direction for a guard. A quoted key (`"on":`) and tab
 * indentation fail closed the same way.
 *
 * MULTI-DOCUMENT files are the one exception, and round-3 review corrected
 * this sentence: `yamlBlock` reads the FIRST document and ignores a `---`
 * separated second one, so a second document with an unfiltered trigger comes
 * back GREEN rather than null. That is unreachable in practice — GitHub
 * Actions does not accept a multi-document workflow file — but the docstring
 * previously claimed it failed closed, and it does not.
 *
 * DUPLICATE KEYS FAIL CLOSED, and that is round-3 review item R2-3, the one
 * hole in this helper that was reachable. YAML resolves a repeated mapping key
 * to the LAST occurrence; this walk took the FIRST. Three edits that add a
 * key rather than moving one were each 51/51 GREEN on a workflow whose
 * EFFECTIVE configuration is broken (confirmed against a real YAML
 * implementation, not asserted):
 *
 *   - a second top-level `on:` whose `workflow_run` has no `branches:` —
 *     effective trigger `{'workflows': ['CI'], 'types': ['completed']}`, i.e.
 *     the 467-skipped-runs defect fully restored;
 *   - a second `if: always()` after the job's real `if:` — effective `if:` is
 *     `always()`, so EVERY workflow_run completion publishes while holding
 *     `packages: write`;
 *   - a second `publish-edge:` job key with no `if:` at all — same.
 *
 * The second and third are round-1 item 5 restored through a different edit.
 * THIS FILE ALREADY KNEW about the hazard: `topLevelConcurrencyKeyCount` at
 * :79-85 exists for exactly it, and its docstring says "later keys shadow
 * earlier ones… would read as correct here while the broken one actually
 * governs". This helper, 100 lines below, had reintroduced it. The fix below
 * makes that lesson general instead of `concurrency`-specific: every key on
 * the path must occur EXACTLY ONCE at its level, and a repeat returns null.
 *
 * Honest caveat, recorded rather than leaned on: GitHub's workflow parser
 * very likely rejects a duplicate mapping key outright, making the real-world
 * consequence a loud `startup_failure` rather than a silently-wrong trigger.
 * Neither GitHub's workflow-syntax reference nor its Actions documentation
 * says anything about duplicate keys, and no test workflow was pushed to find
 * out. Either way the guard was green on a workflow that cannot work, which
 * is the standard this lane set for itself.
 */
function yamlBlock(source: string, keyPath: readonly string[]): string | null {
  let lines = liveLines(source)
    .split('\n')
    .filter((l) => l.trim() !== '');
  for (const key of keyPath) {
    if (lines.length === 0) return null;
    const levelIndent = lines[0].search(/\S/);
    const keyLine = new RegExp(`^\\s*${escapeForRegExp(key)}\\s*:`);
    const matches = lines.filter((l) => l.search(/\S/) === levelIndent && keyLine.test(l));
    // Exactly once, or fail closed. A repeated key resolves to the LAST
    // occurrence for a real YAML loader while this walk reads the first, so
    // "present twice" cannot be allowed to read as "present". (R2-3)
    if (matches.length !== 1) return null;
    const startIdx = lines.indexOf(matches[0]);
    if (startIdx === -1) return null;
    const body: string[] = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (lines[i].search(/\S/) <= levelIndent) break;
      body.push(lines[i]);
    }
    lines = body;
  }
  return lines.join('\n');
}

/**
 * The scalar value at an exact key path, block scalars (`>-`, `|`) folded into
 * one line. Returns null when no key exists at that path — which is exactly
 * what "the condition was moved somewhere else" looks like — and also when a
 * key on the path occurs more than once at its level, which is what "a second
 * key was added after the real one" looks like (see yamlBlock, R2-3).
 */
function yamlScalar(source: string, keyPath: readonly string[]): string | null {
  const key = keyPath[keyPath.length - 1];
  const parentPath = keyPath.slice(0, -1);
  const parent =
    parentPath.length === 0 ? liveLines(source) : yamlBlock(source, parentPath);
  if (parent === null) return null;
  const lines = parent.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return null;
  const levelIndent = lines[0].search(/\S/);
  const keyLine = new RegExp(`^\\s*${escapeForRegExp(key)}\\s*:`);
  const matches = lines.filter((l) => l.search(/\S/) === levelIndent && keyLine.test(l));
  // Same unique-key rule as yamlBlock — see its docstring (R2-3). A second
  // `if:` on the job is what makes this load-bearing: YAML resolves it to the
  // LAST one, so a trailing `if: always()` governs.
  if (matches.length !== 1) return null;
  const startIdx = lines.indexOf(matches[0]);
  if (startIdx === -1) return null;
  const parts = [lines[startIdx].replace(keyLine, '').trim()];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].search(/\S/) <= levelIndent) break;
    parts.push(lines[i].trim());
  }
  return parts.join(' ').trim();
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

  // 2026-09-13: a lane pushing three docs-only commits in one minute started
  // three full CI runs (test job ~7 min + browser job ~5 min each, all
  // in-progress at once) because ci.yml had no concurrency group at all — see
  // lane/voice-bound-ci-derivation's 06:05-06:06 UTC runs 34741882322 /
  // 34741923678 / 34741928418. A workflow-level group keyed on the ref makes
  // a later push cancel its own branch's in-flight run instead of running
  // beside it; main is excluded because its run record must never be
  // interrupted (CLAUDE.md cites main's runs specifically).
  // The group key: `${{ github.workflow }}-${{ github.ref }}` for the
  // branch/PR-cancellation half, with a `-${{ github.ref == 'refs/heads/main'
  // && github.sha || '' }}` suffix so every main commit gets its OWN group
  // (empty suffix on every other ref, leaving those groups exactly as
  // before). This is round 2: round 1 keyed on workflow+ref alone and relied
  // on `cancel-in-progress: false` to keep main safe, which a review showed
  // does not hold — that flag stops a RUNNING run from being cancelled, but
  // a run left PENDING in a shared group is still cancelled when a third run
  // queues behind it, so two quick pushes to main could drop the middle run's
  // conclusion. The sha suffix removes the shared group entirely for main
  // rather than merely asking the group not to cancel it. An optional
  // surrounding quote is allowed in both regexes below — `group: ${{ … }}`
  // and `group: "${{ … }}"` are the same YAML scalar, and round 1's
  // unquoted-only regex went red on the quoted-but-equivalent form the
  // lane's own report rendered it as.
  const GROUP_KEY_RE =
    /group:\s*(['"]?)\$\{\{\s*github\.workflow\s*\}\}-\$\{\{\s*github\.ref\s*\}\}-\$\{\{\s*github\.ref\s*==\s*'refs\/heads\/main'\s*&&\s*github\.sha\s*\|\|\s*''\s*\}\}\1/;
  const CANCEL_EXCEPT_MAIN_RE =
    /cancel-in-progress:\s*(['"]?)\$\{\{\s*github\.ref\s*!=\s*'refs\/heads\/main'\s*\}\}\1/;

  for (const [file, src] of [['ci.yml', ci], ['security.yml', security]] as const) {
    it(`${file} declares exactly one top-level concurrency group`, () => {
      // A second `concurrency:` block later in the file wins for a real YAML
      // loader (later keys shadow earlier ones) but topLevelConcurrencyBlock
      // reads only the first, so a correct first block plus a broken second
      // one would read as correct here while the broken one actually governs
      // the workflow GitHub runs.
      assert.equal(
        topLevelConcurrencyKeyCount(src),
        1,
        `${file} must declare exactly one top-level \`concurrency:\` key — a second one added later in the `
        + 'file silently wins over this one for YAML while this test would still be reading the first',
      );
    });

    it(`${file} declares a workflow-level concurrency group keyed on the workflow, ref, and (main-only) sha`, () => {
      const block = topLevelConcurrencyBlock(src);
      assert.ok(
        block,
        `${file} must declare a top-level \`concurrency:\` group — without one, repeated pushes to the `
        + 'same branch (or a superseded PR head) run fully in parallel instead of the later one replacing '
        + 'the earlier',
      );
      assert.match(
        block!,
        GROUP_KEY_RE,
        `${file}'s concurrency group must be keyed on \`github.workflow\`-\`github.ref\`, with a `
        + "github.sha suffix when the ref is refs/heads/main so every main commit gets its own group and "
        + 'never shares one with any other run',
      );
    });

    it(`${file} cancels superseded runs everywhere EXCEPT main`, () => {
      const block = topLevelConcurrencyBlock(src);
      assert.ok(block, `${file} must declare a top-level \`concurrency:\` group`);
      assert.match(
        block!,
        CANCEL_EXCEPT_MAIN_RE,
        `${file}'s \`cancel-in-progress\` must be the expression \`\${{ github.ref != 'refs/heads/main' }}\` `
        + '— true for a lane/PR ref (safe to cancel a superseded run) and false for refs/heads/main '
        + "(main's run record must never be cancelled, per CLAUDE.md)",
      );
    });
  }

  // Round-1 review Finding 2: `topLevelConcurrencyBlock` used to collect
  // COMMENT lines into the block text along with live ones, so the block's
  // raw string could contain the CORRECT expression dead in a `# was: …`
  // comment sitting right next to a LIVE, broken value — exactly the #236-241
  // shape (a comment claiming the true behavior while the real line does
  // something else), aimed at this newer guard instead of an older one. A
  // synthetic case here — not dependent on the real files staying broken or
  // fixed — pins the fix as a permanent regression guard.
  it('a commented-out correct cancel-in-progress line cannot shadow a live incorrect one (the M6 finding)', () => {
    const shadowed = [
      'concurrency:',
      "  group: ${{ github.workflow }}-${{ github.ref }}-${{ github.ref == 'refs/heads/main' && github.sha || '' }}",
      "  # was: cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}",
      '  cancel-in-progress: true',
      '',
      'jobs:',
    ].join('\n');
    const block = topLevelConcurrencyBlock(shadowed);
    assert.ok(block, 'sanity: the block itself must still be found');
    assert.doesNotMatch(
      block!,
      CANCEL_EXCEPT_MAIN_RE,
      'a live `cancel-in-progress: true` with the correct expression left behind only as a comment must NOT '
      + 'satisfy this check — a naive implementation that keeps comment text in the block string passes this '
      + 'input at 34/34 (round-1 review, Finding 2)',
    );
    // The group line in this fixture IS correct and live (not commented), so
    // it should still match — this test is about the cancel-in-progress
    // line specifically, not a claim that comment-stripping breaks everything.
    assert.match(block!, GROUP_KEY_RE, 'sanity: the live, correct group line must still match');
  });

  // Round-2 review Finding 10 (round-1's Finding 2, reintroduced one helper
  // over): `stepBlock()` used to collect comment lines the same way
  // `topLevelConcurrencyBlock()` once did. The comment written directly
  // above ci.yml's/release.yml's "Run tests" run block explains
  // `set -o pipefail` in prose ("`set -o pipefail` is explicit rather than
  // assumed …"), so `assert.match(block, /set -o pipefail/)` was satisfied
  // by the EXPLANATION even with the live command line deleted — a mutated,
  // broken step (tee's exit code, not npm test's, would gate the job) read
  // as correct. A self-contained fixture, independent of the real files'
  // wording, pins the fix.
  it("a comment mentioning `set -o pipefail` cannot satisfy the check when the live command line is gone (Finding 10)", () => {
    const noPipefail = [
      '      - name: Run tests (keyless — analysis-only posture)',
      "        # `set -o pipefail` is explicit rather than assumed: without it,",
      '        # a failing `npm test` piped into `tee` would report `tee`\'s own',
      '        # exit code (0), silently turning a red test run into a green step.',
      '        run: |',
      '          npm test 2>&1 | tee test-output.tap',
      '',
      '      - name: Next step',
    ].join('\n');
    const block = stepBlock(noPipefail, 'Run tests (keyless — analysis-only posture)');
    assert.ok(block, 'sanity: the step block itself must still be found');
    assert.doesNotMatch(
      block!,
      /set -o pipefail/,
      'a comment explaining `set -o pipefail` must NOT satisfy this check when the live command line has '
      + 'been deleted — a naive stepBlock() that keeps comment text lets this mutated, broken step (which '
      + 'would report `tee`\'s exit code instead of `npm test`\'s) read as correct (round-2 review, Finding 10)',
    );
    // The run body's OWN content — `tee test-output.tap` — is live, not
    // commented, so it should still be found; this test is about the
    // pipefail line specifically.
    assert.match(block!, /tee\s+test-output\.tap/, 'sanity: the live tee line must still match');
  });

  // Round-1 review Finding 5 / orchestrator note: a fifth workflow can land
  // in the same batch (calibrate-voice-bound.yml, on
  // lane/voice-bound-ci-derivation, not yet on main) with no concurrency
  // group and nothing here would notice, because this file's workflow list
  // used to be the two hardcoded files above. Deriving the list from the
  // directory means a new workflow file fails this check by default unless
  // it either declares a group or is added to the allowlist below with a
  // reason a reviewer sees in the diff.
  it('every .github/workflows/*.yml file has a top-level (or, if allowlisted, job-level) concurrency group', () => {
    const workflowsDir = path.join(root, '.github/workflows');
    const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml'));
    assert.ok(files.length > 0, '.github/workflows must contain at least one workflow file');

    const ALLOWED_NO_TOP_LEVEL_GROUP: Record<string, string> = {
      'release.yml':
        'tag/dispatch-triggered Docker publish to a shared registry tag — cancelling `publish` mid-push '
        + 'could leave a half-built or missing image, worse than a rare duplicate run (documented in the '
        + 'file itself, next to its `on:` block)',
      'edge.yml':
        "already has a JOB-level group (publish-edge: concurrency: {group: edge-image, cancel-in-progress: "
        + "true}) — correct for its shape, since it always builds main's tip and a superseded edge build is "
        + 'safe to replace; verified separately below rather than assumed',
    };

    const missing: string[] = [];
    for (const file of files) {
      if (file in ALLOWED_NO_TOP_LEVEL_GROUP) continue;
      const src = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
      if (!topLevelConcurrencyBlock(src)) missing.push(file);
    }
    assert.deepEqual(
      missing,
      [],
      `workflow file(s) with no top-level concurrency group and not on the allowlist: ${missing.join(', ')}. `
      + 'Either add a group (see ci.yml/security.yml for the shape) or add the file to '
      + 'ALLOWED_NO_TOP_LEVEL_GROUP above with the reason — a new workflow silently missing this is the exact '
      + 'gap a review found calibrate-voice-bound.yml sitting in.',
    );
  });

  it("edge.yml's allowlisted job-level concurrency group still exists (the allowlist reason above must stay true)", () => {
    const edgePath = path.join(root, '.github/workflows/edge.yml');
    const edgeSrc = fs.readFileSync(edgePath, 'utf8');
    assert.match(
      edgeSrc,
      /concurrency:\s*\n\s+group:\s*edge-image\s*\n\s+cancel-in-progress:\s*true/,
      "edge.yml must keep its job-level `{group: edge-image, cancel-in-progress: true}` — if this ever "
      + 'changes, the workflow-list allowlist above is citing a reason that is no longer true',
    );
  });

  it("edge.yml filters its workflow_run trigger to `branches: [main]` (the 467-skipped-runs defect)", () => {
    // WHY: `workflow_run` fires on EVERY completion of CI on EVERY branch, so
    // before this filter existed every lane-branch push manufactured a whole
    // Edge Image run that existed only to evaluate the job-level `if:` to
    // false and skip. Of edge.yml's first 471 runs, 467 concluded `skipped`
    // for exactly that reason (1 startup_failure, 3 real attempts, 0
    // successes). The job-level concurrency group cannot help — a skipped run
    // never contends for it, because it skips before it starts.
    //
    // Comment lines are stripped first. edge.yml's own explanation contains
    // the string `branches: [main]` twice in prose ("WHY THE TRIGGER FILTERS
    // ON `branches: [main]`" and "The `on:` block's `branches: [main]`
    // filter"), so a raw match on the file would keep passing after the live
    // line was deleted — the same shadowing failure this file's
    // cancel-in-progress case exists to catch.
    const edgeSrc = fs.readFileSync(path.join(root, '.github/workflows/edge.yml'), 'utf8');

    assert.ok(
      yamlBlock(edgeSrc, ['on', 'workflow_run']) !== null,
      'edge.yml must still trigger on workflow_run (see its own "WHY workflow_run" comment)',
    );
    // ROUND-2 REVIEW ITEM 4: this is asserted at the EXACT path
    // `on.workflow_run.branches`, not anywhere inside `on:`. The round-1
    // version captured the whole `on:` block and matched the string in it, so
    // moving the filter to a sibling `on.push` trigger — an ordinary edit,
    // and one that restores the defect completely, since a `workflow_run`
    // trigger with no `branches:` fires for every branch again — left the
    // guard at 49 pass / 0 fail. Measured before the fix; see the round-2
    // closure section of docs/audits/2026-09-18-edge-image/review.md.
    const workflowRunBranches = yamlScalar(edgeSrc, ['on', 'workflow_run', 'branches']);
    assert.equal(
      workflowRunBranches,
      '[main]',
      'edge.yml\'s workflow_run trigger must keep `branches: [main]` AT `on.workflow_run.branches`. '
      + 'Without it, every lane branch\'s CI completion creates an Edge Image run that immediately '
      + 'skips — 467 of the first 471 runs. A `branches:` on any OTHER trigger does not count. '
      + 'Note this filter matches the UPSTREAM run\'s branch, not this workflow file\'s ref.',
    );
  });

  it('edge.yml\'s `branches: [main]` cannot be satisfied by a sibling trigger (round-2 review item 4)', () => {
    // The defeating mutation, pinned as a fixture so it can never come back.
    const defeated = [
      'on:',
      '  workflow_run:',
      '    workflows: ["CI"]',
      '    types: [completed]',
      '  push:',
      '    branches: [main]',
      'jobs: {}',
    ].join('\n');
    assert.equal(
      yamlScalar(defeated, ['on', 'workflow_run', 'branches']),
      null,
      'a `branches:` under a sibling `push:` trigger must NOT read as the workflow_run filter',
    );
    // ...and the real shape still does.
    const correct = [
      'on:',
      '  workflow_run:',
      '    workflows: ["CI"]',
      '    types: [completed]',
      '    branches: [main]',
      'jobs: {}',
    ].join('\n');
    assert.equal(yamlScalar(correct, ['on', 'workflow_run', 'branches']), '[main]');
    // A commented-out filter must not satisfy it either.
    assert.equal(
      yamlScalar(correct.replace('    branches: [main]', '    # branches: [main]'), [
        'on',
        'workflow_run',
        'branches',
      ]),
      null,
      'a commented-out `branches: [main]` must not read as live',
    );
  });

  it("edge.yml keeps all three job-level `if:` conditions as belt and braces (the trigger filter does not cover two of them)", () => {
    // The `branches: [main]` filter above covers the BRANCH only. workflow_run
    // still fires for a FAILED CI run on main, and for a pull_request-event CI
    // run whose own HEAD branch is named `main` (the ordinary shape of a fork
    // contribution) — neither may publish :edge. So `conclusion == 'success'`
    // and `event == 'push'` are load-bearing, not redundant, and must not be
    // deleted as "handled by the trigger now". head_branch is deliberately
    // redundant and is kept as the third brace.
    //
    // ROUND-2 REVIEW ITEM 5: the conditions are read from the JOB's own `if:`
    // at `jobs.publish-edge.if`, not substring-searched over the file, which
    // is what this test's own name has always claimed. The round-1 version
    // searched the whole comment-stripped source, so deleting the job-level
    // `if:` and demoting the identical three conditions to a step-level `if:`
    // on "Build and push :edge" left the guard at 49 pass / 0 fail. That is
    // not cosmetic and it is the security-relevant one of the two: with no
    // job-level `if:`, every completed CI run on main — including a RED one —
    // creates a real Edge run that checks out the commit, logs in to GHCR and
    // sets up Buildx while holding `packages: write`, and only the last step
    // declines. The job-level guard is what stops a registry-write token ever
    // being handed to a run that should never have started.
    const edgeSrc = fs.readFileSync(path.join(root, '.github/workflows/edge.yml'), 'utf8');
    const jobIf = yamlScalar(edgeSrc, ['jobs', 'publish-edge', 'if']);
    assert.ok(
      jobIf !== null,
      'edge.yml\'s `publish-edge` job must keep a JOB-LEVEL `if:`. A step-level `if:` does not count: '
      + 'the run is still created and still holds `packages: write` before the step is reached.',
    );

    for (const [condition, why] of [
      ["github.event.workflow_run.conclusion == 'success'", 'a RED CI run on main must not publish an image'],
      ["github.event.workflow_run.head_branch == 'main'", 'the redundant brace under the trigger filter'],
      ["github.event.workflow_run.event == 'push'", 'a pull_request-event run whose HEAD branch is named `main` (a fork) must not reach a `packages: write` job'],
    ] as const) {
      assert.ok(
        jobIf!.includes(condition),
        `edge.yml must keep \`${condition}\` in its publish-edge JOB-LEVEL \`if:\` — ${why}`,
      );
    }
  });

  it('edge.yml\'s three conditions cannot be satisfied from a step-level `if:` (round-2 review item 5)', () => {
    // The defeating mutation, pinned as a fixture.
    const conditions = [
      "      github.event.workflow_run.conclusion == 'success' &&",
      "      github.event.workflow_run.head_branch == 'main' &&",
      "      github.event.workflow_run.event == 'push'",
    ];
    const demoted = [
      'jobs:',
      '  publish-edge:',
      '    runs-on: ubuntu-latest',
      '    permissions:',
      '      contents: read',
      '      packages: write',
      '    steps:',
      '      - name: Build and push :edge',
      '        if: >-',
      ...conditions.map((l) => `    ${l}`),
      '        uses: docker/build-push-action@v5',
    ].join('\n');
    assert.equal(
      yamlScalar(demoted, ['jobs', 'publish-edge', 'if']),
      null,
      'a step-level `if:` must NOT read as the job-level one — the run is created either way',
    );

    const correct = [
      'jobs:',
      '  publish-edge:',
      '    if: >-',
      ...conditions,
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - name: Build and push :edge',
      '        uses: docker/build-push-action@v5',
    ].join('\n');
    const jobIf = yamlScalar(correct, ['jobs', 'publish-edge', 'if']);
    assert.ok(jobIf !== null);
    for (const condition of [
      "github.event.workflow_run.conclusion == 'success'",
      "github.event.workflow_run.head_branch == 'main'",
      "github.event.workflow_run.event == 'push'",
    ]) {
      assert.ok(jobIf!.includes(condition), `folded block scalar must yield ${condition}`);
    }

    // A commented-out job-level `if:` must not read as live either.
    assert.equal(
      yamlScalar(
        correct.replace('    if: >-', '    # if: >-'),
        ['jobs', 'publish-edge', 'if'],
      ),
      null,
      'a commented-out job-level `if:` must not read as live',
    );
  });

  it('a duplicate key on the path cannot shadow the real one (round-3 review item R2-3)', () => {
    // YAML resolves a repeated mapping key to the LAST occurrence. An
    // indentation walk that takes the FIRST therefore reads a workflow that
    // does not exist. Each of these three was 51/51 GREEN in round 2, and each
    // effective config below was confirmed with a real YAML implementation.
    // This is the hazard `topLevelConcurrencyKeyCount` at :79-85 already
    // guards for `concurrency:`, generalised to every key on a path.

    // (a) A second top-level `on:` with no `branches:` — the effective
    //     workflow_run trigger becomes {workflows, types}, restoring the
    //     467-skipped-runs defect.
    const duplicateOn = [
      'on:',
      '  workflow_run:',
      '    workflows: ["CI"]',
      '    types: [completed]',
      '    branches: [main]',
      'on:',
      '  workflow_run:',
      '    workflows: ["CI"]',
      '    types: [completed]',
      'jobs: {}',
    ].join('\n');
    assert.equal(
      yamlScalar(duplicateOn, ['on', 'workflow_run', 'branches']),
      null,
      'a second `on:` key must not let the FIRST one satisfy the branches filter',
    );

    // (b) A second job-level `if: always()` — the effective `if:` is
    //     `always()`, so every workflow_run completion publishes while
    //     holding `packages: write`. Round-1 item 5, restored by adding a key
    //     instead of moving one.
    const duplicateIf = [
      'jobs:',
      '  publish-edge:',
      '    if: >-',
      "      github.event.workflow_run.conclusion == 'success' &&",
      "      github.event.workflow_run.head_branch == 'main' &&",
      "      github.event.workflow_run.event == 'push'",
      '    if: always()',
      '    runs-on: ubuntu-latest',
    ].join('\n');
    assert.equal(
      yamlScalar(duplicateIf, ['jobs', 'publish-edge', 'if']),
      null,
      'a second job-level `if:` must not let the FIRST one satisfy the conditions',
    );

    // (c) A second `publish-edge:` job key with no `if:` at all.
    const duplicateJob = [
      'jobs:',
      '  publish-edge:',
      '    if: >-',
      "      github.event.workflow_run.conclusion == 'success'",
      '    runs-on: ubuntu-latest',
      '  publish-edge:',
      '    runs-on: ubuntu-latest',
      '    permissions:',
      '      packages: write',
    ].join('\n');
    assert.equal(
      yamlScalar(duplicateJob, ['jobs', 'publish-edge', 'if']),
      null,
      'a second `publish-edge:` job key must not let the FIRST one satisfy the conditions',
    );
    assert.equal(
      yamlBlock(duplicateJob, ['jobs', 'publish-edge']),
      null,
      'yamlBlock must fail closed on the duplicate job key too, not only yamlScalar',
    );

    // The negative direction: the unique, correct shapes still resolve, so
    // the unique-key rule cannot be over-applied into a guard that never
    // reads anything. A key repeated at a DIFFERENT level is not a duplicate.
    const nested = [
      'on:',
      '  workflow_run:',
      '    branches: [main]',
      'jobs:',
      '  publish-edge:',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '        with:',
      '          branches: [something-else]',
    ].join('\n');
    assert.equal(yamlScalar(nested, ['on', 'workflow_run', 'branches']), '[main]');
  });

  it('release.yml documents, in-file, why it has no concurrency group', () => {
    assert.match(
      release,
      /DELIBERATELY NO `concurrency:` group/,
      'release.yml must keep an explicit comment explaining the omission — a silent gap here looks identical '
      + 'to an oversight, which is the thing the workflow-list allowlist test above exists to catch on a '
      + 'FUTURE file',
    );
  });

  // 2026-09-13 (ci-concurrency round 2, item 7): the GitHub job-log API
  // returns only the LAST ~100 KB of a job's log. `npm test`'s TAP stream is
  // ~13,800 tests over ~7 minutes — far bigger than that — so a red run's
  // own `not ok` lines can scroll out of the readable tail (found reading
  // run 34741928418: "# fail 2" with no way to name them from the API).
  // These three checks pin the fix in both workflows that run `npm test`.
  for (const [file, src] of [['ci.yml', ci], ['release.yml', release]] as const) {
    it(`${file}'s "Run tests" step preserves its exit code through the tee (pipefail)`, () => {
      const block = stepBlock(src, 'Run tests (keyless — analysis-only posture)');
      assert.ok(block, `${file} must keep the "Run tests" step`);
      assert.match(
        block!,
        /set -o pipefail/,
        `${file}'s "Run tests" step must \`set -o pipefail\` before piping \`npm test\` into \`tee\` — `
        + 'without it, a failing test run reports the exit code of `tee` (0), silently turning a red run green',
      );
      assert.match(
        block!,
        /tee\s+test-output\.tap/,
        `${file}'s "Run tests" step must tee its output to test-output.tap for the summary/upload steps to read`,
      );
    });

    it(`${file} prints a test-failure summary that runs even when "Run tests" failed`, () => {
      const block = stepBlock(src, 'Print test failure summary');
      assert.ok(
        block,
        `${file} must keep a step named "Print test failure summary" — otherwise a red "Run tests" step's `
        + 'own failures are unreadable once the job log truncates',
      );
      assert.match(
        block!,
        /if:\s*always\(\)/,
        `${file}'s "Print test failure summary" step must run \`if: always()\` — a step with no \`if:\` is `
        + 'skipped once an earlier step in the job fails, which is exactly when this summary is needed',
      );
      assert.match(
        block!,
        /tap-failures\.mjs/,
        `${file}'s "Print test failure summary" step must invoke scripts/tap-failures.mjs`,
      );
    });

    it(`${file} uploads the full TAP output as a retrievable workflow artifact`, () => {
      const block = stepBlock(src, 'Upload full test output (TAP)');
      assert.ok(block, `${file} must keep a step named "Upload full test output (TAP)"`);
      assert.match(
        block!,
        /if:\s*always\(\)/,
        `${file}'s TAP-upload step must run \`if: always()\` — a red run is exactly when the full output is needed`,
      );
      assert.match(
        block!,
        /actions\/upload-artifact@v4/,
        `${file}'s TAP-upload step must use actions/upload-artifact@v4`,
      );
      assert.match(
        block!,
        /retention-days:\s*7/,
        `${file}'s TAP-upload step must set retention-days: 7`,
      );
    });
  }

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
    const needs = /^\s*needs\s*:\s*(.+?)\s*$/m.exec(publishJob![1]);
    assert.ok(needs, "release.yml's publish job must declare `needs:`");
    const needed = needs![1].replace(/[[\]]/g, '').split(',').map((n) => n.trim()).filter(Boolean);
    assert.ok(
      needed.includes('test'),
      "release.yml's publish job must need the `test` job — without it, a failing test job cannot block image publication",
    );
    // Added 2026-09-02 with the browser battery. A release that publishes
    // while the live-surface certifications are red (or were never run) is
    // exactly the failure this whole file exists to prevent, one job over.
    assert.ok(
      needed.includes('browser'),
      "release.yml's publish job must need the `browser` job — a release must not ship with rotted browser proofs",
    );
  });

  it('both workflows run the browser battery, with a real browser install (2026-09-02)', () => {
    // The six live-Chromium suites ran on exactly ONE machine before this.
    // Three of their headers asserted they "must not be wired into CI"; that
    // was a self-imposed limitation, and while it held, the SSE migration
    // silently broke two of them and an ARIA change broke a third. The gate is
    // only real if BOTH steps stay: installing the browser, and running the
    // suites. Either one alone is decoration.
    for (const [label, source] of [['ci.yml', ci], ['release.yml', release]] as const) {
      const install = stepBlock(source, 'Install Playwright Chromium');
      assert.ok(install, `${label} must keep a step named "Install Playwright Chromium"`);
      assert.match(
        install!,
        /playwright install .*chromium/,
        `${label}'s browser-install step must actually install Chromium`,
      );
      const run = stepBlock(source, 'Browser verification battery');
      assert.ok(run, `${label} must keep a step named "Browser verification battery"`);
      assert.match(
        run!,
        /npm run verify:browser\b/,
        `${label}'s browser battery step must invoke npm run verify:browser`,
      );
    }
  });

  it('verify:browser really runs all eight browser suites (a shortened battery is a quiet bypass)', () => {
    // `npm run verify:browser` is what CI executes. Shortening that one line
    // in package.json would silently stop gating suites while every workflow
    // check above stayed green — the same shape as a hardcoded gate list
    // someone quietly trims.
    //
    // It said SIX and pinned six until 2026-09-13, by which time the battery
    // had grown to eight: `verify:a11y` (2026-09-04) and `verify:production`
    // were unpinned, so either could have been dropped from `verify:browser`
    // with this gate green — precisely the bypass it exists to prevent. Found
    // by the vite-cache-isolation review, which noticed the lane's
    // `grep "seven suites" --include=*.md` could not see a `.ts` file saying
    // "six". ARCHITECTURE.md §9 is the narrative copy of this list.
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const battery = pkg.scripts['verify:browser'];
    assert.ok(battery, 'package.json must keep a verify:browser script');
    const pinned = [
      'verify:p0-flow',
      'verify:focus-traps',
      'verify:surfaces',
      'verify:ui-polish',
      'verify:local-safety-net',
      'verify:command-palette',
      'verify:a11y',
      'verify:production',
    ];
    // The count is asserted as well as the membership: a ninth suite added to
    // the battery without being pinned here reopens the same hole.
    assert.equal(
      battery.split(/\s+/).filter(token => token.startsWith('verify:')).length,
      pinned.length,
      `verify:browser composes a different number of suites than this test pins (${battery})`,
    );
    for (const suite of pinned) {
      assert.ok(
        battery.includes(suite),
        `verify:browser must run ${suite} — CI runs this one script, so a suite missing from it runs nowhere`,
      );
      assert.ok(pkg.scripts[suite], `package.json must keep the ${suite} script`);
    }
    // Pinned exactly: the browser build Playwright downloads must match the
    // client driving it, and a floating range silently changes that pairing.
    assert.match(
      pkg.devDependencies.playwright ?? '',
      /^\d+\.\d+\.\d+$/,
      'playwright must be an exact pinned devDependency — the suites are useless if CI cannot install a browser',
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

// ───────────────────────────────────────────────────────────────────────────
// ADDED IN ROUND 2 of lane/ci-docs-fast-path (review item 10). Everything
// above this line is byte-identical to `origin/main`; nothing above was
// relaxed to make anything below pass.
//
// THE BLIND SPOT THIS CLOSES. Before the docs-only fast path, no ci.yml gate
// step carried an `if:` at all. Seven of them now do. The assertions above
// can see a gate that is `continue-on-error`, a gate whose `if:` contains a
// literal `false`, and a gate that vanished from release.yml — but not a gate
// whose `if:` is merely WRONG. Changing `ci.yml`'s
//
//     if: needs.classify.outputs.docs_only != 'true'
//
// to `== 'false'` skips the type check on EVERY run, because an unset or
// absent output is the empty string and `'' == 'false'` is false in a GitHub
// expression. Verified against this file before these tests existed: all 47
// assertions stayed green under exactly that one-character-class mutation.
//
// So the polarity is pinned, and so is the exact SET of steps allowed to
// carry a condition at all. A new `if:` on a gate that is supposed to run
// unconditionally — honesty-audit, check-brain, the unverified-gates report —
// fails here rather than quietly halving what CI proves.
describe('CI gate integrity — the docs-only fast path may not mis-gate a step', () => {
  const ci = fs.readFileSync(ciYml, 'utf8');
  const release = fs.readFileSync(releaseYml, 'utf8');

  /** The exact `if:` expression a step carries, or null when it carries none. */
  function stepIf(source: string, stepName: string): string | null {
    const block = stepBlock(source, stepName);
    if (!block) return null;
    const m = /^\s*if:\s*(.+?)\s*$/m.exec(block);
    return m ? m[1] : null;
  }

  const SKIP_ON_DOCS_ONLY = "needs.classify.outputs.docs_only != 'true'";
  const ONLY_ON_DOCS_ONLY = "needs.classify.outputs.docs_only == 'true'";

  /**
   * Every ci.yml step that is allowed to carry an `if:`, and the EXACT
   * expression it must carry. A step absent from this map must carry no `if:`
   * at all. Adding a row is the deliberate, reviewable act of putting one
   * more check behind a condition.
   */
  const ALLOWED_CONDITIONS: Record<string, string> = {
    // The seven hard gates the fast path skips, because a docs/**-or-**/*.md
    // change provably cannot affect them. See ci.yml's per-step comments.
    'Type check': SKIP_ON_DOCS_ONLY,
    'Enforce no console.* under server/': SKIP_ON_DOCS_ONLY,
    'Server dead-code tripwire (reachability from server.ts)': SKIP_ON_DOCS_ONLY,
    'Run tests (keyless — analysis-only posture)': SKIP_ON_DOCS_ONLY,
    'Scoring-path change requires a measurement receipt': SKIP_ON_DOCS_ONLY,
    'Metamorphic scoring gate': SKIP_ON_DOCS_ONLY,
    'Build': SKIP_ON_DOCS_ONLY,
    // The one step that runs ONLY on the fast path — the opposite polarity,
    // pinned just as hard. Flipping it to `!=` would run the narrow docs set
    // on every full run and NOTHING on a docs-only push.
    'Run docs-gating tests (docs-only fast path)': ONLY_ON_DOCS_ONLY,
    // Pre-existing `always()` steps, unrelated to the fast path. They are
    // listed so that this map is the complete account of conditions in the
    // file rather than a partial one.
    'Print test failure summary': 'always()',
    'Upload full test output (TAP)': 'always()',
    'Report unverified gates': 'always()',
  };

  it('every conditional ci.yml step carries EXACTLY its intended condition', () => {
    const wrong: string[] = [];
    for (const [name, expected] of Object.entries(ALLOWED_CONDITIONS)) {
      const actual = stepIf(ci, name);
      if (actual !== expected) wrong.push(`"${name}": expected \`${expected}\`, found \`${actual ?? '(no if:)'}\``);
    }
    assert.deepEqual(
      wrong,
      [],
      'A gate\'s `if:` is part of the gate. `!= \'true\'` and `== \'false\'` look interchangeable and are not: '
      + 'an unset output is the empty string, so `== \'false\'` is FALSE on every run and the step never runs. '
      + 'If a condition genuinely needs to change, change this map in the same diff.',
    );
  });

  it('no other ci.yml step has quietly become conditional', () => {
    const unexpected = stepNames(ci)
      .filter((name) => !(name in ALLOWED_CONDITIONS))
      .filter((name) => stepIf(ci, name) !== null);
    assert.deepEqual(
      unexpected,
      [],
      'these ci.yml steps carry an `if:` without being in this test\'s ALLOWED_CONDITIONS map. The docs-only '
      + 'fast path is the only reason any gate in this file is conditional; a new condition on honesty-audit, '
      + 'check-brain, check-docs or anything else is a gate that stops running, and it must be a decision in a '
      + 'diff rather than a line nobody reviewed.',
    );
  });

  it("the whole `browser` job is gated on exactly the skip-on-docs-only expression", () => {
    // A job-level `if:`, not a step-level one — stepBlock() cannot see it.
    // The eight-suite battery is the single largest thing the fast path skips
    // (~5 minutes including the Chromium download), so its polarity matters
    // most: `== 'false'` here would skip the entire browser battery on every
    // push, forever, with every other assertion in this file green.
    const m = /^ {2}browser:\n(?: {4}.*\n|\n)*?/m.exec(ci);
    assert.ok(m, 'ci.yml must keep a `browser:` job');
    const jobBlock = ci.slice(ci.indexOf('\n  browser:\n'));
    const header = jobBlock.slice(0, jobBlock.indexOf('\n    steps:'));
    const ifLine = /^ {4}if:\s*(.+?)\s*$/m.exec(header);
    assert.ok(ifLine, 'the browser job must keep its job-level `if:`');
    assert.equal(
      ifLine[1],
      SKIP_ON_DOCS_ONLY,
      'the browser job must skip on a docs-only push and run on every other push. Any other expression here '
      + 'either runs the battery when it cannot matter or — far worse — skips it when it does.',
    );
  });

  it('the classify job grants itself exactly `contents: read` + `actions: read`', () => {
    // The job needs `actions: read` to ask which run of this workflow on this
    // ref last completed successfully (scripts/lib/validated-base.mjs). That
    // is the ONLY reason ci.yml departs from the workflow-level
    // `contents: read`, and a widened grant here would hand a token with more
    // rights to a job that runs `npm`-free but still runs code from the
    // checkout.
    const classify = ci.slice(ci.indexOf('\n  classify:\n'));
    const header = classify.slice(0, classify.indexOf('\n    steps:'));
    const permsIdx = header.indexOf('\n    permissions:');
    assert.notEqual(permsIdx, -1, 'the classify job must declare its own `permissions:` block');
    const perms: string[] = [];
    for (const line of header.slice(permsIdx + 1).split('\n').slice(1)) {
      if (line.trim() === '' || line.trim().startsWith('#')) continue;
      // A sibling key at job level (`outputs:`, `steps:`, `runs-on:`) ends the
      // block — without this the `outputs:` mapping below it reads as a grant.
      if (line.search(/\S/) <= 4) break;
      perms.push(line.trim());
    }
    assert.deepEqual(
      perms,
      ['contents: read', 'actions: read'],
      'the classify job must grant read-only checkout access plus read-only Actions metadata, and nothing else',
    );
  });

  it('release.yml never wires `classify` into anything (its copy stays inert)', () => {
    // release.yml carries a mirrored `classify` job only because this file's
    // step-for-step mirror rule requires every ci.yml step to have a
    // counterpart. Its output is deliberately unused: `publish` needs
    // `[test, browser]`, and a job skipped because a `needs` dependency FAILED
    // leaves the run at `failure` — so wiring `needs: classify` into
    // release.yml's `test` job would let a broken classifier turn a tag push
    // into a release that never publishes. The review asked for this to be
    // mechanical rather than a comment; here it is.
    const live = release
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n');
    assert.doesNotMatch(
      live,
      /needs\.classify/,
      'release.yml must not reference `needs.classify`. A release runs every gate unconditionally; putting '
      + 'the classifier on that path trades a guaranteed release for ~30 seconds.',
    );
    assert.doesNotMatch(
      live,
      /^ {4}needs:\s*(\[[^\]]*\bclassify\b[^\]]*\]|classify\b)/m,
      'no release.yml job may declare `needs: classify` — see above',
    );
  });

  it('release.yml runs the docs-gating step unconditionally (no `if:` at all)', () => {
    assert.equal(
      stepIf(release, 'Run docs-gating tests (docs-only fast path)'),
      null,
      'release.yml\'s mirrored docs-gating step must stay unconditional. It re-runs files `npm test` already '
      + 'ran, which costs 25-45 s on a milestone event and buys the guarantee that a release depends on no '
      + 'classifier at all.',
    );
    assert.equal(
      stepIf(release, 'Classify changed files (docs-only fast path)'),
      null,
      'release.yml\'s mirrored classify step must stay unconditional too — it is inert, not gated',
    );
  });
});
