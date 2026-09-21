// ONE scene-heading grammar — the fail-first proof for rows 5 and 6 of
// SESSION_REPORT_2026-09-19.md §4.
//
// ── Row 5: two grammars, and the second disabled the only feature-scale
//    deduction ────────────────────────────────────────────────────────────
// `server/nvm/analyze/scene-split.ts`'s `scenesFromFountain` — the splitter
// under `computeEmotionalArc`, mirror-scene, pattern-establishment,
// silence-signal, disclosure-ledger, genre-obligation, scene-economy,
// scene-value-shift, theme-extract and cold-open-promise — split on `INT.` and
// `EXT.` alone. The doctor's own grammar (`parseFountain`, and therefore
// `sceneCount`) has always also recognised `EST.`, `I/E.`, `INT./EXT.` and
// Fountain forced `.HEADINGS`. On a script written in those forms the arc saw
// a handful of scenes where the report said forty, so `arcIncoherenceDeduction`
// (ARC_DED_MIN_SCENES = 15, `doctor.ts`) — the one feature-scale deduction
// wired into health — never fired at all.
//
// ── Row 6: any line starting with `.` was a heading ───────────────────────
// Fountain's forced-heading rule is `.` followed by a non-`.`; `..` and `...`
// are explicitly not headings, so that an ellipsis stays prose. The parser
// tested `trimmed.startsWith('.')`, so a line of dialogue or action opening
// with `...` became a scene heading and tore its block off the scene it
// belonged to. The scarcity term is `140/sceneCount`, so a phantom scene is
// worth real points: on the five-scene fixture below it moved health.
//
// ── Fail-first, as measured ───────────────────────────────────────────────
// This file and its fixtures were copied into a `git archive 26d930dd`
// checkout of the PRE-change tree and run there. Recorded in
// `docs/audits/2026-09-20-scene-grammar/README.md` §3:
//
//   (a) mixed-heading 16-scene script  — scenesFromFountain saw 3, doctor 16
//   (b) `...and then nothing.`          — added a phantom scene (5 -> 6)
//   (c) `.FORCED` heading               — passed before and after
//   (d) plain INT./EXT. 16-scene script — byte-identical before and after
//
// (c) is deliberately a test that already passed: the forced-heading fix has a
// direction, and a change that quietly stopped recognising real forced
// headings would be a worse bug than the one being fixed.
//
// ── (e), added 2026-09-20: Unicode forced headings ─────────────────────────
// `FORCED_SCENE_HEADING_RE` was `/^\.(?=[A-Za-z0-9])/` — ASCII only, so
// `.МОСКВА` was not recognised. Decided: any Unicode letter or number after
// the dot is a forced heading (`\p{L}` / `\p{N}`, `u` flag). Fail-first,
// measured against this file's own pre-edit tree: `.МОСКВА - ДЕНЬ`,
// `.ԵՐԵՎԱՆ` and `.東京` all read `false`; the 3-scene fixture below read
// `scenesFromFountain(...).length === 0` and `sceneCount === 1`.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseFountain, isSceneHeadingLine } from '../../src/lib/fountain.ts';
import { scenesFromFountain } from '../../server/nvm/analyze/scene-split.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

// Windows-safe: fileURLToPath, never `new URL(...).pathname` (CLAUDE.md).
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'scene-grammar');
const read = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

/** The doctor's own scene count for a document, read off the parser rather
 *  than off any splitter — the independent side of every comparison here. */
function parserSceneCount(text: string): number {
  return parseFountain(text).filter(b => b.type === 'scene_heading').length;
}

