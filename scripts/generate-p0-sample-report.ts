// P0 sample coverage report generator.
//
// WHY: P0 (ROADMAP.md §3) validates demand by showing real screenwriters the
// EXISTING sample coverage report and observing whether it creates pull toward
// running their own draft. That validation needs a stable, committed artifact
// to show — not an ad-hoc dev-server click that could drift between sessions.
// This script renders the built-in "The Second Key" sample through the exact
// same pipeline the /api/export/coverage route uses (runScriptDoctor +
// renderCoverageHtml), writes it to docs/user-validation/sample-coverage-report.html,
// and prints the verification facts (health, verdict, sceneCount, contentHash)
// so the artifact is reproducible and auditable.
//
// This is a P0-enablement tool, not product/engine code: it adds no rules,
// touches no formula, and imports only the existing deterministic surface.
// Run with:  npm run generate-p0-sample

import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fountain as sampleFountain, title as sampleTitle } from '../src/lib/sample-script.ts';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { renderCoverageHtml } from '../server/lib/coverage-html.ts';
import { extractTitlePage, buildLogline } from '../server/lib/logline.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { buildRootCausePipeline } from '../server/lib/root-cause-pipeline.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../docs/user-validation');
export const OUT_FILE = path.join(OUT_DIR, 'sample-coverage-report.html');

/** The start screen's headline card, as DATA (2026-09-12, adversarial finding #6).
 *
 *  THE DEFECT. `src/components/StartScreen.tsx` rendered a report card in the
 *  product's own report styling — VERDICT Consider / HEALTH 76 / NEXT Climax
 *  engagement / COUNTS 3 · 38 · 159 — directly beside a button reading "See it
 *  on the sample". Every number was a hardcoded literal, and none of them was
 *  what the sample produces (78 / 2 · 32 · 139). For a product whose pitch is
 *  that its numbers are reproducible and inspectable, the first four numbers on
 *  the front door were stale fiction, discoverable in about six seconds by
 *  clicking the button next to them.
 *
 *  This file is the second artifact this generator writes, so the panel renders
 *  from a run of the doctor on `src/lib/sample-script.ts` rather than from prose
 *  somebody typed. `tests/core/sample-coverage-facts.test.ts` fails when the
 *  committed values drift from a fresh run — the same shape as
 *  tests/core/rulebook.test.ts. */
export const FACTS_FILE = path.join(__dirname, '../src/lib/sample-coverage-facts.ts');

/**
 * Render the committed P0 sample exactly as POST /api/export/coverage would.
 *
 * EXPORTED (2026-09-11) so the drift guard — tests/core/p0-sample-drift.test.ts —
 * can call the SAME function this script writes the file with, rather than
 * re-assembling the pipeline and then proving only that two copies of the
 * assembly agree. The guard's whole value is that it compares the committed bytes
 * against what the generator produces today; a second assembly would let the
 * generator and the sample drift together.
 *
 * VERIFIED byte-identical to the live keyless route on 2026-09-11: a real
 * POST /api/export/coverage of the same sample returned 226,783 bytes differing
 * from this output on exactly one line — the footer's "Generated <timestamp>",
 * which is `analyzedAt`, a wall clock the doctor refreshes on every call. That is
 * the same single field scripts/check-doctor-output-identity.mjs excludes, and the
 * drift guard masks it for the same reason.
 */
