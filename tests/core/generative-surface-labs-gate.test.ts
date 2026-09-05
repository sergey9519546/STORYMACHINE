// Decision #3 (2026-09-03, docs/DECISION_LOG.md; retrospective finding §11):
// the GENERATIVE surface is demoted to Labs alongside OASIS. Nothing was
// deleted — the code, the server routes, and their plumbing tests all still
// run — but with Labs OFF no control that reaches an LLM may render, and no
// request that CAN REACH A MODEL may fire from the default Doctor + Editor
// surface.
//
// That wording is deliberate, and narrower than this header used to claim
// ("no LLM-adjacent request may fire"). Since 2026-09-04 the default surface
// does POST to /api/scriptide/fix — a route tests/routes/route-capabilities.
// test.ts lists as LLM-reaching — but only in the WRITER-SUPPLIED
// `candidateFountain` shape, which returns from that route's own early branch
// before server/nvm/analyze/fix.ts is imported, so no code path leads from it
// to generateContent (asserted with a counting provider spy in
// tests/routes/scriptide-fix.test.ts, and argued in docs/DECISION_LOG.md
// Decision #3's 2026-09-04 amendment). The invariant the landing page's
// keyless claim actually depends on — the default surface sends nothing to a
// model — is unchanged; it is now a property of the request shape rather than
// of the URL, and this header says which.
//
// Two layers, matching this repo's established split (see
// tests/core/use-modal-focus-trap.test.ts's header and
// tests/core/command-palette-wiring.test.ts's): behavior that IS a pure
// function is tested as one; the React/CodeMirror wiring that feeds it has no
// jsdom harness here (no JSX transform under `node
// --experimental-strip-types`), so it is verified at the source level.
//
// The live-browser half of this claim — Labs OFF hides the controls, Labs ON
// brings them back — is asserted in scripts/verify-p2-p3-surfaces.mjs's
// "P2-generative" phase, which runs in CI. This file is the cheap, always-on
// tripwire that catches a regression before anyone boots a browser.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EditorState } from '@codemirror/state';
import { scriptDiagnostics } from '../../src/components/editor/diagnostics.ts';
import { fixPhasesField, llmReadyField } from '../../src/components/editor/fix-action.ts';

const SRC = path.resolve(import.meta.dirname, '../../src');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

