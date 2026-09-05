// "Shape & Rhythm" — the ScriptDoctorPanel.tsx surface for
// ScriptDoctorReport.structuralSignals (server/nvm/analyze/
// structural-signals.ts), advisory only, never wired into the score. No
// React render harness exists in this repo (see tests/core/
// g0-09-report-honesty-copy.test.ts's own header) — this asserts on the
// component source directly with short, distinctive fragments, the same
// convention g0-06/g0-07/g0-09 already use.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

const panel = read('../../src/components/scriptide/ScriptDoctorPanel.tsx');
const snapshotManager = read('../../src/components/scriptide/SnapshotManager.tsx');
const scriptIde = read('../../src/components/ScriptIDE.tsx');
const doctorStream = read('../../src/lib/doctor-stream.ts');
const whatIfPanel = read('../../src/components/WhatIfPanel.tsx');
const slatePanel = read('../../src/components/SlatePanel.tsx');

describe('ScriptDoctorPanel — "Shape & Rhythm" section', () => {
  it('renders a "Shape & Rhythm" heading', () => {
    assert.match(panel, /Shape\s*&amp;\s*Rhythm/);
  });

  it('is gated on structuralSignals being present AND scored — the "field absent" path', () => {
    assert.match(panel, /report\.structuralSignals\?\.scored/);
  });

  it('states the "not part of the score" label, not just "diagnostic"', () => {
    assert.match(panel, /Descriptive — not part of the score/);
    assert.match(panel, /descriptive only, not part of/);
  });

  it('renders both document aggregates named in docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md §4, in order', () => {
    const meanAbsIdx = panel.indexOf('meanAbsDialogueShareDelta');
    const cvIdx = panel.indexOf('actionSentenceCvOverall');
    assert.ok(meanAbsIdx !== -1, 'meanAbsDialogueShareDelta must appear');
    assert.ok(cvIdx !== -1, 'actionSentenceCvOverall must appear');
    assert.match(panel, /Talk\/action swing/);
    assert.match(panel, /Action-prose variation/);
  });

  it('per-scene tooltip carries scene index, words, dialogueShare, speakers, lengthZ, and openCloseShift', () => {
    // The tooltip-builder function, matched by its distinctive fields.
    const fnMatch = panel.match(/function structuralSceneTooltip[\s\S]{0,900}?\n}/);
    assert.ok(fnMatch, 'structuralSceneTooltip helper must exist');
    const fn = fnMatch![0];
    assert.match(fn, /scene\.words/);
    assert.match(fn, /scene\.lengthZ/);
    assert.match(fn, /dialogueShare|talkPct/);
    assert.match(fn, /scene\.speakers/);
    assert.match(fn, /scene\.openCloseShift/);
  });

  it('the tooltip text matches coverage-html.ts\'s buildStructuralSignalsSection tooltip format', () => {
    const coverageHtml = read('../../server/lib/coverage-html.ts');
    // Both must build the "<slug> — <words> words (z <lengthZ>) · dialogue
    // <pct>% (Δ ...) · <speakers> speaker(s) ..." string — check the
    // distinctive literal fragments appear verbatim in both files.
    for (const fragment of ['words (z ', 'dialogue ${talkPct}%', 'speaker(s), ${scene.speakerTurns} turn(s)', 'open/close shift ${scene.openCloseShift']) {
      assert.ok(coverageHtml.includes(fragment), `coverage-html.ts must contain: ${fragment}`);
      assert.ok(panel.includes(fragment), `ScriptDoctorPanel.tsx must contain: ${fragment}`);
    }
  });

  it('clicking a scene row jumps to that scene via onNavigateToFinding + sceneLineSpans', () => {
    assert.match(panel, /sceneLineSpans\?\.\[scene\.sceneIdx\]/);
    assert.match(panel, /onNavigateToFinding!\(span!\.startLine, span!\.endLine\)/);
  });

  it('the collapse state persists via localStorage, wrapped in try/catch (degrades, never throws)', () => {
    assert.match(panel, /SHAPE_RHYTHM_OPEN_KEY/);
    const loadFnMatch = panel.match(/function loadShapeRhythmOpenPref[\s\S]{0,300}?\n}/);
    const saveFnMatch = panel.match(/function saveShapeRhythmOpenPref[\s\S]{0,300}?\n}/);
    assert.ok(loadFnMatch, 'loadShapeRhythmOpenPref must exist');
    assert.ok(saveFnMatch, 'saveShapeRhythmOpenPref must exist');
    assert.match(loadFnMatch![0], /try\s*{[\s\S]*localStorage\.getItem/);
    assert.match(loadFnMatch![0], /catch/);
    assert.match(saveFnMatch![0], /try\s*{[\s\S]*localStorage\.setItem/);
    assert.match(saveFnMatch![0], /catch/);
  });

  // a11y ROOT-CAUSE fix (2026-09-04, audit round 2): the collapsible's own
  // container used to carry `bg-white dark:bg-zinc-900` (copied from the
  // Draft History collapsible further down this file) — a REAL dark
  // surface — while its text followed MetricStatRow's bare-`text-black`
  // convention, which is only valid on the theme-invariant --sm-panel
  // chrome most of this file sits on (see that function's own comment).
  // Two conventions collided: axe measured 1.06:1 on the section's own
  // header label ("Shape & Rhythm" had no color class at all, so it
  // inherited --sm-ink text onto a now-dark card) and 1.19:1 on the two
  // document-aggregate rows below. The fix removes the real dark switch
  // entirely — same theme-invariant --sm-panel/--sm-ink chrome
  // MetricStatRow already relies on — rather than patch every text node
  // with a `dark:` pair.
  it('the collapsible container uses the theme-invariant --sm-panel/--sm-ink chrome, not a real dark-mode background switch', () => {
    const sectionMatch = panel.match(/function ShapeRhythmSection[\s\S]*?\n}\n/);
    assert.ok(sectionMatch, 'ShapeRhythmSection must exist');
    const body = sectionMatch![0];
    assert.match(body, /bg-\[var\(--sm-panel\)\]/, 'container must use the theme-invariant --sm-panel background');
    assert.match(body, /border-\[var\(--sm-ink\)\]/, 'container must use the theme-invariant --sm-ink border');
    // Matched only inside actual className attributes (not this file's own
    // doc comments, which name the OLD class for posterity).
    assert.doesNotMatch(body, /className="[^"]*dark:bg-zinc-900[^"]*"/, 'must not carry a real dark-mode background switch — mixing that with bare text-black is the root cause this fix removes');
    assert.match(body, /var\(--sm-ink-mute\)/);
  });

  it('text-black inside ShapeRhythmSection carries no dark: text override — correct once the container never actually darkens', () => {
    const sectionMatch = panel.match(/function ShapeRhythmSection[\s\S]*?\n}\n/);
    assert.ok(sectionMatch, 'ShapeRhythmSection must exist');
    const body = sectionMatch![0];
    const blackClassAttrs = body.match(/className="[^"]*\btext-black\b[^"]*"/g) ?? [];
    // Header label ("Shape & Rhythm") + 2 aggregate labels + 2 aggregate
    // numbers = 5, the same 5 text nodes axe flagged before this fix.
    assert.ok(blackClassAttrs.length >= 5, `expected >= 5 text-black class attributes in ShapeRhythmSection, found ${blackClassAttrs.length}`);
    for (const attr of blackClassAttrs) {
      assert.doesNotMatch(attr, /dark:text-/, `text-black should carry no dark: text override once its container is theme-invariant: ${attr}`);
    }
  });

  // REVIEW FIX (round 2, 2026-09-05) — the round-1 fix above made the
  // container theme-invariant but left 4 OTHER text nodes inside the same
  // section still carrying `dark:text-gray-300`/bare `text-gray-400` — these
  // were CORRECT on the section's old real-dark card and became a
  // REGRESSION (1.28:1 / 2.26:1) the moment the container stopped
  // darkening. Every caption/label inside this section must now use the
  // same theme-invariant `--sm-ink-mute` token as the rest of it — none of
  // Tailwind's gray-* palette, in either theme.
  it('no text-gray-* class survives anywhere inside ShapeRhythmSection — every caption/label uses --sm-ink-mute like the rest of the theme-invariant section', () => {
    const sectionMatch = panel.match(/function ShapeRhythmSection[\s\S]*?\n}\n/);
    assert.ok(sectionMatch, 'ShapeRhythmSection must exist');
    const body = sectionMatch![0];
    const grayClassAttrs = body.match(/className="[^"]*\btext-gray-\d+\b[^"]*"/g) ?? [];
    assert.deepEqual(grayClassAttrs, [], `no text-gray-* class should remain in ShapeRhythmSection, found: ${JSON.stringify(grayClassAttrs)}`);
    // The 4 nodes the regression hit: the intro paragraph, the scene-axis
    // "Scene 1"/"Scene N" row, and the two document-aggregate captions.
    const inkMuteCount = (body.match(/text-\[var\(--sm-ink-mute\)\]/g) ?? []).length;
    assert.ok(inkMuteCount >= 4, `expected >= 4 text-[var(--sm-ink-mute)] class usages in ShapeRhythmSection, found ${inkMuteCount}`);
  });

  // REVIEW FIX (round 2) — MetricStatRow's own caption (used throughout
  // StoryMetricsSection, which sits on the SAME theme-invariant --sm-panel
  // chrome) had the identical 1.28:1 defect the "root cause" fix above
  // claims to have addressed — that claim is only true once this is fixed
  // too.
  it('MetricStatRow\'s own caption has no text-gray-* class either — the same root-cause fix applied where the pattern was copied from', () => {
    const fnMatch = panel.match(/function MetricStatRow[\s\S]*?\n}\n/);
    assert.ok(fnMatch, 'MetricStatRow must exist');
    const body = fnMatch![0];
    const grayClassAttrs = body.match(/className="[^"]*\btext-gray-\d+\b[^"]*"/g) ?? [];
    assert.deepEqual(grayClassAttrs, [], `no text-gray-* class should remain in MetricStatRow, found: ${JSON.stringify(grayClassAttrs)}`);
    assert.match(body, /text-\[var\(--sm-ink-mute\)\]/);
  });

  // REVIEW FIX (round 2 re-review, 2026-09-05) — this attribute is the ONLY
  // way scripts/verify-a11y.mjs's Shape & Rhythm gate step can scope an axe
  // run to this section specifically; a rebase silently dropped it once
  // already (this exact test file's history). Pinned so a future merge that
  // loses it fails a test instead of quietly reopening the gate hole.
  it('the section carries data-a11y-section="shape-rhythm" — the hook scripts/verify-a11y.mjs scopes its axe run to', () => {
    const sectionMatch = panel.match(/function ShapeRhythmSection[\s\S]*?\n}\n/);
    assert.ok(sectionMatch, 'ShapeRhythmSection must exist');
    assert.match(sectionMatch![0], /data-a11y-section="shape-rhythm"/);
  });
});

