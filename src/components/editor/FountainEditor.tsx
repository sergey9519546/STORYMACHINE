// FountainEditor — CodeMirror 6 editor with:
//   • Fountain syntax highlighting
//   • Fountain-specific keybindings and screenplay element autocomplete
//   • Light / dark themes
//   • Programmatic navigation via ref

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';

import { EditorView, keymap, Decoration, scrollPastEnd, type DecorationSet } from '@codemirror/view';
import { EditorState, Compartment, StateEffect, StateField } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, standardKeymap } from '@codemirror/commands';
import { highlightActiveLine, lineNumbers, drawSelection } from '@codemirror/view';
import { closeBrackets, autocompletion } from '@codemirror/autocomplete';
import { search, searchKeymap } from '@codemirror/search';

import { fountainHighlight, fountainTheme } from './fountain-highlight.ts';
import { screenplayFormat, screenplayFormatTheme } from './screenplay-format.ts';
import { fountainKeymap, fountainKeymapExtensions } from './fountain-keymap.ts';
import { screenplayComplete } from './screenplay-complete.ts';
import { createCollabSession, CollabSession } from './collab.ts';
import { scriptDiagnostics } from './diagnostics.ts';
import { searchPanelTheme } from './search-panel-theme.ts';

export interface FountainEditorHandle {
  /** Navigate to a specific 1-indexed line number */
  navigateTo(line: number): void;
  /** Returns the 1-based line number of the cursor, or 1 if unavailable */
  getCurrentLine(): number;
  /** Returns the EditorView for advanced integrations */
  getView(): EditorView | null;
  /**
   * E2: scroll the 1-based inclusive [startLine, endLine] span into view
   * (centered) and paint a brief, non-jarring highlight over it — the
   * click-a-finding → land-on-the-lines half of the doctor↔editor round
   * trip. Both endpoints are clamped to the document's actual line count so
   * a finding computed against stale text (or a scene-anchored issue on a
   * document shorter than expected) can't throw. The highlight is a fading
   * decoration (see findingHighlightField/findingHighlightTheme below), not
   * a persistent selection change beyond the initial cursor placement, so it
   * reads as "look here" rather than "your selection is now this".
   */
  highlightRange(startLine: number, endLine: number): void;
}

export interface FountainEditorProps {
  value: string;
  onChange: (value: string) => void;
  characters?: string[];
  isDarkMode?: boolean;
  placeholder?: string;
  className?: string;
  /** Fires when the user types (after every doc change, before debounce) */
  onUserEdit?: () => void;
  /**
   * P4: when set, the editor joins the real-time collaboration room with this
   * SERVER-MINTED id (POST /api/collab/rooms — never a writer-typed name; see
   * server/routes/collab.ts). Yjs becomes the source of truth for the
   * document; the `value` prop is used only to seed an empty shared doc, and
   * external value-sync is disabled.
   */
  collabRoom?: string;
  /** Display name for this user's remote cursor in collaboration mode. */
  collabUserName?: string;
  /**
   * "Live Notes" — when true, the editor debounces after typing and diagnoses
   * the script against POST /api/scriptide/diagnose, rendering issues as
   * squiggle underlines with hover tooltips (see diagnostics.ts). Keyless
   * feature, off by default (see Toolbar/ScriptIDE "Live Notes" toggle).
   */
  liveDiagnostics?: boolean;
  /**
   * Decision #3 (2026-09-03, docs/DECISION_LOG.md): whether Live Notes may
   * offer its GENERATIVE half — the per-squiggle "Fix with AI" button and its
   * Mod-Shift-f shortcut, both of which POST to /api/scriptide/fix. ScriptIDE
   * passes the Labs flag here, so with Labs OFF the extension is built without
   * fixAction() at all: no button, no keybinding, no /api/ai-config probe from
   * the editor. The deterministic squiggles and hover text are NOT affected by
   * this prop — they are the keyless front door and stay on the default
   * surface. Defaults to false so a caller that forgets it gets the safe,
   * demoted behavior rather than silently re-exposing the generative path.
   */
  generativeFixes?: boolean;
  /**
   * E5: Typewriter Focus — keeps the cursor's line vertically centered in
   * the viewport as the writer types or moves the cursor, mirroring
   * dedicated screenwriting apps' "typewriter mode." Deliberately narrower
   * than this prop's original (pre-E5) doc comment claimed: it does not dim
   * inactive lines — that would need a second visual system (a fading
   * decoration layer) this pass didn't build, and shipping the centering
   * half only, honestly described, beat leaving the whole feature
   * unimplemented behind a prop nothing ever read. See ShortcutModal.tsx
   * for the keyboard binding (Ctrl/Cmd+Shift+F) this prop answers to.
   */
  isTypewriterFocus?: boolean;
  /** Theme selection: "paper" | "dark" | "crt" | "print" */
  themeName?: "paper" | "dark" | "crt" | "print";
}