export async function renderP0SampleReport(): Promise<{ html: string; contentHash: string; report: Awaited<ReturnType<typeof runScriptDoctor>> }> {
  // Mirror POST /api/export/coverage (server/routes/export.ts) exactly so the
  // committed artifact is byte-identical to what a real export would produce.
  const report = await runScriptDoctor(sampleFountain);
  const contentHash = report.contentHash
    ?? createHash('sha256').update(sampleFountain.trim()).digest('hex');

  const titlePage = extractTitlePage(sampleFountain);
  const { records } = analyzeFountainText(sampleFountain);
  const logline = buildLogline(report, records, sampleFountain);

  // Root-cause clustering (pilot session 2026-08-07 finding #3): the SAME
  // shared pipeline POST /api/export/coverage runs (server/lib/
  // root-cause-pipeline.ts), so this committed sample stays byte-identical to
  // a real export — including the Root Causes section surfaced in
  // coverage-html.ts. Until 2026-09-11 this was a hand-assembled copy of that
  // route's (then also wrong) two-call pattern with the scene spans omitted:
  // the committed sample therefore disagreed with the in-app panel about which
  // scenes its own findings were in.
  const { rootCauses } = buildRootCausePipeline(report, sampleFountain);

  const html = renderCoverageHtml({ ...report, contentHash, rootCauses }, sampleTitle, {
    titlePageTitle: titlePage.title,
    titlePageAuthor: titlePage.author,
    logline,
    // Same as the live route (2026-09-11): the script text, so the producer tier's
    // page references resolve. Keeping this in step with the route is what makes
    // the committed sample byte-identical to a real export.
    fountain: sampleFountain,
  });

  return { html, contentHash, report };
}

/** The facts the start screen's card shows, derived from one doctor run.
 *
 *  EXPORTED and pure for the same reason renderP0SampleReport is: the drift
 *  guard (tests/core/sample-coverage-facts.test.ts) calls THIS function on a
 *  fresh report and compares it against the committed module, rather than
 *  re-deriving the fields and proving only that two derivations agree.
 *
 *  `health` is the DISPLAY number (the panel has room for one integer, and both
 *  the Coverage panel and the exported report round it the same way —
 *  Math.round(report.health)); `healthExact` keeps the unrounded value so the
 *  drift guard can catch a move too small to change the rounded one. */
export function buildSampleCoverageFacts(
  report: Awaited<ReturnType<typeof runScriptDoctor>>,
  contentHash: string,
): {
  title: string;
  verdict: string;
  health: number;
  healthExact: number;
  grade: string;
  sceneCount: number;
  critical: number;
  major: number;
  minor: number;
  nextFixLocation: string;
  nextFixRule: string;
  llmJudge: string;
  contentHash: string;
} {
  const top = report.topPriorities?.[0];
  return {
    title: sampleTitle,
    // `verdict` is optional on ScriptDoctorReport (types.ts:329) — a report
    // that withheld it would make the card's Verdict cell read "—" rather than
    // assert one. The drift guard asserts the sample does produce it.
    verdict: report.verdict ?? '',
    health: Math.round(report.health),
    healthExact: report.health,
    grade: report.grade,
    sceneCount: report.sceneCount,
    critical: report.bySeverity.critical,
    major: report.bySeverity.major,
    minor: report.bySeverity.minor,
    // The top priority's own LOCATION, not a hand-written summary of it: a
    // phrase nobody typed cannot go stale against the report it describes.
    nextFixLocation: top?.location ?? 'No blocking issues',
    nextFixRule: top?.rule ?? '',
    // `deepRead` is the only LLM-derived block a report can carry
    // (server/nvm/analyze/types.ts). The sample is analysed keyless, so this
    // reads "None" — and it now reads it because the report says so.
    llmJudge: report.deepRead ? 'Deep read' : 'None',
    contentHash,
  };
}

/** The committed module's bytes. Written by main() below, read by the start
 *  screen and by the drift guard. */
