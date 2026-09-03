// POST /api/export/coverage-letter — the one-to-two-page connected-prose
// coverage LETTER (upgrade-writer-experience discovery #7), sibling to POST
// /api/export/coverage's dashboard-style HTML export (server/routes/
// export.ts, server/lib/coverage-html.ts).
//
// Deliberately its OWN route file/router rather than an addition to
// server/routes/export.ts: that file (plus server/lib/coverage-html.ts,
// server/routes/scriptide.ts, and two client panels) was under concurrent
// edit by other agent lanes while this route was built, so touching it here
// would have collided with that work. server/app.ts mounts this router
// alongside exportRouter with one import + one app.use() line — the minimal
// hook needed to make the route live; it does not touch export.ts itself.
//
// POST only (no GET variant): every sibling export route in this codebase
// (fdx, docx, coverage, verify, slate, pitchkit) is POST-only for the same
// reason — the input is the full Fountain/FDX text (up to
// MAX_FOUNTAIN_CHARS, ~900,000 characters), which does not fit in a query
// string, and none of these stateless doctor-shaped routes accept a
// sessionId to load text server-side instead (see e.g. scriptide.ts's
// "Stateless, like /doctor: no sessionId" comments on its own doctor-shaped
// routes). A GET alias would therefore have to either silently truncate the
// script or introduce a session dependency no sibling export route has.
//
// Same two-format body contract as POST /api/export/coverage (exactly one of
// fountain/fdx, optional title), plus an optional author byline — see
// CoverageLetterBodySchema (server/lib/validation.ts). Re-runs the doctor
// itself for the same reason that route does (see its own comment): the
// exported letter must be AUTHENTIC — a report the engine actually produced
// for this exact script — not something a client could hand-edit before
// asking the server to format it nicely.

import express from 'express';
import { sanitizeForPrompt } from '../lib/prompt-utils.ts';
import { logger } from '../lib/logger.ts';
import { isWholeDraftAnalysisComplete } from '../lib/analysis-completeness.ts';
import { asyncHandler, gameLimiter } from '../lib/session-store.ts';
import { validate, CoverageLetterBodySchema } from '../lib/validation.ts';
import type { ScriptDoctorReport } from '../nvm/analyze/types.ts';
import { fdxToFountain } from '../lib/fdx-import.ts';
import { renderCoverageLetter } from '../lib/coverage-letter.ts';
import { extractTitlePage } from '../lib/logline.ts';

const router = express.Router();
export default router;

router.post('/api/export/coverage-letter', gameLimiter, validate(CoverageLetterBodySchema), asyncHandler(async (req, res) => {
  const { fountain: fountainBody, fdx, author: authorBody } = req.body as {
    fountain?: string; fdx?: string; title?: string; author?: string;
  };

  // Same fdx->Fountain resolution as POST /api/export/coverage: convert here
  // (fdxToFountain is small/pure/dependency-free, so it's imported statically
  // rather than dynamically) and 400 on either a conversion failure or a
  // conversion that produced nothing to analyze.
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
  const sanitizedTitle = sanitizeForPrompt(rawTitle, 256) || 'Untitled';

  try {
    // Dynamic import: doctor.ts pulls in the full analyzer + all 14 revision
    // passes, matching this file's sibling routes' convention of lazily
    // loading heavy analysis modules so routes that never call the doctor
    // don't pay for it at startup.
    const { runScriptDoctor } = await import('../nvm/analyze/doctor.ts');
    const report: ScriptDoctorReport = await runScriptDoctor(fountain);

    if (!isWholeDraftAnalysisComplete(report)) {
      res.status(422).json({
        error: 'analysis_incomplete',
        message: 'Coverage letter is unavailable because the script could not be analyzed completely.',
        analysisComplete: false,
        ...(report.truncatedForAnalysis
          ? { truncatedForAnalysis: true, totalSceneCount: report.totalSceneCount }
          : {}),
      });
      return;
    }

    // Title/author fallback chain — mirrors coverage-html.ts's own
    // resolvedTitle logic exactly (explicit value wins unless empty or the
    // literal 'Untitled' placeholder, else fall back to the Fountain title
    // page), duplicated here at the route layer because
    // renderCoverageLetter's opts are report-derived only (per its
    // documented signature) and take no separate "title page" argument.
    const titlePage = extractTitlePage(fountain);
    const resolvedTitle = (sanitizedTitle && sanitizedTitle !== 'Untitled')
      ? sanitizedTitle
      : (titlePage.title?.trim() || sanitizedTitle);
    const resolvedAuthor = authorBody?.trim()
      ? sanitizeForPrompt(authorBody.trim(), 256)
      : (titlePage.author?.trim() || undefined);

    // Root-cause clustering — same two-call pattern as POST
    // /api/export/coverage (see that route's own comment): the doctor
    // doesn't attach rootCauses itself, so it's computed here from the same
    // inputs already in scope.
    const { locateIssues } = await import('../nvm/analyze/locate.ts');
    const { clusterIssues } = await import('../nvm/analyze/cluster.ts');
    const issuesWithPass = report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
    const rootCauses = clusterIssues(locateIssues(issuesWithPass, fountain));

    const { markdown, text } = renderCoverageLetter(
      { ...report, rootCauses },
      { title: resolvedTitle, author: resolvedAuthor },
    );

    res.json({ markdown, text, contentHash: report.contentHash ?? null });
  } catch (err) {
    logger.error('export_coverage_letter_error', { message: (err as Error).message });
    res.status(500).json({ error: 'Coverage letter export failed' });
  }
}));
