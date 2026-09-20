// `scenesFromFountain` and bare-`\r` line endings — the fail-first proof for
// review finding 6 (2026-09-20, scene-split-cr-and-recipe-v4 lane).
//
// ── The defect ──────────────────────────────────────────────────────────────
// `server/nvm/analyze/scene-split.ts`'s `scenesFromFountain` reaches
// `parseFountain` (via `sceneHeadingLineIndices`) and `splitLinesKeepingEndings`,
// neither of which sees a lone `\r` as a line break — `parseFountain` splits on
// `text.split('\n')` alone. A script using classic Mac line endings (a bare
// `\r`, still produced by some older screenwriting tools and PDF extractors)
// therefore reads as ONE line to this function, and it undercounts scenes
// relative to the same script's CRLF or LF twin.
//
// Meanwhile `analyzeFountainText` — the doctor's own entry point — routes
// through `normalizeScreenplay`, which DOES strip `\r\n?` -> `\n`, but only
// when its own "is this a double-spaced import" heuristic fires; on plain
// (non-double-spaced) text it returns the raw string untouched. So depending
// on that heuristic, a bare-`\r` script's `sceneCount` (from
// `analyzeFountainText`) and its `scenesFromFountain(...).length` (the split
// `runScriptDoctor` hands to the emotional arc and a dozen signal modules —
// `doctor.ts`'s two `computeEmotionalArc(scenesFromFountain(fountain))` sites
// and `buildAccelerationStrength` all call it with RAW, unnormalized text) can
// either agree (both wrong, or by coincidence both survive) or silently
// diverge — the exact "the arc and the report see a different film" defect
// this file's sibling, `tests/core/scene-grammar.test.ts`, closed for the
// heading-vocabulary case on 2026-09-20.
//
// ── The fix ─────────────────────────────────────────────────────────────────
// `scenesFromFountain` now normalizes `\r\n?` -> `\n` itself, at the top,
// before segmenting — independent of `normalizeScreenplay`'s heuristic and
// without touching `parseFountain`, `doctor.ts`'s call sites, or the
// normalizer (all out of this lane's scope). CRLF already produced the right
// scene COUNT before this change (`\n` is present, so `String.split('\n')`
// already found every line, and `.trim()` already discarded the trailing
// `\r`); this test pins that the returned scene TEXT is now also identical
// across all three line-ending forms of the same script, not merely the count.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { scenesFromFountain } from '../../server/nvm/analyze/scene-split.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

describe('scenesFromFountain — line-ending independence (review finding 6)', () => {
  // The minimal probe quoted in the finding: no blank lines, so
  // `normalizeScreenplay`'s double-spaced heuristic never fires for it on
  // ANY of the three variants — analyzeFountainText and scenesFromFountain
  // therefore agree (both read it as one scene) both before and after this
  // fix, and this case exists to pin that they keep agreeing, not to show
  // the split.
  test('a minimal CR-only script no longer undercounts relative to its LF twin', () => {
    const crOnly = 'INT. A - DAY\rSomething.\rEXT. B - NIGHT\rMore.\r';
    const crlf = crOnly.replace(/\r/g, '\r\n');
    const lf = crOnly.replace(/\r/g, '\n');
    // FAIL-FIRST (pre-fix, quoted): CR-only 1, CRLF 2, LF 2 — the CR-only
    // reading was silently a different, smaller film.
    assert.equal(scenesFromFountain(crOnly).length, 2);
    assert.equal(scenesFromFountain(crlf).length, 2);
    assert.equal(scenesFromFountain(lf).length, 2);
  });

  // The double-spaced probe, which DOES trip `normalizeScreenplay`'s
  // heuristic. FAIL-FIRST (pre-fix, quoted): `analyzeFountainText` (and so
  // `runScriptDoctor`) reported 3 scenes on the CR-only variant, because the
  // heuristic normalized it before `parseFountain` ever saw it, while
  // `scenesFromFountain` — fed the same raw, unnormalized text by
  // `doctor.ts` — reported 1, the exact divergence this lane closes: the
  // report and the arc/signal modules built on `scenesFromFountain` saw a
  // different film from the same document.
  const threeSceneLines = [
    'INT. A - DAY', '', 'Something happens here.', '',
    'EXT. B - NIGHT', '', 'More stuff happens.', '',
    'INT. C - DAWN', '', 'The end of it.', '',
  ];
  const lf = threeSceneLines.join('\n');
  const crlf = threeSceneLines.join('\r\n');
  const crOnly = threeSceneLines.join('\r');

  test('CR-only, CRLF and LF versions of the same 3-scene script all yield 3 slices', () => {
    assert.equal(scenesFromFountain(lf).length, 3);
    assert.equal(scenesFromFountain(crlf).length, 3);
    // Pre-fix this line failed: scenesFromFountain(crOnly).length was 1 (the
    // whole document read as a single line and therefore a single heading),
    // while analyzeFountainText's sceneCount for the SAME text was 3 (see the
    // next test) — verified by probe, quoted in review finding 6.
    assert.equal(scenesFromFountain(crOnly).length, 3);
  });

  test('the slices\' text is identical after normalization, across all three line endings', () => {
    const normalize = (scenes: string[]) => JSON.stringify(scenes);
    const lfScenes = scenesFromFountain(lf);
    const crlfScenes = scenesFromFountain(crlf);
    const crOnlyScenes = scenesFromFountain(crOnly);
    assert.equal(normalize(crlfScenes), normalize(lfScenes));
    assert.equal(normalize(crOnlyScenes), normalize(lfScenes));
    // Every slice ends with a bare `\n` (never a `\r`), regardless of the
    // source's own line endings.
    for (const scene of [...lfScenes, ...crlfScenes, ...crOnlyScenes]) {
      assert.ok(!scene.includes('\r'), `slice retained a \\r: ${JSON.stringify(scene)}`);
    }
  });

  test('runScriptDoctor sceneCount equals scenesFromFountain(...).length for all three', async () => {
    const [lfReport, crlfReport, crOnlyReport] = await Promise.all([
      runScriptDoctor(lf), runScriptDoctor(crlf), runScriptDoctor(crOnly),
    ]);
    assert.equal(lfReport.sceneCount, scenesFromFountain(lf).length);
    assert.equal(crlfReport.sceneCount, scenesFromFountain(crlf).length);
    // FAIL-FIRST (pre-fix, quoted): runScriptDoctor(crOnly).sceneCount was 3
    // (normalizeScreenplay's heuristic fired) while
    // scenesFromFountain(crOnly).length was 1 — the report and the arc
    // disagreed about the same document. Post-fix both are 3.
    assert.equal(crOnlyReport.sceneCount, scenesFromFountain(crOnly).length);
    assert.equal(crOnlyReport.sceneCount, 3);
  });
});
