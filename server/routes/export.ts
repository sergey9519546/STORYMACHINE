// P2 — Export pipeline: Fountain → FDX (Final Draft XML), DOCX, print-ready HTML,
// and the shareable Script Doctor coverage-report HTML. The first three accept
// { fountain: string } in the POST body so the client can pass whatever
// Fountain text it already has loaded; the coverage route additionally accepts
// { fdx: string } (see DoctorBodySchema) since it re-runs the doctor itself.

import express from 'express';
import { createHash } from 'node:crypto';
import {
  Document, Paragraph, TextRun, AlignmentType, Packer,
  convertInchesToTwip, PageOrientation,
} from 'docx';
import { parseFountain, type FountainBlockType } from '../../src/lib/fountain.ts';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import { logger } from '../lib/logger.ts';
import { asyncHandler, gameLimiter } from '../lib/session-store.ts';
import { validate, DoctorBodySchema, SlateBodySchema, VerifyBodySchema, FountainTitleBodySchema } from '../lib/validation.ts';
import type { CoverageVerdict } from '../nvm/analyze/types.ts';
import { fdxToFountain } from '../lib/fdx-import.ts';
import { renderCoverageHtml } from '../lib/coverage-html.ts';
import { buildBreakdownRows, breakdownRowsToCsv, analyzeSceneCharacters } from '../lib/breakdown.ts';
import { renderPitchKitHtml } from '../lib/pitchkit-html.ts';
import { extractTitlePage, buildLogline, buildPitchContent } from '../lib/logline.ts';
import { buildSlateEntry, rankSlate, renderSlateHtml, type SlateEntry } from '../lib/slate.ts';
import { analyzeFountainText } from '../nvm/analyze/fountain-analyzer.ts';

const router = express.Router();
export default router;

// ── Shared helpers ────────────────────────────────────────────────────────────

function extractFountain(body: unknown): string {
  if (typeof body !== 'object' || body === null) return '';
  const b = body as Record<string, unknown>;
  const raw = typeof b['fountain'] === 'string' ? b['fountain'] : '';
  return raw.slice(0, 200_000); // 200 KB max
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── FDX (Final Draft XML) ─────────────────────────────────────────────────────

const FDX_TYPE_MAP: Partial<Record<FountainBlockType, string>> = {
  scene_heading:  'Scene Heading',
  action:         'Action',
  character:      'Character',
  dual_dialogue:  'Character',
  dialogue:       'Dialogue',
  parenthetical:  'Parenthetical',
  transition:     'Transition',
  shot:           'Shot',
  centered:       'Action',
  lyrics:         'Action',
  section:        'Scene Heading',
};

function fountainToFdx(fountain: string, title: string): string {
  const blocks = parseFountain(fountain);
  const paragraphs: string[] = [];

  for (const block of blocks) {
    if (block.type === 'boneyard' || block.type === 'synopsis' || block.type === 'note') continue;

    if (block.type === 'empty') {
      paragraphs.push('    <Paragraph Type="Action"><Text></Text></Paragraph>');
      continue;
    }

    const fdxType = FDX_TYPE_MAP[block.type] ?? 'Action';
    const text = escapeXml(block.text.trim());
    const align = block.type === 'centered' ? ' Alignment="Center"' : '';
    paragraphs.push(`    <Paragraph Type="${fdxType}"${align}><Text>${text}</Text></Paragraph>`);
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<FinalDraft DocumentType="Script" Template="No" Version="4">
  <Content>
    <Paragraph Type="Action"><Text>${escapeXml(title)}</Text></Paragraph>
    <Paragraph Type="Action"><Text></Text></Paragraph>
${paragraphs.join('\n')}
  </Content>
  <TitlePage>
    <Content>
      <Paragraph Type="Title"><Text>${escapeXml(title)}</Text></Paragraph>
      <Paragraph Type="Credit"><Text>Written by</Text></Paragraph>
      <Paragraph Type="Author"><Text>STORYMACHINE</Text></Paragraph>
    </Content>
  </TitlePage>
</FinalDraft>`;
}

router.post('/api/export/fdx', gameLimiter, validate(FountainTitleBodySchema), asyncHandler(async (req, res) => {
  const fountain = extractFountain(req.body);
  if (!fountain.trim()) { res.status(400).json({ error: 'fountain is required' }); return; }

  const rawTitle = typeof req.body?.title === 'string' ? req.body.title : 'Untitled';
  const title = sanitizeForPrompt(rawTitle, 256) || 'Untitled';

  try {
    const fdx = fountainToFdx(fountain, title);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.fdx"`);
    res.send(fdx);
  } catch (err) {
    logger.error('export_fdx_error', { message: (err as Error).message });
    res.status(500).json({ error: 'FDX conversion failed' });
  }
}));