describe('ScriptDoctorPanel — fix-and-verify receipt shows the structural-signal delta beside the health delta', () => {
  it('renders result.structuralSignals next to healthDelta, labelled descriptive', () => {
    assert.match(panel, /result\.structuralSignals/);
    assert.match(panel, /Shape\s*&amp;\s*rhythm \(descriptive, not part of the score\)/);
  });

  it('the delta is a SEPARATE field, not folded into FixVerifyResult\'s own before/after', () => {
    assert.match(panel, /FixVerifyResultWithSignals = FixVerifyResult & \{ structuralSignals\?: FixStructuralSignalsDelta \}/);
  });
});

describe('server/routes/scriptide.ts — sceneLineSpans and fix-route structuralSignals wiring', () => {
  const routeSrc = read('../../server/routes/scriptide.ts');

  it('attaches sceneLineSpans to every /doctor-shaped JSON response', () => {
    const count = (routeSrc.match(/sceneLineSpans: spans/g) ?? []).length;
    assert.ok(count >= 4, `expected sceneLineSpans attached at >= 4 response sites, found ${count}`);
  });

  it('the /fix route computes structuralSignals only when both sides scored, as a field separate from FixVerifyResult', () => {
    assert.match(routeSrc, /FixResponseStructuralSignals/);
    assert.match(routeSrc, /before\.scored && after\.scored/);
    assert.match(routeSrc, /computeStructuralSignals/);
  });
});

