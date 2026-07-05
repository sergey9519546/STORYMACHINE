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
import { validate, DoctorBodySchema } from '../lib/validation.ts';
import { fdxToFountain } from '../lib/fdx-import.ts';
import { renderCoverageHtml } from '../lib/coverage-html.ts';

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

router.post('/api/export/fdx', gameLimiter, asyncHandler(async (req, res) => {
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

router.post('/api/export/docx', gameLimiter, asyncHandler(async (req, res) => {
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

router.post('/api/export/print-html', gameLimiter, asyncHandler(async (req, res) => {
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

    const html = renderCoverageHtml({ ...report, contentHash }, title);

    const filename = `${encodeURIComponent(title)}-coverage.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (err) {
    logger.error('export_coverage_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Coverage export failed' });
  }
}));
