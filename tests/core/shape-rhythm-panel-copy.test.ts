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

  it('dark-mode classes use the panel\'s existing design tokens/dark: variants, not bare colors', () => {
    const sectionMatch = panel.match(/function ShapeRhythmSection[\s\S]*?\n}\n/);
    assert.ok(sectionMatch, 'ShapeRhythmSection must exist');
    assert.match(sectionMatch![0], /dark:border-white\/20/);
    assert.match(sectionMatch![0], /dark:bg-zinc-900/);
    assert.match(sectionMatch![0], /var\(--sm-ink-mute\)/);
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
