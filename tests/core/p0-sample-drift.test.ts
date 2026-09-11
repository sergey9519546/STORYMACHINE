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

/** Blank the two wall-clock renderings and nothing else.
 *
 *  Both forms come from coverage-html.ts's formatDate/formatDateTime over
 *  report.analyzedAt: "September 11, 2026" in the header's meta line and
 *  "September 11, 2026 at 02:17:32 AM UTC" in the footer. The datetime pattern is
 *  replaced FIRST so the date pattern cannot eat half of it. */
function maskClock(html: string): string {
  return html
    .replace(/[A-Z][a-z]+ \d{1,2}, \d{4} at \d{2}:\d{2}:\d{2} [AP]M [A-Z]+/g, '<TIMESTAMP>')
    .replace(/[A-Z][a-z]+ \d{1,2}, \d{4}/g, '<DATE>');
}

describe('the committed P0 sample report matches the generator', () => {
  it('is byte-identical to a fresh render, apart from the wall clock', async () => {
    const { html } = await renderP0SampleReport();
    const committed = readFileSync(OUT_FILE, 'utf8');

    const fresh = maskClock(html);
    const onDisk = maskClock(committed);
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

  it('the mask covers the clock and nothing else — the guard can still fail', () => {
    // A guard that masked too much would pass on a genuinely stale sample. Two
    // directions: a clock change is invisible, and a CONTENT change is not.
    const base = 'Generated September 11, 2026 at 02:17:32 AM UTC\nhealth 78.3\n';
    const laterClock = 'Generated December 25, 2027 at 11:59:59 PM UTC\nhealth 78.3\n';
    const changedContent = 'Generated September 11, 2026 at 02:17:32 AM UTC\nhealth 91.2\n';
    assert.equal(maskClock(base), maskClock(laterClock), 'the clock must be masked');
    assert.notEqual(maskClock(base), maskClock(changedContent), 'a real change must NOT be masked');
  });

  it('the committed sample carries the surfaces this lane added — proof it was regenerated', async () => {
    const committed = readFileSync(OUT_FILE, 'utf8');
    assert.ok(committed.includes('class="reader-tier"'), 'the producer tier');
    assert.ok(committed.includes('Checks That Found Nothing'), 'the retitled checks section');
    assert.ok(committed.includes('Reference bounds: 20 samples'), 'the confidence line');
    assert.ok(!committed.includes('What&rsquo;s Working'), 'the old praise framing must be gone');
    assert.ok(!committed.includes('class="stamp-wrap"'), 'the retired header stamp wrapper must be gone');
  });
});
