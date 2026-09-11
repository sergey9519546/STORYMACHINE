// The committed P0 sample report must be what the generator produces TODAY.
//
// ── Why this guard exists (2026-09-11, round-2 follow-up) ───────────────────
//
// docs/user-validation/sample-coverage-report.html is the artifact P0 shows real
// screenwriters (ROADMAP §3), and scripts/generate-p0-sample-report.ts's header
// claims it is "byte-identical to what a real export would produce". Nothing
// checked that. The file was generated once and then sat there while the renderer
// moved underneath it — by the time this lane started, it predated the root-cause
// scene-span fix, the producer tier, the retitled checks section and the
// comparability gate, so the one artifact shown to users was the one artifact
// nobody was regenerating.
//
// This test closes that: it calls the generator's OWN renderP0SampleReport — not a
// second copy of the pipeline, which would only prove two assemblies agree — and
// compares the result against the committed bytes.
//
// ── What is masked, and why only that ───────────────────────────────────────
//
// `analyzedAt` is a wall clock the doctor refreshes on every call, so the report's
// two rendered timestamps (the header's date and the footer's "Generated
// <datetime>") differ between any two runs by construction. They are masked, and
// nothing else is. That is the same single exclusion
// scripts/check-doctor-output-identity.mjs makes for the same field.
//
// MEASURED 2026-09-11: a real keyless POST /api/export/coverage of the same sample
// returned 226,783 bytes and differed from the generator's output on exactly one
// line — the footer timestamp. So "byte-identical to a real export, modulo the
// clock" is now a checked claim rather than a comment.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderP0SampleReport, OUT_FILE } from '../../scripts/generate-p0-sample-report.ts';
import { referenceBoundsLine } from '../../src/lib/percentile-copy.ts';

/** Blank the three values that CANNOT be stable between two runs, and nothing
 *  else.
 *
 *  1-2. THE CLOCK. Both forms come from coverage-html.ts's
 *  formatDate/formatDateTime over report.analyzedAt: "September 11, 2026" in the
 *  header's meta line and "September 11, 2026 at 02:17:32 AM UTC" in the footer.
 *  The datetime pattern is replaced FIRST so the date pattern cannot eat half of
 *  it.
 *
 *  3. THE ENGINE COMMIT, IN BOTH OF ITS FORMS. The verify block publishes
 *  `report.provenance.engineCommit`, which server/lib/build-info.ts resolves from
 *  `git rev-parse HEAD` when GIT_SHA is unset. It is therefore a different 40-hex
 *  string at every commit, including every commit that does not touch the
 *  renderer — so an unmasked guard would fail on its own next commit and the only
 *  way to keep it green would be regenerating the artifact on every push, which
 *  is how a guard becomes a ritual instead of a check. (Found exactly this way: the
 *  guard's first full-suite run failed on its own lane's later commits.)
 *
 *  Masking it is not a loophole. The engine commit is PROVENANCE — it records
 *  which commit produced the committed bytes, which is a true and useful fact that
 *  a later render legitimately disagrees with. The check here is about the
 *  RENDERER's output, and scripts/check-doctor-output-identity.mjs handles the
 *  identical problem the same way by pinning GIT_SHA across both of its runs.
 *
 *  ROUND 2 (2026-09-11): `'dev'` is masked as well as the 40-hex form.
 *  server/lib/build-info.ts resolves engineCommit to the literal string `'dev'`
 *  when GIT_SHA is unset AND there is no `.git` to ask — which is exactly the tree
 *  a reviewer works in, because `git archive <sha> | tar -x` is the workflow this
 *  repository's own output-identity harness prescribes. A 40-hex-only mask left
 *  this suite failing 1 of 3 there with `generator: dev / committed:
 *  <ENGINE_COMMIT>`: a trap that fires only for the reviewer, which is the worst
 *  population to fail for. Matched narrowly, as a whole word inside the verify
 *  block's own `<code>` element, so the word "dev" in ordinary prose is untouched. */
function maskVolatile(html: string): string {
  return html
    .replace(/[A-Z][a-z]+ \d{1,2}, \d{4} at \d{2}:\d{2}:\d{2} [AP]M [A-Z]+/g, '<TIMESTAMP>')
    .replace(/[A-Z][a-z]+ \d{1,2}, \d{4}/g, '<DATE>')
    .replace(/\b[0-9a-f]{40}\b/g, '<ENGINE_COMMIT>')
    .replace(/<code>dev<\/code>/g, '<code><ENGINE_COMMIT></code>');
}

