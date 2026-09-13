// canonical-fountain.test.ts — the packed-input repair pass, and the forced
// markers it has to see.
//
// WHY THIS FILE EXISTS (2026-09-13, round 2 of the renderer-residuals lane).
// `canonical-fountain.ts` had NO test of its own and nothing under `npm test`
// imported `formatCanonicalFountain` — its only consumers are three
// `scripts/probe-*.mjs` that the suite does not run. The lane before this one
// changed its behaviour (it taught `isTransition` the forced marker) and added
// no assertion, which the round-1 review called out: a surface touched without
// a test is a surface whose next change is unguarded.
//
// WHAT IT COVERS. The SINGLE-SPACED / PACKED archetype, which is the one this
// file handles alone (the double-spaced one hands off to normalizeScreenplay
// and is covered by screenplay-normalizer.test.ts and
// tests/core/parse-format-invariance.test.ts). In packed input nothing is
// separated by blank lines, so parseFountain cannot see any element that needs
// adjacency; this pass INSERTS the blank lines around every structural line it
// recognises. A structural line it does not recognise stays glued to its
// neighbours, and that is the defect class the assertions below guard.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCanonicalFountain } from './canonical-fountain.ts';
import { parseFountain } from '../../../src/lib/fountain.ts';

/** Element types of the canonicalised text, blanks dropped. */
const typesOf = (packed: string): string[] =>
  parseFountain(formatCanonicalFountain(packed).text)
    .filter((b) => b.type !== 'empty')
    .map((b) => b.type);

const packed = (...lines: string[]) => lines.join('\n');

