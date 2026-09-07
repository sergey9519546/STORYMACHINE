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
} from '../server/lib/verify-compare.ts';
import { commit as localEngineCommit } from '../server/lib/build-info.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── CLI plumbing ─────────────────────────────────────────────────────────────

function usage() {
  return [
    'Usage: npm run verify-report -- <report.html|letter.md|report.json> <script.fountain>',
    '',
    'Re-attests a Story Machine coverage report against the ORIGINAL script text,',
    'entirely on this machine. The script text is never sent anywhere.',
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

/** `<dl class="verify-claims">` — coverage-html.ts's buildFooterSection.
 *  Same block tests/routes/export-verify.test.ts's scrapeVerifyClaims()
 *  reads; this is the CLI's own copy of that scrape (format-specific
 *  extraction, not the comparison logic verify-compare.ts shares). */
function parseHtmlReport(text) {
  const block = text.match(/<dl class="verify-claims">([\s\S]*?)<\/dl>/);
  if (!block) return { expected: null, bodyClaims: [] };
  const claims = {};
  for (const [, term, value] of block[1].matchAll(/<dt>([^<]+)<\/dt><dd><code>([^<]*)<\/code><\/dd>/g)) {
    claims[unescapeHtml(term).trim()] = unescapeHtml(value).trim();
  }
  const expected = {};
  if (claims['Script-text hash (SHA-256, full)']) expected.contentHash = claims['Script-text hash (SHA-256, full)'];
  if (claims['Health'] !== undefined) expected.health = Number(claims['Health']);
  if (claims['Verdict'] !== undefined) expected.verdict = claims['Verdict'];
  if (claims['Total issues'] !== undefined) expected.totalIssues = Number(claims['Total issues']);
  if (claims['Engine commit'] !== undefined) expected.engineCommit = claims['Engine commit'];
  if (claims['Rulebook count'] !== undefined) expected.rulebookCount = Number(claims['Rulebook count']);

  // The two reader-facing renderings a verify-claims-only scrape used to
  // ignore entirely (coverage-html.ts's buildHeaderSection/buildHealthSection):
  //   <div class="health-number" style="...">65.0</div>
  //   <div class="stamp" style="...">RECOMMEND</div>   (verdictStyle.label —
  //     the SAME reverse map the letter parser already uses for its
  //     "PASS (decline)" -> "PASS" wrapping, reused here.)
  const bodyClaims = collectPlainSummaryClaims(text);
  const healthNumberMatch = text.match(/<div class="health-number"[^>]*>([\d.]+)<\/div>/);
  if (healthNumberMatch) {
    bodyClaims.push({ label: 'the health headline', field: 'health', value: Number(healthNumberMatch[1]), kind: 'exact' });
  }
  const stampMatch = text.match(/<div class="stamp"[^>]*>([\s\S]*?)<\/div>/);
  if (stampMatch) {
    const label = unescapeHtml(stampMatch[1].trim());
    bodyClaims.push({ label: 'the verdict stamp', field: 'verdict', value: VERDICT_LABEL_TO_ENUM[label] ?? label, kind: 'exact' });
  }

  return { expected, bodyClaims };
}

/** coverage-letter.ts's verify footer — server/lib/coverage-letter.ts:383-398.
 *  hashLine and provenanceLine are byte-identical strings in BOTH the
 *  markdown and plain-text renderers (renderMarkdown/renderText each just
 *  `lines.push(d.hashLine)`/`lines.push(d.provenanceLine)`); only the
 *  verdict line's wrapping differs (`**Verdict: X**` vs `VERDICT: X`), and
 *  the headline (`Health X.X/100 (Grade) · ...`) is pushed as the same
 *  literal string either way — so one set of patterns covers a `.md` or a
 *  `.txt` export of the same letter. */
const VERDICT_LABEL_TO_ENUM = { RECOMMEND: 'RECOMMEND', CONSIDER: 'CONSIDER', 'PASS (decline)': 'PASS' };

function parseLetterReport(text) {
  const expected = {};

  const hashMatch = text.match(/Script-text hash \(SHA-256\):\s*([0-9a-f]{64})/i);
  if (hashMatch) expected.contentHash = hashMatch[1];

  const verdictMatch = text.match(/\*\*Verdict:\s*(.+?)\*\*/) ?? text.match(/^VERDICT:\s*(.+)$/m);
  if (verdictMatch) {
    const label = verdictMatch[1].trim();
    expected.verdict = VERDICT_LABEL_TO_ENUM[label] ?? label;
  }

  const healthMatch = text.match(/Health\s+([\d.]+)\/100/);
  if (healthMatch) expected.health = Number(healthMatch[1]);

  const provenanceMatch = text.match(/Engine commit:\s*(\S+)\s*(?:·|·)\s*Rulebook:\s*([\d,]+)\s*rule concepts\./);
  if (provenanceMatch) {
    expected.engineCommit = provenanceMatch[1];
    expected.rulebookCount = Number(provenanceMatch[2].replace(/,/g, ''));
  }

  // The letter never publishes totalIssues or healthPercentile (see
  // coverage-letter.ts's buildLetterData) — left unset, exactly like a
  // route caller who never named them: `compareVerifyClaims` only checks
  // fields present in `expected`.
  if (Object.keys(expected).length === 0) return { expected: null, bodyClaims: [] };

  // Unlike the HTML shape, the letter's headline/bold-verdict-line ARE the
  // primary source parsed above — there is no separate machine-readable
  // block duplicating them for a forger to leave untouched. The doctor's
  // plainSummary sentence (present verbatim in the letter's `## Summary` /
  // `SUMMARY` section either way) is still a genuinely SEPARATE rendering,
  // though, so the same self-consistency check applies here too — see the
  // header comment above `PLAIN_SUMMARY_RE`.
  return { expected, bodyClaims: collectPlainSummaryClaims(text) };
}

/** A raw ScriptDoctorReport JSON — either the object itself (what
 *  POST /api/scriptide/doctor returns, spread at the top level) or `{
 *  report: {...} }` (a caller-chosen wrapper), read leniently. `bodyClaims`
 *  here is a genuine (if narrow) self-consistency check even though JSON has
 *  no separate "rendered" surface: `report.plainSummary` and
 *  `report.health`/`report.verdict` are still three independently-editable
 *  fields of the same hand-editable file, and nothing else in this format
 *  would catch one moving without the others. */
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
    const blockCompare = claim.kind === 'rounded' ? Math.round(blockValue) : blockValue;
    if (blockCompare !== claim.value) {
      disagreements.push(
        `${claim.label} says ${claim.field} = ${claim.value}, but this report's verify block says ${claim.field} = ${blockCompare}`,
      );
    }
  }
  return disagreements;
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

const SCORE_FIELDS = ['health', 'verdict', 'totalIssues', 'healthPercentile'];

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

  const reportText = readFileSync(reportPath, 'utf8');
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

  const comparison = compareVerifyClaims(report, expected);

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
    console.log(`  ${field}: ${mismatch ? 'no ' : 'yes'}  (report ${expectedValue}, local ${actualValue}${delta})`);
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
