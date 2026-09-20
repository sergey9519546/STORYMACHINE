// src/lib/structural-signals-copy.ts's formatSignalValue()/formatSignalDelta()
// — the ONE shared precision rule for the two structural-signal aggregates
// (meanAbsDialogueShareDelta, actionSentenceCvOverall) shown across six
// surfaces: the Script Doctor panel's Shape & Rhythm strip and its
// fix-and-verify receipt (ScriptDoctorPanel.tsx), the exported coverage HTML
// and letter (server/lib/coverage-html.ts, coverage-letter.ts), the
// What-If Lab / Versions draft trend (WhatIfPanel.tsx,
// SnapshotManager.tsx's ShapeRhythmTrendLine), and the Slate triage table
// (src/components/SlatePanel.tsx, server/lib/slate.ts).
//
// HISTORY (docs/audits/2026-09-06-mistake-search/findings/B-client.md B-7,
// deferred by the provenance review — see that file's own row 5 and
// docs/audits/2026-09-06-mistake-search/provenance-review.md's matching
// line): every one of the (originally five named) surfaces printed these two
// aggregates with a bare `.toFixed(2)`. A real receipt measured
// `before.meanAbsDialogueShareDelta 0.0042` -> `after 0.0254` and rendered as
// "Talk/action swing 0.00 -> 0.03" — the BEFORE value collapses to a
// displayed zero (indistinguishable from a genuine 0), and the printed delta
// (+0.03) overstates the true one (+0.0212) by 42%. Health already prints
// before/after at the delta's OWN precision (64.6 -> 66.1 beside +1.5, not
// 65 -> 66); this brings the two structural aggregates to the same standard.
// The Slate triage table (SlatePanel.tsx, slate.ts) renders the identical
// two aggregates a SIXTH way (`swing X · cv Y`, single-value only, no
// before/after there) and was found and migrated in the same follow-up pass
// that added this describe block — the owner rule is one implementation per
// concept, not five-plus-one.
//
// No React render harness exists in this repo (see tests/core/
// shape-rhythm-panel-copy.test.ts's own header) — this file follows the
// exact two-pronged convention tests/core/draft-rank-copy-consistency.test.ts
// and percentile-copy-consistency.test.ts already established: (1) exhaustive
// direct unit tests on the shared pure functions, and (2) source-text proof
// that every React surface calls THOSE functions rather than a local
// `.toFixed(2)` — since a surface's JSX only ever interpolates the shared
// function's return value, "imports it, never redefines it" is the strongest
// available proof short of a browser render that all six can never disagree.
// The two surfaces that are pure functions (coverage-html.ts, coverage-letter.ts)
// are driven end-to-end with real ScriptDoctorReport fixtures instead.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  formatSignalValue, formatSignalDelta,
  SIGNAL_VALUE_FLOOR_PRECISION, SIGNAL_VALUE_CEILING_PRECISION,
} from '../../src/lib/structural-signals-copy.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import type {
  ScriptDoctorReport, DoctorGrade, CoverageVerdict,
} from '../../server/nvm/analyze/types.ts';
import type { StructuralSignalsReport } from '../../server/nvm/analyze/structural-signals.ts';
// Read-only: this test IMPORTS the real computeStructuralSignals to pin the
// module header's r4() input contract from the source side (2026-09-06
// review round 1, follow-up 3) — it never edits structural-signals.ts (or
// anything else reachable from doctor.ts's import graph), so
// check-scoring-receipt.mjs correctly reports no scoring-path file changed
// even though this test file reads into that module.
import { computeStructuralSignals } from '../../server/nvm/analyze/structural-signals.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

const panelSrc = read('../../src/components/scriptide/ScriptDoctorPanel.tsx');
const whatIfPanelSrc = read('../../src/components/WhatIfPanel.tsx');
const snapshotManagerSrc = read('../../src/components/scriptide/SnapshotManager.tsx');
const coverageHtmlSrc = read('../../server/lib/coverage-html.ts');
const coverageLetterSrc = read('../../server/lib/coverage-letter.ts');
const slatePanelSrc = read('../../src/components/SlatePanel.tsx');
const slateSrc = read('../../server/lib/slate.ts');