describe('formatCanonicalFountain — packed input and Fountain\'s forced markers', () => {
  it('a forced transition survives the packed repair as a TRANSITION', () => {
    // FIRES. On a `git archive 089bec91` export — the tree before the
    // forced-transition branch — this same input canonicalises to
    // `scene_heading,action,action,character,dialogue`: the marked line is
    // action prose carrying a literal ">". Two things had to be true for it to
    // read `transition` here, and the test covers both at once: the PARSER has
    // to read the marker, and THIS pass has to recognise the line as structural
    // so it gets the blank lines parseFountain needs.
    assert.deepEqual(
      typesOf(packed(
        'INT. OFFICE - DAY',
        'Mary closes the file.',
        '>SMASH TO BLACK.',
        'MARY',
        'It is over now.',
      )),
      ['scene_heading', 'action', 'transition', 'character', 'dialogue'],
      'a `>` line in packed input must come out of the repair typed `transition` — `SMASH TO BLACK.` is '
      + 'a transition NO inferred rule in this parser reaches, so only the marker can say what it is',
    );
  });

  it('an inferred transition is unaffected, forced or not', () => {
    // The control for the row above: a wording the inferred grammar DOES reach
    // canonicalises the same way with or without the marker, so the assertion
    // above is about the marker rather than about transitions in general.
    const withMarker = typesOf(packed('INT. A - DAY', 'Mary closes the file.', '>CUT TO:', 'INT. B - DAY', 'Rain falls.'));
    const without = typesOf(packed('INT. A - DAY', 'Mary closes the file.', 'CUT TO:', 'INT. B - DAY', 'Rain falls.'));
    assert.deepEqual(withMarker, without,
      '`>CUT TO:` and `CUT TO:` are the same element; the marker only ever declares');
    assert.deepEqual(withMarker, ['scene_heading', 'action', 'transition', 'scene_heading', 'action']);
  });

  it('centered text gets its own block instead of being glued to its neighbours', () => {
    // The shape the round-1 review found missing from the normaliser's twin of
    // this list. Here it is a TEXT-SHAPE claim, not an element one: the
    // centering already parsed correctly (parseFountain needs no adjacency for
    // `>text<`), but the repair pass emitted it packed against the lines above
    // and below, which is not what "the output the corpus SHOULD store" means.
    // On a `git archive 0944b4f9` export the same input yields
    // "Rain falls hard.\n>THE END<\nMary walks out of frame." — one run of
    // three lines.
    const { text, method } = formatCanonicalFountain(packed(
      'INT. OFFICE - DAY',
      'Mary closes the file.',
      'She looks up at the window.',
      'EXT. STREET - NIGHT',
      'Rain falls hard.',
      'MARY',
      'It is over now.',
      '>THE END<',
      'Mary walks out of frame.',
    ));
    // The archetype matters: a document too short or too blank-line-rich takes
    // `clean-pass-through` and never reaches the repair this test is about.
    assert.equal(method, 'repair-single-spaced',
      'this fixture must take the packed repair branch or it proves nothing');
    assert.match(text, /\n\n>THE END<\n\n/,
      'a centered line must be separated from its neighbours like any other structural line');
    assert.deepEqual(
      parseFountain(text).filter((b) => b.type !== 'empty').map((b) => b.type),
      ['scene_heading', 'action', 'action', 'scene_heading', 'action', 'character', 'dialogue', 'centered', 'action'],
    );
  });

  it('the three shapes that are NOT a forced transition keep the character they typed', () => {
    // DOES NOT FIRE, all three, and none of them may become a transition.
    assert.deepEqual(
      typesOf(packed('INT. A - DAY', 'Mary closes the file.', 'She looks up.', '> THE END <', 'Rain falls.')),
      ['scene_heading', 'action', 'action', 'centered', 'action'],
      '`>text<` is centering and must never be eaten by the transition branch',
    );
    assert.deepEqual(
      typesOf(packed('INT. A - DAY', 'Mary closes the file.', 'She looks up.', '>', 'Rain falls.')),
      ['scene_heading', 'action', 'action', 'action', 'action'],
      'a bare `>` declares no element; stripping it would leave an empty line, so it stays what was typed',
    );
  });

  it('in PACKED input a `>` after a dialogue line is pulled out of the speech — like every other structural line, and unlike the parser on spaced text', () => {
    // A consequence of the forced-transition widening, measured rather than
    // assumed, and worth pinning because it looks at first like a contradiction
    // of the parser's rule that a `>` line does NOT break a dialogue block.
    //
    // It is not a contradiction, it is what PACKED means. This archetype has no
    // blank lines at all, so "inside a speech" is not a fact the text carries —
    // the pass has to decide where every block begins, and it already decides
    // that for headings, cues and INFERRED transitions. Measured on a
    // `git archive 089bec91` export, the inferred transition was pulled out and
    // the forced one was not; the widening is what makes the two agree.
    const infer = typesOf(packed('INT. A - DAY', 'MARY', 'Goodbye.', 'CUT TO:', 'INT. B - DAY', 'Rain falls.'));
    const forced = typesOf(packed('INT. A - DAY', 'MARY', 'Goodbye.', '>MATCH DISSOLVE:', 'INT. B - DAY', 'Rain falls.'));
    assert.deepEqual(infer, ['scene_heading', 'character', 'dialogue', 'transition', 'scene_heading', 'action'],
      'the inferred transition has always been pulled out of a packed speech; if that changed, this test is about the wrong thing');
    assert.deepEqual(forced, infer,
      'a FORCED transition must be treated exactly as an inferred one in packed input — at 089bec91 this '
      + 'read ...,dialogue,dialogue,... and the marked line stayed in the speech');

    // The other direction, and the reason the parser's rule is not violated: on
    // text that HAS blank lines, both stay inside the speech, because there the
    // absence of a blank line is information the writer supplied.
    const spaced = (line: string) => parseFountain(`INT. A - DAY\n\nMARY\nGoodbye.\n${line}\n\nINT. B - DAY\n\nRain falls.\n`)
      .filter((b) => b.type !== 'empty').map((b) => b.type);
    assert.deepEqual(spaced('>MATCH DISSOLVE:'), spaced('CUT TO:'),
      'on spaced text the two must also agree — and there they agree on `dialogue`');
    assert.deepEqual(spaced('>MATCH DISSOLVE:'),
      ['scene_heading', 'character', 'dialogue', 'dialogue', 'scene_heading', 'action']);
  });
});
