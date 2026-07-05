// Live narrative diagnostics for the Fountain editor (CodeMirror 6) —
// "ESLint for screenplays." As the writer pauses, the full document is sent
// to the deterministic, keyless POST /api/scriptide/diagnose endpoint and the
// returned issues are rendered as wavy-underline squiggles with hover cards.
//
// Structure deliberately mirrors inline-complete.ts (the closest analog in
// this codebase):
//   • A single StateField holds the current diagnosis; a StateEffect updates it.
//   • A ViewPlugin debounces after the last doc change, fetches, and dispatches
//     the effect — with the same AbortController + request-counter staleness
//     discipline used by inline-complete's completion trigger.
//   • Decorations are derived purely from state (ViewPlugin.decorations),
//     same as fountain-highlight.ts.
//
// Anchoring contract (see server/nvm/analyze/types.ts LocatedIssue): only
// issues with anchor !== 'document' carry startLine/endLine and are drawable;
// 'document'-anchored issues (act-level/whole-script findings) are ignored
// here — they have nowhere honest to point on the page.
//
// Run 17-D bridges a squiggle to the fix-and-verify engine (POST
// /api/scriptide/fix): fix-action.ts owns the network contract, the
// pending/result lifecycle, applying an accepted rewrite as a normal
// undoable transaction, and the inline verify-receipt widget. This file
// wires that action into the hover tooltip (a "Fix with AI" button per
// diagnostic) and into the keymap (Mod-Shift-f fixes the current line's
// worst diagnostic) — see buildFixButton/fixCurrentLine below.

import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  hoverTooltip,
  Tooltip,
  keymap,
} from '@codemirror/view';
import {
  StateField,
  StateEffect,
  Extension,
  Range,
} from '@codemirror/state';
import {
  fixAction,
  runFix,
  isFixPending,
  fixPhaseFor,
  issueActionKey,
  llmReadyField,
  fixPhasesField,
  SetFixPhase,
  type FixTarget,
  type FixPhase,
} from './fix-action.ts';

// ── Contract types — kept in sync with server/nvm/analyze/types.ts ───────────
// (LiveDiagnosis / LocatedIssue / RevisionIssue). Duplicated here rather than
// imported because the client bundle cannot pull in server-side modules.
export type IssueSeverity = 'critical' | 'major' | 'minor';
export type IssueAnchor = 'scene' | 'character' | 'lines' | 'document';

export interface RevisionIssueLike {
  location: string;
  rule: string;
  description: string;
  severity: IssueSeverity;
  suggestedFix?: string;
}

export interface LocatedIssue {
  issue: RevisionIssueLike;
  pass: string;
  anchor: IssueAnchor;
  startLine?: number;
  endLine?: number;
}

export interface LiveDiagnosis {
  health: number;
  grade: string;
  verdict?: unknown;
  sceneCount: number;
  locatedIssues: LocatedIssue[];
  rootCauses: unknown[];
  contentHash: string;
  analyzedAt: number;
}

// ── Severity ordering — used both to pick the "worst" squiggle on a line and
// to sort issues within a hover card (worst first). ────────────────────────
const SEVERITY_RANK: Record<IssueSeverity, number> = {
  critical: 3,
  major: 2,
  minor: 1,
};

/** "ON_THE_NOSE" → "On The Nose" — rule ids are SNAKE_CASE identifiers in the
 *  revision passes; ALL_CAPS reads as shouting in a hover card, so title-case it. */
function humanizeRule(rule: string): string {
  return rule
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Cheap, non-cryptographic fingerprint used purely to skip redundant network
 *  round-trips when the doc text hasn't materially changed since the last
 *  successful diagnose call (e.g. a transaction that only moves the cursor,
 *  or an edit immediately undone back to the same text). Deliberately not
 *  the server's sha256 contentHash — that would require a round trip just to
 *  learn "nothing changed"; this is computed locally in O(n). */
function cheapFingerprint(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0; // djb2
  }
  return `${text.length}:${h}`;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function fetchDiagnosis(fountain: string, signal: AbortSignal): Promise<LiveDiagnosis> {
  const res = await fetch('/api/scriptide/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fountain }),
    signal,
  });
  if (!res.ok) throw new Error(`diagnose_failed_${res.status}`);
  return res.json() as Promise<LiveDiagnosis>;
}

// ── State effect + field ──────────────────────────────────────────────────────
export const SetDiagnostics = StateEffect.define<LocatedIssue[]>();

