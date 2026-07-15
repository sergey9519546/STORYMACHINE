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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../docs/user-validation');
const OUT_FILE = path.join(OUT_DIR, 'sample-coverage-report.html');

async function main(): Promise<void> {
  // Mirror POST /api/export/coverage (server/routes/export.ts) exactly so the
  // committed artifact is byte-identical to what a real export would produce.
  const report = await runScriptDoctor(sampleFountain);
  const contentHash = report.contentHash
    ?? createHash('sha256').update(sampleFountain.trim()).digest('hex');

  const titlePage = extractTitlePage(sampleFountain);
  const { records } = analyzeFountainText(sampleFountain);
  const logline = buildLogline(report, records, sampleFountain);

  const html = renderCoverageHtml({ ...report, contentHash }, sampleTitle, {
    titlePageTitle: titlePage.title,
    titlePageAuthor: titlePage.author,
    logline,
  });

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

main().catch((err: unknown) => {
  process.stderr.write(`generate-p0-sample-report failed: ${(err as Error).message}\n`);
  process.exitCode = 1;
});