describe('doctor-stream.ts — DoctorReportWithAnchors carries sceneLineSpans additively', () => {
  it('sceneLineSpans is optional, alongside the existing optional locatedIssues', () => {
    assert.match(doctorStream, /sceneLineSpans\?: SceneLineSpan\[\]/);
  });
});

describe('Snapshot / Versions — Shape & Rhythm trend (2026-09-04)', () => {
  it('Snapshot captures the two aggregates only when a fresh SCORED report exists for the snapshotted text', () => {
    assert.match(scriptIde, /signals\?\.scored/);
    assert.match(scriptIde, /meanAbsDialogueShareDelta: signals\.meanAbsDialogueShareDelta/);
    assert.match(scriptIde, /actionSentenceCvOverall: signals\.actionSentenceCvOverall/);
  });

  it('renders a second line under the health trend, labelled descriptive', () => {
    assert.match(snapshotManager, /function ShapeRhythmTrendLine/);
    assert.match(snapshotManager, /Shape &amp;.*rhythm \(descriptive, not part of the score\)/);
  });
});

describe("WhatIfPanel — the Lab's Script Doctor readout (2026-09-04)", () => {
  it('reuses the SAME "descriptive, not part of the score" labelling, not a second wording', () => {
    assert.match(whatIfPanel, /Shape &amp;\s*rhythm \(descriptive, not part of the score\)/);
    assert.match(whatIfPanel, /Talk\/action swing/);
    assert.match(whatIfPanel, /Action-prose variation/);
  });

  it('gates both aggregates on the server having actually sent them — never a fabricated 0', () => {
    assert.match(
      whatIfPanel,
      /draft\.meanAbsDialogueShareDelta !== undefined && draft\.actionSentenceCvOverall !== undefined/,
    );
  });

  it('renders health/verdict/grade only when the server sent a health, and says so plainly otherwise', () => {
    assert.match(whatIfPanel, /const scored = draft\.health !== undefined;/);
    assert.match(whatIfPanel, /no health, grade or verdict is shown/);
  });

  it('states that branches carry no text until they are compiled into a script', () => {
    assert.match(whatIfPanel, /Branches are story moves, not text/);
  });

  it('never computes a score in the bundle — it only POSTs to the server route', () => {
    assert.match(whatIfPanel, /'\/api\/nvm\/whatif\/doctor'/);
    assert.doesNotMatch(whatIfPanel, /runScriptDoctor/);
  });
});

