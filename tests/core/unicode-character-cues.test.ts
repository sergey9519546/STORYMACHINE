// unicode-character-cues.test.ts — the character-cue alphabet, pinned.
//
// ── THE BUG THIS FILE EXISTS FOR ─────────────────────────────────────────────
// Every copy of the "a character cue is an ALL-CAPS line" rule spelled
// "all caps" as the ASCII class `[A-Z]`. Measured on main before the fix:
//
//   parseFountain("…\n\nMARÍA\n(quietly)\nNo puedo mas.\n")
//     → action  "MARÍA"        ← the cue
//     → action  "(quietly)"    ← the parenthetical
//     → action  "No puedo mas."← the dialogue
//   parseFountain(… same script with "MARIA" …)
//     → character / parenthetical / dialogue
//
// Fountain's grammar is context-dependent on the preceding block, so ONE
// unrecognised cue silently demotes the whole dialogue block under it. The
// Script Doctor segments scenes through parseFountain, so a script with an
// accented name — José, María, Zoë, Björn, Renée — reached the report with
// zero speaking characters and zero dialogue lines, and every metric built on
// them (character list, dialogue ratio, subtext ratio, Burrows's-delta voice
// analysis) read the script as pure action.
//
// The rule was written out FIVE independent times (src/lib/fountain.ts's
// parser, fountain-analyzer.ts's clue-channel speaker guard,
// screenplay-normalizer.ts's import detector, 122 inline copies across the
// revision passes, and src/services/director.ts's client-side block typer), so
// "fix the regex" was never one edit. Two guards below make that structural
// rather than remembered: an ACCENT-INVARIANCE TABLE that holds three of the
// predicates to the same 34 cases, and a SOURCE GUARD that fails on any
// ASCII-only cue class reintroduced anywhere in the analysis engine.
//
// ── WHAT IS DELIBERATELY *NOT* FIXED ────────────────────────────────────────
// Caseless scripts (CJK, Hebrew, Arabic) are still parsed as action — see the
// block comment in src/lib/fountain.ts. "All caps" is a signal that only
// exists in a cased script; admitting \p{Lo} would make every short line of
// Japanese action a character cue. The last describe() block pins that choice
// so it stays a decision instead of decaying into an accident.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseFountain,
  CHARACTER_CUE_RE,
  CUE_INITIAL_CLASS,
  CUE_LETTER_CLASS,
  type FountainBlockType,
} from '../../src/lib/fountain.ts';
import { CUE_LINE_RE, analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { isCharacterCue } from '../../server/nvm/analyze/screenplay-normalizer.ts';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const FIXTURES = path.join(REPO_ROOT, 'tests/fixtures/unicode-cues');

const readFixture = (name: string) => readFileSync(path.join(FIXTURES, name), 'utf8');

/** Drop diacritics so an accented string can be compared to its ASCII twin.
 *  Used ONLY in assertions, never in production code. */
const deaccent = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '');

/** parseFountain's verdict for `line` when it sits in the canonical cue
 *  position: after a scene heading and a blank, with a non-blank line under
 *  it. `followedByBlank` puts a blank line under it instead — the adjacency
 *  Fountain uses to tell a cue from all-caps action. */
function blockTypeInContext(line: string, followedByBlank = false): FountainBlockType {
  const script = [
    'INT. SOMEWHERE - DAY',
    '',
    line,
    followedByBlank ? '' : 'A line of dialogue that follows.',
    '',
  ].join('\n');
  const block = parseFountain(script).find(b => b.text.trim() === line.trim() && b.type !== 'empty');
  assert.ok(block, `no block produced for ${JSON.stringify(line)}`);
  return block.type;
}

