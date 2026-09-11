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

async function main(): Promise<void> {
  const { html, contentHash, report } = await renderP0SampleReport();

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, html, 'utf8');

  // Verification facts — printed so the artifact's provenance is auditable and
  // so re-running proves determinism (same contentHash => same report).
  process.stdout.write(
    [
      'P0 sample coverage report generated.',
      `  file:        ${path.relative(path.join(__dirname, '..'), OUT_FILE)}`,
      `  title:       ${sampleTitle}`,
      `  health:      ${report.health}`,
      `  verdict:     ${report.verdict}`,
      `  sceneCount:  ${report.sceneCount}`,
      `  contentHash: ${contentHash}`,
      `  htmlBytes:   ${Buffer.byteLength(html, 'utf8')}`,
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