// ── 1. The editor's "Fix with AI" bridge is omitted, not merely disabled ─────
describe('Live Notes — the generative half is left out entirely with Labs OFF', () => {
  // scriptDiagnostics() returns a plain CodeMirror Extension array, and
  // EditorState.create resolves it for real — so this asserts the SHIPPED
  // extension, not a description of it. If fixAction() is present, its two
  // StateFields exist in the resolved state; if it isn't, they don't.
  const hasFixFields = (generative: boolean | undefined) => {
    const state = EditorState.create({
      doc: 'INT. ROOM - DAY\n\nA line.\n',
      extensions:
        generative === undefined
          ? scriptDiagnostics()
          : scriptDiagnostics({ generative }),
    });
    return {
      phases: state.field(fixPhasesField, false) !== undefined,
      llmReady: state.field(llmReadyField, false) !== undefined,
    };
  };

  it('generative:false installs neither fixPhasesField nor llmReadyField', () => {
    const fields = hasFixFields(false);
    assert.equal(fields.phases, false, 'fixPhasesField must not exist with Labs off');
    assert.equal(
      fields.llmReady,
      false,
      'llmReadyField (the /api/ai-config probe) must not exist with Labs off',
    );
  });

  it('generative:true restores both — the gate is the flag, not deleted code', () => {
    const fields = hasFixFields(true);
    assert.equal(fields.phases, true);
    assert.equal(fields.llmReady, true);
  });

  it('defaults to generative (undefined) so existing direct callers are unchanged', () => {
    const fields = hasFixFields(undefined);
    assert.equal(fields.phases, true);
    assert.equal(fields.llmReady, true);
  });

  it('the DETERMINISTIC squiggle half survives with the generative half off', () => {
    // The decision demoted generation, not deterministic Live Notes: the
    // squiggle decorations and their hover text come from
    // /api/scriptide/diagnose and stay on the keyless front door. Building a
    // real EditorState proves it (the decoration plugin reads fixPhasesField,
    // so a throwing lookup there would blow up exactly here), and
    // generative:false must stay clearly distinct from enabled:false, which
    // switches Live Notes off altogether.
    const state = EditorState.create({
      doc: 'INT. ROOM - DAY\n\nA line.\n',
      extensions: scriptDiagnostics({ generative: false }),
    });
    assert.equal(state.doc.toString().includes('INT. ROOM - DAY'), true);
    assert.deepEqual(scriptDiagnostics({ enabled: false }), []);
    assert.notDeepEqual(scriptDiagnostics({ generative: false }), []);
  });

  it('diagnostics.ts reads fixPhasesField non-throwingly everywhere', () => {
    const source = read('components/editor/diagnostics.ts');
    // Every read must pass the `false` second argument; a bare
    // `field(fixPhasesField)` throws when fixAction() is not installed and
    // would take the deterministic squiggles down with it.
    const bareReads = source.match(/field\(fixPhasesField\)/g) ?? [];
    assert.deepEqual(bareReads, [], 'found a throwing field(fixPhasesField) read');
    assert.match(source, /field\(fixPhasesField, false\)/);
  });

  it('the hover tooltip omits the whole actions row rather than disabling the button', () => {
    const source = read('components/editor/diagnostics.ts');
    assert.match(source, /if \(generative\) \{/);
    assert.match(source, /\.\.\.\(generative \? \[fixAction\(\), fixKeymap\] : \[\]\)/);
  });
});

// ── 2. FountainEditor + ScriptIDE wiring ────────────────────────────────────
describe('ScriptIDE — every generative entry point reads the one Labs flag', () => {
  const ide = read('components/ScriptIDE.tsx');
  const editor = read('components/editor/FountainEditor.tsx');

  it('ScriptIDE imports getLabsEnabled and reads it once, on every render', () => {
    assert.match(ide, /import \{ getLabsEnabled \} from "\.\.\/lib\/feature-flags"/);
    const decls = ide.match(/const labsEnabled = getLabsEnabled\(\);/g) ?? [];
    assert.equal(decls.length, 1, 'exactly one read — a second one would drift');
  });

  it('passes generativeFixes={labsEnabled} to FountainEditor', () => {
    assert.match(ide, /generativeFixes=\{labsEnabled\}/);
  });

  it('FountainEditor defaults generativeFixes to FALSE (safe default) and rebuilds on change', () => {
    assert.match(editor, /generativeFixes = false,/);
    assert.match(editor, /scriptDiagnostics\(\{ generative: generativeFixes \}\)/);
    assert.match(editor, /\}, \[liveDiagnostics, generativeFixes\]\);/);
  });

  it('auto-analysis cannot fire with Labs off, even from a stale saved preference', () => {
    assert.match(ide, /scheduleAutoAnalysis\(autoAnalysis && labsEnabled,/);
  });

  it('the live-intent copilot (POST /api/live/intent) is gated and re-runs on the flag', () => {
    const effect = ide.slice(
      ide.indexOf('// Phase 2 MVP: Live Intent Debounce'),
      ide.indexOf('// handleScroll removed'),
    );
    assert.ok(effect.length > 0, 'live-intent effect not found');
    assert.match(effect, /if \(!labsEnabled\) return;/);
    assert.match(effect, /\}, \[scriptText, llmReady, labsEnabled\]\);/);
    // The bail-out must come before the timer is scheduled, not inside it.
    assert.ok(
      effect.indexOf('if (!labsEnabled) return;') < effect.indexOf('setTimeout'),
      'the Labs bail-out must precede scheduling, or the fetch is still armed',
    );
  });

  it('the "No AI key · analysis ok" banner only shows where a key could be used', () => {
    assert.match(ide, /\{labsEnabled && llmReady === false && !llmBannerDismissed && \(/);
  });

  it('the command palette lists auto-analysis under Labs, and only when Labs is on', () => {
    const palette = ide.slice(
      ide.indexOf('const paletteActions: PaletteAction[] = ['),
      ide.indexOf('// ── Render ──'),
    );
    assert.ok(palette.length > 0, 'palette registry not found');
    const row = palette.indexOf('id: "toggle-auto-analysis"');
    assert.notEqual(row, -1, 'auto-analysis palette row missing entirely');
    const labsGate = palette.indexOf('...(labsEnabled');
    assert.ok(
      labsGate !== -1 && labsGate < row,
      'auto-analysis row must sit inside the labsEnabled spread',
    );
    // And it must still dispatch through the SAME callback the Toolbar item
    // calls — the palette is a second entry point, never a parallel one.
    assert.match(palette.slice(row, row + 300), /run: toggleAutoAnalysis,/);
  });
});

