// Unit coverage for src/components/editor/fix-action.ts — the fix-and-verify
// bridge behind the Live Notes squiggle's "Fix with AI" action and
// diagnostics.ts's Mod-Shift-f command. 554 lines of live ROADMAP-P2 Editor
// code that had no test of any kind before this file.
//
// NO DOM, NO NEW DEPENDENCIES, AND THE REAL MODULE. Everything asserted below
// runs against the actual exports of fix-action.ts, not a reimplementation:
//   • @codemirror/state (EditorState, StateField, StateEffect, transactions)
//     is pure JavaScript with no DOM dependency, so the two StateFields and
//     their update() rules can be driven directly.
//   • runFix()/applyFixResult() only ever touch `view.state` and
//     `view.dispatch` — never `document` — so a small object holding a real
//     EditorState stands in for EditorView (makeFakeView below). The one
//     genuinely DOM-bound part of the module, FixReceiptWidget.toDOM(), is
//     never reached: nothing here instantiates a ViewPlugin.
//   • The network is stubbed at globalThis.fetch, so the request CONTRACT is
//     asserted (it must match FixBodySchema in server/lib/validation.ts) with
//     no server and no key.
//
// PREREQUISITE, AND WHY IT IS PART OF THIS CHANGE. Importing the real module
// used to be impossible under this repo's runner. `node
// --experimental-strip-types` does no cross-usage type elision, so
// fix-action.ts's plain named imports of DecorationSet and Extension (both
// type-only exports) failed with "does not provide an export named
// 'DecorationSet'", and FixReceiptWidget's TypeScript parameter properties
// failed with "parameter property is not supported in strip-only mode".
// tests/core/editor-decorations.test.ts documents hitting the first of those
// walls and working around it by copying the logic under test into the test
// file. This change fixes the module instead — `import type` for the two
// type-only names, longhand field assignment for the constructor — so this
// file can test the shipped code rather than a copy of it. Vite and tsc erase
// both forms identically; the bundle is unchanged.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import {
  issueActionKey,
  fixAction,
  fixPhasesField,
  llmReadyField,
  SetFixPhase,
  SetLlmReady,
  runFix,
  isFixPending,
  fixPhaseFor,
  type FixTarget,
  type FixPhase,
  type FixVerifyResult,
} from '../../src/components/editor/fix-action.ts';

const DOC = [
  'INT. KITCHEN - DAY',          // line 1
  '',                            // line 2
  'SARAH stares at the letter.', // line 3
  'She does not open it.',       // line 4
  '',                            // line 5
  'SARAH',                       // line 6
  'I already know what it says.', // line 7
].join('\n');

const TARGET: FixTarget = {
  rule: 'ON_THE_NOSE_DIALOGUE',
  description: 'Sarah states her subtext outright.',
  suggestedFix: 'Let the silence carry it.',
  startLine: 6,
  endLine: 7,
};

function baseState(doc = DOC): EditorState {
  return EditorState.create({ doc, extensions: [llmReadyField, fixPhasesField] });
}

function phasesOf(state: EditorState): Map<string, FixPhase> {
  return state.field(fixPhasesField);
}

// ── issueActionKey ────────────────────────────────────────────────────────────

describe('fix-action — issueActionKey', () => {
  it('is stable for the same rule and span', () => {
    assert.equal(issueActionKey(TARGET), issueActionKey({ ...TARGET }));
  });

  it('distinguishes two different rules firing on the SAME span', () => {
    // The module's own header calls this out: `location` is a human-readable
    // restatement of the span, so (rule, startLine, endLine) is the identity.
    const other: FixTarget = { ...TARGET, rule: 'MONOLOGUE' };
    assert.notEqual(issueActionKey(TARGET), issueActionKey(other));
  });

  it('distinguishes the SAME rule firing on two different spans', () => {
    assert.notEqual(issueActionKey(TARGET), issueActionKey({ ...TARGET, startLine: 3, endLine: 4 }));
    assert.notEqual(issueActionKey(TARGET), issueActionKey({ ...TARGET, endLine: 9 }));
  });

  it('ignores the fields that are not part of the identity', () => {
    const reworded: FixTarget = { ...TARGET, description: 'totally different text', suggestedFix: undefined };
    assert.equal(issueActionKey(TARGET), issueActionKey(reworded));
  });

  it('cannot be collided by a rule name that contains the span format', () => {
    // The separator is U+241F (SYMBOL FOR UNIT SEPARATOR), not '-' or ':',
    // precisely so a rule name can never forge another key.
    const a = issueActionKey({ ...TARGET, rule: 'A', startLine: 1, endLine: 23 });
    const b = issueActionKey({ ...TARGET, rule: 'A␟1-2', startLine: 3, endLine: 0 });
    assert.notEqual(a, b);
  });
});