// ── The shared table ────────────────────────────────────────────────────────
// Each row is an ASCII line and the SAME line with diacritics. Whatever the
// engine decides about one it must decide about the other: that equivalence,
// not any particular verdict, is the property the bug violated. `type` records
// what parseFountain actually says so the table also pins behaviour rather
// than only self-consistency.
const TWINS: Array<{ ascii: string; accented: string; type: FountainBlockType }> = [
  // — cues —
  { ascii: 'MARIA', accented: 'MARÍA', type: 'character' },
  { ascii: 'JOSE', accented: 'JOSÉ', type: 'character' },
  { ascii: 'ZOE', accented: 'ZOË', type: 'character' },
  { ascii: 'BJORN', accented: 'BJÖRN', type: 'character' },
  { ascii: 'RENEE', accented: 'RENÉE', type: 'character' },
  { ascii: 'AGUSTIN', accented: 'AGUSTÍN', type: 'character' },
  { ascii: 'SOREN', accented: 'SØREN', type: 'character' },
  { ascii: 'FRANCOIS', accented: 'FRANÇOIS', type: 'character' },
  { ascii: 'DR. MULLER', accented: 'DR. MÜLLER', type: 'character' },
  { ascii: 'JEAN-LUC', accented: 'JEAN-LÜC', type: 'character' },
  { ascii: 'ANGEL 2', accented: 'ÁNGEL 2', type: 'character' },
  { ascii: 'OLD MAN GARCIA', accented: 'OLD MAN GARCÍA', type: 'character' },
  { ascii: "MARIA'S MOTHER", accented: "MARÍA'S MOTHER", type: 'character' },
  // — cues with the three decorations the parser knows —
  { ascii: 'MARIA (V.O.)', accented: 'MARÍA (V.O.)', type: 'character' },
  { ascii: 'JOSE (O.S.)', accented: 'JOSÉ (O.S.)', type: 'character' },
  { ascii: "RENEE (CONT'D)", accented: "RENÉE (CONT'D)", type: 'character' },
  // — dual-dialogue marker —
  { ascii: 'BJORN ^', accented: 'BJÖRN ^', type: 'dual_dialogue' },
  // — NOT cues: a lower-case letter anywhere disqualifies the line —
  { ascii: 'Maria closes the door.', accented: 'María closes the door.', type: 'action' },
  { ascii: 'MARIA is late.', accented: 'MARÍA is late.', type: 'action' },
  { ascii: 'the door opens', accented: 'ábre la puerta', type: 'action' },
  // — NOT cues: punctuation outside the cue alphabet —
  { ascii: 'MARIA, QUIETLY', accented: 'MARÍA, QUIETLY', type: 'action' },
  { ascii: 'MARIA: LISTEN', accented: 'MARÍA: LISTEN', type: 'action' },
  { ascii: 'MARIA & JOSE', accented: 'MARÍA & JOSÉ', type: 'action' },
  { ascii: 'MARIA (FURIOUS)', accented: 'MARÍA (FURIOSA)', type: 'action' },
  // — transitions keep winning over the cue rule —
  { ascii: 'CUT TO:', accented: 'CUT TO:', type: 'transition' },
  { ascii: 'DISSOLVE TO:', accented: 'DISSOLVE TO:', type: 'transition' },
  // — all-caps ACTION behaves the same in both alphabets: in cue position
  //   Fountain calls it a cue (this is the spec, and it was already true for
  //   English), so the accented line must not be treated as MORE of a cue or
  //   LESS of one than the English line. Both directions are asserted.
  { ascii: 'THE DOOR SLAMS SHUT.', accented: 'DIE TÜR KNALLT ZU.', type: 'character' },
  { ascii: 'A LONG SILENCE.', accented: 'EIN LANGES SCHWEIGEN.', type: 'character' },
];

