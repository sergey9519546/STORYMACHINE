// The compact Coverage card must carry BOTH halves of the server's answer.
//
// ── The defect (2026-09-12 adversarial audit, finding #15) ──────────────────
//
// `POST /api/scriptide/doctor` on text with no scene heading answers 200 with a
// `reason` AND a `hint` (server/routes/scriptide.ts's FORMAT_UNRECOGNIZED_REASON
// / FORMAT_UNRECOGNIZED_HINT). The full ScriptDoctorPanel renders both
// (:4866-4867). The COMPACT Coverage card — the surface a first-time visitor
// actually lands on — rendered only the reason, under the heading "Coverage
// failed", beside RETRY and USE SAMPLE. The single highest-value visitor, someone
// who pasted a draft out of Word or a PDF, was told the format was wrong and
// offered a demo instead of the one sentence that would fix it.
//
// THE FIX, three parts:
//   1. the hint renders on the compact card, from the `hint` FormatUnrecognizedError
//      already carries (src/lib/doctor-stream.ts) — nothing new had to be plumbed;
//   2. the heading stops calling it a failure, matching the full panel's own
//      "Not a screenplay" card and the route's deliberate 200;
//   3. a third affordance that is actually relevant — "Paste from PDF?" — routes
//      the draft through the EXISTING double-spaced normaliser
//      (server/nvm/analyze/screenplay-normalizer.ts) and re-submits it, with an
//      honest outcome in both directions.
//
// Source-level assertions for the React wiring (no jsdom — CLAUDE.md), plus the
// normaliser's real behaviour on a real double-spaced paste. The DRIVEN half is
// scripts/verify-p2-p3-surfaces.mjs's P2-format phase.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizeScreenplay } from '../../server/nvm/analyze/screenplay-normalizer.ts';
import { hasSceneHeading } from '../../server/routes/scriptide.ts';

const REPO = path.resolve(import.meta.dirname, '../..');
const coverageSummary = readFileSync(
  path.join(REPO, 'src/components/scriptide/CoverageSummary.tsx'),
  'utf8',
);
const scriptIde = readFileSync(path.join(REPO, 'src/components/ScriptIDE.tsx'), 'utf8');

describe('the compact card shows the hint, not just the reason', () => {
  it('captures the hint off the error the stream client already throws', () => {
    assert.match(coverageSummary, /FormatUnrecognizedError,/);
    assert.match(coverageSummary, /const \[formatHint, setFormatHint\] = useState<string \| null>\(null\);/);
    assert.match(coverageSummary, /if \(e instanceof FormatUnrecognizedError\) setFormatHint\(e\.hint\);/);
  });

  it('renders it, in the reading order, on the compact card', () => {
    assert.match(coverageSummary, /data-format-hint/);
    assert.match(coverageSummary, /\{formatHint\}/);
  });

  it('stops calling a successful "this is not a screenplay" answer a failure', () => {
    assert.match(
      coverageSummary,
      /\{formatHint \? "Not a screenplay" : "Coverage failed"\}/,
    );
  });

  it('clears the hint when a new run starts, so it cannot describe text that is gone', () => {
    const runPrefix = coverageSummary.slice(
      coverageSummary.indexOf('setStatus("loading");'),
      coverageSummary.indexOf('const controller = new AbortController();'),
    );
    assert.ok(runPrefix.length > 0, 'run() prefix not found');
    assert.match(runPrefix, /setFormatHint\(null\);/);
    assert.match(runPrefix, /setPdfRepairTried\(false\);/);
    assert.match(runPrefix, /setPdfRepairNoop\(false\);/);
  });
});

describe('"Paste from PDF?" routes through the existing normaliser', () => {
  it('imports the engine normaliser rather than reimplementing it', () => {
    assert.match(
      coverageSummary,
      /import \{ normalizeScreenplay \} from "\.\.\/\.\.\/\.\.\/server\/nvm\/analyze\/screenplay-normalizer\.ts";/,
    );
    // One implementation per concept: no second copy of a scene-heading regex
    // in this component. Whether the repair worked is the SERVER's answer to the
    // repaired bytes.
    assert.doesNotMatch(coverageSummary, /INT\|EXT\|EST/);
  });

  it('submits the repaired text through the same run(), and installs it so the editor agrees', () => {
    assert.match(coverageSummary, /const tryPdfRepair = useCallback\(\(\) => \{/);
    assert.match(coverageSummary, /onRepairDraft\?\.\(repaired\);/);
    assert.match(coverageSummary, /void run\(\{ fountain: repaired, title: title \?\? "Untitled" \}\);/);
  });

  it('does NOT reuse the sample-install handler (which would retitle the draft)', () => {
    assert.match(coverageSummary, /onRepairDraft\?: \(text: string\) => void;/);
    const repair = coverageSummary.slice(
      coverageSummary.indexOf('const tryPdfRepair = useCallback'),
      coverageSummary.indexOf('}, [fountain, title, onRepairDraft, run]);'),
    );
    assert.ok(repair.length > 0, 'tryPdfRepair not found');
    assert.doesNotMatch(repair, /onLoadSampleIntoEditor/);
    assert.match(scriptIde, /onRepairDraft=\{\(text\) => installDraft\(text\)\}/);
  });

  it('is offered only for a format refusal, and only once', () => {
    assert.match(
      coverageSummary,
      /\{formatHint && !pdfRepairTried && \(\s*\n\s*<button type="button" onClick=\{tryPdfRepair\} className="sm-btn">\s*\n\s*Paste from PDF\?/,
    );
  });

  it('says honestly what the repair found, in both directions', () => {
    assert.match(coverageSummary, /Nothing to re-space — this text is not double-spaced/);
    assert.match(coverageSummary, /Re-spaced the paste and ran it again — still no scene headings\./);
  });
});

describe('the normaliser really is the right tool for a pasted PDF', () => {
  // A double-spaced paste WITH sluglines: the normaliser's documented job, and
  // the case the audit's §C measured as already working end to end.
  const doubleSpaced = [
    'INT. KITCHEN - DAY', '', '', 'Maya stands at the counter.', '', '',
    'MAYA', '', 'You kept the tape.', '', '',
    'EXT. PORCH - NIGHT', '', '', 'Rain on the boards.', '',
  ].join('\n');

  it('is idempotent enough to leave a heading-bearing paste analysable', () => {
    const repaired = normalizeScreenplay(doubleSpaced);
    assert.equal(hasSceneHeading(repaired), true);
    // The repair is real — cue and dialogue end up adjacent, which is what makes
    // the parser see dialogue at all.
    assert.match(repaired, /MAYA\nYou kept the tape\./);
  });

  it('changes nothing on text with no double spacing to repair — the no-op the card reports', () => {
    const prose = 'A memo about the third quarter.\nIt mentions a kitchen.\n';
    assert.equal(normalizeScreenplay(prose).trim(), prose.trim());
    // …and that text is still not a screenplay, which is why the card says so
    // rather than claiming the repair might help.
    assert.equal(hasSceneHeading(prose), false);
  });

  it('a title-page-only paste stays unrecognized after repair (the card must not promise otherwise)', () => {
    const titleOnly = 'Title: The Second Key\nAuthor: A. Writer\nDraft date: 2026-09-12\n';
    assert.equal(hasSceneHeading(normalizeScreenplay(titleOnly)), false);
  });
});