export function renderSampleCoverageFactsModule(
  facts: ReturnType<typeof buildSampleCoverageFacts>,
): string {
  return [
    '// GENERATED FILE — do not edit by hand. Run `npm run generate-p0-sample`.',
    '//',
    "// The start screen's Coverage card, as data (2026-09-12, adversarial audit",
    '// finding #6). Every number here comes from one run of the doctor on',
    '// src/lib/sample-script.ts — the same script "See it on the sample" analyses —',
    '// so the first numbers a stranger sees are the numbers that button produces.',
    '// Before this file existed the card held hardcoded literals (HEALTH 76,',
    '// COUNTS 3 · 38 · 159) that the sample had not produced for some time.',
    '//',
    '// tests/core/sample-coverage-facts.test.ts fails when these values drift from',
    '// a fresh run, so the card cannot silently go stale again.',
    '',
    'export interface SampleCoverageFacts {',
    '  /** Title of the sample script these numbers describe. */',
    '  title: string;',
    '  /** The verdict, verbatim (e.g. "CONSIDER"). */',
    '  verdict: string;',
    '  /** Health as the panel shows it — Math.round(report.health). */',
    '  health: number;',
    '  /** Health unrounded, so the drift guard catches a sub-point move. */',
    '  healthExact: number;',
    '  grade: string;',
    '  sceneCount: number;',
    '  critical: number;',
    '  major: number;',
    '  minor: number;',
    "  /** The top priority's own location string — not a hand-written summary. */",
    '  nextFixLocation: string;',
    '  /** The rule that produced it, for the card\'s title attribute. */',
    '  nextFixRule: string;',
    '  /** "None" keyless; "Deep read" when a report carries an LLM block. */',
    '  llmJudge: string;',
    '  /** The sample\'s contentHash — the same receipt the report publishes. */',
    '  contentHash: string;',
    '}',
    '',
    'export const SAMPLE_COVERAGE_FACTS: SampleCoverageFacts = {',
    `  title: ${JSON.stringify(facts.title)},`,
    `  verdict: ${JSON.stringify(facts.verdict)},`,
    `  health: ${facts.health},`,
    `  healthExact: ${facts.healthExact},`,
    `  grade: ${JSON.stringify(facts.grade)},`,
    `  sceneCount: ${facts.sceneCount},`,
    `  critical: ${facts.critical},`,
    `  major: ${facts.major},`,
    `  minor: ${facts.minor},`,
    `  nextFixLocation: ${JSON.stringify(facts.nextFixLocation)},`,
    `  nextFixRule: ${JSON.stringify(facts.nextFixRule)},`,
    `  llmJudge: ${JSON.stringify(facts.llmJudge)},`,
    `  contentHash: ${JSON.stringify(facts.contentHash)},`,
    '};',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const { html, contentHash, report } = await renderP0SampleReport();

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, html, 'utf8');

  const facts = buildSampleCoverageFacts(report, contentHash);
  writeFileSync(FACTS_FILE, renderSampleCoverageFactsModule(facts), 'utf8');

  // Verification facts — printed so the artifact's provenance is auditable and
  // so re-running proves determinism (same contentHash => same report).
  process.stdout.write(
    [
      'P0 sample coverage report generated.',
      `  file:        ${path.relative(path.join(__dirname, '..'), OUT_FILE)}`,
      `  facts:       ${path.relative(path.join(__dirname, '..'), FACTS_FILE)}`,
      `  title:       ${sampleTitle}`,
      `  health:      ${report.health}`,
      `  verdict:     ${report.verdict}`,
      `  sceneCount:  ${report.sceneCount}`,
      `  contentHash: ${contentHash}`,
      `  htmlBytes:   ${Buffer.byteLength(html, 'utf8')}`,
      `  startCard:   VERDICT ${facts.verdict} · HEALTH ${facts.health} · `
        + `COUNTS ${facts.critical} · ${facts.major} · ${facts.minor} · NEXT ${facts.nextFixLocation}`,
      '',
      'Determinism check: re-run this command; contentHash must be identical.',
      '',
    ].join('\n'),
  );
}

// Only when RUN, never when imported (2026-09-11). tests/core/p0-sample-drift.test.ts
// imports renderP0SampleReport to compare the committed bytes against a fresh
// render; without this guard that import would also REWRITE the file it is meant
// to be checking, and the guard could never fail.
const invokedDirectly = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((err: unknown) => {
    process.stderr.write(`generate-p0-sample-report failed: ${(err as Error).message}\n`);
    process.exitCode = 1;
  });
}