export const diagnosticsField = StateField.define<LocatedIssue[]>({
  create: () => [],
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(SetDiagnostics)) return e.value;
    }
    // Line-anchored issues are only valid against the doc snapshot they were
    // computed from. Once the user types, lines above the issue may shift
    // (insert/delete a line), so a stale squiggle would misattribute an issue
    // to the wrong line. Clear immediately on any edit — same "any edit
    // invalidates the stale result" rule inline-complete applies to ghost text
    // — and let the debounced re-fetch below repopulate once the writer pauses.
    if (tr.docChanged) return [];
    return value;
  },
});

// ── Decorations ────────────────────────────────────────────────────────────────
/** Overlapping issues on the same line: rather than layering multiple wavy
 *  underlines of different colors on the same text (visually noisy and hard
 *  to read as a single signal), each line gets exactly ONE mark — colored by
 *  the worst severity touching it. The hover card still lists every issue for
 *  that line, so no information is lost, only the on-glyph color is collapsed. */
/** Every line number covered by a currently-in-flight "Fix with AI" request —
 *  folded into the squiggle decoration below (an extra CSS class, not a
 *  separate mark) so the pending state is visible on the squiggle itself,
 *  not only in the tooltip or the receipt widget that lands later. */
function computePendingLines(phases: Map<string, FixPhase>): Set<number> {
  const lines = new Set<number>();
  for (const phase of phases.values()) {
    if (phase.status !== 'pending') continue;
    for (let n = phase.span.startLine; n <= phase.span.endLine; n++) lines.add(n);
  }
  return lines;
}

function buildDiagnosticDecorations(
  state: { doc: { lines: number; line(n: number): { from: number; to: number } } },
  issues: LocatedIssue[],
  pendingLines: Set<number>,
): DecorationSet {
  if (issues.length === 0) return Decoration.none;

  const lineWorst = new Map<number, IssueSeverity>();
  for (const li of issues) {
    if (li.anchor === 'document' || li.startLine == null || li.endLine == null) continue;
    const start = Math.max(1, li.startLine);
    const end = Math.min(state.doc.lines, li.endLine);
    for (let n = start; n <= end; n++) {
      const prev = lineWorst.get(n);
      if (!prev || SEVERITY_RANK[li.issue.severity] > SEVERITY_RANK[prev]) {
        lineWorst.set(n, li.issue.severity);
      }
    }
  }
  if (lineWorst.size === 0) return Decoration.none;

  // Map key order isn't guaranteed ascending for a Map (unlike plain-object
  // integer keys) — sort explicitly since RangeSet construction requires it.
  const ranges: Range<Decoration>[] = [];
  for (const lineNo of [...lineWorst.keys()].sort((a, b) => a - b)) {
    const line = state.doc.line(lineNo);
    if (line.from === line.to) continue; // blank line — nothing to underline
    const severity = lineWorst.get(lineNo)!;
    const cls = pendingLines.has(lineNo)
      ? `cm-diagnostic-${severity} cm-diagnostic-fixing`
      : `cm-diagnostic-${severity}`;
    ranges.push(Decoration.mark({ class: cls }).range(line.from, line.to));
  }
  return Decoration.set(ranges);
}

const diagnosticsDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDiagnosticDecorations(
        view.state,
        view.state.field(diagnosticsField),
        computePendingLines(view.state.field(fixPhasesField)),
      );
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.state.field(diagnosticsField) !== update.startState.field(diagnosticsField) ||
        update.state.field(fixPhasesField) !== update.startState.field(fixPhasesField)
      ) {
        this.decorations = buildDiagnosticDecorations(
          update.state,
          update.state.field(diagnosticsField),
          computePendingLines(update.state.field(fixPhasesField)),
        );
      }
    }
  },
  { decorations: (v) => v.decorations },
);

// ── Fix with AI — hover-tooltip + keyboard entry points into fix-action.ts ──
/** Builds the "Fix with AI" button for one diagnostic's tooltip item.
 *  Disabled (never firing a request) whenever the server has reported no AI
 *  key configured, or another fix is already running on this editor — the
 *  keyless-honesty rule this bridge holds everywhere else (see CLAUDE.md's
 *  llmReady gotcha) applies here too: degrade the affordance, don't fire a
 *  doomed request. */
