#!/usr/bin/env node
// scripts/verify-report.mjs — offline, third-party re-attestation of a Story
// Machine coverage report (ROADMAP P3: "a shareable, third-party-verifiable
// coverage report").
//
// WHY THIS EXISTS. POST /api/export/verify (server/routes/export.ts) and the
// in-app #verify page (src/App.tsx) already let anyone re-run the
// deterministic engine against a script and confirm a report's numbers, but
// both require POSTing the writer's script text to SOME server — the app's
// own, or whoever is hosting the instance the verifier happens to open. For
// an unpublished draft that is the exact thing verification should not
// require. The engine is deterministic and keyless
// (server/nvm/analyze/doctor.ts's own header), so nothing about verifying a
// report needs a network at all — this CLI runs the identical comparison
// in-process, on this machine, and never sends the script anywhere.
//
// ── Run ──────────────────────────────────────────────────────────────────
//   npm run verify-report -- <report.html|letter.md|report.json> <script.fountain>
//
// Prints a header stating the privacy property up front (the script text
// never leaves this machine — no fetch, no XHR, no child process that could
// exfiltrate it), then three verdicts:
//   authentic: yes/no                  — does the script's own sha256 match
//                                         the hash the report claims?
//   reproducible under this engine:    — per field (health/verdict/
//                                         totalIssues/healthPercentile),
//                                         does a fresh, in-process,  keyless
//                                         doctor run on THIS text reproduce
//                                         what the report claims, within the
//                                         same 0.05 tolerance the live route
//                                         uses?
//   engine: report <sha> vs local <sha> — the report's claimed engineCommit
//                                         against this checkout's own. A
//                                         mismatch here is ADVISORY, never a
//                                         reason to fail: reproduction is
//                                         not attestation (see below).
//
// Exit code 0 only when BOTH authentic and reproducible are yes — an
// engine-identity mismatch alone does not fail the run, exactly like the
// live route's `engine_mismatch` is a soft outcome
// (server/lib/verify-compare.ts, imported below: this script uses the SAME
// comparator the route does, not a second copy of its tolerance/field-set/
// mismatch-classification logic).
//
// WHAT THIS DOES NOT PROVE. Reproducing a report's numbers on this machine,
// with whatever engine build happens to be checked out here, is NOT the same
// claim as "the numbers were produced by the PUBLISHED engine". The
// engineCommit compare above is the only bridge between the two, and it is
// only as good as the two commits actually being comparable builds — a
// verifier who has patched their own local doctor.ts can make this script
// reproduce anything. Reproduction is not attestation.
//
// Node-only. No browser, no bundler — plain ESM run with
// --experimental-strip-types (this repo's own convention for a script that
// needs to import .ts sources directly; see scripts/lock-auc24.mjs).

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor, computeContentHash } from '../server/nvm/analyze/doctor.ts';
import { isWholeDraftAnalysisComplete } from '../server/lib/analysis-completeness.ts';
import {
  checkContentHash, compareVerifyClaims, validateVerifyExpected, ENGINE_IDENTITY_FIELDS,
  bodyPageRefsDisagreement,
} from '../server/lib/verify-compare.ts';
import { commit as localEngineCommit } from '../server/lib/build-info.ts';
// ONE definition of the claims an artifact carries (2026-09-12, BUG-1): the label
// table both exporters write, the parsers that invert the copy those exporters
// print, and the labels a producer-tier artifact MUST publish. Imported, never
// re-typed — a second regex for a claim is how the verdict-stamp scrape silently
// stopped firing on 2026-09-11 when the stamp's tag changed.
import {
  decodeClaimRows, encodePageRefs, parseLengthLine, parseHealthLine,
  parseLetterTierVerdictLine, percentileReadingFromText, referenceBoundsFromText,
  verdictFromWord, TIER_CLAIM_LABELS, VERIFY_SCOPE_SENTENCE,
} from '../server/lib/artifact-claims.ts';
import { prioritiesCountFromHeading } from '../src/lib/priorities-copy.ts';
import {
  NO_LOGLINE_NOTE, NO_LOGLINE_NOTE_HTML, LOGLINE_UNKNOWN_NOTE,
} from '../server/lib/reader-tier.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── CLI plumbing ─────────────────────────────────────────────────────────────

function usage() {
  return [
    'Usage: npm run verify-report -- <report.html|letter.md|report.json> <script.fountain>',
    '',
    'Re-attests a Story Machine coverage report against the ORIGINAL script text,',
    'entirely on this machine. The script text is never sent anywhere.',
    '',
    'WHAT IS CHECKED. Every value the report publishes in its verify block, each one',
    'recomputed from the script text you supply:',
    '  the script-text hash; health; verdict; total issues; the health percentile',
    '  (raw, in a report JSON; as a BAND or "not comparable" on the reader summary',
    '  page); the scene count, word count and estimated page/minute figures; the',
    '  count the priorities heading states; the reference bounds the percentile is',
    '  measured against; whether a logline was derived; and EVERY per-finding page',
    '  reference, re-resolved through the same paginator that lays out the PDF —',
    '  not merely "a number is present".',
    'The document is also checked against ITSELF: the reader summary page\u2019s own Length',
    'line, priorities heading, percentile reading, reference bounds, logline state and',
    'page references must agree with the verify block, so an edit to what a human',
    'reads is caught even when the block is genuine.',
    '',
    'WHAT IS NOT CHECKED. Wording. The prose of the report, the finding descriptions,',
    'the logline\u2019s own text (only whether one was derived), the title, the author, and',
    'the draft-rank line: all of those are supplied by whoever exported the report',
    'rather than derived by the engine, so re-running the engine cannot attest them.',
    'Two consequences worth stating plainly:',
    '  - A raw report JSON carries no reader summary page, so the page-only claims',
    '    (priorities count, page references, reference bounds, logline state, the',
    '    percentile BAND) do not exist in that shape and are reported as unchecked.',
    '    Its scene count, word count, page estimate and raw percentile ARE checked.',
    '  - Reproduction is not attestation. This proves the engine checked out HERE',
    '    reproduces these numbers on this text, not that the published engine did;',
    '    the engineCommit line is the only bridge, and it is advisory.',
    '',
    'Exit codes: 0 verified; 1 not verified (a real result, printed to stdout);',
    '2 a usage or IO problem (printed to stderr).',
  ].join('\n');
}