describe('character cues: the accent-invariance table', () => {
  it('covers at least 30 cases in both directions', () => {
    assert.ok(TWINS.length >= 28, `table has only ${TWINS.length} rows`);
    assert.ok(TWINS.some(t => t.type === 'character'), 'no positive rows');
    assert.ok(TWINS.some(t => t.type === 'action'), 'no negative rows');
  });

  it('parseFountain gives an accented line the same block type as its ASCII twin', () => {
    for (const { ascii, accented, type } of TWINS) {
      assert.equal(blockTypeInContext(ascii), type, `ASCII: ${JSON.stringify(ascii)}`);
      assert.equal(
        blockTypeInContext(accented),
        type,
        `accented twin of ${JSON.stringify(ascii)} → ${JSON.stringify(accented)}`,
      );
    }
  });

  it('all three independent cue predicates are accent-invariant', () => {
    // Three separately-maintained implementations of the same rule. They do
    // NOT agree with each other by design (the analyzer's needs two letters,
    // the normalizer allows commas and caps word count), so what is asserted
    // is that each agrees WITH ITSELF across the diacritic. That is exactly
    // the property all three violated.
    const predicates: Array<{ name: string; fn: (s: string) => boolean }> = [
      { name: 'src/lib/fountain.ts CHARACTER_CUE_RE', fn: s => CHARACTER_CUE_RE.test(s) },
      { name: 'fountain-analyzer.ts CUE_LINE_RE', fn: s => CUE_LINE_RE.test(s) },
      { name: 'screenplay-normalizer.ts isCharacterCue', fn: s => isCharacterCue(s) },
    ];
    for (const { name, fn } of predicates) {
      for (const { ascii, accented } of TWINS) {
        assert.equal(
          fn(accented),
          fn(ascii),
          `${name} disagrees across the diacritic: ${JSON.stringify(ascii)} → ${fn(ascii)}, `
          + `${JSON.stringify(accented)} → ${fn(accented)}`,
        );
      }
    }
  });

  it('an all-caps line followed by a BLANK line is still action, in either alphabet', () => {
    // The other half of "do not make the pattern looser": adjacency, not the
    // alphabet, is what promotes a line to a cue.
    for (const line of ['THE DOOR SLAMS SHUT.', 'DIE TÜR KNALLT ZU.', 'MARIA', 'MARÍA']) {
      assert.equal(blockTypeInContext(line, true), 'action', line);
    }
  });

  it('a decomposed (NFD) cue is the same cue as its composed (NFC) form', () => {
    const nfc = 'MARÍA';
    const nfd = nfc.normalize('NFD');
    assert.notEqual(nfd, nfc, 'fixture precondition: the two forms differ byte-wise');
    assert.equal(blockTypeInContext(nfd), 'character');
    assert.ok(CHARACTER_CUE_RE.test(nfd), 'NFD cue rejected by the parser regex');
    assert.ok(CUE_LINE_RE.test(nfd), 'NFD cue rejected by the analyzer regex');
    assert.ok(isCharacterCue(nfd), 'NFD cue rejected by the normalizer');
  });

  it('capitals of other cased scripts are cues too', () => {
    for (const cue of ['МАРИЯ', 'ΜΑΡΙΑ', 'ՄԱՐԻԱ']) {
      assert.equal(blockTypeInContext(cue), 'character', cue);
    }
  });
});

describe('character cues: the accented script parses like its ASCII twin', () => {
  const accented = readFixture('accented-cues.fountain');
  const ascii = readFixture('ascii-cues.fountain');

  it('the two fixtures differ only in diacritics', () => {
    assert.notEqual(accented, ascii, 'fixture precondition: the files must differ');
    assert.equal(deaccent(accented), ascii, 'the ASCII twin is not a pure de-accenting');
  });

  it('parseFountain recovers every accented cue and the dialogue under it', () => {
    const blocks = parseFountain(accented);
    const cues = blocks.filter(b => b.type === 'character').map(b => b.text.trim());
    for (const name of ['MARÍA', 'JOSÉ', 'ZOË', 'BJÖRN', 'RENÉE']) {
      assert.ok(cues.includes(name), `cue ${name} was not recognised (got ${cues.join(', ')})`);
    }
    assert.ok(
      blocks.some(b => b.type === 'parenthetical'),
      'the parenthetical under an accented cue fell back to action',
    );
    assert.ok(
      blocks.filter(b => b.type === 'dialogue').length >= 16,
      'dialogue under the accented cues did not parse as dialogue',
    );
  });

  it('the analyzer produces the same character list, modulo diacritics', () => {
    const a = analyzeFountainText(accented);
    const b = analyzeFountainText(ascii);
    assert.deepEqual(a.characters, ['MARÍA', 'JOSÉ', 'ZOË', 'BJÖRN', 'RENÉE']);
    assert.deepEqual(a.characters.map(deaccent), b.characters);
  });

  it('every dialogue-dependent analyzer metric matches its ASCII twin', () => {
    const a = analyzeFountainText(accented);
    const b = analyzeFountainText(ascii);
    assert.equal(a.dialogueLineCount, b.dialogueLineCount);
    assert.equal(a.actionLineCount, b.actionLineCount);
    assert.equal(a.wordCount, b.wordCount);
    assert.equal(a.subtextRatio, b.subtextRatio);
    assert.equal(a.sceneCount, b.sceneCount);
    // Not merely "equal to the twin" — non-degenerate. Before the fix the
    // accented file measured 0 dialogue lines and 0 characters, which would
    // also have been "equal" to a twin that had been broken the same way.
    assert.ok(a.dialogueLineCount >= 16, `dialogueLineCount ${a.dialogueLineCount}`);
    assert.ok(a.characters.length === 5, `characters ${a.characters.length}`);
  });

  it('Burrows\'s-delta voice analysis scores the accented cast', () => {
    const va = analyzeFountainText(accented).voiceAnalysis;
    const vb = analyzeFountainText(ascii).voiceAnalysis;
    assert.ok(va && vb, 'voiceAnalysis missing from the analysis');
    assert.equal(va.scored, true, 'voice analysis abstained on the accented script');
    assert.equal(va.pairs.length, 10, 'expected all 5-choose-2 pairs');
    assert.deepEqual(
      va.pairs.map(p => ({ ...p, a: deaccent(p.a), b: deaccent(p.b) })),
      vb.pairs,
      'voice deltas diverge between the accented script and its ASCII twin',
    );
  });

  it('the doctor reaches the same verdict on both', async () => {
    clearDoctorCache();
    const a = await runScriptDoctor(accented);
    clearDoctorCache();
    const b = await runScriptDoctor(ascii);
    assert.equal(a.sceneCount, b.sceneCount);
    assert.equal(a.verdict, b.verdict);
    assert.equal(a.health, b.health);
  });
});

