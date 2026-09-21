// Shared scene splitter for the analyze/ modules. Splits raw Fountain into
// ordered scene texts at the boundaries THE DOCTOR ITSELF sees — one grammar,
// `isSceneHeadingLine` in `src/lib/fountain.ts`, reached here through that
// file's `sceneHeadingLineIndices` so that boneyard suppression matches
// `parseFountain` too.
//
// This is the single home for the splitter that had been re-derived,
// byte-identically, across a dozen signal modules (emotional-arc,
// scene-economy, theme-extract, cold-open-promise, bonding-signal,
// disclosure-ledger, genre-obligation, mirror-scene, pattern-establishment,
// silence-signal, story-spine, scene-value-shift), and since 2026-09-20 also
// of the copy that lived inline in `doctor.ts`'s `buildAccelerationStrength`.
//
// ── What changed on 2026-09-20, and why it was a defect and not a dialect ──
// Until this date the splitter was:
//
//     fountain.split(/^(?=(?:INT|EXT)\.)/mi).filter(p => /^(?:INT|EXT)\./i.test(p))
//
// and this file's own header called canonicalising it "a SEPARATE,
// scoring-gated change" and deferred it. The deferral has been paid: the
// consequence, verified and recorded as row 5 of SESSION_REPORT_2026-09-19.md,
// is that on a screenplay whose headings are `EST.`, `I/E.`, `INT./EXT.` or
// Fountain forced `.HEADINGS` — all standard, all present in real drafts, and
// several of the project's own corpus scripts (Ratatouille, Coco, Up) are
// written that way — this splitter returned a handful of scenes, or none,
// where the doctor's own `sceneCount` saw the whole film. Everything built on
// it inherited that blindness:
//
//   * `computeEmotionalArc(scenesFromFountain(fountain))` feeds
//     `arcIncoherenceDeduction`, gated at ARC_DED_MIN_SCENES = 15
//     (`doctor.ts`) — the ONE feature-scale deduction wired into health. Below
//     the gate it does not fire, so on those scripts the deduction was not
//     wrong, it was absent.
//   * mirror-scene, pattern-establishment, silence-signal, disclosure-ledger,
//     genre-obligation, scene-economy, scene-value-shift and theme-extract all
//     silently saw a different film from the one the report's scene count
//     described.
//
// A splitter that disagrees with the engine's own scene count is not a
// "dialect"; it is two answers to one question. There is now one answer.
//
// ── Byte-compatibility on the scripts that already worked ─────────────────
// For a script whose headings are all unindented `INT.`/`EXT.` and which has
// no `..`/`...` line and no boneyard, the returned slices are byte-identical
// to the old split, terminators included: the old regex split immediately
// before a heading's first character with `^` matching after a `\n`, and the
// line-slice join below cuts at exactly the same offsets. `tests/core/
// scene-grammar.test.ts` (d) pins that against a snapshot taken from the
// pre-change tree, and the 45-fixture output-identity harness is the
// document-level version of the same proof.
//
// ── A bare `\r` was invisible here, even though the doctor could see it
//    (2026-09-20, scene-split-cr-and-recipe-v4 lane, review finding 6) ──────
// `parseFountain` (`src/lib/fountain.ts`) splits on `text.split('\n')` alone,
// so a line ending in a lone `\r` (classic Mac line endings, still produced
// by some older screenwriting tools and PDF extractors) is not a line break
// to it: the whole document reads as one line, and `sceneHeadingLineIndices`
// — which this function calls directly on the RAW argument — sees at most one
// heading. Meanwhile `analyzeFountainText`, the doctor's own entry point,
// normalizes `\r\n?` -> `\n` before it ever reaches `parseFountain`
// (`screenplay-normalizer.ts`), so `runScriptDoctor`'s reported `sceneCount`
// was already correct on the same CR-only text that this function undercounted
// — and `doctor.ts` (`buildAccelerationStrength` and the two
// `computeEmotionalArc(scenesFromFountain(fountain))` call sites) hands this
// function the UNNORMALIZED raw text, so the arc and every signal module built
// on `scenesFromFountain` (mirror-scene, pattern-establishment, silence-signal,
// disclosure-ledger, genre-obligation, scene-economy, scene-value-shift,
// theme-extract, cold-open-promise, bonding-signal) saw a different scene
// count from the report they were computed for, on the exact class of input
// this file's 2026-09-20 change set out to close (row 5). VERIFIED by probe:
// `'INT. A - DAY\rSomething.\rEXT. B - NIGHT\rMore.\r'` splits into 1 scene
// here, 2 by `analyzeFountainText`.
//
// The fix is a normalize at the top of this function, not a change to
// `parseFountain` or to the doctor's call sites (out of this lane's scope):
// `\r\n?` -> `\n`, exactly the pattern `screenplay-normalizer.ts` already
// applies, so a CRLF or bare-CR script now sees the SAME heading boundaries —
// and the same scene TEXT, terminators included — as its LF twin. CRLF
// already produced the right scene COUNT before this change (`\n` is present,
// so `String.split('\n')` already found every line; `.trim()` in
// `isSceneHeadingLine` already discarded the trailing `\r`), so this is not a
// behavior change for CRLF input's heading detection — but the returned SLICE
// BYTES do change for CRLF and CR-only alike, from whatever terminator the
// source used to a bare `\n`, because the alternative (normalizing only when
// a bare `\r` is present) would leave CRLF and CR-only scripts producing
// non-identical scene text for byte-identical content, which is the same
// "two answers to one question" defect this file exists to close. Downstream
// consumers only ever read scene text for words, headings and dialogue
// structure, never raw terminator bytes, so no signal module's output moves
// on a script that had no bare `\r` to begin with — see `tests/core/
// scene-split-line-endings.test.ts`.

import { sceneHeadingLineIndices, splitLinesKeepingEndings } from '../../../src/lib/fountain.ts';

// ── Cost, measured rather than guessed ────────────────────────────────────
// This split now runs a full `parseFountain`, which the old regex did not, and
// a dozen analyze/ modules call it with the SAME text during one
// `runScriptDoctor` pass. A one-entry memo keyed on the input string was
// written for that and then REMOVED, because it bought nothing: on a synthetic
// 300-scene script, three cold runs each, `runScriptDoctor` measured 2427 /
// 2619 / 2339 ms before this change, 2514 / 2313 / 2417 ms after it WITH the
// memo, and 2466 / 2334 / 2329 ms after it WITHOUT — one distribution, no
// signal. Module-level mutable state on the scoring path is not free (it is
// one more thing a worker, a cache and a test have to agree about), so it is
// not kept on a hunch. `tests/core/doctor-perf-budget.test.ts` is the standing
// guard.

/** Split raw Fountain into ordered scene texts, at the doctor's own scene
 *  headings. Text before the first heading is dropped (as it always was);
 *  a script with no heading yields `[]`. Line endings are normalized to `\n`
 *  first (`\r\n` or a bare `\r`), so CRLF, CR-only and LF versions of the same
 *  script yield the same scene count and the same scene text — see this
 *  file's 2026-09-20 header addendum. */
export function scenesFromFountain(fountain: string): string[] {
  const normalized = fountain.replace(/\r\n?/g, '\n');
  const headings = sceneHeadingLineIndices(normalized);
  if (headings.length === 0) return [];
  const lines = splitLinesKeepingEndings(normalized);
  return headings.map((start, i) =>
    lines.slice(start, i + 1 < headings.length ? headings[i + 1] : lines.length).join(''));
}