function fail(message, code = 2) {
  console.error(message);
  process.exitCode = code;
  return code;
}

/** A NOT VERIFIED outcome is the tool's normal, expected RESULT — not an
 *  invocation error — so it prints to stdout (where a script pipes the
 *  human-readable transcript) rather than stderr (reserved below for
 *  genuine usage/IO problems: a missing file, unparsable JSON, no
 *  verification hash to check at all). */
function verdictFail(message, code = 1) {
  console.log(message);
  process.exitCode = code;
  return code;
}

// ── HTML entity decode (the inverse of coverage-html.ts's escapeHtml) ───────
function unescapeHtml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// ── Artifact parsers ─────────────────────────────────────────────────────────
// Each returns a VerifyExpected-shaped object (server/lib/verify-compare.ts)
// with only the fields the artifact actually publishes present — exactly the
// set POST /api/export/verify's `expected` accepts, so the SAME comparator
// checks only what was actually claimed, same as the route.
//
// Round-2 review finding 2 (2026-09-06): a hosted `/api/export/verify` call
// only ever RECEIVES the scraped claims a caller sends it — it has no way to
// know what a document's own reader-facing prose says, so it cannot detect a
// forgery confined to the parts of a report a human actually reads. This CLI
// holds the WHOLE document, which is a real capability the hosted route
// lacks — and `parseHtmlReport`'s original scrape of ONLY the machine-
// readable `<dl class="verify-claims">` block threw that capability away: a
// forged `<div class="health-number">99.0</div>` in the header, with the
// `<dl>` left untouched, printed VERIFIED. `collectBodyClaims` below reads
// every OTHER rendering of health/verdict the document carries — the
// header's health-number/verdict stamp (HTML only), and the doctor's own
// `plainSummary` first sentence (`"<VERDICT> — <descriptor>; overall score
// <N>/100."`, doctor.ts's buildPlainSummary — present, verbatim, in the
// HTML body, the letter's Summary section, AND a raw report JSON's
// `plainSummary` field, so ONE regex covers all three artifact shapes) —
// and `findBodyBlockDisagreements` fails the whole run the moment any of
// them disagrees with the block claims this file already trusted, before
// either is ever compared against the freshly recomputed truth.

/** The doctor's own first summary sentence — see the header comment above.
 *  Present verbatim (case-sensitive, no HTML-entity-escapable characters in
 *  either verdict word or descriptor) in all three artifact shapes, so this
 *  one pattern is the shared "does the document agree with itself" probe. */
const PLAIN_SUMMARY_RE = /(RECOMMEND|CONSIDER|PASS)\s+—\s+[^;]+;\s*overall score\s+(\d+)\/100\./;

/** `[{ label, field: 'health'|'verdict', value, kind: 'exact'|'rounded' }]`
 *  extracted from the doctor's plainSummary sentence, if present. `kind:
 *  'rounded'` on the health claim because buildPlainSummary uses
 *  `Math.round(health)` (an integer), unlike the verify block's
 *  `.toFixed(1)` — comparing them requires rounding the block's side first,
 *  not a tolerance. */
function collectPlainSummaryClaims(text) {
  const m = text.match(PLAIN_SUMMARY_RE);
  if (!m) return [];
  return [
    { label: 'the summary sentence', field: 'verdict', value: m[1], kind: 'exact' },
    { label: 'the summary sentence', field: 'health', value: Number(m[2]), kind: 'rounded' },
  ];
}

// ── Where the reader summary page is, in each shape ─────────────────────────
// The producer tier's claims have to be read out of the TIER, not out of the
// document: the full report below the divider states a priorities heading of its
// own (the complete list, a different count), and the letter's headline restates
// the same three length figures. Slicing the region first is what keeps one scrape
// from reading the other section's number and calling it a disagreement.

/** The divider both letter renderers put after the tier, as a WHOLE LINE: exactly
 *  three dashes (markdown's `---`) or exactly forty (the plain-text renderer's rule).
 *
 *  Whole-line and exact-length, both load-bearing. The plain-text tier underlines its
 *  own headings with dashes — 14 under "READER SUMMARY", 25 under "The 3 things to fix
 *  first" — so a substring search for '\n---' finds the tier's FIRST underline and
 *  truncates the region to its heading, which is exactly the bug this pattern replaced:
 *  the genuine plain-text letter then reported "the summary prints 0 page references"
 *  against a block claiming one. No tier underline is ever 3 or 40 characters. */
const TIER_DIVIDER_LINE_RE = /^(?:---|-{40})$/m;

/** `{ tier, rest }` — the reader summary page, and everything after it. Either can
 *  be '' (a report that renders no tier at all: every artifact exported before
 *  2026-09-11). */
function splitTierRegion(text, kind) {
  if (kind === 'html') {
    const start = text.indexOf('<section class="reader-tier">');
    if (start < 0) return { tier: '', rest: text };
    const end = text.indexOf('<hr class="tier-divider"', start);
    return end < 0
      ? { tier: text.slice(start), rest: '' }
      : { tier: text.slice(start, end), rest: text.slice(end) };
  }
  // The letter, markdown or plain text. Both renderers open the tier with their own
  // heading and close it with a divider LINE (see TIER_DIVIDER_LINE_RE).
  const start = Math.max(text.indexOf('## Reader summary'), text.indexOf('READER SUMMARY'));
  if (start < 0) return { tier: '', rest: text };
  const after = text.slice(start);
  const divider = after.match(TIER_DIVIDER_LINE_RE);
  if (!divider) return { tier: after, rest: '' };
  return { tier: after.slice(0, divider.index), rest: after.slice(divider.index) };
}

