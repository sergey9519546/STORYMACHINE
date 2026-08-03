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
    // These three are the hard gates. `Check documentation quality` is
    // deliberately non-blocking and is intentionally NOT listed here.
    for (const name of ['Type check', 'Enforce no console.* under server/', 'Honesty string audit']) {
      const block = stepBlock(ci, name);
      assert.ok(block, `ci.yml must keep a step named "${name}"`);
      assert.doesNotMatch(
        block,
        /continue-on-error\s*:\s*true/,
        `"${name}" is a hard gate and must not be continue-on-error`,
      );
    }
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
});
