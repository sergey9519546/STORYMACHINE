// Shareable coverage-report export — the studio-coverage-style HTML document
// writers download from the Script Doctor, print to PDF, and hand to
// producers. Every exported report is effectively an advertisement for the
// tool, so this renders a complete, self-contained, print-quality page: no
// external requests, no JS required to view, screenplay-culture typography
// (monospace header/data, serif prose).
//
// Pure function over an already-computed ScriptDoctorReport (server/nvm/
// analyze/types.ts) — no I/O, no Date.now(), no randomness, so the same
// report renders byte-for-byte identical HTML every time. The caller (POST
// /api/export/coverage in server/routes/export.ts) is responsible for
// running the doctor and, since ScriptDoctorReport.contentHash isn't
// populated by runScriptDoctor yet, for attaching it before calling in here.
//
// SECURITY: report content (title, scene slugs, issue text, summaries) is
// screenplay text supplied by whoever ran the doctor — untrusted input, not
// developer-authored strings. Every single interpolation below goes through
// escapeHtml(); there is no raw-interpolation path anywhere in this file.

import type {
  ScriptDoctorReport, DimensionScore, SceneDiagnostics, CoverageVerdict, RootCauseFinding,
} from '../nvm/analyze/types.ts';
import type { RevisionIssue, PassName } from '../nvm/revision/passes/types.ts';
import { isWholeDraftAnalysisComplete } from './analysis-completeness.ts';
import { computeStructuralReliabilityNote } from './structural-reliability.ts';
import { isNamedRootCause } from '../nvm/analyze/cluster.ts';
import { suppressContradictoryFindings } from '../nvm/analyze/prioritize.ts';

