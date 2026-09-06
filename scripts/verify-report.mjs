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
import { checkContentHash, compareVerifyClaims, ENGINE_IDENTITY_FIELDS } from '../server/lib/verify-compare.ts';
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

/** `<dl class="verify-claims">` — coverage-html.ts's buildFooterSection.
 *  Same block tests/routes/export-verify.test.ts's scrapeVerifyClaims()
 *  reads; this is the CLI's own copy of that scrape (format-specific
 *  extraction, not the comparison logic verify-compare.ts shares). */
function parseHtmlReport(text) {
  const block = text.match(/<dl class="verify-claims">([\s\S]*?)<\/dl>/);
  if (!block) return null;
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
  return expected;
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
  return Object.keys(expected).length > 0 ? expected : null;
}

/** A raw ScriptDoctorReport JSON — either the object itself (what
 *  POST /api/scriptide/doctor returns, spread at the top level) or `{
 *  report: {...} }` (a caller-chosen wrapper), read leniently. */
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
  if (!report) return null;
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
  return expected;
}

/** Picks a parser by extension first, then falls back to sniffing content —
 *  a caller who saved a `.txt` copy of the letter, or an `.htm` extension,
 *  should not be refused on the extension alone. */
function parseArtifact(filePath, text) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return { kind: 'json', expected: parseJsonReport(text) };
  if (ext === '.html' || ext === '.htm') return { kind: 'html', expected: parseHtmlReport(text) };
  if (ext === '.md' || ext === '.markdown' || ext === '.txt') return { kind: 'letter', expected: parseLetterReport(text) };

  // Unknown extension: sniff.
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return { kind: 'json', expected: parseJsonReport(text) };
  if (/<dl class="verify-claims">/.test(text)) return { kind: 'html', expected: parseHtmlReport(text) };
  return { kind: 'letter', expected: parseLetterReport(text) };
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
  const { expected } = parsed;
  console.log(`Parsed as: ${parsed.kind}`);

  const actualContentHash = computeContentHash(scriptText);
  const hashResult = checkContentHash(actualContentHash, expected);
  const authentic = hashResult === null;

  console.log('');
  console.log(`authentic: ${authentic ? 'yes' : 'no'}  (does the provided script's sha256 match this report's claimed hash?)`);
  if (!authentic) {
    console.log(`  report's claimed contentHash: ${expected.contentHash}`);
    console.log(`  this script's contentHash:    ${actualContentHash}`);
    console.log('');
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

  console.log('');
  if (comparison.verified) {
    console.log('VERIFIED — authentic and reproducible under this engine.');
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