// ── DOCX ──────────────────────────────────────────────────────────────────────
// Standard screenplay margins (in twips — 1 twip = 1/1440 inch):
//   Left: 1.5"  Right: 1"  Top/Bottom: 1"
// Character cue: ~3.7" from left edge (2.2" from left margin)
// Dialogue: 1.0" from left margin, 2.5" from right margin
// Parenthetical: 1.5" indent from left margin

const TWIP = convertInchesToTwip;

const DOC_MARGINS = {
  top:    TWIP(1),
  bottom: TWIP(1),
  left:   TWIP(1.5),
  right:  TWIP(1),
};

function fountainToDocxParagraphs(fountain: string): Paragraph[] {
  const blocks = parseFountain(fountain);
  const paragraphs: Paragraph[] = [];

  for (const block of blocks) {
    if (block.type === 'boneyard' || block.type === 'synopsis' || block.type === 'note') continue;

    const raw = block.text.trim();

    switch (block.type) {
      case 'empty':
        paragraphs.push(new Paragraph({ children: [] }));
        break;

      case 'scene_heading':
        paragraphs.push(new Paragraph({
          spacing: { before: TWIP(0.5) },
          children: [new TextRun({ text: raw, bold: true, allCaps: true, font: 'Courier New', size: 24 })],
        }));
        break;

      case 'action':
      case 'lyrics':
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: raw, font: 'Courier New', size: 24 })],
        }));
        break;

      case 'centered':
        paragraphs.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: raw, font: 'Courier New', size: 24 })],
        }));
        break;

      case 'character':
      case 'dual_dialogue':
        paragraphs.push(new Paragraph({
          indent: { left: TWIP(2.2) },
          spacing: { before: TWIP(0.17) },
          children: [new TextRun({ text: raw, font: 'Courier New', size: 24 })],
        }));
        break;

      case 'dialogue':
        paragraphs.push(new Paragraph({
          indent: { left: TWIP(1.0), right: TWIP(2.5) },
          children: [new TextRun({ text: raw, font: 'Courier New', size: 24 })],
        }));
        break;

      case 'parenthetical':
        paragraphs.push(new Paragraph({
          indent: { left: TWIP(1.5), right: TWIP(2.0) },
          children: [new TextRun({ text: raw, font: 'Courier New', size: 24 })],
        }));
        break;

      case 'transition':
        paragraphs.push(new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: TWIP(0.17) },
          children: [new TextRun({ text: raw, font: 'Courier New', size: 24 })],
        }));
        break;

      case 'shot':
        paragraphs.push(new Paragraph({
          spacing: { before: TWIP(0.17) },
          children: [new TextRun({ text: raw, bold: true, font: 'Courier New', size: 24 })],
        }));
        break;

      case 'section':
        paragraphs.push(new Paragraph({
          spacing: { before: TWIP(0.5) },
          children: [new TextRun({ text: raw, bold: true, italics: true, font: 'Courier New', size: 24 })],
        }));
        break;

      default:
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: raw, font: 'Courier New', size: 24 })],
        }));
    }
  }

  return paragraphs;
}