// ── The exact table this brief asks the consistency test to drive ──────────
const DELTA_CASES: Array<{ name: string; before: number; after: number; expected: string }> = [
  {
    name: 'a genuinely nonzero before-value that toFixed(2) would show as 0.00 (B-7\'s own measured example)',
    before: 0.0042, after: 0.0254, expected: '0.004 → 0.025',
  },
  { name: 'already legible at the floor — stays at 2 decimals, unchanged from today', before: 0.10, after: 0.12, expected: '0.10 → 0.12' },
  { name: 'exactly equal — an explicit "no measured change", never a bare repeated number', before: 0.123, after: 0.123, expected: '0.12 (no measured change)' },
  { name: 'tied at the floor despite a real difference — widens to the ceiling to show it', before: 0.5, after: 0.5001, expected: '0.5000 → 0.5001' },
];

describe('formatSignalValue() / formatSignalDelta() — precision rule', () => {
  it('floor is 2, ceiling is 4', () => {
    assert.equal(SIGNAL_VALUE_FLOOR_PRECISION, 2);
    assert.equal(SIGNAL_VALUE_CEILING_PRECISION, 4);
  });

  it('a single value at or above the floor renders at the floor', () => {
    assert.equal(formatSignalValue(0.5518), '0.55');
    assert.equal(formatSignalValue(0.9994), '1.00');
    assert.equal(formatSignalValue(1), '1.00');
    assert.equal(formatSignalValue(0), '0.00');
  });

  it('a single nonzero value that the floor would show as 0.00 widens until it is not', () => {
    assert.equal(formatSignalValue(0.0042), '0.004');
    // 0.00004 would still be 0.0000 at the ceiling (4 decimals) — the
    // ceiling is a hard stop, matching the source's own r4() resolution
    // (server/nvm/analyze/structural-signals.ts), so this is the honest
    // floor of what this module will ever show, not a silent lie.
    assert.equal(formatSignalValue(0.00004), '0.0000');
  });

  it('opts.precision is a floor for the CALLER, never a way to request a misleading low precision', () => {
    // Requesting fewer than the module floor still clamps up to the floor.
    assert.equal(formatSignalValue(0.5, { precision: 0 }), '0.50');
    // Requesting more than the ceiling still clamps down to the ceiling.
    assert.equal(formatSignalValue(0.5, { precision: 9 }), '0.5000');
    // A caller-requested precision that would still hide a nonzero value is
    // widened past what was asked for, exactly like the default case.
    assert.equal(formatSignalValue(0.0042, { precision: 2 }), '0.004');
  });

  for (const { name, before, after, expected } of DELTA_CASES) {
    it(`formatSignalDelta: ${name}`, () => {
      assert.equal(formatSignalDelta(before, after), expected);
    });
  }

  it('formatSignalDelta with after === undefined falls back to the single-value rendering', () => {
    assert.equal(formatSignalDelta(0.0042, undefined), formatSignalValue(0.0042));
    assert.equal(formatSignalDelta(0.5518, undefined), formatSignalValue(0.5518));
  });

  it('two genuinely different values that still tie even at the ceiling render "(no measured change)", not a false widen-forever', () => {
    // r4()-rounded source values never actually produce this (both are
    // already at full precision by construction), but the function must
    // still degrade honestly rather than loop or misrepresent — a
    // difference below 0.00005 (finer than the ceiling can show) is
    // reported as unmeasured, not silently rounded into agreement without
    // saying so.
    assert.equal(formatSignalDelta(0.50001, 0.50002), '0.5000 (no measured change)');
  });

  it('the delta text never claims MORE precision than the ceiling allows', () => {
    for (const { before, after } of DELTA_CASES) {
      const text = formatSignalDelta(before, after);
      const decimalsMatch = text.match(/\.(\d+)/g) ?? [];
      for (const d of decimalsMatch) assert.ok(d.length - 1 <= SIGNAL_VALUE_CEILING_PRECISION, `"${text}" exceeds the ceiling`);
    }
  });
});

