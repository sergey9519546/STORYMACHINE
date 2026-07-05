// Run 14, Deliverable 1 — Slate Triage. Pure module (no I/O, no Date.now(),
// no randomness) for turning a batch of already-computed ScriptDoctorReports
// into a ranked slate: which of N submitted scripts is the strongest bet,
// which craft dimension each one leans on, and where each one is weakest.
// POST /api/export/slate (server/routes/export.ts) is responsible for
// actually running the doctor per script (LRU-cached, so repeats are free)
// and calling into this module only with already-computed reports — same
// "recompute for authenticity, render as a pure function of the result"
// split as server/lib/coverage-html.ts.
//
// SECURITY: `title` is producer-supplied free text (screenplay title, not
// developer-authored) — the one field in a SlateEntry that isn't derived
// from a fixed, developer-controlled vocabulary. Every interpolation of it
// (and, defensively, of the dimension/verdict labels alongside it) goes
// through escapeHtml() in renderSlateHtml.

import type { ScriptDoctorReport, DimensionScore } from '../nvm/analyze/types.ts';

export interface SlateEntry {
  title: string;
  health: number;
  verdict?: ScriptDoctorReport['verdict'];
  healthPercentile?: number;
  sceneCount: number;
  wordCount: number;
  /** Label (e.g. "Structure & Pacing") of the dimension with the highest score. */
  topDimension: string;
  /** Label of the dimension with the lowest score. */
  weakestDimension: string;
  contentHash: string;
}

/** Pick the strongest/weakest of a report's 5 craft dimensions by score.
 *  Ties resolve to whichever dimension appears first in DIMENSION_DEFS order
 *  (doctor.ts's fixed dimension ordering) since `dimensions` is always
 *  emitted in that order — deterministic without a secondary sort key.
 *  Returns 'N/A' for both when a report carries no dimensions at all (the
 *  degenerate zero-scene case). */
export function pickTopWeakestDimensions(dimensions: DimensionScore[]): { top: string; weakest: string } {
  if (dimensions.length === 0) return { top: 'N/A', weakest: 'N/A' };

  let top = dimensions[0];
  let weakest = dimensions[0];
  for (const dim of dimensions) {
    if (dim.score > top.score) top = dim;
    if (dim.score < weakest.score) weakest = dim;
  }
  return { top: top.label, weakest: weakest.label };
}

/** Build one slate entry from an already-computed report. `contentHash` is
 *  threaded in separately (not read off `report.contentHash`) so the caller
 *  can apply the same fallback-compute-if-absent discipline the coverage
 *  export uses (runScriptDoctor doesn't always populate it yet — see
 *  types.ts's own doc comment on ScriptDoctorReport.contentHash). */
export function buildSlateEntry(title: string, report: ScriptDoctorReport, contentHash: string): SlateEntry {
  const { top, weakest } = pickTopWeakestDimensions(report.dimensions ?? []);
  return {
    title,
    health: report.health,
    verdict: report.verdict,
    healthPercentile: report.healthPercentile,
    sceneCount: report.sceneCount,
    wordCount: report.wordCount,
    topDimension: top,
    weakestDimension: weakest,
    contentHash,
  };
}

/** Rank entries by health, descending. Array.prototype.sort is stable, so
 *  scripts with equal health keep their submission order rather than being
 *  reshuffled arbitrarily. */
export function rankSlate(entries: SlateEntry[]): SlateEntry[] {
  return [...entries].sort((a, b) => b.health - a.health);
}

// ── HTML rendering (comparative table, print-friendly) ───────────────────────

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function healthBandColor(score: number): { fg: string; bg: string } {
  if (score >= 90) return { fg: '#14532d', bg: '#1a7f37' };
  if (score >= 75) return { fg: '#14532d', bg: '#2f855a' };
  if (score >= 55) return { fg: '#78350f', bg: '#b45309' };
  if (score >= 35) return { fg: '#7c2d12', bg: '#c2410c' };
  return { fg: '#7f1d1d', bg: '#b91c1c' };
}

