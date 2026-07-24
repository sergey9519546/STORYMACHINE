// Inline AI copilot for the Fountain editor (CodeMirror 6).
//
// Behaviour:
//   • 600 ms after the last keystroke, fetches a FIM completion from
//     /api/scriptide/complete (SSE stream of tokens).
//   • Completion shown as a ghost-text widget at the cursor.
//   • Tab              → accept full completion
//   • Ctrl+ArrowRight  → accept next word only
//   • Escape           → dismiss
//   • Any other edit   → cancel pending fetch and dismiss
//
// The extension is designed to be side-effect-free: a single CompletionState
// StateField drives everything; effects request / update / dismiss completions.

import {
  EditorView,
  Decoration,
  WidgetType,
  ViewPlugin,
  keymap,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import {
  EditorState,
  StateField,
  StateEffect,
  Transaction,
} from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { withSession } from '../../lib/session.ts';

// ── Context passed to the completion endpoint ─────────────────────────────────
export interface CompletionContext {
  directorStyle?: string;
  genre?: string;
  characters?: string[];
  /** Active copilot persona id (P9) — selects the ghost-text voice/specialty. */
  persona?: string;
}

// ── SSE fetch helper — streams tokens, calls onToken, resolves with full text ─
function fetchCompletion(
  prefix: string,
  suffix: string,
  ctx: CompletionContext,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      prefix: prefix.slice(-4000),    // last 4000 chars keeps context tight
      suffix: suffix.slice(0, 1000),  // next 1000 chars for FIM
      directorStyle: ctx.directorStyle ?? '',
      genre: ctx.genre ?? '',
      characters: (ctx.characters ?? []).join(','),
      persona: ctx.persona ?? '',
    });

    const es = new EventSource(withSession(`/api/scriptide/complete?${params}`));
    let full = '';

    signal.addEventListener('abort', () => {
      es.close();
      reject(new DOMException('Aborted', 'AbortError'));
    });

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type: string; token?: string };
        if (data.type === 'token' && data.token) {
          full += data.token;
          onToken(full);
        } else if (data.type === 'done') {
          es.close();
          resolve(full);
        } else if (data.type === 'error') {
          es.close();
          reject(new Error('completion_error'));
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      reject(new Error('completion_fetch_failed'));
    };
  });
}

// ── Ghost text widget ─────────────────────────────────────────────────────────
class GhostTextWidget extends WidgetType {
  // Not a TS parameter-property constructor: node's --experimental-strip-types
  // "strip-only" mode (used by this repo's `npm test`) can't erase parameter
  // properties (they have runtime semantics beyond a type annotation), so this
  // file couldn't be imported by any node:test file at all until this was an
  // explicit field + assignment instead.
  readonly text: string;
  constructor(text: string) { super(); this.text = text; }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-inline-ghost';
    span.textContent = this.text;
    return span;
  }

  ignoreEvent(): boolean { return true; }
  eq(other: GhostTextWidget): boolean { return other.text === this.text; }
}

// ── State effects ─────────────────────────────────────────────────────────────
const SetCompletion = StateEffect.define<{ cursor: number; text: string }>();
const DismissCompletion = StateEffect.define<void>();

// ── State field ───────────────────────────────────────────────────────────────
interface CompletionState {
  cursor: number;     // the doc position where ghost text is anchored
  text: string;       // full pending completion
}

const completionField = StateField.define<CompletionState | null>({
  create: () => null,
  update(prev, tr: Transaction) {
    for (const e of tr.effects) {
      if (e.is(SetCompletion)) return e.value;
      if (e.is(DismissCompletion)) return null;
    }
    // Any user edit (typed character, delete, paste) clears the ghost text.
    if (tr.docChanged) return null;
    // A cursor move that doesn't match the anchored position clears it.
    if (prev && tr.selection) {
      const newHead = tr.newSelection.main.head;
      if (newHead !== prev.cursor) return null;
    }
    return prev;
  },
});

// ── Decoration that renders the ghost text widget at the cursor ───────────────
function ghostDecorations(state: EditorState): DecorationSet {
  const completion = state.field(completionField);
  if (!completion || !completion.text) return Decoration.none;
  return Decoration.set([
    Decoration.widget({
      widget: new GhostTextWidget(completion.text),
      side: 1,            // render AFTER the cursor position
    }).range(completion.cursor),
  ]);
}

const ghostPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = ghostDecorations(view.state); }
    update(update: { state: EditorState }) { this.decorations = ghostDecorations(update.state); }
  },
  { decorations: (v) => v.decorations },
);

// ── Ghost text theme ──────────────────────────────────────────────────────────
const ghostTheme = EditorView.baseTheme({
  '.cm-inline-ghost': {
    opacity: '0.45',
    color: '#6b7280',
    pointerEvents: 'none',
    whiteSpace: 'pre',
  },
});