// Review round 1, follow-up 4: formatSignalDelta must guard `before` the
// SAME way it already guards `after` — a missing/invalid reading on either
// side renders the shared unreadable-signal text or falls back to the
// single-value rendering of whichever side IS valid, never throws.
describe('formatSignalDelta() — before/after are guarded symmetrically (never throws on a missing or invalid reading)', () => {
  it('before missing/null/NaN, after a real number: falls back to formatSignalValue(after), symmetric to the existing after-missing case', () => {
    assert.equal(formatSignalDelta(undefined, 0.0254), formatSignalValue(0.0254));
    assert.equal(formatSignalDelta(null as unknown as number, 0.0254), formatSignalValue(0.0254));
    assert.equal(formatSignalDelta(NaN, 0.0254), formatSignalValue(0.0254));
  });

  it('after missing/null/NaN, before a real number: unchanged existing behavior — falls back to formatSignalValue(before)', () => {
    assert.equal(formatSignalDelta(0.0042, undefined), formatSignalValue(0.0042));
    assert.equal(formatSignalDelta(0.0042, null as unknown as number), formatSignalValue(0.0042));
    assert.equal(formatSignalDelta(0.0042, NaN), formatSignalValue(0.0042));
  });

  it('both missing/invalid: the shared unreadable-signal text, never a crash', () => {
    assert.equal(formatSignalDelta(undefined, undefined), '—');
    assert.equal(formatSignalDelta(null as unknown as number, null as unknown as number), '—');
    assert.equal(formatSignalDelta(NaN, NaN), '—');
    assert.equal(formatSignalDelta(undefined, NaN), '—');
  });

  it('never throws for any combination of number | null | undefined | NaN on either side', () => {
    const values: Array<number | null | undefined> = [0.0042, 0, undefined, null, NaN];
    for (const before of values) {
      for (const after of values) {
        assert.doesNotThrow(() => formatSignalDelta(before, after), `formatSignalDelta(${before}, ${after}) must not throw`);
      }
    }
  });
});

// Review round 1, follow-up 3: the module header now states an explicit
// input contract — both aggregates arrive already rounded to 4 decimal
// places via structural-signals.ts's own r4() (":503"/":514", calling
// ":192"'s Math.round(n * 10_000) / 10_000). Pinned here from the SOURCE
// side: a real computeStructuralSignals() call, not a hand-typed number
// that merely happens to land on the grid.
describe('r4() input contract — both aggregates land on the 0.0001 grid at the source, pinned from computeStructuralSignals() itself', () => {
  // Three scenes with deliberately uneven dialogue/action word counts (not
  // round fractions of 10) and varied action-sentence lengths, so a
  // genuinely non-terminating ratio (thirds, sevenths) would surface as
  // floating-point noise past 4 decimals if r4() were not actually rounding.
  const script = [
    'INT. ROOM - DAY',
    '',
    'One two three four five six seven.',
    '',
    'BOB',
    'Eight nine ten eleven twelve thirteen.',
    '',
    'INT. HALL - DAY',
    '',
    'Filler word count varies quite a bit differently here across this scene body entirely today.',
    '',
    'CAROL',
    'Short.',
    '',
    'INT. STREET - NIGHT',
    '',
    'A brief and terse action line for variety.',
    '',
  ].join('\n');

  const isOnQuarterMillGrid = (n: number) => Math.abs(n * 10_000 - Math.round(n * 10_000)) < 1e-9;

  it('the fixture actually scores (sanity check: >= 2 scenes, the aggregates are nonzero, not a degenerate all-zero fixture)', () => {
    const block = computeStructuralSignals(script);
    assert.equal(block.scored, true);
    assert.ok(block.sceneCount >= 2);
    assert.notEqual(block.meanAbsDialogueShareDelta, 0);
    assert.notEqual(block.actionSentenceCvOverall, 0);
  });

  it('meanAbsDialogueShareDelta lands exactly on the 0.0001 grid', () => {
    const { meanAbsDialogueShareDelta } = computeStructuralSignals(script);
    assert.ok(
      isOnQuarterMillGrid(meanAbsDialogueShareDelta),
      `meanAbsDialogueShareDelta ${meanAbsDialogueShareDelta} is not an r4()-rounded 4dp value`,
    );
  });

  it('actionSentenceCvOverall lands exactly on the 0.0001 grid', () => {
    const { actionSentenceCvOverall } = computeStructuralSignals(script);
    assert.ok(
      isOnQuarterMillGrid(actionSentenceCvOverall),
      `actionSentenceCvOverall ${actionSentenceCvOverall} is not an r4()-rounded 4dp value`,
    );
  });

  it('holds across a spread of scene counts and word-count shapes, not just the one fixture above', () => {
    for (const sceneCount of [2, 3, 5, 7, 11]) {
      const scenes = Array.from({ length: sceneCount }, (_, i) => {
        const words = 5 + i * 3 + (i % 2);
        const actionLine = Array.from({ length: words }, () => 'word').join(' ') + '.';
        return `INT. SCENE ${i + 1} - DAY\n\n${actionLine}\n\nSPEAKER${i}\nA short line here today.\n`;
      }).join('\n');
      const block = computeStructuralSignals(scenes);
      assert.ok(isOnQuarterMillGrid(block.meanAbsDialogueShareDelta), `sceneCount=${sceneCount}: meanAbsDialogueShareDelta off-grid`);
      assert.ok(isOnQuarterMillGrid(block.actionSentenceCvOverall), `sceneCount=${sceneCount}: actionSentenceCvOverall off-grid`);
    }
  });

  it('formatSignalValue/formatSignalDelta never need to widen past the ceiling for a source-produced reading (the ceiling really is total fidelity under this contract)', () => {
    // Given the grid contract, the ceiling (4dp) always reproduces the exact
    // source value — so formatSignalValue at the ceiling round-trips.
    const block = computeStructuralSignals(script);
    assert.equal(
      Number(formatSignalValue(block.meanAbsDialogueShareDelta, { precision: SIGNAL_VALUE_CEILING_PRECISION })),
      block.meanAbsDialogueShareDelta,
    );
    assert.equal(
      Number(formatSignalValue(block.actionSentenceCvOverall, { precision: SIGNAL_VALUE_CEILING_PRECISION })),
      block.actionSentenceCvOverall,
    );
  });
});