describe('Toolbar — the auto-analysis overflow item is Labs-gated', () => {
  const toolbar = read('components/scriptide/Toolbar.tsx');
  it('wraps the Auto-analysis item in the same labsEnabled && gate as Studio/Director/Slate', () => {
    const item = toolbar.slice(
      toolbar.indexOf('Decision #3 (2026-09-03, docs/DECISION_LOG.md): auto-analysis'),
      toolbar.indexOf('label={isTypewriterSound'),
    );
    assert.ok(item.length > 0, 'auto-analysis overflow item not found');
    assert.match(item, /\{labsEnabled && \(/);
    assert.match(item, /label=\{autoAnalysis \? "Auto-analysis on" : "Auto-analysis off"\}/);
  });
});

// ── 3. Script Doctor's two generative controls ──────────────────────────────
describe('ScriptDoctorPanel — Deep read and Fix & verify are Labs-only', () => {
  const panel = read('components/scriptide/ScriptDoctorPanel.tsx');

  it('reads the flag from the shared helper, not a second mechanism', () => {
    assert.match(panel, /import \{ getLabsEnabled \} from "\.\.\/\.\.\/lib\/feature-flags\.ts"/);
    assert.match(panel, /const labsEnabled = getLabsEnabled\(\);/);
  });

  it('the effective deep-read state is the stored preference AND the flag', () => {
    // The preference persists in localStorage across a Labs toggle, so the
    // value every run/label/history stamp reads must be the AND, or a writer
    // who once ticked it under Labs keeps paying for LLM scene reads.
    assert.match(panel, /const deepReadEnabled = deepReadPref && labsEnabled;/);
    assert.match(panel, /const useDeepRead = deepReadEnabled && !isPdf;/);
  });

  it('the Deep read checkbox itself does not render with Labs off', () => {
    assert.match(panel, /\{labsEnabled && \(\(\) => \{/);
  });

  it('fixState is withheld entirely (no disabled "Fix & verify" button) with Labs off', () => {
    assert.match(
      panel,
      /const fixState: RootCauseFixState \| null = labsEnabled && reportIsComplete && hasAnchor/,
    );
  });
});

// ── 4. Settings: the five provider tabs ─────────────────────────────────────
// SettingsPanel.tsx is JSX and cannot be imported under `node
// --experimental-strip-types` (no transform in this runner), so
// visibleSettingsTabs()'s behavior is re-derived here from the file's own
// declarations — the same source-level technique
// tests/core/settings-tablist-roving.test.ts uses on this exact file. Both
// halves of the derivation (TAB_LABELS' key order and the hidden set) are
// read out of the source, so a change to either is caught.
describe('SettingsPanel — AI-provider tabs are Labs-only; Session stays reachable', () => {
  const panel = read('components/SettingsPanel.tsx');

  const tabOrder = (() => {
    const block = panel.slice(
      panel.indexOf('const TAB_LABELS: Record<Tab, string> = {'),
      panel.indexOf('const TAB_ORDER'),
    );
    return [...block.matchAll(/^\s{2}(\w+):\s+"/gm)].map((m) => m[1]);
  })();
  const generativeTabs = (() => {
    const line = panel.match(/const GENERATIVE_TABS: readonly Tab\[\] = \[([^\]]+)\]/);
    assert.ok(line, 'GENERATIVE_TABS declaration not found');
    return line[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
  })();
  const visibleSettingsTabs = (labsEnabled: boolean) =>
    labsEnabled ? tabOrder : tabOrder.filter((t) => !generativeTabs.includes(t));

  it('hides exactly the five generative provider tabs when Labs is off', () => {
    assert.deepEqual(generativeTabs, ['providers', 'llm', 'image', 'tts', 'embeddings']);
    assert.deepEqual(visibleSettingsTabs(false), ['story', 'session', 'labs']);
  });

  it('restores the full eight-tab strip when Labs is on', () => {
    assert.deepEqual(visibleSettingsTabs(true), [
      'providers',
      'llm',
      'image',
      'tts',
      'embeddings',
      'story',
      'session',
      'labs',
    ]);
  });

  it('the helper is derived from TAB_ORDER, so it can never drift from TAB_LABELS', () => {
    const helper = panel.slice(
      panel.indexOf('export function visibleSettingsTabs'),
      panel.indexOf('// ── Story-axis config'),
    );
    assert.match(helper, /TAB_ORDER/);
  });

  it('Session — the only route to Delete Everything — survives both states', () => {
    assert.ok(visibleSettingsTabs(false).includes('session'));
    assert.ok(visibleSettingsTabs(true).includes('session'));
    // And the tab body itself is still wired to the destructive control.
    assert.match(panel, /\{activeTab === "session" && <SessionTab onBeginDataWipe=\{onBeginDataWipe\} \/>\}/);
  });

  it('Labs — the only route back to the generative half — survives both states', () => {
    assert.ok(visibleSettingsTabs(false).includes('labs'));
    assert.ok(visibleSettingsTabs(true).includes('labs'));
  });

  it('Story stays visible: its axes are deterministic config, not a provider form', () => {
    assert.ok(visibleSettingsTabs(false).includes('story'));
  });

  it('the default selected tab is a tab that actually exists in each state', () => {
    assert.match(panel, /getLabsEnabled\(\) \? "providers" : "story"/);
  });

  it('turning Labs OFF from inside the panel moves off a tab that just vanished', () => {
    assert.match(
      panel,
      /if \(!enabled && GENERATIVE_TABS\.includes\(activeTab\)\) setActiveTab\("story"\);/,
    );
  });

  it('the Labs tab states, in one line, where the generative features went', () => {
    assert.match(panel, /Generative features live in Labs/);
  });
});

// ── 5. What the decision explicitly did NOT do ──────────────────────────────
describe('Decision #3 — nothing deleted, server untouched', () => {
  it('the generative client modules all still exist', () => {
    for (const rel of [
      'components/editor/fix-action.ts',
      'components/RevisionPanel.tsx',
      'components/AIPanel.tsx',
      'components/AIProviderSettings.tsx',
    ]) {
      assert.ok(fs.existsSync(path.join(SRC, rel)), `${rel} must not be deleted`);
    }
  });

  it('the /api/ai-config llmReady plumbing is untouched on both sides', () => {
    const server = fs.readFileSync(
      path.resolve(import.meta.dirname, '../../server/routes/config.ts'),
      'utf8',
    );
    assert.match(server, /llmReady/);
    // The client still reads it — the flag decides whether a CONTROL renders,
    // never whether the readiness answer is honest.
    assert.match(read('components/scriptide/ScriptDoctorPanel.tsx'), /fetch\("\/api\/ai-config"\)/);
  });

  it('the gate is the ONE existing Labs flag, not a new parallel flag', () => {
    const flags = read('lib/feature-flags.ts');
    const exported = flags.match(/export function (\w+)/g) ?? [];
    assert.deepEqual(exported, ['export function getLabsEnabled', 'export function setLabsEnabled']);
    assert.match(flags, /sm_labs_enabled/);
  });

  it('the landing page keeps its keyless promise and never mentions Labs', () => {
    const start = read('components/StartScreen.tsx');
    assert.match(
      start,
      /Keyless by default — your script stays in this deployment unless you turn on AI features yourself\./,
    );
    // The claim is now MORE true than before (nothing on the default surface
    // can reach a provider at all), and the copy must not leak the internal
    // flag name at a first-time visitor.
    const visibleCopy = start.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(visibleCopy, /Labs/);
  });
});