/** Canonical JSON, key-sorted, exactly as `scripts/check-doctor-output-identity.mjs`
 *  builds it — same function, so the snapshot in `tests/fixtures/` and the 45
 *  harness snapshots mean the same thing. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonical((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

describe('scene grammar — (a) the splitter and the doctor agree on every heading form', () => {
  const mixed = read('mixed-headings.fountain');

  test('the fixture really does use the forms the old splitter could not see', () => {
    // Guard the guard: if a future edit rewrites these headings as INT./EXT.,
    // this test would pass for the wrong reason.
    assert.ok(/^EST\. /m.test(mixed), 'fixture must contain an EST. heading');
    assert.ok(/^I\/E\. /m.test(mixed), 'fixture must contain an I/E. heading');
    assert.ok(/^INT\.\/EXT\. /m.test(mixed), 'fixture must contain an INT./EXT. heading');
    assert.ok(/^\.[A-Z]/m.test(mixed), 'fixture must contain a forced .HEADING');
  });

  test('scenesFromFountain returns the doctor\'s scene count, not a subset', () => {
    assert.equal(parserSceneCount(mixed), 16);
    // PRE-change this was 3 — only the three `INT./EXT.` headings begin with
    // the literal `INT.` the old regex required.
    assert.equal(scenesFromFountain(mixed).length, 16);
  });

  test('the slices are lossless: every heading line opens exactly one slice', () => {
    const scenes = scenesFromFountain(mixed);
    for (const scene of scenes) {
      const first = (scene.split('\n', 1)[0] ?? '').trim();
      assert.ok(isSceneHeadingLine(first), `slice does not open on a heading: ${JSON.stringify(first)}`);
      assert.equal(parserSceneCount(scene), 1, `slice contains more than one heading: ${first}`);
    }
    // The head (title page) is dropped, as it always was; nothing else is.
    const head = mixed.slice(0, mixed.indexOf(scenes[0]));
    assert.equal(head + scenes.join(''), mixed);
  });

  test('the arc now receives 16 scenes, so ARC_DED_MIN_SCENES (15) is reachable', async () => {
    // Row 5's consequence, stated as the engine sees it: the deduction is
    // gated on scene count, and the count the arc receives is what gates it.
    const report = await runScriptDoctor(mixed);
    assert.equal(report.sceneCount, 16);
    // PRE-change: 3 — the arc was computed from the old splitter's output, so
    // the deduction's scene-count gate could not be reached on this script.
    assert.equal(report.emotionalArc?.perScene.length, 16);
    assert.ok((report.emotionalArc?.perScene.length ?? 0) >= 15,
      'the arc must reach ARC_DED_MIN_SCENES on a 16-scene mixed-heading script');
  });
});

describe('scene grammar — (b) `..` and `...` lines are not scene headings', () => {
  const WITHOUT = [
    'INT. KITCHEN - DAY', '', 'She sets the cup down.', '', 'ANA', 'I heard you the first time.', '',
    'EXT. YARD - DAY', '', 'Rain.', '', 'ANA', 'Then say it again.', '',
    'INT. HALL - NIGHT', '', 'A door.', '', 'BEN', 'I would rather not.', '',
    'EXT. ROAD - NIGHT', '', 'Headlights.', '', 'ANA', 'Drive.', '',
    'INT. KITCHEN - DAWN', '', 'The cup is still there.', '', 'BEN', 'I said it.', '',
  ].join('\n');
  // The SAME script with one continuation line added inside a dialogue block.
  const WITH = WITHOUT.replace('I would rather not.', 'I would rather not.\n...and then nothing.');

  test('the ellipsis line is not classified as a heading', () => {
    assert.equal(isSceneHeadingLine('...and then nothing.'), false);
    assert.equal(isSceneHeadingLine('..'), false);
    assert.equal(isSceneHeadingLine('...'), false);
    assert.equal(isSceneHeadingLine('.'), false);
    assert.equal(isSceneHeadingLine('. spaced'), false);
  });

  test('scene count is unchanged by the presence of the ellipsis line', () => {
    // PRE-change: 5 without, 6 with — the `...` line opened a phantom scene
    // and took the rest of BEN's block with it.
    assert.equal(parserSceneCount(WITHOUT), 5);
    assert.equal(parserSceneCount(WITH), 5);
    assert.equal(scenesFromFountain(WITHOUT).length, 5);
    assert.equal(scenesFromFountain(WITH).length, 5);
  });

  test('the line stays inside the scene it belongs to', () => {
    const scenes = scenesFromFountain(WITH);
    assert.ok(scenes[2].includes('...and then nothing.'),
      'the continuation line belongs to INT. HALL - NIGHT, not to a scene of its own');
  });

  test('health no longer moves when a writer types an ellipsis', async () => {
    // PRE-change this pair differed (the phantom scene lifts the 140/sceneCount
    // scarcity term). It is the health figure that made row 6 a scoring bug
    // rather than a cosmetic one.
    const [a, b] = await Promise.all([runScriptDoctor(WITHOUT), runScriptDoctor(WITH)]);
    assert.equal(a.sceneCount, b.sceneCount);
    assert.equal(a.health, b.health);
  });
});

describe('scene grammar — (c) real forced headings still count', () => {
  test('a `.`-forced heading is a heading', () => {
    assert.equal(isSceneHeadingLine('.INT'), true);
    assert.equal(isSceneHeadingLine('.INT. WAREHOUSE - NIGHT'), true);
    assert.equal(isSceneHeadingLine('.THE VOID'), true);
    assert.equal(isSceneHeadingLine('.2 HOURS LATER'), true);
  });

  test('the standard vocabulary is unchanged', () => {
    for (const line of [
      'INT. KITCHEN - DAY', 'EXT. YARD', 'EST. THE CITY - DAWN', 'I/E. CAR - NIGHT',
      'INT./EXT. CAR - NIGHT', 'int. lowercase - day', 'INTERIOR HOUSE', 'EXTERIOR HOUSE',
      'INNEN. KÜCHE', 'AUSSEN. HOF',
    ]) {
      assert.equal(isSceneHeadingLine(line), true, `should be a heading: ${line}`);
    }
    for (const line of [
      'INTERCUT WITH:', 'INTO THE WOODS', 'ANA', 'She sets the cup down.', '',
    ]) {
      assert.equal(isSceneHeadingLine(line), false, `should not be a heading: ${line}`);
    }
  });

  test('a forced-heading script splits on its forced headings', () => {
    const forced = '.OPEN ON A FIELD\n\nWheat.\n\n.THE HOUSE\n\nA door.\n';
    assert.equal(scenesFromFountain(forced).length, 2);
    assert.equal(parserSceneCount(forced), 2);
  });
});

describe('scene grammar — (d) a plain INT./EXT. script is byte-identical', () => {
  test('runScriptDoctor output matches the pre-change snapshot exactly', async () => {
    // The snapshot was produced by running `runScriptDoctor` on this fixture in
    // a `git archive 26d930dd` checkout — the tree immediately before this
    // change. `analyzedAt` is stripped (a wall-clock stamp the doctor refreshes
    // on every call, including cache hits), and so is `provenance.engineCommit`
    // (a build stamp, not a score: `server/lib/build-info.ts` falls back to
    // this checkout's own HEAD SHA when `GIT_SHA` is unset, so it is
    // environment-dependent by design — see tests/core/build-info.test.ts —
    // and the doctor's own output-identity harness,
    // scripts/check-doctor-output-identity.mjs, treats it the same way via
    // `--ignore-keys` rather than requiring it to match across checkouts).
    // The snapshot was generated with `GIT_SHA=dev`; nothing else is stripped.
    const text = read('plain-int-ext.fountain');
    const report = await runScriptDoctor(text);
    const { analyzedAt: _ignored, ...stable } = report as unknown as Record<string, unknown>;
    const provenance = stable.provenance as Record<string, unknown> | undefined;
    if (provenance) {
      const { engineCommit: _engineCommit, ...restProvenance } = provenance;
      stable.provenance = restProvenance;
    }
    const expected = read('plain-int-ext.report.json');
    assert.equal(JSON.stringify(canonical(stable), null, 2) + '\n', expected);
  });

  test('the fixture is a plain INT./EXT. script with no ellipsis line', () => {
    const text = read('plain-int-ext.fountain');
    assert.equal(parserSceneCount(text), 16);
    assert.ok(!/^\.{2}/m.test(text), 'fixture must not contain a `..` line');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!isSceneHeadingLine(t)) continue;
      assert.ok(/^(INT|EXT)\./i.test(t), `fixture heading must be plain INT./EXT.: ${t}`);
    }
  });
});

describe('scene grammar — (e) forced headings in any Unicode script (decision 2026-09-20)', () => {
  // `FORCED_SCENE_HEADING_RE` used to be `/^\.(?=[A-Za-z0-9])/` — ASCII only.
  // Fountain's own rule is "a period followed by a character", not "a period
  // followed by an ASCII character", and the owner's own projects include
  // Armenian- and Russian-language material. Decided: any Unicode letter or
  // number after the dot (`\p{L}` / `\p{N}`) is a forced heading.

  test('a forced heading written in Cyrillic, Armenian or CJK is a heading', () => {
    // PRE-change: all four false — `М`, `Е`, `й` and `京` are not `[A-Za-z0-9]`.
    assert.equal(isSceneHeadingLine('.МОСКВА - ДЕНЬ'), true);
    assert.equal(isSceneHeadingLine('.ЕРЕВАН'), true);
    assert.equal(isSceneHeadingLine('.ԵՐԵՎԱՆ'), true);
    assert.equal(isSceneHeadingLine('.東京'), true);
  });

  test('`..`, `...` and a `.` followed by punctuation or a space are still not headings', () => {
    assert.equal(isSceneHeadingLine('.'), false);
    assert.equal(isSceneHeadingLine('..'), false);
    assert.equal(isSceneHeadingLine('...и потом'), false);
    assert.equal(isSceneHeadingLine('. МОСКВА'), false);
  });

  test('a 3-scene Cyrillic/Armenian/CJK forced-heading script splits into 3 scenes', async () => {
    const text = read('unicode-forced-headings.fountain');
    // PRE-change: scenesFromFountain saw 0 (no ASCII-forced or INT./EXT.
    // heading anywhere in the fixture) and the doctor's own sceneCount was 1
    // (the whole document read as a single unheaded scene).
    assert.equal(parserSceneCount(text), 3);
    assert.equal(scenesFromFountain(text).length, 3);
    const report = await runScriptDoctor(text);
    assert.equal(report.sceneCount, 3);
  });
});

