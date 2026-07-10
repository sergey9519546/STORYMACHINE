// Fix-and-verify bridge for Live Notes squiggles (Run 17-D) — wires a single
// diagnostic's "Fix with AI" action to the server's span-scoped fix-and-verify
// endpoint (POST /api/scriptide/fix; see server/routes/scriptide.ts's route
// comment and server/nvm/analyze/fix.ts's module header for the full
// contract). diagnostics.ts owns squiggle rendering and the hover tooltip;
// this module owns the ACTION — the network contract, the pending/result
// lifecycle, applying an accepted rewrite as a normal undoable CodeMirror
// transaction, and rendering the inline verify receipt.
//
// State model (mirrors diagnostics.ts's StateField/StateEffect discipline):
//   • llmReadyField  — tri-state (null = still checking/unknown, true/false =
//                       the last /api/ai-config answer). Fetched once per
//                       extension instantiation — same "each panel fetches
//                       its own copy" pattern ScriptDoctorPanel/InterviewPanel
//                       already use, rather than a shared global store.
//   • fixPhasesField — Map<key, FixPhase> keyed by issueActionKey(), one
//                       entry per diagnostic currently pending/resolved.
//                       Wiped on ANY doc change EXCEPT an effect carried in
//                       the SAME transaction (see the field's update() below)
//                       — the same "any edit invalidates" rule
//                       diagnosticsField applies to squiggles applies here to
//                       line-anchored fix state, with one deliberate
//                       exception: applying an accepted fix is itself a
//                       doc-changing transaction that carries its own
//                       'done' effect, which must survive its own wipe so the
//                       receipt shows immediately.
//   • fixController  — a ViewPlugin instance (not state) holding the
//                       in-flight AbortController + a generation counter,
//                       exactly like diagnostics.ts's diagnosticsTrigger.
//                       Only one fix runs at a time per editor — the same
//                       single-flight discipline ScriptDoctorPanel's
//                       fixPendingId already enforces for this same endpoint.
//
// Contract fields (validated server-side by FixBodySchema, server/lib/
// validation.ts — read there, not guessed): POST body is exactly
// { fountain: string, span: { startLine, endLine }, issues: [{ rule,
// description, suggestedFix? }] } (1-10 issues). Response is FixVerifyResult
// (server/nvm/analyze/types.ts) — duplicated below rather than imported, same
// client/server boundary rule diagnostics.ts's header documents.

import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { StateField, StateEffect, Extension } from '@codemirror/state';

// ── Contract types — kept in sync with server/nvm/analyze/types.ts's
// FixVerifyResult and server/nvm/revision/passes/types.ts's RevisionIssue ──
export interface FixDeltaIssue {
  location: string;
  rule: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix?: string;
  pass: string;
}

export interface FixVerifyResult {
  usedLLM: boolean;
  note?: string;
  candidateFountain?: string;
  spanReplacement?: string;
  span?: { startLine: number; endLine: number };
  before?: { health: number };
  after?: { health: number };
  cleared?: FixDeltaIssue[];
  introduced?: FixDeltaIssue[];
}

/** The subset of diagnostics.ts's LocatedIssue this module needs, flattened.
 *  Named locally so this file makes no assumption about diagnostics.ts's
 *  internal (nested `issue`) shape — the caller builds this small object
 *  literal from a LocatedIssue's `issue` + span fields at the call site. */
export interface FixTarget {
  rule: string;
  description: string;
  suggestedFix?: string;
  startLine: number;
  endLine: number;
}

/** Stable per-diagnostic key for fixPhasesField / pendingKey tracking. Keyed
 *  by rule + span rather than rule + location string: `location` is a
 *  human-readable label (e.g. "Lines 40-42") that just restates
 *  startLine/endLine, and two different rules can legitimately fire on the
 *  same span, so (rule, startLine, endLine) is the precise identity of "this
 *  squiggle's fix action." */
export function issueActionKey(target: FixTarget): string {
  return `${target.rule}␟${target.startLine}-${target.endLine}`;
}

/** One diagnostic's fix-and-verify request/result lifecycle. Always carries
 *  `span` so the receipt widget knows where to anchor regardless of phase. */