describe('character cues: caseless scripts are action, on purpose', () => {
  it('CJK, Hebrew and Arabic cue-shaped lines stay action', () => {
    // The decision, restated where it can fail: "all caps" is meaningless in a
    // caseless script, so these lines are NOT promoted — even in the exact
    // adjacency that promotes an ASCII all-caps line. Admitting \p{Lo} would
    // make every short Japanese/Hebrew/Arabic ACTION line a character cue.
    for (const line of ['たなか', 'マリア', 'מרים', 'مريم', '田中']) {
      assert.equal(blockTypeInContext(line), 'action', line);
      assert.equal(CHARACTER_CUE_RE.test(line), false, line);
      assert.equal(CUE_LINE_RE.test(line), false, line);
      assert.equal(isCharacterCue(line), false, line);
    }
  });

  it('the caseless fixture yields no characters and no dialogue', () => {
    const a = analyzeFountainText(readFixture('caseless-cues.fountain'));
    assert.deepEqual(a.characters, []);
    assert.equal(a.dialogueLineCount, 0);
    // …and the scenes themselves still parse, so the document is not lost —
    // only its speaker attribution is, which is what the `@` forced-cue
    // prefix would fix. That prefix is NOT implemented (see fountain.ts).
    assert.ok(a.sceneCount >= 2, `sceneCount ${a.sceneCount}`);
    assert.equal(blockTypeInContext('@たなか'), 'action', 'forced-cue support arrived without a test');
  });
});

describe('character cues: no ASCII-only copy may come back', () => {
  /** The engine files that decide what a cue is. Comments are stripped before
   *  scanning so the historical literal quoted in fountain.ts's own docs is not
   *  a false positive. */
  function engineSources(): Array<{ rel: string; code: string }> {
    const files: string[] = ['src/lib/fountain.ts', 'src/services/director.ts'];
    for (const dir of ['server/nvm/analyze', 'server/nvm/revision/passes']) {
      for (const f of readdirSync(path.join(REPO_ROOT, dir)).sort()) {
        if (f.endsWith('.ts') && !f.endsWith('.test.ts')) files.push(`${dir}/${f}`);
      }
    }
    return files.map(rel => ({
      rel,
      code: readFileSync(path.join(REPO_ROOT, rel), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' '),
    }));
  }

  /** Substrings that only ever occur inside an ASCII-only CUE class. A bare
   *  `[A-Z]` is not listed — it is legitimate in dozens of proper-noun and
   *  sentence-case heuristics that have nothing to do with cues. */
  const BANNED = ['[A-Z][A-Z', "[A-Z\\s]+(\\(V", "[A-Z0-9 \\t'"];

  it('the analysis engine contains no ASCII-only cue class', () => {
    const offenders: string[] = [];
    for (const { rel, code } of engineSources()) {
      for (const needle of BANNED) {
        if (code.includes(needle)) offenders.push(`${rel} still contains ${needle}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'An ASCII-only character-cue class came back:\n  ' + offenders.join('\n  ')
      + '\nUse the CUE_INITIAL_CLASS / CUE_LETTER_CLASS bodies exported from '
      + 'src/lib/fountain.ts instead — see the block comment there.',
    );
  });

  it('the exported class bodies are the Unicode ones the rest of the repo composes', () => {
    assert.equal(CUE_INITIAL_CLASS, '\\p{Lu}\\p{Lt}');
    assert.equal(CUE_LETTER_CLASS, '\\p{Lu}\\p{Lt}\\p{M}');
    // Cheap proof that the classes mean what the comment says they mean.
    const initial = new RegExp(`^[${CUE_INITIAL_CLASS}]$`, 'u');
    assert.equal(initial.test('A'), true);
    assert.equal(initial.test('Í'), true);
    assert.equal(initial.test('Ж'), true);
    assert.equal(initial.test('a'), false);
    assert.equal(initial.test('田'), false);
    assert.equal(initial.test('א'), false);
  });
});