// ── Cross-surface: every surface calls the SAME shared functions ───────────
describe('every surface imports formatSignalValue/formatSignalDelta rather than a local .toFixed(2) on these two aggregates', () => {
  it('ScriptDoctorPanel.tsx imports both functions (merged into the one existing structural-signals-copy.ts import, review round 1 follow-up 5, not a second import statement)', () => {
    assert.match(
      panelSrc,
      /import \{ ACTION_PROSE_VARIATION_LABEL, formatSignalValue, formatSignalDelta \} from "\.\.\/\.\.\/lib\/structural-signals-copy\.ts";/,
    );
    assert.equal(
      (panelSrc.match(/from "\.\.\/\.\.\/lib\/structural-signals-copy\.ts";/g) ?? []).length,
      1,
      'exactly one import statement from structural-signals-copy.ts',
    );
  });

  it('ScriptDoctorPanel.tsx uses formatSignalValue at its 3 single-reading render sites (ShapeRhythmSection x2, ShapeRhythmUnscored x1)', () => {
    const count = (panelSrc.match(/formatSignalValue\(signals\.(meanAbsDialogueShareDelta|actionSentenceCvOverall)\)/g) ?? []).length;
    assert.equal(count, 3, `expected 3 formatSignalValue(signals....) usages, found ${count}`);
  });

  it('ScriptDoctorPanel.tsx\'s FixStructuralSignalsStrip uses formatSignalDelta for both aggregates, not a hand-rolled pair()', () => {
    const stripMatch = panelSrc.match(/function FixStructuralSignalsStrip[\s\S]*?\n}\n/);
    assert.ok(stripMatch, 'FixStructuralSignalsStrip must exist');
    const body = stripMatch![0];
    assert.match(body, /formatSignalDelta\(signals\.before\.meanAbsDialogueShareDelta, signals\.after\?\.meanAbsDialogueShareDelta\)/);
    assert.match(body, /formatSignalDelta\(signals\.before\.actionSentenceCvOverall, signals\.after\?\.actionSentenceCvOverall\)/);
    assert.ok(!body.includes('.toFixed('), 'no bare .toFixed( should remain in FixStructuralSignalsStrip');
  });

  it('no bare .toFixed( on either aggregate survives anywhere in ScriptDoctorPanel.tsx', () => {
    assert.ok(!/(?:signals|result)\.(?:before\.)?meanAbsDialogueShareDelta\.toFixed\(/.test(panelSrc));
    assert.ok(!/(?:signals|result)\.(?:before\.)?actionSentenceCvOverall\.toFixed\(/.test(panelSrc));
  });

  it('WhatIfPanel.tsx imports and uses formatSignalValue at both its render sites (merged into the one existing import, not a second statement)', () => {
    assert.match(whatIfPanelSrc, /import \{ ACTION_PROSE_VARIATION_LABEL, formatSignalValue \} from '\.\.\/lib\/structural-signals-copy\.ts';/);
    assert.equal((whatIfPanelSrc.match(/from '\.\.\/lib\/structural-signals-copy\.ts';/g) ?? []).length, 1);
    assert.match(whatIfPanelSrc, /formatSignalValue\(draft\.meanAbsDialogueShareDelta\)/);
    assert.match(whatIfPanelSrc, /formatSignalValue\(draft\.actionSentenceCvOverall\)/);
    assert.ok(!whatIfPanelSrc.includes('draft.meanAbsDialogueShareDelta.toFixed('));
    assert.ok(!whatIfPanelSrc.includes('draft.actionSentenceCvOverall.toFixed('));
  });

  it('SnapshotManager.tsx\'s ShapeRhythmTrendLine imports and uses formatSignalDelta for both aggregates', () => {
    assert.match(snapshotManagerSrc, /import\s*\{\s*formatSignalDelta\s*\}\s*from\s*"\.\.\/\.\.\/lib\/structural-signals-copy\.ts";/);
    const fnMatch = snapshotManagerSrc.match(/function ShapeRhythmTrendLine[\s\S]*?\n}\n/);
    assert.ok(fnMatch, 'ShapeRhythmTrendLine must exist');
    const body = fnMatch![0];
    assert.match(body, /formatSignalDelta\(oldest\.meanAbsDialogueShareDelta, newest\.meanAbsDialogueShareDelta\)/);
    assert.match(body, /formatSignalDelta\(oldest\.actionSentenceCvOverall, newest\.actionSentenceCvOverall\)/);
    assert.ok(!body.includes('.toFixed('), 'no bare .toFixed( should remain in ShapeRhythmTrendLine');
  });

  it('coverage-html.ts imports formatSignalValue and uses it at all 3 numeric sites (one-scene notice, mean talk/action swing, action-prose variation); merged into the one existing import', () => {
    assert.match(coverageHtmlSrc, /import \{ ACTION_PROSE_VARIATION_LABEL_LOWER, formatSignalValue \} from '\.\.\/\.\.\/src\/lib\/structural-signals-copy\.ts';/);
    assert.equal((coverageHtmlSrc.match(/from '\.\.\/\.\.\/src\/lib\/structural-signals-copy\.ts';/g) ?? []).length, 1);
    const count = (coverageHtmlSrc.match(/formatSignalValue\(block\.(meanAbsDialogueShareDelta|actionSentenceCvOverall)\)/g) ?? []).length;
    assert.equal(count, 3, `expected 3 formatSignalValue(block....) usages, found ${count}`);
    assert.ok(!coverageHtmlSrc.includes('block.actionSentenceCvOverall.toFixed('));
    assert.ok(!coverageHtmlSrc.includes('block.meanAbsDialogueShareDelta.toFixed('));
  });

  it('coverage-letter.ts imports formatSignalValue and uses it at all 3 numeric sites; merged into the one existing import', () => {
    assert.match(coverageLetterSrc, /import \{ ACTION_PROSE_VARIATION_LABEL_LOWER, formatSignalValue \} from '\.\.\/\.\.\/src\/lib\/structural-signals-copy\.ts';/);
    assert.equal((coverageLetterSrc.match(/from '\.\.\/\.\.\/src\/lib\/structural-signals-copy\.ts';/g) ?? []).length, 1);
    const count = (coverageLetterSrc.match(/formatSignalValue\((?:meanAbsDialogueShareDelta|actionSentenceCvOverall|report\.structuralSignals\.actionSentenceCvOverall)\)/g) ?? []).length;
    assert.equal(count, 3, `expected 3 formatSignalValue(...) usages, found ${count}`);
    assert.ok(!coverageLetterSrc.includes('meanAbsDialogueShareDelta.toFixed('));
    assert.ok(!coverageLetterSrc.includes('actionSentenceCvOverall.toFixed('));
  });

  // The Slate triage table — a SIXTH surface, found by grepping for every
  // remaining `.toFixed(` on these two aggregates after the first five were
  // wired (owner rule: one implementation per concept, not five-plus-one).
  // Single-value only (a triage row is one script's one reading, never a
  // before/after comparison), so formatSignalValue, not formatSignalDelta.
  it('SlatePanel.tsx imports formatSignalValue and uses it for both aggregates in the ranked table', () => {
    assert.match(slatePanelSrc, /import\s*\{\s*formatSignalValue\s*\}\s*from\s*"\.\.\/lib\/structural-signals-copy\.ts";/);
    assert.match(slatePanelSrc, /formatSignalValue\(entry\.meanAbsDialogueShareDelta\)/);
    assert.match(slatePanelSrc, /formatSignalValue\(entry\.actionSentenceCvOverall\)/);
    assert.ok(!slatePanelSrc.includes('entry.meanAbsDialogueShareDelta.toFixed('));
    assert.ok(!slatePanelSrc.includes('entry.actionSentenceCvOverall.toFixed('));
  });

  it('server/lib/slate.ts imports formatSignalValue and uses it for both aggregates in the exported ranked table', () => {
    assert.match(slateSrc, /import\s*\{\s*formatSignalValue\s*\}\s*from\s*'\.\.\/\.\.\/src\/lib\/structural-signals-copy\.ts';/);
    assert.match(slateSrc, /formatSignalValue\(entry\.meanAbsDialogueShareDelta\)/);
    assert.match(slateSrc, /formatSignalValue\(entry\.actionSentenceCvOverall\)/);
    assert.ok(!slateSrc.includes('entry.meanAbsDialogueShareDelta.toFixed('));
    assert.ok(!slateSrc.includes('entry.actionSentenceCvOverall.toFixed('));
  });

  it('no bare .toFixed( on either aggregate survives anywhere in the tracked src/ or server/ tree', () => {
    // The strongest available closing assertion for "found every toFixed( on
    // a signal value" — not just the six named surfaces, but the whole tree,
    // so a SEVENTH hand-copy introduced later fails here immediately rather
    // than waiting for another audit to find it.
    const rg = spawnSync(
      'grep', ['-rlE', '(meanAbsDialogueShareDelta|actionSentenceCvOverall)\\.toFixed\\(', resolve(__dirname, '../../src'), resolve(__dirname, '../../server')],
      { encoding: 'utf8' },
    );
    const hits = (rg.stdout ?? '').split('\n').filter((l) => l.trim().length > 0);
    assert.deepEqual(hits, [], `bare .toFixed( on a structural-signal aggregate still found in:\n${hits.join('\n')}`);
  });

  // Review round 1, follow-up 5: the assertion above matches the LITERAL
  // field name immediately before `.toFixed(`, so a hand-copy that first
  // aliases the reading into a differently-named local
  // (`const v = block.actionSentenceCvOverall; ...v.toFixed(2)...`) would
  // slip past it. This is a narrower, targeted catch for exactly that
  // shape — a declaration assigned FROM one of the two aggregate field
  // names, whose declared name later takes `.toFixed(` anywhere in the
  // same file — checked over every file this pass touched, so a widened
  // pattern doesn't false-positive on the OTHER structural-signal fields
  // (sceneLengthCv, leadShareSlope, the per-scene tooltip readings, …)
  // those same files still legitimately print with a bare `.toFixed(2)`
  // (out of scope for this pass — never shown as a before/after delta).
  it('no renamed local alias of either aggregate reaches .toFixed( either, in any file this pass touched', () => {
    const files = [
      { name: 'ScriptDoctorPanel.tsx', src: panelSrc },
      { name: 'SnapshotManager.tsx', src: snapshotManagerSrc },
      { name: 'WhatIfPanel.tsx', src: whatIfPanelSrc },
      { name: 'coverage-html.ts', src: coverageHtmlSrc },
      { name: 'coverage-letter.ts', src: coverageLetterSrc },
      { name: 'SlatePanel.tsx', src: slatePanelSrc },
      { name: 'slate.ts', src: slateSrc },
    ];
    const declRe = /(?:const|let|var)\s+(\w+)\s*=\s*[\w.$?]*\.(?:meanAbsDialogueShareDelta|actionSentenceCvOverall)\b/g;
    const hits: string[] = [];
    for (const { name, src } of files) {
      for (const m of src.matchAll(declRe)) {
        const alias = m[1];
        if (new RegExp(`\\b${alias}\\.toFixed\\(`).test(src)) hits.push(`${name}: local alias "${alias}"`);
      }
    }
    assert.deepEqual(hits, [], `renamed local alias of a structural-signal aggregate reaching .toFixed( in:\n${hits.join('\n')}`);
  });

  // Fixture proving the alias-detection regex above actually fires on the
  // shape it targets, rather than never matching anything (the same
  // "prove the guard can fail" discipline shape-rhythm-panel-copy.test.ts's
  // stripComments fixture already established for a different guard).
  it('the alias-detection regex fires on a synthetic renamed-alias hand-copy, and does not fire on the real (fixed) files', () => {
    const declRe = /(?:const|let|var)\s+(\w+)\s*=\s*[\w.$?]*\.(?:meanAbsDialogueShareDelta|actionSentenceCvOverall)\b/g;
    const badFixture = 'const v = block.actionSentenceCvOverall;\nconsole.log(`cv ${v.toFixed(2)}`);\n';
    const badHits: string[] = [];
    for (const m of badFixture.matchAll(declRe)) {
      const alias = m[1];
      if (new RegExp(`\\b${alias}\\.toFixed\\(`).test(badFixture)) badHits.push(alias);
    }
    assert.deepEqual(badHits, ['v'], 'the fixture must be caught — proves the regex can fail, not just always pass');

    const goodFixture = 'const v = block.actionSentenceCvOverall;\nconsole.log(`cv ${formatSignalValue(v)}`);\n';
    const goodHits: string[] = [];
    for (const m of goodFixture.matchAll(declRe)) {
      const alias = m[1];
      if (new RegExp(`\\b${alias}\\.toFixed\\(`).test(goodFixture)) goodHits.push(alias);
    }
    assert.deepEqual(goodHits, [], 'routing the alias through formatSignalValue must not be flagged');
  });
});