export type FixPhase =
  | { status: 'pending'; span: { startLine: number; endLine: number } }
  | { status: 'error'; message: string; span: { startLine: number; endLine: number } }
  | {
      status: 'done';
      result: FixVerifyResult;
      /** Whether the candidate was actually spliced into the live document —
       *  false for a keyless/rejected result (no candidate at all) or a
       *  candidate that arrived after the document changed underneath it
       *  (see `stale`). */
      applied: boolean;
      /** The document changed while this fix was in flight, so its span was
       *  never re-verified against what's on screen now — never blindly
       *  splice a rewrite computed against text that no longer exists. */
      stale: boolean;
      span: { startLine: number; endLine: number };
    };

// ── Network calls ────────────────────────────────────────────────────────────
// Plain fetch(), matching diagnostics.ts's fetchDiagnosis: the app's session
// header is injected globally by src/main.tsx's fetch monkey-patch (see
// src/lib/session.ts's header comment), so no call site here needs to opt in.

/** GET /api/ai-config — llmReady ORs the two independent key sources
 *  server-side (env GEMINI_API_KEY and the multi-provider config); this
 *  reads the flag only, never guessing at which source is live. Returns null
 *  (treated as "unknown, don't hard-disable yet") on any network failure or
 *  malformed response, rather than throwing — this is a best-effort
 *  affordance check, not a gate the rest of the editor depends on. */
async function fetchAiConfigReady(): Promise<boolean | null> {
  try {
    const res = await fetch('/api/ai-config');
    if (!res.ok) return null;
    const data = (await res.json()) as { llmReady?: boolean };
    return typeof data.llmReady === 'boolean' ? data.llmReady : null;
  } catch {
    return null;
  }
}

/** POST /api/scriptide/fix. Throws with a human-readable message on a
 *  non-2xx response — 429 (aiLimiter) gets its own clear message rather than
 *  a generic "Fix request failed (429)". */