// ── Accept helpers ────────────────────────────────────────────────────────────
function acceptFull(view: EditorView): boolean {
  const completion = view.state.field(completionField);
  if (!completion) return false;
  view.dispatch({
    changes: { from: completion.cursor, insert: completion.text },
    selection: { anchor: completion.cursor + completion.text.length },
    effects: DismissCompletion.of(),
  });
  return true;
}

function acceptWord(view: EditorView): boolean {
  const completion = view.state.field(completionField);
  if (!completion) return false;
  const word = completion.text.match(/^[\s]*\S+/)?.[0] ?? completion.text.split(' ')[0];
  const remaining = completion.text.slice(word.length);
  view.dispatch({
    changes: { from: completion.cursor, insert: word },
    selection: { anchor: completion.cursor + word.length },
    effects: remaining
      ? SetCompletion.of({ cursor: completion.cursor + word.length, text: remaining })
      : DismissCompletion.of(),
  });
  return true;
}

function dismiss(view: EditorView): boolean {
  const completion = view.state.field(completionField);
  if (!completion) return false;
  view.dispatch({ effects: DismissCompletion.of() });
  return true;
}

// ── Debounced trigger ViewPlugin ──────────────────────────────────────────────
const DEBOUNCE_MS = 600;
const MIN_PREFIX_CHARS = 20;   // don't trigger on near-empty docs

function createTriggerPlugin(ctx: CompletionContext): ViewPlugin<{
  destroy: () => void;
  update: (update: { docChanged: boolean; state: EditorState; view: EditorView }) => void;
}> {
  return ViewPlugin.fromClass(
    class {
      private debounceTimer: ReturnType<typeof setTimeout> | null = null;
      private abortCtrl: AbortController | null = null;

      destroy() {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.abortCtrl?.abort();
      }

      update(update: { docChanged: boolean; state: EditorState; view: EditorView }) {
        // Only trigger when the user typed something (doc changed)
        if (!update.docChanged) return;

        // Cancel any in-flight request and reset debounce
        this.abortCtrl?.abort();
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        // Dismiss any existing ghost text after the current CodeMirror update
        // completes; dispatching synchronously from a plugin update crashes.
        setTimeout(() => {
          if (!update.view.state.field(completionField)) return;
          update.view.dispatch({ effects: DismissCompletion.of() });
        }, 0);

        const view = update.view;
        this.debounceTimer = setTimeout(() => {
          const cursor = view.state.selection.main.head;
          const doc = view.state.doc.toString();
          const prefix = doc.slice(0, cursor);
          const suffix = doc.slice(cursor);

          if (prefix.length < MIN_PREFIX_CHARS) return;

          this.abortCtrl = new AbortController();
          const { signal } = this.abortCtrl;

          fetchCompletion(prefix, suffix, ctx, (partial) => {
            if (signal.aborted) return;
            // Re-read cursor each update in case user moved
            const currentCursor = view.state.selection.main.head;
            if (currentCursor !== cursor) return; // user moved on — abort silently
            view.dispatch({
              effects: SetCompletion.of({ cursor, text: partial }),
            });
          }, signal).catch(() => {
            // Fetch failed or aborted — silently clear
            if (!signal.aborted) {
              view.dispatch({ effects: DismissCompletion.of() });
            }
          });
        }, DEBOUNCE_MS);
      }
    },
  );
}

// ── Public extension factory ──────────────────────────────────────────────────
export function inlineComplete(ctx: CompletionContext = {}): Extension {
  return [
    completionField,
    ghostPlugin,
    ghostTheme,
    createTriggerPlugin(ctx),
    keymap.of([
      { key: 'Tab',         run: acceptFull,  preventDefault: true },
      { key: 'Ctrl-ArrowRight', run: acceptWord, preventDefault: true },
      { key: 'Escape',      run: dismiss,     preventDefault: false },
    ]),
  ];
}

// ── G0-03: off-by-default gate ────────────────────────────────────────────────
// FountainEditor.tsx's completionCompartment is reconfigured with this
// function's return value (never with inlineComplete() directly) — the same
// "compute the compartment content from a flag" seam liveDiagnostics already
// uses for scriptDiagnostics() (`liveDiagnostics ? scriptDiagnostics() : []`
// in FountainEditor.tsx). `enabled` defaults to false so that a caller who
// forgets to pass it — or FountainEditor's own `inlineCompletionEnabled = false`
// prop default — gets an inert (zero-extension) compartment: no
// createTriggerPlugin, so no debounced GET /api/scriptide/complete is ever
// possible, regardless of typing. This is a keyless feature (server-side calls
// an LLM), so it must stay opt-in the same way Live Notes is.
export function inlineCompletionExtension(enabled: boolean = false, ctx: CompletionContext = {}): Extension {
  return enabled ? inlineComplete(ctx) : [];
}

// Expose state accessor for test hooks
export { completionField, SetCompletion, DismissCompletion };