// ── llmReadyField ─────────────────────────────────────────────────────────────

describe('fix-action — llmReadyField (tri-state)', () => {
  it('starts null — "still checking", which is NOT the same as "not ready"', () => {
    assert.equal(baseState().field(llmReadyField), null);
  });

  it('round-trips true, false, and back to null', () => {
    let state = baseState();
    for (const value of [true, false, null] as const) {
      state = state.update({ effects: SetLlmReady.of(value) }).state;
      assert.equal(state.field(llmReadyField), value);
    }
  });

  it('survives a document edit — readiness is not line-anchored', () => {
    const ready = baseState().update({ effects: SetLlmReady.of(true) }).state;
    const edited = ready.update({ changes: { from: 0, insert: 'FADE IN.\n\n' } }).state;
    assert.equal(edited.field(llmReadyField), true);
  });
});

// ── fixPhasesField ────────────────────────────────────────────────────────────

describe('fix-action — fixPhasesField (wipe-on-edit, with one deliberate exception)', () => {
  const key = issueActionKey(TARGET);
  const pending: FixPhase = { status: 'pending', span: { startLine: 6, endLine: 7 } };

  it('starts empty', () => {
    assert.equal(phasesOf(baseState()).size, 0);
  });

  it('sets a phase and deletes it again with phase:null', () => {
    let state = baseState().update({ effects: SetFixPhase.of({ key, phase: pending }) }).state;
    assert.deepEqual(phasesOf(state).get(key), pending);

    state = state.update({ effects: SetFixPhase.of({ key, phase: null }) }).state;
    assert.equal(phasesOf(state).has(key), false);
  });

  it('wipes every phase on any document change', () => {
    // Line-anchored state cannot survive an edit: the span it points at may
    // no longer be the text that was diagnosed.
    const seeded = baseState().update({ effects: SetFixPhase.of({ key, phase: pending }) }).state;
    assert.equal(phasesOf(seeded).size, 1);

    const edited = seeded.update({ changes: { from: 0, insert: 'FADE IN.\n\n' } }).state;
    assert.equal(phasesOf(edited).size, 0);
  });

  it('keeps a phase set in the SAME transaction as the edit — the exception that lets a receipt show', () => {
    // applyFixResult dispatches the splice and the 'done' phase together; if
    // the wipe won, the receipt for a just-applied fix would erase itself.
    const seeded = baseState().update({ effects: SetFixPhase.of({ key, phase: pending }) }).state;
    const done: FixPhase = {
      status: 'done',
      result: { usedLLM: false },
      applied: false,
      stale: false,
      span: { startLine: 6, endLine: 7 },
    };
    const applied = seeded.update({
      changes: { from: 0, insert: 'FADE IN.\n\n' },
      effects: SetFixPhase.of({ key, phase: done }),
    }).state;

    assert.equal(phasesOf(applied).size, 1, 'only the same-transaction phase survives');
    assert.deepEqual(phasesOf(applied).get(key), done);
  });

  it('preserves phases across a transaction that does not change the document', () => {
    const seeded = baseState().update({ effects: SetFixPhase.of({ key, phase: pending }) }).state;
    const moved = seeded.update({ selection: { anchor: 4 } }).state;
    assert.deepEqual(phasesOf(moved).get(key), pending);
  });

  it('is copy-on-write — writing a phase never mutates the previous state\'s map', () => {
    const before = baseState();
    const beforeMap = phasesOf(before);
    const after = before.update({ effects: SetFixPhase.of({ key, phase: pending }) }).state;

    assert.equal(beforeMap.size, 0, 'the earlier state must still read as empty');
    assert.notEqual(phasesOf(after), beforeMap);
    assert.equal(phasesOf(after).size, 1);
  });

  it('applies several phase effects carried in one transaction', () => {
    const otherKey = issueActionKey({ ...TARGET, rule: 'MONOLOGUE' });
    const state = baseState().update({
      effects: [
        SetFixPhase.of({ key, phase: pending }),
        SetFixPhase.of({ key: otherKey, phase: pending }),
      ],
    }).state;
    assert.deepEqual([...phasesOf(state).keys()].sort(), [key, otherKey].sort());
  });
});