/** The page references a reader actually SEES, in document order. Only resolved
 *  references render (reader-tier.ts omits an unresolved one rather than printing
 *  "p. ?"), so this is the ordered run of printed page numbers — compared against
 *  the block's resolved pages by verify-compare.ts's bodyPageRefsDisagreement. */
function bodyPageNumbers(tierText, kind) {
  const re = kind === 'html'
    ? /<span class="tier-page">p\. (\d+)<\/span>/g
    : /— p\. (\d+)/g;
  return [...tierText.matchAll(re)].map(m => Number(m[1]));
}

/** The logline STATE the page states: 'derived', 'not derived', or null when the
 *  page says it has no basis to say (the third state added 2026-09-12 — a report
 *  rendered with neither a logline nor the script text). Compared against the
 *  block's own `loglineState` claim. */
function bodyLoglineState(tierText, kind) {
  let stated = null;
  if (kind === 'html') {
    const m = tierText.match(/<p class="logline-line">([\s\S]*?)<\/p>/);
    if (!m) return null;
    stated = unescapeHtml(m[1]).trim();
  } else {
    const m = tierText.match(/^(?:\*\*Logline\.\*\* |Logline: )(.*)$/m);
    if (!m) return null;
    stated = m[1].trim();
  }
  if (stated === LOGLINE_UNKNOWN_NOTE) return null;
  if (stated === NO_LOGLINE_NOTE || stated === NO_LOGLINE_NOTE_HTML) return 'not derived';
  return stated === '' ? null : 'derived';
}

/**
 * Every claim the READER SUMMARY PAGE states, as body claims to be cross-checked
 * against the verify block.
 *
 * Round-2 review finding 2 (2026-09-06) established the principle: this CLI holds
 * the whole document, which the hosted route never does, so a forgery confined to
 * what a human reads — with the machine-readable block left untouched — is
 * checkable here and must not pass. That round covered health and verdict. BUG-1
 * (2026-09-12) is the same hole for every number the producer tier added, and this
 * function is the same answer: the Length line, the priorities heading, the
 * percentile reading, the reference bounds, the logline state and the page
 * references are all read back out of the rendered page, through the parsers that
 * invert the copy which printed them (server/lib/artifact-claims.ts,
 * src/lib/priorities-copy.ts), never through a regex typed a second time here.
 */