function buildFixButton(
  view: EditorView,
  li: LocatedIssue & { startLine: number; endLine: number },
): HTMLButtonElement {
  const target: FixTarget = {
    rule: li.issue.rule,
    description: li.issue.description,
    suggestedFix: li.issue.suggestedFix,
    startLine: li.startLine,
    endLine: li.endLine,
  };

  const llmReady = view.state.field(llmReadyField);
  const phase = fixPhaseFor(view, target);
  const alreadyPending = phase?.status === 'pending' || isFixPending(view);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cm-diagnostic-fix-btn';
  btn.disabled = llmReady === false || alreadyPending;
  btn.textContent = alreadyPending ? 'Fixing…' : 'Fix with AI';
  btn.title =
    llmReady === false
      ? 'Add an AI key in Settings to use Fix with AI.'
      : alreadyPending
      ? 'A fix is already running.'
      : 'Send this diagnostic to the fix-and-verify engine.';
  btn.onclick = () => {
    // Optimistic local update — fixReceiptPlugin/the pending squiggle class
    // take over once SetFixPhase(pending) lands via runFix's own dispatch;
    // this just avoids a double-click racing a second request before that
    // state round-trips through the view.
    btn.disabled = true;
    btn.textContent = 'Fixing…';
    runFix(view, target);
  };
  return btn;
}

/** The worst-severity diagnostic anchored to `lineNo`, if any — shared by the
 *  hover tooltip (via `hits[0]` there) and the keyboard shortcut below, which
 *  has no hover position to filter from and must derive "which diagnostic"
 *  from the cursor's line alone. */
function worstIssueOnLine(
  view: EditorView,
  lineNo: number,
): (LocatedIssue & { startLine: number; endLine: number }) | null {
  const issues = view.state.field(diagnosticsField, false);
  if (!issues || issues.length === 0) return null;
  const hits = issues
    .filter(
      (li): li is LocatedIssue & { startLine: number; endLine: number } =>
        li.anchor !== 'document' &&
        li.startLine != null &&
        li.endLine != null &&
        lineNo >= li.startLine &&
        lineNo <= li.endLine,
    )
    .sort((a, b) => SEVERITY_RANK[b.issue.severity] - SEVERITY_RANK[a.issue.severity]);
  return hits[0] ?? null;
}

/** Keyboard entry point (bound to Mod-Shift-f below) — reachable without
 *  hover-hunting, per the task's accessibility requirement. Fixes the
 *  worst-severity diagnostic anchored to the cursor's current line. Returns
 *  false (letting other bindings/the browser handle the key) when there's
 *  nothing to fix on that line, so it never swallows the shortcut on an
 *  ordinary line. On a keyless server this records an honest inline message
 *  via the same receipt widget rather than firing a request that can only
 *  fail — the keyboard path gets no hover tooltip to show a disabled button
 *  in, so the receipt widget is the only surface available to say so. */
function fixCurrentLine(view: EditorView): boolean {
  const lineNo = view.state.doc.lineAt(view.state.selection.main.head).number;
  const li = worstIssueOnLine(view, lineNo);
  if (!li) return false;

  const target: FixTarget = {
    rule: li.issue.rule,
    description: li.issue.description,
    suggestedFix: li.issue.suggestedFix,
    startLine: li.startLine,
    endLine: li.endLine,
  };

  if (view.state.field(llmReadyField) === false) {
    view.dispatch({
      effects: SetFixPhase.of({
        key: issueActionKey(target),
        phase: {
          status: 'error',
          message: 'Add an AI key in Settings to use Fix with AI.',
          span: { startLine: li.startLine, endLine: li.endLine },
        },
      }),
    });
    return true;
  }

  runFix(view, target);
  return true;
}

const fixKeymap = keymap.of([{ key: 'Mod-Shift-f', run: fixCurrentLine, preventDefault: true }]);

