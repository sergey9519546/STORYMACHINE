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

  it('a superseded run is stopped, not orphaned (a re-run must not double the server work)', () => {
    // Found driving the finding-#3 fix at feature length: `genRef` made a stale
    // RESPONSE harmless, but the stale REQUEST kept running, so a re-run put two
    // full 14-pass analyses of a 231-scene draft into the doctor pool at once.
    const runPrefix = coverageSummary.slice(
      coverageSummary.indexOf('setStatus("loading");'),
      coverageSummary.indexOf('let timedOut = false;'),
    );
    assert.ok(runPrefix.length > 0, 'run() prefix not found');
    assert.match(runPrefix, /abortRef\.current\?\.abort\(\);\s*\n\s*const controller = new AbortController\(\);/);
  });

  it('the unmount-abort gap is recorded in the code, not silently absent', () => {
    // ROUND-2 REVIEW ITEM 7. Closing Coverage mid-run still orphans a full
    // analysis. The one-line repair was BUILT AND REVERTED: `src/main.tsx`
    // renders under StrictMode, so its cleanup aborted the panel's first sample
    // run and the B-4 run-once guards then refused to restart it — the gate
    // caught it as `P3 :: Sample coverage produces a rendered verdict` failing
    // with "verdict text present=false" on the golden path.
    //
    // What this asserts is that the finding is written down where the next
    // person to reach for the cleanup will read it first, and that the naive
    // fix is NOT in the tree.
    assert.doesNotMatch(
      coverageSummary,
      /useEffect\(\(\) => \(\) => \{ abortRef\.current\?\.abort\(\); \}, \[\]\);/,
      'the unmount abort breaks the golden path under StrictMode — see the note above abortRef',
    );
    assert.match(coverageSummary, /IT WAS BUILT AND REVERTED, because the gate caught what it does\./);
    assert.match(coverageSummary, /Sample coverage\s*\n\s*\*\s*produces a rendered verdict/);
    // The aliveRef cleanup keeps its single job.
    assert.match(coverageSummary, /return \(\) => \{\s*\n\s*aliveRef\.current = false;\s*\n\s*\};/);
    // …and the supersede-abort, which StrictMode never triggers, is untouched.
    assert.match(coverageSummary, /abortRef\.current\?\.abort\(\);\s*\n\s*const controller = new AbortController\(\);/);
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

  it('is offered only for a format refusal, only once, and only when it would ACT', () => {
    // Round-2 review item 5: the third condition is new. A button that cannot
    // change anything is not rendered — the same hide-don't-disable rule
    // finding #10 applied to the start screen.
    assert.match(
      coverageSummary,
      /\{formatHint && !pdfRepairTried && pdfRepairCandidate !== null && \(/,
    );
    assert.match(coverageSummary, /const pdfRepairCandidate = useMemo\(\(\) => \{/);
    // The candidate and the click read the SAME value, so what the card offers
    // and what it does cannot drift apart.
    assert.match(coverageSummary, /const repaired = pdfRepairCandidate;/);
  });

  it('discloses the edit BEFORE the click, in the button itself', () => {
    // The outcome sentence cannot cover this half: a writer should not have to
    // press a button to learn that it rewrites their draft.
    assert.match(
      coverageSummary,
      /title="Rewrites your draft with the screenplay normaliser — blank lines collapsed, wrapped lines joined — and runs coverage on the result\. Ctrl\+Z undoes it\."/,
    );
  });

  it('names the edit and the undo in the outcome sentence', () => {
    const outcome = coverageSummary.slice(
      coverageSummary.indexOf('data-pdf-repair-outcome'),
      coverageSummary.indexOf('data-pdf-repair-outcome') + 700,
    );
    assert.ok(outcome.length > 0, 'the outcome paragraph was not found');
    assert.match(outcome, /Re-spaced the paste and ran it again — still no scene headings\./);
    assert.match(outcome, /Your draft was rewritten to do it: blank lines collapsed and/);
    assert.match(outcome, /wrapped lines joined\./);
    assert.match(outcome, /Press Ctrl\+Z \(⌘Z on a Mac\) to put it/);
    assert.match(outcome, /add a scene heading such as\s*\n\s*INT\. KITCHEN - DAY\./);
  });

  it('keeps the no-op message as a defensive path, not a normal one', () => {
    assert.match(coverageSummary, /Nothing to re-space — this text is not double-spaced/);
    assert.match(coverageSummary, /Defensive, not a normal path/);
  });
});

describe('what the repair actually does to the draft (round-2 review item 5)', () => {
  // The reviewer's own paste. This is the measurement the card's new sentence
  // is written from: the control's one acting state REWRITES the writer's text.
  const doubleSpacedProse = 'The room was cold.\n\n\n\n\nMaya opened the door.\n'
    + '\n\n\n\nShe said nothing.\n\n\n\n\nThe tape was still running.\n';

  it('joins separate action beats into one paragraph — the edit the card now names', () => {
    const repaired = normalizeScreenplay(doubleSpacedProse);
    assert.notEqual(repaired.trim(), doubleSpacedProse.trim(), 'this paste must be one the repair acts on');
    assert.equal(
      repaired.trim(),
      'The room was cold. Maya opened the door. She said nothing. The tape was still running.',
    );
    const beatsBefore = doubleSpacedProse.trim().split(/\n\s*\n/).length;
    const beatsAfter = repaired.trim().split(/\n\s*\n/).length;
    assert.equal(beatsBefore, 4);
    assert.equal(beatsAfter, 1, 'four beats become one run-on paragraph');
    // …and it is still not a screenplay, so this is the state the outcome
    // sentence describes.
    assert.equal(hasSceneHeading(repaired), false);
  });

  it('the states where the button is now withheld are exactly the ones where it could not act', () => {
    for (const [label, text] of [
      ['title-page only', 'Title: The Second Key\nAuthor: A. Writer\nDraft date: 2026-09-12\n'],
      ['single-spaced prose', 'A memo about the third quarter.\nIt mentions a kitchen.\n'],
    ] as const) {
      assert.equal(
        normalizeScreenplay(text).trim(),
        text.trim(),
        `${label}: the normaliser changes nothing, so no control should be offered`,
      );
    }
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