function collectTierBodyClaims(text, kind) {
  const { tier, rest } = splitTierRegion(text, kind);
  const claims = [];
  if (tier === '') return claims;

  // THE TIER'S VERDICT AND HEALTH READING (2026-09-12, investigator A finding 2 in
  // docs/audits/2026-09-12-adversarial/writer-loop.md). The producer tier is a
  // SECOND rendering of both, and nothing read it: a letter whose page-one line was
  // edited to `**Verdict.** RECOMMEND · Health 94.6 / 100` printed VERIFIED at
  // exit 0, because this file's letter scrape looked for `**Verdict:` (colon) and
  // `Health 94.6/100` (no spaces) while the tier writes `**Verdict.**` and
  // `Health 94.6 / 100`. Read through artifact-claims.ts's own inverses of the
  // formatters that print them, so a reworded rendering fails the round-trip test
  // rather than silently turning this scrape off.
  if (kind === 'html') {
    // The HTML tier's verdict is its `class="stamp"` span, already collected by
    // parseHtmlReport (since 2026-09-11 the tier's stamp is the FIRST one in the
    // document). Its health reading is this line, which nothing read before.
    const tierHealth = parseHealthLine(tier);
    if (tierHealth !== null) {
      claims.push({ label: 'the summary page’s health reading', field: 'health', value: tierHealth, kind: 'exact' });
    }
  } else {
    const verdictLine = parseLetterTierVerdictLine(tier);
    if (verdictLine) {
      const verdict = verdictFromWord(verdictLine.verdictWord);
      claims.push({
        label: 'the summary page’s verdict line',
        field: 'verdict',
        value: verdict ?? verdictLine.verdictWord,
        kind: 'exact',
      });
      if (verdictLine.health !== null) {
        claims.push({ label: 'the summary page’s health reading', field: 'health', value: verdictLine.health, kind: 'exact' });
      }
    }
  }

  const length = parseLengthLine(tier);
  if (length) {
    claims.push({ label: 'the summary page’s Length line', field: 'sceneCount', value: length.sceneCount, kind: 'exact' });
    claims.push({ label: 'the summary page’s Length line', field: 'wordCount', value: length.wordCount, kind: 'exact' });
    if (length.estimatedPages !== undefined) {
      claims.push({ label: 'the summary page’s Length line', field: 'estimatedPages', value: length.estimatedPages, kind: 'exact' });
    }
    if (length.estimatedRuntimeMinutes !== undefined) {
      claims.push({ label: 'the summary page’s Length line', field: 'estimatedRuntimeMinutes', value: length.estimatedRuntimeMinutes, kind: 'exact' });
    }
  }

  // The LETTER restates the same three figures in its headline, below the divider
  // (coverage-letter.ts's buildHeadline: "Health 66.7/100 (Fair) · 6 scenes · 167
  // words · ~2 pages / ~2 min (est.)"). A third independent rendering, so a forger
  // who edits the tier and the block still has it left to edit.
  if (kind !== 'html') {
    const headline = parseLengthLine(rest);
    if (headline) {
      claims.push({ label: 'the letter headline', field: 'sceneCount', value: headline.sceneCount, kind: 'exact' });
      claims.push({ label: 'the letter headline', field: 'wordCount', value: headline.wordCount, kind: 'exact' });
      if (headline.estimatedPages !== undefined) {
        claims.push({ label: 'the letter headline', field: 'estimatedPages', value: headline.estimatedPages, kind: 'exact' });
      }
      if (headline.estimatedRuntimeMinutes !== undefined) {
        claims.push({ label: 'the letter headline', field: 'estimatedRuntimeMinutes', value: headline.estimatedRuntimeMinutes, kind: 'exact' });
      }
    }
  }

  // The priorities heading. In the plain-text letter the tier's headings are bare
  // underlined lines — "READER SUMMARY" is one of them, and taking the FIRST such
  // line read the wrong heading entirely (prioritiesCountFromHeading returned null,
  // so the claim was silently never checked and a forged count passed). Every
  // candidate is offered to the shared inverse and the first one it RECOGNISES
  // wins, which makes this a property of the heading's wording rather than of its
  // position in the tier.
  const headingCandidates = kind === 'html'
    ? [...tier.matchAll(/<h2 class="tier-heading">([^<]*)<\/h2>/g)].map(m => m[1])
    : [
      ...[...tier.matchAll(/^### (.+)$/gm)].map(m => m[1]),
      ...[...tier.matchAll(/^(.+)\n-+$/gm)].map(m => m[1]),
    ];
  for (const candidate of headingCandidates) {
    const count = prioritiesCountFromHeading(unescapeHtml(candidate));
    if (count !== null) {
      claims.push({ label: 'the priorities heading', field: 'prioritiesListed', value: count, kind: 'exact' });
      break;
    }
  }

  const reading = percentileReadingFromText(tier);
  if (reading !== null) {
    claims.push({ label: 'the percentile line', field: 'percentileReading', value: reading, kind: 'exact' });
  }

  const bounds = referenceBoundsFromText(tier);
  if (bounds !== null) {
    claims.push({ label: 'the reference bounds on the page', field: 'referenceBounds', value: bounds, kind: 'exact' });
  }

  const logline = bodyLoglineState(tier, kind);
  if (logline !== null) {
    claims.push({ label: 'the logline line', field: 'loglineState', value: logline, kind: 'exact' });
  }

  claims.push({
    label: 'the page references beside the findings',
    field: 'pageRefs',
    value: bodyPageNumbers(tier, kind),
    kind: 'pages',
  });

  return claims;
}

/** Does this document render a producer tier at all? A tier WITH no tier claims in
 *  its block is refused outright (see main()): its reader-facing numbers cannot be
 *  checked, and "verified" over an unverifiable page is the exact sentence BUG-1
 *  was about. Every artifact exported before 2026-09-11 renders no tier and is
 *  unaffected. */
function rendersProducerTier(text, kind) {
  return splitTierRegion(text, kind).tier !== '';
}

/** `<dl class="verify-claims">` — coverage-html.ts's buildFooterSection.
 *  Same block tests/routes/export-verify.test.ts's scrapeVerifyClaims()
 *  reads; this is the CLI's own copy of that scrape (format-specific
 *  extraction, not the comparison logic verify-compare.ts shares).
 *
 *  The label -> field -> type decoding itself is NOT here: it is
 *  server/lib/artifact-claims.ts's decodeClaimRows, the inverse of the
 *  claimRowsFor() the exporter wrote this block with. Before 2026-09-12 this
 *  function hand-listed six labels and six `Number(...)` calls, which is why the
 *  nine claims the producer tier added could be added to the exporter without
 *  anything here noticing. */
function parseHtmlReport(text) {
  const block = text.match(/<dl class="verify-claims">([\s\S]*?)<\/dl>/);
  if (!block) return { expected: null, bodyClaims: [] };
  const rows = {};
  for (const [, term, value] of block[1].matchAll(/<dt>([^<]+)<\/dt><dd><code>([^<]*)<\/code><\/dd>/g)) {
    rows[unescapeHtml(term).trim()] = unescapeHtml(value).trim();
  }
  const expected = decodeClaimRows(rows);

  // The two reader-facing renderings a verify-claims-only scrape used to
  // ignore entirely (coverage-html.ts's buildHeaderSection/buildHealthSection):
  //   <div class="health-number" style="...">65.0</div>
  //   <span class="stamp" style="...">RECOMMEND</span>   (verdictStyle.label —
  //     the SAME reverse map the letter parser already uses for its
  //     "PASS (decline)" -> "PASS" wrapping, reused here.)
  //
  // THE STAMP'S TAG IS NOT PART OF THE CLAIM (fixed 2026-09-11). This matched
  // `<div class="stamp">` only. On 2026-09-11 the verdict stamp moved out of the
  // report header into the producer tier (server/lib/reader-tier.ts) and became a
  // `<span>` so it could sit inline beside the health reading — which silently
  // turned this scrape off, and with it the CLI's ability to catch a forged
  // verdict stamp. The forgery test's own sanity assertion caught it, but only
  // because that test scraped the same way; nothing about the CLI's behaviour was
  // checked against a tag change. It now accepts either tag, with a backreference
  // so the close tag must match the open one, which also keeps every report
  // exported before today parseable.
  const bodyClaims = collectPlainSummaryClaims(text);
  const healthNumberMatch = text.match(/<div class="health-number"[^>]*>([\d.]+)<\/div>/);
  if (healthNumberMatch) {
    bodyClaims.push({ label: 'the health headline', field: 'health', value: Number(healthNumberMatch[1]), kind: 'exact' });
  }
  const stampMatch = text.match(/<(div|span) class="stamp"[^>]*>([\s\S]*?)<\/\1>/);
  if (stampMatch) {
    const label = unescapeHtml(stampMatch[2].trim());
    bodyClaims.push({ label: 'the verdict stamp', field: 'verdict', value: verdictFromWord(label) ?? label, kind: 'exact' });
  }
  bodyClaims.push(...collectTierBodyClaims(text, 'html'));

  return { expected, bodyClaims, rows };
}

// coverage-letter.ts's verify footer — server/lib/coverage-letter.ts's
// buildLetterData. hashLine, the claim lines and provenanceLine are byte-identical
// strings in BOTH the markdown and plain-text renderers (renderMarkdown/renderText
// each just `lines.push(...)` them); only the verdict line's wrapping differs
// (`**Verdict: X**` vs `VERDICT: X`), and the headline (`Health X.X/100 (Grade) ·
// ...`) is pushed as the same literal string either way — so one set of patterns
// covers a `.md` or a `.txt` export of the same letter.
//
// The verdict WORD map that used to live here is gone: it is
// server/lib/artifact-claims.ts's VERDICT_WORD/verdictFromWord, the same map the
// three renderers emit through (2026-09-12).

/** The letter's footer claim rows — `Label: value` lines, the same label table the
 *  HTML report publishes as `<dt>/<dd>` pairs (claimRowsFor, omitting the three the
 *  letter already states in its own prose).
 *
 *  Scoped to the FOOTER, which begins at the hash line: the tier above it prints
 *  `Logline: …`, `Length: …` and `Reference bounds: …` lines of its own, and a
 *  whole-document scan would read the tier's logline TEXT as the `Logline` claim's
 *  value. */
function parseLetterClaimRows(text) {
  const footerStart = text.indexOf('Script-text hash (SHA-256):');
  if (footerStart < 0) return {};
  const rows = {};
  for (const line of text.slice(footerStart).split('\n')) {
    const m = line.match(/^([A-Z][^:]*): (.*)$/);
    if (m) rows[m[1].trim()] = m[2].trim();
  }
  return rows;
}

function parseLetterReport(text) {
  const rows = parseLetterClaimRows(text);
  const expected = decodeClaimRows(rows);

  const hashMatch = text.match(/Script-text hash \(SHA-256\):\s*([0-9a-f]{64})/i);
  if (hashMatch) expected.contentHash = hashMatch[1];

  // The letter states the engine identity in prose rather than as a row
  // (artifact-claims.ts's LETTER_PROSE_CLAIMS), so it is read from that line.
  const provenanceMatch = text.match(/Engine commit:\s*(\S+)\s*(?:·|·)\s*Rulebook:\s*([\d,]+)\s*rule concepts\./);
  if (provenanceMatch) {
    expected.engineCommit = provenanceMatch[1];
    expected.rulebookCount = Number(provenanceMatch[2].replace(/,/g, ''));
  }

  // BACK-COMPATIBILITY with every letter exported before 2026-09-12, which
  // published no claim rows at all: its bold verdict line and its headline health
  // figure were the ONLY claims it carried, so they are the block for that
  // document. For a letter that DOES carry rows they are body claims instead,
  // cross-checked below — which is strictly stronger, and is why this is a
  // fallback rather than the primary read.
  const verdictMatch = text.match(/\*\*Verdict:\s*(.+?)\*\*/) ?? text.match(/^VERDICT:\s*(.+)$/m);
  const verdictFromBody = verdictMatch
    ? (verdictFromWord(verdictMatch[1]) ?? verdictMatch[1].trim())
    : undefined;
  const healthMatch = text.match(/Health\s+([\d.]+)\/100/);
  const healthFromBody = healthMatch ? Number(healthMatch[1]) : undefined;
  if (expected.verdict === undefined && verdictFromBody !== undefined) expected.verdict = verdictFromBody;
  if (expected.health === undefined && healthFromBody !== undefined) expected.health = healthFromBody;

  if (Object.keys(expected).length === 0) return { expected: null, bodyClaims: [], rows };

  // The doctor's plainSummary sentence (present verbatim in the letter's
  // `## Summary` / `SUMMARY` section either way) is a genuinely SEPARATE rendering
  // — see the header comment above `PLAIN_SUMMARY_RE`.
  const bodyClaims = collectPlainSummaryClaims(text);
  if (rows.Verdict !== undefined && verdictFromBody !== undefined) {
    bodyClaims.push({ label: 'the verdict line', field: 'verdict', value: verdictFromBody, kind: 'exact' });
  }
  if (rows.Health !== undefined && healthFromBody !== undefined) {
    bodyClaims.push({ label: 'the headline health figure', field: 'health', value: healthFromBody, kind: 'exact' });
  }
  bodyClaims.push(...collectTierBodyClaims(text, 'letter'));
  return { expected, bodyClaims, rows };
}

/** A raw ScriptDoctorReport JSON — either the object itself (what
 *  POST /api/scriptide/doctor returns, spread at the top level) or `{
 *  report: {...} }` (a caller-chosen wrapper), read leniently. `bodyClaims`
 *  here is a genuine (if narrow) self-consistency check even though JSON has
 *  no separate "rendered" surface: `report.plainSummary` and
 *  `report.health`/`report.verdict` are still three independently-editable
 *  fields of the same hand-editable file, and nothing else in this format
 *  would catch one moving without the others.
 *
 *  NO READER SUMMARY PAGE EXISTS IN THIS SHAPE, so the page-only claims (the
 *  priorities count, the page references, the reference bounds, the logline state,
 *  the percentile BAND) are absent here by construction rather than by omission —
 *  stated in --help and reported as unchecked. The three numbers this shape DOES
 *  state, and which the producer tier renders from, are checked: sceneCount,
 *  wordCount and the page estimate. */
function parseJsonReport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`not valid JSON: ${err.message}`);
  }
  const report = (data && typeof data === 'object' && typeof data.contentHash === 'string')
    ? data
    : (data && typeof data === 'object' && data.report && typeof data.report === 'object' ? data.report : null);
  if (!report) return { expected: null, bodyClaims: [] };
  const expected = {};
  if (typeof report.contentHash === 'string') expected.contentHash = report.contentHash;
  if (typeof report.health === 'number') expected.health = report.health;
  if (typeof report.verdict === 'string') expected.verdict = report.verdict;
  if (typeof report.totalIssues === 'number') expected.totalIssues = report.totalIssues;
  if (typeof report.healthPercentile === 'number') expected.healthPercentile = report.healthPercentile;
  if (typeof report.sceneCount === 'number') expected.sceneCount = report.sceneCount;
  if (typeof report.wordCount === 'number') expected.wordCount = report.wordCount;
  if (report.pageEstimate && typeof report.pageEstimate === 'object') {
    if (typeof report.pageEstimate.pages === 'number') expected.estimatedPages = report.pageEstimate.pages;
    if (typeof report.pageEstimate.runtimeMinutes === 'number') {
      expected.estimatedRuntimeMinutes = report.pageEstimate.runtimeMinutes;
    }
  }
  if (report.provenance && typeof report.provenance === 'object') {
    if (typeof report.provenance.engineCommit === 'string') expected.engineCommit = report.provenance.engineCommit;
    if (typeof report.provenance.rulebookCount === 'number') expected.rulebookCount = report.provenance.rulebookCount;
  }
  const bodyClaims = typeof report.plainSummary === 'string' ? collectPlainSummaryClaims(report.plainSummary) : [];
  return { expected, bodyClaims };
}

