// approved-spans.ts — keeping an author's locked line range pointed at the
// author's locked TEXT while the document underneath it changes.
//
// ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// An ApprovedSpan (./passes/types.ts) is a 1-based, inclusive line range plus
// a reason. The range is only meaningful relative to ONE document. The 14-pass
// revision pipeline (./pipeline.ts) threads the same span array through every
// pass while each pass may rewrite the draft, so from pass 2 onward a span's
// startLine/endLine can describe lines that have moved, or no longer exist.
// The locked-spans lane recorded exactly this as the still-open half of its
// defect (docs/audits/2026-09-19-locked-spans/README.md §3): the survival
// check it added (approvedSpansSurvive, ./rewrite-llm.ts) takes each span's
// excerpt from whatever document the CURRENT pass was handed, so a span that
// has drifted makes that check verify the wrong lines, or silently fall into
// its `skipped` bucket when the range runs off the end.
//
// The fix is to re-locate the span whenever the document changes: take the
// text the span covered in the document it was last valid for, find that text
// in the new document, and rewrite the line numbers to where it now lives.
// Line numbers become a cache of a position; the excerpt is the identity.
//
// Pure, with no logging of its own: it reports which spans moved, which could
// not be found, and which carried unusable metadata, and leaves the decision
// about what to say and to whom to its caller — so nothing here can put
// screenplay text into a log line.
import type { ApprovedSpan } from './passes/types.ts';

/** Collapse CRLF/CR to LF so a pass (or a provider on the way back through
 *  ./rewrite-llm.ts) that normalizes line endings does not register as having
 *  deleted the locked text. No other normalization — whitespace, case, and
 *  punctuation are all part of the identity, because the promise the span
 *  carries is VERBATIM survival, not "same meaning".
 *
 *  Exported, and imported by ./rewrite-llm.ts rather than copied there: one
 *  implementation of "what counts as the same line endings" is what keeps the
 *  survival check and this re-location from ever disagreeing about whether a
 *  locked excerpt is present. */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Outcome of re-locating one array of spans across one document change.
 *
 *  `spans` is always the same length, and in the same order, as the input — a
 *  caller can keep using positional indices. Every other field holds INDICES
 *  into that array, never span text, so all three are safe to log.
 *
 *  - `moved`: the span was found and its line numbers changed.
 *  - `lost`: the span's excerpt does not occur in the new document as whole
 *    lines, so there is nowhere honest to point it. Its previous indices are
 *    kept unchanged (the caller decides whether that is tolerable); this is
 *    the one outcome that means a locked range may now be wrong.
 *  - `skipped`: the span could not be re-located because its own metadata is
 *    unusable against the previous document — a non-finite or out-of-range
 *    startLine/endLine, or an excerpt with no non-whitespace content (which
 *    would match almost anywhere and so cannot identify a position). Indices
 *    are kept unchanged. This mirrors approvedSpansSurvive's own `skipped`
 *    bucket: `approvedSpans` reaches the pipeline as `z.array(z.unknown())`,
 *    force-cast at the route, so malformed spans are an ordinary input here,
 *    not a reason to throw.
 *  - `ambiguous`: the span's excerpt occurs more than once in the new
 *    document AND the number of occurrences is not the same as in the
 *    previous one, so the ordinal that identified WHICH copy the author
 *    locked no longer has a counterpart. The span is still re-pointed — by
 *    the nearest-occurrence rule, which is the best guess available — but
 *    the guess is reported so a caller can say the lock may have landed on
 *    the wrong copy. An ambiguous span is NOT lost and NOT skipped: it
 *    appears in `moved` too whenever its line numbers changed. A span with a
 *    single candidate in the new document is never ambiguous; there is
 *    nothing to choose between. Indices only, like every other field. */
export interface ApprovedSpanRelocation {
  spans: ApprovedSpan[];
  moved: number[];
  lost: number[];
  skipped: number[];
  ambiguous: number[];
}

