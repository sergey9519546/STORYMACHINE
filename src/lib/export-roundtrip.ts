// What each export format does on the way BACK IN — stated where the writer
// presses the button, and pinned by a round-trip test.
//
// ── Why this exists (2026-09-12, adversarial finding #18) ───────────────────
//
// "Export → re-import is not lossless, and the report changes." A writer who
// round-tripped a draft through Final Draft lost their title page, got
// `> FADE OUT.:` where they had written `FADE OUT.`, and got a different report
// on the file that came back than on the file they sent — with nothing anywhere
// in the product saying any of that would happen.
//
// Two of those were BUGS and are fixed (server/lib/fdx-import.ts: the
// <TitlePage> subtree is re-emitted as a Fountain title block instead of being
// deleted; a transition that already ends in a terminator keeps it). What is
// left is FORMAT, not defect, and this module is where it is said out loud.
//
// ── Round 2 (2026-09-12): the sentence was false in BOTH directions ─────────
//
// The review measured the claim above against the code and found it wrong
// twice over. Three of the four constructs it said were "not carried" WERE
// carried — as printed text: src/lib/fdx.ts mapped `section` and `synopsis` to
// FDX's Action type, and an inline `[[note]]` rode into the action line it sat
// in, so a writer's `# ACT ONE` came out of Final Draft as an action line in
// the script. And five constructs that DO print did not survive: dual dialogue,
// centered text, lyrics, a forced action line and a page break all came back as
// bare action, one of them (`!INT. THE MIND OF A KILLER`) as a scene heading,
// which made the round trip invent a scene.
//
// Both halves are fixed rather than reworded — see FDX_CONSTRUCT_FATE below,
// which is the disclosure as a table and is what the round-trip suite asserts
// construct by construct.
//
// ── MEASURED, on this repository's own inputs ───────────────────────────────
//
// `tests/core/export-roundtrip.test.ts` re-derives every number below.
// Exporting and re-importing `tests/fixtures/feature-length/assembled-feature.fountain`
// (231 scenes, 19,293 words, health 84.4):
//
//   format    words back   what is missing
//   .fountain     19,293   nothing — the same bytes (plus a title page, when the
//                          draft has none: see FOUNTAIN below)
//   .fdx          17,450   the boneyard comments (1,843 words in this fixture)
//   PDF text      17,447   the same, plus whatever page geometry cannot recover
//   .docx              —   there is no .docx importer at all
//
// (That fixture uses nothing but boneyard comments, which is why it could not
// catch the round-2 findings. tests/fixtures/fountain-constructs/
// every-construct.fountain carries one of each construct and is measured
// alongside it.)
//
// The FDX figure was 17,442 before the title-page and draft-date fixes, and the
// report on the returned file said health 84.8 against the original's 84.4. The
// remaining drift is the boneyard: text Fountain defines as never printed, which
// FDX, PDF and DOCX have no construct for, and which the analyzer already skips
// when it computes signals.
//
// Pure string constants. No I/O, safe in the browser bundle. NOT scoring-path.

/** The four formats the Ship panel exports, as the keys every surface uses. */
export type ExportFormat = 'fountain' | 'fdx' | 'pdf' | 'docx';

/**
 * One sentence per format: what happens if this file is brought back into
 * Story Machine. Written for a writer deciding which button to press, so each
 * one leads with the answer ("comes back whole" / "cannot be re-imported")
 * rather than with the caveat.
 */
export const EXPORT_ROUNDTRIP_NOTE: Record<ExportFormat, string> = {
  // ScriptIDE's exportFountain prepends a title page when the draft has none,
  // which is an ADDITION, not a loss — but it changes the script text and
  // therefore the content hash, so a writer who re-imports gets a report that
  // is not byte-for-byte the one they had. Said, rather than discovered.
  fountain:
    'Comes back whole — the same text, byte for byte. A draft with no title page '
    + 'gets one added on the way out, which changes its content hash.',
  fdx:
    'Everything that prints comes back: title page, scene headings, action, '
    + 'dialogue, transitions, dual dialogue, centered text, lyrics and page '
    + 'breaks. Fountain text that never prints — boneyard comments, notes '
    + '(inline ones too), synopses and section headings — is left out rather '
    + 'than carried, because Final Draft has no equivalent for it.',
  pdf:
    'Can be brought back, but a PDF carries no structure: each line is '
    + 'reconstructed from where it sits on the page, so line breaks and a few '
    + 'block types are re-inferred rather than restored. Non-printing text is not '
    + 'in the file at all.',
  docx:
    'Cannot be brought back — Story Machine has no .docx importer. Keep the '
    + '.fountain file as the copy you edit.',
};