const VERDICT_COLOR: Record<string, string> = {
  RECOMMEND: '#1a7f37',
  CONSIDER: '#b45309',
  PASS: '#b91c1c',
};

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  });
}

const STYLES = `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: #f4f2ec;
      color: #1a1a1a;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 14px;
      line-height: 1.5;
    }
    .page { max-width: 1000px; margin: 0 auto; padding: 40px 48px 56px; background: #fffdf9; }
    header {
      border-bottom: 3px double #1a1a1a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .masthead {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      letter-spacing: 0.12em;
      color: #52525b;
      margin-bottom: 6px;
    }
    h1 {
      font-family: 'Courier New', Courier, monospace;
      font-size: 24px;
      margin: 0 0 6px;
    }
    .meta-line {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #3f3f46;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid #e4e2d8;
      font-size: 13px;
      vertical-align: top;
    }
    th {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #52525b;
      border-bottom: 2px solid #1a1a1a;
    }
    tr:nth-child(even) td { background: #faf9f5; }
    .rank-cell {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      text-align: center;
      width: 40px;
    }
    .health-chip {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      color: #fff;
    }
    .verdict-cell { font-family: 'Courier New', Courier, monospace; font-weight: 700; }
    .hash-cell { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #71717a; }
    footer {
      border-top: 1px solid #d4d4d8;
      margin-top: 28px;
      padding-top: 14px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #52525b;
      text-align: center;
    }
    @page { size: letter landscape; margin: 0.6in; }
    @media print {
      body { background: #fff; }
      .page { max-width: none; padding: 0; background: #fff; }
      tr { page-break-inside: avoid; break-inside: avoid; }
    }
`;

/**
 * Render a ranked slate into a standalone, print-friendly HTML comparative
 * table. Pure function over already-ranked entries; every entry field that
 * could carry producer-supplied text (title) is escaped, and the
 * dimension/verdict labels are escaped defensively alongside it even though
 * today they only ever come from a fixed, developer-controlled vocabulary.
 */
export function renderSlateHtml(entries: SlateEntry[], rankedAt: number): string {
  const rows = entries.map((entry, i) => {
    const band = healthBandColor(entry.health);
    const verdictColor = entry.verdict ? VERDICT_COLOR[entry.verdict] ?? '#334155' : '#64748b';
    const percentile = typeof entry.healthPercentile === 'number'
      ? `${Math.round(entry.healthPercentile)}th pct`
      : '&mdash;';
    return `
    <tr>
      <td class="rank-cell">${i + 1}</td>
      <td>${escapeHtml(entry.title)}</td>
      <td><span class="health-chip" style="background:${band.bg};">${entry.health.toFixed(1)}</span></td>
      <td>${percentile}</td>
      <td class="verdict-cell" style="color:${verdictColor};">${escapeHtml(entry.verdict ?? 'N/A')}</td>
      <td>${entry.sceneCount.toLocaleString('en-US')}</td>
      <td>${entry.wordCount.toLocaleString('en-US')}</td>
      <td>${escapeHtml(entry.topDimension)}</td>
      <td>${escapeHtml(entry.weakestDimension)}</td>
      <td class="hash-cell">${escapeHtml(entry.contentHash.slice(0, 10))}</td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Slate Triage &mdash; STORYMACHINE</title>
<style>
${STYLES}
</style>
</head>
<body>
  <div class="page">
    <header>
      <div class="masthead">SLATE TRIAGE &mdash; STORYMACHINE</div>
      <h1>Comparative Coverage Ranking</h1>
      <div class="meta-line">${entries.length} script${entries.length === 1 ? '' : 's'} &middot; ranked ${formatDateTime(rankedAt)}</div>
    </header>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Title</th>
          <th>Health</th>
          <th>Percentile</th>
          <th>Verdict</th>
          <th>Scenes</th>
          <th>Words</th>
          <th>Top Dimension</th>
          <th>Weakest Dimension</th>
          <th>Verification Hash</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <footer>
      Deterministic analysis &mdash; no generative AI read or scored any of these scripts. Ranked by health, descending.
    </footer>
  </div>
</body>
</html>`;
}