/** Picks a parser by extension first, then falls back to sniffing content —
 *  a caller who saved a `.txt` copy of the letter, or an `.htm` extension,
 *  should not be refused on the extension alone. */
function parseArtifact(filePath, text) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return { kind: 'json', ...parseJsonReport(text) };
  if (ext === '.html' || ext === '.htm') return { kind: 'html', ...parseHtmlReport(text) };
  if (ext === '.md' || ext === '.markdown' || ext === '.txt') return { kind: 'letter', ...parseLetterReport(text) };

  // Unknown extension: sniff.
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return { kind: 'json', ...parseJsonReport(text) };
  if (/<dl class="verify-claims">/.test(text)) return { kind: 'html', ...parseHtmlReport(text) };
  return { kind: 'letter', ...parseLetterReport(text) };
}

// ── Body-vs-block self-consistency (round-2 review finding 2) ──────────────

/** Compares every collected body claim against the block's own `expected`
 *  value for the same field. Returns a list of human-readable disagreement
 *  strings — empty when the document agrees with itself (or has nothing to
 *  compare, which is not a disagreement). A field the block never claimed
 *  (`expected[claim.field] === undefined`) is skipped: there is nothing to
 *  disagree WITH, and `compareVerifyClaims` never checked it either. */
function findBodyBlockDisagreements(expected, bodyClaims) {
  const disagreements = [];
  for (const claim of bodyClaims) {
    const blockValue = expected[claim.field];
    if (blockValue === undefined) continue;
    // A page-reference body claim is a LIST (the ordered run of page numbers a
    // reader sees beside the findings), compared by the same helper the comparator
    // uses for the claim-versus-engine direction — one definition of what "these
    // page references disagree" means, not two.
    if (claim.kind === 'pages') {
      if (!Array.isArray(blockValue)) continue;
      const detail = bodyPageRefsDisagreement(claim.value, blockValue);
      if (detail !== null) disagreements.push(detail);
      continue;
    }
    const blockCompare = claim.kind === 'rounded' ? Math.round(blockValue) : blockValue;
    // A RENDERING that is not a readable number ("Health 6.5.0/100") cannot be
    // compared at all, and must not be silently skipped: `NaN !== x` is true, so it
    // would already report as a disagreement — but with "NaN" as the value, which
    // reads like a bug rather than like the forgery it is. Named for what it is.
    if (typeof claim.value === 'number' && Number.isNaN(claim.value)) {
      disagreements.push(
        `${claim.label} does not state a readable ${claim.field}, so it cannot be checked against `
        + `this report's verify block (which says ${claim.field} = ${blockCompare})`,
      );
      continue;
    }
    if (blockCompare !== claim.value) {
      disagreements.push(
        `${claim.label} says ${claim.field} = ${claim.value}, but this report's verify block says ${claim.field} = ${blockCompare}`,
      );
    }
  }
  return disagreements;
}