describe('the committed P0 sample report matches the generator', () => {
  it('is byte-identical to a fresh render, apart from the wall clock', async () => {
    const { html } = await renderP0SampleReport();
    const committed = readFileSync(OUT_FILE, 'utf8');

    const fresh = maskVolatile(html);
    const onDisk = maskVolatile(committed);
    if (fresh !== onDisk) {
      // Point at the first difference: a 226 KB assert.equal diff is unreadable.
      const a = fresh.split('\n');
      const b = onDisk.split('\n');
      let at = -1;
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) { at = i; break; }
      }
      assert.fail(
        'docs/user-validation/sample-coverage-report.html is stale — the renderer has moved '
        + `since it was generated. First difference at line ${at + 1}:\n`
        + `  generator: ${(a[at] ?? '(end of file)').slice(0, 200)}\n`
        + `  committed: ${(b[at] ?? '(end of file)').slice(0, 200)}\n`
        + 'Run `npm run generate-p0-sample`, read the diff, and commit it.',
      );
    }
    assert.equal(fresh, onDisk);
  });

  it('the mask covers the clock and the engine commit — and nothing else, so the guard can still fail', () => {
    // A guard that masked too much would pass on a genuinely stale sample. Three
    // directions: a clock change is invisible, an engine-commit change is
    // invisible, and a CONTENT change is not.
    const base = 'Generated September 11, 2026 at 02:17:32 AM UTC\nhealth 78.3\ncommit af26e356d9caae03e29b99f567c70da7d100ef72\n';
    const laterClock = 'Generated December 25, 2027 at 11:59:59 PM UTC\nhealth 78.3\ncommit af26e356d9caae03e29b99f567c70da7d100ef72\n';
    const laterCommit = 'Generated September 11, 2026 at 02:17:32 AM UTC\nhealth 78.3\ncommit 5ae09a78d0b437eb46ced1797ef42cff3deb4585\n';
    const changedContent = 'Generated September 11, 2026 at 02:17:32 AM UTC\nhealth 91.2\ncommit af26e356d9caae03e29b99f567c70da7d100ef72\n';
    assert.equal(maskVolatile(base), maskVolatile(laterClock), 'the clock must be masked');
    assert.equal(maskVolatile(base), maskVolatile(laterCommit), 'the engine commit must be masked');
    // And its `.git`-less form, which is what a `git archive` review tree produces.
    assert.equal(
      maskVolatile('<dt>Engine commit</dt><dd><code>dev</code></dd>'),
      maskVolatile('<dt>Engine commit</dt><dd><code>af26e356d9caae03e29b99f567c70da7d100ef72</code></dd>'),
      "'dev' and a real SHA must mask to the same thing",
    );
    assert.ok(maskVolatile('a developer wrote this').includes('developer'),
      'the word "dev" in prose must survive');
    assert.notEqual(maskVolatile(base), maskVolatile(changedContent), 'a real change must NOT be masked');
    // And the content hash — 64 hex, not 40 — must survive the commit mask.
    const forgedHash = base.replace('health 78.3', 'health 78.3\nhash ' + 'a'.repeat(64));
    assert.notEqual(maskVolatile(base), maskVolatile(forgedHash), 'a 64-hex content hash must NOT be masked');
  });

  it('the committed sample carries the surfaces this lane added — proof it was regenerated', async () => {
    const committed = readFileSync(OUT_FILE, 'utf8');
    assert.ok(committed.includes('class="reader-tier"'), 'the producer tier');
    assert.ok(committed.includes('Checks That Found Nothing'), 'the retitled checks section');
    assert.ok(!committed.includes('What&rsquo;s Working'), 'the old praise framing must be gone');
    assert.ok(!committed.includes('class="stamp-wrap"'), 'the retired header stamp wrapper must be gone');
  });

  // ROUND 2 (2026-09-11): this block used to assert the sample carried
  // `Reference bounds: 20 samples`. That labelled line is now SUPPRESSED whenever
  // the percentile sentence already carries the bounds in its own parenthetical,
  // which is the path the sample (12 scenes / 1,830 words, outside the reference
  // band) takes — so the old assertion was pinning the duplication the round-1
  // review sent back. What matters is the invariant, not which line states it.
  it('the committed sample states the reference bounds exactly once on its first page', () => {
    const committed = readFileSync(OUT_FILE, 'utf8');
    const dividerAt = committed.indexOf('<hr class="tier-divider"');
    assert.ok(dividerAt > 0, 'the tier and its divider must render');
    const firstPage = committed.slice(0, dividerAt);
    assert.equal(
      firstPage.split(referenceBoundsLine()).length - 1, 1,
      'the bounds string must appear exactly once above the divider',
    );
    assert.ok(firstPage.includes('Health percentile: not comparable'),
      'and the line that states them is the percentile reading, for a draft outside the band');
    assert.ok(!firstPage.includes('Reference bounds:'),
      'so the separate labelled line must not render beside it');
  });
});
