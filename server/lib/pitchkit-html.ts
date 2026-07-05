// Run 14, Deliverable 3 — Pitch Kit export. Standalone, print-quality HTML
// document for development desks: title block, an inline-SVG tension curve
// (cumulative per-scene suspenseDelta, act-zone shading), an inline-SVG
// character map (nodes sized by dialogue-line count, edges weighted by
// co-scene count, simple circular layout), and a scene/word/verdict summary
// strip. Same discipline as server/lib/coverage-html.ts: pure function over
// already-computed inputs (no I/O, no Date.now(), no randomness, no external
// requests, no <script>), so the same inputs always render byte-for-byte
// identical HTML. The caller (POST /api/export/pitchkit in
// server/routes/export.ts) is responsible for re-running the doctor and the
// analyzer so the exported document is authentic, exactly as the coverage
// export does.
//
// SECURITY: title and every character name are screenplay-derived,
// untrusted input — every interpolation of either goes through escapeHtml()
// below, including inside the SVG <text> nodes (SVG text content is HTML
// content for XSS purposes in a browser-rendered document; there is no
// separate "SVG is safe" exemption here).

import type { ScriptDoctorReport } from '../nvm/analyze/types.ts';
import type { ScreenplaySceneRecord } from '../nvm/screenplay/memory.ts';
import type { SceneCharacterTally } from './breakdown.ts';

// ── Escaping (identical discipline to coverage-html.ts) ──────────────────────
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Tension curve SVG ─────────────────────────────────────────────────────────

const CURVE_WIDTH = 760;
const CURVE_HEIGHT = 220;
const CURVE_PAD_X = 30;
const CURVE_PAD_Y = 24;

/** Cumulative per-scene suspenseDelta line, scene ticks, and a classic
 *  25%/75% three-act shading band. No user-controlled text ever enters this
 *  SVG (only scene numbers, which are pure integers), so it needs no
 *  escaping of its own — the surrounding sections (title, character names)
 *  are what carry the XSS risk in this document. */
function buildTensionCurveSvg(records: ScreenplaySceneRecord[]): string {
  const n = records.length;
  if (n === 0) {
    return '<p class="empty-note">No scenes to chart.</p>';
  }

  const cumulative: number[] = [];
  let running = 0;
  for (const r of records) {
    running += r.suspenseDelta;
    cumulative.push(running);
  }

  const minVal = Math.min(0, ...cumulative);
  const maxVal = Math.max(0, ...cumulative);
  const range = maxVal - minVal || 1;

  const plotW = CURVE_WIDTH - CURVE_PAD_X * 2;
  const plotH = CURVE_HEIGHT - CURVE_PAD_Y * 2;

  const xFor = (i: number) => CURVE_PAD_X + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v: number) => CURVE_PAD_Y + plotH - ((v - minVal) / range) * plotH;

  const act1X = CURVE_PAD_X + plotW * 0.25;
  const act2X = CURVE_PAD_X + plotW * 0.75;
  const zones = `
    <rect x="${CURVE_PAD_X.toFixed(1)}" y="${CURVE_PAD_Y.toFixed(1)}" width="${(act1X - CURVE_PAD_X).toFixed(1)}" height="${plotH.toFixed(1)}" fill="#f59e0b" opacity="0.08" />
    <rect x="${act1X.toFixed(1)}" y="${CURVE_PAD_Y.toFixed(1)}" width="${(act2X - act1X).toFixed(1)}" height="${plotH.toFixed(1)}" fill="#3b82f6" opacity="0.06" />
    <rect x="${act2X.toFixed(1)}" y="${CURVE_PAD_Y.toFixed(1)}" width="${(CURVE_PAD_X + plotW - act2X).toFixed(1)}" height="${plotH.toFixed(1)}" fill="#ef4444" opacity="0.08" />`;

  const zeroY = yFor(0);
  const baseline = `<line x1="${CURVE_PAD_X.toFixed(1)}" y1="${zeroY.toFixed(1)}" x2="${(CURVE_WIDTH - CURVE_PAD_X).toFixed(1)}" y2="${zeroY.toFixed(1)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" />`;

  const pathD = cumulative
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`)
    .join(' ');

  // Ticks every N scenes (never more than ~20 labeled ticks) so a long
  // screenplay's x-axis doesn't collapse into unreadable overlapping labels.
  const tickEvery = Math.max(1, Math.ceil(n / 20));
  const ticks = cumulative.map((v, i) => {
    const x = xFor(i);
    const y = yFor(v);
    const dot = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#7c3aed" />`;
    const showLabel = i % tickEvery === 0 || i === n - 1;
    const label = showLabel
      ? `<text x="${x.toFixed(1)}" y="${(CURVE_HEIGHT - 6).toFixed(1)}" font-size="9" text-anchor="middle" fill="#64748b">${i + 1}</text>`
      : '';
    return dot + label;
  }).join('\n');

  return `
  <svg viewBox="0 0 ${CURVE_WIDTH} ${CURVE_HEIGHT}" width="100%" height="${CURVE_HEIGHT}" role="img" aria-label="Tension curve across ${n} scenes">
    ${zones}
    ${baseline}
    <path d="${pathD}" fill="none" stroke="#1a1a1a" stroke-width="2" />
    ${ticks}
  </svg>
  <div class="curve-legend">
    <span><i class="swatch" style="background:#f59e0b"></i>Act I</span>
    <span><i class="swatch" style="background:#3b82f6"></i>Act II</span>
    <span><i class="swatch" style="background:#ef4444"></i>Act III</span>
    <span class="curve-legend-note">Cumulative suspense delta, scene by scene</span>
  </div>`;
}