/**
 * The one-paragraph version, for a surface with room for a sentence rather than
 * four. It is a SUMMARY of the four notes above, not a composition of them —
 * so tests/core/export-roundtrip.test.ts asserts it agrees with each of them on
 * the one fact that matters per format (re-importable or not, and whether
 * anything that prints is lost), which is the property a summary can actually
 * be held to.
 */
export const EXPORT_ROUNDTRIP_SUMMARY =
  'Coming back in: .fountain and .fdx re-import without losing anything that '
  + 'prints; .fdx leaves out Fountain comments, notes, synopses and section '
  + 'headings, which Final Draft has no construct for. A PDF is re-read from its '
  + 'page layout, so some line breaks are inferred. A .docx cannot be re-imported '
  + 'at all.';

/**
 * The Fountain constructs that are DEFINED as never printed, and are therefore
 * the exact set an export to a printed-page format does not carry.
 *
 * This is the disclosure's own definition of "the loss", and
 * tests/core/export-roundtrip.test.ts asserts the loss on real scripts is this
 * set and nothing else — which is what turns the sentence above from a hedge
 * into a claim with a gate under it.
 */
/**
 * What an FDX round trip does to every construct `src/lib/fountain.ts` parses.
 * This is the disclosure sentence above, itemised, and
 * tests/core/export-roundtrip.test.ts asserts each row on
 * tests/fixtures/fountain-constructs/every-construct.fountain — so the sentence
 * cannot drift from the behaviour without a test failing.
 *
 *   'survives'  — comes back as the same Fountain construct it went out as.
 *   'dropped'   — never printed, and deliberately not carried into the FDX
 *                 body (rather than promoted to a printed action line).
 *   'unforced'  — the one partial case: `!` is Fountain's force MARKER, not
 *                 content. It comes back only where Fountain would otherwise
 *                 misread the line (`!INT. …` keeps it and stays action);
 *                 where the line reads as action without it, it is dropped.
 *                 Forcing every all-caps action line instead would prefix `!`
 *                 to text the writer never forced.
 *
 * WHAT 'survives' DOES NOT COVER: paragraph GROUPING. FDX has one unit of body
 * text and it is the paragraph, so three action lines written without blank
 * lines between them come back as three paragraphs rather than one block.
 * MEASURED, and identical before and after this lane's rewrite — 3 source
 * paragraphs -> 5 on the same input, on both trees. Nothing is added, lost or
 * reordered, the analyzer reads the result the same way (no block type, scene
 * count or word count changes), and it is named here only because "everything
 * that prints comes back" is now an exact claim rather than a hedge, and this
 * is the one thing that legitimately changes shape.
 */
export const FDX_CONSTRUCT_FATE = {
  'dual dialogue (^)':            'survives',
  'centered text (> … <)':        'survives',
  'lyrics (~ …)':                 'survives',
  'page break (===)':             'survives',
  'forced action (! …)':          'unforced',
  'boneyard comments (/* … */)':  'dropped',
  'inline notes ([[ … ]])':       'dropped',
  'synopses (= …)':               'dropped',
  'section headings (# …)':       'dropped',
} as const satisfies Record<string, 'survives' | 'dropped' | 'unforced'>;

// SCOPE: these name the constructs `src/lib/fountain.ts` IMPLEMENTS, not the
// Fountain spec's fuller definitions. That parser opens a boneyard only at the
// start of a line and closes a note only on the line that opened it, so a
// `/* … */` begun mid-sentence and a `[[ … ]]` spanning two lines are ordinary
// ACTION in this product — they are scored as action and they print. See the
// scope note at the omission site in src/lib/fdx.ts for why that is the honest
// behaviour rather than a gap.
export const NON_PRINTING_FOUNTAIN_CONSTRUCTS = [
  'boneyard comments (/* … */)',
  'inline notes ([[ … ]])',
  'synopses (= …)',
  'section headings (# …)',
] as const;