// ── The two pure-function surfaces, driven end-to-end with the exact ───────
// value from B-7's own measured example (0.0042) — proving the RENDERED
// document, not just the source text, carries the widened precision.
function baseStructure(): ScriptDoctorReport['structure'] {
  return {
    actPosition: 'act2b', completionPercent: 50, avgSuspensePerScene: 3,
    escalating: true, reversalCount: 0, reversalDensity: 0, approachingClimax: false,
    openClues: 0, revelationCount: 0, midpointPressure: 0, tightestScene: 0,
  };
}

function structuralSignalsFixture(overrides: Partial<StructuralSignalsReport> = {}): StructuralSignalsReport {
  return {
    scored: true,
    sceneCount: 2,
    scenes: [
      {
        sceneIdx: 0, slug: 'INT. HOME - DAY', words: 40, dialogueShare: 0.5, dialogueShareDelta: 0,
        speakers: 1, speakerTurns: 2, meanTurnWords: 10, leadShare: 1, newPairs: 0,
        lengthZ: 0, openCloseShift: 0.1, actionSentenceCv: 0, openCloseModeFlip: false,
      },
      {
        sceneIdx: 1, slug: 'EXT. STREET - NIGHT', words: 60, dialogueShare: 0.7, dialogueShareDelta: 0.2,
        speakers: 2, speakerTurns: 3, meanTurnWords: 12, leadShare: 0.6, newPairs: 1,
        lengthZ: 0.5, openCloseShift: 0.2, actionSentenceCv: 0.3, openCloseModeFlip: true,
      },
    ],
    sceneLengthCv: 0.2, meanAbsDialogueShareDelta: 0.0042, meanAbsDialogueShareDeltaNormalised: 0.0117,
    dialogueShareRange: 0.2,
    newPairSceneRate: 0.5, lastNewPairPosition: 1, meanSpeakersPerScene: 1.5,
    meanTurnWords: 11, meanLeadShare: 0.8, leadShareSlope: -0.4, speakerEntropy: 0.5,
    actionSentenceCvOverall: 0.0254, meanOpenCloseShift: 0.15, openCloseModeFlipRate: 0.5,
    ...overrides,
  };
}