router.post('/api/export/docx', gameLimiter, validate(FountainTitleBodySchema), asyncHandler(async (req, res) => {
  const fountain = extractFountain(req.body);
  if (!fountain.trim()) { res.status(400).json({ error: 'fountain is required' }); return; }

  const rawTitle = typeof req.body?.title === 'string' ? req.body.title : 'Untitled';
  const title = sanitizeForPrompt(rawTitle, 256) || 'Untitled';

  try {
    const paragraphs = fountainToDocxParagraphs(fountain);

    const doc = new Document({
      title,
      creator: 'STORYMACHINE',
      description: 'Exported screenplay',
      sections: [{
        properties: {
          page: {
            size: { width: TWIP(8.5), height: TWIP(11), orientation: PageOrientation.PORTRAIT },
            margin: DOC_MARGINS,
          },
        },
        children: paragraphs,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.docx"`);
    res.send(buffer);
  } catch (err) {
    logger.error('export_docx_error', { message: (err as Error).message });
    res.status(500).json({ error: 'DOCX conversion failed' });
  }
}));

// ── Print-ready HTML (browser PDF via window.print()) ─────────────────────────
// Returns a fully standalone HTML page with @page CSS and print media styles
// that produce industry-standard screenplay margins. The client opens this in a
// new tab and calls window.print() so the browser's built-in PDF engine is used.

function fountainToHtml(fountain: string, title: string): string {
  const blocks = parseFountain(fountain);
  const bodyParts: string[] = [];

  for (const block of blocks) {
    if (block.type === 'boneyard' || block.type === 'synopsis' || block.type === 'note') continue;

    const raw = block.text.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    switch (block.type) {
      case 'empty':
        bodyParts.push('<div class="spacer"></div>');
        break;
      case 'scene_heading':
        bodyParts.push(`<div class="scene-heading">${raw}</div>`);
        break;
      case 'action':
      case 'lyrics':
        bodyParts.push(`<div class="action">${raw}</div>`);
        break;
      case 'centered':
        bodyParts.push(`<div class="centered">${raw}</div>`);
        break;
      case 'character':
        bodyParts.push(`<div class="character">${raw}</div>`);
        break;
      case 'dual_dialogue':
        bodyParts.push(`<div class="character dual">${raw}</div>`);
        break;
      case 'dialogue':
        bodyParts.push(`<div class="dialogue">${raw}</div>`);
        break;
      case 'parenthetical':
        bodyParts.push(`<div class="parenthetical">${raw}</div>`);
        break;
      case 'transition':
        bodyParts.push(`<div class="transition">${raw}</div>`);
        break;
      case 'shot':
        bodyParts.push(`<div class="shot">${raw}</div>`);
        break;
      case 'section':
        bodyParts.push(`<div class="section">${raw}</div>`);
        break;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(title)}</title>
  <style>
    /* ── Page setup ── */
    @page {
      size: letter portrait;
      margin: 1in 1in 1in 1.5in;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12pt;
      line-height: 1;
      color: #000;
      background: #fff;
    }
    /* ── Screenplay elements ── */
    .scene-heading {
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    .action {
      margin-bottom: 0.5em;
      max-width: 60ch;
    }
    .character {
      margin-left: 2.9in;
      margin-top: 0.5em;
      text-transform: uppercase;
    }
    .character.dual {
      margin-left: 2.9in;
      text-transform: uppercase;
    }
    .dialogue {
      margin-left: 1.5in;
      margin-right: 1.5in;
      margin-bottom: 0.25em;
    }
    .parenthetical {
      margin-left: 2.0in;
      margin-right: 1.5in;
    }
    .transition {
      text-align: right;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }
    .shot {
      font-weight: bold;
      margin-top: 0.5em;
    }
    .centered {
      text-align: center;
      margin: 0.5em 0;
    }
    .section {
      font-weight: bold;
      font-style: italic;
      margin-top: 1em;
      border-top: 1px solid #ccc;
      padding-top: 0.5em;
    }
    .spacer { height: 0.5em; }
    /* ── Print trigger ── */
    .print-bar {
      position: fixed; top: 0; left: 0; right: 0;
      background: #1e293b; color: #e2e8f0;
      padding: 10px 20px; display: flex; align-items: center;
      gap: 16px; font-family: sans-serif; font-size: 14px;
      z-index: 1000;
    }
    .print-bar button {
      background: #7c3aed; color: #fff; border: none;
      padding: 7px 18px; border-radius: 5px; cursor: pointer;
      font-size: 14px; font-weight: 600;
    }
    .print-bar button:hover { background: #6d28d9; }
    @media print {
      .print-bar { display: none; }
      body { padding-top: 0; }
    }
    body.has-bar { padding-top: 50px; }
  </style>
</head>
<body class="has-bar">
  <div class="print-bar">
    <strong>${escapeXml(title)}</strong>
    <span style="color:#94a3b8;font-size:12px;">Print this page or use your browser's Save as PDF</span>
    <button onclick="window.print()">Print / Save PDF</button>
    <button onclick="document.querySelector('.print-bar').remove();document.body.classList.remove('has-bar')" style="background:#334155">Hide bar</button>
  </div>
${bodyParts.map(p => `  ${p}`).join('\n')}
</body>
</html>`;
}

router.post('/api/export/print-html', gameLimiter, validate(FountainTitleBodySchema), asyncHandler(async (req, res) => {
  const fountain = extractFountain(req.body);
  if (!fountain.trim()) { res.status(400).json({ error: 'fountain is required' }); return; }

  const rawTitle = typeof req.body?.title === 'string' ? req.body.title : 'Untitled';
  const title = sanitizeForPrompt(rawTitle, 256) || 'Untitled';

  try {
    const html = fountainToHtml(fountain, title);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    logger.error('export_print_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Print HTML conversion failed' });
  }
}));

// ── Shareable coverage-report export (server/lib/coverage-html.ts) ────────────
// POST /api/export/coverage — the studio-coverage-style HTML document writers
// download, print to PDF, and hand to producers. Same two-format body contract
// as POST /api/scriptide/doctor (server/routes/scriptide.ts), enforced by the
// same DoctorBodySchema: exactly one of `fountain` / `fdx`, optional `title`.
//
// Deliberately RE-RUNS the doctor here instead of accepting a client-supplied
// ScriptDoctorReport JSON in the request body. That's not laziness — it's the
// point: because runScriptDoctor() is a pure, deterministic function of the
// Fountain text (no LLM, no randomness — see doctor.ts's own header comment),
// re-running it costs nothing extra in confidence for one more CPU-only pass,
// and in exchange the exported document is always AUTHENTIC: a report the
// engine actually produced for this exact script, not something a client
// could have hand-edited (inflated health score, deleted a critical issue)
// before asking the server to wrap it in a nice PDF-ready shell. A producer
// reading a coverage report should never have to wonder whether the numbers
// on the page are the numbers the tool actually computed.
router.post('/api/export/coverage', gameLimiter, validate(DoctorBodySchema), asyncHandler(async (req, res) => {
  const { fountain: fountainBody, fdx } = req.body as { fountain?: string; fdx?: string; title?: string };

  // Same fdx->Fountain resolution as POST /api/scriptide/doctor: convert here
  // (fdxToFountain is small/pure/dependency-free, so — like that route —
  // it's imported statically rather than dynamically) and 400 on either a
  // conversion failure or a conversion that produced nothing to analyze.
  let fountain: string;
  if (fdx !== undefined) {
    let converted: { fountain: string; warnings: string[] };
    try {
      converted = fdxToFountain(fdx);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
    if (converted.fountain.trim() === '') {
      res.status(400).json({ error: 'The Final Draft file converted to an empty script — nothing to analyze.' });
      return;
    }
    fountain = converted.fountain;
  } else {
    fountain = fountainBody as string;
  }

  const rawTitle = typeof req.body?.title === 'string' ? req.body.title : 'Untitled';
  const title = sanitizeForPrompt(rawTitle, 256) || 'Untitled';

  try {
    // Dynamic import: doctor.ts pulls in the full analyzer + all 14 revision
    // passes, matching this router's convention elsewhere in this file (and
    // scriptide.ts's doctor route) of lazily loading heavy analysis modules
    // so routes that never call the doctor don't pay for it at startup.
    const { runScriptDoctor } = await import('../nvm/analyze/doctor.ts');
    const report = await runScriptDoctor(fountain);

    // ScriptDoctorReport.contentHash isn't populated by runScriptDoctor yet
    // (see its doc comment in server/nvm/analyze/types.ts) — compute it here
    // using the exact formula that comment documents (sha256 hex of the
    // trimmed analyzed Fountain text) so every exported report still carries
    // a verification hash. If a future doctor.ts revision starts populating
    // it directly, that value wins here and this becomes a no-op fallback.
    const contentHash = report.contentHash ?? createHash('sha256').update(fountain.trim()).digest('hex');

    // Title-page fallback (P2 — "Untitled" bug fix) + a logline line in the
    // header: both are cheap, pure, deterministic derivations from the same
    // fountain text and records already in hand, so they're always computed
    // rather than gated behind an opt-in flag. extractTitlePage/buildLogline
    // degrade to null on their own when the script carries no title page or
    // no usable signal — see server/lib/logline.ts.
    const titlePage = extractTitlePage(fountain);
    const { records } = analyzeFountainText(fountain);
    const logline = buildLogline(report, records, fountain);

    const html = renderCoverageHtml({ ...report, contentHash }, title, {
      titlePageTitle: titlePage.title,
      titlePageAuthor: titlePage.author,
      logline,
    });

    const filename = `${encodeURIComponent(title)}-coverage.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (err) {
    logger.error('export_coverage_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Coverage export failed' });
  }
}));

// ── Run 14 (ROADMAP §10, producer tier) — shared fountain/fdx resolution ─────
// Same exactly-one-of-fountain/fdx contract as DoctorBodySchema, and the same
// fdx->Fountain resolution the coverage route above hand-rolls inline. Both
// new producer-tier routes below (breakdown, pitchkit) need the identical
// resolution, so it's factored out here rather than tripled — the coverage
// route above is left as-is (untouched, still tested, still inline) to avoid
// any risk of perturbing its existing behavior for this run.
function resolveFountainOrRespond(
  req: express.Request, res: express.Response,
): string | undefined {
  const { fountain: fountainBody, fdx } = req.body as { fountain?: string; fdx?: string };

  if (fdx !== undefined) {
    let converted: { fountain: string; warnings: string[] };
    try {
      converted = fdxToFountain(fdx);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return undefined;
    }
    if (converted.fountain.trim() === '') {
      res.status(400).json({ error: 'The Final Draft file converted to an empty script — nothing to analyze.' });
      return undefined;
    }
    return converted.fountain;
  }

  return fountainBody as string;
}

// ── Slate Triage export ───────────────────────────────────────────────────────
// POST /api/export/slate — deterministic, keyless multi-script ranking for a
// development desk triaging a slate of submissions. Runs the doctor on every
// submitted script (doctor.ts's own LRU cache — see its file header — makes
// re-submitting the same script across slates free) and returns a ranked
// summary, or (format:'html', via query OR body — a producer opening this
// straight from a browser can't always set a JSON body field, so both are
// accepted) a standalone comparative HTML table for printing/sharing.
//
// Limiter choice: gameLimiter, NOT heavyBodyLimiter. heavyBodyLimiter exists
// for routes that accept a large RAW (non-JSON) body that bypasses
// server/app.ts's global `express.json({limit:'1mb'})` cap entirely (see its
// own doc comment in session-store.ts — e.g. POST /api/scriptide/doctor/pdf's
// express.raw({limit:'15mb'})). This route carries no such exemption: it's
// plain JSON, so the SAME 1mb global cap already bounds every request before
// SlateBodySchema's own combined-900_000-char refinement even runs — a slate
// request can never cost more analysis than a single existing
// POST /api/scriptide/doctor call at that schema's own ceiling, just spread
// across up to 20 smaller scripts instead of one large one. gameLimiter's
// existing 120/min ceiling is the right budget for that, same as every other
// bounded-JSON-body analysis route in this file.
router.post('/api/export/slate', gameLimiter, validate(SlateBodySchema), asyncHandler(async (req, res) => {
  const { scripts } = req.body as { scripts: Array<{ title: string; fountain: string }> };
  const wantsHtml = req.query.format === 'html' || (req.body as { format?: string }).format === 'html';

  try {
    const { runScriptDoctor } = await import('../nvm/analyze/doctor.ts');

    const entries: SlateEntry[] = [];
    for (const script of scripts) {
      const title = sanitizeForPrompt(script.title, 200) || 'Untitled';
      const report = await runScriptDoctor(script.fountain);
      const contentHash = report.contentHash ?? createHash('sha256').update(script.fountain.trim()).digest('hex');
      entries.push(buildSlateEntry(title, report, contentHash));
    }

    const slate = rankSlate(entries);
    const rankedAt = Date.now();

    if (wantsHtml) {
      const html = renderSlateHtml(slate, rankedAt);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="slate-triage.html"');
      res.send(html);
      return;
    }

    res.json({ slate, rankedAt });
  } catch (err) {
    logger.error('export_slate_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Slate triage failed' });
  }
}));

// ── Breakdown export (CSV) ───────────────────────────────────────────────────
// POST /api/export/breakdown — one row per scene (scene number, slug, parsed
// location/INT-EXT/time-of-day, speaking characters, word count, has-clock,
// has-clue-seeded) as a downloadable CSV a 1st AD or line producer can open
// directly in a spreadsheet. Deterministic and keyless: server/lib/
// breakdown.ts is a pure function of the Fountain text (re-derives
// clockRaised/seededClueIds from analyzeFountainText itself rather than
// trusting any client-supplied report).
router.post('/api/export/breakdown', gameLimiter, validate(DoctorBodySchema), asyncHandler(async (req, res) => {
  const fountain = resolveFountainOrRespond(req, res);
  if (fountain === undefined) return;

  const rawTitle = typeof req.body?.title === 'string' ? req.body.title : 'Untitled';
  const title = sanitizeForPrompt(rawTitle, 256) || 'Untitled';

  try {
    const rows = buildBreakdownRows(fountain);
    const csv = breakdownRowsToCsv(rows);

    const filename = `${encodeURIComponent(title)}-breakdown.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    logger.error('export_breakdown_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Breakdown export failed' });
  }
}));

// ── Pitch Kit export (standalone HTML) ───────────────────────────────────────
// POST /api/export/pitchkit — title block, a logline/genre/synopsis/comps
// pitch section, inline-SVG tension curve, inline-SVG character map + cast
// table, and a scene/word/verdict summary strip, all in one standalone
// print-quality HTML document. Deterministic and keyless: re-runs the
// doctor (server/nvm/analyze/doctor.ts), the analyzer (server/nvm/analyze/
// fountain-analyzer.ts), and the pitch-content builders (server/lib/
// logline.ts) here for the same authenticity reason POST /api/export/
// coverage does — the exported numbers (and now the exported pitch
// content) are always what the tool actually computed for this exact
// script, never something a client could hand-edit before asking the
// server to wrap it in a nice PDF-ready shell.
router.post('/api/export/pitchkit', gameLimiter, validate(DoctorBodySchema), asyncHandler(async (req, res) => {
  const fountain = resolveFountainOrRespond(req, res);
  if (fountain === undefined) return;

  const rawTitle = typeof req.body?.title === 'string' ? req.body.title : 'Untitled';
  const title = sanitizeForPrompt(rawTitle, 256) || 'Untitled';

  try {
    // Dynamic import: same rationale as the coverage route above — doctor.ts
    // pulls in the full analyzer + all 14 revision passes, so routes that
    // never call the doctor shouldn't pay for it at startup.
    const { runScriptDoctor } = await import('../nvm/analyze/doctor.ts');
    const report = await runScriptDoctor(fountain);
    const { records } = analyzeFountainText(fountain);
    const sceneCharacters = analyzeSceneCharacters(fountain);

    // Title-page fallback (P2 — "Untitled" bug fix) + the pitch content
    // itself (logline/genre/synopsis/comps) — see server/lib/logline.ts for
    // every builder's exact inputs and degradation rule.
    const titlePage = extractTitlePage(fountain);
    const pitchContent = buildPitchContent(report, records, fountain);

    const html = renderPitchKitHtml({
      title,
      titlePageTitle: titlePage.title,
      titlePageAuthor: titlePage.author,
      report,
      records,
      sceneCharacters,
      pitchContent,
    });

    const filename = `${encodeURIComponent(title)}-pitchkit.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (err) {
    logger.error('export_pitchkit_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Pitch kit export failed' });
  }
}));

// ── Determinism-badge verify (Run 15, ROADMAP §11) ───────────────────────────
// POST /api/export/verify — this is the determinism badge made checkable: a
// coverage report's footer "Verification hash" and the headline numbers next
// to it (health, verdict, totalIssues, healthPercentile — coverage-html.ts's
// buildFooterSection/buildHealthSection/buildHeaderSection) are claims. This
// route is how ANYONE holding the original script text can independently
// re-attest those claims without trusting whoever produced the export in the
// first place. Always keyless/deterministic: runScriptDoctor's diagnose-only
// pipeline never invokes an LLM (doctor.ts's own header comment establishes
// this), so no generation feature (deep read, AI rewrite, etc.) can ever
// influence what this route recomputes — it can only ever reproduce what the
// deterministic engine itself would produce for the identical text.
//
// Order of checks matters and is deliberately cheap-first: contentHash is
// recomputed from the submitted text BEFORE the doctor ever runs. If it
// doesn't match `expected.contentHash`, the text the caller submitted isn't
// the text the original report was about — full stop, no report field is
// even meaningful to compare — so the route returns immediately with a named
// hash mismatch and never pays for a 14-pass pipeline run. Only a matching
// hash unlocks the (quick, deterministic) doctor re-run that the rest of
// `expected`'s fields are checked against.
const VERIFY_FLOAT_TOLERANCE = 0.05;
// health/healthPercentile are displayed and typically re-typed/re-serialized
// as one-decimal numbers (coverage-html.ts's `.toFixed(1)`, doctor.ts's
// Math.round(x*10)/10 for health; healthPercentile is unrounded but derived
// from the same one-decimal-rounded inputs upstream) — a caller quoting a
// number back from a printed/exported report, or whose own JSON round-trip
// reformatted a float, can legitimately differ from the freshly computed
// value by less than one full unit in the last decimal place. 0.05 is half of
// that one-decimal step: it accepts any difference explainable purely by
// display/round-trip rounding while still catching a genuinely wrong number.

interface VerifyMismatch { field: string; expected: unknown; actual: unknown }

router.post('/api/export/verify', gameLimiter, validate(VerifyBodySchema), asyncHandler(async (req, res) => {
  const { expected } = req.body as {
    expected: {
      contentHash: string;
      health?: number;
      verdict?: CoverageVerdict;
      totalIssues?: number;
      healthPercentile?: number;
    };
  };

  const fountain = resolveFountainOrRespond(req, res);
  if (fountain === undefined) return;

  try {
    const actualContentHash = createHash('sha256').update(fountain.trim()).digest('hex');
    const verifiedAt = Date.now();

    // Cheap-first exit: the text isn't the text. Deliberately does NOT import
    // or call runScriptDoctor on this path — `recomputed` below carries only
    // contentHash, and `checked` names only contentHash, which is the honest
    // signal that no report field was ever compared (see comment above).
    if (actualContentHash !== expected.contentHash) {
      res.json({
        verified: false,
        checked: ['contentHash'],
        mismatches: [{ field: 'contentHash', expected: expected.contentHash, actual: actualContentHash }] as VerifyMismatch[],
        recomputed: { contentHash: actualContentHash },
        verifiedAt,
      });
      return;
    }

    // Dynamic import: same rationale as every other doctor-consuming route in
    // this file — doctor.ts pulls in the full analyzer + all 14 revision
    // passes, so routes that never call the doctor shouldn't pay for it at
    // startup. Diagnose-only, no LLM, no randomness: same input always
    // produces the same report (doctor.ts's own header comment).
    const { runScriptDoctor } = await import('../nvm/analyze/doctor.ts');
    const report = await runScriptDoctor(fountain);

    const checked: string[] = ['contentHash'];
    const mismatches: VerifyMismatch[] = [];

    if (expected.health !== undefined) {
      checked.push('health');
      if (Math.abs(expected.health - report.health) > VERIFY_FLOAT_TOLERANCE) {
        mismatches.push({ field: 'health', expected: expected.health, actual: report.health });
      }
    }
    if (expected.verdict !== undefined) {
      checked.push('verdict');
      if (expected.verdict !== report.verdict) {
        mismatches.push({ field: 'verdict', expected: expected.verdict, actual: report.verdict });
      }
    }
    if (expected.totalIssues !== undefined) {
      checked.push('totalIssues');
      if (expected.totalIssues !== report.totalIssues) {
        mismatches.push({ field: 'totalIssues', expected: expected.totalIssues, actual: report.totalIssues });
      }
    }
    if (expected.healthPercentile !== undefined) {
      checked.push('healthPercentile');
      const actualPercentile = report.healthPercentile;
      if (actualPercentile === undefined || Math.abs(expected.healthPercentile - actualPercentile) > VERIFY_FLOAT_TOLERANCE) {
        mismatches.push({ field: 'healthPercentile', expected: expected.healthPercentile, actual: actualPercentile });
      }
    }

    res.json({
      verified: mismatches.length === 0,
      checked,
      mismatches,
      recomputed: {
        contentHash: actualContentHash,
        health: report.health,
        verdict: report.verdict,
        totalIssues: report.totalIssues,
        healthPercentile: report.healthPercentile,
      },
      verifiedAt,
    });
  } catch (err) {
    logger.error('export_verify_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Verification failed' });
  }
}));