// ── Hover tooltip ─────────────────────────────────────────────────────────────
function diagnosticHoverSource(view: EditorView, pos: number): Tooltip | null {
  const issues = view.state.field(diagnosticsField, false);
  if (!issues || issues.length === 0) return null;

  const lineNo = view.state.doc.lineAt(pos).number;
  const hits = issues
    .filter(
      (li): li is LocatedIssue & { startLine: number; endLine: number } =>
        li.anchor !== 'document' &&
        li.startLine != null &&
        li.endLine != null &&
        lineNo >= li.startLine &&
        lineNo <= li.endLine,
    )
    .sort((a, b) => SEVERITY_RANK[b.issue.severity] - SEVERITY_RANK[a.issue.severity]);
  if (hits.length === 0) return null;

  const line = view.state.doc.line(lineNo);

  return {
    pos: line.from,
    end: line.to,
    above: true,
    create() {
      const dom = document.createElement('div');
      dom.className = 'cm-diagnostic-tooltip';

      for (const li of hits) {
        const item = document.createElement('div');
        item.className = 'cm-diagnostic-tooltip-item';

        const head = document.createElement('div');
        head.className = 'cm-diagnostic-tooltip-head';

        const badge = document.createElement('span');
        badge.className = `cm-diagnostic-badge cm-diagnostic-badge-${li.issue.severity}`;
        badge.textContent = li.issue.severity;

        const rule = document.createElement('span');
        rule.className = 'cm-diagnostic-tooltip-rule';
        rule.textContent = humanizeRule(li.issue.rule);

        head.append(badge, rule);
        item.appendChild(head);

        const desc = document.createElement('div');
        desc.className = 'cm-diagnostic-tooltip-desc';
        desc.textContent = li.issue.description;
        item.appendChild(desc);

        if (li.issue.suggestedFix) {
          const fix = document.createElement('div');
          fix.className = 'cm-diagnostic-tooltip-fix';
          fix.textContent = `Fix: ${li.issue.suggestedFix}`;
          item.appendChild(fix);
        }

        const actions = document.createElement('div');
        actions.className = 'cm-diagnostic-tooltip-actions';
        actions.appendChild(buildFixButton(view, li));
        item.appendChild(actions);

        dom.appendChild(item);
      }

      return { dom };
    },
  };
}

// ── Debounced diagnose-on-pause ViewPlugin ────────────────────────────────────
const DEBOUNCE_MS = 900;
// After this many consecutive failures (server down, endpoint erroring), stop
// trusting whatever squiggles are on screen — they may no longer match text
// the writer has since changed several times over — rather than leave a
// stuck, possibly-wrong diagnosis visible indefinitely. The writer keeps
// drafting uninterrupted either way; this only ever removes markup, never
// shows an error.
const MAX_CONSECUTIVE_FAILURES = 3;

const diagnosticsTrigger = ViewPlugin.fromClass(
  class {
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private abortCtrl: AbortController | null = null;
    // Bumped on every scheduled request; a resolving/rejecting fetch checks
    // its own snapshot against the latest value and no-ops if superseded —
    // same staleness guard inline-complete applies via cursor-position equality.
    private requestSeq = 0;
    private lastFingerprint: string | null = null;
    private consecutiveFailures = 0;

    destroy() {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.abortCtrl?.abort();
    }

    update(update: ViewUpdate) {
      if (!update.docChanged) return;

      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      // A newer edit supersedes any in-flight diagnose call.
      this.abortCtrl?.abort();

      const view = update.view;
      this.debounceTimer = setTimeout(() => {
        const doc = view.state.doc.toString();

        if (doc.trim() === '') {
          // Nothing to diagnose. Clear any squiggles left from before the
          // writer deleted everything, rather than leaving them orphaned.
          if (view.state.field(diagnosticsField).length > 0) {
            view.dispatch({ effects: SetDiagnostics.of([]) });
          }
          this.lastFingerprint = null;
          return;
        }

        const fingerprint = cheapFingerprint(doc);
        if (fingerprint === this.lastFingerprint) return; // unchanged since last diagnose — skip the round trip

        const seq = ++this.requestSeq;
        this.abortCtrl = new AbortController();
        const { signal } = this.abortCtrl;

        fetchDiagnosis(doc, signal)
          .then((diagnosis) => {
            if (signal.aborted || seq !== this.requestSeq) return; // stale — a newer request won the race
            this.consecutiveFailures = 0;
            this.lastFingerprint = fingerprint;
            view.dispatch({ effects: SetDiagnostics.of(diagnosis.locatedIssues ?? []) });
          })
          .catch(() => {
            if (signal.aborted || seq !== this.requestSeq) return;
            // Fail silently — live notes must never nag a writer mid-draft
            // with a toast or error banner over a transient network hiccup.
            this.consecutiveFailures += 1;
            if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              view.dispatch({ effects: SetDiagnostics.of([]) });
            }
          });
      }, DEBOUNCE_MS);
    }
  },
);

