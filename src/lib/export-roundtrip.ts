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
    'Comes back whole, except Fountain comments, notes, synopses and section '
    + 'headings: Final Draft has no equivalent for text that is never printed, so '
    + 'they are not carried. Everything that prints — title page, scene headings, '
    + 'action, dialogue, transitions — survives the round trip.',
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
  + 'prints; .fdx drops Fountain comments and notes, which Final Draft has no '
  + 'construct for. A PDF is re-read from its page layout, so some line breaks are '
  + 'inferred. A .docx cannot be re-imported at all.';

/**
 * The Fountain constructs that are DEFINED as never printed, and are therefore
 * the exact set an export to a printed-page format does not carry.
 *
 * This is the disclosure's own definition of "the loss", and
 * tests/core/export-roundtrip.test.ts asserts the loss on real scripts is this
 * set and nothing else — which is what turns the sentence above from a hedge
 * into a claim with a gate under it.
 */
export const NON_PRINTING_FOUNTAIN_CONSTRUCTS = [
  'boneyard comments (/* … */)',
  'inline notes ([[ … ]])',
  'synopses (= …)',
  'section headings (# …)',
] as const;