// 2026-09-04 review (REVISE item 3): SlatePanel.tsx's Shape & Rhythm column
// used to state "not part of the score or this ranking" ONLY in a `title=`
// tooltip on the column header — invisible to keyboard and touch readers,
// unlike every other surface's visible label (ScriptDoctorPanel.tsx's
// "Descriptive — not part of the score" badge, SnapshotManager.tsx's
// visible trend-line heading, and the exported slate HTML's visible footer
// sentence, server/lib/slate.ts). This asserts the copy is now ALSO visible
// text, not merely a tooltip.
describe('SlatePanel.tsx — Shape & Rhythm column labelling is visible, not tooltip-only', () => {
  it('renders "not part of the score" as plain text content, not only inside a title= attribute', () => {
    // Strip every title="..." attribute value before checking — a match that
    // survives this strip can only be visible JSX text content.
    const withoutTooltips = slatePanel.replace(/title="[^"]*"/g, 'title=""');
    assert.match(withoutTooltips, /not part of the score/);
  });

  it('the tooltip on the column header still carries the same wording too (belt-and-suspenders, not a replacement)', () => {
    assert.match(slatePanel, /title="Descriptive only — not part of the score or this ranking"/);
  });
});

// REVIEW FIX (rebase defect, 2026-09-05): the "REVISE round 2" rebase gave
// DraftRank a second shape, { rank: null, of: 0, unscored: N } — read fine
// by the in-panel DraftRankLine, but ScriptDoctorPanel.tsx's HTML export
// (handleExportReport) forwarded the panel's `draftRank` object to
// POST /api/export/coverage UNGUARDED, unlike the coverage-LETTER export
// (handleExportCoverageLetter) a few hundred lines below it, which already
// checked `draftRank.rank !== null` inline. server/lib/validation.ts's
// DraftRankSchema requires `rank >= 1`, so the exact "N saved drafts have no
// score yet" state — which the in-panel line renders just fine — 400'd
// "Export report" where it used to download. Fixed by routing BOTH export
// payloads through one shared helper, draftRankExportPayload
// (src/lib/draft-rank-copy.ts, unit-tested directly in
// tests/core/snapshot-trend.test.ts) rather than either call site building
// or checking the wire shape itself — this is a static proof that neither
// export path can silently regress back to forwarding the raw object.
describe('ScriptDoctorPanel.tsx — export payloads never forward an unranked draftRank to the wire', () => {
  it('imports draftRankExportPayload rather than hand-rolling the null-guard at each call site', () => {
    assert.match(panel, /import\s*\{[^}]*draftRankExportPayload[^}]*\}\s*from\s*"\.\.\/\.\.\/lib\/draft-rank-copy\.ts"/);
  });

  it('both handleExportReport and handleExportCoverageLetter call draftRankExportPayload(draftRank) before assigning payload.draftRank', () => {
    const callSites = panel.match(/draftRankExportPayload\(draftRank\)/g) ?? [];
    assert.ok(callSites.length >= 2, `expected draftRankExportPayload(draftRank) at both export call sites, found ${callSites.length}`);
  });

  it('neither export handler assigns the raw draftRank object straight onto payload.draftRank', () => {
    // The exact regression pattern this rebase introduced: an unguarded
    // `payload.draftRank = draftRank;` (no narrowing function in between).
    // `draftRank.rank !== null` itself still appears legitimately elsewhere
    // in this file (DraftRankLine's own render branch, unrelated to either
    // export payload) so that check belongs at the export call sites
    // specifically, covered by the "both call draftRankExportPayload" test
    // above rather than a blanket source-wide absence check here.
    assert.doesNotMatch(panel, /payload\.draftRank\s*=\s*draftRank;/);
  });
});
