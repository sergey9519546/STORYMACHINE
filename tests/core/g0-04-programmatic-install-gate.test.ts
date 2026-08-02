// G0-04 follow-up: programmatic draft installs must respect the
// auto-analysis flag too.
//
// G0-04 gated the TYPING path (handleScriptChange -> scheduleAutoAnalysis),
// but two programmatic install callbacks in ScriptIDE.tsx still called
// triggerAnalysis unconditionally:
//   - CoverageSummary's onLoadSampleIntoEditor (the P0 golden path — the
//     "Try sample coverage" CTA)
//   - ScriptDoctorPanel's onLoadFountain (converted FDX/PDF, accepted fix)
// triggerAnalysis POSTs /api/analyze-script, which fires generateContent +
// getImageProvider().generate + getTTSProvider().speak in one Promise.all.
//
// Caught by a real browser certification run against a keyless dev server:
// clicking "Try sample coverage" produced
//   POST /api/analyze-script -> 503
// i.e. three provider calls attempted on the demo's primary path, with no
// user opt-in. Keyless the server refuses honestly (503, no provider call
// leaves the process), but the browser logs a console error — which fails
// the P0 pre-session "zero console errors" bar — and on a KEYED deployment
// the same click would silently spend three provider calls.
//
// Same JSX/JSDOM constraint as the other G0 UI tests (see
// tests/core/auto-analysis-default-off.test.ts's header): ScriptIDE.tsx
// cannot be imported under `node --experimental-strip-types`. This test
// therefore asserts on the component source: every triggerAnalysis call
// reachable from a non-explicit path must sit behind the autoAnalysis flag.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(
  import.meta.dirname,
  '../../src/components/ScriptIDE.tsx',
);

describe('G0-04 — programmatic draft installs respect the auto-analysis gate', () => {
  const source = fs.readFileSync(SRC, 'utf8');

  it('the sample-install callback does not call triggerAnalysis unconditionally', () => {
    // Locate onLoadSampleIntoEditor's body and confirm its triggerAnalysis
    // call is guarded.
    const idx = source.indexOf('onLoadSampleIntoEditor');
    assert.ok(idx > -1, 'expected ScriptIDE.tsx to wire onLoadSampleIntoEditor');
    const body = source.slice(idx, idx + 1600);
    assert.ok(
      body.includes('triggerAnalysis'),
      'sanity: the sample-install callback should still reference triggerAnalysis',
    );
    assert.match(
      body,
      /if\s*\(\s*autoAnalysis\s*\)\s*triggerAnalysis/,
      'sample install must gate triggerAnalysis behind autoAnalysis (else the P0 golden path fires /api/analyze-script unasked)',
    );
  });

  it('the onLoadFountain write-back does not call triggerAnalysis unconditionally', () => {
    // Anchor on the JSX wiring site, not the first textual mention (a
    // comment elsewhere in the file also names this prop).
    const idx = source.indexOf('onLoadFountain={');
    assert.ok(idx > -1, 'expected ScriptIDE.tsx to wire onLoadFountain');
    const body = source.slice(idx, idx + 1200);
    assert.match(
      body,
      /if\s*\(\s*autoAnalysis\s*\)\s*triggerAnalysis/,
      'onLoadFountain must gate triggerAnalysis behind autoAnalysis',
    );
  });

  it('no bare `triggerAnalysis(` call survives outside an explicit-action or guarded site', () => {
    // Every call site must be one of:
    //   - guarded:   if (autoAnalysis) triggerAnalysis(
    //   - explicit:  invoked from a user-initiated Analyze handler
    //   - the declaration itself
    // We assert the two programmatic-install sites specifically (above) and
    // here pin the total count so a NEW ungated site can't be added silently.
    const guarded = source.match(/if\s*\(\s*autoAnalysis\s*\)\s*triggerAnalysis\(/g) ?? [];
    assert.ok(
      guarded.length >= 2,
      `expected at least the 2 programmatic-install sites to be guarded, found ${guarded.length}`,
    );
  });
});

// ── Echo suppression ────────────────────────────────────────────────────────
// Setting scriptText re-renders FountainEditor, which syncs the value into the
// CodeMirror doc; that sync echoes back through onChange -> handleScriptChange.
// Without suppression the echo double-bumps the draft generation and re-marks
// coverage stale, so the P0 golden path rendered a just-generated report already
// flagged "COVERAGE OUTDATED — RE-RUN COVERAGE" (observed in a real browser run).
describe('G0-02/G0-04 — the editor echo of a programmatic install is suppressed', () => {
  const source = fs.readFileSync(SRC, 'utf8');

  it('installDraft records the installed text before mutating', () => {
    assert.match(
      source,
      /const\s+installDraft\s*=\s*useCallback\(\s*\(text: string\)\s*=>\s*\{[\s\S]{0,200}programmaticInstallRef\.current\s*=\s*text;[\s\S]{0,120}mutateDraft\(text\)/,
      'installDraft must record the text in programmaticInstallRef before calling mutateDraft',
    );
  });

  it('handleScriptChange returns early on a matching echo (no stale re-mark, no double bump)', () => {
    const idx = source.indexOf('const handleScriptChange');
    assert.ok(idx > -1, 'expected handleScriptChange to exist');
    const body = source.slice(idx, idx + 1200);
    assert.match(
      body,
      /programmaticInstallRef\.current\s*!==\s*null/,
      'handleScriptChange must check the programmatic-install marker',
    );
    assert.match(
      body,
      /if\s*\(\s*text\s*===\s*installed\s*\)\s*return;/,
      'handleScriptChange must return early when the incoming text is the echo',
    );
    // The marker must be cleared on every path, so a real edit is never swallowed.
    assert.match(
      body,
      /programmaticInstallRef\.current\s*=\s*null;/,
      'handleScriptChange must clear the marker whether or not the text matched',
    );
  });

  it('the two coverage-paired install sites route through installDraft', () => {
    const sampleIdx = source.indexOf('onLoadSampleIntoEditor');
    assert.match(
      source.slice(sampleIdx, sampleIdx + 1600),
      /installDraft\(text\)/,
      'sample install must use installDraft (else its setCoverageStale(false) is undone by the echo)',
    );
    const loadIdx = source.indexOf('onLoadFountain={');
    assert.match(
      source.slice(loadIdx, loadIdx + 1200),
      /installDraft\(text\)/,
      'onLoadFountain must use installDraft',
    );
  });

  it('restore/import installs still use mutateDraft (they SHOULD mark coverage stale)', () => {
    // Snapshot restore, server-conflict restore, and Story Machine import all
    // replace the draft with content coverage was never run on — those must keep
    // marking coverage stale, so they must NOT be converted to installDraft.
    const restoreIdx = source.indexOf('restoreModal.text');
    assert.ok(restoreIdx > -1, 'expected the snapshot-restore path to exist');
    assert.match(
      source.slice(Math.max(0, restoreIdx - 200), restoreIdx + 100),
      /mutateDraft\(restoreModal\.text\)/,
      'snapshot restore must keep using mutateDraft so coverage is correctly marked stale',
    );
  });
});
