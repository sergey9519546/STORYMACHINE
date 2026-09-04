// Provenance headers in .fountain fixtures must be REAL Fountain comments.
//
// WHY THIS EXISTS (2026-09-04 corpus-integrity correction). Every fixture in
// data/screenplays/ — and the built-in sample screenplay the product ships to
// visitors — opened with a `//`-prefixed provenance/licence header. `//` is
// NOT Fountain comment syntax. Fountain's comment is the boneyard, `/* */`
// (src/lib/fountain.ts:110). Everything else that is not a slugline, cue,
// section, synopsis, note, lyric or transition is ACTION — so parseFountain
// typed those header lines `action`, segmentScenes folded them into scene 0,
// and the repository's own metadata was scored as though the author had
// written it.
//
// It was not a cosmetic leak. Measured across the 20 tracked CC0 scripts
// (see docs/p1-benchmark/MEASUREMENT_RECEIPTS.md, 2026-09-04):
//   * 10 of 20 headers contained DANGER_TENSION_WORDS ("DEATH-RECALL TAG",
//     "stabs NAME to death", "kills NAME"), which raised scene 1's
//     suspenseDelta on 13 of 20 scripts and made scene 1 the sole
//     peak-suspense scene of 9 of them. undertow.fountain's header alone
//     produced CLIMAX_TOO_EARLY @ Scene 1 and FALSE_CLIMAX @ Scene 1.
//   * 106 of the corpus's 237 detected clue seeds (44.7%) were header
//     tokens — `storymachine`, `agent`, `authored`, `recall-tag`,
//     `labeled-weakness` — so the setup/payoff channel was mostly reading
//     the repository's own filing system.
//
// WHAT THIS GUARD ASSERTS, in both directions:
//   1. No line of any tracked .fountain fixture starts with `//` — the exact
//      shape of the original defect, anywhere in the file, not just at the
//      top. (Nothing in the Fountain spec makes a leading `//` meaningful,
//      so this can never fire on legitimate screenplay text.)
//   2. Parsed through the REAL parser, no non-boneyard block carries a
//      provenance marker. This is the semantic half: it also catches
//      provenance pasted in as bare action with no comment prefix at all,
//      which `//`-scanning would miss.
//   3. The provenance is still THERE. data/screenplays/ and demo/corpus/ are
//      the CC0 licensing record; the fix for (1) and (2) is to move the text
//      into a boneyard, never to delete it. So each of those files must still
//      declare CC0 inside its boneyard. A future "fix" that quietly drops the
//      licence header fails here.
//
// Style follows tests/core/doctor-pool-call-sites.test.ts: a total,
// source-level scan that costs nothing and stops the pattern coming back in a
// file nobody thought to check.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFountain } from '../../src/lib/fountain.ts';
import { fountain as sampleFountain } from '../../src/lib/sample-script.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Directories walked for *.fountain. `data/` is gitignored as a whole but
 *  data/screenplays/ is force-added CC0 material (see
 *  data/screenplays/LICENSE-live-action.md), so it is scanned explicitly
 *  rather than discovered from git. */
const SCAN_ROOTS = ['data/screenplays', 'demo', 'tests/fixtures', 'evals'];

/** The subset that IS the licensing record and must keep a CC0 declaration. */
const LICENCE_BEARING = ['data/screenplays', 'demo/corpus'];

/** Vocabulary that means "this is repository metadata, not the drama".
 *  Drawn from the provenance headers actually present in this repo. */
const PROVENANCE_MARKERS = [
  /\bCC0\b/i,
  /public domain dedication/i,
  /original work (?:contributed|written) (?:to|for)/i,
  /AGENT-AUTHORED/i,
  /DEATH-RECALL TAG/i,
  /LABELED WEAKNESS/i,
  /craft calibration/i,
  /band design/i,
  /clean[- ]negative material/i,
  /not a substitute for/i,
  /docs\/p1-benchmark/i,
  /STORYMACHINE benchmark/i,
];