/** 1-based start line of every occurrence of `needle` in `haystack` that
 *  begins at the start of a line and ends at the end of one.
 *
 *  Both alignment requirements matter. The excerpt was cut on line boundaries
 *  out of the previous document, so a match that starts mid-line is a
 *  different piece of text that merely ends the same way, and re-pointing a
 *  locked range at it would move the lock onto lines the author never
 *  approved. Requiring alignment on both sides also makes the returned line
 *  number exactly the span's new startLine, with no partial-line arithmetic.
 *
 *  Overlapping occurrences are all reported (the scan advances by one
 *  character, not by the needle's length): a locked range can legitimately sit
 *  inside repeated text, and the caller picks between candidates by position.
 *
 *  Exported (2026-09-21, PR #268 review finding F2) and imported by
 *  ./rewrite-llm.ts's approvedSpansSurvive, which used to decide "present"
 *  with a bare substring `includes`: a rewrite that embedded the locked lines
 *  inside a modified line (a prefix on the first, a suffix on the last) was
 *  accepted there and then could not be found here on the next pass, so the
 *  lock was silently dropped. The survival check and this re-location are
 *  now the SAME rule, by sharing this function — a rewrite survives exactly
 *  when relocation can find it. Callers pass already-normalized text. */
export function lineAlignedOccurrences(haystack: string, needle: string): number[] {
  const out: number[] = [];
  if (needle.length === 0) return out;
  // `at` is non-decreasing across iterations, so newlines are counted once
  // each overall rather than re-counted from 0 for every hit.
  let scanned = 0;
  let line = 1;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return out;
    while (scanned < at) {
      if (haystack.charCodeAt(scanned) === 10 /* \n */) line++;
      scanned++;
    }
    const startsLine = at === 0 || haystack.charCodeAt(at - 1) === 10;
    const end = at + needle.length;
    const endsLine = end === haystack.length || haystack.charCodeAt(end) === 10;
    if (startsLine && endsLine) out.push(line);
    from = at + 1;
  }
}

/**
 * Re-point every span from the document it was last valid for (`prevDoc`) at
 * the same text in `nextDoc`.
 *
 * For each span: cut its excerpt out of `prevDoc` at startLine..endLine
 * (1-based inclusive, endLine clamped to the document exactly as
 * approvedSpansSurvive clamps it), find that excerpt in `nextDoc` as whole
 * lines after CRLF/CR → LF normalization on both sides, and rewrite
 * startLine/endLine to the copy of that text the span was actually on.
 *
 * WHICH COPY, when the excerpt is not unique, is decided by ORDINAL first
 * (2026-09-21, PR #268 review finding F3). The span's identity among
 * identical blocks is "the k-th occurrence", not "the one near line n": with
 * identical blocks at lines 10 and 20 and the SECOND locked, a pass that
 * inserts 15 lines at the top moves them to 25 and 35, and the occurrence
 * nearest the old line 20 is 25 — the FIRST copy, the one the author did not
 * lock. So when `nextDoc` contains the same NUMBER of occurrences as
 * `prevDoc` did, the span keeps its ordinal (2nd of 2 stays 2nd of 2) however
 * far the text has slid, which is exactly the case where the ordinal still
 * means something.
 *
 * When the count CHANGED — a pass added or deleted a copy — no ordinal
 * survives the change, so the previous rule stands: the occurrence CLOSEST to
 * where the span used to be, ties going to the earlier one. That is a guess,
 * and it is reported as one in `ambiguous` whenever more than one copy could
 * have been chosen.
 *
 * Every other field of the span (its `reason`, and anything a future caller
 * adds) is carried through untouched, and the input array and its objects are
 * never mutated.
 *
 * A span whose excerpt is absent keeps its previous indices HERE and is
 * reported in `lost`. That is deliberately not an exception: after an LLM
 * rewrite it cannot happen (./rewrite-llm.ts rejects any rewrite that does not
 * preserve every locked excerpt verbatim), but a non-LLM editor of the draft
 * is not bound by that check, and throwing away the whole span array because
 * one span's text was edited would be a worse failure than reporting the one.
 *
 * Returning the stale range is a REPORT, not a recommendation to keep using
 * it. This function's contract is same-length, same-order, so a caller can
 * read `lost` positionally; ./pipeline.ts, the only caller, then DROPS every
 * `lost` span from enforcement for the rest of the run rather than carrying a
 * range that now addresses different text. See that file's finding-5 comment
 * for why carrying it forward silently relocated the author's lock.
 */