// ── fixAction() extension factory ─────────────────────────────────────────────

describe('fix-action — fixAction() extension', () => {
  it('wires both state fields, so a consumer that includes only fixAction() can read them', () => {
    // diagnostics.ts's scriptDiagnostics() includes fixAction() and nothing
    // else from this module; dropping a field from the returned array would
    // fail at runtime in the editor, not at compile time.
    const state = EditorState.create({ doc: DOC, extensions: fixAction() });
    assert.equal(state.field(llmReadyField), null);
    assert.equal(state.field(fixPhasesField).size, 0);
  });
});

// ── fixPhaseFor / isFixPending ────────────────────────────────────────────────

describe('fix-action — fixPhaseFor / isFixPending', () => {
  it('fixPhaseFor looks the phase up by the target\'s identity', () => {
    const key = issueActionKey(TARGET);
    const pending: FixPhase = { status: 'pending', span: { startLine: 6, endLine: 7 } };
    const state = baseState().update({ effects: SetFixPhase.of({ key, phase: pending }) }).state;
    const view = { state } as unknown as EditorView;

    assert.deepEqual(fixPhaseFor(view, TARGET), pending);
    assert.equal(fixPhaseFor(view, { ...TARGET, rule: 'MONOLOGUE' }), undefined);
  });

  it('isFixPending is false with no controller, and tracks pendingKey when there is one', () => {
    const noPlugin = { plugin: () => undefined } as unknown as EditorView;
    assert.equal(isFixPending(noPlugin), false);

    const idle = { plugin: () => ({ pendingKey: null }) } as unknown as EditorView;
    assert.equal(isFixPending(idle), false);

    const busy = { plugin: () => ({ pendingKey: 'ANY_RULE␟1-2' }) } as unknown as EditorView;
    assert.equal(isFixPending(busy), true);
  });
});

// ── runFix — the request/response lifecycle ───────────────────────────────────

interface FakeCtrl { abortCtrl: AbortController | null; seq: number; pendingKey: string | null }

interface FakeView {
  view: EditorView;
  ctrl: FakeCtrl;
  /** Every dispatch spec runFix/applyFixResult produced, in order. */
  dispatches: Array<{ changes?: unknown; userEvent?: string }>;
  doc(): string;
  phases(): Map<string, FixPhase>;
  /** Simulate the writer typing while a request is in flight. Deliberately
   *  does NOT bump ctrl.seq — that is what FixControllerPlugin.update() would
   *  do in a real editor, and its absence is exactly the case applyFixResult's
   *  `stale` guard exists to catch. */
  editDoc(insert: string): void;
}

function makeFakeView(doc = DOC): FakeView {
  let state = baseState(doc);
  const ctrl: FakeCtrl = { abortCtrl: null, seq: 0, pendingKey: null };
  const dispatches: Array<{ changes?: unknown; userEvent?: string }> = [];
  const view = {
    get state() { return state; },
    plugin: () => ctrl,
    dispatch(spec: Parameters<EditorState['update']>[0]) {
      dispatches.push(spec as { changes?: unknown; userEvent?: string });
      state = state.update(spec).state;
    },
  };
  return {
    view: view as unknown as EditorView,
    ctrl,
    dispatches,
    doc: () => state.doc.toString(),
    phases: () => state.field(fixPhasesField),
    editDoc(insert: string) { state = state.update({ changes: { from: 0, insert } }).state; },
  };
}