// ── Character map SVG ──────────────────────────────────────────────────────────

const MAP_SIZE = 480;
const MAP_MAX_CHARACTERS = 14;
const MAP_NODE_MIN_R = 12;
const MAP_NODE_MAX_R = 36;
const MAP_NAME_MAX_LEN = 16;

interface CharNode {
  name: string;
  lineCount: number;
  x: number;
  y: number;
  r: number;
}

/** Simple deterministic circular layout: the top MAP_MAX_CHARACTERS speaking
 *  characters (by total dialogue-line count, first-appearance order breaking
 *  ties) placed evenly around a circle, node radius scaled to line count,
 *  edges between any two kept characters weighted by how many scenes they
 *  both speak in. Character NAMES are the one piece of user-controlled text
 *  in this SVG and are escaped via escapeHtml() before interpolation. */
function buildCharacterMapSvg(sceneCharacters: SceneCharacterTally[]): string {
  const totalCounts = new Map<string, number>();
  const order: string[] = [];
  const seen = new Set<string>();

  for (const scene of sceneCharacters) {
    for (const name of scene.speakers) {
      if (!seen.has(name)) { seen.add(name); order.push(name); }
    }
    for (const [name, count] of Object.entries(scene.dialogueLineCounts)) {
      totalCounts.set(name, (totalCounts.get(name) ?? 0) + count);
    }
  }

  if (totalCounts.size === 0) {
    return '<p class="empty-note">No dialogue to map.</p>';
  }

  const characters = order
    .filter(name => totalCounts.has(name))
    .sort((a, b) => (totalCounts.get(b)! - totalCounts.get(a)!))
    .slice(0, MAP_MAX_CHARACTERS);
  const characterSet = new Set(characters);

  const edgeCounts = new Map<string, number>();
  for (const scene of sceneCharacters) {
    const kept = scene.speakers.filter(s => characterSet.has(s));
    for (let i = 0; i < kept.length; i++) {
      for (let j = i + 1; j < kept.length; j++) {
        const key = [kept[i], kept[j]].sort().join('|');
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const maxCount = Math.max(...characters.map(c => totalCounts.get(c)!));
  const cx = MAP_SIZE / 2;
  const cy = MAP_SIZE / 2;
  const radius = MAP_SIZE / 2 - 64;

  const nodes: CharNode[] = characters.map((name, i) => {
    const angle = (i / characters.length) * 2 * Math.PI - Math.PI / 2;
    const count = totalCounts.get(name)!;
    const r = MAP_NODE_MIN_R + (maxCount > 0 ? count / maxCount : 0) * (MAP_NODE_MAX_R - MAP_NODE_MIN_R);
    return { name, lineCount: count, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), r };
  });
  const nodeByName = new Map(nodes.map(node => [node.name, node]));

  const maxEdgeCount = edgeCounts.size > 0 ? Math.max(...edgeCounts.values()) : 1;
  const edgesSvg = [...edgeCounts.entries()].map(([key, count]) => {
    const [a, b] = key.split('|');
    const na = nodeByName.get(a);
    const nb = nodeByName.get(b);
    if (!na || !nb) return '';
    const weight = 0.75 + (count / maxEdgeCount) * 3;
    return `<line x1="${na.x.toFixed(1)}" y1="${na.y.toFixed(1)}" x2="${nb.x.toFixed(1)}" y2="${nb.y.toFixed(1)}" stroke="#94a3b8" stroke-width="${weight.toFixed(2)}" opacity="0.55" />`;
  }).join('\n');

  const nodesSvg = nodes.map(node => {
    const safeName = escapeHtml(node.name.length > MAP_NAME_MAX_LEN ? `${node.name.slice(0, MAP_NAME_MAX_LEN - 1)}…` : node.name);
    return `
    <g>
      <circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${node.r.toFixed(1)}" fill="#7c3aed" opacity="0.85" />
      <text x="${node.x.toFixed(1)}" y="${node.y.toFixed(1)}" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="#fff">${safeName}</text>
    </g>`;
  }).join('\n');

  return `
  <svg viewBox="0 0 ${MAP_SIZE} ${MAP_SIZE}" width="100%" height="${MAP_SIZE}" role="img" aria-label="Character map, ${characters.length} characters">
    ${edgesSvg}
    ${nodesSvg}
  </svg>`;
}

// ── Summary strip ───────────────────────────────────────────────────────────

function buildSummaryStrip(report: ScriptDoctorReport): string {
  const verdict = report.verdict ? escapeHtml(report.verdict) : 'N/A';
  return `
  <div class="summary-strip">
    <div class="stat"><div class="stat-value">${report.health.toFixed(1)}</div><div class="stat-label">Health</div></div>
    <div class="stat"><div class="stat-value">${verdict}</div><div class="stat-label">Verdict</div></div>
    <div class="stat"><div class="stat-value">${report.sceneCount.toLocaleString('en-US')}</div><div class="stat-label">Scenes</div></div>
    <div class="stat"><div class="stat-value">${report.wordCount.toLocaleString('en-US')}</div><div class="stat-label">Words</div></div>
  </div>`;
}

// ── Document shell ────────────────────────────────────────────────────────────

const STYLES = `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: #f4f2ec;
      color: #1a1a1a;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 14px;
      line-height: 1.55;
    }
    .page { max-width: 850px; margin: 0 auto; padding: 40px 48px 56px; background: #fffdf9; }
    .pk-header {
      border-bottom: 3px double #1a1a1a;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .masthead {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      letter-spacing: 0.12em;
      color: #52525b;
      margin-bottom: 6px;
    }
    .title {
      font-family: 'Courier New', Courier, monospace;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      word-break: break-word;
    }
    .summary-strip {
      display: flex;
      gap: 24px;
      background: #faf9f5;
      border: 1px solid #e4e2d8;
      border-radius: 8px;
      padding: 16px 24px;
      margin-bottom: 30px;
    }
    .stat { text-align: center; flex: 1; }
    .stat-value {
      font-family: 'Courier New', Courier, monospace;
      font-size: 22px;
      font-weight: 700;
    }
    .stat-label {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #71717a;
      margin-top: 2px;
    }
    .section { margin-bottom: 34px; page-break-inside: avoid; break-inside: avoid; }
    .section h2 {
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1a1a1a;
      border-bottom: 1px solid #d4d4d8;
      padding-bottom: 6px;
      margin: 0 0 14px;
    }
    .empty-note { color: #71717a; font-style: italic; margin: 0; }
    svg { display: block; max-width: 100%; height: auto; }
    .curve-legend {
      display: flex;
      gap: 16px;
      align-items: center;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #3f3f46;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .curve-legend .swatch {
      display: inline-block;
      width: 10px; height: 10px;
      margin-right: 4px;
      border-radius: 2px;
    }
    .curve-legend-note { color: #71717a; margin-left: auto; }
    .pk-footer {
      border-top: 1px solid #d4d4d8;
      margin-top: 20px;
      padding-top: 16px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #52525b;
      text-align: center;
    }
    @page { size: letter portrait; margin: 0.65in; }
    @media print {
      body { background: #fff; }
      .page { max-width: none; padding: 0; background: #fff; }
      .section { page-break-inside: avoid; break-inside: avoid; }
    }
`;

export interface PitchKitInput {
  title: string;
  report: ScriptDoctorReport;
  records: ScreenplaySceneRecord[];
  sceneCharacters: SceneCharacterTally[];
}

/**
 * Render a standalone, print-quality Pitch Kit HTML document: title block,
 * tension curve, character map, and a scene/word/verdict summary strip.
 * Pure function — no I/O, no Date.now(), no randomness, all-inline CSS/SVG,
 * every screenplay-derived string (title, character names, verdict) escaped
 * via escapeHtml() before interpolation.
 */
export function renderPitchKitHtml(input: PitchKitInput): string {
  const safeTitle = escapeHtml(input.title.trim() || 'Untitled');
  const tensionSvg = buildTensionCurveSvg(input.records);
  const mapSvg = buildCharacterMapSvg(input.sceneCharacters);
  const summary = buildSummaryStrip(input.report);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle} &mdash; Pitch Kit</title>
<style>
${STYLES}
</style>
</head>
<body>
  <div class="page">
    <header class="pk-header">
      <div class="masthead">PITCH KIT &mdash; STORYMACHINE</div>
      <h1 class="title">${safeTitle}</h1>
    </header>
    ${summary}
    <section class="section">
      <h2>Tension Curve</h2>
      ${tensionSvg}
    </section>
    <section class="section">
      <h2>Character Map</h2>
      ${mapSvg}
    </section>
    <footer class="pk-footer">
      Deterministic analysis &mdash; no generative AI read or scored this script.
    </footer>
  </div>
</body>
</html>`;
}