// ── Theme — squiggle underlines + tooltip card, light + dark ─────────────────
// Severity colors match the existing Script Doctor palette exactly
// (ScriptDoctorPanel.tsx: critical=red-600, major=amber-500, minor=zinc-400).
// Dark-mode overrides follow this file's `.dark &` ancestor-selector
// convention (see fountain-highlight.ts), since the app toggles a `.dark`
// class on <html> rather than relying on CodeMirror's own theme `dark` flag.
const diagnosticsTheme = EditorView.baseTheme({
  '.cm-diagnostic-critical': {
    textDecoration: 'underline wavy #dc2626',
    textDecorationThickness: '2px',
    textUnderlineOffset: '3px',
  },
  '.cm-diagnostic-major': {
    textDecoration: 'underline wavy #f59e0b',
    textDecorationThickness: '2px',
    textUnderlineOffset: '3px',
  },
  '.cm-diagnostic-minor': {
    textDecoration: 'underline wavy #a1a1aa',
    textDecorationThickness: '1.5px',
    textUnderlineOffset: '3px',
  },
  '.dark & .cm-diagnostic-critical': { textDecorationColor: '#f87171' },
  '.dark & .cm-diagnostic-major': { textDecorationColor: '#fbbf24' },
  '.dark & .cm-diagnostic-minor': { textDecorationColor: '#71717a' },
  // "Fix with AI" pending — layered on top of whichever severity class is
  // already present (see buildDiagnosticDecorations), so the squiggle itself
  // shows an in-flight fix without needing a fourth, separate mark.
  '.cm-diagnostic-fixing': { backgroundColor: 'rgba(250, 204, 21, 0.28)' },
  '.dark & .cm-diagnostic-fixing': { backgroundColor: 'rgba(250, 204, 21, 0.18)' },

  '.cm-diagnostic-tooltip': {
    maxWidth: '360px',
    padding: '8px 10px',
    background: '#ffffff',
    color: '#18181b',
    border: '2px solid #000000',
    boxShadow: '3px 3px 0px 0px #000000',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: '11px',
    lineHeight: '1.5',
  },
  '.dark & .cm-diagnostic-tooltip': {
    background: '#18181b',
    color: '#e4e4e7',
    border: '2px solid #52525b',
    boxShadow: '3px 3px 0px 0px #000000',
  },
  '.cm-diagnostic-tooltip-item + .cm-diagnostic-tooltip-item': {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px dashed #d4d4d8',
  },
  '.dark & .cm-diagnostic-tooltip-item + .cm-diagnostic-tooltip-item': {
    borderTop: '1px dashed #3f3f46',
  },
  '.cm-diagnostic-tooltip-head': {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  '.cm-diagnostic-badge': {
    fontSize: '9px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '1px 5px',
    color: '#ffffff',
    flexShrink: '0',
  },
  '.cm-diagnostic-badge-critical': { background: '#dc2626' },
  '.cm-diagnostic-badge-major': { background: '#f59e0b', color: '#000000' },
  '.cm-diagnostic-badge-minor': { background: '#a1a1aa', color: '#000000' },
  '.cm-diagnostic-tooltip-rule': { fontWeight: '700' },
  '.cm-diagnostic-tooltip-desc': { opacity: '0.9' },
  '.cm-diagnostic-tooltip-fix': {
    marginTop: '4px',
    fontStyle: 'italic',
    opacity: '0.75',
  },
  '.cm-diagnostic-tooltip-actions': {
    marginTop: '6px',
  },
  '.cm-diagnostic-fix-btn': {
    fontFamily: 'inherit',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '3px 8px',
    background: '#18181b',
    color: '#ffffff',
    border: '1px solid #18181b',
    cursor: 'pointer',
  },
  '.dark & .cm-diagnostic-fix-btn': {
    background: '#e4e4e7',
    color: '#18181b',
    border: '1px solid #e4e4e7',
  },
  '.cm-diagnostic-fix-btn:disabled': {
    opacity: '0.4',
    cursor: 'not-allowed',
  },
});

// ── Public extension factory ──────────────────────────────────────────────────
export interface ScriptDiagnosticsOptions {
  /** When false, returns a fully inert extension: no field, no plugin, no
   *  decorations, no network activity whatsoever. FountainEditor's primary
   *  on/off mechanism is a Compartment that swaps this whole extension in and
   *  out (mirroring completionCompartment/themeCompartment) — this flag is a
   *  secondary belt-and-suspenders guard for any caller that constructs the
   *  extension directly without going through a Compartment. Default: true. */
  enabled?: boolean;
}

export function scriptDiagnostics(opts: ScriptDiagnosticsOptions = {}): Extension {
  if (opts.enabled === false) return [];
  return [
    diagnosticsField,
    diagnosticsDecorationPlugin,
    diagnosticsTheme,
    hoverTooltip(diagnosticHoverSource, { hoverTime: 300 }),
    diagnosticsTrigger,
    // Run 17-D: bridges a squiggle to POST /api/scriptide/fix. fixAction()
    // owns the network contract, pending/result lifecycle, and the inline
    // verify-receipt widget; this file only wires the tooltip button and the
    // keyboard shortcut into it (see buildFixButton/fixCurrentLine above).
    fixAction(),
    fixKeymap,
  ];
}