/** Lets the promise chain inside runFix settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
}

describe('fix-action — runFix', () => {
  const key = issueActionKey(TARGET);
  let realFetch: typeof globalThis.fetch;
  let calls: Array<{ url: string; body: Record<string, unknown> }>;

  beforeEach(() => {
    realFetch = globalThis.fetch;
    calls = [];
  });
  afterEach(() => { globalThis.fetch = realFetch; });

  /** Installs a fetch stub. `respond` receives the parsed request body and
   *  returns the minimal Response surface requestFix() actually consumes
   *  (.ok, .status, .json()). */
  function stubFetch(respond: (body: Record<string, unknown>) => {
    ok: boolean; status: number; json: () => Promise<unknown>;
  }): void {
    globalThis.fetch = (async (url: string, init?: { body?: string }) => {
      const body = JSON.parse(init?.body ?? '{}') as Record<string, unknown>;
      calls.push({ url, body });
      return respond(body);
    }) as unknown as typeof globalThis.fetch;
  }

  function okWith(result: FixVerifyResult) {
    return () => ({ ok: true, status: 200, json: async () => result });
  }

  it('shows a pending phase and claims the single-flight slot before the request settles', () => {
    const f = makeFakeView();
    stubFetch(okWith({ usedLLM: false }));

    runFix(f.view, TARGET);

    assert.deepEqual(f.phases().get(key), { status: 'pending', span: { startLine: 6, endLine: 7 } });
    assert.equal(f.ctrl.pendingKey, key, 'the slot must be taken synchronously, before any await');
    assert.equal(isFixPending(f.view), true);
  });

  it('sends exactly the body FixBodySchema accepts, with the fields capped', async () => {
    const f = makeFakeView();
    stubFetch(okWith({ usedLLM: false }));

    runFix(f.view, {
      rule: 'R'.repeat(200),
      description: 'D'.repeat(900),
      suggestedFix: 'S'.repeat(900),
      startLine: 6,
      endLine: 7,
    });
    await settle();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/scriptide/fix');
    const body = calls[0].body as {
      fountain: string;
      span: { startLine: number; endLine: number };
      issues: Array<{ rule: string; description: string; suggestedFix?: string }>;
    };
    assert.deepEqual(Object.keys(body).sort(), ['fountain', 'issues', 'span']);
    assert.equal(body.fountain, DOC, 'the WHOLE document goes up; the span scopes the fix');
    assert.deepEqual(body.span, { startLine: 6, endLine: 7 });
    assert.equal(body.issues.length, 1, 'FixBodySchema allows 1-10; this action always sends its own one');
    assert.equal(body.issues[0].rule.length, 80);
    assert.equal(body.issues[0].description.length, 500);
    assert.equal(body.issues[0].suggestedFix?.length, 500);
  });

  it('omits suggestedFix entirely when the diagnostic has none', async () => {
    const f = makeFakeView();
    stubFetch(okWith({ usedLLM: false }));

    runFix(f.view, { ...TARGET, suggestedFix: undefined });
    await settle();

    assert.deepEqual(Object.keys(calls[0].body.issues as object), ['0']);
    const issue = (calls[0].body.issues as Array<Record<string, unknown>>)[0];
    assert.ok(!('suggestedFix' in issue), 'an undefined suggestedFix must not be sent as a key at all');
  });

  it('splices an accepted rewrite into the document as one undoable transaction', async () => {
    const f = makeFakeView();
    stubFetch(okWith({
      usedLLM: true,
      spanReplacement: 'SARAH\nShe says nothing at all.',
      span: { startLine: 6, endLine: 7 },
      before: { health: 61 },
      after: { health: 74 },
      cleared: [], introduced: [],
    }));

    runFix(f.view, TARGET);
    await settle();

    assert.match(f.doc(), /She says nothing at all\.$/);
    assert.ok(!f.doc().includes('I already know what it says.'), 'the flagged lines must be replaced');
    assert.ok(f.doc().startsWith('INT. KITCHEN - DAY'), 'text outside the span must be untouched');

    const phase = f.phases().get(key);
    assert.equal(phase?.status, 'done');
    assert.equal((phase as Extract<FixPhase, { status: 'done' }>).applied, true);
    assert.equal((phase as Extract<FixPhase, { status: 'done' }>).stale, false);

    // The splice must be a normal edit — that is what makes it undoable by the
    // editor's existing history() extension rather than a silent doc swap.
    const spliced = f.dispatches.find((d) => d.changes !== undefined);
    assert.ok(spliced, 'a changes-bearing transaction must have been dispatched');
    assert.equal(spliced.userEvent, 'input.fix-ai');
    assert.equal(f.ctrl.pendingKey, null, 'the single-flight slot must be released');
  });

  it('records a keyless/no-candidate result without touching the document', async () => {
    const f = makeFakeView();
    stubFetch(okWith({ usedLLM: false, note: 'No AI key configured — verified only.' }));

    runFix(f.view, TARGET);
    await settle();

    assert.equal(f.doc(), DOC, 'a result with no candidate must never edit the draft');
    const phase = f.phases().get(key) as Extract<FixPhase, { status: 'done' }>;
    assert.equal(phase.status, 'done');
    assert.equal(phase.applied, false);
    assert.equal(phase.stale, false);
    assert.equal(phase.result.note, 'No AI key configured — verified only.');
    assert.equal(f.dispatches.some((d) => d.changes !== undefined), false);
  });

  it('refuses to splice a candidate computed against text the writer has since changed', async () => {
    const f = makeFakeView();
    stubFetch(() => {
      // The writer types while the request is in flight.
      f.editDoc('FADE IN.\n\n');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          usedLLM: true,
          spanReplacement: 'SARAH\nShe says nothing at all.',
          span: { startLine: 6, endLine: 7 },
          before: { health: 61 }, after: { health: 74 },
        }),
      };
    });

    runFix(f.view, TARGET);
    await settle();

    assert.ok(f.doc().startsWith('FADE IN.'), 'the writer\'s own edit stands');
    assert.ok(f.doc().includes('I already know what it says.'), 'the stale rewrite must NOT be spliced in');
    const phase = f.phases().get(key) as Extract<FixPhase, { status: 'done' }>;
    assert.equal(phase.applied, false);
    assert.equal(phase.stale, true);
  });

  it('surfaces the server\'s own error message on a non-2xx response', async () => {
    const f = makeFakeView();
    stubFetch(() => ({ ok: false, status: 400, json: async () => ({ error: 'span: endLine must be >= startLine' }) }));

    runFix(f.view, TARGET);
    await settle();

    const phase = f.phases().get(key) as Extract<FixPhase, { status: 'error' }>;
    assert.equal(phase.status, 'error');
    assert.equal(phase.message, 'span: endLine must be >= startLine');
    assert.equal(f.doc(), DOC);
    assert.equal(f.ctrl.pendingKey, null, 'a failed request must still release the single-flight slot');
  });

  it('translates a 429 into rate-limit language instead of a bare status code', async () => {
    const f = makeFakeView();
    // aiLimiter (20/min) guards POST /api/scriptide/fix; "Fix request failed
    // (429)" would read as a bug rather than as "wait a moment".
    stubFetch(() => ({ ok: false, status: 429, json: async () => ({ error: 'Too many AI requests, please slow down.' }) }));

    runFix(f.view, TARGET);
    await settle();

    const phase = f.phases().get(key) as Extract<FixPhase, { status: 'error' }>;
    assert.equal(phase.status, 'error');
    assert.match(phase.message, /wait a moment and try again/);
  });

  it('falls back to a status-bearing message when the error body is unreadable', async () => {
    const f = makeFakeView();
    stubFetch(() => ({ ok: false, status: 500, json: async () => { throw new Error('not JSON'); } }));

    runFix(f.view, TARGET);
    await settle();

    const phase = f.phases().get(key) as Extract<FixPhase, { status: 'error' }>;
    assert.equal(phase.message, 'Fix request failed (500).');
  });

  it('is single-flight — a second fix while one is pending is a no-op', async () => {
    const f = makeFakeView();
    stubFetch(okWith({ usedLLM: false }));

    runFix(f.view, TARGET);
    const dispatchesAfterFirst = f.dispatches.length;

    runFix(f.view, { ...TARGET, rule: 'MONOLOGUE' });
    assert.equal(f.dispatches.length, dispatchesAfterFirst, 'the second call must not even show a pending phase');
    assert.equal(f.phases().has(issueActionKey({ ...TARGET, rule: 'MONOLOGUE' })), false);

    await settle();
    assert.equal(calls.length, 1, 'only one request may be in flight per editor');
  });

  it('discards a response that a newer generation has superseded', async () => {
    const f = makeFakeView();
    stubFetch(() => {
      // What FixControllerPlugin.update() does when the writer edits: bump the
      // generation so a late response is dropped rather than applied.
      f.ctrl.seq += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          usedLLM: true,
          spanReplacement: 'SARAH\nShe says nothing at all.',
          span: { startLine: 6, endLine: 7 },
          before: { health: 61 }, after: { health: 74 },
        }),
      };
    });

    runFix(f.view, TARGET);
    await settle();

    assert.equal(f.doc(), DOC, 'a superseded response must not edit the document');
    assert.deepEqual(
      f.phases().get(key),
      { status: 'pending', span: { startLine: 6, endLine: 7 } },
      'the phase must stay as it was — no done, no error',
    );
    assert.equal(f.ctrl.pendingKey, key, 'the superseded branch deliberately leaves the slot alone');
  });

  it('does nothing at all when the editor has no fix controller', () => {
    const f = makeFakeView();
    stubFetch(okWith({ usedLLM: false }));
    const noPlugin = { state: f.view.state, plugin: () => undefined, dispatch: () => { throw new Error('must not dispatch'); } } as unknown as EditorView;

    runFix(noPlugin, TARGET);
    assert.equal(calls.length, 0);
  });
});