export function relocateApprovedSpans(
  prevDoc: string,
  nextDoc: string,
  spans: ApprovedSpan[],
): ApprovedSpanRelocation {
  const moved: number[] = [];
  const lost: number[] = [];
  const skipped: number[] = [];
  const ambiguous: number[] = [];
  if (spans.length === 0) return { spans: [], moved, lost, skipped, ambiguous };

  const prev = normalizeLineEndings(prevDoc);
  const next = normalizeLineEndings(nextDoc);
  const prevLines = prev.split('\n');

  const relocated = spans.map((span, index) => {
    const { startLine, endLine } = span;
    const validRange =
      Number.isFinite(startLine) &&
      Number.isFinite(endLine) &&
      startLine >= 1 &&
      endLine >= startLine &&
      startLine <= prevLines.length;
    if (!validRange) {
      skipped.push(index);
      return span;
    }
    const clampedEnd = Math.min(endLine, prevLines.length);
    const excerpt = prevLines.slice(startLine - 1, clampedEnd).join('\n');
    // An excerpt with no non-whitespace content (a span over blank lines)
    // identifies no position: it matches at every blank run in the document.
    // Same reasoning, and the same bucket, as approvedSpansSurvive's.
    if (excerpt.trim().length === 0) {
      skipped.push(index);
      return span;
    }

    const candidates = lineAlignedOccurrences(next, excerpt);
    if (candidates.length === 0) {
      lost.push(index);
      return span;
    }

    // Where the span sat among the identical copies of its own text in the
    // document it was last valid for. `startLine` is always one of these —
    // the excerpt was cut out of `prev` at startLine..clampedEnd, so it
    // occurs there, line-aligned on both sides, by construction — but
    // `indexOf` is read defensively rather than assumed, and a -1 simply
    // falls through to the positional rule below.
    const priorCandidates = lineAlignedOccurrences(prev, excerpt);
    const ordinal = priorCandidates.indexOf(startLine);

    let bestStart: number;
    if (ordinal >= 0 && candidates.length === priorCandidates.length) {
      // Same number of copies on both sides: the k-th is still the k-th, and
      // position is irrelevant — this is what survives a large insertion or
      // deletion elsewhere in the draft (finding F3).
      bestStart = candidates[ordinal];
    } else {
      // The occurrence count changed, so the ordinal identifies nothing.
      // Fall back to nearest-to-the-old-position.
      //
      // "Earlier wins" on a tie needs no tie-break clause:
      // lineAlignedOccurrences returns candidates in ASCENDING line order (it
      // scans left to right), so the first candidate at the minimum distance
      // is already the earliest one and a strict `<` never replaces it with an
      // equidistant later match. This loop used to carry an `|| (distance ===
      // bestDistance && candidates[i] < bestStart)` arm for that case; it
      // could not fire for any input and is gone (2026-09-20, review finding
      // 5). The behaviour is unchanged, and `ties between equidistant
      // occurrences go to the earlier one` in
      // tests/core/revision-per-pass-diagnostics.test.ts still pins it.
      bestStart = candidates[0];
      let bestDistance = Math.abs(bestStart - startLine);
      for (let i = 1; i < candidates.length; i++) {
        const distance = Math.abs(candidates[i] - startLine);
        if (distance < bestDistance) {
          bestStart = candidates[i];
          bestDistance = distance;
        }
      }
      // Only a genuine choice is reported. With one candidate there is
      // nowhere else the span could have gone, whatever the counts were.
      if (candidates.length > 1) ambiguous.push(index);
    }

    const newEnd = bestStart + (clampedEnd - startLine);
    if (bestStart === startLine && newEnd === endLine) return span;
    moved.push(index);
    return { ...span, startLine: bestStart, endLine: newEnd };
  });

  return { spans: relocated, moved, lost, skipped, ambiguous };
}