function buildReportWithSignals(structuralSignals: StructuralSignalsReport): ScriptDoctorReport {
  return {
    health: 72.5,
    grade: 'solid' as DoctorGrade,
    totalIssues: 0,
    bySeverity: { critical: 0, major: 0, minor: 0 },
    passes: [],
    sceneHeatmap: [],
    topPriorities: [],
    structure: baseStructure(),
    characters: ['ALICE', 'BOB'],
    sceneCount: 2,
    wordCount: 100,
    analyzedAt: Date.UTC(2026, 8, 6),
    verdict: 'CONSIDER' as CoverageVerdict,
    dimensions: [],
    strengths: [],
    plainSummary: 'A clean report.',
    structuralSignals,
  };
}

describe('coverage-html.ts / coverage-letter.ts — render formatSignalValue() verbatim for B-7\'s own measured value (0.0042)', () => {
  const report = buildReportWithSignals(structuralSignalsFixture());

  it('coverage-html.ts renders "0.004" for meanAbsDialogueShareDelta, never "0.00"', () => {
    const html = renderCoverageHtml(report, 'Signal Precision Check');
    assert.ok(html.includes(`mean talk/action swing ${formatSignalValue(0.0042)}`));
    assert.ok(!html.includes('mean talk/action swing 0.00 '), 'must not silently show the pre-fix false zero');
  });

  it('coverage-html.ts renders "0.025" for actionSentenceCvOverall, matching formatSignalValue exactly', () => {
    const html = renderCoverageHtml(report, 'Signal Precision Check');
    assert.ok(html.includes(`action-prose variation ${formatSignalValue(0.0254)}`));
  });

  it('coverage-letter.ts renders "0.004" for meanAbsDialogueShareDelta, never "0.00"', () => {
    const { markdown } = renderCoverageLetter(report, { title: 'Signal Precision Check' });
    assert.ok(markdown.includes(`dialogue/action word mix is ${formatSignalValue(0.0042)}`));
    assert.ok(!markdown.includes('dialogue/action word mix is 0.00,'), 'must not silently show the pre-fix false zero');
  });

  it('coverage-letter.ts renders "0.025" for actionSentenceCvOverall, matching formatSignalValue exactly', () => {
    const { markdown } = renderCoverageLetter(report, { title: 'Signal Precision Check' });
    assert.ok(markdown.includes(`action-prose variation is ${formatSignalValue(0.0254)}`));
  });

  it('coverage-html.ts and coverage-letter.ts agree with each other and with the panel/receipt/lab render sites — all five surfaces trace to the SAME formatSignalValue(0.0042)', () => {
    const html = renderCoverageHtml(report, 'Signal Precision Check');
    const { markdown } = renderCoverageLetter(report, { title: 'Signal Precision Check' });
    const shared = formatSignalValue(0.0042);
    assert.ok(html.includes(shared) && markdown.includes(shared));
    // The panel/receipt/lab sides are proven identical by construction — the
    // "every surface imports formatSignalValue/formatSignalDelta" describe
    // block above proves each of them calls this EXACT function with this
    // EXACT field, so there is no code path left by which any of the five
    // could ever print a different string for the same number.
  });

  it('the one-scene unscored branch (coverage-html.ts and coverage-letter.ts) also renders through formatSignalValue, for the value B-10 proved is genuinely computed with one scene', () => {
    const oneSceneReport = buildReportWithSignals(structuralSignalsFixture({
      scored: false, sceneCount: 1, scenes: [], actionSentenceCvOverall: 0.0254, meanAbsDialogueShareDelta: 0,
      meanAbsDialogueShareDeltaNormalised: 0,
    }));
    const html = renderCoverageHtml(oneSceneReport, 'One Scene');
    const { markdown } = renderCoverageLetter(oneSceneReport, { title: 'One Scene' });
    const expected = formatSignalValue(0.0254);
    assert.ok(html.includes(expected), `coverage-html one-scene notice must contain "${expected}"`);
    assert.ok(markdown.includes(`action-prose variation is ${expected}`), `coverage-letter one-scene notice must contain "${expected}"`);
  });
});
