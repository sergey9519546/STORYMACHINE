// Page references — "Scene 58 (p. 47)" — resolved with the SAME paginator the
// PDF export uses, so a number printed in a report is the number printed on the
// page it points at.
//
// ── Why this exists (2026-09-11, producer-tier discovery #11) ───────────────
//
// A producer reads a one-page summary and then goes to the script. "Scene 58"
// is useless to someone holding a PDF: they have page numbers, not scene
// indices. So the tier has to say which page.
//
// The only honest way to say it is to ask the real paginator. src/lib/
// screenplay-layout.ts's layoutScreenplay() is what src/lib/pdf.ts lays the PDF
// out with (and what doctor.ts counts pages from), US Letter / Courier 12pt /
// 54 lines a page, with the widow and orphan rules. This module calls that
// function — it does NOT re-implement pagination. A second paginator would
// drift, and the whole point of the reference is that it does not.
//
// ── The numbering, exactly ──────────────────────────────────────────────────
//
// layoutScreenplay numbers the SCRIPT's pages 1..N. pdf.ts prepends a title
// page carrying `pageNumber: 0` — a sentinel meaning "this page has no number"
// — and prints a page's number only when `pageNumber >= 2` (industry
// convention: the title page and script page 1 are both unnumbered). So:
//
//   * this module's page numbers ARE layoutScreenplay's page numbers;
//   * for every page from 2 onward, that number is literally the number printed
//     in the PDF's top-right corner;
//   * pages 0 (title) and 1 print nothing, and a reference to page 1 is
//     therefore a reference to the first unnumbered page of the script — which
//     is what a reader counts as page one anyway.
//
// tests/core/page-refs.test.ts asserts the equality against the REAL PDF BYTES:
// it runs fountainToPdf(), pulls the printed `(N.) Tj` label out of each page's
// content stream, and checks that the page this module points a scene at is the
// page that prints that number.
//
// NOT on the scoring path: this module is imported by the report renderers
// only, and it imports layoutScreenplay read-only. layoutScreenplay itself IS
// scoring-path (doctor.ts:68 imports it for ScriptDoctorReport.pageEstimate),
// which is exactly why nothing here modifies it — see the needle comment in
// sceneHeadingNeedles() for the one consequence of that constraint.

import { layoutScreenplay } from '../../src/lib/screenplay-layout.ts';
import { parseFountain } from '../../src/lib/fountain.ts';

/** The text a scene heading will have been laid out as, per scene, in document
 *  order — uppercased, with a forced-heading leading '.' stripped.
 *
 *  This reproduces the two transformations screenplay-layout.ts's private
 *  cleanText() applies to a scene_heading (strip a leading '.', then uppercase
 *  because SPEC.scene_heading.uppercase is true) and nothing else. It does NOT
 *  reproduce that module's word wrap: a wrapped heading's first laid-out line is
 *  a PREFIX of this needle, which is all the match below needs, so the wrap
 *  logic is consulted rather than copied.
 *
 *  cleanText is not exported, and screenplay-layout.ts is on the scoring path
 *  (doctor.ts imports layoutScreenplay), so exporting it from there is not
 *  available to this change. The duplication is therefore two lines, scoped to
 *  one block type, and pinned by a test that drives the real paginator. */
function sceneHeadingNeedles(fountain: string): string[] {
  return parseFountain(fountain)
    .filter(b => b.type === 'scene_heading')
    .map(b => {
      const t = b.text.trim();
      return (t.startsWith('.') ? t.slice(1).trim() : t).toUpperCase();
    });
}

/** 1.5 inches from the left paper edge, in points — the x position
 *  screenplay-layout.ts's SPEC gives a scene heading. Used only to reject a
 *  coincidental text match in a differently-indented element. */
const SCENE_HEADING_X_PT = 1.5 * 72;

/**
 * The page each scene starts on, indexed by 0-based scene index — the same
 * indexing RootCauseFinding.sceneIdxs and ScreenplaySceneRecord.sceneIdx use.
 *
 * `null` for a scene whose heading could not be located in the laid-out pages.
 * That should not happen for a script both functions parsed the same way, and
 * it is reported as null rather than guessed: a wrong page number sends a
 * producer to the wrong page, which is worse than sending them nowhere.
 *
 * Monotonic by construction: the search only ever moves forward through the
 * pages, so scene k+1 can never resolve to a page before scene k's.
 */
export function scenePageNumbers(fountain: string): Array<number | null> {
  const needles = sceneHeadingNeedles(fountain);
  if (needles.length === 0) return [];
  const pages = layoutScreenplay(fountain);

  const out: Array<number | null> = [];
  let pageIdx = 0;
  let lineIdx = 0;

  for (const needle of needles) {
    let found: number | null = null;
    // Forward-only scan. Two scenes can share a slug ("INT. CAR - DAY" twice),
    // and scanning forward is what makes the SECOND one resolve to the second
    // occurrence instead of both collapsing onto the first.
    while (pageIdx < pages.length) {
      const lines = pages[pageIdx].lines;
      if (lineIdx >= lines.length) { pageIdx += 1; lineIdx = 0; continue; }
      const line = lines[lineIdx];
      lineIdx += 1;
      if (line.text === '') continue;
      if (Math.abs(line.xPt - SCENE_HEADING_X_PT) > 0.5) continue;
      if (needle.startsWith(line.text)) {
        found = pages[pageIdx].pageNumber;
        break;
      }
    }
    out.push(found);
  }
  return out;
}

/**
 * "p. 47" for a resolved page, '' for an unresolved one.
 *
 * The empty string, not "p. ?" or "p. 0": a reference that cannot be resolved
 * is omitted by its caller rather than printed as a broken one. Callers guard
 * on the empty string exactly as they do for formatSceneList's empty case.
 */
export function pageRefLabel(page: number | null | undefined): string {
  return typeof page === 'number' && page >= 1 ? `p. ${page}` : '';
}

/**
 * The page reference for a finding, from its scene indices: the page its FIRST
 * (lowest-numbered) scene starts on.
 *
 * First, not a range: the reference exists so a reader can turn to the finding
 * and start reading. A finding spanning 116 scenes spans most of the document,
 * and "pp. 47-139" tells a producer nothing they can act on, while the page its
 * earliest implicated scene starts on is exactly where to begin. The scene list
 * beside it (server/lib/scene-ranges.ts) already states the full extent.
 *
 * Returns null for a finding with no scene anchor (27 of the 70 on the feature
 * fixture) or whose scenes are all unresolved.
 */
export function pageForSceneIdxs(
  sceneIdxs: readonly number[],
  scenePages: ReadonlyArray<number | null>,
): number | null {
  let best: number | null = null;
  for (const idx of sceneIdxs) {
    const page = scenePages[idx];
    if (typeof page !== 'number') continue;
    if (best === null || page < best) best = page;
  }
  return best;
}