// DELIBERATELY NOT A MARKER: a bare `Author:` / `Title:` / `Credit:` line.
// Those are a Fountain TITLE PAGE, which is legitimate screenplay syntax a
// writer is entitled to use — several fixtures under
// tests/fixtures/feature-scale-discrimination/ and tests/fixtures/unicode-cues/
// have one. Flagging them here would make this guard a style rule about other
// people's title pages instead of a check that the REPOSITORY's own filing
// metadata stays out of the drama.
//
// It is worth being explicit that this is a scope decision, not an all-clear:
// src/lib/fountain.ts's parseFountain has no title-page handling at all, so
// `Title:`/`Credit:`/`Author:` lines are typed `action` and scored exactly the
// way the `//` headers were. That is a PARSER defect that affects real user
// scripts (title pages are ordinary in submitted drafts), not a data defect in
// these fixtures, and it is recorded as an open finding in
// docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md's 2026-09-04 correction
// note rather than fixed here — changing what the parser feeds the analyzer is
// a scoring change and needs a real-corpus measurement this correction did not
// run.

function walkFountain(dir: string): string[] {
  const abs = path.join(REPO, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(abs).sort()) {
    const rel = path.join(dir, entry);
    if (statSync(path.join(REPO, rel)).isDirectory()) out.push(...walkFountain(rel));
    else if (entry.endsWith('.fountain')) out.push(rel);
  }
  return out;
}

const FILES = SCAN_ROOTS.flatMap(walkFountain);

/** The product's built-in sample is a Fountain string embedded in TypeScript,
 *  not a file on disk — it carried the identical header and is checked with
 *  exactly the same rules. */
const SOURCES: Array<{ name: string; text: string; licenceBearing: boolean }> = [
  ...FILES.map(f => ({
    name: f,
    text: readFileSync(path.join(REPO, f), 'utf8'),
    licenceBearing: LICENCE_BEARING.some(d => f.startsWith(`${d}${path.sep}`) || f.startsWith(`${d}/`)),
  })),
  { name: 'src/lib/sample-script.ts (exported `fountain`)', text: sampleFountain, licenceBearing: true },
];

describe('fixture provenance headers are real Fountain comments, not scored action', () => {
  it('the scan actually found the fixture corpus (a silently empty scan is not a pass)', () => {
    assert.ok(FILES.length >= 30, `expected the tracked .fountain corpus, found ${FILES.length} file(s)`);
    assert.ok(
      FILES.filter(f => f.startsWith('data/screenplays')).length === 20,
      'expected the 20 tracked CC0 live-action scripts under data/screenplays/',
    );
  });

  for (const src of SOURCES) {
    it(`${src.name}: no line begins with \`//\` (not Fountain comment syntax — it parses as action)`, () => {
      const offenders = src.text
        .split('\n')
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => line.startsWith('//'));
      assert.deepEqual(
        offenders.map(o => `${o.n}: ${o.line}`),
        [],
        'use a /* */ boneyard — `//` is scored as screenplay text',
      );
    });

    it(`${src.name}: no provenance marker reaches a non-boneyard block`, () => {
      const leaked = parseFountain(src.text)
        .filter(b => b.type !== 'boneyard' && b.type !== 'empty')
        .filter(b => PROVENANCE_MARKERS.some(re => re.test(b.text.trim())))
        .map(b => `line ${b.lineNumber} [${b.type}]: ${b.text.trim().slice(0, 80)}`);
      assert.deepEqual(leaked, [], 'repository metadata is being parsed as screenplay content');
    });

    if (src.licenceBearing) {
      it(`${src.name}: the CC0 licensing record is preserved inside the boneyard`, () => {
        const boneyard = parseFountain(src.text)
          .filter(b => b.type === 'boneyard')
          .map(b => b.text)
          .join('\n');
        assert.match(
          boneyard,
          /\bCC0\b/,
          'provenance must be MOVED into a boneyard, never deleted — this is the licensing record',
        );
      });
    }
  }
});