/**
 * A document that RENDERS a reader summary page whose numbers its verify block does
 * not publish cannot be verified — and must not be reported as verified on the
 * strength of the claims that happen to remain.
 *
 * This is the one check that cannot be expressed as a field comparison: deleting a
 * claim row is not a wrong value, it is a missing one, and "only what was claimed
 * is checked" would otherwise hand a forger a way to opt a number out of
 * verification by deleting its row. Returns the missing labels, or [].
 *
 * Every coverage artifact exported before 2026-09-11 renders no tier at all, so
 * this never fires for one — which is the point of gating on the tier's PRESENCE
 * rather than on a version stamp the same forger could edit.
 */
function missingTierClaims(text, kind, rows) {
  if (kind === 'json') return [];
  if (!rendersProducerTier(text, kind)) return [];
  const available = rows ?? {};
  return TIER_CLAIM_LABELS.filter(label => available[label] === undefined);
}

// ── CRLF diagnosis (round-2 review finding 4) ───────────────────────────────
// The route applies NO normalisation beyond fdx conversion before hashing —
// verified directly: server/routes/export.ts's resolveFountainOrRespond()
// returns the raw `fountain` field untouched on the plain-text path, and the
// route hashes with the identical `computeContentHash` (`.trim()` only) this
// CLI imports. So a CLI that reports a CRLF-vs-LF copy as "a different
// script" is being exactly as strict as the route — but a less honest
// DIAGNOSIS than the truth: the likeliest real cross-platform failure is not
// a forged script, it's a Windows checkout, an editor that rewrote line
// endings, or `core.autocrlf=true` (CLAUDE.md already flags this repo's own
// CRLF hazard). Tried both directions since we don't know which the ORIGINAL
// script used.
function normalizeToLf(text) { return text.replace(/\r\n/g, '\n'); }
function normalizeToCrlf(text) { return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'); }

/** Returns true only when the hashes disagree on the raw bytes but agree
 *  after normalising line endings — i.e. the text is genuinely the same
 *  script, differently line-ended, not a different script. */
function hashDiffersOnlyByLineEndings(scriptText, expectedContentHash) {
  return computeContentHash(normalizeToLf(scriptText)) === expectedContentHash
    || computeContentHash(normalizeToCrlf(scriptText)) === expectedContentHash;
}

// ── Presentation helpers ─────────────────────────────────────────────────────

function formatDelta(expected, actual) {
  if (typeof expected !== 'number' || typeof actual !== 'number') return '';
  const delta = actual - expected;
  const sign = delta > 0 ? '+' : '';
  return `, Δ ${sign}${delta.toFixed(2)}`;
}

// The fields reported under "reproducible under this engine" — every content/score
// claim, in the order a reader wants them: the headline numbers first, then the
// producer tier's. `pageRefs` is last because its line is the longest.
const SCORE_FIELDS = [
  'health', 'verdict', 'totalIssues', 'healthPercentile',
  'sceneCount', 'wordCount', 'estimatedPages', 'estimatedRuntimeMinutes',
  'prioritiesListed', 'percentileReading', 'referenceBounds', 'loglineState', 'pageRefs',
];

/** How a claim's value prints on the per-field line. Page references are a list, so
 *  they print through the same encoder the block published them with. */
function formatFieldValue(field, value) {
  if (value === undefined) return '(not resolved)';
  if (field === 'pageRefs') return Array.isArray(value) ? encodePageRefs(value) : String(value);
  return String(value);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(argv) {
  const [reportArg, scriptArg] = argv;
  if (!reportArg || !scriptArg) {
    console.log(usage());
    if (argv.length === 0) return 0; // bare `--help`-shaped invocation: usage is not an error
    return fail('Both <report> and <script.fountain> are required.');
  }

  const reportPath = path.resolve(process.cwd(), reportArg);
  const scriptPath = path.resolve(process.cwd(), scriptArg);
  if (!existsSync(reportPath)) return fail(`Report file not found: ${reportPath}`);
  if (!existsSync(scriptPath)) return fail(`Script file not found: ${scriptPath}`);

  console.log('Story Machine — offline report verification');
  console.log(
    'Privacy: the script text you provided never leaves this machine. This process makes no network '
    + 'call — verification runs entirely in-process, against the local, keyless, deterministic engine.',
  );
  console.log('');
  console.log(`Report: ${reportPath}`);
  console.log(`Script: ${scriptPath}`);
  console.log('');

  // THE ARTIFACT IS NORMALISED; THE SCRIPT IS NOT. A report travels by email, by a
  // Windows checkout, by a copy-paste into an editor — so a leading BOM and CRLF
  // line endings are transport artifacts of the DOCUMENT, not claims it makes, and
  // every `^…$` scrape below would otherwise fail on a `\r` it cannot see: a genuine
  // CRLF letter reported "the summary prints 0 page references" against a block
  // claiming one, because the tier-region divider `---\r` does not match /^---$/m.
  // The SCRIPT text is deliberately left byte-exact — its bytes are what the hash is
  // of, and a CRLF copy of the script is DIAGNOSED as such rather than normalised
  // into a pass (see hashDiffersOnlyByLineEndings above).
  const reportText = readFileSync(reportPath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const scriptText = readFileSync(scriptPath, 'utf8');

  let parsed;
  try {
    parsed = parseArtifact(reportPath, reportText);
  } catch (err) {
    return fail(`Could not read the report: ${err.message}`);
  }
  if (!parsed.expected || !parsed.expected.contentHash) {
    return fail(
      `Could not find a verification hash in this ${parsed.kind} report — nothing to check against.\n`
      + 'Only a report exported with a contentHash (Script Doctor coverage HTML/letter/JSON) can be verified.',
    );
  }
  const { expected, bodyClaims } = parsed;
  console.log(`Parsed as: ${parsed.kind}`);

  // BUG-1 (2026-09-12): a report that renders the producer tier must publish the
  // tier's claims. Checked BEFORE anything else is trusted — a block with the rows
  // deleted is not "fewer claims to check", it is a document whose reader-facing
  // numbers are unverifiable, and printing VERIFIED over one is the failure this
  // whole lane exists to close.
  const missing = missingTierClaims(reportText, parsed.kind, parsed.rows);
  if (missing.length > 0) {
    console.log('');
    console.log('authentic: no \u2014 this report renders a reader summary page whose numbers its verify block does not publish');
    for (const label of missing) console.log(`  missing claim: ${label}`);
    console.log('The summary page states a scene count, a word count, a priorities count and page '
      + 'references. Without those claims they cannot be checked, so this report cannot be verified.');
    return verdictFail(`NOT VERIFIED \u2014 the verify block is missing ${missing.length} claim`
      + `${missing.length === 1 ? '' : 's'} the reader summary page states: ${missing.join(', ')}.`);
  }

  // Round-2 review finding 1: every claim this file parsed by hand must
  // survive the SAME zod schema the route puts in front of its handler
  // before anything downstream trusts it as a number/enum/int at all. A
  // claim this cannot validate is not "no mismatch" — Math.abs(NaN - x) is
  // never > the tolerance, which is exactly how a health claim of
  // "OUTSTANDING" used to sail through as VERIFIED.
  const claimFailure = validateVerifyExpected(expected);
  if (claimFailure) {
    console.log('');
    console.log(`authentic: no — claim unreadable: ${claimFailure.field}`);
    console.log(`  ${claimFailure.message}`);
    console.log('A claim that cannot be validated must never read as checked — no further comparison performed.');
    return verdictFail(`NOT VERIFIED — claim unreadable: ${claimFailure.field}.`);
  }

  // Round-2 review finding 2: does the document agree with ITSELF? The
  // hosted route never sees this — it only ever receives whichever claims a
  // caller scraped and sent it. This CLI holds the whole rendered document,
  // so a forgery confined to what a human actually reads (the health
  // headline, the verdict stamp, the summary sentence) — with the verify
  // block left untouched — is checkable here and must not pass silently.
  const disagreements = findBodyBlockDisagreements(expected, bodyClaims);
  if (disagreements.length > 0) {
    console.log('');
    console.log('authentic: no — the visible report disagrees with its own verify block');
    for (const d of disagreements) console.log(`  ${d}`);
    console.log('A report whose own rendered numbers contradict its verify block cannot be trusted — no further comparison performed.');
    return verdictFail('NOT VERIFIED — the visible report disagrees with its own verify block.');
  }

  const actualContentHash = computeContentHash(scriptText);
  const hashResult = checkContentHash(actualContentHash, expected);
  const authentic = hashResult === null;

  console.log('');
  console.log(`authentic: ${authentic ? 'yes' : 'no'}  (does the provided script's sha256 match this report's claimed hash?)`);
  if (!authentic) {
    console.log(`  report's claimed contentHash: ${expected.contentHash}`);
    console.log(`  this script's contentHash:    ${actualContentHash}`);
    console.log('');
    // Round-2 review finding 4: the route applies no CRLF normalisation
    // either (verified against server/routes/export.ts directly), so a
    // byte-for-byte hash mismatch here is exactly as strict as the hosted
    // path — but "a different script" is the wrong DIAGNOSIS for the
    // single most likely real cross-platform failure: the same script,
    // copied across a CRLF/LF boundary (a Windows checkout, an editor
    // rewrite, this repo's own documented `core.autocrlf` hazard).
    if (hashDiffersOnlyByLineEndings(scriptText, expected.contentHash)) {
      console.log('The hash differs only by line endings — re-export from the same platform or normalise your copy to match, then re-verify.');
      return verdictFail('NOT VERIFIED — the hash differs only by line endings, not by content.');
    }
    console.log('This report does not describe the script you provided — no further comparison performed.');
    return verdictFail('NOT VERIFIED — the script text does not match this report.');
  }
  console.log(`  contentHash: ${actualContentHash}`);

  const report = await runScriptDoctor(scriptText);
  if (!isWholeDraftAnalysisComplete(report)) {
    console.log('');
    console.log('Verification is unavailable: this script could not be analyzed completely '
      + '(analysisComplete: false) — no score exists to compare.');
    return verdictFail('NOT VERIFIED — analysis incomplete.');
  }

  // The script text is passed so the producer tier's claims are RECOMPUTED rather
  // than read off the report — page references re-resolved through the same
  // paginator that lays out the PDF, the logline state re-derived from the text.
  const comparison = compareVerifyClaims(report, expected, scriptText);

  console.log('');
  console.log('reproducible under this engine:');
  const scoreFieldsChecked = comparison.checked.filter((f) => SCORE_FIELDS.includes(f));
  if (scoreFieldsChecked.length === 0) {
    console.log('  (this report published no score fields to check — only the content hash above was verified)');
  }
  for (const field of scoreFieldsChecked) {
    const mismatch = comparison.mismatches.find((m) => m.field === field);
    const expectedValue = expected[field];
    const actualValue = comparison.recomputed[field];
    const delta = formatDelta(expectedValue, actualValue);
    console.log(`  ${field}: ${mismatch ? 'no ' : 'yes'}  (report ${formatFieldValue(field, expectedValue)}, `
      + `local ${formatFieldValue(field, actualValue)}${delta})`);
    // A list-valued mismatch needs the one sentence that says WHICH entry moved —
    // diffing two encoded page-reference strings by eye is not a diagnosis.
    if (mismatch?.detail) console.log(`    ${mismatch.detail}`);
  }

  // The claims this artifact's shape does not state, named rather than left as a
  // silent gap: a reader has to be able to tell "checked and fine" from "never
  // claimed, so never checked".
  const unclaimed = SCORE_FIELDS.filter((f) => expected[f] === undefined);
  if (unclaimed.length > 0) {
    console.log(`  not claimed by this ${parsed.kind} report, so not checked: ${unclaimed.join(', ')}`);
  }

  const reportEngineCommit = expected.engineCommit ?? '(not stated in this report)';
  const engineMatches = expected.engineCommit !== undefined && expected.engineCommit === localEngineCommit;
  console.log('');
  console.log(`engine: report ${reportEngineCommit} vs local ${localEngineCommit}`
    + (expected.engineCommit === undefined ? '' : engineMatches ? '  (match)' : '  (MISMATCH)'));
  console.log(
    '  Reproduction is not attestation: this only proves this build of the engine reproduces these '
    + 'numbers on this text, not that the published engine did.',
  );
  if (expected.rulebookCount !== undefined) {
    const rbMismatch = comparison.mismatches.find((m) => m.field === 'rulebookCount');
    console.log(`  rulebookCount: report ${expected.rulebookCount}, local ${comparison.recomputed.rulebookCount}${rbMismatch ? '  (differs)' : ''}`);
  }

  // Round-2 review finding 3: compareVerifyClaims computes this advisory
  // (server/lib/verify-compare.ts's ENGINE_MISMATCH_MESSAGE) and sets
  // `mismatchKind: 'engine_mismatch'` for exactly this reason — the route
  // ships it to every HTTP caller. Printing it, and printing it as the LAST
  // thing before the verdict, is what stops a skimming reader (or a script
  // parsing only the final line) from seeing a bare "VERIFIED" and missing
  // that the report's engine identity did not match this one.
  if (comparison.mismatchKind === 'engine_mismatch') {
    console.log('');
    console.log(comparison.message);
  }

  console.log('');
  console.log(VERIFY_SCOPE_SENTENCE);
  console.log('');
  if (comparison.verified) {
    console.log(
      comparison.mismatchKind === 'engine_mismatch'
        ? 'VERIFIED (engine identity differs — see the advisory above) — authentic and reproducible under this engine.'
        : 'VERIFIED — authentic and reproducible under this engine.',
    );
    return 0;
  }
  const failedFields = comparison.mismatches
    .filter((m) => !ENGINE_IDENTITY_FIELDS.has(m.field))
    .map((m) => m.field);
  return verdictFail(`NOT VERIFIED — reproduction disagrees on: ${failedFields.join(', ')}.`);
}

main(process.argv.slice(2)).then((code) => {
  if (typeof code === 'number') process.exitCode = code;
}).catch((err) => {
  console.error(`verify-report failed: ${err && err.stack ? err.stack : err}`);
  process.exitCode = 1;
});