async function requestFix(params: {
  fountain: string;
  span: { startLine: number; endLine: number };
  issues: Array<{ rule: string; description: string; suggestedFix?: string }>;
  signal: AbortSignal;
}): Promise<FixVerifyResult> {
  const res = await fetch('/api/scriptide/fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fountain: params.fountain,
      span: params.span,
      issues: params.issues,
    }),
    signal: params.signal,
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Too many AI requests right now — wait a moment and try again.');
    }
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Fix request failed (${res.status}).`);
  }
  return res.json() as Promise<FixVerifyResult>;
}

// ── llmReady state ────────────────────────────────────────────────────────────
export const SetLlmReady = StateEffect.define<boolean | null>();

export const llmReadyField = StateField.define<boolean | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(SetLlmReady)) return e.value;
    return value;
  },
});

const llmReadyFetcher = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      fetchAiConfigReady().then((ready) => {
        view.dispatch({ effects: SetLlmReady.of(ready) });
      });
    }
  },
);

// ── Fix phase state ──────────────────────────────────────────────────────────
export const SetFixPhase = StateEffect.define<{ key: string; phase: FixPhase | null }>();

export const fixPhasesField = StateField.define<Map<string, FixPhase>>({
  create: () => new Map(),
  update(value, tr) {
    // Any edit invalidates line-anchored fix state — the same rule
    // diagnosticsField (diagnostics.ts) applies to squiggles — EXCEPT an
    // effect carried in THIS SAME transaction survives the wipe. That
    // exception is what lets applyFixResult's own dispatch (a doc-changing
    // transaction that also sets the just-landed 'done' phase) show its
    // receipt immediately instead of erasing itself.
    let next = tr.docChanged ? new Map<string, FixPhase>() : value;
    for (const e of tr.effects) {
      if (!e.is(SetFixPhase)) continue;
      if (next === value) next = new Map(value);
      if (e.value.phase === null) next.delete(e.value.key);
      else next.set(e.value.key, e.value.phase);
    }
    return next;
  },
});

// ── Controller — one in-flight fix at a time, per editor ────────────────────
class FixControllerPlugin {
  abortCtrl: AbortController | null = null;
  seq = 0;
  pendingKey: string | null = null;

  update(update: ViewUpdate) {
    // A newer edit invalidates any in-flight request's span — abort it and
    // bump the generation so a late-arriving response is discarded rather
    // than applied against a document it no longer describes.
    if (update.docChanged) {
      this.seq++;
      this.abortCtrl?.abort();
      this.abortCtrl = null;
      this.pendingKey = null;
    }
  }

  destroy() {
    this.abortCtrl?.abort();
  }
}

const fixController = ViewPlugin.fromClass(FixControllerPlugin);

/** Applies a landed FixVerifyResult: splices the accepted rewrite into the
 *  live document as one ordinary transaction (undoable via the editor's
 *  existing history() extension — never a silent full-document swap), or, if
 *  there's no candidate (keyless/rejected) or the document has since changed
 *  underneath the request, records the phase without touching the document
 *  at all. */
function applyFixResult(
  view: EditorView,
  key: string,
  span: { startLine: number; endLine: number },
  requestedFountain: string,
  result: FixVerifyResult,
) {
  const currentFountain = view.state.doc.toString();
  const stale = currentFountain !== requestedFountain;

  const hasCandidate =
    result.usedLLM &&
    typeof result.spanReplacement === 'string' &&
    !!result.span;

  if (!hasCandidate || stale) {
    view.dispatch({
      effects: SetFixPhase.of({
        key,
        phase: { status: 'done', result, applied: false, stale, span },
      }),
    });
    return;
  }

  const { doc } = view.state;
  const from = doc.line(Math.min(span.startLine, doc.lines)).from;
  const to = doc.line(Math.min(span.endLine, doc.lines)).to;

  view.dispatch({
    changes: { from, to, insert: result.spanReplacement as string },
    effects: SetFixPhase.of({ key, phase: { status: 'done', result, applied: true, stale: false, span } }),
    userEvent: 'input.fix-ai',
  });
}

/** Entry point for both the tooltip's "Fix with AI" button and the keyboard
 *  shortcut (diagnostics.ts's fixCurrentLine command): fires the request for
 *  `target`, showing a pending phase immediately and, on settlement, either
 *  applying the accepted rewrite or recording why nothing was applied. No-ops
 *  if another fix is already in flight on this editor (single-flight, same
 *  as ScriptDoctorPanel's fixPendingId) — callers should disable their
 *  affordance while `isFixPending(view)` is true rather than rely on this
 *  guard alone. */
export function runFix(view: EditorView, target: FixTarget): void {
  const ctrl = view.plugin(fixController);
  if (!ctrl || ctrl.pendingKey) return;

  const key = issueActionKey(target);
  const span = { startLine: target.startLine, endLine: target.endLine };
  const fountain = view.state.doc.toString();

  ctrl.abortCtrl?.abort();
  const controller = new AbortController();
  ctrl.abortCtrl = controller;
  ctrl.pendingKey = key;
  const mySeq = ++ctrl.seq;

  view.dispatch({ effects: SetFixPhase.of({ key, phase: { status: 'pending', span } }) });

  const issue = {
    rule: target.rule.slice(0, 80),
    description: target.description.slice(0, 500),
    ...(target.suggestedFix ? { suggestedFix: target.suggestedFix.slice(0, 500) } : {}),
  };

  requestFix({ fountain, span, issues: [issue], signal: controller.signal })
    .then((result) => {
      if (controller.signal.aborted || mySeq !== ctrl.seq) return; // superseded
      ctrl.pendingKey = null;
      applyFixResult(view, key, span, fountain, result);
    })
    .catch((err: unknown) => {
      if (controller.signal.aborted || mySeq !== ctrl.seq) return; // superseded
      ctrl.pendingKey = null;
      const message = err instanceof Error ? err.message : 'Fix request failed.';
      view.dispatch({ effects: SetFixPhase.of({ key, phase: { status: 'error', message, span } }) });
    });
}

/** Whether ANY fix is currently in flight on this editor — used by
 *  diagnostics.ts to disable other "Fix with AI" affordances while one is
 *  running, matching ScriptDoctorPanel's single-flight UX. */
export function isFixPending(view: EditorView): boolean {
  return view.plugin(fixController)?.pendingKey != null;
}

export function fixPhaseFor(view: EditorView, target: FixTarget): FixPhase | undefined {
  return view.state.field(fixPhasesField).get(issueActionKey(target));
}

function dismissFix(view: EditorView, key: string): void {
  view.dispatch({ effects: SetFixPhase.of({ key, phase: null }) });
}

// ── Inline receipt widget ─────────────────────────────────────────────────────
// Rendered as a block widget directly below the fixed line(s) — deliberately
// NOT confined to the hover tooltip (which closes on mouse-away): this is the
// durable "small inline confirmation" the task asks for, visible regardless
// of hover state, so a writer who triggered a fix via keyboard and moved on
// still sees what happened.

function healthArrow(before: number, after: number): string {
  if (after > before) return `${before} → ${after} ▲`;
  if (after < before) return `${before} → ${after} ▼`;
  return `${before} → ${after}`;
}

class FixReceiptWidget extends WidgetType {
  constructor(readonly key: string, readonly phase: FixPhase) {
    super();
  }

  eq(other: FixReceiptWidget): boolean {
    return other.key === this.key && other.phase === this.phase;
  }

  toDOM(view: EditorView): HTMLElement {
    const root = document.createElement('div');
    root.className = 'cm-fix-receipt';

    const dismiss = document.createElement('button');
    dismiss.className = 'cm-fix-receipt-dismiss';
    dismiss.type = 'button';
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.textContent = '×';
    dismiss.onclick = () => dismissFix(view, this.key);

    if (this.phase.status === 'pending') {
      const label = document.createElement('span');
      label.className = 'cm-fix-receipt-pending';
      label.textContent = 'Fixing & verifying…';
      root.append(label);
      return root; // no dismiss button — nothing to discard mid-flight
    }

    if (this.phase.status === 'error') {
      const label = document.createElement('span');
      label.className = 'cm-fix-receipt-error';
      label.textContent = this.phase.message;
      root.append(label, dismiss);
      return root;
    }

    // status === 'done'
    const { result, applied, stale } = this.phase;
    const hasCandidate =
      result.usedLLM && typeof result.spanReplacement === 'string' && !!result.before && !!result.after;

    if (stale) {
      const label = document.createElement('span');
      label.className = 'cm-fix-receipt-error';
      label.textContent =
        'The script changed while this fix was in flight — it was not applied. Re-check Live Notes and try again.';
      root.append(label, dismiss);
      return root;
    }

    if (!hasCandidate) {
      const label = document.createElement('span');
      label.className = 'cm-fix-receipt-note';
      label.textContent = result.note ?? 'No fix was produced for this diagnostic.';
      root.append(label, dismiss);
      return root;
    }

    const head = document.createElement('div');
    head.className = 'cm-fix-receipt-head';
    const status = document.createElement('span');
    status.className = 'cm-fix-receipt-status';
    status.textContent = applied ? 'Fix applied' : 'Fix verified';
    const health = document.createElement('span');
    health.className = 'cm-fix-receipt-health';
    health.textContent = `Health ${healthArrow(result.before!.health, result.after!.health)}`;
    head.append(status, health, dismiss);
    root.append(head);

    // Cleared vs introduced — deliberately equal DOM structure and prominence
    // (same heading weight, same list styling) so a regression can never end
    // up visually buried relative to a win. Honesty over cheerfulness.
    const cleared = result.cleared ?? [];
    const introduced = result.introduced ?? [];
    const deltas = document.createElement('div');
    deltas.className = 'cm-fix-receipt-deltas';
    deltas.append(
      renderDeltaList('cleared', cleared, 'No issues cleared.'),
      renderDeltaList('introduced', introduced, 'No issues introduced.'),
    );
    root.append(deltas);

    return root;
  }

  ignoreEvent(): boolean {
    return false; // let clicks on the dismiss button (and any future control) through
  }
}

function renderDeltaList(tone: 'cleared' | 'introduced', items: FixDeltaIssue[], emptyLabel: string): HTMLElement {
  const section = document.createElement('div');
  section.className = `cm-fix-receipt-delta cm-fix-receipt-delta-${tone}`;

  const heading = document.createElement('div');
  heading.className = 'cm-fix-receipt-delta-heading';
  heading.textContent = `${tone === 'cleared' ? 'Cleared' : 'Introduced'} (${items.length})`;
  section.append(heading);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'cm-fix-receipt-delta-empty';
    empty.textContent = emptyLabel;
    section.append(empty);
    return section;
  }

  const list = document.createElement('ul');
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = `${item.rule.replace(/_/g, ' ')} — ${item.description}`;
    list.append(li);
  }
  section.append(list);
  return section;
}

function buildReceiptDecorations(state: { field<T>(f: StateField<T>): T; doc: { lines: number; line(n: number): { to: number } } }): DecorationSet {
  const phases = state.field(fixPhasesField);
  if (phases.size === 0) return Decoration.none;

  const ranges: Array<{ pos: number; deco: Decoration }> = [];
  for (const [key, phase] of phases) {
    const endLine = Math.min(phase.span.endLine, state.doc.lines);
    if (endLine < 1) continue;
    const pos = state.doc.line(endLine).to;
    ranges.push({
      pos,
      deco: Decoration.widget({ widget: new FixReceiptWidget(key, phase), side: 1, block: true }),
    });
  }
  ranges.sort((a, b) => a.pos - b.pos);
  return Decoration.set(ranges.map((r) => r.deco.range(r.pos)));
}

const fixReceiptPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildReceiptDecorations(view.state);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.state.field(fixPhasesField) !== update.startState.field(fixPhasesField)
      ) {
        this.decorations = buildReceiptDecorations(update.state);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

// ── Theme ─────────────────────────────────────────────────────────────────────
const fixReceiptTheme = EditorView.baseTheme({
  '.cm-fix-receipt': {
    display: 'block',
    margin: '2px 0 6px 0',
    padding: '6px 8px',
    background: '#fafafa',
    border: '1px dashed #a1a1aa',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: '11px',
    lineHeight: '1.5',
  },
  '.dark & .cm-fix-receipt': { background: '#1f1f23', borderColor: '#52525b' },
  '.cm-fix-receipt-pending': { color: '#6b7280', fontStyle: 'italic' },
  '.cm-fix-receipt-error': { color: '#dc2626', fontWeight: '700' },
  '.dark & .cm-fix-receipt-error': { color: '#f87171' },
  '.cm-fix-receipt-note': { color: '#6b7280', fontStyle: 'italic' },
  '.cm-fix-receipt-head': { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  '.cm-fix-receipt-status': { fontWeight: '700', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' },
  '.cm-fix-receipt-health': { color: '#3f3f46' },
  '.dark & .cm-fix-receipt-health': { color: '#d4d4d8' },
  '.cm-fix-receipt-dismiss': {
    marginLeft: 'auto',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    lineHeight: '1',
    color: '#6b7280',
    padding: '0 2px',
  },
  '.cm-fix-receipt-deltas': { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  '.cm-fix-receipt-delta': { minWidth: '160px', flex: '1 1 45%' },
  '.cm-fix-receipt-delta-heading': { fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' },
  '.cm-fix-receipt-delta-cleared .cm-fix-receipt-delta-heading': { color: '#16a34a' },
  '.cm-fix-receipt-delta-introduced .cm-fix-receipt-delta-heading': { color: '#dc2626' },
  '.dark & .cm-fix-receipt-delta-cleared .cm-fix-receipt-delta-heading': { color: '#4ade80' },
  '.dark & .cm-fix-receipt-delta-introduced .cm-fix-receipt-delta-heading': { color: '#f87171' },
  '.cm-fix-receipt-delta-empty': { color: '#9ca3af', fontStyle: 'italic' },
  '.cm-fix-receipt-delta ul': { margin: 0, paddingLeft: '16px' },
});

// ── Public extension factory ──────────────────────────────────────────────────
/** Bundles all fix-action state/behavior; diagnostics.ts's scriptDiagnostics()
 *  includes this alongside its own squiggle/tooltip extensions. Contains no
 *  keymap of its own — diagnostics.ts owns the "Mod-Shift-f fixes the
 *  current line's worst diagnostic" binding, since only it has access to
 *  diagnosticsField to find which issue that is. */
export function fixAction(): Extension {
  return [llmReadyField, fixPhasesField, llmReadyFetcher, fixController, fixReceiptPlugin, fixReceiptTheme];
}