// ── Shared base theme ─────────────────────────────────────────────────────────
// Centered screenplay page: `.cm-content` IS the page (paper-colored, fixed
// text-column width, shadow); `.cm-scroller` is the muted canvas it floats
// on. Sizing is derived from screenplay-layout.ts, not invented: 60ch below
// equals SPEC.action.widthChars (the same Courier 12pt/10cpi text band the
// PDF export wraps to) — `ch` keeps that exact regardless of font-size — and
// the 1in padding matches TOP_MARGIN/BOTTOM_MARGIN there, giving an overall
// page width of ~816px @ 96dpi (60ch ≈ 624px text column + 2×1in margins),
// same US-Letter proportions the export uses.
const baseTheme = EditorView.baseTheme({
  '&': {
    fontFamily: "var(--font-courier, 'Courier Prime', 'Courier New', Courier, monospace)",
    // Tuned so 60 monospace characters (SPEC's action/scene-heading band)
    // fill roughly the ~624px text column described above, instead of an
    // arbitrary UI font size.
    fontSize: '17px',
    lineHeight: '1.65',
    height: '100%',
  },
  '.cm-scroller': {
    overflow: 'auto',
    // Tighten horizontal padding so the page dominates more of the stage;
    // the right gutter is now used for page furniture, not dead space.
    padding: '4rem 1.25rem 6rem',
    // Graded warm canvas — a soft radial pool of light behind the page plus a
    // slightly darker desk edge, instead of one flat beige value.
    background:
      'radial-gradient(140% 70% at 40% 0%, #ECE5D6 0%, #E4DCC9 45%, #DCD3BD 100%)',
  },
  '.cm-content': {
    // content-box so `width` is the 60ch TEXT column and the 1in page margins
    // add AROUND it — CM6's default border-box would subtract the padding from
    // the 60ch, collapsing the writable band to ~41ch and wrapping every line
    // short of the industry measure.
    boxSizing: 'content-box',
    width: '60ch',
    maxWidth: '60ch',
    flexGrow: '0',
    flexShrink: '0',
    margin: '0 auto',
    padding: '1in', // industry-standard 1in top/bottom/left/right page margins
    background: '#F4F0E6', // paper (light default)
    // Layered depth: 1px ink hairline edge, a bright inner top highlight so the
    // sheet catches light, and a wide tinted diffusion shadow pooled to the
    // desk hue (design-taste: shadow tinted to background, no neutral glow).
    border: '1px solid rgba(33,29,21,0.18)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(33,29,21,0.10), 0 24px 48px -20px rgba(33,29,21,0.35)',
    caretColor: 'var(--sm-stamp, #c1301c)',
  },
  '.cm-line': { padding: '0' },
  '.cm-placeholder': { color: '#a89e85', fontStyle: 'italic' },
  // Remove the border CM6 adds by default
  '&.cm-focused': { outline: 'none' },
  '&.cm-editor': { background: 'transparent' },
  // Warm ink-tinted selection instead of a cool blue that fights the paper.
  '.cm-selectionBackground': { background: 'rgba(193,48,28,0.16) !important' },
  '.cm-cursor': { borderLeftWidth: '2px' },
});

const darkTheme = EditorView.theme({
  '&': { background: '#161310', color: '#e7e1d2' },
  // Graded night desk so the dark canvas has the same depth as the light one.
  '.cm-scroller': {
    background:
      'radial-gradient(120% 60% at 50% 0%, #221E17 0%, #1A1712 60%, #141109 100%)',
  },
  '.cm-content': {
    background: '#211D15',
    color: '#e7e1d2',
    caretColor: 'var(--sm-stamp, #c1301c)',
    border: '1px solid rgba(231,225,210,0.10)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.05), 0 24px 48px -20px rgba(0,0,0,0.65)',
  },
  '.cm-selectionBackground': { background: 'rgba(193,48,28,0.30) !important' },
  '.cm-activeLine': { background: 'rgba(231,225,210,0.05)' },
  '.cm-placeholder': { color: '#6f6553' },
}, { dark: true });

