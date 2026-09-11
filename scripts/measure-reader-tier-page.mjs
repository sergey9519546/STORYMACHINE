#!/usr/bin/env node
// Does the producer tier fit ONE printed page? Measure it, in print media, in a
// real browser.
//
// ── Why a browser ───────────────────────────────────────────────────────────
//
// "One printed page" is a claim about laid-out geometry, and nothing in a unit
// test can make it. This script renders a real exported coverage report in
// Chromium, switches the emulated media to `print` (so the @page margins and the
// @media print rules in server/lib/coverage-html.ts's STYLES apply), and measures
// the tier's bounding box against the printable band.
//
// THE BAND: server/lib/coverage-html.ts sets `@page { size: letter portrait;
// margin: 0.65in }`. US Letter is 11in tall, so the printable height is
// 11 - 1.3 = 9.7in = 931.2 CSS px at 96 dpi.
//
// ── MEASURED, 2026-09-11 (keyless, Chromium via PW_CHROMIUM_PATH) ───────────
//
// Re-run to reproduce; the numbers this run produced are printed at the end and
// recorded in the lane report. The tier is also given `break-after: page` in
// print, so the full report always starts on sheet two — this script exists to
// prove the tier itself does not OVERFLOW onto a second sheet.
//
// Usage:
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/measure-reader-tier-page.mjs
//
// Exit codes: 0 = the tier fits on every script measured. 1 = at least one
// overflowed (the per-script lines say which, and by how much).

import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launchChromium } from './lib/browser-verify.mjs';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { renderCoverageHtml } from '../server/lib/coverage-html.ts';
import { buildLogline } from '../server/lib/logline.ts';
import { renderReaderTierText, buildReaderTier } from '../server/lib/reader-tier.ts';
import { buildRootCausePipeline } from '../server/lib/root-cause-pipeline.ts';

const PRINTABLE_PX = (11 - 2 * 0.65) * 96; // 931.2

// One short, one mid, and the 231-scene feature — the three shapes the tier has
// to survive. The feature is the worst case for description length.
const TARGETS = [
  'data/screenplays/runoff.fountain',
  'data/screenplays/dead-frequency.fountain',
  'tests/fixtures/feature-length/assembled-feature.fountain',
];

async function main() {
  const outDir = mkdtempSync(join(tmpdir(), 'tier-measure-'));
  const browser = await launchChromium();
  const page = await browser.newPage();
  await page.emulateMedia({ media: 'print' });

  let failures = 0;
  const rows = [];

  for (const rel of TARGETS) {
    const fountain = readFileSync(rel, 'utf8');
    const report = await runScriptDoctor(fountain);
    const { records } = analyzeFountainText(fountain);
    const { rootCauses } = buildRootCausePipeline(report, fountain);
    const html = renderCoverageHtml({ ...report, rootCauses }, rel.split('/').pop(), {
      logline: buildLogline(report, records, fountain),
      fountain,
    });
    const file = join(outDir, `${rel.replace(/[^\w]+/g, '_')}.html`);
    writeFileSync(file, html, 'utf8');
    await page.goto(`file://${file}`);

    const box = await page.evaluate(() => {
      const el = document.querySelector('.reader-tier');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height, bottom: r.bottom };
    });
    if (!box) {
      process.stdout.write(`FAIL ${rel}: no .reader-tier element in the export\n`);
      failures += 1;
      continue;
    }
    const tierText = renderReaderTierText(buildReaderTier(report, {
      logline: buildLogline(report, records, fountain), fountain,
    }));
    const fits = box.bottom <= PRINTABLE_PX;
    if (!fits) failures += 1;
    rows.push({ rel, height: box.height, bottom: box.bottom, chars: tierText.length, fits });
    process.stdout.write(
      `${fits ? 'PASS' : 'FAIL'} ${rel}\n`
      + `     tier height ${box.height.toFixed(1)}px, bottom edge ${box.bottom.toFixed(1)}px `
      + `of ${PRINTABLE_PX.toFixed(1)}px printable (${((box.bottom / PRINTABLE_PX) * 100).toFixed(1)}% of the page)\n`
      + `     tier text ${tierText.length} characters\n`,
    );
  }

  await browser.close();

  const worst = rows.reduce((a, b) => (b.bottom > (a?.bottom ?? -1) ? b : a), null);
  if (worst) {
    const headroomPx = PRINTABLE_PX - worst.bottom;
    // Characters per pixel at the tier's measured metrics, used to turn the
    // geometric headroom into the CI-checkable character budget in
    // tests/core/reader-tier.test.ts.
    const charsPerPx = worst.chars / worst.height;
    process.stdout.write(
      `\nworst case: ${worst.rel} at ${worst.bottom.toFixed(1)}px `
      + `(${headroomPx.toFixed(1)}px headroom, ${worst.chars} characters)\n`
      + `implied character budget at this density: `
      + `${Math.floor(worst.chars + headroomPx * charsPerPx)}\n`,
    );
  }
  process.stdout.write(failures === 0
    ? '\nALL PASS — the producer tier fits one printed page on every script measured.\n'
    : `\n${failures} script(s) overflowed one printed page.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`measure-reader-tier-page failed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