// ── Escaping ──────────────────────────────────────────────────────────────────
// The one and only path any user/screenplay-derived string takes into the
// document. Order matters: '&' must be replaced first or it would re-escape
// the entities produced by the later replacements.
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Small deterministic formatters ───────────────────────────────────────────
// Fixed locale + explicit UTC timezone so the same analyzedAt timestamp
// renders identically regardless of the host machine's locale/TZ — required
// for this to stay a pure function (same input -> same output, always).
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function titleCase(word: string): string {
  return word.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ── Health/grade color bands ──────────────────────────────────────────────────
// Mirrors the 90/75/55/35 thresholds documented on ScriptDoctorReport.grade
// in types.ts (excellent/strong/solid/uneven/troubled). Duplicated as a tiny,
// self-contained lookup rather than importing gradeForHealth from doctor.ts —
// that module pulls in the full analyzer + all 14 revision passes, which
// this pure presentation layer has no business paying for just to bucket a
// 0-100 number into a color.
function healthBandColor(score: number): { fg: string; bg: string } {
  if (score >= 90) return { fg: '#14532d', bg: '#1a7f37' };
  if (score >= 75) return { fg: '#14532d', bg: '#2f855a' };
  if (score >= 55) return { fg: '#78350f', bg: '#b45309' };
  if (score >= 35) return { fg: '#7c2d12', bg: '#c2410c' };
  return { fg: '#7f1d1d', bg: '#b91c1c' };
}

const VERDICT_STYLE: Record<CoverageVerdict, { bg: string; border: string; text: string; label: string }> = {
  RECOMMEND: { bg: '#eafaf1', border: '#1a7f37', text: '#14532d', label: 'RECOMMEND' },
  CONSIDER:  { bg: '#fffaf0', border: '#b45309', text: '#78350f', label: 'CONSIDER' },
  // Coverage vocabulary: "PASS" means the reader declines the project — the
  // single most commonly misread word in this whole document to a
  // non-industry audience, so the parenthetical is load-bearing, not decor.
  PASS:      { bg: '#fef2f2', border: '#b91c1c', text: '#7f1d1d', label: 'PASS (decline)' },
};
const UNKNOWN_VERDICT_STYLE = { bg: '#f1f5f9', border: '#64748b', text: '#334155', label: 'N/A' };

function severityChip(sev: RevisionIssue['severity']): string {
  const label = sev.toUpperCase();
  return `<span class="chip chip-${sev}">${label}</span>`;
}

// ── Section builders ──────────────────────────────────────────────────────────

function buildHeaderSection(
  report: ScriptDoctorReport, safeTitle: string, safeAuthor: string | null, safeLogline: string | null,
): string {
  const analyzedAt = typeof report.analyzedAt === 'number' ? report.analyzedAt : Date.now();
  const verdictStyle = report.verdict ? VERDICT_STYLE[report.verdict] : UNKNOWN_VERDICT_STYLE;
  const byline = safeAuthor ? `<div class="byline">Written by ${safeAuthor}</div>` : '';
  const loglineLine = safeLogline ? `<div class="logline-line">${safeLogline}</div>` : '';

  return `
  <header class="report-header">
    <div class="header-main">
      <div class="masthead">SCRIPT COVERAGE &mdash; STORYMACHINE</div>
      <h1 class="title">${safeTitle}</h1>
      ${byline}
      <div class="meta-line">
        ${formatDate(analyzedAt)} &middot;
        ${formatNumber(report.sceneCount)} scene${report.sceneCount === 1 ? '' : 's'} &middot;
        ${formatNumber(report.wordCount)} word${report.wordCount === 1 ? '' : 's'}${report.pageEstimate ? ` &middot;
        ~${formatNumber(report.pageEstimate.pages)} page${report.pageEstimate.pages === 1 ? '' : 's'} / ~${formatNumber(report.pageEstimate.runtimeMinutes)} min (est.)` : ''}
      </div>${report.excerptNote ? `
      <div class="meta-line" style="font-style:italic;">${escapeHtml(report.excerptNote)}</div>` : ''}
      ${loglineLine}
    </div>
    <div class="stamp-wrap">
      <div class="stamp" style="background:${verdictStyle.bg}; border-color:${verdictStyle.border}; color:${verdictStyle.text};">
        ${escapeHtml(verdictStyle.label)}
      </div>
    </div>
  </header>`;
}

function buildHealthSection(report: ScriptDoctorReport): string {
  const band = healthBandColor(report.health);
  const gradeLabel = report.grade ? titleCase(report.grade) : 'Unknown';
  const summary = report.plainSummary
    ? escapeHtml(report.plainSummary)
    : 'No summary is available for this report.';

  return `
  <section class="section health-section">
    <div class="health-score-block">
      <div class="health-number" style="color:${band.bg};">${report.health.toFixed(1)}</div>
      <div class="health-outof">/ 100</div>
      <div class="health-grade" style="background:${band.bg}; color:#fff;">${escapeHtml(gradeLabel)}</div>
    </div>
    <p class="plain-summary">${summary}</p>
  </section>`;
}

function buildDimensionsSection(dimensions: DimensionScore[]): string {
  if (dimensions.length === 0) {
    return `
  <section class="section">
    <h2>Craft Dimensions</h2>
    <p class="empty-note">Dimension scoring is not available for this report.</p>
  </section>`;
  }

  const rows = dimensions.map(dim => {
    const band = healthBandColor(dim.score);
    const width = Math.max(0, Math.min(100, dim.score));
    // D5 (docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md) false-precision
    // fix: a 0-100 score built from 2-4 passes' worth of issues is not the
    // same evidentiary claim as the headline health (all 14 passes). Name
    // the basis so the number reads as scoped rather than absolute — no
    // score changes, this only adds the already-computed issueCount/passes
    // fields (types.ts's DimensionScore) that were previously silent.
    const passList = dim.passes.map(titleCase).join(', ');
    const basis = `Based on ${formatNumber(dim.issueCount)} issue${dim.issueCount === 1 ? '' : 's'} `
      + `across ${dim.passes.length} pass${dim.passes.length === 1 ? '' : 'es'} (${escapeHtml(passList)}).`;
    return `
    <div class="dim-row">
      <div class="dim-label">${escapeHtml(dim.label)}</div>
      <div class="dim-bar-track">
        <div class="dim-bar-fill" style="width:${width}%; background:${band.bg};"></div>
      </div>
      <div class="dim-score">${Math.round(dim.score)}/100</div>
      <div class="dim-summary">${escapeHtml(dim.summary)}</div>
      <div class="dim-basis">${basis}</div>
    </div>`;
  }).join('\n');

  return `
  <section class="section">
    <h2>Craft Dimensions</h2>
    <div class="dim-list">
      ${rows}
    </div>
  </section>`;
}

function buildStrengthsSection(strengths: string[]): string {
  // Guard: strengths are earned, never padded (doctor.ts's contract) — an
  // empty array means nothing was genuinely earned, so the whole section is
  // omitted rather than rendered with a hollow "no strengths found" filler.
  if (strengths.length === 0) return '';

  const items = strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('\n');
  return `
  <section class="section">
    <h2>What&rsquo;s Working</h2>
    <ul class="checklist">
      ${items}
    </ul>
  </section>`;
}

function heatmapCellColor(cell: SceneDiagnostics): { bg: string; fg: string } {
  if (cell.critical > 0) return { bg: '#b91c1c', fg: '#fff' };
  if (cell.major > 0) return { bg: '#d97706', fg: '#fff' };
  if (cell.minor > 0) return { bg: '#fde68a', fg: '#78350f' };
  return { bg: '#1a7f37', fg: '#fff' };
}

function buildHeatmapSection(heatmap: SceneDiagnostics[]): string {
  if (heatmap.length === 0) {
    return `
  <section class="section">
    <h2>Scene Heatmap</h2>
    <p class="empty-note">No scenes were analyzed for this report.</p>
  </section>`;
  }

  const cells = heatmap.map(cell => {
    const color = heatmapCellColor(cell);
    const tooltip = escapeHtml(
      `${cell.slug} — ${cell.issueCount} issue${cell.issueCount === 1 ? '' : 's'}`,
    );
    return `<div class="heat-cell" style="background:${color.bg}; color:${color.fg};" title="${tooltip}">${cell.sceneIdx + 1}</div>`;
  }).join('\n');

  return `
  <section class="section heatmap-section">
    <h2>Scene Heatmap</h2>
    <div class="heat-row">
      ${cells}
    </div>
  </section>`;
}

function buildTopPrioritiesSection(topPrioritiesIn: Array<RevisionIssue & { pass: PassName }>): string {
  // Audit item 10 (.../scratchpad/advice-quality-audit.md, R8): a reader
  // should never see two top-ten findings that cannot both be true about the
  // same script. Filtered here, at the render boundary, so every caller of
  // renderCoverageHtml (the live /coverage export, the PDF route, the P0
  // sample report generator) gets the suppression regardless of whether the
  // route that built this report already applied it — see
  // prioritize.ts's suppressContradictoryFindings for the table and the
  // reasoning behind each kept/dropped rule.
  const topPriorities = suppressContradictoryFindings(topPrioritiesIn);
  if (topPriorities.length === 0) {
    return `
  <section class="section">
    <h2>Top Priorities</h2>
    <p class="empty-note">Nothing urgent surfaced &mdash; there is no priority fix to flag right now.</p>
  </section>`;
  }

  const items = topPriorities.map(issue => {
    const fix = issue.suggestedFix
      ? `<div class="issue-fix"><strong>Suggested fix:</strong> ${escapeHtml(issue.suggestedFix)}</div>`
      : '';
    return `
    <li class="priority-item">
      <div class="priority-head">
        ${severityChip(issue.severity)}
        <span class="issue-location">${escapeHtml(issue.location)}</span>
        <span class="issue-pass">${escapeHtml(titleCase(issue.pass))}</span>
      </div>
      <div class="issue-description">${escapeHtml(issue.description)}</div>
      ${fix}
    </li>`;
  }).join('\n');

  return `
  <section class="section">
    <h2>Top Priorities</h2>
    <ol class="priority-list">
      ${items}
    </ol>
  </section>`;
}

// Pilot session 2026-08-07 finding #3 (PILOT_SESSION_REPORT.md §0.3, §6, §9.3):
// the API report (POST /api/scriptide/doctor) carries a root-causes synthesis
// that collapses the raw issue list into named underlying problems — exactly
// the "bounded deduction, not issue-count density" collapsing CLAUDE.md's
// standing task calls for — but the exported coverage.html previously jumped
// straight from Top Priorities to the raw 181-item Full Pass Appendix, so the
// most reader-friendly layer of the system was computed and never shown to
// the person receiving the static report (one of the two documented P0
// exposure modes).
//
// 2026-09-04 (advice-quality audit item 1): that single section is now TWO.
// The audit found the hand-written, evidence-backed NAMED templates/families
// in cluster.ts ("The middle has no engine — Two independent checks agree
// that Scene 6 is the story's dead center… That's not two problems, it's one
// missing pivot") are the best writing in the product and the one layer
// measured to actually discriminate a deliberately excellent script from a
// deliberately bad one — yet they rendered BELOW Top Priorities, sorted below
// generic 13-15-member auto-titled clusters of the same severity (fixed
// separately in cluster.ts's comparator; see isNamedRootCause there). Named
// findings are split out and rendered ABOVE Top Priorities, under the "Root
// Causes" heading the pilot session's fix originally gave the combined list;
// the generic auto-titled clusters are NOT deleted — see
// buildClusterFindingsSection below — they stay, ranked below, in the
// original Top-Priorities-then-appendix position.
function rootCauseListItems(rootCauses: RootCauseFinding[]): string {
  return rootCauses.map(rc => {
    const scenes = rc.sceneIdxs.length > 0
      ? rc.sceneIdxs.map(i => `Scene ${i + 1}`).join(', ')
      : null;
    const memberLine = `Subsumes ${formatNumber(rc.memberCount)} issue${rc.memberCount === 1 ? '' : 's'}`
      + (scenes ? ` &mdash; ${escapeHtml(scenes)}` : '')
      + (rc.memberRules.length > 0 ? ` &mdash; rules: ${escapeHtml(rc.memberRules.join(', '))}` : '');
    return `
    <li class="priority-item">
      <div class="priority-head">
        ${severityChip(rc.severity)}
        <span class="issue-location">${escapeHtml(rc.title)}</span>
      </div>
      <div class="issue-description">${escapeHtml(rc.explanation)}</div>
      <div class="issue-fix">${memberLine}</div>
    </li>`;
  }).join('\n');
}

/** The hand-written, evidence-backed named diagnoses only (isNamedRootCause)
 *  — rendered ABOVE Top Priorities, since these are the findings the audit
 *  showed a writer should read first. Omitted entirely (not a hollow
 *  section, matching buildStrengthsSection's convention) whenever
 *  clustering produced no named finding for this report — most reports,
 *  since named templates require a specific, audited rule co-occurrence. */
function buildNamedRootCausesSection(rootCauses: RootCauseFinding[] | undefined): string {
  if (!rootCauses) return '';
  const named = rootCauses.filter(isNamedRootCause);
  if (named.length === 0) return '';

  return `
  <section class="section">
    <h2>Root Causes</h2>
    <p class="dim-basis" style="margin:0 0 12px;">The ${formatNumber(named.length)} finding${named.length === 1 ? '' : 's'} below name the specific underlying craft problem behind several issues at once &mdash; read these first.</p>
    <ol class="priority-list">
      ${rootCauseListItems(named)}
    </ol>
  </section>`;
}

/** The generic, auto-titled convergence clusters ("Recurring X trouble in
 *  Scene N" / "Widespread X concerns") — kept (never deleted, per the audit's
 *  explicit instruction), but ranked below Top Priorities, in the position
 *  the combined Root Causes section held before this split. */
function buildClusterFindingsSection(rootCauses: RootCauseFinding[] | undefined): string {
  // Guard: only render when the report actually carries a synthesis — an
  // absent rootCauses means the caller never attached one (this field is
  // optional on ScriptDoctorReport; only the /doctor, /doctor/deep, and
  // /doctor/pdf routes attach it today, per each route's own clustering step
  // in server/routes/scriptide.ts), not that clustering ran and found nothing
  // to group.
  if (!rootCauses) return '';
  const generic = rootCauses.filter(rc => !isNamedRootCause(rc));
  if (generic.length === 0) return '';

  return `
  <section class="section">
    <h2>Recurring Issue Clusters</h2>
    <p class="dim-basis" style="margin:0 0 12px;">The ${formatNumber(generic.length)} finding${generic.length === 1 ? '' : 's'} below cluster the detailed issue list by where they land in the script &mdash; read after Top Priorities, alongside the full appendix.</p>
    <ol class="priority-list">
      ${rootCauseListItems(generic)}
    </ol>
  </section>`;
}

function buildAppendixSection(passes: ScriptDoctorReport['passes']): string {
  // Degenerate case (e.g. a zero-scene submission): no passes ran at all,
  // which is a different fact from "14 passes ran and found nothing" — say
  // so precisely rather than reusing the clean-report message.
  if (passes.length === 0) {
    return `
  <section class="section">
    <h2>Full Pass Appendix</h2>
    <p class="empty-note">No revision passes were run for this report.</p>
  </section>`;
  }

  const withIssues = passes.filter(p => p.issues.length > 0);
  if (withIssues.length === 0) {
    return `
  <section class="section">
    <h2>Full Pass Appendix</h2>
    <p class="empty-note">No issues surfaced in any of the ${passes.length} revision passes.</p>
  </section>`;
  }

  const passBlocks = withIssues.map(pass => {
    const issueItems = pass.issues.map(issue => {
      const fix = issue.suggestedFix
        ? `<div class="issue-fix"><strong>Suggested fix:</strong> ${escapeHtml(issue.suggestedFix)}</div>`
        : '';
      return `
      <li class="appendix-item">
        <div class="priority-head">
          ${severityChip(issue.severity)}
          <span class="issue-location">${escapeHtml(issue.location)}</span>
        </div>
        <div class="issue-description">${escapeHtml(issue.description)}</div>
        ${fix}
      </li>`;
    }).join('\n');

    return `
    <div class="pass-block">
      <h3>${escapeHtml(titleCase(pass.pass))} &mdash; ${pass.issues.length} issue${pass.issues.length === 1 ? '' : 's'}</h3>
      <ul class="appendix-list">
        ${issueItems}
      </ul>
    </div>`;
  }).join('\n');

  return `
  <section class="section">
    <h2>Full Pass Appendix</h2>
    ${passBlocks}
  </section>`;
}

function buildFooterSection(report: ScriptDoctorReport): string {
  const analyzedAt = typeof report.analyzedAt === 'number' ? report.analyzedAt : Date.now();
  const hashLine = report.contentHash
    ? `<div class="footer-hash">Script-text hash (SHA-256, first 12 characters): <code>${escapeHtml(report.contentHash.slice(0, 12))}</code></div>`
    : '';

  // P3 "verify this report" block: the footer hash is the anchor fact, but a
  // 12-char prefix can't anchor anything — collision resistance lives in the
  // full 64-hex digest. This block publishes the FULL hash alongside the
  // headline claims (health / verdict / totalIssues) so anyone holding the
  // original script text can re-attest every number in this document against
  // POST /api/export/verify on any Story Machine instance (route:
  // server/routes/export.ts; the engine is deterministic and LLM-free, so a
  // re-run on the same text always reproduces the same report). The in-app
  // verifier lives at the app's #verify hash route.
  const verifyBlock = report.contentHash
    ? `<div class="verify-block">
      <div class="verify-heading">Verify this report</div>
      <div class="verify-body">
        This report is reproducible. Anyone with the original script text can confirm
        it was produced by the engine &mdash; not hand-edited &mdash; by re-running the
        deterministic analysis:
      </div>
      <ol class="verify-steps">
        <li>Open any Story Machine instance and go to <code>#verify</code> (the &ldquo;Verify a report&rdquo; link on the start screen), or POST the script text to <code>/api/export/verify</code>.</li>
        <li>Paste the original script text and the expected values below.</li>
        <li>The service recomputes the hash and re-runs the analysis; every value must match.</li>
      </ol>
      <dl class="verify-claims">
        <div><dt>Script-text hash (SHA-256, full)</dt><dd><code>${escapeHtml(report.contentHash)}</code></dd></div>
        <div><dt>Health</dt><dd><code>${escapeHtml(report.health.toFixed(1))}</code></dd></div>
        ${report.verdict ? `<div><dt>Verdict</dt><dd><code>${escapeHtml(report.verdict)}</code></dd></div>` : ''}
        <div><dt>Total issues</dt><dd><code>${report.totalIssues}</code></dd></div>
        ${report.provenance ? `<div><dt>Engine commit</dt><dd><code>${escapeHtml(report.provenance.engineCommit)}</code></dd></div>
        <div><dt>Rulebook count</dt><dd><code>${report.provenance.rulebookCount}</code></dd></div>` : ''}
      </dl>
    </div>`
    : '';

  // Category B honesty caveat (2026-07-28), now a CONSUMER of the same field
  // doctor.ts's aggregation populates on ScriptDoctorReport.provenance
  // (server/lib/structural-reliability.ts is the single source of truth for
  // both — see that file's header). Falls back to computing it locally only
  // for a report that predates the provenance field (an older cached/
  // reconstructed report shape reaching this pure function directly) so this
  // stays correct for ANY ScriptDoctorReport, not just ones a live doctor run
  // just produced.
  const structuralNote = report.provenance?.structuralReliabilityNote
    ?? computeStructuralReliabilityNote(report.sceneCount);
  const structuralCaveat = structuralNote
    ? `<div class="footer-caveat">${structuralNote}</div>`
    : '';

  return `
  <footer class="report-footer">
    <div class="footer-disclaimer">
      Deterministic analysis &mdash; no generative AI read or scored this script.
      Running this engine again on the same script text reproduces the same score and verdict.
    </div>
    ${structuralCaveat}
    ${hashLine}
    ${verifyBlock}
    <div class="footer-generated">Generated ${formatDateTime(analyzedAt)}</div>
  </footer>`;
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
    .page {
      max-width: 850px;
      margin: 0 auto;
      padding: 40px 48px 56px;
      background: #fffdf9;
    }
    .mono {
      font-family: 'Courier New', Courier, monospace;
    }
    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 3px double #1a1a1a;
      padding-bottom: 18px;
      margin-bottom: 28px;
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
      font-size: 26px;
      font-weight: 700;
      margin: 0 0 8px;
      word-break: break-word;
    }
    .byline {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12.5px;
      color: #52525b;
      margin: 0 0 6px;
    }
    .meta-line {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12.5px;
      color: #3f3f46;
    }
    .logline-line {
      font-size: 14px;
      font-style: italic;
      color: #27272a;
      margin-top: 8px;
    }
    .stamp-wrap {
      flex: 0 0 auto;
      padding-top: 4px;
    }
    .stamp {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.08em;
      border: 3px solid;
      border-radius: 6px;
      padding: 10px 16px;
      transform: rotate(-7deg);
      white-space: nowrap;
      box-shadow: 0 1px 0 rgba(0,0,0,0.05);
    }
    /* ── Sections ── */
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
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
    .empty-note {
      color: #71717a;
      font-style: italic;
      margin: 0;
    }
    /* ── Health ── */
    .health-section {
      display: flex;
      align-items: center;
      gap: 24px;
      background: #faf9f5;
      border: 1px solid #e4e2d8;
      border-radius: 8px;
      padding: 20px 24px;
    }
    .health-score-block {
      flex: 0 0 auto;
      text-align: center;
      min-width: 120px;
    }
    .health-number {
      font-family: 'Courier New', Courier, monospace;
      font-size: 48px;
      font-weight: 700;
      line-height: 1;
    }
    .health-outof {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #71717a;
      margin-bottom: 8px;
    }
    .health-grade {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .plain-summary {
      margin: 0;
      font-size: 15px;
    }
    /* ── Dimensions ── */
    .dim-list { display: flex; flex-direction: column; gap: 14px; }
    .dim-row {
      display: grid;
      grid-template-columns: 150px 1fr 70px;
      grid-template-areas: "label bar score" "summary summary summary" "basis basis basis";
      row-gap: 4px;
      column-gap: 12px;
      align-items: center;
    }
    .dim-label { grid-area: label; font-weight: 700; font-size: 13px; }
    .dim-bar-track {
      grid-area: bar;
      background: #e4e4e7;
      border-radius: 999px;
      height: 10px;
      overflow: hidden;
    }
    .dim-bar-fill { height: 100%; border-radius: 999px; }
    .dim-score {
      grid-area: score;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      text-align: right;
      color: #3f3f46;
    }
    .dim-summary { grid-area: summary; font-size: 13px; color: #3f3f46; }
    .dim-basis { grid-area: basis; font-size: 11px; color: #a3a3a3; }
    /* ── Checklist ── */
    .checklist { margin: 0; padding-left: 0; list-style: none; }
    .checklist li {
      position: relative;
      padding-left: 26px;
      margin-bottom: 8px;
      font-size: 13.5px;
    }
    .checklist li::before {
      content: "\\2713";
      position: absolute;
      left: 0;
      color: #1a7f37;
      font-weight: 700;
      font-family: 'Courier New', Courier, monospace;
    }
    /* ── Heatmap ── */
    .heat-row { display: flex; flex-wrap: wrap; gap: 5px; }
    .heat-cell {
      width: 30px;
      height: 30px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: 700;
    }
    /* ── Priorities / appendix ── */
    .priority-list, .appendix-list {
      margin: 0;
      padding-left: 20px;
    }
    .priority-item, .appendix-item {
      margin-bottom: 14px;
    }
    .priority-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .issue-location {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11.5px;
      color: #3f3f46;
    }
    .issue-pass {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .issue-description { font-size: 13.5px; }
    .issue-fix {
      font-size: 13px;
      color: #3f3f46;
      margin-top: 2px;
    }
    .pass-block { margin-bottom: 20px; }
    .pass-block h3 {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      margin: 0 0 8px;
    }
    /* ── Chips ── */
    .chip {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .chip-critical { background: #fef2f2; color: #b91c1c; }
    .chip-major { background: #fffbeb; color: #b45309; }
    .chip-minor { background: #eff6ff; color: #1d4ed8; }
    /* ── Footer ── */
    .report-footer {
      border-top: 1px solid #d4d4d8;
      margin-top: 36px;
      padding-top: 16px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #52525b;
      text-align: center;
      line-height: 1.6;
    }
    .footer-hash code {
      background: #f4f4f5;
      padding: 1px 6px;
      border-radius: 3px;
    }
    .footer-caveat {
      margin: 8px 0;
      padding: 6px 10px;
      background: #fef9c3;
      border: 1px solid #fde68a;
      border-radius: 3px;
      color: #713f12;
    }
    /* ── Verify block (P3) ── */
    .verify-block {
      margin: 14px auto 0;
      max-width: 640px;
      padding: 12px 16px;
      border: 1px solid #d4d4d8;
      border-radius: 3px;
      background: #fafaf9;
      text-align: left;
    }
    .verify-heading {
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 6px;
      color: #1a1a1a;
    }
    .verify-body { margin-bottom: 8px; }
    .verify-steps {
      margin: 0 0 10px 18px;
      padding: 0;
    }
    .verify-steps li { margin-bottom: 3px; }
    .verify-claims {
      margin: 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: 4px;
    }
    .verify-claims dt {
      display: inline;
      color: #52525b;
    }
    .verify-claims dd {
      display: inline;
      margin: 0 0 0 6px;
    }
    .verify-claims code, .verify-steps code {
      background: #f4f4f5;
      padding: 1px 6px;
      border-radius: 3px;
      word-break: break-all;
    }
    /* ── Print ── */
    @page {
      size: letter portrait;
      margin: 0.65in;
    }
    @media print {
      body { background: #fff; }
      .page { max-width: none; padding: 0; background: #fff; }
      .stamp { box-shadow: none; }
      .health-section { border: 1px solid #d4d4d8; }
      .section { page-break-inside: avoid; break-inside: avoid; }
    }
`;

export interface CoverageHtmlOptions {
  /** Title parsed from the Fountain title page (server/lib/logline.ts's
   *  extractTitlePage), if any. Used ONLY when `title` is empty or the
   *  literal 'Untitled' placeholder — an explicit title always wins. */
  titlePageTitle?: string | null;
  /** Author parsed from the Fountain title page, if any. Purely additive
   *  (rendered as a byline under the title) — never a fallback for title. */
  titlePageAuthor?: string | null;
  /** Logline built by server/lib/logline.ts's buildLogline, if any — the
   *  one-line pitch the coverage report's header carries alongside the
   *  title. null when the builder degraded (no speaking character etc.). */
  logline?: string | null;
}

/** GODMODE analysis section — surfaces the new structural analysis layers
 *  (disclosure/epistemic, character functions, subplots, graph health) in
 *  the exported coverage report. Each subsection renders only when data
 *  is present, so reports from older runs don't break. */
function buildGodmodeSection(report: ScriptDoctorReport): string {
  const parts: string[] = [];

  // Graph Health (L5)
  if (report.graphHealth) {
    const gh = report.graphHealth;
    const meter = '█'.repeat(Math.round(gh.graphHealthScore / 5));
    parts.push(`<div class="metric-row"><span class="metric-label">Graph Health</span><span class="metric-value">${gh.graphHealthScore}/100</span></div>`);
    if (gh.graphDeduction > 0) {
      parts.push(`<div class="metric-row sub"><span class="metric-label">→ Health deduction</span><span class="metric-value">−${gh.graphDeduction}</span></div>`);
    }
    for (const finding of gh.findings) {
      parts.push(`<li class="issue-minor">${escapeHtml(finding)}</li>`);
    }
  }

  // Disclosure & Epistemics (L4/L19)
  if (report.disclosureAnalysis?.scored) {
    const da = report.disclosureAnalysis;
    parts.push(`<div class="metric-row"><span class="metric-label">Disclosure Violations</span><span class="metric-value">${da.violationCount}</span></div>`);
    if (da.epistemicGaps.length > 0) {
      parts.push(`<div class="metric-row sub"><span class="metric-label">Epistemic gaps</span><span class="metric-value">${da.epistemicGaps.length}</span></div>`);
      for (const gap of da.epistemicGaps.slice(0, 3)) {
        parts.push(`<li class="issue-minor">${escapeHtml(gap.description)}</li>`);
      }
    }
  }

  // Character Functions (L8)
  if (report.characterFunctions && report.characterFunctions.length > 0) {
    const funcs = report.characterFunctions.map(cf =>
      `${escapeHtml(cf.characterId)}: ${cf.function} (${(cf.confidence * 100).toFixed(0)}%)`,
    ).join(' · ');
    parts.push(`<div class="metric-row"><span class="metric-label">Character Functions</span><span class="metric-value">${funcs}</span></div>`);
  }

  // Subplots (L13)
  if (report.subplots && report.subplots.totalSubplots > 0) {
    const sp = report.subplots;
    parts.push(`<div class="metric-row"><span class="metric-label">Subplots</span><span class="metric-value">${sp.totalSubplots} (${sp.unresolvedSubplots} unresolved, ${sp.intersectionCount} intersections)</span></div>`);
    for (const subplot of sp.subplots.slice(0, 5)) {
      parts.push(`<li class="issue-minor">${escapeHtml(subplot.description)}</li>`);
    }
  }

  // Deliberate Rule-Breaking (L37)
  if (report.ruleBreaking?.scored && report.ruleBreaking.findings.length > 0) {
    const rb = report.ruleBreaking;
    const deliberate = rb.findings.filter(f => f.readsAsDeliberate).length;
    parts.push(`<div class="metric-row"><span class="metric-label">Rule-Breaking</span><span class="metric-value">${rb.findings.length} findings (${deliberate} deliberate)</span></div>`);
    for (const finding of rb.findings.slice(0, 4)) {
      const tag = finding.readsAsDeliberate ? 'PRESERVE' : 'CHECK';
      parts.push(
        `<li class="issue-minor"><strong>${escapeHtml(tag)}</strong> ${escapeHtml(finding.convention)} — ${escapeHtml(finding.preserveNotice)}</li>`,
      );
      for (const c of finding.compensations.slice(0, 2)) {
        parts.push(`<li class="issue-minor sub">${escapeHtml(c)}</li>`);
      }
    }
  }

  if (parts.length === 0) return '';

  return `<section class="section"><h2>Structural Analysis</h2><div class="metrics-grid">${parts.join('\n')}</div></section>`;
}

/**
 * Render a ScriptDoctorReport into a complete, standalone, print-quality
 * HTML document — the shareable coverage report writers download, print to
 * PDF, and hand to producers. Pure function: inline CSS only, zero external
 * requests, no JS required to view. Every value that could conceivably
 * contain screenplay-derived text (title, author, logline, scene slugs,
 * issue text, summaries, strengths) is escaped via escapeHtml() before
 * interpolation.
 */
export function renderCoverageHtml(report: ScriptDoctorReport, title: string, opts: CoverageHtmlOptions = {}): string {
  if (!isWholeDraftAnalysisComplete(report)) {
    throw new Error('Coverage export requires a complete whole-draft analysis.');
  }

  // Title fallback chain: explicit title > parsed title page > 'Untitled'.
  // An explicit 'Untitled' (the client's own default when no title field was
  // posted — see server/routes/export.ts) is treated the same as empty, so
  // a script with a real Title: page never displays the literal word
  // "Untitled" just because the caller didn't bother passing a title.
  const explicitTitle = title.trim();
  const resolvedTitle = (explicitTitle && explicitTitle !== 'Untitled')
    ? explicitTitle
    : (opts.titlePageTitle?.trim() || explicitTitle || 'Untitled');
  const safeTitle = escapeHtml(resolvedTitle);
  const safeAuthor = opts.titlePageAuthor?.trim() ? escapeHtml(opts.titlePageAuthor.trim()) : null;
  const safeLogline = opts.logline?.trim() ? escapeHtml(opts.logline.trim()) : null;
  const dimensions = report.dimensions ?? [];
  const strengths = report.strengths ?? [];

  const body = [
    buildHeaderSection(report, safeTitle, safeAuthor, safeLogline),
    buildHealthSection(report),
    buildDimensionsSection(dimensions),
    buildStrengthsSection(strengths),
    buildGodmodeSection(report),
    buildHeatmapSection(report.sceneHeatmap ?? []),
    buildNamedRootCausesSection(report.rootCauses),
    buildTopPrioritiesSection(report.topPriorities ?? []),
    buildClusterFindingsSection(report.rootCauses),
    buildAppendixSection(report.passes ?? []),
    buildFooterSection(report),
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle} &mdash; Script Coverage</title>
<style>
${STYLES}
</style>
</head>
<body>
  <div class="page">
${body}
  </div>
</body>
</html>`;

  // Generated reports are committed as reproducible artifacts. Keep blank
  // lines truly blank so a renderer run never needs manual whitespace cleanup.
  return html.replace(/[ \t]+(?=\r?\n|$)/g, '');
}