const lightTheme = EditorView.theme({
  '&': { background: 'transparent', color: '#211D15' },
  // Keep the graded canvas from baseTheme; only tint the active line warmly.
  '.cm-content': { color: '#211D15' },
  '.cm-activeLine': { background: 'rgba(33,29,21,0.045)' },
});

// ── E2: finding → editor navigation highlight ───────────────────────────────
// A CodeMirror decoration flashed over a finding's line span when the writer
// clicks it in Script Doctor (FountainEditorHandle.highlightRange). The
// stamp-red wash holds at full strength briefly, then fades over ~1.5s via a
// pure-CSS keyframe animation rather than a JS-driven color tween — the
// decoration is cleared by JS a moment after the animation completes
// (highlightRange's own setTimeout below), purely as DOM housekeeping; the
// fade itself never depends on that timing being exact.
const setFindingHighlight = StateEffect.define<{ from: number; to: number } | null>();

const findingHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setFindingHighlight)) {
        deco = effect.value
          ? Decoration.set([Decoration.mark({ class: 'cm-sm-finding-flash' }).range(effect.value.from, effect.value.to)])
          : Decoration.none;
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── E5: Typewriter Focus — keep the cursor's line centered ─────────────────
// A plain updateListener, not a ViewPlugin: it only ever dispatches a
// scroll-only effect (EditorView.scrollIntoView never touches doc/selection),
// so re-entering this listener from the transaction it itself causes is
// impossible — the follow-up update has both docChanged and selectionSet
// false, so the `if` below simply doesn't fire again. Module-scope (not
// created per-render) since it closes over nothing — `update` carries
// everything it needs.
const typewriterFocusListener = EditorView.updateListener.of((update) => {
  if (!update.docChanged && !update.selectionSet) return;
  const pos = update.state.selection.main.head;
  update.view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
});

// Phase E exit-gate punch list, P3: scrollPastEnd() pads the scroller with
// extra blank space below the last line, equal to (viewport height − one
// line). Without it, CodeMirror's scroller physically cannot scroll past
// "last line flush with the bottom of the viewport" — so once the cursor
// gets within roughly half a viewport of the document's end,
// scrollIntoView(pos, {y:'center'}) above hits that hard floor and the
// cursor line stalls above center (visibly "stuck near the top" once you
// keep typing past the fold on a short-to-medium draft), never reaching
// true center the way it does earlier in a longer document. Bundled into
// the SAME compartment content as typewriterFocusListener (both toggled
// together below) so normal editing without Typewriter Focus keeps its
// ordinary scroll bounds — this extra bottom padding is part of the
// centering behavior, not a general editor change.
const typewriterFocusExtensions = [typewriterFocusListener, scrollPastEnd()];

// a11y pass (2026-09-04): the flash animated a `background-color` behind
// the flashed text — first --sm-stamp red (a flashed scene heading, same
// red, measured 3.03:1), then a re-tuned amber (still only 4.35:1 once
// stacked with .cm-activeLine's own faint tint — close enough that
// getting real margin meant an alpha low enough to make the "flash"
// barely visible, defeating its own point). ANY background fill behind
// bold red text on this cream paper is fighting the same tight margin,
// so this switches mechanism entirely: an animated `boxShadow` inset
// ring, which sits on top of (not behind) the text and therefore never
// touches its contrast against the page at all, while still reading
// clearly as "this line was just highlighted."
const findingHighlightTheme = EditorView.baseTheme({
  '.cm-sm-finding-flash': {
    animation: 'sm-finding-fade 2.2s ease-out forwards',
    borderRadius: '2px',
  },
  '@keyframes sm-finding-fade': {
    '0%': { boxShadow: 'inset 0 0 0 2px rgba(255,193,7,0.9)' },
    '65%': { boxShadow: 'inset 0 0 0 2px rgba(255,193,7,0.9)' },
    '100%': { boxShadow: 'inset 0 0 0 2px rgba(255,193,7,0)' },
  },
});

// ── Component ─────────────────────────────────────────────────────────────────
const FountainEditor = forwardRef<FountainEditorHandle, FountainEditorProps>(
  function FountainEditor(
    {
      value,
      onChange,
      characters = [],
      isDarkMode = false,
      placeholder: placeholderText = 'INT. STUDIO - DAY\n\nStart typing your script here...',
      className = '',
      onUserEdit,
      collabRoom,
      collabUserName,
      liveDiagnostics = false,
      generativeFixes = false,
      isTypewriterFocus = false,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Store latest callbacks in a ref so the closure inside EditorView doesn't go stale
    const onChangeRef = useRef(onChange);
    const onUserEditRef = useRef(onUserEdit);
    const charactersRef = useRef(characters);
    useEffect(() => { onChangeRef.current = onChange; });
    useEffect(() => { onUserEditRef.current = onUserEdit; });
    useEffect(() => { charactersRef.current = characters; });

    // ── Compartments allow hot-swapping extensions without rebuilding state ────
    const themeCompartment = useRef(new Compartment());
    // Live Notes: holds scriptDiagnostics() when enabled, [] when disabled —
    // hot-swapped below the same way as the theme compartment.
    const diagnosticsCompartment = useRef(new Compartment());
    // E5: Typewriter Focus — holds typewriterFocusListener (below) when
    // enabled, [] when disabled. Same hot-swap idiom as diagnosticsCompartment.
    const typewriterFocusCompartment = useRef(new Compartment());
    // P4: joining a collab room now requires fetching an auth token first
    // (see collab.ts), so the extension can't be included synchronously at
    // EditorState.create() time — this compartment starts empty and is
    // hot-swapped in once the async session resolves, below.
    const collabCompartment = useRef(new Compartment());
    // P4: live for the editor's lifetime when a collab room is set at mount.
    const collabRef = useRef<CollabSession | null>(null);
    // Latest `value` prop, kept current for the collab seed getter below: the
    // session join is async, so the mount-time `value` closure is stale by sync
    // time — seeding from this ref avoids clobbering newer content.
    const valueRef = useRef(value);
    // E2: the pending "clear the highlight decoration" timer from the most
    // recent highlightRange() call — cleared and replaced on every new call
    // (so rapid-fire finding clicks each get their own full flash instead of
    // the first one's timer cutting a later one short) and on unmount.
    const highlightClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Expose imperative handle ──────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      navigateTo(lineNo: number) {
        const view = viewRef.current;
        if (!view) return;
        const line = view.state.doc.line(
          Math.max(1, Math.min(lineNo, view.state.doc.lines)),
        );
        view.dispatch({
          selection: { anchor: line.from },
          scrollIntoView: true,
          effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
        });
        view.focus();
      },
      /** Returns the 1-based line number of the cursor, or 1 if unavailable. */
      getCurrentLine() {
        const view = viewRef.current;
        if (!view) return 1;
        const pos = view.state.selection.main.head;
        return view.state.doc.lineAt(pos).number;
      },
      getView: () => viewRef.current,
      highlightRange(startLine: number, endLine: number) {
        const view = viewRef.current;
        if (!view) return;
        const totalLines = view.state.doc.lines;
        if (totalLines === 0) return;
        const start = Math.max(1, Math.min(startLine, totalLines));
        const end = Math.max(start, Math.min(endLine, totalLines));
        const from = view.state.doc.line(start).from;
        const to = view.state.doc.line(end).to;

        if (highlightClearTimerRef.current) clearTimeout(highlightClearTimerRef.current);
        view.dispatch({
          selection: { anchor: from },
          scrollIntoView: true,
          effects: [EditorView.scrollIntoView(from, { y: 'center' }), setFindingHighlight.of({ from, to })],
        });
        view.focus();
        // Matches sm-finding-fade's 2.2s CSS animation (findingHighlightTheme
        // above) plus a small margin — pure housekeeping, removing the now-
        // invisible decoration node rather than leaving it mounted forever.
        highlightClearTimerRef.current = setTimeout(() => {
          viewRef.current?.dispatch({ effects: setFindingHighlight.of(null) });
        }, 2400);
      },
    }));

    // ── Create EditorView once on mount ──────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newVal = update.state.doc.toString();
          onChangeRef.current(newVal);
          onUserEditRef.current?.();
        }
      });

      const fountainKm = fountainKeymap({
        get characters() { return charactersRef.current; },
      });

      // Context-aware element autocomplete (scene-heading prefixes,
      // locations, time-of-day, transitions, character cues) — see
      // screenplay-complete.ts. `characters` is read live via the same
      // ref-backed getter as fountainKm above, so prop changes don't require
      // rebuilding this extension. Enter/click accept and arrows navigate;
      // the default completionKeymap in this CodeMirror version leaves Tab
      // unbound.
      const screenplayCompletion = autocompletion({
        activateOnTyping: true,
        icons: false,
        override: [screenplayComplete({ get characters() { return charactersRef.current; } })],
      });

      const state = EditorState.create({
        // When collaborating, start empty — Yjs is the source of truth.
        doc: collabRoom ? '' : value,
        extensions: [
          // ── Collaboration (Yjs) — must precede history for proper undo scoping.
          // Starts empty; createCollabSession() below is async (it fetches a room
          // token first), so the real extension is hot-swapped in once ready. ──
          collabCompartment.current.of([]),
          // ── History (undo/redo) ─────────────────────────────────────────────
          history(),
          // ── Standard editing keybindings ───────────────────────────────────
          // Place fountain-specific bindings BEFORE default so our handlers run first.
          keymap.of([
            ...fountainKm,
            ...searchKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...standardKeymap,
          ]),
          // ── Tab element-cycling state (fountain-keymap.ts's Tab handler
          // reads these fields — see that file's header) ──────────────────────
          fountainKeymapExtensions,
          // ── Screenplay element autocomplete (Enter/click accept) ─────────────
          screenplayCompletion,
          // ── Find/replace (item 4) — CodeMirror's own search panel (case-
          // sensitivity, whole-word, regexp, replace/replace-all all built
          // in), Mod-f to open (searchKeymap above), styled to match this
          // app's chrome (search-panel-theme.ts) instead of the stock
          // colors. `top: true` keeps the panel near the toolbar rather than
          // the bottom of a long, scrolled page. ─────────────────────────────
          search({ top: true }),
          searchPanelTheme,
          // ── Live Notes: in-editor narrative diagnostics (squiggles + hover) ──
          diagnosticsCompartment.current.of(
            liveDiagnostics ? scriptDiagnostics({ generative: generativeFixes }) : [],
          ),
          // ── E5: Typewriter Focus (see typewriterFocusExtensions above) ──────
          typewriterFocusCompartment.current.of(isTypewriterFocus ? typewriterFocusExtensions : []),
          // ── Fountain highlighting ───────────────────────────────────────────
          fountainHighlight,
          fountainTheme,
          // ── Screenplay page formatting (view-only — CSS padding/alignment
          // decorations derived from screenplay-layout.ts's SPEC; never
          // touches the buffer). Composes with fountainHighlight's color
          // classes above via distinct `.cm-sp-*` class names on the same
          // line. lineWrapping lets long action/dialogue lines soft-wrap
          // inside the page column instead of scrolling horizontally. ──────
          screenplayFormat,
          screenplayFormatTheme,
          EditorView.lineWrapping,
          // ── Visual ─────────────────────────────────────────────────────────
          drawSelection(),
          highlightActiveLine(),
          closeBrackets(),
          baseTheme,
          themeCompartment.current.of(isDarkMode ? darkTheme : lightTheme),
          // ── E2: finding → editor navigation highlight (see above) ───────────
          findingHighlightField,
          findingHighlightTheme,
          // ── Change listener ─────────────────────────────────────────────────
          updateListener,
          // ── Placeholder ────────────────────────────────────────────────────
          EditorView.contentAttributes.of({ 'aria-label': 'Script editor', spellcheck: 'false' }),
        ],
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      // a11y pass (2026-09-04, re-evaluated): axe's scrollable-region-
      // focusable rule flags `.cm-scroller` (overflow:auto) as not
      // independently keyboard-focusable. The textbook fix — `tabIndex = 0`
      // on the scroller — was tried once before (see git blame / the prior
      // a11y pass) and reverted, because at the time landing on
      // `.cm-content` via ANY Tab route (including the extra hop this
      // fix adds) was a real keyboard trap: tab-escape only armed after the
      // writer had already pressed Escape once, which a first-time
      // keyboard arrival had no reason to know.
      //
      // fountain-keymap.ts (autoArmTabEscapeOnKeyboardArrival) since fixed
      // that trap directly: any focus arrival on `.cm-content` whose
      // immediately-preceding keydown was a bare Tab/Shift-Tab — tracked
      // globally via installGlobalTabTracking, independent of which
      // element the Tab was pressed FROM — auto-arms tab-escape, so the
      // very next Tab leaves normally with no Escape press first. That
      // removes the reason tabIndex=0 was unsafe here: a scroller stop
      // just adds one extra, harmless hop (scroller -> content, both bare
      // Tab keydowns, so content's arrival still auto-arms) before the
      // existing fix takes over. Re-enabled below; proven safe (both the
      // scroller is independently reachable AND a raw-Tab user can still
      // Tab straight through with no Escape) by scripts/verify-a11y.mjs's
      // "editor keyboard journey" section — see its comments for the two
      // assertions.
      view.scrollDOM.tabIndex = 0;

      viewRef.current = view;

      // P4: in collaboration mode, Yjs owns the document. Join is async (it
      // fetches a room auth token before opening the socket — see collab.ts) —
      // guarded by `torndown` so a fast unmount can't create/dispatch to a
      // socket after teardown, and so a component that unmounts before the
      // fetch resolves still tears down the session rather than leaking it.
      let torndown = false;
      if (collabRoom) {
        createCollabSession({
          roomId: collabRoom,
          userName: collabUserName,
          initialText: () => valueRef.current,
        }).then((session) => {
          if (torndown) { session.destroy(); return; }
          collabRef.current = session;
          view.dispatch({ effects: collabCompartment.current.reconfigure(session.extension) });
        }).catch((err) => {
          // Non-fatal: the editor keeps working locally without live collaboration.
          console.error('Failed to join collaboration session:', err);
        });
      }

      return () => {
        torndown = true;
        view.destroy();
        viewRef.current = null;
        // Release the collaboration socket + shared doc on unmount.
        collabRef.current?.destroy();
        collabRef.current = null;
        if (highlightClearTimerRef.current) clearTimeout(highlightClearTimerRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once — value/extensions are hot-patched below

    // ── Sync external value changes (e.g. snapshot restore) ──────────────────
    useEffect(() => {
      // Keep the collab seed getter's source current so a session that finishes
      // joining after this runs seeds from the freshest value, not the mount-time
      // snapshot.
      valueRef.current = value;
      const view = viewRef.current;
      if (!view) return;
      // In collaboration mode Yjs owns the document — never overwrite it from the
      // `value` prop, or we would clobber remote edits.
      if (collabRef.current) return;
      const currentDoc = view.state.doc.toString();
      if (currentDoc === value) return; // no-op
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
        // Preserve cursor when possible
        selection: { anchor: Math.min(view.state.selection.main.anchor, value.length) },
      });
    }, [value]);

    // ── Hot-swap theme ────────────────────────────────────────────────────────
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: themeCompartment.current.reconfigure(isDarkMode ? darkTheme : lightTheme),
      });
    }, [isDarkMode]);

    // ── Hot-swap Live Notes on/off ─────────────────────────────────────────────
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: diagnosticsCompartment.current.reconfigure(
          liveDiagnostics ? scriptDiagnostics({ generative: generativeFixes }) : [],
        ),
      });
      // generativeFixes is in the dep list, not just liveDiagnostics: toggling
      // Labs while the editor is mounted has to rebuild the extension, or the
      // "Fix with AI" button would keep whatever state it had at mount.
    }, [liveDiagnostics, generativeFixes]);

    // ── Hot-swap Typewriter Focus on/off (E5) ──────────────────────────────────
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: typewriterFocusCompartment.current.reconfigure(
          isTypewriterFocus ? typewriterFocusExtensions : [],
        ),
      });
      // Turning it ON should center the current line immediately, not wait
      // for the next keystroke/cursor move.
      if (isTypewriterFocus) {
        const pos = view.state.selection.main.head;
        view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
      }
    }, [isTypewriterFocus]);

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 overflow-auto ${className}`}
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      />
    );
  },
);

FountainEditor.displayName = 'FountainEditor';
export default FountainEditor;
